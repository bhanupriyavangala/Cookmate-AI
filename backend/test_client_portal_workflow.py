"""
End-to-end verification test suite for the Secure Client Communication Portal Workflow.
Tests:
1. Employee endpoint authentication and authorization protection.
2. Unguessable token generation for project share links.
3. Public client portal access without employee credentials.
4. Privacy: internal employee notes and AI analysis are strictly excluded from public responses.
5. Project restriction: cross-project message posting is rejected with HTTP 403.
6. Real-time message exchange and deterministic follow-up reevaluation.
7. Link revocation and invalidation.
8. Link regeneration and token rotation.
"""
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.models.project_link import ProjectShareLink
from app.services.followup_engine import sync_followups


def run_portal_workflow_tests():
    print("==================================================================")
    print("RUNNING SECURE CLIENT COMMUNICATION PORTAL WORKFLOW TEST SUITE")
    print("==================================================================")

    init_db()
    client = TestClient(app)
    db = SessionLocal()

    emp_headers = {"X-Employee-Key": settings.EMPLOYEE_API_KEY}
    bearer_headers = {"Authorization": f"Bearer {settings.EMPLOYEE_API_KEY}"}

    try:
        # ---------------------------------------------------------------------
        # [TEST 1] Employee Endpoint Authentication & Authorization Protection
        # ---------------------------------------------------------------------
        print("\n--- [TEST 1] Employee Authentication & Authorization Protection ---")

        # 1.1 Unauthenticated request must fail with 401
        res = client.get("/api/v1/clients")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
        assert "Valid employee credentials required" in res.json()["detail"]
        print("PASS: Request without employee credentials rejected (HTTP 401).")

        # 1.2 Request with invalid employee key must fail with 401
        res = client.get("/api/v1/clients", headers={"X-Employee-Key": "invalid_fake_key_999"})
        assert res.status_code == 401
        print("PASS: Request with invalid employee key rejected (HTTP 401).")

        # 1.3 Request with valid X-Employee-Key succeeds
        res = client.get("/api/v1/clients", headers=emp_headers)
        assert res.status_code == 200
        print("PASS: Request with valid X-Employee-Key succeeded (HTTP 200).")

        # 1.4 Request with valid Bearer token succeeds
        res = client.get("/api/v1/auth/verify", headers=bearer_headers)
        assert res.status_code == 200
        assert res.json()["authenticated"] is True
        print("PASS: Request with valid Bearer token authenticated (HTTP 200).")

        # ---------------------------------------------------------------------
        # [TEST 2] Project Share Link Generation & Unguessable Tokens
        # ---------------------------------------------------------------------
        print("\n--- [TEST 2] Project Share Link Generation & Unguessable Tokens ---")

        now_ts = int(datetime.now(timezone.utc).timestamp())
        # Create a test client with sensitive internal employee notes
        test_client = Client(
            name="Sarah Connor",
            email=f"sarah_{now_ts}@cyberdyne.org",
            company="Cyberdyne Systems",
            status="active",
            notes="INTERNAL EMPLOYEE NOTE: Highly sensitive negotiation terms. Do not disclose budget ceiling.",
        )
        db.add(test_client)
        db.commit()

        # Create a test project
        test_project = Project(
            client_id=test_client.id,
            title="Neural Net Architecture Refactor",
            description="Public milestone description: Scalable distributed tensor pipeline.",
            status="in_progress",
            budget=150000.0,
        )
        db.add(test_project)
        db.commit()

        # Generate share link via employee endpoint
        gen_res = client.post(f"/api/v1/projects/{test_project.id}/share-link", headers=emp_headers)
        assert gen_res.status_code == 201, f"Failed link creation: {gen_res.text}"
        link_data = gen_res.json()
        token = link_data["token"]
        assert len(token) >= 32, f"Token length should be >= 32, got {len(token)}"
        assert link_data["is_active"] is True
        assert f"/portal/{token}" in link_data["share_url"]
        print(f"PASS: Generated unguessable share link: token='{token[:12]}...' (length={len(token)})")

        # ---------------------------------------------------------------------
        # [TEST 3] Public Portal Access & Privacy Verification
        # ---------------------------------------------------------------------
        print("\n--- [TEST 3] Public Portal Access & Privacy Verification ---")

        # Access portal without employee headers
        portal_res = client.get(f"/api/v1/portal/{token}")
        assert portal_res.status_code == 200, f"Portal access failed: {portal_res.text}"
        portal_data = portal_res.json()

        # Verify allowed public fields
        assert portal_data["project_id"] == test_project.id
        assert portal_data["project_title"] == "Neural Net Architecture Refactor"
        assert portal_data["client_name"] == "Sarah Connor"
        assert portal_data["client_company"] == "Cyberdyne Systems"
        assert len(portal_data["conversations"]) >= 1
        print("PASS: Client accessed project portal without employee account.")

        # PRIVACY AUDIT: Ensure internal employee notes and private data are NOT in payload
        raw_portal_text = portal_res.text
        assert "INTERNAL EMPLOYEE NOTE" not in raw_portal_text, "LEAK: Internal client notes exposed!"
        assert "budget ceiling" not in raw_portal_text, "LEAK: Sensitive client note exposed!"
        assert "150000" not in raw_portal_text, "LEAK: Internal budget exposed!"
        assert settings.EMPLOYEE_API_KEY not in raw_portal_text, "LEAK: Employee secret exposed!"
        print("PASS: Privacy audit passed: Internal employee notes, budgets, and secrets strictly omitted.")

        # ---------------------------------------------------------------------
        # [TEST 4] Project Restriction & Cross-Project Message Isolation
        # ---------------------------------------------------------------------
        print("\n--- [TEST 4] Project Restriction & Cross-Project Isolation ---")

        # Create separate Project B with separate Conversation B
        client_b = Client(name="Bob Smith", email=f"bob_{now_ts}@othercorp.com", company="OtherCorp")
        db.add(client_b)
        db.commit()
        project_b = Project(client_id=client_b.id, title="Unrelated Project B")
        db.add(project_b)
        db.commit()
        conv_b = Conversation(client_id=client_b.id, project_id=project_b.id, subject="Project B Thread")
        db.add(conv_b)
        db.commit()

        # Client with Project A's token attempts to post to Project B's conversation
        cross_res = client.post(
            f"/api/v1/portal/{token}/messages",
            json={
                "content": "Malicious attempt to inject into Project B",
                "conversation_id": conv_b.id,
            },
        )
        assert cross_res.status_code == 403, f"Expected 403, got {cross_res.status_code}: {cross_res.text}"
        assert "does not belong to this project" in cross_res.json()["detail"]
        print("PASS: Cross-project message injection blocked with HTTP 403.")

        # ---------------------------------------------------------------------
        # [TEST 5] Incoming Client Message & Deterministic Follow-Up Reevaluation
        # ---------------------------------------------------------------------
        print("\n--- [TEST 5] Message Exchange & Follow-Up Reevaluation ---")

        # Client sends legitimate message through portal
        client_msg_content = "We verified the staging environment and need clarification on SLA metrics."
        msg_res = client.post(
            f"/api/v1/portal/{token}/messages",
            json={
                "content": client_msg_content,
                "sender_name": "Sarah Connor",
            },
        )
        assert msg_res.status_code == 201, f"Failed to post client message: {msg_res.text}"
        created_msg = msg_res.json()
        assert created_msg["sender_type"] == "client"
        assert created_msg["sender_name"] == "Sarah Connor"
        assert created_msg["content"] == client_msg_content
        print("PASS: Incoming client message saved with sender_type='client'.")

        # Verify deterministic follow-up reevaluation
        conv_id = portal_data["conversations"][0]["id"]
        followup = db.query(FollowUp).filter(FollowUp.conversation_id == conv_id).first()
        assert followup is not None
        assert followup.status == "pending"
        assert followup.days_waiting <= 0.05
        assert client_msg_content[:50] in (followup.last_message_content or "")
        print("PASS: Pending action reevaluated in follow-up engine (waiting time reset to 0.0 days).")

        # Employee views conversation thread via employee endpoint
        emp_thread_res = client.get(f"/api/v1/conversations/{conv_id}", headers=emp_headers)
        assert emp_thread_res.status_code == 200
        thread_messages = emp_thread_res.json()["messages"]
        assert any(m["content"] == client_msg_content and m["sender_type"] == "client" for m in thread_messages)
        print("PASS: Employee views new client message in conversation thread.")

        # Employee responds via employee endpoint
        emp_reply = client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            headers=emp_headers,
            json={
                "sender_type": "team",
                "sender_name": "Antigravity Engineering",
                "content": "Sarah, SLA guarantees 99.95% uptime with 15-minute response times for critical incidents.",
            },
        )
        assert emp_reply.status_code == 201
        print("PASS: Employee responded to thread.")

        # Client refreshes portal and receives the employee response
        client_refresh = client.get(f"/api/v1/portal/{token}")
        assert client_refresh.status_code == 200
        refreshed_msgs = client_refresh.json()["conversations"][0]["messages"]
        assert any(m["sender_type"] == "team" and "SLA guarantees" in m["content"] for m in refreshed_msgs)
        print("PASS: Client portal verified two-way message exchange.")

        # ---------------------------------------------------------------------
        # [TEST 6] Share Link Revocation & Access Termination
        # ---------------------------------------------------------------------
        print("\n--- [TEST 6] Share Link Revocation & Access Termination ---")

        # Employee revokes the link
        revoke_res = client.post(f"/api/v1/projects/{test_project.id}/share-link/revoke", headers=emp_headers)
        assert revoke_res.status_code == 200
        assert revoke_res.json()["success"] is True
        print("PASS: Employee successfully revoked project share link.")

        # Client attempts to access portal with revoked link -> HTTP 403
        revoked_portal_res = client.get(f"/api/v1/portal/{token}")
        assert revoked_portal_res.status_code == 403
        assert "revoked" in revoked_portal_res.json()["detail"].lower()
        print("PASS: Revoked link returns HTTP 403 Forbidden on portal access.")

        # Client attempts to send message with revoked link -> HTTP 403
        revoked_send_res = client.post(
            f"/api/v1/portal/{token}/messages",
            json={"content": "Should not be delivered"},
        )
        assert revoked_send_res.status_code == 403
        print("PASS: Revoked link returns HTTP 403 Forbidden on message dispatch.")

        # Non-existent token returns HTTP 404
        fake_res = client.get("/api/v1/portal/completely_non_existent_token_99999")
        assert fake_res.status_code == 404
        print("PASS: Non-existent token returns HTTP 404 Not Found.")

        # ---------------------------------------------------------------------
        # [TEST 7] Link Regeneration (Token Rotation)
        # ---------------------------------------------------------------------
        print("\n--- [TEST 7] Link Regeneration & Token Rotation ---")

        regen_res = client.post(f"/api/v1/projects/{test_project.id}/share-link", headers=emp_headers)
        assert regen_res.status_code == 201
        new_token = regen_res.json()["token"]
        assert new_token != token, "Regenerated token must be different from previous token!"

        # New token works
        new_portal_res = client.get(f"/api/v1/portal/{new_token}")
        assert new_portal_res.status_code == 200
        # Old token still fails
        old_portal_res = client.get(f"/api/v1/portal/{token}")
        assert old_portal_res.status_code == 403
        print("PASS: Regenerated link active with new token; old token permanently revoked.")

        print("\n==================================================================")
        print("ALL 7 CLIENT PORTAL & AUTH WORKFLOW TESTS PASSED 100%!")
        print("==================================================================")

    finally:
        db.close()


if __name__ == "__main__":
    run_portal_workflow_tests()
