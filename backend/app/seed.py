import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.models.project_link import ProjectShareLink
from app.models.contact import Contact
from app.services.followup_engine import sync_followups

logger = logging.getLogger(__name__)


def _seed_contacts_for_clients(db: Session, clients: list, projects: list):
    """Creates a realistic set of initial contacts linked to clients & projects."""
    if len(clients) == 0:
        return

    c1 = clients[0]
    p1 = projects[0] if len(projects) > 0 else None

    c2 = clients[1] if len(clients) > 1 else clients[0]
    p2 = projects[1] if len(projects) > 1 else p1

    c3 = clients[2] if len(clients) > 2 else clients[0]
    p3 = projects[2] if len(projects) > 2 else p1

    demo_contacts = [
        Contact(
            client_id=c1.id,
            project_id=p1.id if p1 else None,
            name=c1.name,
            company=c1.company or "Nexus Retail Group",
            email=c1.email,
            phone="+1 (555) 234-5678",
            whatsapp="+1 (555) 234-5678",
            preferred_channel="email",
            consent_status="opted_in",
            is_primary=True,
            notes="Primary enterprise stakeholder. Prefers email updates with executive summaries.",
        ),
        Contact(
            client_id=c1.id,
            project_id=p1.id if p1 else None,
            name="Liam Patel",
            company=c1.company or "Nexus Retail Group",
            email="liam.patel@nexusretail.com",
            phone="+1 (555) 345-6789",
            whatsapp="+1 (555) 345-6789",
            preferred_channel="whatsapp",
            consent_status="opted_in",
            is_primary=False,
            notes="Lead API Solutions Architect. Technical contact for webhook retry buffer questions.",
        ),
        Contact(
            client_id=c2.id,
            project_id=p2.id if p2 else None,
            name=c2.name,
            company=c2.company or "Sterling Financial Advisory",
            email=c2.email,
            phone="+1 (555) 876-5432",
            whatsapp="+1 (555) 876-5432",
            preferred_channel="phone",
            consent_status="opted_in",
            is_primary=True,
            notes="Managing Partner. Prefers scheduled phone check-ins for high-level compliance milestones.",
        ),
        Contact(
            client_id=c2.id,
            project_id=p2.id if p2 else None,
            name="Sophia Reyes",
            company=c2.company or "Sterling Financial Advisory",
            email="sophia.reyes@sterlingadvisory.com",
            phone="+1 (555) 876-5433",
            whatsapp="+1 (555) 876-5433",
            preferred_channel="email",
            consent_status="opted_in",
            is_primary=False,
            notes="VP of Risk & Compliance. Authorizes security audits and penetration testing schedules.",
        ),
        Contact(
            client_id=c3.id,
            project_id=p3.id if p3 else None,
            name=c3.name,
            company=c3.company or "Apex Design Studio",
            email=c3.email,
            phone="+1 (555) 432-1098",
            whatsapp="+1 (555) 432-1098",
            preferred_channel="portal",
            consent_status="opted_in",
            is_primary=True,
            notes="Creative Director. Highly active on the client collaboration portal for design asset approvals.",
        ),
    ]
    db.add_all(demo_contacts)
    db.commit()


