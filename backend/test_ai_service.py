"""Automated test suite verifying Gemini AI conversation analysis, follow-up generation, validation, and fallback mechanisms."""
import json
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal, init_db
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.services.gemini_service import GeminiService
from app.services.followup_engine import sync_followups
from app.api.ai import mark_generated_as_sent_endpoint
from app.schemas.ai import SendGeneratedMessageRequest


def run_ai_service_tests():
    print("==================================================")
    print("RUNNING GEMINI AI SERVICE TEST SUITE (MOCKED & FALLBACK)")
    print("==================================================")

    init_db()
    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # Create test client, project, and conversation
        client = Client(name="Dr. Aris Thorne", email=f"aris_{int(now.timestamp())}@thornebio.com", company="Thorne Biotech", status="active")
        db.add(client)
        db.commit()

        project = Project(client_id=client.id, title="Gene Sequencer API Integration", status="in_progress")
        db.add(project)
        db.commit()

        conv = Conversation(client_id=client.id, project_id=project.id, subject="FASTQ Pipeline Latency Specs", status="open")
        db.add(conv)
        db.commit()

        msg = Message(
            conversation_id=conv.id,
            sender_type="client",
            sender_name="Dr. Aris Thorne",
            content="Can you confirm if our batch sequencing payloads exceeding 50GB will be compressed before transfer? This affects our cloud storage budget.",
            sent_at=now - timedelta(days=2, hours=4),
        )
        db.add(msg)
        db.commit()

        # Synchronize follow-up
        sync_followups(db, now=now)
        followup = db.query(FollowUp).filter(FollowUp.conversation_id == conv.id).first()
        assert followup is not None
        assert followup.status == "due"

        # ---------------------------------------------------------------------
        # TEST 1: Mocked Gemini API Conversation Analysis
        # ---------------------------------------------------------------------
        print("\n--- [TEST 1] Mocked Gemini Conversation Analysis ---")
        mock_analysis_json = json.dumps({
            "pending_action": "Confirm gzip payload compression policy for files > 50GB",
            "who_needs_to_respond": "team",
            "response_required": True,
            "priority": "high",
            "possible_project_impact": "Client cloud storage budget and network egress costs depend on compression specs.",
            "recommended_next_action": "Confirm streaming gzip chunking is active and cite throughput benchmarks."
        })

        ai_mocked = GeminiService(api_key="mock_key_for_testing", model="gemini-1.5-flash")
        ai_mocked._mock_caller = lambda prompt, as_json: mock_analysis_json

        analysis = ai_mocked.analyze_conversation(conv)
        assert analysis.conversation_id == conv.id
        assert analysis.who_needs_to_respond == "team"
        assert analysis.response_required is True
        assert analysis.priority == "high"
        assert "compression" in analysis.pending_action.lower()
        assert analysis.ai_source == "gemini"
        print("PASS: Mocked Gemini analysis successfully parsed, validated via Pydantic, and verified.")

        # ---------------------------------------------------------------------
        # TEST 2: Mocked Gemini Follow-Up Generation
        # ---------------------------------------------------------------------
        print("\n--- [TEST 2] Mocked Gemini Follow-Up Generation ---")
        mock_followup_json = json.dumps({
            "subject": "Re: FASTQ Pipeline Latency Specs",
            "message": "Hi Dr. Thorne,\n\nThank you for following up. All batch payloads over 50GB are automatically compressed via streaming gzip chunking prior to egress, maintaining optimal storage efficiency.\n\nPlease let us know if you'd like to schedule a benchmark walkthrough.\n\nBest regards,\nClientPulse Team",
            "recommended_tone": "professional",
            "confidence_score": 0.98
        })
        ai_mocked._mock_caller = lambda prompt, as_json: mock_followup_json

        followup_draft = ai_mocked.generate_followup(conv, tone="professional")
        assert followup_draft.conversation_id == conv.id
        assert "Dr. Thorne" in followup_draft.message
        assert "compressed" in followup_draft.message
        assert followup_draft.confidence_score == 0.98
        assert followup_draft.ai_source == "gemini"
        print("PASS: Mocked Gemini follow-up draft generated and validated successfully.")

        # ---------------------------------------------------------------------
        # TEST 3: Graceful Fallback Analysis when API Key is missing / offline
        # ---------------------------------------------------------------------
        print("\n--- [TEST 3] Graceful Fallback Analysis (Offline / Unset Key) ---")
        ai_fallback = GeminiService(api_key=None) # No key

        fallback_analysis = ai_fallback.analyze_conversation(conv)
        assert fallback_analysis.conversation_id == conv.id
        assert fallback_analysis.who_needs_to_respond == "team"
        assert fallback_analysis.response_required is True
        assert fallback_analysis.ai_source == "local_fallback"
        print("PASS: Fallback analysis executed gracefully without crashing when API key is unavailable.")

        # ---------------------------------------------------------------------
        # TEST 4: Graceful Fallback Follow-up Draft Generation
        # ---------------------------------------------------------------------
        print("\n--- [TEST 4] Graceful Fallback Follow-up Draft Generation ---")
        fallback_draft = ai_fallback.generate_followup(conv, tone="professional", instructions="Mention batch compression.")
        assert fallback_draft.conversation_id == conv.id
        assert "Aris" in fallback_draft.message
        assert "Gene Sequencer" in fallback_draft.message
        assert fallback_draft.ai_source == "local_fallback"
        print("PASS: Fallback follow-up draft generated with context-aware client and project details.")

        # ---------------------------------------------------------------------
        # TEST 5: Mark Generated Follow-up as Sent (Simulated Transmission)
        # ---------------------------------------------------------------------
        print("\n--- [TEST 5] Employee Mark Message as Sent ---")
        send_req = SendGeneratedMessageRequest(
            content=fallback_draft.message,
            sender_name="Senior Solutions Architect"
        )
        send_result = mark_generated_as_sent_endpoint(
            conversation_id=conv.id,
            send_req=send_req,
            db=db
        )
        assert send_result["status"] == "sent"
        assert send_result["followup_status"] == "completed"

        # Verify message exists in conversation
        latest_msg = db.query(Message).filter(Message.id == send_result["message_id"]).first()
        assert latest_msg is not None
        assert latest_msg.sender_type == "team"
        assert latest_msg.sender_name == "Senior Solutions Architect"

        # Verify followup item in DB is marked completed
        db.refresh(followup)
        assert followup.status == "completed"
        assert followup.days_waiting == 0.0
        print("PASS: Generated message recorded in thread and follow-up item marked as completed.")

        # Cleanup
        db.delete(latest_msg)
        db.delete(msg)
        db.delete(followup)
        db.delete(conv)
        db.delete(project)
        db.delete(client)
        db.commit()

        print("\n==================================================")
        print("ALL GEMINI AI SERVICE TESTS PASSED 100%!")
        print("==================================================")

    finally:
        db.close()


if __name__ == "__main__":
    run_ai_service_tests()
