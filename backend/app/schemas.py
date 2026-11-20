from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Event schemas
class EventBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = ''
    poster_url: Optional[str] = ''
    venue: str = Field('TBA', min_length=1)
    date: str = Field(..., description="Event date string e.g. 2026-12-20 or 2026-12-20 19:30")
    category: Optional[str] = 'Music'
    sales_start: Optional[str] = ''
    sales_end: Optional[str] = ''
    quantity: int = Field(..., gt=0, description="Total ticket quantity")
    price: float = Field(..., gt=0, description="Face ticket price in INR")
    max_per_user: int = Field(2, ge=1, le=10, description="Maximum tickets allowed per user")
    resale_enabled: bool = True
    resale_cap_multiplier: float = Field(1.1, ge=1.0, le=2.0, description="Price cap multiplier (e.g. 1.1 = 110%)")
    restricted_window_enabled: bool = True
    queue_enabled: bool = True
    bot_protection_enabled: bool = True

class EventCreate(EventBase):
    organizer_email: Optional[str] = 'admin@fairpass.io'

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    poster_url: Optional[str] = None
    venue: Optional[str] = None
    date: Optional[str] = None
    category: Optional[str] = None
    sales_start: Optional[str] = None
    sales_end: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    max_per_user: Optional[int] = None
    resale_enabled: Optional[bool] = None
    resale_cap_multiplier: Optional[float] = None
    restricted_window_enabled: Optional[bool] = None
    queue_enabled: Optional[bool] = None
    bot_protection_enabled: Optional[bool] = None

class EventOut(EventBase):
    id: int
    sold: int
    available: int
    max_resale_price: float
    organizer_email: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Security & Behavioral Risk schemas
class AccessCheckRequest(BaseModel):
    event_id: int
    email: str
    session_id: Optional[str] = ''
    duration_ms: int = Field(0, description="Milliseconds elapsed on page before requesting access")
    client_signals: Optional[dict] = Field(default_factory=dict)

class AccessCheckResponse(BaseModel):
    status: str  # GRANTED, CHALLENGE_REQUIRED, RESTRICTED
    reason: str
    risk_score: float
    risk_classification: Optional[str] = "LOW"
    triggered_signals: Optional[List[str]] = Field(default_factory=list)
    action_taken: Optional[str] = "ALLOWED"
    restricted_until: Optional[str] = None
    remaining_seconds: Optional[int] = None
    challenge_question: Optional[str] = None
    challenge_token: Optional[str] = None

class ChallengeVerifyRequest(BaseModel):
    event_id: int
    email: str
    challenge_token: str
    solution: str

class RiskAssessmentOut(BaseModel):
    id: int
    event_id: int
    identifier: str
    session_id: str
    ip_address: str
    risk_score: float
    risk_classification: str
    triggered_signals: List[str]
    action_taken: str
    duration_ms: int
    timestamp: str

class RiskWeightsConfig(BaseModel):
    rapid_submission_sub300: Optional[float] = None
    rapid_submission_sub800: Optional[float] = None
    burst_high: Optional[float] = None
    burst_medium: Optional[float] = None
    abnormal_queue_attempts: Optional[float] = None
    failed_queue_auth: Optional[float] = None
    bypass_attempts: Optional[float] = None

# Queue schemas
class QueueJoinRequest(BaseModel):
    event_id: int
    email: str
    name: Optional[str] = 'Fan'
    session_id: Optional[str] = ''

class QueueStatusResponse(BaseModel):
    event_id: int
    email: str
    position: int
    total_in_queue: int
    status: str
    estimated_wait_seconds: int

class QueueAdmitResponse(BaseModel):
    status: str
    message: str
    queue_auth_token: Optional[str] = None
    expires_at: Optional[str] = None
    max_quantity: Optional[int] = 2

# Booking & Payment schemas
class BookingRequest(BaseModel):
    event_id: int
    email: str
    name: str = 'Fan'
    quantity: int = Field(1, ge=1)
    payment_method: str = 'UPI'
    simulate_failure: bool = False
    access_token: Optional[str] = None
    queue_auth_token: Optional[str] = Field(None, description="Cryptographically signed queue authorization token")

class DemoPaymentProcessRequest(BaseModel):
    amount: float
    payment_method: str
    user_email: str
    user_name: str
    event_id: Optional[int] = None
    ticket_id: Optional[int] = None
    payment_type: str = 'PRIMARY_PURCHASE'
    simulate_failure: bool = False

# Resale schemas
class ResaleListRequest(BaseModel):
    ticket_id: int
    seller_email: str
    price: float

class ResaleExecuteRequest(BaseModel):
    ticket_id: int
    seller_email: str
    buyer_email: str
    buyer_name: str
    resale_price: float
    payment_method: str = 'UPI'
    simulate_failure: bool = False

# Sharing schemas
class ShareCreateRequest(BaseModel):
    ticket_id: int
    owner_email: str
    recipient_name: str
    recipient_email: str
    note: Optional[str] = ''

class ShareRevokeRequest(BaseModel):
    ticket_id: int
    owner_email: str
    share_id: Optional[int] = None

# Gate verification schema
class VerifyRequest(BaseModel):
    token: str
    gate_operator: Optional[str] = 'Gate 1'

# Security Admin schemas
class UnblockRequest(BaseModel):
    identifier: str

class SimulateAttackRequest(BaseModel):
    event_id: int
    target_email: str
    burst_count: int = 55

class RiskWeightsConfig(BaseModel):
    rapid_submit_weight: Optional[float] = None
    burst_request_weight: Optional[float] = None
    queue_anomaly_weight: Optional[float] = None
    bypass_attempt_weight: Optional[float] = None
    session_anomaly_weight: Optional[float] = None
    medium_threshold: Optional[float] = None
    high_threshold: Optional[float] = None

# Quai Network Integration Schemas
class QuaiSyncRequest(BaseModel):
    ticket_id: int
    buyer_address: Optional[str] = "0x00112233445566778899aabbccddeeff00112233"
    contract_address: Optional[str] = None

class QuaiVerificationResponse(BaseModel):
    exists: bool
    verified: bool
    status: str
    ticket_id: Optional[int] = None
    event_id: Optional[int] = None
    ticket_hash: Optional[str] = None
    quai_tx_hash: Optional[str] = None
    contract_address: Optional[str] = None
    zone: Optional[str] = "cyprus1"
    on_chain_redeemed: Optional[bool] = False
    confirmed_at: Optional[str] = None
    message: str
