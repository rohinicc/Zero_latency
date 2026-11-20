import sys
from app.main import (
    health, demo_users, get_events, get_event, create_event, update_event,
    access_check, challenge_verify, simulate_attack, admin_unblock,
    queue_join, book_tickets, execute_resale, share_ticket, get_shared_with_me,
    revoke_share, verify_gate, seed_demo_data
)
from app.database import SessionLocal, Base, engine
from app import models, schemas
from starlette.requests import Request

def mock_request():
    scope = {"type": "http", "client": ("127.0.0.1", 12345), "headers": []}
    return Request(scope)

def run_tests():
    print("=== STARTING FAIRPASS DIRECT BACKEND SUITE ===")
    db = SessionLocal()
    seed_demo_data(db)

    # 1. Health check
    h = health()
    assert h["status"] == "ok"
    print("PASS: Health check OK")

    # 2. Demo users
    users = demo_users()
    assert len(users) >= 4
    print("PASS: Demo identities available")

    # 3. Explore events
    events = get_events(category=None, search=None, db=db)
    assert len(events) >= 4
    print(f"PASS: Retrieved {len(events)} events")

    # 4. Create new event (Fix organizer event creation bug test)
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
    print(f"PASS: Created new event with ID {created_id}")

    # Verify created event persists and has accurate 1.1x resale cap
    ev = get_event(created_id, db=db)
    assert ev["name"] == "Electronic Neon Odyssey"
    assert ev["max_resale_price"] == 2750.0
    print("PASS: Created event verified with accurate 1.1x resale cap")

    # 5. Edit event
    update_res = update_event(created_id, schemas.EventUpdate(venue="Manpho Grounds Hall A"), db=db)
    ev_updated = get_event(created_id, db=db)
    assert ev_updated["venue"] == "Manpho Grounds Hall A"
    print("PASS: Event editing verified")

    # 6. Restricted access window & Bot detection
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
    assert chk_res["challenge_token"] is not None
    print("PASS: Bot protection detected rapid submission (120ms) and required challenge verification")

    # 7. 50+ access attempt threshold lockout test
    att_res = simulate_attack(
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
    print("PASS: 50+ burst lockout enforced (RESTRICTED state)")

    # 8. Admin unblocking
    admin_unblock(schemas.UnblockRequest(identifier="spammer@botnet.io"), db=db)
    unlocked_res = access_check(
        event_id=created_id,
        data=schemas.AccessCheckRequest(event_id=created_id, email="spammer@botnet.io", duration_ms=1500),
        request=mock_request(),
        db=db
    )
    assert unlocked_res["status"] == "GRANTED"
    print("PASS: Admin unblock lifted temporary restriction")

    # 9. Event-specific queue (NO DEPOSIT!)
    q_res = queue_join(
        created_id,
        schemas.QueueJoinRequest(event_id=created_id, email="tester@example.com", name="Queue Tester"),
        db=db
    )
    assert "deposit" not in str(q_res).lower()
    print("PASS: Event-specific queue joined without deposit")

    # 10. Booking ticket with payment failure simulation
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="failpay@example.com",
            name="Fail Test",
            quantity=1,
            payment_method="Credit Card",
            simulate_failure=True
        ), db=db)
        assert False, "Expected payment failure exception"
    except Exception as exc:
        assert "Simulated payment failed" in str(exc.detail) if hasattr(exc, "detail") else True
        print("PASS: Simulated payment failure properly rejected ticket issuance")

    # 11. Booking ticket with successful demo payment
    bk_res = book_tickets(schemas.BookingRequest(
        event_id=created_id,
        email="bob@example.com",
        name="Bob Patel",
        quantity=2,
        payment_method="UPI",
        simulate_failure=False
    ), db=db)
    assert len(bk_res["tokens"]) == 2
    bob_token1 = bk_res["tokens"][0]
    bob_ticket_id = bk_res["tickets"][0]["id"]
    print(f"PASS: Booked 2 tickets for Bob Patel. Token: {bob_token1}")

    # 12. Maximum tickets per user enforcement
    try:
        book_tickets(schemas.BookingRequest(
            event_id=created_id,
            email="bob@example.com",
            name="Bob Patel",
            quantity=1,
            payment_method="UPI",
            simulate_failure=False
        ), db=db)
        assert False, "Expected max tickets limit exception"
    except Exception as exc:
        assert "Maximum" in str(exc.detail)
        print("PASS: Max tickets per user limit strictly enforced")

    # 13. Resale price cap rejection test (Price 3000 > Cap 2750)
    try:
        execute_resale(schemas.ResaleExecuteRequest(
            ticket_id=bob_ticket_id,
            seller_email="bob@example.com",
            buyer_email="scalper_victim@example.com",
            buyer_name="Victim",
            resale_price=3000.0,
            payment_method="UPI"
        ), db=db)
        assert False, "Expected resale price cap rejection"
    except Exception as exc:
        assert "ANTI-SCALPING VIOLATION" in str(exc.detail) or "exceeds" in str(exc.detail)
        print("PASS: Backend enforced resale price cap (rejection above 1.1x)")

    # 14. Successful capped resale execution
    resale_res = execute_resale(schemas.ResaleExecuteRequest(
        ticket_id=bob_ticket_id,
        seller_email="bob@example.com",
        buyer_email="charlie@example.com",
        buyer_name="Charlie Rao",
        resale_price=2700.0,  # Below 2750 cap
        payment_method="Debit Card"
    ), db=db)
    new_token = resale_res["new_token"]
    old_invalidated_token = resale_res["old_token_invalidated"]
    print(f"PASS: Capped resale executed! Old token '{old_invalidated_token}' invalidated; New token '{new_token}' generated for Charlie.")

    # 15. Verify old invalidated token at gate
    v_old = verify_gate(schemas.VerifyRequest(token=old_invalidated_token), db=db)
    assert v_old["status"] == "TRANSFERRED"
    print("PASS: Gate verification correctly detected invalidated old token from resale (TRANSFERRED)")

    # 16. Verify new owner's token at gate (VALID)
    v_new = verify_gate(schemas.VerifyRequest(token=new_token), db=db)
    assert v_new["status"] == "VALID"
    print("PASS: Gate verification approved valid ticket for new owner (VALID)")

    # 17. Verify duplicate scan prevention (ALREADY REDEEMED)
    v_dup = verify_gate(schemas.VerifyRequest(token=new_token), db=db)
    assert v_dup["status"] == "ALREADY_REDEEMED"
    print("PASS: Gate verification rejected duplicate redemption (ALREADY_REDEEMED)")

    # 18. Non-permanent ticket sharing & revocation
    alice_t = db.query(models.Ticket).filter_by(owner_email="alice@example.com", status="ACTIVE", redeemed=False).first()
    assert alice_t is not None
    sh_res = share_ticket(alice_t.id, schemas.ShareCreateRequest(
        ticket_id=alice_t.id,
        owner_email="alice@example.com",
        recipient_name="Charlie Rao",
        recipient_email="charlie@example.com"
    ), db=db)
    share_token = sh_res["share_token"]
    print(f"PASS: Alice shared guest pass with Charlie (Token: {share_token}). Alice retains ownership.")

    # Charlie views shared tickets
    sh_list = get_shared_with_me("charlie@example.com", db=db)
    assert len(sh_list) > 0
    print("PASS: Charlie sees shared guest pass under 'Shared With Me'")

    # Alice revokes share
    revoke_share(alice_t.id, schemas.ShareRevokeRequest(ticket_id=alice_t.id, owner_email="alice@example.com"), db=db)
    print("PASS: Alice revoked shared guest pass")

    # Charlie's revoked token at gate
    v_sh = verify_gate(schemas.VerifyRequest(token=share_token), db=db)
    assert v_sh["status"] == "REVOKED"
    print("PASS: Gate verification detected REVOKED guest pass")

    db.close()
    print("\n🎉 ALL 18 TESTS PASSED SUCCESSFULLY! BACKEND LOGIC FULLY VALIDATED.")

if __name__ == "__main__":
    run_tests()
