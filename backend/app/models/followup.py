from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class FollowUp(Base, TimestampMixin):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    client_id = Column(
        Integer,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Status: pending, due, overdue, escalated, snoozed, completed
    status = Column(String(30), default="pending", nullable=False, index=True)

    # Priority: low, medium, high, urgent
    priority = Column(String(20), default="low", nullable=False, index=True)

    # Calculated metrics
    days_waiting = Column(Float, default=0.0, nullable=False)
    last_client_message_at = Column(DateTime, nullable=True)
    last_message_content = Column(Text, nullable=True)

    # State controls
    snoozed_until = Column(DateTime, nullable=True)
    is_escalated = Column(Boolean, default=False, nullable=False)
    escalation_reason = Column(Text, nullable=True)

    # Relationships
    conversation = relationship("Conversation", backref="followup_item")
    client = relationship("Client")
    project = relationship("Project")

    def __repr__(self) -> str:
        return f"<FollowUp id={self.id} conv={self.conversation_id} status={self.status} days={self.days_waiting:.1f}>"
