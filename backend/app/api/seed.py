from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.seed import seed_demo_data

router = APIRouter(tags=["System & Demo Seed"])


@router.post("/seed")
def run_seed(force: bool = Query(False, description="Force reseed by clearing existing demo records"), db: Session = Depends(get_db)):
    """Seed demo clients, projects, conversations, and messages."""
    return seed_demo_data(db, force=force)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Return live aggregate counts for the dashboard."""
    total_clients = db.query(Client).count()
    active_clients = db.query(Client).filter(Client.is_archived == False).count()
    archived_clients = db.query(Client).filter(Client.is_archived == True).count()
    total_projects = db.query(Project).count()
    active_conversations = db.query(Conversation).filter(Conversation.status != "closed").count()
    total_messages = db.query(Message).count()

    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "archived_clients": archived_clients,
        "total_projects": total_projects,
        "active_conversations": active_conversations,
        "total_messages": total_messages,
    }
