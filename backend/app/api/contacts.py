from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.contact import Contact
from app.models.client import Client
from app.models.project import Project
from app.schemas.contact import ContactCreate, ContactUpdate, ContactRead

router = APIRouter(prefix="/contacts", tags=["Contacts"])


def _format_contact(c: Contact) -> ContactRead:
    return ContactRead(
        id=c.id,
        name=c.name,
        company=c.company or (c.client.company if c.client else None),
        email=c.email,
        phone=c.phone,
        whatsapp=c.whatsapp,
        preferred_channel=c.preferred_channel,
        consent_status=c.consent_status,
        notes=c.notes,
        client_id=c.client_id,
        client_name=c.client.name if c.client else None,
        project_id=c.project_id,
        project_title=c.project.title if c.project else None,
        is_primary=c.is_primary,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("", response_model=List[ContactRead])
def list_contacts(
    client_id: Optional[int] = Query(None, description="Filter contacts by client"),
    project_id: Optional[int] = Query(None, description="Filter contacts by project"),
    preferred_channel: Optional[str] = Query(None, description="Filter by preferred channel (email, whatsapp, phone, portal)"),
    consent_status: Optional[str] = Query(None, description="Filter by consent status (opted_in, pending, opted_out)"),
    search: Optional[str] = Query(None, description="Search across name, company, email, phone, whatsapp"),
    db: Session = Depends(get_db),
):
    """List all contacts with comprehensive search and filtering capabilities."""
    query = db.query(Contact)

    if client_id is not None:
        query = query.filter(Contact.client_id == client_id)

    if project_id is not None:
        query = query.filter(Contact.project_id == project_id)

    if preferred_channel:
        query = query.filter(Contact.preferred_channel == preferred_channel.lower().strip())

    if consent_status:
        query = query.filter(Contact.consent_status == consent_status.lower().strip())

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contact.name.ilike(term),
                Contact.company.ilike(term),
                Contact.email.ilike(term),
                Contact.phone.ilike(term),
                Contact.whatsapp.ilike(term),
            )
        )

    contacts = query.order_by(Contact.is_primary.desc(), Contact.updated_at.desc()).all()
    return [_format_contact(c) for c in contacts]


@router.post("", response_model=ContactRead, status_code=status.HTTP_201_CREATED)
def create_contact(contact_in: ContactCreate, db: Session = Depends(get_db)):
    """Create a new contact optionally linked to an existing client or project."""
    # Validate linked client
    client = None
    if contact_in.client_id:
        client = db.query(Client).filter(Client.id == contact_in.client_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot link contact: Client with id {contact_in.client_id} does not exist.",
            )

    # Validate linked project
    if contact_in.project_id:
        project = db.query(Project).filter(Project.id == contact_in.project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot link contact: Project with id {contact_in.project_id} does not exist.",
            )

    # Auto-derive company from linked client if not specified
    company = contact_in.company
    if not company and client and client.company:
        company = client.company

    new_contact = Contact(
        name=contact_in.name,
        company=company,
        email=contact_in.email,
        phone=contact_in.phone,
        whatsapp=contact_in.whatsapp,
        preferred_channel=contact_in.preferred_channel,
        consent_status=contact_in.consent_status,
        notes=contact_in.notes,
        client_id=contact_in.client_id,
        project_id=contact_in.project_id,
        is_primary=contact_in.is_primary,
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    return _format_contact(new_contact)


@router.get("/{contact_id}", response_model=ContactRead)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    """Retrieve full details of a specific contact."""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )
    return _format_contact(contact)


@router.put("/{contact_id}", response_model=ContactRead)
def update_contact(
    contact_id: int,
    contact_in: ContactUpdate,
    db: Session = Depends(get_db),
):
    """Update fields on an existing contact."""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )

    update_data = contact_in.model_dump(exclude_unset=True)

    # Validate client if updated
    if "client_id" in update_data and update_data["client_id"] is not None:
        client = db.query(Client).filter(Client.id == update_data["client_id"]).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot link contact: Client with id {update_data['client_id']} does not exist.",
            )

    # Validate project if updated
    if "project_id" in update_data and update_data["project_id"] is not None:
        project = db.query(Project).filter(Project.id == update_data["project_id"]).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot link contact: Project with id {update_data['project_id']} does not exist.",
            )

    for field, value in update_data.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)

    return _format_contact(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    """Delete a contact."""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with id {contact_id} not found.",
        )

    db.delete(contact)
    db.commit()
    return None
