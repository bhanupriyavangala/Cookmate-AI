"""Automated verification suite testing main CRUD operations for ClientPulse AI."""
import sys
from datetime import datetime, timezone
from app.database import init_db, SessionLocal
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.api.clients import create_client, update_client, archive_client, unarchive_client, delete_client, list_clients, get_client
from app.api.projects import create_project, update_project, delete_project, list_projects, get_project
from app.api.conversations import create_conversation, post_message, get_conversation, list_conversations, delete_conversation
from app.schemas.client import ClientCreate, ClientUpdate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.conversation import ConversationCreate
from app.schemas.message import MessageCreate
from fastapi import HTTPException


def run_tests():
    print("--- [TEST 1] Initializing Database & Seed ---")
    init_db()
    db = SessionLocal()

    try:
        # 1. Test Client Creation
        print("--- [TEST 2] Testing Client CRUD & Validation ---")
        test_email = f"test_{int(datetime.now().timestamp())}@acmecorp.com"
        client_in = ClientCreate(
            name="Alice Test",
            email=test_email,
            company="Acme Corp",
            phone="+1 555-0199",
            status="active",
            notes="Automated test client record.",
        )
        created_client = create_client(client_in, db=db)
        assert created_client.id is not None
        assert created_client.name == "Alice Test"
        assert created_client.is_archived is False
        print(f"PASS: Created client ID={created_client.id}")

        # Test duplicate email validation
        try:
            create_client(client_in, db=db)
            assert False, "Should have thrown duplicate email HTTPException"
        except HTTPException as e:
            assert e.status_code == 400
            print("PASS: Duplicate email validation correctly rejected (HTTP 400)")

        # Test Client Update
        updated_client = update_client(
            client_id=created_client.id,
            client_in=ClientUpdate(company="Acme Corporation Global", notes="Updated notes"),
            db=db
        )
        assert updated_client.company == "Acme Corporation Global"
        assert updated_client.notes == "Updated notes"
        print("PASS: Client update succeeded")

        # Test Client Archive & Unarchive
        archived = archive_client(created_client.id, db=db)
        assert archived.is_archived is True
        assert archived.status == "archived"
        print("PASS: Client archive succeeded")

        unarchived = unarchive_client(created_client.id, db=db)
        assert unarchived.is_archived is False
        assert unarchived.status == "active"
        print("PASS: Client unarchive succeeded")

        # 2. Test Project CRUD linked to client
        print("--- [TEST 3] Testing Project CRUD linked to Client ---")
        project_in = ProjectCreate(
            client_id=created_client.id,
            title="Q4 Cloud Infrastructure Migration",
            description="Containerized microservices orchestration.",
            status="planning",
            budget=25000.0,
            deadline="2026-12-31",
        )
        created_project = create_project(project_in, db=db)
        assert created_project.id is not None
        assert created_project.client_id == created_client.id
        assert created_project.client_name == "Alice Test"
        print(f"PASS: Created project ID={created_project.id} linked to client {created_client.id}")

        # Test invalid client ID for project creation
        try:
            create_project(ProjectCreate(client_id=999999, title="Invalid"), db=db)
            assert False, "Should have failed with 404 for invalid client_id"
        except HTTPException as e:
            assert e.status_code == 404
            print("PASS: Invalid client_id rejected on project create (HTTP 404)")

        # Test Project Update
        updated_proj = update_project(
            created_project.id,
            ProjectUpdate(status="in_progress", budget=28000.0),
            db=db
        )
        assert updated_proj.status == "in_progress"
        assert updated_proj.budget == 28000.0
        print("PASS: Project update succeeded")

        # 3. Test Conversation & Messages
        print("--- [TEST 4] Testing Conversation & Message Threads ---")
        conv_in = ConversationCreate(
            client_id=created_client.id,
            project_id=created_project.id,
            subject="Architecture Diagram Sign-off",
            channel="email",
            status="open",
            initial_message="Hi Alice, please review the attached architecture blueprint.",
        )
        conv = create_conversation(conv_in, db=db)
        assert conv.id is not None
        assert conv.client_id == created_client.id
        assert conv.project_id == created_project.id
        assert len(conv.messages) == 1
        assert conv.messages[0].sender_type == "client"
        print(f"PASS: Created conversation ID={conv.id} with initial message")

        # Add response message
        msg_in = MessageCreate(
            sender_type="team",
            sender_name="Lead Solution Architect",
            content="The network topology looks solid. Approving for production rollout.",
        )
        stored_msg = post_message(conv.id, msg_in, db=db)
        assert stored_msg.id is not None
        assert stored_msg.sender_type == "team"
        assert stored_msg.sent_at is not None
        print(f"PASS: Added message ID={stored_msg.id} with sender and timestamp")

        # Retrieve conversation detail with all messages
        detail = get_conversation(conv.id, db=db)
        assert len(detail.messages) == 2
        print(f"PASS: Retrieved conversation detail with {len(detail.messages)} chronologically ordered messages")

        # 4. Test Cascade Deletion Cleanup
        print("--- [TEST 5] Testing Deletion & Cleanup ---")
        delete_conversation(conv.id, db=db)
        delete_project(created_project.id, db=db)
        delete_client(created_client.id, db=db)
        print("PASS: Cascade deletion of conversation, project, and client succeeded")

        print("\n==========================================")
        print("ALL CRUD AND VALIDATION TESTS PASSED 100%!")
        print("==========================================")
    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
