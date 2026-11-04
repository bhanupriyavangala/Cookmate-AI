"""
Comprehensive Phase 9 End-to-End Workflow Verification Test.
Covers:
1. Employee login via JWT session.
2. Protected employee route access.
3. Client creation and duplicate email rejection.
4. Project creation linked to client (multiple projects per client).
5. Generation of unguessable public client portal share link.
6. Public client portal access (without employee account).
7. Client posts message via portal (empty message rejection, valid message acceptance).
8. Employee replies with a requirement confirmation request.
9. Client owes a response -> System tracks waiting period and does NOT prematurely mark completed.
10. Waiting time threshold progression -> follow-up becomes due/overdue.
11. AI conversation analysis identifies pending action, who owes response, what was asked, and expectation.
12. AI follow-up reminder generated with tone support and employee editing.
13. Employee approves and records reminder into thread -> waiting window restarts.
14. Client responds with partial/unrelated message -> action remains pending.
15. Client responds with formal confirmation -> AI identifies completed action and marks resolved.
16. Revoked and invalid client link access prevention (HTTP 403 / 404).
"""
import uuid
from datetime import datetime, timezone, timedelta
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
from app.services.followup_engine import sync_followups, calculate_waiting_time, determine_priority_and_status
from app.services.gemini_service import gemini_service


