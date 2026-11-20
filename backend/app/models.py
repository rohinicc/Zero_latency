from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from datetime import datetime
from .database import Base

class Event(Base):
    __tablename__ = 'events'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, default='')
    poster_url = Column(String, default='')
    venue = Column(String, default='TBA')
    date = Column(String, default='')
    category = Column(String, default='Music')
    sales_start = Column(String, default='')
    sales_end = Column(String, default='')
    quantity = Column(Integer, default=100)
    sold = Column(Integer, default=0)
    price = Column(Float, default=1000.0)
    max_per_user = Column(Integer, default=2)
    resale_enabled = Column(Boolean, default=True)
    resale_cap_multiplier = Column(Float, default=1.1)  # 1.1x max resale cap
    restricted_window_enabled = Column(Boolean, default=True)
    queue_enabled = Column(Boolean, default=True)
    bot_protection_enabled = Column(Boolean, default=True)
    organizer_email = Column(String, default='admin@fairpass.io')
    created_at = Column(DateTime, default=datetime.utcnow)

class Ticket(Base):
    __tablename__ = 'tickets'
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey('events.id'), index=True)
    event_name = Column(String)
    owner_email = Column(String, index=True)
    owner_name = Column(String)
    face_price = Column(Float)
    max_resale_price = Column(Float)
    token = Column(String, unique=True, index=True)  # Current active QR token
    secret_hash = Column(String, default='')
    status = Column(String, default='ACTIVE')  # ACTIVE, RESOLD, REDEEMED, CANCELLED
    redeemed = Column(Boolean, default=False)
    redeemed_at = Column(DateTime, nullable=True)
    redeemed_by_gate = Column(String, nullable=True)
    blockchain_tx = Column(String, nullable=True)
    blockchain_token_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TicketOwnershipHistory(Base):
    __tablename__ = 'ticket_ownership_history'
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), index=True)
    event_id = Column(Integer)
    from_email = Column(String)
    from_name = Column(String)
    to_email = Column(String)
    to_name = Column(String)
    action = Column(String)  # INITIAL_PURCHASE, RESOLD, TRANSFERRED
    price = Column(Float, default=0.0)
    old_token = Column(String, nullable=True)
    new_token = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class TicketShare(Base):
    __tablename__ = 'ticket_shares'
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), index=True)
    event_id = Column(Integer)
    owner_email = Column(String, index=True)
    recipient_name = Column(String)
    recipient_email = Column(String, index=True)
    share_token = Column(String, unique=True, index=True)
    status = Column(String, default='ACTIVE')  # ACTIVE, REVOKED, REDEEMED
    note = Column(String, default='')
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked_at = Column(DateTime, nullable=True)

class ResaleListing(Base):
    __tablename__ = 'resale_listings'
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), index=True)
    event_id = Column(Integer)
    event_name = Column(String)
    seller_email = Column(String, index=True)
    seller_name = Column(String)
    price = Column(Float)
    cap = Column(Float)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    tx_ref = Column(String, unique=True, index=True)
    user_email = Column(String, index=True)
    user_name = Column(String)
    event_id = Column(Integer, nullable=True)
    ticket_id = Column(Integer, nullable=True)
    amount = Column(Float)
    payment_method = Column(String)  # UPI, Net Banking, Debit Card, Credit Card
    payment_type = Column(String)    # PRIMARY_PURCHASE, RESALE
    status = Column(String, default='SUCCESS')  # SUCCESS, FAILED
    failure_reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class QueueEntry(Base):
    __tablename__ = 'queue_entries'
    # Pure event queue - NO reservation_amount, NO deposit!
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey('events.id'), index=True)
    email = Column(String, index=True)
    name = Column(String, default='Guest')
    position = Column(Integer, default=1)
    status = Column(String, default='WAITING')  # WAITING, ADMITTED, EXPIRED
    session_id = Column(String, nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

class AccessAttempt(Base):
    __tablename__ = 'access_attempts'
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, index=True)
    identifier = Column(String, index=True)  # email, IP, or session token
    ip_address = Column(String, default='127.0.0.1')
    session_id = Column(String, default='')
    duration_ms = Column(Integer, default=0)
    is_bot_flag = Column(Boolean, default=False)
    risk_score = Column(Float, default=0.0)  # 0.0 (safe) to 1.0 (certain bot)
    timestamp = Column(DateTime, default=datetime.utcnow)

class BotRestriction(Base):
    __tablename__ = 'bot_restrictions'
    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String, index=True)
    event_id = Column(Integer, nullable=True)
    reason = Column(String)
    attempts_count = Column(Integer, default=0)
    restricted_until = Column(DateTime)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SecurityLog(Base):
    __tablename__ = 'security_logs'
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, nullable=True, index=True)
    log_type = Column(String, index=True)  # RATE_LIMIT_EXCEEDED, RAPID_BURST_BOT, SUSPICIOUS_TIMING, ACCESS_RESTRICTED, ACCESS_UNBLOCKED, CHALLENGE_PASSED
    identifier = Column(String, index=True)
    severity = Column(String, default='WARNING')  # INFO, WARNING, CRITICAL
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
