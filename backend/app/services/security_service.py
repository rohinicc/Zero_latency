from datetime import datetime, timedelta
import secrets
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models

CHALLENGE_SECRET = "fairpass-security-salt-2026"
BURST_THRESHOLD = 50       # 50 or more access attempts
WINDOW_SECONDS = 60        # 60 second rolling time window
RESTRICTION_MINUTES = 5    # Temporary 5 minute restriction

def make_challenge_token(question: str, answer: int) -> str:
    raw = f"{question}:{answer}:{CHALLENGE_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]

def verify_challenge_token(question: str, answer: int, token: str) -> bool:
    expected = make_challenge_token(question, answer)
    return secrets.compare_digest(expected, token)

def check_active_restriction(db: Session, identifier: str) -> models.BotRestriction:
    now = datetime.utcnow()
    restriction = db.query(models.BotRestriction).filter(
        models.BotRestriction.identifier == identifier,
        models.BotRestriction.is_active == True,
        models.BotRestriction.restricted_until > now
    ).first()
    return restriction

def evaluate_access(db: Session, event_id: int, email: str, ip: str, duration_ms: int, session_id: str = "") -> dict:
    now = datetime.utcnow()
    identifier = email.strip().lower()

    # 1. Check if user is currently restricted
    active_restriction = check_active_restriction(db, identifier)
    if active_restriction:
        remaining_sec = int((active_restriction.restricted_until - now).total_seconds())
        return {
            "status": "RESTRICTED",
            "reason": f"Account temporarily restricted: {active_restriction.reason}",
            "risk_score": 1.0,
            "restricted_until": active_restriction.restricted_until.isoformat(),
            "remaining_seconds": max(0, remaining_sec)
        }

    # 2. Check recent access attempts in window (Rolling 60s)
    window_start = now - timedelta(seconds=WINDOW_SECONDS)
    recent_attempts = db.query(models.AccessAttempt).filter(
        models.AccessAttempt.identifier == identifier,
        models.AccessAttempt.timestamp >= window_start
    ).count()

    # Record current attempt
    risk_score = 0.0
    is_bot = False

    # 3. Timing checks (Interaction timing detection)
    # Humans take at least 800ms-1500ms to open, view, and interact with a restricted access form.
    # Instant submissions (< 500ms) or rapid bursts indicate headless browsers or script automation.
    if duration_ms < 300:
        risk_score += 0.80
        is_bot = True
    elif duration_ms < 800:
        risk_score += 0.50

    if recent_attempts >= 5:
        risk_score += 0.30
    if recent_attempts >= 15:
        risk_score += 0.50

    attempt = models.AccessAttempt(
        event_id=event_id,
        identifier=identifier,
        ip_address=ip,
        session_id=session_id,
        duration_ms=duration_ms,
        is_bot_flag=is_bot,
        risk_score=min(1.0, risk_score),
        timestamp=now
    )
    db.add(attempt)
    db.commit()

    total_attempts_now = recent_attempts + 1

    # 4. Check if threshold of 50 or more attempts is reached (Configurable Threshold)
    if total_attempts_now >= BURST_THRESHOLD:
        until = now + timedelta(minutes=RESTRICTION_MINUTES)
        reason = f"Excessive access attempts detected ({total_attempts_now} requests within {WINDOW_SECONDS}s window)"
        
        restriction = models.BotRestriction(
            identifier=identifier,
            event_id=event_id,
            reason=reason,
            attempts_count=total_attempts_now,
            restricted_until=until,
            is_active=True,
            created_at=now
        )
        db.add(restriction)

        log = models.SecurityLog(
            event_id=event_id,
            log_type="EXCESSIVE_ATTEMPTS",
            identifier=identifier,
            severity="CRITICAL",
            details=f"Threshold reached ({total_attempts_now} requests in {WINDOW_SECONDS}s). Enforced {RESTRICTION_MINUTES}-minute temporary lockout.",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            "status": "RESTRICTED",
            "reason": reason,
            "risk_score": 1.0,
            "restricted_until": until.isoformat(),
            "remaining_seconds": RESTRICTION_MINUTES * 60
        }

    # 5. Suspicious interaction timing / Elevated risk -> Challenge Required
    if risk_score >= 0.5:
        # Issue a challenge
        import random
        n1 = random.randint(11, 49)
        n2 = random.randint(12, 50)
        ans = n1 + n2
        question = f"Security verification: What is {n1} + {n2}?"
        token = make_challenge_token(question, ans)

        log = models.SecurityLog(
            event_id=event_id,
            log_type="SUSPICIOUS_TIMING",
            identifier=identifier,
            severity="WARNING",
            details=f"Fast form submission ({duration_ms}ms, risk {risk_score:.2f}). Interactive challenge issued.",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            "status": "CHALLENGE_REQUIRED",
            "reason": f"Suspicious interaction timing detected ({duration_ms}ms). Complete verification puzzle.",
            "risk_score": risk_score,
            "challenge_question": question,
            "challenge_token": f"{token}:{ans}"  # In demo/prototype, embedded hash:answer for instant deterministic verification
        }

    # 6. Clean human access
    return {
        "status": "GRANTED",
        "reason": "Interaction timing and behavioral signals verified.",
        "risk_score": risk_score
    }

def lift_restriction(db: Session, identifier: str) -> bool:
    identifier = identifier.strip().lower()
    restrictions = db.query(models.BotRestriction).filter(
        models.BotRestriction.identifier == identifier,
        models.BotRestriction.is_active == True
    ).all()
    
    # Deactivate active restrictions
    for r in restrictions:
        r.is_active = False

    # Also clear recent burst attempts so user is not immediately re-locked in the same window
    db.query(models.AccessAttempt).filter(models.AccessAttempt.identifier == identifier).delete()
    
    log = models.SecurityLog(
        event_id=None,
        log_type="ACCESS_UNBLOCKED",
        identifier=identifier,
        severity="INFO",
        details=f"Administrator manually lifted temporary restriction for {identifier}.",
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    return True
