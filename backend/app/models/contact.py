from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base import TimestampMixin


class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(120), nullable=False, index=True)
    company = Column(String(120), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    whatsapp = Column(String(50), nullable=True)
    preferred_channel = Column(String(30), default="email", nullable=False)  # email, whatsapp, phone, portal
    consent_status = Column(String(30), default="opted_in", nullable=False)  # opted_in, pending, opted_out
    notes = Column(Text, nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="contacts")
    project = relationship("Project", back_populates="contacts")
    emails = relationship("EmailMessage", back_populates="contact", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Contact id={self.id} name='{self.name}' email='{self.email}' company='{self.company}'>"
