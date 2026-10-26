from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    sender_type: str = Field(..., description="client, team, or system")
    sender_name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, description="Message text content")


class MessageCreate(MessageBase):
    pass


class MessageRead(MessageBase):
    id: int
    conversation_id: int
    sent_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
