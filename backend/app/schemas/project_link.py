from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProjectShareLinkRead(BaseModel):
    id: int
    project_id: int
    token: str
    is_active: bool
    created_at: datetime
    revoked_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    share_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RevokeShareLinkResponse(BaseModel):
    success: bool
    message: str
    project_id: int
    revoked_at: datetime
