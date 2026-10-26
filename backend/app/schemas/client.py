from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ClientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Client full or primary contact name")
    email: EmailStr = Field(..., description="Client primary email address")
    company: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field("active", description="Status: active, inactive, archived")
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None
    notes: Optional[str] = None


class ClientRead(ClientBase):
    id: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    projects_count: Optional[int] = 0
    conversations_count: Optional[int] = 0

    class Config:
        from_attributes = True
