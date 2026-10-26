from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.followup import FollowUp
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.schemas.followup import (
    FollowUpRead,
    FollowUpSnoozeInput,
    FollowUpEscalateInput,
    EmployeeDashboardStats,
)
from app.services.followup_engine import (
    sync_followups,
    snooze_followup,
    complete_followup,
    escalate_followup,
)

router = APIRouter(prefix="/followups", tags=["Employee Dashboard & Follow-ups"])


def _format_followup(item: FollowUp) -> FollowUpRead:
    conv = item.conversation
    client = item.client
    project = item.project
    return FollowUpRead(
        id=item.id,
        conversation_id=item.conversation_id,
        conversation_subject=conv.subject if conv else None,
        channel=conv.channel if conv else "email",
        client_id=item.client_id,
        client_name=client.name if client else None,
        client_company=client.company if client else None,
        project_id=item.project_id,
        project_title=project.title if project else None,
        status=item.status,
        priority=item.priority,
        days_waiting=item.days_waiting,
        last_client_message_at=item.last_client_message_at,
        last_message_content=item.last_message_content,
        snoozed_until=item.snoozed_until,
        is_escalated=item.is_escalated,
        escalation_reason=item.escalation_reason,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=List[FollowUpRead])
def list_followups(
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    active_only: bool = Query(False, description="Filter only items requiring active attention"),
    db: Session = Depends(get_db),
):
    """
    Retrieves follow-up items with real-time recalculation of waiting time from stored timestamps.
    Automatically filters out conversations that do not require a response.
    """
    # Deterministically synchronize and recalculate waiting time for all conversations
    sync_followups(db)

    query = db.query(FollowUp)

    if active_only:
        query = query.filter(FollowUp.status.in_(["due", "overdue", "escalated", "pending"]))
    elif status_filter:
        query = query.filter(FollowUp.status == status_filter)

    if client_id is not None:
        query = query.filter(FollowUp.client_id == client_id)

    if project_id is not None:
        query = query.filter(FollowUp.project_id == project_id)

    # Sort deterministically: highest priority first, then longest waiting
    priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
    items = query.all()
    sorted_items = sorted(
        items,
        key=lambda x: (priority_order.get(x.priority, 99), -x.days_waiting)
    )

    return [_format_followup(f) for f in sorted_items]


@router.get("/dashboard", response_model=EmployeeDashboardStats)
def get_employee_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Returns aggregated metrics for the Employee Dashboard:
    clients, projects, pending responses, follow-ups due, overdue items, and escalations.
    """
    sync_followups(db)

    total_clients = db.query(Client).filter(Client.is_archived == False).count()
    total_projects = db.query(Project).count()

    # Active pending responses are items in due, overdue, escalated, or pending states
    pending_responses = db.query(FollowUp).filter(
        FollowUp.status.in_(["due", "overdue", "escalated", "pending"])
    ).count()

    followups_due = db.query(FollowUp).filter(FollowUp.status == "due").count()
    overdue_items = db.query(FollowUp).filter(FollowUp.status == "overdue").count()
    escalated_items = db.query(FollowUp).filter(FollowUp.status == "escalated").count()
    snoozed_items = db.query(FollowUp).filter(FollowUp.status == "snoozed").count()

    return EmployeeDashboardStats(
        total_clients=total_clients,
        total_projects=total_projects,
        pending_responses=pending_responses,
        followups_due=followups_due,
        overdue_items=overdue_items,
        escalated_items=escalated_items,
        snoozed_items=snoozed_items,
        thresholds={
            "recommended_due_days": settings.FOLLOWUP_DUE_THRESHOLD_DAYS,
            "overdue_days": settings.FOLLOWUP_OVERDUE_THRESHOLD_DAYS,
            "escalation_days": settings.FOLLOWUP_ESCALATION_THRESHOLD_DAYS,
        },
    )


@router.post("/{followup_id}/snooze", response_model=FollowUpRead)
def snooze_item(
    followup_id: int,
    snooze_in: FollowUpSnoozeInput,
    db: Session = Depends(get_db),
):
    """Snoozes a follow-up item for the specified number of days."""
    try:
        updated = snooze_followup(db, followup_id, days=snooze_in.days)
        return _format_followup(updated)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/{followup_id}/complete", response_model=FollowUpRead)
def complete_item(followup_id: int, db: Session = Depends(get_db)):
    """Marks a follow-up item as completed."""
    try:
        updated = complete_followup(db, followup_id)
        return _format_followup(updated)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/{followup_id}/escalate", response_model=FollowUpRead)
def escalate_item(
    followup_id: int,
    escalate_in: FollowUpEscalateInput,
    db: Session = Depends(get_db),
):
    """Escalates a follow-up item with optional reason."""
    try:
        updated = escalate_followup(db, followup_id, reason=escalate_in.reason)
        return _format_followup(updated)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