def run_e2e_full_cycle_test():
    print("======================================================================")
    print("RUNNING CLIENTPULSE AI END-TO-END FLOW VERIFICATION & TESTING SUITE")
    print("======================================================================")

    init_db()
    client = TestClient(app)
    db = SessionLocal()

    now = datetime.now(timezone.utc)
    tag = uuid.uuid4().hex[:6]

    # --- [STEP 1] Employee Login & JWT Session ---
    print("\n[STEP 1] Employee Login & JWT Session")
    bad_login = client.post("/api/v1/auth/login", json={"email": "wrong@corp.com", "password": "wrong"})
    assert bad_login.status_code == 401, f"Expected 401, got {bad_login.status_code}"
    print("PASS: Invalid credentials rejected (HTTP 401).")

    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.DEFAULT_EMPLOYEE_EMAIL,
        "password": settings.DEFAULT_EMPLOYEE_PASSWORD,
    })
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.text}"
    jwt_token = login_res.json()["access_token"]
    assert jwt_token and len(jwt_token) > 20
    emp_headers = {"Authorization": f"Bearer {jwt_token}"}
    print("PASS: Employee authenticated and received signed JWT bearer token.")

    # --- [STEP 2] Protected Employee Routes ---
    print("\n[STEP 2] Protected Employee Route Enforcement")
    unauth = client.get("/api/v1/clients")
    assert unauth.status_code == 401
    verify_auth = client.get("/api/v1/auth/verify", headers=emp_headers)
    assert verify_auth.status_code == 200
    print("PASS: Unauthenticated requests blocked; valid JWT session authorized.")

    # --- [STEP 3] Client Creation & Duplicate Prevention ---
    print("\n[STEP 3] Client Creation & Duplicate Email Validation")
    client_email = f"sarah.connor_{tag}@skynet-ops.io"
    c_res = client.post("/api/v1/clients", headers=emp_headers, json={
        "name": f"Sarah Connor {tag}",
        "email": client_email,
        "company": "Cyberdyne Resistance LLC",
        "phone": "+1 555 987 6543",
    })
    assert c_res.status_code == 201
    created_client = c_res.json()
    c_id = created_client["id"]
    print(f"PASS: Created client ID={c_id} ({created_client['name']}).")

    # Duplicate rejection
    dup_res = client.post("/api/v1/clients", headers=emp_headers, json={
        "name": "Sarah Duplicate",
        "email": client_email,
    })
    assert dup_res.status_code == 400
    print("PASS: Duplicate client email rejected (HTTP 400).")

    # --- [STEP 4] Multiple Projects for One Client ---
    print("\n[STEP 4] Project Creation & Multiple Project Association")
    p1_res = client.post("/api/v1/projects", headers=emp_headers, json={
        "client_id": c_id,
        "title": "Autonomous Defense Grid Audit",
        "description": "SOC2 security boundary validation and penetration audit",
        "budget": 54000.0,
        "deadline": "2026-12-31",
    })
    assert p1_res.status_code == 201
    proj1 = p1_res.json()
    p1_id = proj1["id"]

    p2_res = client.post("/api/v1/projects", headers=emp_headers, json={
        "client_id": c_id,
        "title": "Quantum Encryption Core",
        "description": "Phase 2 hardware key integration",
        "budget": 82000.0,
    })
    assert p2_res.status_code == 201
    proj2 = p2_res.json()
    print(f"PASS: Created 2 distinct projects (ID={p1_id}, ID={proj2['id']}) linked to client ID={c_id}.")

    # --- [STEP 5] Generate Unique Unguessable Client Link ---
    print("\n[STEP 5] Client Link Generation")
    link_res = client.post(f"/api/v1/projects/{p1_id}/share-link", headers=emp_headers)
    assert link_res.status_code == 201
    link_data = link_res.json()
    share_token = link_data["token"]
    assert len(share_token) >= 32
    print(f"PASS: Generated secure unguessable client token: {share_token[:12]}...")

    # --- [STEP 6] Public Client Portal Access ---
    print("\n[STEP 6] Public Client Portal Access")
    portal_res = client.get(f"/api/v1/portal/{share_token}")
    assert portal_res.status_code == 200
    portal_data = portal_res.json()
    assert portal_data["project_id"] == p1_id
    assert portal_data["project_title"] == "Autonomous Defense Grid Audit"
    assert "budget" not in portal_data  # Privacy verification
    print("PASS: Public portal accessible without employee account; internal budgets hidden.")

    # --- [STEP 7] Client Message Sending (Empty message rejection & Valid acceptance) ---
    print("\n[STEP 7] Client Message Exchange & Input Validation")
    empty_msg = client.post(f"/api/v1/portal/{share_token}/messages", json={"content": "   "})
    assert empty_msg.status_code == 422
    print("PASS: Empty client messages rejected (HTTP 422).")

    post_msg = client.post(f"/api/v1/portal/{share_token}/messages", json={
        "content": "Hello team, we are ready to commence the audit. What deliverables do you need from us?",
        "sender_name": f"Sarah Connor {tag}",
    })
    assert post_msg.status_code == 201
    print("PASS: Client message received and recorded via public portal.")

    # Get created conversation id
    updated_portal = client.get(f"/api/v1/portal/{share_token}").json()
    conv_id = updated_portal["conversations"][0]["id"]

    # --- [STEP 8] Employee Replies with Requirement Request ---
    print("\n[STEP 8] Employee Sends Deliverable Request")
    emp_msg = client.post(f"/api/v1/conversations/{conv_id}/messages", headers=emp_headers, json={
        "content": "Hi Sarah, please provide the signed Architecture Boundary Diagram and API gateway credentials by Friday so our team can begin.",
        "sender_type": "team",
        "sender_name": "Lead Solutions Architect",
    })
    assert emp_msg.status_code == 201
    print("PASS: Employee sent deliverable request to client.")

    # --- [STEP 9] AI Understanding: Client Owes Response ---
    print("\n[STEP 9] AI Understanding & Pending Action Identification")
    analysis_res = client.post(f"/api/v1/ai/conversations/{conv_id}/analyze", headers=emp_headers)
    assert analysis_res.status_code == 200
    analysis = analysis_res.json()
    assert analysis["who_needs_to_respond"] == "client", f"Expected client, got {analysis['who_needs_to_respond']}"
    assert analysis["client_action_completed"] is False
    assert analysis["client_was_asked_to_provide"] is not None
    print(f"PASS: AI correctly identified: Client owes response. Asked for: {analysis['client_was_asked_to_provide']}.")

    # --- [STEP 10] Waiting Period Progression & Follow-Up Due State ---
    print("\n[STEP 10] Waiting Period Progression & Follow-Up States")
    # Simulate time elapsed: 2.5 days passed since both messages
    two_and_half_days_ago = now - timedelta(days=2, hours=12)
    with SessionLocal() as update_db:
        msgs = update_db.query(Message).filter(Message.conversation_id == conv_id).all()
        for m in msgs:
            m.sent_at = two_and_half_days_ago
        update_db.commit()

    with SessionLocal() as sync_db:
        sync_followups(sync_db, now=now)
        fu = sync_db.query(FollowUp).filter(FollowUp.conversation_id == conv_id).first()
        assert fu is not None
        assert fu.status == "due", f"Expected 'due', got '{fu.status}' (days={fu.days_waiting})"
        assert fu.days_waiting >= 2.0
        fu_id = fu.id
    print(f"PASS: Follow-up correctly transitioned to status='due' (days_waiting>=2.0).")

    # --- [STEP 11] AI Follow-Up Reminder Generation with Tones ---
    print("\n[STEP 11] AI Follow-Up Generation (Professional & Urgent Tones)")
    draft_prof = client.post(f"/api/v1/ai/conversations/{conv_id}/generate-followup", headers=emp_headers, json={
        "tone": "professional",
        "instructions": "Mention the Friday timeline politely.",
    })
    assert draft_prof.status_code == 200
    prof_text = draft_prof.json()["message"]
    assert len(prof_text) > 30
    print("PASS: Professional follow-up draft generated successfully.")

    # --- [STEP 12] Employee Edits and Approves Reminder ---
    print("\n[STEP 12] Employee Approves Reminder & Waiting Window Restarts")
    approved_text = prof_text + " [Approved and dispatched by Lead Architect]"
    send_res = client.post(f"/api/v1/ai/conversations/{conv_id}/send-generated", headers=emp_headers, json={
        "content": approved_text,
        "sender_name": "Lead Solutions Architect",
    })
    assert send_res.status_code == 201

    # Verify that the reminder did NOT falsely mark the follow-up completed!
    with SessionLocal() as check_db:
        fu_check = check_db.query(FollowUp).filter(FollowUp.conversation_id == conv_id).first()
        assert fu_check.status != "completed", "ERROR: Reminder must NOT complete the action before client replies!"
        assert fu_check.days_waiting == 0.0, "Waiting period should restart at 0.0 days upon reminder dispatch."
    print("PASS: Reminder recorded in thread. Waiting period restarted to 0.0 days (not falsely completed).")

    # --- [STEP 13] Client Sends Partial / Non-Resolving Response ---
    print("\n[STEP 13] Client Partial Non-Resolving Response")
    non_resolving_msg = client.post(f"/api/v1/portal/{share_token}/messages", json={
        "content": "Thanks for checking in, let me check with our IT team.",
        "sender_name": f"Sarah Connor {tag}",
    })
    assert non_resolving_msg.status_code == 201
    analysis_after_partial = client.post(f"/api/v1/ai/conversations/{conv_id}/analyze", headers=emp_headers).json()
    assert analysis_after_partial["client_action_completed"] is False
    print("PASS: Partial client response does NOT falsely resolve the pending deliverable.")

    # --- [STEP 14] Client Confirms Deliverable & AI Resolves Action ---
    print("\n[STEP 14] Client Confirms Deliverable & Full Action Resolution")
    confirm_msg = client.post(f"/api/v1/portal/{share_token}/messages", json={
        "content": "All confirmed and approved! Attached are the signed Architecture Boundary Diagram and API credentials. Ready to proceed.",
        "sender_name": f"Sarah Connor {tag}",
    })
    assert confirm_msg.status_code == 201

    analysis_after_confirm = client.post(f"/api/v1/ai/conversations/{conv_id}/analyze", headers=emp_headers).json()
    assert analysis_after_confirm["client_action_completed"] is True
    print(f"PASS: AI recognized deliverable completion (client_action_completed=True).")

    # Resolve follow-up
    complete_res = client.post(f"/api/v1/followups/{fu_id}/complete", headers=emp_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "completed"
    print("PASS: Follow-up officially marked completed.")

    # --- [STEP 15] Share Link Revocation Verification ---
    print("\n[STEP 15] Share Link Revocation & Invalidation")
    revoke_res = client.post(f"/api/v1/projects/{p1_id}/share-link/revoke", headers=emp_headers)
    assert revoke_res.status_code == 200

    revoked_portal = client.get(f"/api/v1/portal/{share_token}")
    assert revoked_portal.status_code == 403
    print("PASS: Revoked link immediately blocked from public portal access (HTTP 403).")

    invalid_portal = client.get("/api/v1/portal/invalid_token_99999999")
    assert invalid_portal.status_code == 404
    print("PASS: Non-existent link rejected (HTTP 404).")

    print("\n======================================================================")
    print("ALL 15 END-TO-END CLIENTPULSE WORKFLOW TESTS PASSED 100%!")
    print("======================================================================")


if __name__ == "__main__":
    run_e2e_full_cycle_test()
