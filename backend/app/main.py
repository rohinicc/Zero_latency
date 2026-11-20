from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional, List
import secrets
import base64
import io
import qrcode

from .database import Base, engine, get_db
from . import models, schemas
from .services import security_service

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='FairPass API',
    description='Fair Ticketing Platform API with Anti-Scalping, Bot Protection, Event-Specific Queues, Capped Resale, Non-Permanent Sharing, and Gate Verification.'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

def generate_qr_data_url(token: str) -> str:
    """Generates a base64 encoded PNG QR code."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#18181b", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()

def serialize_ticket(t: models.Ticket, db: Session) -> dict:
    # Check if there is an active share on this ticket
    active_share = db.query(models.TicketShare).filter_by(ticket_id=t.id, status='ACTIVE').first()
    share_info = None
    if active_share:
        share_info = {
            'id': active_share.id,
            'recipient_name': active_share.recipient_name,
            'recipient_email': active_share.recipient_email,
            'status': active_share.status,
            'share_token': active_share.share_token,
            'created_at': active_share.created_at.isoformat()
        }
    
    return {
        'id': t.id,
        'event_id': t.event_id,
        'event_name': t.event_name,
        'owner_email': t.owner_email,
        'owner_name': t.owner_name,
        'face_price': t.face_price,
        'max_resale_price': t.max_resale_price,
        'token': t.token,
        'qr_url': generate_qr_data_url(t.token),
        'status': t.status,
        'redeemed': t.redeemed,
        'redeemed_at': t.redeemed_at.isoformat() if t.redeemed_at else None,
        'blockchain_tx': t.blockchain_tx,
        'blockchain_token_id': t.blockchain_token_id,
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'active_share': share_info
    }

def seed_demo_data(db: Session):
    if db.query(models.Event).count() == 0:
        events = [
            models.Event(
                name='Bengaluru Music Fest 2026',
                description='The premier live electronic and indie music festival at Palace Grounds with over 15 headline artists.',
                poster_url='https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
                venue='Palace Grounds, Bengaluru',
                date='2026-12-20 18:00',
                category='Music',
                sales_start='2026-11-01 10:00',
                sales_end='2026-12-20 16:00',
                quantity=120,
                sold=24,
                price=2000.0,
                max_per_user=2,
                resale_enabled=True,
                resale_cap_multiplier=1.1,
                restricted_window_enabled=True,
                queue_enabled=True,
                bot_protection_enabled=True,
                organizer_email='admin@fairpass.io'
            ),
            models.Event(
                name='Indie Rock Revolution',
                description='An intimate evening of indie rock, alternative sounds, and live acoustic sessions at Jayamahal.',
                poster_url='https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
                venue='Jayamahal Palace, Bengaluru',
                date='2026-12-12 19:30',
                category='Music',
                sales_start='2026-11-10 12:00',
                sales_end='2026-12-12 18:00',
                quantity=80,
                sold=18,
                price=1200.0,
                max_per_user=2,
                resale_enabled=True,
                resale_cap_multiplier=1.1,
                restricted_window_enabled=True,
                queue_enabled=False,
                bot_protection_enabled=True,
                organizer_email='admin@fairpass.io'
            ),
            models.Event(
                name='Tech & Culture Live Summit',
                description='Keynotes, tech innovation showcases, Web3 panels, and futuristic live experiences.',
                poster_url='https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
                venue='Whitefield Convention Centre, Bengaluru',
                date='2027-01-10 09:00',
                category='Tech',
                sales_start='2026-11-15 09:00',
                sales_end='2027-01-09 23:59',
                quantity=150,
                sold=45,
                price=1500.0,
                max_per_user=4,
                resale_enabled=True,
                resale_cap_multiplier=1.15,
                restricted_window_enabled=True,
                queue_enabled=True,
                bot_protection_enabled=True,
                organizer_email='admin@fairpass.io'
            ),
            models.Event(
                name='Standup All-Stars Bengaluru',
                description='Non-stop comedy featuring India top touring stand-up comedians under one roof.',
                poster_url='https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
                venue='Chowdiah Memorial Hall, Malleshwaram',
                date='2026-12-28 20:00',
                category='Comedy',
                sales_start='2026-11-20 10:00',
                sales_end='2026-12-28 19:00',
                quantity=200,
                sold=30,
                price=800.0,
                max_per_user=2,
                resale_enabled=False,  # Resale disabled to demonstrate configuration!
                resale_cap_multiplier=1.0,
                restricted_window_enabled=True,
                queue_enabled=False,
                bot_protection_enabled=True,
                organizer_email='admin@fairpass.io'
            )
        ]
        db.add_all(events)
        db.commit()

        # Seed sample tickets for Alice so she already has tickets to demonstrate resale and sharing immediately!
        ev1 = db.query(models.Event).filter_by(name='Bengaluru Music Fest 2026').first()
        if ev1:
            token1 = f"FP-TKT101-{secrets.token_hex(6).upper()}"
            token2 = f"FP-TKT102-{secrets.token_hex(6).upper()}"
            t1 = models.Ticket(
                event_id=ev1.id,
                event_name=ev1.name,
                owner_email='alice@example.com',
                owner_name='Alice Sharma',
                face_price=ev1.price,
                max_resale_price=round(ev1.price * ev1.resale_cap_multiplier, 2),
                token=token1,
                status='ACTIVE',
                redeemed=False
            )
            t2 = models.Ticket(
                event_id=ev1.id,
                event_name=ev1.name,
                owner_email='alice@example.com',
                owner_name='Alice Sharma',
                face_price=ev1.price,
                max_resale_price=round(ev1.price * ev1.resale_cap_multiplier, 2),
                token=token2,
                status='ACTIVE',
                redeemed=False
            )
            db.add_all([t1, t2])
            db.commit()

            # Record initial ownership history
            h1 = models.TicketOwnershipHistory(
                ticket_id=t1.id,
                event_id=ev1.id,
                from_email='ORGANIZER',
                from_name='FairPass Box Office',
                to_email='alice@example.com',
                to_name='Alice Sharma',
                action='INITIAL_PURCHASE',
                price=ev1.price,
                old_token=None,
                new_token=token1
            )
            h2 = models.TicketOwnershipHistory(
                ticket_id=t2.id,
                event_id=ev1.id,
                from_email='ORGANIZER',
                from_name='FairPass Box Office',
                to_email='alice@example.com',
                to_name='Alice Sharma',
                action='INITIAL_PURCHASE',
                price=ev1.price,
                old_token=None,
                new_token=token2
            )
            db.add_all([h1, h2])

            # Seed a sample security log for demonstration
            slog = models.SecurityLog(
                event_id=ev1.id,
                log_type="SYSTEM_INITIALIZED",
                identifier="system",
                severity="INFO",
                details="FairPass Anti-Scalp & Bot Shield initialized with 50-request burst lockout.",
                timestamp=datetime.utcnow()
            )
            db.add(slog)
            db.commit()

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_demo_data(db)
    finally:
        db.close()

# -----------------
# 1. Health & Demo Identities
# -----------------
@app.get('/api/health')
def health():
    return {'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}

@app.get('/api/demo/users')
def demo_users():
    return [
        {
            'id': 'user_alice',
            'name': 'Alice Sharma',
            'email': 'alice@example.com',
            'role': 'Fan & Ticket Buyer',
            'badge': 'Fan',
            'description': 'Primary attendee who books tickets, tests resale, and shares guest passes.'
        },
        {
            'id': 'user_bob',
            'name': 'Bob Patel',
            'email': 'bob@example.com',
            'role': 'Resale Buyer',
            'badge': 'Buyer',
            'description': 'Secondary buyer who acquires tickets via capped resale marketplace.'
        },
        {
            'id': 'user_charlie',
            'name': 'Charlie Rao',
            'email': 'charlie@example.com',
            'role': 'Shared Guest Attendee',
            'badge': 'Guest',
            'description': 'Friend who receives non-permanent shared ticket pass from Alice.'
        },
        {
            'id': 'user_admin',
            'name': 'FairPass Organizer',
            'email': 'admin@fairpass.io',
            'role': 'Event Organizer & Gate Officer',
            'badge': 'Organizer / Admin',
            'description': 'Creates events, scans QR passes, and monitors bot protection dashboard.'
        }
    ]

@app.post('/api/demo/reset')
def reset_demo(db: Session = Depends(get_db)):
    """Reset database to fresh demo state for hackathon demonstration."""
    # Delete child tables first
    db.query(models.SecurityLog).delete()
    db.query(models.BotRestriction).delete()
    db.query(models.AccessAttempt).delete()
    db.query(models.QueueEntry).delete()
    db.query(models.Payment).delete()
    db.query(models.ResaleListing).delete()
    db.query(models.TicketShare).delete()
    db.query(models.TicketOwnershipHistory).delete()
    db.query(models.Ticket).delete()
    db.query(models.Event).delete()
    db.commit()
    seed_demo_data(db)
    return {'message': 'Database successfully reset to clean demo state.'}

# -----------------
# 2. Events Endpoints (Organizer & Explore)
# -----------------
@app.get('/api/events')
def get_events(category: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Event)
    if category and category != 'All':
        query = query.filter(models.Event.category == category)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (models.Event.name.ilike(search_fmt)) |
            (models.Event.venue.ilike(search_fmt)) |
            (models.Event.description.ilike(search_fmt))
        )
    events = query.order_by(models.Event.id.asc()).all()
    results = []
    for e in events:
        results.append({
            'id': e.id,
            'name': e.name,
            'description': e.description,
            'poster_url': e.poster_url or 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
            'venue': e.venue,
            'date': e.date,
            'category': e.category,
            'sales_start': e.sales_start,
            'sales_end': e.sales_end,
            'quantity': e.quantity,
            'sold': e.sold,
            'available': max(0, e.quantity - e.sold),
            'price': e.price,
            'max_per_user': e.max_per_user,
            'resale_enabled': e.resale_enabled,
            'resale_cap_multiplier': e.resale_cap_multiplier,
            'max_resale_price': round(e.price * e.resale_cap_multiplier, 2),
            'restricted_window_enabled': e.restricted_window_enabled,
            'queue_enabled': e.queue_enabled,
            'bot_protection_enabled': e.bot_protection_enabled,
            'organizer_email': e.organizer_email,
            'created_at': e.created_at.isoformat() if e.created_at else None
        })
    return results

@app.get('/api/events/{event_id}')
def get_event(event_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    return {
        'id': e.id,
        'name': e.name,
        'description': e.description,
        'poster_url': e.poster_url,
        'venue': e.venue,
        'date': e.date,
        'category': e.category,
        'sales_start': e.sales_start,
        'sales_end': e.sales_end,
        'quantity': e.quantity,
        'sold': e.sold,
        'available': max(0, e.quantity - e.sold),
        'price': e.price,
        'max_per_user': e.max_per_user,
        'resale_enabled': e.resale_enabled,
        'resale_cap_multiplier': e.resale_cap_multiplier,
        'max_resale_price': round(e.price * e.resale_cap_multiplier, 2),
        'restricted_window_enabled': e.restricted_window_enabled,
        'queue_enabled': e.queue_enabled,
        'bot_protection_enabled': e.bot_protection_enabled,
        'organizer_email': e.organizer_email
    }

@app.post('/api/events')
def create_event(data: schemas.EventCreate, db: Session = Depends(get_db)):
    # Comprehensive validation
    if data.quantity <= 0:
        raise HTTPException(400, 'Ticket quantity must be greater than 0')
    if data.price <= 0:
        raise HTTPException(400, 'Ticket price must be greater than 0')
    if data.max_per_user < 1 or data.max_per_user > 10:
        raise HTTPException(400, 'Max tickets per user must be between 1 and 10')
    if data.resale_cap_multiplier < 1.0 or data.resale_cap_multiplier > 2.0:
        raise HTTPException(400, 'Resale price cap multiplier must be between 1.0x and 2.0x')

    default_posters = {
        'Music': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
        'Tech': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
        'Comedy': 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
        'Sports': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
        'Cultural': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    }
    poster = data.poster_url if data.poster_url and data.poster_url.strip() else default_posters.get(data.category, default_posters['Music'])

    e = models.Event(
        name=data.name.strip(),
        description=data.description.strip() if data.description else '',
        poster_url=poster,
        venue=data.venue.strip(),
        date=data.date.strip(),
        category=data.category or 'Music',
        sales_start=data.sales_start or '',
        sales_end=data.sales_end or '',
        quantity=data.quantity,
        sold=0,
        price=data.price,
        max_per_user=data.max_per_user,
        resale_enabled=data.resale_enabled,
        resale_cap_multiplier=data.resale_cap_multiplier,
        restricted_window_enabled=data.restricted_window_enabled,
        queue_enabled=data.queue_enabled,
        bot_protection_enabled=data.bot_protection_enabled,
        organizer_email=data.organizer_email or 'admin@fairpass.io'
    )
    db.add(e)
    db.commit()
    db.refresh(e)

    # Log security event
    log = models.SecurityLog(
        event_id=e.id,
        log_type="EVENT_CREATED",
        identifier=data.organizer_email,
        severity="INFO",
        details=f"Event '{e.name}' created with quantity={e.quantity}, price={e.price}, cap={e.resale_cap_multiplier}x, queue={e.queue_enabled}, bot_protection={e.bot_protection_enabled}",
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {
        'message': f"Event '{e.name}' successfully published!",
        'id': e.id,
        'event': {
            'id': e.id,
            'name': e.name,
            'venue': e.venue,
            'date': e.date,
            'price': e.price,
            'quantity': e.quantity
        }
    }

@app.put('/api/events/{event_id}')
def update_event(event_id: int, data: schemas.EventUpdate, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    update_data = data.model_dump(exclude_unset=True)
    if 'quantity' in update_data and update_data['quantity'] < e.sold:
        raise HTTPException(400, f"Cannot reduce total quantity below already sold tickets ({e.sold})")
    
    for k, v in update_data.items():
        setattr(e, k, v)
    
    db.commit()
    db.refresh(e)
    return {'message': f"Event '{e.name}' updated successfully", 'id': e.id}

@app.delete('/api/events/{event_id}')
def delete_event(event_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    if e.sold > 0:
        raise HTTPException(400, 'Cannot delete event with already sold tickets. Resale and refund policy applies.')
    db.delete(e)
    db.commit()
    return {'message': 'Event deleted'}

@app.get('/api/events/{event_id}/stats')
def event_stats(event_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    total_revenue = e.sold * e.price
    active_queue = db.query(models.QueueEntry).filter_by(event_id=e.id, status='WAITING').count()
    active_resales = db.query(models.ResaleListing).filter_by(event_id=e.id, active=True).count()
    redeemed_count = db.query(models.Ticket).filter_by(event_id=e.id, redeemed=True).count()
    access_attempts_count = db.query(models.AccessAttempt).filter_by(event_id=e.id).count()

    return {
        'event_id': e.id,
        'name': e.name,
        'quantity': e.quantity,
        'sold': e.sold,
        'available': max(0, e.quantity - e.sold),
        'revenue': total_revenue,
        'active_queue': active_queue,
        'active_resales': active_resales,
        'redeemed_count': redeemed_count,
        'access_attempts': access_attempts_count
    }

# -----------------
# 3. Security, Bot Protection & Restricted Access
# -----------------
@app.post('/api/events/{event_id}/access-check')
def access_check(event_id: int, data: schemas.AccessCheckRequest, request: Request, db: Session = Depends(get_db)):
    """
    Evaluates client interaction timing, rolling attempt rate, and enforces the 50-request lockout threshold.
    """
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    client_ip = request.client.host if request.client else '127.0.0.1'
    result = security_service.evaluate_access(
        db=db,
        event_id=event_id,
        email=data.email,
        ip=client_ip,
        duration_ms=data.duration_ms,
        session_id=data.session_id or ''
    )
    return result

@app.post('/api/events/{event_id}/challenge-verify')
def challenge_verify(event_id: int, data: schemas.ChallengeVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies human math/puzzle challenge response.
    """
    try:
        parts = data.challenge_token.split(':')
        token_hash = parts[0]
        expected_ans = int(parts[1])
        user_ans = int(data.solution.strip())
        if user_ans != expected_ans:
            log = models.SecurityLog(
                event_id=event_id,
                log_type="CHALLENGE_FAILED",
                identifier=data.email,
                severity="WARNING",
                details=f"Incorrect challenge answer provided ({user_ans} vs {expected_ans}).",
                timestamp=datetime.utcnow()
            )
            db.add(log)
            db.commit()
            raise HTTPException(400, 'Incorrect verification answer. Please try again.')
        
        log = models.SecurityLog(
            event_id=event_id,
            log_type="CHALLENGE_PASSED",
            identifier=data.email,
            severity="INFO",
            details="Interactive challenge successfully passed. Human presence verified.",
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()

        return {
            'status': 'GRANTED',
            'message': 'Challenge solved successfully. Access granted to booking portal.'
        }
    except ValueError:
        raise HTTPException(400, 'Invalid solution format')

@app.get('/api/admin/security/logs')
def get_security_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(models.SecurityLog).order_by(models.SecurityLog.timestamp.desc()).limit(limit).all()
    return [{
        'id': l.id,
        'event_id': l.event_id,
        'log_type': l.log_type,
        'identifier': l.identifier,
        'severity': l.severity,
        'details': l.details,
        'timestamp': l.timestamp.isoformat()
    } for l in logs]

@app.get('/api/admin/security/restrictions')
def get_restrictions(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    res = db.query(models.BotRestriction).filter(
        models.BotRestriction.is_active == True,
        models.BotRestriction.restricted_until > now
    ).order_by(models.BotRestriction.created_at.desc()).all()
    return [{
        'id': r.id,
        'identifier': r.identifier,
        'event_id': r.event_id,
        'reason': r.reason,
        'attempts_count': r.attempts_count,
        'restricted_until': r.restricted_until.isoformat(),
        'created_at': r.created_at.isoformat(),
        'remaining_seconds': max(0, int((r.restricted_until - now).total_seconds()))
    } for r in res]

@app.post('/api/admin/security/unblock')
def admin_unblock(data: schemas.UnblockRequest, db: Session = Depends(get_db)):
    success = security_service.lift_restriction(db, data.identifier)
    if not success:
        raise HTTPException(404, f"No active restriction found for '{data.identifier}'")
    return {'message': f"Restriction lifted for '{data.identifier}'. Account unblocked."}

@app.post('/api/admin/security/simulate-attack')
def simulate_attack(data: schemas.SimulateAttackRequest, db: Session = Depends(get_db)):
    """
    Demo endpoint: Immediately simulates 55 rapid bot access attempts to trigger the 50-request lockout threshold!
    """
    e = db.query(models.Event).filter_by(id=data.event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    target = data.target_email.strip().lower()
    now = datetime.utcnow()

    # Generate 55 rapid access attempts with low durations (e.g. 50ms each)
    attempts = []
    for _ in range(data.burst_count):
        attempts.append(models.AccessAttempt(
            event_id=e.id,
            identifier=target,
            ip_address='192.168.1.100 (Bot Proxy)',
            session_id='bot_script_' + secrets.token_hex(4),
            duration_ms=45,
            is_bot_flag=True,
            risk_score=0.95,
            timestamp=now
        ))
    db.add_all(attempts)

    # Trigger threshold lockout
    until = now + timedelta(minutes=5)
    restriction = models.BotRestriction(
        identifier=target,
        event_id=e.id,
        reason=f"Excessive access attempts detected ({data.burst_count} rapid requests within 60s window - Automated Bot Pattern)",
        attempts_count=data.burst_count,
        restricted_until=until,
        is_active=True,
        created_at=now
    )
    db.add(restriction)

    log = models.SecurityLog(
        event_id=e.id,
        log_type="EXCESSIVE_ATTEMPTS",
        identifier=target,
        severity="CRITICAL",
        details=f"Automated bot attack simulated: {data.burst_count} rapid hits. Enforced 5-minute security restriction.",
        timestamp=now
    )
    db.add(log)
    db.commit()

    return {
        'message': f"Simulated {data.burst_count} bot access requests. Threshold reached! User '{target}' has been locked out for 5 minutes.",
        'target': target,
        'burst_count': data.burst_count,
        'restricted_until': until.isoformat()
    }

# -----------------
# 4. Event-Specific Queue (NO DEPOSIT!)
# -----------------
@app.post('/api/events/{event_id}/queue/join')
def queue_join(event_id: int, data: schemas.QueueJoinRequest, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    if not e.queue_enabled:
        return {'status': 'NOT_REQUIRED', 'message': 'Queue is not enabled for this event. Direct booking available.'}
    
    # Check if already in queue
    existing = db.query(models.QueueEntry).filter_by(event_id=e.id, email=data.email).first()
    total = db.query(models.QueueEntry).filter_by(event_id=e.id, status='WAITING').count()
    if existing:
        return {
            'status': existing.status,
            'position': existing.position,
            'total_in_queue': max(1, total),
            'estimated_wait_seconds': existing.position * 15,
            'message': f"You are already in queue for {e.name} at position #{existing.position}."
        }
    
    pos = total + 1
    q = models.QueueEntry(
        event_id=e.id,
        email=data.email,
        name=data.name or 'Fan',
        position=pos,
        status='WAITING',
        session_id=data.session_id or secrets.token_hex(8)
    )
    db.add(q)
    db.commit()

    return {
        'status': 'WAITING',
        'position': pos,
        'total_in_queue': pos,
        'estimated_wait_seconds': pos * 15,
        'message': f"Joined queue for {e.name} at position #{pos}."
    }

@app.get('/api/events/{event_id}/queue/status')
def queue_status(event_id: int, email: str, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    q = db.query(models.QueueEntry).filter_by(event_id=e.id, email=email).first()
    total = db.query(models.QueueEntry).filter_by(event_id=e.id, status='WAITING').count()
    if not q:
        return {'status': 'NOT_IN_QUEUE', 'position': 0, 'total_in_queue': total, 'estimated_wait_seconds': 0}
    
    return {
        'status': q.status,
        'position': q.position,
        'total_in_queue': max(1, total),
        'estimated_wait_seconds': max(5, q.position * 15)
    }

@app.post('/api/events/{event_id}/queue/admit')
def queue_admit(event_id: int, email: str, db: Session = Depends(get_db)):
    """Promotes user from queue to admitted for booking."""
    q = db.query(models.QueueEntry).filter_by(event_id=event_id, email=email).first()
    if q:
        q.status = 'ADMITTED'
        db.commit()
    return {'status': 'ADMITTED', 'message': 'You have reached the front of the queue! Proceed to ticket booking.'}

# -----------------
# 5. Demo Payment Gateway
# -----------------
@app.post('/api/payments/process')
def process_payment(data: schemas.DemoPaymentProcessRequest, db: Session = Depends(get_db)):
    """
    Demo Payment Gateway: Processes simulated UPI, Net Banking, Credit, and Debit Card transactions.
    Supports simulated success and simulated failure.
    """
    now = datetime.utcnow()
    tx_ref = f"TXN-DEMO-{now.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

    if data.simulate_failure:
        payment = models.Payment(
            tx_ref=tx_ref,
            user_email=data.user_email,
            user_name=data.user_name,
            event_id=data.event_id,
            ticket_id=data.ticket_id,
            amount=data.amount,
            payment_method=data.payment_method,
            payment_type=data.payment_type,
            status='FAILED',
            failure_reason='Simulated bank decline / test failure requested by user.',
            timestamp=now
        )
        db.add(payment)
        db.commit()
        return {
            'status': 'FAILED',
            'tx_ref': tx_ref,
            'message': 'Payment failed: Simulated transaction declined by test bank. No charges were made.',
            'amount': data.amount
        }

    payment = models.Payment(
        tx_ref=tx_ref,
        user_email=data.user_email,
        user_name=data.user_name,
        event_id=data.event_id,
        ticket_id=data.ticket_id,
        amount=data.amount,
        payment_method=data.payment_method,
        payment_type=data.payment_type,
        status='SUCCESS',
        timestamp=now
    )
    db.add(payment)
    db.commit()

    return {
        'status': 'SUCCESS',
        'tx_ref': tx_ref,
        'message': f"Simulated {data.payment_method} payment of ₹{data.amount:,.2f} succeeded!",
        'amount': data.amount,
        'timestamp': now.isoformat()
    }

# -----------------
# 6. Ticket Booking
# -----------------
@app.post('/api/book')
def book_tickets(data: schemas.BookingRequest, db: Session = Depends(get_db)):
    e = db.query(models.Event).filter_by(id=data.event_id).first()
    if not e:
        raise HTTPException(404, 'Event not found')
    
    # 1. Check user restriction
    active_restriction = security_service.check_active_restriction(db, data.email.strip().lower())
    if active_restriction:
        raise HTTPException(403, f"Booking blocked: Account is temporarily restricted ({active_restriction.reason})")
    
    # 2. Validate quantity
    if data.quantity < 1:
        raise HTTPException(400, 'Quantity must be at least 1')
    if data.quantity > e.max_per_user:
        raise HTTPException(400, f"Cannot book more than {e.max_per_user} tickets in a single transaction")
    
    # 3. Check existing active tickets for user (Max tickets per user rule)
    existing_count = db.query(models.Ticket).filter(
        models.Ticket.event_id == e.id,
        models.Ticket.owner_email == data.email,
        models.Ticket.status == 'ACTIVE'
    ).count()

    if existing_count + data.quantity > e.max_per_user:
        raise HTTPException(
            400,
            f"FairPass Ticket Limit: Maximum {e.max_per_user} active tickets per user for this event. You already hold {existing_count}."
        )

    # 4. Check available tickets
    if e.sold + data.quantity > e.quantity:
        raise HTTPException(400, f"Sold out! Only {max(0, e.quantity - e.sold)} tickets remain.")

    # 5. Handle payment simulation
    total_amount = round(e.price * data.quantity, 2)
    now = datetime.utcnow()
    tx_ref = f"TXN-DEMO-{now.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

    if data.simulate_failure:
        # Record failed payment and abort
        p = models.Payment(
            tx_ref=tx_ref,
            user_email=data.email,
            user_name=data.name,
            event_id=e.id,
            amount=total_amount,
            payment_method=data.payment_method,
            payment_type='PRIMARY_PURCHASE',
            status='FAILED',
            failure_reason='Simulated card/UPI failure during checkout test.',
            timestamp=now
        )
        db.add(p)
        db.commit()
        raise HTTPException(402, 'Simulated payment failed. No tickets were issued.')

    # Payment succeeded -> issue payment record
    p = models.Payment(
        tx_ref=tx_ref,
        user_email=data.email,
        user_name=data.name,
        event_id=e.id,
        amount=total_amount,
        payment_method=data.payment_method,
        payment_type='PRIMARY_PURCHASE',
        status='SUCCESS',
        timestamp=now
    )
    db.add(p)

    # Issue tickets with secure tokens
    created_tokens = []
    issued_tickets = []
    max_resale = round(e.price * e.resale_cap_multiplier, 2)

    for i in range(data.quantity):
        raw_token = f"FP-EV{e.id}-TKT{secrets.token_hex(5).upper()}"
        secret_hash = secrets.token_hex(16)
        
        t = models.Ticket(
            event_id=e.id,
            event_name=e.name,
            owner_email=data.email,
            owner_name=data.name,
            face_price=e.price,
            max_resale_price=max_resale,
            token=raw_token,
            secret_hash=secret_hash,
            status='ACTIVE',
            redeemed=False,
            created_at=now
        )
        db.add(t)
        db.flush()  # to obtain t.id

        # Record ownership history
        h = models.TicketOwnershipHistory(
            ticket_id=t.id,
            event_id=e.id,
            from_email='BOX_OFFICE',
            from_name='FairPass Box Office',
            to_email=data.email,
            to_name=data.name,
            action='INITIAL_PURCHASE',
            price=e.price,
            old_token=None,
            new_token=raw_token,
            timestamp=now
        )
        db.add(h)
        created_tokens.append(raw_token)
        issued_tickets.append(t)

    # Update event sold count
    e.sold += data.quantity

    # If user was in queue, update status
    q_entry = db.query(models.QueueEntry).filter_by(event_id=e.id, email=data.email).first()
    if q_entry:
        q_entry.status = 'COMPLETED'

    db.commit()

    return {
        'message': f"Booking successful! {data.quantity} ticket(s) issued for {e.name}.",
        'tx_ref': tx_ref,
        'quantity': data.quantity,
        'total_paid': total_amount,
        'tokens': created_tokens,
        'tickets': [serialize_ticket(t, db) for t in issued_tickets]
    }

# -----------------
# 7. Ticket Wallet & Details
# -----------------
@app.get('/api/tickets')
def get_user_tickets(email: str, db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).filter(
        models.Ticket.owner_email == email.strip().lower()
    ).order_by(models.Ticket.id.desc()).all()
    return [serialize_ticket(t, db) for t in tickets]

@app.get('/api/tickets/{ticket_id}')
def get_ticket_detail(ticket_id: int, db: Session = Depends(get_db)):
    t = db.query(models.Ticket).filter_by(id=ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    
    # Ownership history
    history = db.query(models.TicketOwnershipHistory).filter_by(ticket_id=t.id).order_by(models.TicketOwnershipHistory.timestamp.asc()).all()
    history_data = [{
        'action': h.action,
        'from_name': h.from_name,
        'from_email': h.from_email,
        'to_name': h.to_name,
        'to_email': h.to_email,
        'price': h.price,
        'timestamp': h.timestamp.isoformat()
    } for h in history]

    ticket_data = serialize_ticket(t, db)
    ticket_data['history'] = history_data
    return ticket_data

# -----------------
# 8. Capped Ticket Resale
# -----------------
@app.get('/api/resale/listings')
def get_resale_listings(db: Session = Depends(get_db)):
    listings = db.query(models.ResaleListing).filter_by(active=True).order_by(models.ResaleListing.created_at.desc()).all()
    results = []
    for l in listings:
        t = db.query(models.Ticket).filter_by(id=l.ticket_id).first()
        e = db.query(models.Event).filter_by(id=l.event_id).first() if l.event_id else None
        results.append({
            'id': l.id,
            'ticket_id': l.ticket_id,
            'event_id': l.event_id,
            'event_name': l.event_name,
            'seller_email': l.seller_email,
            'seller_name': l.seller_name,
            'price': l.price,
            'cap': l.cap,
            'face_price': t.face_price if t else l.price,
            'poster_url': e.poster_url if e else None,
            'date': e.date if e else 'TBA',
            'venue': e.venue if e else 'TBA',
            'created_at': l.created_at.isoformat()
        })
    return results

@app.post('/api/resale/list')
def create_resale_listing(data: schemas.ResaleListRequest, db: Session = Depends(get_db)):
    t = db.query(models.Ticket).filter_by(id=data.ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    
    if t.owner_email != data.seller_email.strip().lower():
        raise HTTPException(403, 'Unauthorized: Only the verified current owner can resell this ticket')
    
    if t.status != 'ACTIVE' or t.redeemed:
        raise HTTPException(400, 'Ticket is not eligible for resale (already redeemed or inactive)')
    
    e = db.query(models.Event).filter_by(id=t.event_id).first()
    if not e or not e.resale_enabled:
        raise HTTPException(400, 'Resale is disabled for this event')
    
    # BACKEND PRICE CAP ENFORCEMENT
    if data.price > t.max_resale_price:
        raise HTTPException(
            400,
            f"Resale price ₹{data.price:,.2f} exceeds the mandatory fair price cap of ₹{t.max_resale_price:,.2f} ({e.resale_cap_multiplier}x face value)!"
        )
    if data.price <= 0:
        raise HTTPException(400, 'Resale price must be positive')

    # Check for existing listing
    existing = db.query(models.ResaleListing).filter_by(ticket_id=t.id, active=True).first()
    if existing:
        raise HTTPException(400, 'Ticket is already listed in the marketplace')

    listing = models.ResaleListing(
        ticket_id=t.id,
        event_id=t.event_id,
        event_name=t.event_name,
        seller_email=data.seller_email.strip().lower(),
        seller_name=t.owner_name or 'Seller',
        price=data.price,
        cap=t.max_resale_price,
        active=True
    )
    db.add(listing)
    db.commit()

    return {'message': f"Ticket #{t.id} successfully listed for resale at ₹{data.price:,.2f} (Cap: ₹{t.max_resale_price:,.2f})"}

@app.post('/api/resale/execute')
def execute_resale(data: schemas.ResaleExecuteRequest, db: Session = Depends(get_db)):
    """
    Executes resale:
    - Validates ownership
    - Enforces resale price cap (backend rejection if exceeded)
    - Simulates payment
    - On failure: cancels and keeps old ownership
    - On success:
      - Transfers ownership
      - Invalidates old QR token
      - Generates brand new QR token for buyer
      - Records ownership history and payment
    """
    t = db.query(models.Ticket).filter_by(id=data.ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    
    seller = data.seller_email.strip().lower()
    buyer = data.buyer_email.strip().lower()

    if t.owner_email != seller:
        raise HTTPException(403, 'Unauthorized: Seller is no longer the owner of this ticket')
    
    if t.status != 'ACTIVE' or t.redeemed:
        raise HTTPException(400, 'Ticket is already redeemed or no longer active for resale')
    
    if seller == buyer:
        raise HTTPException(400, 'Cannot buy your own ticket')

    # ENFORCE PRICE CAP ON BACKEND
    if data.resale_price > t.max_resale_price:
        raise HTTPException(
            400,
            f"ANTI-SCALPING VIOLATION: Resale price ₹{data.resale_price:,.2f} exceeds maximum allowed cap of ₹{t.max_resale_price:,.2f}!"
        )

    now = datetime.utcnow()
    tx_ref = f"TXN-RESALE-{now.strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

    # Handle payment failure option
    if data.simulate_failure:
        p = models.Payment(
            tx_ref=tx_ref,
            user_email=buyer,
            user_name=data.buyer_name,
            ticket_id=t.id,
            amount=data.resale_price,
            payment_method=data.payment_method,
            payment_type='RESALE',
            status='FAILED',
            failure_reason='Buyer simulated payment cancellation/failure during resale test.',
            timestamp=now
        )
        db.add(p)
        db.commit()
        raise HTTPException(402, 'Resale payment was simulated as failed. Ownership has NOT been transferred.')

    # Record successful payment
    p = models.Payment(
        tx_ref=tx_ref,
        user_email=buyer,
        user_name=data.buyer_name,
        ticket_id=t.id,
        amount=data.resale_price,
        payment_method=data.payment_method,
        payment_type='RESALE',
        status='SUCCESS',
        timestamp=now
    )
    db.add(p)

    # Ownership Transfer & QR Code Invalidation
    old_token = t.token
    new_token = f"FP-EV{t.event_id}-TKT{secrets.token_hex(5).upper()}-RESOLD"

    # Revoke any active share on old ticket
    active_shares = db.query(models.TicketShare).filter_by(ticket_id=t.id, status='ACTIVE').all()
    for s in active_shares:
        s.status = 'REVOKED'
        s.revoked_at = now

    # Record in history
    history = models.TicketOwnershipHistory(
        ticket_id=t.id,
        event_id=t.event_id,
        from_email=seller,
        from_name=t.owner_name or 'Previous Owner',
        to_email=buyer,
        to_name=data.buyer_name,
        action='RESOLD',
        price=data.resale_price,
        old_token=old_token,
        new_token=new_token,
        timestamp=now
    )
    db.add(history)

    # Invalidate old token by updating ticket to new token and new owner
    t.owner_email = buyer
    t.owner_name = data.buyer_name
    t.token = new_token
    t.secret_hash = secrets.token_hex(16)
    t.status = 'ACTIVE'

    # Inactivate any active marketplace listing
    listing = db.query(models.ResaleListing).filter_by(ticket_id=t.id, active=True).first()
    if listing:
        listing.active = False

    # Log security audit
    log = models.SecurityLog(
        event_id=t.event_id,
        log_type="RESALE_COMPLETED",
        identifier=buyer,
        severity="INFO",
        details=f"Ticket #{t.id} transferred from {seller} to {buyer} for ₹{data.resale_price}. Old QR '{old_token}' invalidated; New QR '{new_token}' generated.",
        timestamp=now
    )
    db.add(log)
    db.commit()

    return {
        'message': f"Resale successful! Ticket #{t.id} ownership transferred to {data.buyer_name} ({buyer}).",
        'tx_ref': tx_ref,
        'old_token_invalidated': old_token,
        'new_token': new_token,
        'new_ticket': serialize_ticket(t, db)
    }

# -----------------
# 9. Non-Permanent Ticket Sharing
# -----------------
@app.post('/api/tickets/{ticket_id}/share')
def share_ticket(ticket_id: int, data: schemas.ShareCreateRequest, db: Session = Depends(get_db)):
    t = db.query(models.Ticket).filter_by(id=ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    
    if t.owner_email != data.owner_email.strip().lower():
        raise HTTPException(403, 'Unauthorized: Only the current ticket owner can share this ticket')
    
    if t.status != 'ACTIVE' or t.redeemed:
        raise HTTPException(400, 'Ticket is not eligible for sharing (already redeemed or inactive)')
    
    recipient = data.recipient_email.strip().lower()
    if recipient == t.owner_email:
        raise HTTPException(400, 'Cannot share a ticket with yourself')

    # Controlled sharing model: Invalidate any previous active share on this ticket
    previous_shares = db.query(models.TicketShare).filter_by(ticket_id=t.id, status='ACTIVE').all()
    for ps in previous_shares:
        ps.status = 'REVOKED'
        ps.revoked_at = datetime.utcnow()

    # Generate unique guest share token
    share_token = f"FP-GUEST-{t.id}-{secrets.token_hex(4).upper()}"
    share = models.TicketShare(
        ticket_id=t.id,
        event_id=t.event_id,
        owner_email=t.owner_email,
        recipient_name=data.recipient_name,
        recipient_email=recipient,
        share_token=share_token,
        status='ACTIVE',
        note=data.note or 'Guest Pass',
        created_at=datetime.utcnow()
    )
    db.add(share)

    log = models.SecurityLog(
        event_id=t.event_id,
        log_type="TICKET_SHARED",
        identifier=t.owner_email,
        severity="INFO",
        details=f"Ticket #{t.id} shared as guest pass with {data.recipient_name} ({recipient}). Ownership remains with {t.owner_email}.",
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {
        'message': f"Guest pass shared with {data.recipient_name} ({recipient}). Permanent ownership remains with you.",
        'share_token': share_token,
        'share_id': share.id
    }

@app.get('/api/tickets/shared-with-me')
def get_shared_with_me(email: str, db: Session = Depends(get_db)):
    shares = db.query(models.TicketShare).filter(
        models.TicketShare.recipient_email == email.strip().lower(),
        models.TicketShare.status == 'ACTIVE'
    ).order_by(models.TicketShare.created_at.desc()).all()

    results = []
    for s in shares:
        t = db.query(models.Ticket).filter_by(id=s.ticket_id).first()
        if t and not t.redeemed:
            e = db.query(models.Event).filter_by(id=t.event_id).first()
            results.append({
                'share_id': s.id,
                'ticket_id': t.id,
                'event_id': t.event_id,
                'event_name': t.event_name,
                'venue': e.venue if e else 'TBA',
                'date': e.date if e else 'TBA',
                'owner_name': t.owner_name,
                'owner_email': t.owner_email,
                'share_token': s.share_token,
                'qr_url': generate_qr_data_url(s.share_token),
                'status': 'SHARED_GUEST_PASS',
                'created_at': s.created_at.isoformat()
            })
    return results

@app.post('/api/tickets/{ticket_id}/revoke-share')
def revoke_share(ticket_id: int, data: schemas.ShareRevokeRequest, db: Session = Depends(get_db)):
    t = db.query(models.Ticket).filter_by(id=ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    
    if t.owner_email != data.owner_email.strip().lower():
        raise HTTPException(403, 'Unauthorized: Only the current owner can revoke sharing')

    shares = db.query(models.TicketShare).filter_by(ticket_id=t.id, status='ACTIVE').all()
    if not shares:
        raise HTTPException(400, 'No active sharing found on this ticket')

    now = datetime.utcnow()
    revoked_names = []
    for s in shares:
        s.status = 'REVOKED'
        s.revoked_at = now
        revoked_names.append(s.recipient_name)

    log = models.SecurityLog(
        event_id=t.event_id,
        log_type="SHARE_REVOKED",
        identifier=data.owner_email,
        severity="INFO",
        details=f"Guest pass for Ticket #{t.id} revoked from {', '.join(revoked_names)}.",
        timestamp=now
    )
    db.add(log)
    db.commit()

    return {'message': 'Ticket share access successfully revoked. Exclusive access restored to owner.'}

# -----------------
# 10. Secure Gate Verification & Redemption
# -----------------
@app.post('/api/verify')
def verify_gate(data: schemas.VerifyRequest, db: Session = Depends(get_db)):
    token = data.token.strip()
    now = datetime.utcnow()

    # 1. Check if token is an active primary ticket
    t = db.query(models.Ticket).filter_by(token=token).first()
    if t:
        e = db.query(models.Event).filter_by(id=t.event_id).first()
        event_name = e.name if e else t.event_name
        venue = e.venue if e else 'TBA'

        if t.redeemed:
            return {
                'status': 'ALREADY_REDEEMED',
                'badge': 'ALREADY REDEEMED',
                'valid': False,
                'message': f"ENTRY REJECTED: Ticket #{t.id} was already redeemed at {t.redeemed_at.strftime('%Y-%m-%d %H:%M:%S') if t.redeemed_at else 'earlier'}.",
                'ticket_id': t.id,
                'event_name': event_name,
                'owner_name': t.owner_name,
                'redeemed_at': t.redeemed_at.isoformat() if t.redeemed_at else None
            }
        
        if t.status != 'ACTIVE':
            return {
                'status': 'CANCELLED',
                'badge': 'INACTIVE TICKET',
                'valid': False,
                'message': f"ENTRY REJECTED: Ticket status is {t.status}.",
                'ticket_id': t.id,
                'event_name': event_name,
                'owner_name': t.owner_name
            }

        # Valid active ticket -> Redeem atomically
        t.redeemed = True
        t.status = 'REDEEMED'
        t.redeemed_at = now
        t.redeemed_by_gate = data.gate_operator or 'Gate 1'

        # Also mark any active share as redeemed
        active_share = db.query(models.TicketShare).filter_by(ticket_id=t.id, status='ACTIVE').first()
        if active_share:
            active_share.status = 'REDEEMED'

        log = models.SecurityLog(
            event_id=t.event_id,
            log_type="TICKET_REDEEMED",
            identifier=t.owner_email,
            severity="INFO",
            details=f"Ticket #{t.id} successfully verified and redeemed at {data.gate_operator}.",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            'status': 'VALID',
            'badge': 'VALID TICKET — ENTRY APPROVED',
            'valid': True,
            'message': f"ENTRY APPROVED: Welcome, {t.owner_name}! Ticket #{t.id} verified and redeemed.",
            'ticket_id': t.id,
            'event_name': event_name,
            'venue': venue,
            'owner_name': t.owner_name,
            'owner_email': t.owner_email,
            'face_price': t.face_price,
            'redeemed_at': now.isoformat()
        }

    # 2. Check if token is a shared guest pass
    s = db.query(models.TicketShare).filter_by(share_token=token).first()
    if s:
        t = db.query(models.Ticket).filter_by(id=s.ticket_id).first()
        e = db.query(models.Event).filter_by(id=s.event_id).first() if s.event_id else None
        event_name = e.name if e else 'Live Event'

        if s.status == 'REVOKED':
            return {
                'status': 'REVOKED',
                'badge': 'SHARE REVOKED',
                'valid': False,
                'message': f"ENTRY REJECTED: Guest pass was revoked by the original owner ({s.owner_email}).",
                'ticket_id': s.ticket_id,
                'event_name': event_name
            }

        if s.status == 'REDEEMED' or (t and t.redeemed):
            return {
                'status': 'ALREADY_REDEEMED',
                'badge': 'ALREADY REDEEMED',
                'valid': False,
                'message': 'ENTRY REJECTED: This ticket or its guest pass has already been redeemed.',
                'ticket_id': s.ticket_id,
                'event_name': event_name
            }

        # Valid guest pass -> Redeem atomically
        s.status = 'REDEEMED'
        if t:
            t.redeemed = True
            t.status = 'REDEEMED'
            t.redeemed_at = now
            t.redeemed_by_gate = data.gate_operator

        log = models.SecurityLog(
            event_id=s.event_id,
            log_type="GUEST_PASS_REDEEMED",
            identifier=s.recipient_email,
            severity="INFO",
            details=f"Guest pass for Ticket #{s.ticket_id} redeemed by {s.recipient_name}.",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            'status': 'VALID',
            'badge': 'VALID GUEST PASS — ENTRY APPROVED',
            'valid': True,
            'message': f"ENTRY APPROVED: Welcome, {s.recipient_name} (Guest of {s.owner_email})! Entry granted.",
            'ticket_id': s.ticket_id,
            'event_name': event_name,
            'owner_name': f"{s.recipient_name} (Guest Pass)",
            'redeemed_at': now.isoformat()
        }

    # 3. Check if token was an OLD invalidated token replaced by resale
    old_tx = db.query(models.TicketOwnershipHistory).filter_by(old_token=token).first()
    if old_tx:
        return {
            'status': 'TRANSFERRED',
            'badge': 'INVALIDATED (RESOLD)',
            'valid': False,
            'message': f"ENTRY REJECTED: This QR token was permanently invalidated due to resale to {old_tx.to_name} on {old_tx.timestamp.strftime('%Y-%m-%d %H:%M')}. Only the new owner's QR code is valid.",
            'ticket_id': old_tx.ticket_id,
            'transferred_to': old_tx.to_name
        }

    # 4. Unknown / Counterfeit token
    return {
        'status': 'INVALID',
        'badge': 'INVALID / COUNTERFEIT',
        'valid': False,
        'message': 'ENTRY REJECTED: Unrecognized ticket token. No authentic ticket record exists in the FairPass registry.'
    }

# -----------------
# 11. Blockchain Sync
# -----------------
@app.post('/api/blockchain/record-tx')
def record_blockchain_tx(ticket_id: int, tx_hash: str, token_id: Optional[int] = None, db: Session = Depends(get_db)):
    t = db.query(models.Ticket).filter_by(id=ticket_id).first()
    if not t:
        raise HTTPException(404, 'Ticket not found')
    t.blockchain_tx = tx_hash
    if token_id:
        t.blockchain_token_id = token_id
    db.commit()

    log = models.SecurityLog(
        event_id=t.event_id,
        log_type="BLOCKCHAIN_CONFIRMED",
        identifier=t.owner_email,
        severity="INFO",
        details=f"Ticket #{t.id} synced on-chain with tx {tx_hash} (Token ID: {token_id}).",
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

    return {'message': 'Blockchain transaction recorded successfully', 'ticket_id': t.id, 'tx_hash': tx_hash}
