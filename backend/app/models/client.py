from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    status = Column(String(20), default="active", nullable=False)  # active, inactive, archived
    is_archived = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="client", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="client", cascade="all, delete-orphan")
    emails = relationship("EmailMessage", back_populates="client")

    def __repr__(self) -> str:
        return f"<Client id={self.id} name='{self.name}' email='{self.email}'>"
