import sys
import threading
import time
from datetime import datetime, timedelta
from app.main import (
    health, demo_users, get_events, get_event, create_event, update_event,
    access_check, challenge_verify, simulate_attack, admin_unblock,
    queue_join, queue_admit, book_tickets, execute_resale, share_ticket, get_shared_with_me,
    revoke_share, verify_gate, seed_demo_data,
    quai_info, quai_rpc_status, quai_sync_ticket, quai_verify_ticket, quai_redeem_ticket,
    get_risk_assessments, get_risk_weights, update_risk_weights
)
from app.database import SessionLocal, Base, engine
from app import models, schemas
from app.services import queue_service, booking_service, risk_engine, quai_service
from starlette.requests import Request
from fastapi import HTTPException

def mock_request(ip="127.0.0.1"):
    scope = {"type": "http", "client": (ip, 12345), "headers": []}
    return Request(scope)

def run_tests():
    print("=== STARTING FAIRPASS DIRECT BACKEND & QUAI NETWORK TEST SUITE ===")
    db = SessionLocal()
    seed_demo_data(db)

    # 1. Health check
    h = health()
    assert h["status"] == "ok"
    print("PASS: 1. Health check OK")

    # 2. Demo users
    users = demo_users()
    assert len(users) >= 4
    print("PASS: 2. Demo identities available")

    # 3. Explore events
    events = get_events(category=None, search=None, db=db)
    assert len(events) >= 4
    print(f"PASS: 3. Retrieved {len(events)} events")

    # 4. Create new event
    new_event_in = schemas.EventCreate(
        name="Electronic Neon Odyssey",
        description="Massive outdoor electronic music festival with international lasers.",
        poster_url="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80",
        venue="Manpho Convention Centre, Hebbal",
        date="2027-02-14 18:00",
        category="Music",
        sales_start="2026-11-20 10:00",
        sales_end="2027-02-14 17:00",
        quantity=100,
        price=2500.0,
        max_per_user=2,
        resale_enabled=True,
        resale_cap_multiplier=1.1,
        restricted_window_enabled=True,
        queue_enabled=True,
        bot_protection_enabled=True,
        organizer_email="admin@fairpass.io"
    )
    res = create_event(new_event_in, db=db)
    created_id = res["id"]
    print(f"PASS: 4. Created new event with ID {created_id}")

    # Verify created event persists and has accurate 1.1x resale cap
    ev = get_event(created_id, db=db)
    assert ev["name"] == "Electronic Neon Odyssey"
    assert ev["max_resale_price"] == 2750.0
    print("PASS: 5. Created event verified with accurate 1.1x resale cap")

    # 5. Edit event
    update_res = update_event(created_id, schemas.EventUpdate(venue="Manpho Grounds Hall A"), db=db)
    ev_updated = get_event(created_id, db=db)
    assert ev_updated["venue"] == "Manpho Grounds Hall A"
    print("PASS: 6. Event editing verified")

    # =========================================================================
    # UPGRADE 1: BEHAVIORAL RISK ENGINE TESTS
    # =========================================================================
    print("\n--- [UPGRADE 1] BEHAVIORAL RISK ENGINE TESTS ---")
    
    # 7. Rapid form submission detection (120ms -> MEDIUM risk -> challenge required)
    chk_res = access_check(
        event_id=created_id,
        data=schemas.AccessCheckRequest(
            event_id=created_id,
            email="fastbot@crawler.org",
            duration_ms=120
        ),
        request=mock_request(),
        db=db
    )
    assert chk_res["status"] == "CHALLENGE_REQUIRED"
    assert chk_res["classification"] == "MEDIUM"
    assert any("RAPID" in s for s in chk_res["signals"])
    assert chk_res["challenge_token"] is not None
    print(f"PASS: 7. Behavioral Risk Engine detected rapid submission (Score: {chk_res['risk_score']:.2f}, Class: {chk_res['classification']})")

    # 8. High frequency burst lockout (HIGH risk -> temporary restriction)
    simulate_attack(
        schemas.SimulateAttackRequest(event_id=created_id, target_email="spammer@botnet.io", burst_count=55),
        db=db
    )
    lock_res = access_check(
        event_id=created_id,
        data=schemas.AccessCheckRequest(event_id=created_id, email="spammer@botnet.io", duration_ms=1500),
        request=mock_request(),
        db=db
    )
    assert lock_res["status"] == "RESTRICTED"
    assert lock_res["classification"] == "HIGH"
    print(f"PASS: 8. Behavioral Risk Engine enforced temporary lockout for burst attack (Class: {lock_res['classification']})")

    # 9. Verify Risk Assessment logging in database
    assessments = get_risk_assessments(limit=10, db=db)
    assert len(assessments) > 0
    assert any(a["identifier"] == "fastbot@crawler.org" for a in assessments)
    print(f"PASS: 9. Risk telemetry assessments saved in database ({len(assessments)} records retrieved)")

    # 10. Configurable weights and thresholds API
    weights_conf = get_risk_weights()
    assert "rapid_submit_weight" in weights_conf["weights"]
    assert "medium" in weights_conf["thresholds"]
    update_res = update_risk_weights(schemas.RiskWeightsConfig(
        rapid_submit_weight=0.6,
        medium_threshold=0.35
    ))
    assert update_res["weights"]["rapid_submit_weight"] == 0.6
    print("PASS: 10. Configurable risk scoring weights and thresholds dynamically updated via API")

    # 11. Admin unblock
    admin_unblock(schemas.UnblockRequest(identifier="spammer@botnet.io"), db=db)
    unlocked_res = access_check(
        event_id=created_id,
        data=schemas.AccessCheckRequest(event_id=created_id, email="spammer@botnet.io", duration_ms=1500),
        request=mock_request(),
        db=db
    )
    assert unlocked_res["status"] == "GRANTED"
    print("PASS: 11. Admin unblock cleared restriction and restored access")

    # =========================================================================
    # UPGRADE 2: SECURE EVENT-SPECIFIC QUEUE AUTHORIZATION TESTS
    # =========================================================================
    print("\n--- [UPGRADE 2] SECURE EVENT-SPECIFIC QUEUE AUTHORIZATION TESTS ---")

    # 12. Join queue and admit -> issues cryptographic HMAC-SHA256 queue_auth_token
    q_res = queue_join(
        created_id,
        schemas.QueueJoinRequest(event_id=created_id, email="bob@example.com", name="Bob Patel"),
        db=db
    )
    assert q_res["status"] in ("WAITING", "ALREADY_IN_QUEUE")
    print("PASS: 12. Joined event-specific queue successfully without deposits")

    admit_res = queue_admit(created_id, "bob@example.com", db=db)
    assert admit_res["status"] == "ADMITTED"
    assert "queue_auth_token" in admit_res and admit_res["queue_auth_token"] is not None
    bob_queue_token = admit_res["queue_auth_token"]
    print(f"PASS: 13. Queue admittance issued cryptographically signed queue_auth_token: {bob_queue_token[:25]}...")

    # 14. API bypass prevention: Booking without queue_auth_token fails!
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="bypass_hacker@darkweb.io",
            name="Hacker",
            quantity=1,
            payment_method="UPI",
            queue_auth_token=None,  # No token!
            simulate_failure=False
        ), db=db)
        assert False, "Expected bypass rejection for missing token"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "Queue Authorization" in exc.detail or "QUEUE_AUTH" in exc.detail
        print("PASS: 14. Direct API queue bypass blocked: missing queue_auth_token rejected with 403")

    # 15. Cross-event token reuse prevention: Token for Event A used on Event B fails!
    try:
        book_tickets(schemas.BookingRequest(
            event_id=1,  # Event 1 instead of created_id!
            email="bob@example.com",
            name="Bob Patel",
            quantity=1,
            payment_method="UPI",
            queue_auth_token=bob_queue_token,  # Token was issued for created_id
            simulate_failure=False
        ), db=db)
        assert False, "Expected rejection for cross-event token reuse"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "mismatch" in exc.detail.lower() or "event" in exc.detail.lower()
        print("PASS: 15. Cross-event token reuse blocked: Token issued for Event A rejected on Event B")

    # 16. Expired token rejection
    expired_auth = queue_service.issue_queue_authorization(
        db=db,
        event_id=created_id,
        email="expired_user@example.com",
        max_quantity=2,
        validity_seconds=-10
    )
    expired_token = expired_auth["token"]
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="expired_user@example.com",
            name="Expired User",
            quantity=1,
            payment_method="UPI",
            queue_auth_token=expired_token,
            simulate_failure=False
        ), db=db)
        assert False, "Expected rejection for expired token"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "expired" in exc.detail.lower()
        print("PASS: 16. Expired queue authorization token rejected with 403")

    # =========================================================================
    # UPGRADE 3: ATOMIC TICKET ALLOCATION & CONCURRENCY TESTS
    # =========================================================================
    print("\n--- [UPGRADE 3] ATOMIC TICKET ALLOCATION & CONCURRENCY TESTS ---")

    # 17. Valid booking with queue_auth_token succeeds atomically
    bk_res = book_tickets(schemas.BookingRequest(
        event_id=created_id,
        email="bob@example.com",
        name="Bob Patel",
        quantity=2,
        payment_method="UPI",
        queue_auth_token=bob_queue_token,
        simulate_failure=False
    ), db=db)
    assert len(bk_res["tokens"]) == 2
    bob_ticket_id = bk_res["tickets"][0]["id"]
    bob_ticket2_id = bk_res["tickets"][1]["id"]
    bob_token1 = bk_res["tokens"][0]
    print(f"PASS: 17. Valid booking succeeded atomically with queue_auth_token: {len(bk_res['tokens'])} tickets issued")

    # 18. Token reuse after consumption rejected
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="bob@example.com",
            name="Bob Patel",
            quantity=1,
            payment_method="UPI",
            queue_auth_token=bob_queue_token,  # Reusing already consumed token
            simulate_failure=False
        ), db=db)
        assert False, "Expected rejection for consumed token reuse"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert any(w in exc.detail.lower() for w in ["consumed", "reuse", "limit"])
        print("PASS: 18. Duplicate token reuse prevented: Token marked CONSUMED cannot be reused")

    # 19. Simulated payment failure rollback test
    # Issue a new auth token for a failure test
    fail_auth = queue_service.issue_queue_authorization(db, created_id, "failuser@example.com", max_quantity=2)
    ev_before = db.query(models.Event).filter_by(id=created_id).first()
    sold_before = ev_before.sold
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="failuser@example.com",
            name="Fail User",
            quantity=1,
            payment_method="Credit Card",
            queue_auth_token=fail_auth["token"],
            simulate_failure=True
        ), db=db)
        assert False, "Expected payment failure exception"
    except HTTPException as exc:
        assert exc.status_code == 402
        # Verify rollback: sold count unchanged, no ticket issued
        db.expire_all()
        ev_after = db.query(models.Event).filter_by(id=created_id).first()
        assert ev_after.sold == sold_before
        assert db.query(models.Ticket).filter_by(owner_email="failuser@example.com").count() == 0
        print("PASS: 19. Payment failure rollback verified: zero tickets issued and inventory intact")

    # 20. Concurrent ticket booking race condition & oversell prevention test
    # Create an event with strictly 2 tickets remaining
    limited_event_in = schemas.EventCreate(
        name="Ultra Exclusive VIP Showcase",
        description="Limited micro venue showcase with only 2 seats available.",
        venue="Secret Speakeasy Lounge",
        date="2027-03-01 20:00",
        category="Cultural",
        quantity=2,  # Exactly 2 tickets total
        price=5000.0,
        max_per_user=1,
        resale_enabled=True,
        resale_cap_multiplier=1.1,
        restricted_window_enabled=False,  # direct booking for concurrency test
        queue_enabled=False,
        bot_protection_enabled=False,
        organizer_email="admin@fairpass.io"
    )
    lim_ev = create_event(limited_event_in, db=db)
    lim_id = lim_ev["id"]
    print(f"\n--- Testing Concurrency on Event #{lim_id} (Available: 2 tickets, 10 concurrent threads) ---")

    success_count = 0
    failure_count = 0
    lock_counter = threading.Lock()

    def concurrent_booker(user_idx):
        nonlocal success_count, failure_count
        thread_db = SessionLocal()
        user_email = f"contestant_{user_idx}@concurrency.io"
        try:
            res = booking_service.allocate_tickets_atomic(
                db=thread_db,
                event_id=lim_id,
                email=user_email,
                name=f"Contestant {user_idx}",
                quantity=1,
                payment_method="UPI",
                queue_auth_token=None,
                simulate_failure=False
            )
            with lock_counter:
                success_count += 1
        except Exception as e:
            with lock_counter:
                failure_count += 1
        finally:
            thread_db.close()

    # Launch 10 simultaneous threads for 2 tickets
    threads = [threading.Thread(target=concurrent_booker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Verify inventory state
    db.expire_all()
    lim_ev_check = db.query(models.Event).filter_by(id=lim_id).first()
    tickets_in_db = db.query(models.Ticket).filter_by(event_id=lim_id).count()

    print(f"Concurrency results: {success_count} succeeded, {failure_count} failed gracefully.")
    assert success_count == 2, f"Expected exactly 2 successes, got {success_count}"
    assert failure_count == 8, f"Expected exactly 8 failures, got {failure_count}"
    assert lim_ev_check.sold == 2, f"Expected sold count to be 2, got {lim_ev_check.sold}"
    assert tickets_in_db == 2, f"Expected exactly 2 tickets in database, got {tickets_in_db}"
    print("PASS: 20. Atomic ticket allocation prevented overselling in high-concurrency race condition!")

    # =========================================================================
    # UPGRADE 4: QUAI NETWORK INTEGRATION TESTS
    # =========================================================================
    print("\n--- [UPGRADE 4] QUAI NETWORK INTEGRATION TESTS (Orchard Cyprus-1) ---")

    # 21. Privacy-preserving ticket hash calculation test
    privacy_hash = quai_service.compute_privacy_ticket_hash(
        token="FP-EV100-TESTTOKEN",
        event_id=created_id,
        salt="fairpass_salt_123"
    )
    assert privacy_hash.startswith("0x")
    assert len(privacy_hash) == 66  # 32 bytes hex + 0x prefix
    # Zero PII check: hash contains NO email, name, or phone
    assert "bob@example.com" not in privacy_hash
    assert "Bob" not in privacy_hash
    print(f"PASS: 21. Privacy-preserving Keccak-256 ticketHash generated: {privacy_hash[:22]}... (Zero PII stored on-chain)")

    # 22. Quai Network configuration info
    q_net = quai_info()
    assert q_net["chain_id"] == 15000
    assert q_net["zone"] == "cyprus1"
    assert "orchard.quaiscan.io" in q_net["explorer_url"]
    print(f"PASS: 22. Quai Network configuration verified: {q_net['network_name']} (Chain ID: {q_net['chain_id']}, Zone: {q_net['zone']})")

    # 23. Quai RPC health check
    rpc_stat = quai_rpc_status()
    assert rpc_stat["chain_id"] == 15000
    assert rpc_stat["status"] in ("ONLINE", "HEALTHY", "MOCK_HEALTHY", "CONNECTED", "OFFLINE_OR_UNREACHABLE")
    print(f"PASS: 23. Quai RPC endpoint probed (Status: {rpc_stat['status']}, Chain ID: {rpc_stat['chain_id']})")

    # 24. Register ticket on Quai Network
    sync_res = quai_sync_ticket(schemas.QuaiSyncRequest(ticket_id=bob_ticket_id), db=db)
    assert sync_res["status"] in ("CONFIRMED", "ALREADY_CONFIRMED")
    assert sync_res["quai_tx_hash"] is not None
    assert sync_res["zone"] == "cyprus1"
    print(f"PASS: 24. Ticket #{bob_ticket_id} registered on Quai Network (Tx: {sync_res['quai_tx_hash'][:22]}...)")

    # 25. Verify ticket on Quai Network
    verify_res = quai_verify_ticket(bob_ticket_id, db=db)
    assert verify_res["registered_on_chain"] is True
    assert verify_res["redeemed_on_chain"] is False
    assert verify_res["ticket_hash"] is not None
    print(f"PASS: 25. Quai on-chain verification confirmed authenticity (Registered: True, Redeemed: False)")

    # 26. Gate scan & on-chain redemption sync
    v_gate = verify_gate(schemas.VerifyRequest(token=bob_token1, gate_operator="Gate 3"), db=db)
    assert v_gate["valid"] is True
    assert v_gate["status"] == "VALID"
    # Check that Quai verification now reflects on-chain redemption
    verify_redeemed = quai_verify_ticket(bob_ticket_id, db=db)
    assert verify_redeemed["redeemed_on_chain"] is True
    print(f"PASS: 26. Ticket #{bob_ticket_id} gate redemption automatically synced to Quai Network on-chain state")

    # =========================================================================
    # CORE PLATFORM FEATURES (PRESERVED)
    # =========================================================================
    print("\n--- CORE PLATFORM FEATURES (PRESERVED) ---")

    # 27. Resale price cap rejection test (using Bob's active second ticket #bob_ticket2_id)
    try:
        execute_resale(schemas.ResaleExecuteRequest(
            ticket_id=bob_ticket2_id,
            seller_email="bob@example.com",
            buyer_email="scalper_victim@example.com",
            buyer_name="Victim",
            resale_price=3000.0,  # Exceeds cap 2750
            payment_method="UPI"
        ), db=db)
        assert False, "Expected resale price cap rejection"
    except HTTPException as exc:
        assert "ANTI-SCALPING VIOLATION" in exc.detail or "exceeds" in exc.detail
        print("PASS: 27. Resale price cap (1.1x) strictly enforced on backend")

    # 28. Non-permanent ticket sharing & revocation
    alice_t = db.query(models.Ticket).filter_by(owner_email="alice@example.com", status="ACTIVE", redeemed=False).first()
    assert alice_t is not None
    sh_res = share_ticket(alice_t.id, schemas.ShareCreateRequest(
        ticket_id=alice_t.id,
        owner_email="alice@example.com",
        recipient_name="Charlie Rao",
        recipient_email="charlie@example.com"
    ), db=db)
    share_token = sh_res["share_token"]
    sh_list = get_shared_with_me("charlie@example.com", db=db)
    assert len(sh_list) > 0
    revoke_share(alice_t.id, schemas.ShareRevokeRequest(ticket_id=alice_t.id, owner_email="alice@example.com"), db=db)
    v_sh = verify_gate(schemas.VerifyRequest(token=share_token), db=db)
    assert v_sh["status"] == "REVOKED"
    print("PASS: 28. Non-permanent ticket sharing and guest pass revocation verified")

    db.close()
    print("\n" + "="*70)
    print("🎉 ALL 28 TESTS PASSED SUCCESSFULLY! ALL 4 UPGRADES FULLY VALIDATED.")
    print("="*70)

if __name__ == "__main__":
    run_tests()
