from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.message import MessageRead


class ConversationBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255, description="Subject or discussion topic")
    channel: Optional[str] = Field("email", description="Channel: email, portal, phone, chat")
    status: Optional[str] = Field("open", description="Status: open, closed, pending")


class ConversationCreate(ConversationBase):
    client_id: int
    project_id: Optional[int] = None
    initial_message: Optional[str] = Field(None, description="Optional opening message text")


class ConversationUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    channel: Optional[str] = None
    status: Optional[str] = None
    project_id: Optional[int] = None


class ConversationRead(ConversationBase):
    id: int
    client_id: int
    client_name: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    messages_count: Optional[int] = 0
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(ConversationRead):
    messages: List[MessageRead] = []
