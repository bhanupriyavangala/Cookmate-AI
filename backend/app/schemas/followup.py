from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class FollowUpRead(BaseModel):
    id: int
    conversation_id: int
    conversation_subject: Optional[str] = None
    channel: Optional[str] = "email"
    client_id: int
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    status: str
    priority: str
    days_waiting: float
    last_client_message_at: Optional[datetime] = None
    last_message_content: Optional[str] = None
    snoozed_until: Optional[datetime] = None
    is_escalated: bool = False
    escalation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FollowUpSnoozeInput(BaseModel):
    days: float = Field(1.0, ge=0.1, le=30.0, description="Number of days to snooze this item")


class FollowUpEscalateInput(BaseModel):
    reason: Optional[str] = Field(None, max_length=500, description="Reason for escalation")


class EmployeeDashboardStats(BaseModel):
    total_clients: int
    total_projects: int
    pending_responses: int
    followups_due: int
    overdue_items: int
    escalated_items: int
    snoozed_items: int
    thresholds: Dict[str, float]
