"""Automated test suite verifying waiting-time calculations, deterministic threshold status rules, and employee actions."""
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, init_db
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.services.followup_engine import (
    calculate_waiting_time,
    determine_priority_and_status,
    evaluate_conversation_needs_response,
    snooze_followup,
    complete_followup,
    escalate_followup,
    sync_followups,
)


def run_followup_tests():
    print("==================================================")
    print("RUNNING DETERMINISTIC FOLLOW-UP SYSTEM TEST SUITE")
    print("==================================================")

    now = datetime(2026, 10, 26, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Test Waiting Time Calculations
    print("\n--- [TEST 1] Waiting Time Calculations from Stored Timestamps ---")
    t0 = now - timedelta(hours=12) # 0.5 days
    assert calculate_waiting_time(t0, now=now) == 0.5
    print("PASS: 12 hours waiting = 0.50 days")

    t1 = now - timedelta(days=2) # exactly 2 days
    assert calculate_waiting_time(t1, now=now) == 2.0
    print("PASS: 48 hours waiting = 2.00 days")

    t2 = now - timedelta(days=5, hours=6) # 5.25 days
    assert calculate_waiting_time(t2, now=now) == 5.25
    print("PASS: 5 days + 6 hours waiting = 5.25 days")

    t3 = now - timedelta(days=7, hours=12) # 7.5 days
    assert calculate_waiting_time(t3, now=now) == 7.5
    print("PASS: 7.5 days waiting = 7.50 days")

    # Future or zero timestamp
    t_future = now + timedelta(hours=1)
    assert calculate_waiting_time(t_future, now=now) == 0.0
    print("PASS: Future timestamp capped safely at 0.00 days")

    # 2. Test Deterministic Thresholds & Priority Mapping
    print("\n--- [TEST 2] Deterministic Status & Priority Rules ---")
    # Rule 1: < 2 days -> pending / low
    st, pr = determine_priority_and_status(days_waiting=1.9, now=now)
    assert st == "pending" and pr == "low"
    print("PASS: 1.9 days -> status='pending', priority='low'")

    # Rule 2: >= 2 days and < 5 days -> due / medium
    st, pr = determine_priority_and_status(days_waiting=2.0, now=now)
    assert st == "due" and pr == "medium"
    st, pr = determine_priority_and_status(days_waiting=4.9, now=now)
    assert st == "due" and pr == "medium"
    print("PASS: 2.0 and 4.9 days -> status='due', priority='medium' (Recommended Follow-up)")

    # Rule 3: >= 5 days and < 7 days -> overdue / high
    st, pr = determine_priority_and_status(days_waiting=5.0, now=now)
    assert st == "overdue" and pr == "high"
    st, pr = determine_priority_and_status(days_waiting=6.9, now=now)
    assert st == "overdue" and pr == "high"
    print("PASS: 5.0 and 6.9 days -> status='overdue', priority='high' (Overdue Follow-up)")

    # Rule 4: >= 7 days -> escalated / urgent
    st, pr = determine_priority_and_status(days_waiting=7.0, now=now)
    assert st == "escalated" and pr == "urgent"
    st, pr = determine_priority_and_status(days_waiting=14.0, now=now)
    assert st == "escalated" and pr == "urgent"
    print("PASS: 7.0+ days -> status='escalated', priority='urgent' (Recommended Escalation)")

    # Rule 5: Configurable thresholds override
    st, pr = determine_priority_and_status(days_waiting=1.5, due_threshold=1.0, overdue_threshold=3.0, escalation_threshold=4.0, now=now)
    assert st == "due" and pr == "medium"
    print("PASS: Custom thresholds correctly honored")

    # Rule 6: Active Snooze suppresses priority
    snooze_future = now + timedelta(days=2)
    st, pr = determine_priority_and_status(days_waiting=6.0, snoozed_until=snooze_future, now=now)
    assert st == "snoozed" and pr == "low"
    print("PASS: Active snooze correctly sets status='snoozed', priority='low'")

    # Rule 7: Expired Snooze restores overdue status
    snooze_past = now - timedelta(hours=1)
    st, pr = determine_priority_and_status(days_waiting=6.0, snoozed_until=snooze_past, now=now)
    assert st == "overdue" and pr == "high"
    print("PASS: Expired snooze correctly reverts to active 'overdue' status")

    # 3. Test "Do not flag conversations that do not require a response"
    print("\n--- [TEST 3] Response Requirement Filtering ---")
    conv_closed = Conversation(id=101, client_id=1, subject="Closed Issue", status="closed")
    needs_resp, _ = evaluate_conversation_needs_response(conv_closed)
    assert needs_resp is False
    print("PASS: Closed conversation does NOT require response")

    conv_empty = Conversation(id=102, client_id=1, subject="Empty Thread", status="open", messages=[])
    needs_resp, _ = evaluate_conversation_needs_response(conv_empty)
    assert needs_resp is False
    print("PASS: Empty conversation does NOT require response")

    # Team answered last -> No response required!
    m1 = Message(id=1, conversation_id=103, sender_type="client", content="Client query", sent_at=now - timedelta(days=3))
    m2 = Message(id=2, conversation_id=103, sender_type="team", content="Team response", sent_at=now - timedelta(days=1))
    conv_team_replied = Conversation(id=103, client_id=1, subject="Answered Thread", status="open", messages=[m1, m2])
    needs_resp, _ = evaluate_conversation_needs_response(conv_team_replied)
    assert needs_resp is False
    print("PASS: Conversation where team replied last does NOT require response")

    # Client answered last -> Response IS required!
    m3 = Message(id=3, conversation_id=104, sender_type="client", content="Client follow-up", sent_at=now - timedelta(hours=2))
    conv_needs_reply = Conversation(id=104, client_id=1, subject="Awaiting Reply", status="open", messages=[m1, m2, m3])
    needs_resp, last_msg = evaluate_conversation_needs_response(conv_needs_reply)
    assert needs_resp is True
    assert last_msg.id == 3
    print("PASS: Conversation awaiting client reply correctly flagged")

    # 4. Test Employee Actions in Database (Snooze, Complete, Escalate)
    print("\n--- [TEST 4] Employee Actions (Snooze, Complete, Escalate) ---")
    init_db()
    with SessionLocal() as db:
        # Create test client, conversation, message, and followup
        client = Client(name="Action Test Client", email=f"action_{int(datetime.now().timestamp())}@test.com", status="active")
        db.add(client)
        db.commit()

        conv = Conversation(client_id=client.id, subject="Action Test Subject", status="open")
        db.add(conv)
        db.commit()

        msg = Message(
            conversation_id=conv.id,
            sender_type="client",
            sender_name="Action Test Client",
            content="Awaiting response on action test",
            sent_at=now - timedelta(days=6),
        )
        db.add(msg)
        db.commit()

        sync_followups(db, now=now)
        followup = db.query(FollowUp).filter(FollowUp.conversation_id == conv.id).first()
        assert followup is not None
        assert followup.status == "overdue"
        assert followup.priority == "high"
        print(f"PASS: FollowUp created with status='{followup.status}', priority='{followup.priority}'")

        # Test Snooze Action
        snoozed = snooze_followup(db, followup.id, days=3.0, now=now)
        assert snoozed.status == "snoozed"
        assert snoozed.priority == "low"
        assert snoozed.snoozed_until is not None
        print(f"PASS: Snooze action updated status='{snoozed.status}', snoozed_until={snoozed.snoozed_until}")

        # Test Escalate Action
        escalated = escalate_followup(db, followup.id, reason="Customer VP called directly")
        assert escalated.is_escalated is True
        assert escalated.status == "escalated"
        assert escalated.priority == "urgent"
        assert escalated.escalation_reason == "Customer VP called directly"
        assert escalated.snoozed_until is None # Snooze cleared on escalation
        print(f"PASS: Escalate action updated status='{escalated.status}', priority='{escalated.priority}'")

        # Test Complete Action
        completed = complete_followup(db, followup.id)
        assert completed.status == "completed"
        print("PASS: Complete action updated status='completed'")

        # Cleanup test records
        db.delete(followup)
        db.delete(msg)
        db.delete(conv)
        db.delete(client)
        db.commit()

    print("\n==================================================")
    print("ALL WAITING-TIME AND STATUS TESTS PASSED 100%!")
    print("==================================================")


if __name__ == "__main__":
    run_followup_tests()
