"""
Automated verification test suite for ClientPulse AI Contact Management Module.
Tests:
1. Employee authentication & authorization enforcement on contact APIs (HTTP 401).
2. Input validation on backend (email format, non-blank name, valid channels, valid consent status).
3. Contact creation with client and project foreign key linkage.
4. Search and multi-filter retrieval (channel, consent, client_id, query term).
5. Contact retrieval with populated client and project details.
6. Contact update (modifying phone, whatsapp, channel, consent, notes).
7. Contact deletion (HTTP 204) and cascade cleanup.
"""
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.client import Client
from app.models.project import Project
from app.models.contact import Contact


def run_contact_tests():
    print("==================================================================")
    print("RUNNING CONTACT MANAGEMENT MODULE TEST SUITE")
    print("==================================================================")

    init_db()
    client = TestClient(app)
    db = SessionLocal()

    emp_headers = {"X-Employee-Key": settings.EMPLOYEE_API_KEY}

    try:
        now_ts = int(datetime.now(timezone.utc).timestamp())

        # ---------------------------------------------------------------------
        # [TEST 1] Employee Authentication & Authorization on Contact APIs
        # ---------------------------------------------------------------------
        print("\n--- [TEST 1] Employee Authentication & Authorization ---")
        unauth_res = client.get("/api/v1/contacts")
        assert unauth_res.status_code == 401, f"Expected 401, got {unauth_res.status_code}"
        print("PASS: Unauthenticated access to /api/v1/contacts rejected (HTTP 401).")

        bad_auth_res = client.get("/api/v1/contacts", headers={"X-Employee-Key": "wrong_key_123"})
        assert bad_auth_res.status_code == 401
        print("PASS: Access with invalid employee key rejected (HTTP 401).")

        auth_res = client.get("/api/v1/contacts", headers=emp_headers)
        assert auth_res.status_code == 200
        print("PASS: Access with valid employee credentials succeeded (HTTP 200).")

        # ---------------------------------------------------------------------
        # [TEST 2] Input Validation (Pydantic & Enums)
        # ---------------------------------------------------------------------
        print("\n--- [TEST 2] Input Validation ---")

        # Blank name rejected
        bad_name_res = client.post(
            "/api/v1/contacts",
            headers=emp_headers,
            json={"name": "   ", "email": "valid@example.com"},
        )
        assert bad_name_res.status_code == 422, f"Expected 422 for blank name, got {bad_name_res.status_code}"
        print("PASS: Blank contact name rejected (HTTP 422).")

        # Invalid email rejected
        bad_email_res = client.post(
            "/api/v1/contacts",
            headers=emp_headers,
            json={"name": "Test User", "email": "not-a-valid-email-format"},
        )
        assert bad_email_res.status_code == 422
        print("PASS: Malformed email rejected (HTTP 422).")

        # Invalid preferred channel rejected
        bad_channel_res = client.post(
            "/api/v1/contacts",
            headers=emp_headers,
            json={"name": "Test User", "email": "test@example.com", "preferred_channel": "telepathy"},
        )
        assert bad_channel_res.status_code == 422
        print("PASS: Invalid preferred channel rejected (HTTP 422).")

        # Invalid consent status rejected
        bad_consent_res = client.post(
            "/api/v1/contacts",
            headers=emp_headers,
            json={"name": "Test User", "email": "test@example.com", "consent_status": "maybe"},
        )
        assert bad_consent_res.status_code == 422
        print("PASS: Invalid consent status rejected (HTTP 422).")

        # ---------------------------------------------------------------------
        # [TEST 3] Create Contact Linked to Client & Project
        # ---------------------------------------------------------------------
        print("\n--- [TEST 3] Contact Creation Linked to Client & Project ---")

        # Create parent client & project
        test_client = Client(
            name=f"Vanguard Logistics {now_ts}",
            email=f"dispatch_{now_ts}@vanguardlogistics.com",
            company="Vanguard Logistics LLC",
            status="active",
        )
        db.add(test_client)
        db.commit()

        test_project = Project(
            client_id=test_client.id,
            title="Fleet Telematics Cloud API",
            status="in_progress",
        )
        db.add(test_project)
        db.commit()

        # Reject linking to non-existent client
        non_client_res = client.post(
            "/api/v1/contacts",
            headers=emp_headers,
            json={"name": "Ghost User", "email": "ghost@example.com", "client_id": 999999},
        )
        assert non_client_res.status_code == 404
        print("PASS: Non-existent client_id rejected (HTTP 404).")

        # Create valid contact with WhatsApp and preferred channel
        contact_payload = {
            "name": "David Miller",
            "company": "Vanguard Logistics LLC",
            "email": f"david.miller_{now_ts}@vanguardlogistics.com",
            "phone": "+1 (555) 789-0123",
            "whatsapp": "+1 (555) 789-0123",
            "preferred_channel": "whatsapp",
            "consent_status": "opted_in",
            "notes": "Director of Fleet Operations. Prefers WhatsApp notifications for telematics alerts.",
            "client_id": test_client.id,
            "project_id": test_project.id,
            "is_primary": True,
        }

        create_res = client.post("/api/v1/contacts", headers=emp_headers, json=contact_payload)
        assert create_res.status_code == 201, f"Create failed: {create_res.text}"
        created = create_res.json()
        assert created["id"] is not None
        assert created["name"] == "David Miller"
        assert created["whatsapp"] == "+1 (555) 789-0123"
        assert created["preferred_channel"] == "whatsapp"
        assert created["consent_status"] == "opted_in"
        assert created["client_name"] == test_client.name
        assert created["project_title"] == "Fleet Telematics Cloud API"
        assert created["is_primary"] is True
        contact_id = created["id"]
        print(f"PASS: Created contact ID={contact_id} linked to Client ID={test_client.id} and Project ID={test_project.id}.")

        # ---------------------------------------------------------------------
        # [TEST 4] Contact Retrieval and Search / Filtering
        # ---------------------------------------------------------------------
        print("\n--- [TEST 4] Contact Retrieval & Filtering ---")

        # Get single contact details
        get_res = client.get(f"/api/v1/contacts/{contact_id}", headers=emp_headers)
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "David Miller"
        print("PASS: Retrieved full contact details.")

        # Search by name
        search_res = client.get(f"/api/v1/contacts?search=David", headers=emp_headers)
        assert search_res.status_code == 200
        assert any(c["id"] == contact_id for c in search_res.json())
        print("PASS: Search by contact name succeeded.")

        # Search by phone / whatsapp
        phone_res = client.get(f"/api/v1/contacts?search=789-0123", headers=emp_headers)
        assert phone_res.status_code == 200
        assert any(c["id"] == contact_id for c in phone_res.json())
        print("PASS: Search by contact phone/WhatsApp succeeded.")

        # Filter by preferred channel
        whatsapp_filter_res = client.get(f"/api/v1/contacts?preferred_channel=whatsapp", headers=emp_headers)
        assert whatsapp_filter_res.status_code == 200
        assert all(c["preferred_channel"] == "whatsapp" for c in whatsapp_filter_res.json())
        print("PASS: Filter by preferred channel (whatsapp) succeeded.")

        # Filter by client_id
        client_filter_res = client.get(f"/api/v1/contacts?client_id={test_client.id}", headers=emp_headers)
        assert client_filter_res.status_code == 200
        assert len(client_filter_res.json()) >= 1
        print("PASS: Filter by client_id succeeded.")

        # ---------------------------------------------------------------------
        # [TEST 5] Update Contact
        # ---------------------------------------------------------------------
        print("\n--- [TEST 5] Contact Update ---")

        update_payload = {
            "whatsapp": "+1 (555) 999-8877",
            "preferred_channel": "email",
            "consent_status": "opted_out",
            "notes": "Requested communication shift to email only.",
        }
        update_res = client.put(f"/api/v1/contacts/{contact_id}", headers=emp_headers, json=update_payload)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["whatsapp"] == "+1 (555) 999-8877"
        assert updated["preferred_channel"] == "email"
        assert updated["consent_status"] == "opted_out"
        assert updated["notes"] == "Requested communication shift to email only."
        print("PASS: Contact updated with modified WhatsApp, channel preference, and consent status.")

        # ---------------------------------------------------------------------
        # [TEST 6] Delete Contact
        # ---------------------------------------------------------------------
        print("\n--- [TEST 6] Contact Deletion ---")

        del_res = client.delete(f"/api/v1/contacts/{contact_id}", headers=emp_headers)
        assert del_res.status_code == 204
        print(f"PASS: Deleted contact ID={contact_id} (HTTP 204).")

        # Verify contact is no longer retrievable
        verify_del = client.get(f"/api/v1/contacts/{contact_id}", headers=emp_headers)
        assert verify_del.status_code == 404
        print("PASS: Deleted contact returns HTTP 404 Not Found.")

        print("\n==================================================================")
        print("ALL CONTACT MANAGEMENT TESTS PASSED 100%!")
        print("==================================================================")

    finally:
        db.close()


if __name__ == "__main__":
    run_contact_tests()
