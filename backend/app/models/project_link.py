import secrets
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


def generate_secure_token() -> str:
    """Generates a cryptographically strong, unguessable URL-safe token (43+ chars)."""
    return secrets.token_urlsafe(32)


class ProjectShareLink(Base, TimestampMixin):
    __tablename__ = "project_share_links"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(100), unique=True, nullable=False, index=True, default=generate_secure_token)
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)

    # Relationship to project
    project = relationship("Project", back_populates="share_links")

    def __repr__(self) -> str:
        return f"<ProjectShareLink id={self.id} project_id={self.project_id} is_active={self.is_active}>"
