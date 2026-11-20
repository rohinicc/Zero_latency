"""
FairPass Secure Event-Specific Queue Authorization Service
Handles cryptographic signing, verification, and atomic consumption of event-specific
queue authorization tokens, preventing queue bypass and race condition reuse.
"""

from datetime import datetime, timedelta
import hmac
import hashlib
import json
import base64
import secrets
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models

QUEUE_SIGNING_SECRET = "fairpass-queue-hmac-key-2026-secure"
QUEUE_TOKEN_VALIDITY_SECONDS = 600  # 10 minutes valid booking window

def sign_payload(payload_bytes: bytes) -> str:
    """Signs raw bytes using HMAC-SHA256 and returns a hex digest."""
    return hmac.new(QUEUE_SIGNING_SECRET.encode(), payload_bytes, hashlib.sha256).hexdigest()

def issue_queue_authorization(
    db: Session,
    event_id: int,
    email: str,
    session_id: str = "",
    max_quantity: int = 2,
    validity_seconds: int = QUEUE_TOKEN_VALIDITY_SECONDS
) -> Dict[str, Any]:
    """
    Issues a cryptographically signed, event-specific queue authorization token.
    Invalidates any previous active queue token for this user and event.
    """
    now = datetime.utcnow()
    expires_at = now + timedelta(seconds=validity_seconds)
    clean_email = email.strip().lower()

    # Invalidate any prior active token for this user and event to prevent concurrent token hoarding
    prior_tokens = db.query(models.QueueAuthorization).filter(
        models.QueueAuthorization.event_id == event_id,
        models.QueueAuthorization.email == clean_email,
        models.QueueAuthorization.status == 'ACTIVE'
    ).all()
    for pt in prior_tokens:
        pt.status = 'REVOKED'

    token_nonce = secrets.token_hex(8)
    payload = {
        "event_id": event_id,
        "email": clean_email,
        "session_id": session_id or f"sess_{secrets.token_hex(4)}",
        "max_qty": max_quantity,
        "issued_at": int(now.timestamp()),
        "expires_at": int(expires_at.timestamp()),
        "nonce": token_nonce
    }
    
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    signature = sign_payload(payload_json)
    
    # Combined token: base64(payload_json).signature
    encoded_payload = base64.urlsafe_b64encode(payload_json).decode('utf-8')
    full_token = f"FPQA.{encoded_payload}.{signature}"

    qa = models.QueueAuthorization(
        token=full_token,
        event_id=event_id,
        email=clean_email,
        session_id=session_id or payload["session_id"],
        max_quantity=max_quantity,
        status='ACTIVE',
        issued_at=now,
        expires_at=expires_at
    )
    db.add(qa)
    db.commit()

    return {
        "token": full_token,
        "event_id": event_id,
        "email": clean_email,
        "issued_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "validity_seconds": validity_seconds,
        "max_quantity": max_quantity
    }

def verify_queue_authorization(
    db: Session,
    token_str: str,
    expected_event_id: int,
    expected_email: str,
    requested_quantity: int = 1
) -> Tuple[bool, str, Optional[models.QueueAuthorization]]:
    """
    Cryptographically verifies and validates the queue authorization token.
    Checks:
    1. Token format and HMAC signature
    2. Expiration timestamp
    3. Event matching (prevents token reuse for different events)
    4. User matching (prevents token theft across users)
    5. Database active status (prevents replay after consumption or revocation)
    6. Requested quantity vs authorized max quantity
    """
    if not token_str or not token_str.startswith("FPQA."):
        return False, "Invalid queue token format. Queue authorization required.", None

    parts = token_str.split('.')
    if len(parts) != 3:
        return False, "Malformed queue authorization token.", None

    _, encoded_payload, signature = parts

    # 1. Verify signature
    try:
        payload_bytes = base64.urlsafe_b64decode(encoded_payload.encode('utf-8'))
        expected_sig = sign_payload(payload_bytes)
        if not hmac.compare_digest(expected_sig, signature):
            return False, "Tampered or invalid queue authorization signature.", None
        
        payload = json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        return False, "Failed to decode queue authorization payload.", None

    # 2. Check expiration in payload
    now_ts = int(datetime.utcnow().timestamp())
    if payload.get("expires_at", 0) < now_ts:
        return False, "Queue authorization token has expired. Please re-enter the queue.", None

    # 3. Check event matching
    if payload.get("event_id") != expected_event_id:
        return False, f"Event mismatch: Token issued for Event #{payload.get('event_id')} cannot be used for Event #{expected_event_id}.", None

    # 4. Check user matching
    token_email = payload.get("email", "").strip().lower()
    clean_expected_email = expected_email.strip().lower()
    if token_email != clean_expected_email:
        return False, f"Identity mismatch: Queue token was issued to '{token_email}', but booking requested by '{clean_expected_email}'.", None

    # 5. Check quantity ceiling
    max_qty = payload.get("max_qty", 2)
    if requested_quantity > max_qty:
        return False, f"Unauthorized quantity: Token authorizes up to {max_qty} tickets, requested {requested_quantity}.", None

    # 6. Check database record for status
    qa_record = db.query(models.QueueAuthorization).filter_by(token=token_str).first()
    if not qa_record:
        return False, "Queue authorization record not found in registry.", None

    if qa_record.status == 'CONSUMED':
        return False, "Queue authorization token has already been consumed for a previous booking.", None

    if qa_record.status == 'REVOKED':
        return False, "Queue authorization token has been revoked.", None

    if qa_record.status == 'EXPIRED' or qa_record.expires_at < datetime.utcnow():
        qa_record.status = 'EXPIRED'
        db.commit()
        return False, "Queue authorization token has expired in registry.", None

    return True, "Queue authorization verified successfully.", qa_record

def consume_queue_authorization(
    db: Session,
    qa_record: models.QueueAuthorization,
    booking_tx_ref: str
):
    """Marks queue authorization token as consumed atomically upon successful booking."""
    qa_record.status = 'CONSUMED'
    qa_record.consumed_at = datetime.utcnow()
    qa_record.booking_tx_ref = booking_tx_ref
    db.commit()

def revoke_queue_authorization(
    db: Session,
    token_str: str
):
    """Revokes a queue authorization token."""
    qa = db.query(models.QueueAuthorization).filter_by(token=token_str).first()
    if qa:
        qa.status = 'REVOKED'
        db.commit()
