from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class EmailSendRequest(BaseModel):
    """Schema for employee email dispatch."""
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    contact_id: Optional[int] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    subject: str = Field(..., min_length=1, max_length=255)
    body_text: str = Field(..., min_length=1)
    body_html: Optional[str] = None
    idempotency_key: Optional[str] = None
    ai_drafted: bool = False
    force_send: bool = False

    @field_validator("subject", "body_text")
    def validate_non_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be blank.")
        return v.strip()


class EmailRead(BaseModel):
    """Full schema for email history records."""
    id: int
    contact_id: Optional[int] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    recipient_email: str
    recipient_name: Optional[str] = None
    sender_email: str
    subject: str
    body_text: str
    body_html: Optional[str] = None
    status: str  # sent, failed, received, queued
    direction: str  # outbound, inbound
    provider: str
    provider_message_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    error_details: Optional[str] = None
    ai_drafted: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    contact_name: Optional[str] = None
    client_name: Optional[str] = None
    project_title: Optional[str] = None

    class Config:
        from_attributes = True


class EmailDraftRequest(BaseModel):
    """Request to generate an AI email draft based on contact and project context."""
    contact_id: int
    project_id: Optional[int] = None
    tone: Optional[str] = "professional"  # professional, friendly, urgent, concise
    instructions: Optional[str] = None


class EmailDraftResponse(BaseModel):
    """AI generated email follow-up draft."""
    subject: str
    body_text: str
    tone: str
    ai_source: str  # gemini or local_fallback


class EmailWebhookPayload(BaseModel):
    """Inbound webhook payload representing incoming client replies."""
    from_email: EmailStr
    to_email: Optional[str] = None
    subject: str = "Re: Project Communication"
    text: str = Field(..., min_length=1)
    html: Optional[str] = None
    provider_message_id: Optional[str] = None
    in_reply_to: Optional[str] = None
