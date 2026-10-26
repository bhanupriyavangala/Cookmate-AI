from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="planning", nullable=False)  # planning, in_progress, completed, on_hold
    budget = Column(Float, nullable=True)
    deadline = Column(String(50), nullable=True)

    # Relationships
    client = relationship("Client", back_populates="projects")
    conversations = relationship("Conversation", back_populates="project")
    share_links = relationship(
        "ProjectShareLink",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="desc(ProjectShareLink.created_at)",
    )
    contacts = relationship("Contact", back_populates="project")
    emails = relationship("EmailMessage", back_populates="project")

    def __repr__(self) -> str:
        return f"<Project id={self.id} title='{self.title}' client_id={self.client_id}>"
