from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    subject = Column(String(255), nullable=False)
    channel = Column(String(50), default="email", nullable=False)  # email, portal, phone, chat
    status = Column(String(50), default="open", nullable=False)  # open, closed, pending

    # Relationships
    client = relationship("Client", back_populates="conversations")
    project = relationship("Project", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.sent_at"
    )

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} subject='{self.subject}' client_id={self.client_id}>"
