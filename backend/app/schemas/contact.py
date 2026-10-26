from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Full name of contact")
    email: EmailStr = Field(..., description="Primary email address")
    company: Optional[str] = Field(None, max_length=120, description="Organization or company name")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    whatsapp: Optional[str] = Field(None, max_length=50, description="WhatsApp phone number with country code")
    preferred_channel: str = Field("email", description="Preferred communication channel (email, whatsapp, phone, portal)")
    consent_status: str = Field("opted_in", description="Communication consent status (opted_in, pending, opted_out)")
    notes: Optional[str] = Field(None, description="Internal notes regarding this contact")
    client_id: Optional[int] = Field(None, description="Associated Client ID")
    project_id: Optional[int] = Field(None, description="Associated Project ID")
    is_primary: bool = Field(False, description="Whether this is the primary point of contact")

    @field_validator("name", mode="before")
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Contact name must not be blank.")
        return v.strip()

    @field_validator("preferred_channel", mode="before")
    def validate_channel(cls, v: str) -> str:
        valid_channels = {"email", "whatsapp", "phone", "portal"}
        val = (v or "email").lower().strip()
        if val not in valid_channels:
            raise ValueError(f"Invalid preferred_channel '{val}'. Must be one of: {', '.join(sorted(valid_channels))}")
        return val

    @field_validator("consent_status", mode="before")
    def validate_consent(cls, v: str) -> str:
        valid_statuses = {"opted_in", "pending", "opted_out"}
        val = (v or "opted_in").lower().strip()
        if val not in valid_statuses:
            raise ValueError(f"Invalid consent_status '{val}'. Must be one of: {', '.join(sorted(valid_statuses))}")
        return val


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=50)
    whatsapp: Optional[str] = Field(None, max_length=50)
    preferred_channel: Optional[str] = None
    consent_status: Optional[str] = None
    notes: Optional[str] = None
    client_id: Optional[int] = None
    project_id: Optional[int] = None
    is_primary: Optional[bool] = None

    @field_validator("name", mode="before")
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Contact name must not be blank.")
            return v.strip()
        return v

    @field_validator("preferred_channel", mode="before")
    def validate_channel(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_channels = {"email", "whatsapp", "phone", "portal"}
            val = v.lower().strip()
            if val not in valid_channels:
                raise ValueError(f"Invalid preferred_channel '{val}'. Must be one of: {', '.join(sorted(valid_channels))}")
            return val
        return v

    @field_validator("consent_status", mode="before")
    def validate_consent(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid_statuses = {"opted_in", "pending", "opted_out"}
            val = v.lower().strip()
            if val not in valid_statuses:
                raise ValueError(f"Invalid consent_status '{val}'. Must be one of: {', '.join(sorted(valid_statuses))}")
            return val
        return v


class ContactRead(ContactBase):
    id: int
    client_name: Optional[str] = None
    project_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
