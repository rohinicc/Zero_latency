"""
FairPass Atomic Ticket Allocation Service
Guarantees thread-safe, atomic inventory allocation in SQLite preventing overselling,
duplicate ticket generation, queue bypass, and concurrent race conditions.
"""

import threading
import secrets
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from .. import models
from . import queue_service

# Global re-entrant lock for critical section database inventory allocation
_allocation_lock = threading.RLock()

def allocate_tickets_atomic(
    db: Session,
    event_id: int,
    email: str,
    name: str,
    quantity: int,
    payment_method: str = "UPI",
    simulate_failure: bool = False,
    queue_auth_token: str = ""
) -> Dict[str, Any]:
    """
    Executes atomic ticket booking:
    1. Validates event existence.
    2. Validates user booking limit (max_per_user).
    3. Validates queue authorization token (prevents queue bypass).
    4. Acquires synchronization lock and verifies payment.
    5. Executes atomic conditional inventory decrement in SQLite.
    6. Generates unique tokens and records.
    7. Atomically consumes queue authorization token.
    8. Rolls back transaction if any error occurs.
    """
    clean_email = email.strip().lower()

    if quantity < 1:
        raise HTTPException(status_code=400, detail="Ticket quantity must be at least 1.")

    with _allocation_lock:
        e = db.query(models.Event).filter_by(id=event_id).first()
        if not e:
            raise HTTPException(status_code=404, detail="Event not found.")

        # 1. Enforce Secure Queue Authorization (prevents queue bypass & unauthorized booking)
        qa_record = None
        if e.queue_enabled or e.restricted_window_enabled:
            if not queue_auth_token:
                # Log bypass attempt in security log for risk engine
                log = models.SecurityLog(
                    event_id=e.id,
                    log_type="QUEUE_AUTH_FAILED",
                    identifier=clean_email,
                    severity="WARNING",
                    details=f"Unauthorized direct booking attempt rejected. Queue authorization token missing for event #{e.id}.",
                    timestamp=datetime.utcnow()
                )
                db.add(log)
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail="Queue Authorization Required: Direct booking bypass is blocked. Please complete the event queue."
                )

            is_valid, reason, qa_record = queue_service.verify_queue_authorization(
                db=db,
                token_str=queue_auth_token,
                expected_event_id=e.id,
                expected_email=clean_email,
                requested_quantity=quantity
            )
            if not is_valid:
                log = models.SecurityLog(
                    event_id=e.id,
                    log_type="QUEUE_AUTH_FAILED",
                    identifier=clean_email,
                    severity="WARNING",
                    details=f"Rejected queue token: {reason}",
                    timestamp=datetime.utcnow()
                )
                db.add(log)
                db.commit()
                raise HTTPException(status_code=403, detail=f"Queue Authorization Failed: {reason}")

        # 2. Enforce per-user ticket limit
        if quantity > e.max_per_user:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot book more than {e.max_per_user} tickets in a single transaction."
            )

        existing_count = db.query(models.Ticket).filter(
            models.Ticket.event_id == e.id,
            models.Ticket.owner_email == clean_email,
            models.Ticket.status == 'ACTIVE'
        ).count()

        if existing_count + quantity > e.max_per_user:
            raise HTTPException(
                status_code=400,
                detail=f"FairPass Limit Exceeded: Maximum {e.max_per_user} active tickets per user for this event. You already hold {existing_count}."
            )

        # 3. Simulate payment check
        total_amount = round(e.price * quantity, 2)
        now = datetime.utcnow()
        tx_ref = f"TXN-DEMO-{now.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

        if simulate_failure:
            p = models.Payment(
                tx_ref=tx_ref,
                user_email=clean_email,
                user_name=name,
                event_id=e.id,
                amount=total_amount,
                payment_method=payment_method,
                payment_type='PRIMARY_PURCHASE',
                status='FAILED',
                failure_reason='Simulated bank decline / test failure during checkout.',
                timestamp=now
            )
            db.add(p)
            db.commit()
            raise HTTPException(
                status_code=402,
                detail="Simulated payment failed. No tickets were allocated and no inventory was consumed."
            )

        # 4. Atomic conditional inventory update in SQLite
        # Using raw atomic SQL update with condition (sold + quantity <= quantity_limit)
        update_stmt = text("""
            UPDATE events 
            SET sold = sold + :qty 
            WHERE id = :event_id AND (sold + :qty) <= quantity;
        """)
        result = db.execute(update_stmt, {"qty": quantity, "event_id": e.id})
        
        if result.rowcount == 0:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Sold out! Insufficient tickets remaining for Event #{e.id}."
            )

        try:
            # 5. Record successful payment
            p = models.Payment(
                tx_ref=tx_ref,
                user_email=clean_email,
                user_name=name,
                event_id=e.id,
                amount=total_amount,
                payment_method=payment_method,
                payment_type='PRIMARY_PURCHASE',
                status='SUCCESS',
                timestamp=now
            )
            db.add(p)

            # 6. Issue tickets with cryptographic tokens
            created_tokens: List[str] = []
            issued_tickets: List[models.Ticket] = []
            max_resale = round(e.price * e.resale_cap_multiplier, 2)

            for _ in range(quantity):
                raw_token = f"FP-EV{e.id}-TKT{secrets.token_hex(5).upper()}"
                secret_hash = secrets.token_hex(16)
                
                t = models.Ticket(
                    event_id=e.id,
                    event_name=e.name,
                    owner_email=clean_email,
                    owner_name=name,
                    face_price=e.price,
                    max_resale_price=max_resale,
                    token=raw_token,
                    secret_hash=secret_hash,
                    status='ACTIVE',
                    redeemed=False,
                    quai_status='NOT_SYNCED',
                    created_at=now
                )
                db.add(t)
                db.flush()

                # Record ownership history
                h = models.TicketOwnershipHistory(
                    ticket_id=t.id,
                    event_id=e.id,
                    from_email='BOX_OFFICE',
                    from_name='FairPass Box Office',
                    to_email=clean_email,
                    to_name=name,
                    action='INITIAL_PURCHASE',
                    price=e.price,
                    old_token=None,
                    new_token=raw_token,
                    timestamp=now
                )
                db.add(h)
                created_tokens.append(raw_token)
                issued_tickets.append(t)

            # 7. Consume Queue Authorization token atomically
            if qa_record:
                queue_service.consume_queue_authorization(
                    db=db,
                    qa_record=qa_record,
                    booking_tx_ref=tx_ref
                )

            # 8. Mark queue entry completed if present
            q_entry = db.query(models.QueueEntry).filter_by(event_id=e.id, email=clean_email).first()
            if q_entry:
                q_entry.status = 'COMPLETED'

            db.commit()
            db.refresh(e)

            return {
                "message": f"Atomic allocation successful! {quantity} ticket(s) booked for {e.name}.",
                "tx_ref": tx_ref,
                "quantity": quantity,
                "total_paid": total_amount,
                "tokens": created_tokens,
                "ticket_ids": [t.id for t in issued_tickets],
                "tickets": [{"id": t.id, "token": t.token} for t in issued_tickets],
                "event_remaining": e.quantity - e.sold
            }

        except Exception as exc:
            db.rollback()
            raise exc
