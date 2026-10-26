import urllib.request
import json
from app.main import app
from app.database import init_db
from app.seed import seed_demo_data
from app.database import SessionLocal

def test_api():
    print("Testing live database integration...")
    init_db()
    with SessionLocal() as db:
        seed_res = seed_demo_data(db, force=False)
        print("Seed Status:", seed_res)

        from app.models.client import Client
        from app.models.project import Project
        from app.models.conversation import Conversation
        from app.models.message import Message

        clients = db.query(Client).all()
        projects = db.query(Project).all()
        convs = db.query(Conversation).all()
        messages = db.query(Message).all()

        print(f"Verified Database Counts: {len(clients)} clients, {len(projects)} projects, {len(convs)} conversations, {len(messages)} messages.")
        assert len(clients) >= 3, "Expected at least 3 clients"
        assert len(projects) >= 3, "Expected at least 3 projects"
        assert len(convs) >= 3, "Expected at least 3 conversations"
        assert len(messages) >= 6, "Expected at least 6 messages"

        # Verify client 1 projects link
        c1 = clients[0]
        assert len(c1.projects) > 0
        print(f"Client '{c1.name}' linked projects: {[p.title for p in c1.projects]}")

        # Verify conversation 1 messages
        cv1 = convs[0]
        assert len(cv1.messages) > 0
        print(f"Conversation '{cv1.subject}' messages count: {len(cv1.messages)}")
        for m in cv1.messages:
            print(f"  [{m.sender_type.upper()}] {m.sender_name} @ {m.sent_at}: {m.content[:40]}...")

    print("ALL INTEGRATION CHECKS VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_api()
