from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class PortalMessageItem(BaseModel):
    id: int
    sender_type: str  # 'client' or 'team'
    sender_name: str
    content: str
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortalConversationItem(BaseModel):
    id: int
    subject: str
    channel: str
    status: str
    updated_at: datetime
    messages: List[PortalMessageItem] = []

    model_config = ConfigDict(from_attributes=True)


class PortalProjectResponse(BaseModel):
    project_id: int
    project_title: str
    project_description: Optional[str] = None
    client_name: str
    client_company: Optional[str] = None
    token: str
    is_active: bool
    conversations: List[PortalConversationItem] = []

    model_config = ConfigDict(from_attributes=True)


class PortalMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000, description="Message content from client")
    conversation_id: Optional[int] = Field(None, description="Optional existing conversation ID within this project")
    sender_name: Optional[str] = Field(None, max_length=100, description="Optional client sender name")
