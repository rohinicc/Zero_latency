"""
Security service adapter bridging to the Behavioral Risk Engine.
Preserves backwards compatibility for existing imports while utilizing the new risk engine.
"""

from .risk_engine import (
    evaluate_behavioral_risk,
    lift_restriction,
    check_active_restriction,
    make_challenge_token,
    verify_challenge_token,
    RiskWeights,
    RiskThresholds,
    DEFAULT_WEIGHTS,
    DEFAULT_THRESHOLDS
)
from sqlalchemy.orm import Session

def evaluate_access(db: Session, event_id: int, email: str, ip: str, duration_ms: int, session_id: str = "") -> dict:
    return evaluate_behavioral_risk(
        db=db,
        event_id=event_id,
        identifier=email,
        ip_address=ip,
        duration_ms=duration_ms,
        session_id=session_id
    )
