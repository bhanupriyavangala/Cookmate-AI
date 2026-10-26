from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Project title")
    description: Optional[str] = None
    status: Optional[str] = Field("planning", description="Status: planning, in_progress, completed, on_hold")
    budget: Optional[float] = Field(None, ge=0)
    deadline: Optional[str] = None


class ProjectCreate(ProjectBase):
    client_id: int = Field(..., description="ID of client this project belongs to")


class ProjectUpdate(BaseModel):
    client_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    deadline: Optional[str] = None


class ProjectRead(ProjectBase):
    id: int
    client_id: int
    client_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
