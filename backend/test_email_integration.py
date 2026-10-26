import uuid
import sys
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.client import Client
from app.models.contact import Contact
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.followup import FollowUp
from app.models.email_message import EmailMessage

init_db()
client = TestClient(app)

AUTH_HEADER = {"X-Employee-Key": settings.EMPLOYEE_API_KEY}
WEBHOOK_HEADER = {"X-Webhook-Secret": settings.EMAIL_WEBHOOK_SECRET}


def run_tests():
    print("=" * 66)
    print("RUNNING PHASE 7 EMAIL INTEGRATION TEST SUITE")
    print("=" * 66)

    db = SessionLocal()
    try:
        # Create a test client and contact
        test_client = Client(
            name="Apex Dynamics Corp",
            email="contact@apexdynamics.example.com",
            company="Apex Dynamics Corp",
            status="active",
        )
        db.add(test_client)
        db.commit()
        db.refresh(test_client)

        test_project = Project(
            client_id=test_client.id,
            title="Cloud Architecture Migration",
            status="in_progress",
        )
        db.add(test_project)
        db.commit()
        db.refresh(test_project)

        unique_tag = uuid.uuid4().hex[:6]
        active_contact = Contact(
            client_id=test_client.id,
            project_id=test_project.id,
            name="David Miller",
            company="Apex Dynamics Corp",
            email=f"david.{unique_tag}@apexdynamics.example.com",
            preferred_channel="email",
            consent_status="opted_in",
            is_primary=True,
        )
        opted_out_contact = Contact(
            client_id=test_client.id,
            project_id=test_project.id,
            name="Sandra Bullock",
            company="Apex Dynamics Corp",
            email=f"sandra.{unique_tag}@apexdynamics.example.com",
            preferred_channel="email",
            consent_status="opted_out",
        )
        db.add_all([active_contact, opted_out_contact])
        db.commit()
        db.refresh(active_contact)
        db.refresh(opted_out_contact)

        print("\n--- [TEST 1] Employee Authentication & Authorization ---")
        # 1.1 Unauthenticated send
        res = client.post("/api/v1/emails/send", json={
            "recipient_email": "test@example.com",
            "subject": "Hello",
            "body_text": "Test body",
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        print("PASS: Unauthenticated send rejected with HTTP 401.")

        # 1.2 Invalid employee key
        res = client.post("/api/v1/emails/send", json={
            "recipient_email": "test@example.com",
            "subject": "Hello",
            "body_text": "Test body",
        }, headers={"X-Employee-Key": "invalid_secret"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        print("PASS: Invalid employee key rejected with HTTP 401.")

        # 1.3 Unauthenticated list
        res = client.get("/api/v1/emails")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("PASS: Unauthenticated email history access rejected with HTTP 401.")

        print("\n--- [TEST 2] Input Validation & Recipient Address Validation ---")
        # 2.1 Malformed email
        res = client.post("/api/v1/emails/send", json={
            "recipient_email": "not-a-valid-email",
            "subject": "Test",
            "body_text": "Some text",
        }, headers=AUTH_HEADER)
        assert res.status_code == 422, f"Expected 422, got {res.status_code}"
        print("PASS: Malformed recipient email rejected with HTTP 422.")

        # 2.2 Blank subject
        res = client.post("/api/v1/emails/send", json={
            "recipient_email": "test@example.com",
            "subject": "   ",
            "body_text": "Some text",
        }, headers=AUTH_HEADER)
        assert res.status_code == 422, f"Expected 422, got {res.status_code}"
        print("PASS: Blank subject rejected with HTTP 422.")

        # 2.3 Blank body
        res = client.post("/api/v1/emails/send", json={
            "recipient_email": "test@example.com",
            "subject": "Valid Subject",
            "body_text": "   ",
        }, headers=AUTH_HEADER)
        assert res.status_code == 422, f"Expected 422, got {res.status_code}"
        print("PASS: Blank body rejected with HTTP 422.")

        print("\n--- [TEST 3] Consent & Opt-Out Safety ---")
        # 3.1 Send to opted-out recipient without force_send
        res = client.post("/api/v1/emails/send", json={
            "contact_id": opted_out_contact.id,
            "recipient_email": opted_out_contact.email,
            "subject": "Account Review",
            "body_text": "Please review account details.",
            "force_send": False,
        }, headers=AUTH_HEADER)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "opted out" in res.json().get("detail", "").lower()
        print("PASS: Attempted send to opted-out contact safely rejected with HTTP 400.")

        # 3.2 Send to opted-out recipient with force_send=True
        res = client.post("/api/v1/emails/send", json={
            "contact_id": opted_out_contact.id,
            "recipient_email": opted_out_contact.email,
            "subject": "Legally Mandated Notice",
            "body_text": "This is a legally mandated account status notification.",
            "force_send": True,
        }, headers=AUTH_HEADER)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        print("PASS: Force send with explicit override permitted with HTTP 201.")

        print("\n--- [TEST 4] Successful Send via Provider Abstraction (Mock Provider) ---")
        idemp_key = f"key_{uuid.uuid4().hex}"
        send_payload = {
            "contact_id": active_contact.id,
            "recipient_email": active_contact.email,
            "recipient_name": active_contact.name,
            "subject": "Sprint Milestone Review Notice",
            "body_text": "Hello David, our sprint milestone review is scheduled for Thursday.",
            "idempotency_key": idemp_key,
            "ai_drafted": False,
        }
        res = client.post("/api/v1/emails/send", json=send_payload, headers=AUTH_HEADER)
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        email_data = res.json()
        assert email_data["status"] == "sent"
        assert email_data["provider"] == "mock"
        assert email_data["provider_message_id"].startswith("mock_msg_")
        assert email_data["contact_id"] == active_contact.id
        assert email_data["client_name"] == "Apex Dynamics Corp"
        first_email_id = email_data["id"]
        print(f"PASS: Email dispatched successfully (ID={first_email_id}, ProviderMsgID={email_data['provider_message_id']}).")

        print("\n--- [TEST 5] Duplicate Send Prevention ---")
        # 5.1 Idempotency key deduplication
        res_idemp = client.post("/api/v1/emails/send", json=send_payload, headers=AUTH_HEADER)
        assert res_idemp.status_code == 201, f"Expected 201, got {res_idemp.status_code}"
        assert res_idemp.json()["id"] == first_email_id, "Idempotency should return the existing record"
        print("PASS: Idempotency key deduplication returned existing record without re-sending.")

        # 5.2 Rapid duplicate send detection (identical content within 60s)
        duplicate_payload = {
            "contact_id": active_contact.id,
            "recipient_email": active_contact.email,
            "subject": "Sprint Milestone Review Notice",
            "body_text": "Hello David, our sprint milestone review is scheduled for Thursday.",
            "force_send": False,
        }
        res_dup = client.post("/api/v1/emails/send", json=duplicate_payload, headers=AUTH_HEADER)
        assert res_dup.status_code == 409, f"Expected 409 duplicate conflict, got {res_dup.status_code}: {res_dup.text}"
        print("PASS: Rapid duplicate send blocked with HTTP 409 Conflict.")

        print("\n--- [TEST 6] Provider Error Handling & Safe Storage ---")
        fail_payload = {
            "recipient_email": "simulate_error@apexdynamics.com",
            "recipient_name": "Failure Test",
            "subject": "Will Trigger Simulated Provider Error",
            "body_text": "This message tests failure handling.",
            "force_send": True,
        }
        res_fail = client.post("/api/v1/emails/send", json=fail_payload, headers=AUTH_HEADER)
        assert res_fail.status_code == 502, f"Expected 502, got {res_fail.status_code}: {res_fail.text}"
        print("PASS: Provider failure returned HTTP 502 Bad Gateway.")

        # Verify failure was saved in database without leaking secrets
        failed_record = (
            db.query(EmailMessage)
            .filter(EmailMessage.recipient_email == "simulate_error@apexdynamics.com")
            .order_by(EmailMessage.created_at.desc())
            .first()
        )
        assert failed_record is not None, "Failed email must be recorded in email_messages table"
        assert failed_record.status == "failed"
        assert "Simulated provider failure" in failed_record.error_details
        print("PASS: Failed delivery safely recorded in audit table with error details.")

        print("\n--- [TEST 7] AI Follow-Up Draft Generation ---")
        res_draft = client.post("/api/v1/emails/draft", json={
            "contact_id": active_contact.id,
            "project_id": test_project.id,
            "tone": "professional",
            "instructions": "Mention deliverable ready for QA testing tomorrow.",
        }, headers=AUTH_HEADER)
        assert res_draft.status_code == 200, f"Expected 200, got {res_draft.status_code}: {res_draft.text}"
        draft_data = res_draft.json()
        assert len(draft_data["subject"]) > 0
        assert len(draft_data["body_text"]) > 0
        assert draft_data["tone"] == "professional"
        assert draft_data["ai_source"] in ("gemini", "local_fallback")
        print(f"PASS: AI email draft generated successfully (Source: {draft_data['ai_source']}, Subject: '{draft_data['subject']}').")

        print("\n--- [TEST 8] Email History Retrieval & Filtering ---")
        res_list = client.get(f"/api/v1/emails?contact_id={active_contact.id}", headers=AUTH_HEADER)
        assert res_list.status_code == 200, f"Expected 200, got {res_list.status_code}"
        history = res_list.json()
        assert len(history) >= 1
        print(f"PASS: Retrieved {len(history)} email records filtered by contact_id.")

        print("\n--- [TEST 9] Verified Inbound Webhook (Reply Synchronization) ---")
        # 9.1 Invalid webhook secret
        res_hook_unauth = client.post("/api/v1/emails/webhook", json={
            "from_email": active_contact.email,
            "subject": "Re: Sprint Milestone Review Notice",
            "text": "Thanks for the update! Looking forward to Thursday.",
        }, headers={"X-Webhook-Secret": "wrong_secret"})
        assert res_hook_unauth.status_code == 401, f"Expected 401, got {res_hook_unauth.status_code}"
        print("PASS: Webhook with invalid secret rejected with HTTP 401.")

        # 9.2 Valid webhook processing
        webhook_payload = {
            "from_email": active_contact.email,
            "to_email": "notifications@clientpulse.ai",
            "subject": "Re: Sprint Milestone Review Notice",
            "text": "Hi Team, thanks for the update! We have approved the QA testing schedule.",
            "provider_message_id": "inbound_msg_982348",
        }
        res_hook = client.post("/api/v1/emails/webhook", json=webhook_payload, headers=WEBHOOK_HEADER)
        print("Webhook response:", res_hook.status_code, res_hook.json())
        assert res_hook.status_code == 200, f"Expected 200, got {res_hook.status_code}: {res_hook.text}"
        hook_resp = res_hook.json()
        assert hook_resp["status"] == "processed"
        assert hook_resp["matched_contact"] == active_contact.name
        assert hook_resp["matched_contact_id"] == active_contact.id
        print(f"PASS: Inbound webhook matched contact '{active_contact.name}' and recorded reply (ID={hook_resp['email_id']}).")

        # Verify inbound email is listed in history
        res_inbound_check = client.get(
            f"/api/v1/emails?direction=inbound&contact_id={active_contact.id}",
            headers=AUTH_HEADER
        )
        assert res_inbound_check.status_code == 200
        inbounds = res_inbound_check.json()
        assert len(inbounds) >= 1
        assert inbounds[0]["direction"] == "inbound"
        assert inbounds[0]["status"] == "received"
        print("PASS: Inbound email reply successfully listed in email history.")

        print("\n" + "=" * 66)
        print("ALL PHASE 7 EMAIL INTEGRATION TESTS PASSED 100%!")
        print("=" * 66)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