def seed_demo_data(db: Session, force: bool = False) -> dict:
    """Seeds a realistic set of demo clients, contacts, projects, conversations, and messages."""
    existing_count = db.query(Client).count()
    if existing_count > 0 and not force:
        # Check if contacts need to be backfilled
        if db.query(Contact).count() == 0:
            clients = db.query(Client).all()
            projects = db.query(Project).all()
            _seed_contacts_for_clients(db, clients, projects)
        logger.info(f"Database already has {existing_count} clients. Running follow-up sync only.")
        sync_followups(db)
        return {"status": "skipped", "message": f"Database already contains {existing_count} client(s)."}

    if force:
        # Clear existing in reverse dependency order
        db.query(Contact).delete()
        db.query(ProjectShareLink).delete()
        db.query(FollowUp).delete()
        db.query(Message).delete()
        db.query(Conversation).delete()
        db.query(Project).delete()
        db.query(Client).delete()
        db.commit()

    now = datetime.now(timezone.utc)

    # 1. Clients
    client1 = Client(
        name="Elena Vance",
        email="elena@nexusretail.com",
        company="Nexus Retail Group",
        phone="+1 (555) 234-5678",
        status="active",
        is_archived=False,
        notes="Key retail enterprise account preparing multi-channel e-commerce expansion.",
        created_at=now - timedelta(days=30),
        updated_at=now - timedelta(hours=2),
    )

    client2 = Client(
        name="Marcus Sterling",
        email="marcus@sterlingadvisory.com",
        company="Sterling Financial Advisory",
        phone="+1 (555) 876-5432",
        status="active",
        is_archived=False,
        notes="Private wealth management firm upgrading digital client onboarding & SOC2 compliance.",
        created_at=now - timedelta(days=25),
        updated_at=now - timedelta(hours=5),
    )

    client3 = Client(
        name="Chloe Davenport",
        email="chloe@davenportlogistics.com",
        company="Davenport Logistics Inc.",
        phone="+1 (555) 345-6789",
        status="archived",
        is_archived=True,
        notes="Completed freight telemetry tracking project in Q3. Retained for historical reference.",
        created_at=now - timedelta(days=45),
        updated_at=now - timedelta(days=10),
    )

    db.add_all([client1, client2, client3])
    db.commit()
    db.refresh(client1)
    db.refresh(client2)
    db.refresh(client3)

    # 2. Projects
    project1 = Project(
        client_id=client1.id,
        title="Omnichannel Commerce Upgrade",
        description="Redesign checkout workflows, integrate Stripe & PayPal idempotent webhooks, and sync ERP inventory.",
        status="in_progress",
        budget=45000.0,
        deadline="2026-12-15",
        created_at=now - timedelta(days=25),
        updated_at=now - timedelta(hours=3),
    )

    project2 = Project(
        client_id=client2.id,
        title="Client Portal Security Audit",
        description="Comprehensive SOC2 compliance assessment, MFA rollout, and penetration testing.",
        status="planning",
        budget=18500.0,
        deadline="2026-11-30",
        created_at=now - timedelta(days=20),
        updated_at=now - timedelta(days=1),
    )

    project3 = Project(
        client_id=client2.id,
        title="Advisory Analytics Dashboard",
        description="Interactive portfolio performance reporting widget with high-chart financial metrics.",
        status="in_progress",
        budget=32000.0,
        deadline="2027-02-28",
        created_at=now - timedelta(days=15),
        updated_at=now - timedelta(hours=6),
    )

    db.add_all([project1, project2, project3])
    db.commit()
    db.refresh(project1)
    db.refresh(project2)
    db.refresh(project3)

    # 3. Conversations with diverse waiting times demonstrating deterministic follow-up states

    # Conv A: Elena Vance - Last message from Elena 2.5 days ago -> State: DUE (>= 2 days, < 5 days)
    conv_due = Conversation(
        client_id=client1.id,
        project_id=project1.id,
        subject="Checkout API Webhook Retry Verification",
        channel="email",
        status="open",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=2, hours=12),
    )

    # Conv B: Marcus Sterling - Last message from Marcus 5.5 days ago -> State: OVERDUE (>= 5 days, < 7 days)
    conv_overdue = Conversation(
        client_id=client2.id,
        project_id=project2.id,
        subject="SOC2 Penetration Testing Schedule",
        channel="portal",
        status="open",
        created_at=now - timedelta(days=8),
        updated_at=now - timedelta(days=5, hours=12),
    )

    # Conv C: Marcus Sterling - Last message from Marcus 8.2 days ago -> State: ESCALATED (>= 7 days)
    conv_escalated = Conversation(
        client_id=client2.id,
        project_id=project3.id,
        subject="Portfolio Data Model Schema Inconsistency",
        channel="email",
        status="open",
        created_at=now - timedelta(days=12),
        updated_at=now - timedelta(days=8, hours=5),
    )

    # Conv D: Elena Vance - Last message from Elena 6 hours ago -> State: PENDING (< 2 days, on track)
    conv_pending = Conversation(
        client_id=client1.id,
        project_id=project1.id,
        subject="Staging Deployment Window Confirmation",
        channel="chat",
        status="open",
        created_at=now - timedelta(hours=10),
        updated_at=now - timedelta(hours=6),
    )

    # Conv E: Elena Vance - Last message from Team 12 hours ago -> NOT FLAGGED (team already replied!)
    conv_team_replied = Conversation(
        client_id=client1.id,
        project_id=project1.id,
        subject="Billing & Q3 Invoice Confirmation",
        channel="email",
        status="open",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(hours=12),
    )

    # Conv F: Chloe Davenport - Closed conversation -> NOT FLAGGED (closed thread!)
    conv_closed = Conversation(
        client_id=client3.id,
        project_id=None,
        subject="Archived: Final Telemetry Delivery Sign-off",
        channel="email",
        status="closed",
        created_at=now - timedelta(days=20),
        updated_at=now - timedelta(days=15),
    )

    db.add_all([conv_due, conv_overdue, conv_escalated, conv_pending, conv_team_replied, conv_closed])
    db.commit()

    for c in [conv_due, conv_overdue, conv_escalated, conv_pending, conv_team_replied, conv_closed]:
        db.refresh(c)

    # 4. Messages establishing the exact deterministic states
    messages = [
        # Conv Due (2.5 days ago)
        Message(
            conversation_id=conv_due.id,
            sender_type="team",
            sender_name="Lead Solution Architect",
            content="Elena, here is the draft specification for the idempotency headers.",
            sent_at=now - timedelta(days=3),
        ),
        Message(
            conversation_id=conv_due.id,
            sender_type="client",
            sender_name="Elena Vance",
            content="Can we review how failed payload retries are buffered? Please get back to us on this before the weekend.",
            sent_at=now - timedelta(days=2, hours=12),
        ),

        # Conv Overdue (5.5 days ago)
        Message(
            conversation_id=conv_overdue.id,
            sender_type="client",
            sender_name="Marcus Sterling",
            content="We need the penetration testing schedule approved by Monday for our compliance auditors. Can someone please provide the time slots?",
            sent_at=now - timedelta(days=5, hours=12),
        ),

        # Conv Escalated (8.2 days ago)
        Message(
            conversation_id=conv_escalated.id,
            sender_type="client",
            sender_name="Marcus Sterling",
            content="Critical: The bond yield calculations in the staging feed are returning null values. This is blocking our client demos. We need immediate assistance.",
            sent_at=now - timedelta(days=8, hours=5),
        ),

        # Conv Pending (6 hours ago)
        Message(
            conversation_id=conv_pending.id,
            sender_type="client",
            sender_name="Elena Vance",
            content="We are ready for staging deployment at 10 AM EST. Is the release artifact tagged?",
            sent_at=now - timedelta(hours=6),
        ),

        # Conv Team Replied (Team answered 12 hours ago -> client is NOT waiting, team is waiting or thread is quiet)
        Message(
            conversation_id=conv_team_replied.id,
            sender_type="client",
            sender_name="Elena Vance",
            content="Could you resend invoice #1042 for our accounts department?",
            sent_at=now - timedelta(days=1),
        ),
        Message(
            conversation_id=conv_team_replied.id,
            sender_type="team",
            sender_name="Billing Support",
            content="Hi Elena, PDF invoice #1042 is attached. Payment terms are net-30.",
            sent_at=now - timedelta(hours=12),
        ),

        # Conv Closed (Client closed thread 15 days ago -> No response required!)
        Message(
            conversation_id=conv_closed.id,
            sender_type="client",
            sender_name="Chloe Davenport",
            content="All deliverables confirmed. Project archived.",
            sent_at=now - timedelta(days=15),
        ),
    ]

    db.add_all(messages)
    db.commit()

    # Seed contacts linked to clients & projects
    _seed_contacts_for_clients(db, [client1, client2, client3], [proj1, proj2, proj3])

    # Synchronize followups through deterministic engine
    sync_followups(db, now=now)

    return {
        "status": "seeded",
        "clients": 3,
        "contacts": db.query(Contact).count(),
        "projects": 3,
        "conversations": 6,
        "messages": len(messages),
    }


if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        result = seed_demo_data(session, force=True)
        print("Demo seed result:", result)
