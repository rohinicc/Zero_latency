"""
FairPass Behavioral Risk Engine
Configurable multi-signal risk evaluation system that scores incoming requests
based on timing, burst frequency, queue anomalies, session integrity, and bypass attempts.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import json
import secrets
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models

CHALLENGE_SECRET = "fairpass-security-salt-2026"

@dataclass
class RiskWeights:
    rapid_submission_sub300: float = 0.50
    rapid_submission_sub800: float = 0.25
    burst_high: float = 0.45               # >= 15 requests in window
    burst_medium: float = 0.25             # >= 5 requests in window
    abnormal_queue_attempts: float = 0.30  # >= 3 queue requests in window
    failed_queue_auth: float = 0.40        # Invalid or expired queue tokens
    bypass_attempts: float = 0.50          # Access attempt while restricted or without token
    session_anomaly: float = 0.30          # IP shifting for same session
    booking_burst: float = 0.35            # Repeated rapid booking calls

@dataclass
class RiskThresholds:
    low_cutoff: float = 0.40               # Scores < 0.40: LOW (ALLOW)
    medium_cutoff: float = 0.75            # 0.40 <= Scores < 0.75: MEDIUM (CHALLENGE_REQUIRED)
    high_cutoff: float = 0.75              # Scores >= 0.75: HIGH (RESTRICTED)
    burst_hard_limit: int = 50             # 50 requests in window triggers automatic lockout
    window_seconds: int = 60               # 60s rolling window
    lockout_minutes: int = 5               # 5m temporary lockout

# Default global configurations (can be customized per event/server)
DEFAULT_WEIGHTS = RiskWeights()
DEFAULT_THRESHOLDS = RiskThresholds()

def make_challenge_token(question: str, answer: int) -> str:
    raw = f"{question}:{answer}:{CHALLENGE_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]

def verify_challenge_token(question: str, answer: int, token: str) -> bool:
    expected = make_challenge_token(question, answer)
    return secrets.compare_digest(expected, token)

def check_active_restriction(db: Session, identifier: str) -> Optional[models.BotRestriction]:
    now = datetime.utcnow()
    restriction = db.query(models.BotRestriction).filter(
        models.BotRestriction.identifier == identifier,
        models.BotRestriction.is_active == True,
        models.BotRestriction.restricted_until > now
    ).first()
    return restriction

def evaluate_behavioral_risk(
    db: Session,
    event_id: int,
    identifier: str,
    ip_address: str,
    duration_ms: int,
    session_id: str = "",
    weights: RiskWeights = DEFAULT_WEIGHTS,
    thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
    context_signal: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates multiple behavioral signals, calculates normalized risk score,
    determines classification (LOW, MEDIUM, HIGH), and executes appropriate action.
    """
    now = datetime.utcnow()
    clean_id = identifier.strip().lower()

    # 1. Check existing active restriction
    active_res = check_active_restriction(db, clean_id)
    if active_res:
        remaining_sec = max(0, int((active_res.restricted_until - now).total_seconds()))
        return {
            "status": "RESTRICTED",
            "risk_score": 1.0,
            "risk_classification": "HIGH",
            "reason": f"Account temporarily restricted: {active_res.reason}",
            "triggered_signals": ["EXISTING_ACTIVE_LOCKOUT"],
            "action_taken": "RESTRICTED",
            "restricted_until": active_res.restricted_until.isoformat(),
            "remaining_seconds": remaining_sec
        }

    window_start = now - timedelta(seconds=thresholds.window_seconds)
    triggered_signals: List[str] = []
    raw_risk: float = 0.0

    # 2. Timing signal: Extremely rapid submission
    if duration_ms < 300:
        raw_risk += weights.rapid_submission_sub300
        triggered_signals.append(f"EXTREMELY_RAPID_SUBMISSION ({duration_ms}ms < 300ms)")
    elif duration_ms < 800:
        raw_risk += weights.rapid_submission_sub800
        triggered_signals.append(f"FAST_INTERACTION ({duration_ms}ms < 800ms)")

    # 3. Burst request signal in rolling window
    recent_attempts = db.query(models.AccessAttempt).filter(
        models.AccessAttempt.identifier == clean_id,
        models.AccessAttempt.timestamp >= window_start
    ).count()

    if recent_attempts >= 15:
        raw_risk += weights.burst_high
        triggered_signals.append(f"HIGH_BURST_FREQUENCY ({recent_attempts} reqs in {thresholds.window_seconds}s)")
    elif recent_attempts >= 5:
        raw_risk += weights.burst_medium
        triggered_signals.append(f"MODERATE_BURST_FREQUENCY ({recent_attempts} reqs in {thresholds.window_seconds}s)")

    # 4. Abnormal queue activity
    recent_queues = db.query(models.QueueEntry).filter(
        models.QueueEntry.email == clean_id,
        models.QueueEntry.event_id == event_id,
        models.QueueEntry.joined_at >= window_start
    ).count()
    if recent_queues >= 3:
        raw_risk += weights.abnormal_queue_attempts
        triggered_signals.append(f"ABNORMAL_QUEUE_ATTEMPTS ({recent_queues} entries)")

    # 5. Failed queue authorization or bypass signals in security logs
    recent_auth_fails = db.query(models.SecurityLog).filter(
        models.SecurityLog.identifier == clean_id,
        models.SecurityLog.log_type.in_(["QUEUE_AUTH_FAILED", "QUEUE_TOKEN_INVALID", "QUEUE_TOKEN_EXPIRED"]),
        models.SecurityLog.timestamp >= window_start
    ).count()
    if recent_auth_fails > 0:
        raw_risk += weights.failed_queue_auth
        triggered_signals.append(f"FAILED_QUEUE_AUTH ({recent_auth_fails} invalid attempts)")

    # 6. Session / IP anomaly
    if session_id:
        distinct_ips = db.query(models.AccessAttempt.ip_address).filter(
            models.AccessAttempt.session_id == session_id,
            models.AccessAttempt.timestamp >= window_start
        ).distinct().count()
        if distinct_ips >= 2:
            raw_risk += weights.session_anomaly
            triggered_signals.append(f"SESSION_IP_ANOMALY ({distinct_ips} distinct IPs)")

    # Optional extra context signal
    if context_signal:
        triggered_signals.append(context_signal)
        if "QUEUE_BYPASS" in context_signal:
            raw_risk += weights.bypass_attempts
        elif "BOOKING_BURST" in context_signal:
            raw_risk += weights.booking_burst

    # Normalize risk score to 0.0 - 1.0
    risk_score = round(min(1.0, max(0.0, raw_risk)), 2)

    # Record current attempt
    is_bot = risk_score >= thresholds.medium_cutoff
    attempt = models.AccessAttempt(
        event_id=event_id,
        identifier=clean_id,
        ip_address=ip_address,
        session_id=session_id,
        duration_ms=duration_ms,
        is_bot_flag=is_bot,
        risk_score=risk_score,
        timestamp=now
    )
    db.add(attempt)
    db.commit()

    total_attempts = recent_attempts + 1

    # 7. Check 50-request hard threshold burst lockout
    if total_attempts >= thresholds.burst_hard_limit:
        until = now + timedelta(minutes=thresholds.lockout_minutes)
        reason = f"Excessive access attempts detected ({total_attempts} requests in {thresholds.window_seconds}s)"
        triggered_signals.append("EXCESSIVE_BURST_HARD_LIMIT_REACHED")
        
        restriction = models.BotRestriction(
            identifier=clean_id,
            event_id=event_id,
            reason=reason,
            attempts_count=total_attempts,
            restricted_until=until,
            is_active=True,
            created_at=now
        )
        db.add(restriction)

        # Record in RiskAssessment table
        risk_rec = models.RiskAssessment(
            event_id=event_id,
            identifier=clean_id,
            session_id=session_id,
            ip_address=ip_address,
            risk_score=1.0,
            risk_classification="HIGH",
            triggered_signals=json.dumps(triggered_signals),
            action_taken="RESTRICTED",
            duration_ms=duration_ms,
            timestamp=now
        )
        db.add(risk_rec)

        log = models.SecurityLog(
            event_id=event_id,
            log_type="EXCESSIVE_ATTEMPTS",
            identifier=clean_id,
            severity="CRITICAL",
            details=f"Threshold reached ({total_attempts} requests). Enforced {thresholds.lockout_minutes}m lockout.",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            "status": "RESTRICTED",
            "risk_score": 1.0,
            "risk_classification": "HIGH",
            "reason": reason,
            "triggered_signals": triggered_signals,
            "action_taken": "RESTRICTED",
            "restricted_until": until.isoformat(),
            "remaining_seconds": thresholds.lockout_minutes * 60
        }

    # 8. Evaluate action based on risk score
    if risk_score >= thresholds.high_cutoff:
        # High Risk -> Temporary restriction
        until = now + timedelta(minutes=thresholds.lockout_minutes)
        reason = f"High behavioral risk score ({risk_score:.2f}) from suspicious signals: {', '.join(triggered_signals)}"
        
        restriction = models.BotRestriction(
            identifier=clean_id,
            event_id=event_id,
            reason=reason,
            attempts_count=total_attempts,
            restricted_until=until,
            is_active=True,
            created_at=now
        )
        db.add(restriction)

        risk_rec = models.RiskAssessment(
            event_id=event_id,
            identifier=clean_id,
            session_id=session_id,
            ip_address=ip_address,
            risk_score=risk_score,
            risk_classification="HIGH",
            triggered_signals=json.dumps(triggered_signals),
            action_taken="RESTRICTED",
            duration_ms=duration_ms,
            timestamp=now
        )
        db.add(risk_rec)

        log = models.SecurityLog(
            event_id=event_id,
            log_type="HIGH_RISK_RESTRICTION",
            identifier=clean_id,
            severity="CRITICAL",
            details=f"High risk score {risk_score:.2f}. Triggered: {triggered_signals}",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            "status": "RESTRICTED",
            "risk_score": risk_score,
            "risk_classification": "HIGH",
            "reason": reason,
            "triggered_signals": triggered_signals,
            "action_taken": "RESTRICTED",
            "restricted_until": until.isoformat(),
            "remaining_seconds": thresholds.lockout_minutes * 60
        }

    elif risk_score >= thresholds.low_cutoff:
        # Medium Risk -> Require additional verification challenge
        import random
        n1 = random.randint(11, 49)
        n2 = random.randint(12, 50)
        ans = n1 + n2
        question = f"Security verification: What is {n1} + {n2}?"
        token = make_challenge_token(question, ans)

        risk_rec = models.RiskAssessment(
            event_id=event_id,
            identifier=clean_id,
            session_id=session_id,
            ip_address=ip_address,
            risk_score=risk_score,
            risk_classification="MEDIUM",
            triggered_signals=json.dumps(triggered_signals),
            action_taken="CHALLENGE_ISSUED",
            duration_ms=duration_ms,
            timestamp=now
        )
        db.add(risk_rec)

        log = models.SecurityLog(
            event_id=event_id,
            log_type="MEDIUM_RISK_CHALLENGE",
            identifier=clean_id,
            severity="WARNING",
            details=f"Medium risk score {risk_score:.2f}. Challenge issued. Signals: {triggered_signals}",
            timestamp=now
        )
        db.add(log)
        db.commit()

        return {
            "status": "CHALLENGE_REQUIRED",
            "risk_score": risk_score,
            "risk_classification": "MEDIUM",
            "reason": f"Elevated behavioral risk ({risk_score:.2f}). Interactive verification required.",
            "triggered_signals": triggered_signals,
            "action_taken": "CHALLENGE_ISSUED",
            "challenge_question": question,
            "challenge_token": f"{token}:{ans}"
        }

    else:
        # Low Risk -> Clean Human Access
        risk_rec = models.RiskAssessment(
            event_id=event_id,
            identifier=clean_id,
            session_id=session_id,
            ip_address=ip_address,
            risk_score=risk_score,
            risk_classification="LOW",
            triggered_signals=json.dumps(triggered_signals if triggered_signals else ["NORMAL_HUMAN_INTERACTION"]),
            action_taken="ALLOWED",
            duration_ms=duration_ms,
            timestamp=now
        )
        db.add(risk_rec)
        db.commit()

        return {
            "status": "GRANTED",
            "risk_score": risk_score,
            "risk_classification": "LOW",
            "reason": "Behavioral signals verified within normal human parameters.",
            "triggered_signals": triggered_signals if triggered_signals else ["NORMAL_HUMAN_INTERACTION"],
            "action_taken": "ALLOWED"
        }

def lift_restriction(db: Session, identifier: str) -> bool:
    identifier = identifier.strip().lower()
    restrictions = db.query(models.BotRestriction).filter(
        models.BotRestriction.identifier == identifier,
        models.BotRestriction.is_active == True
    ).all()
    if not restrictions:
        return False
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
