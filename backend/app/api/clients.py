from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientRead

router = APIRouter(prefix="/clients", tags=["Clients"])


def _format_client(client: Client) -> ClientRead:
    return ClientRead(
        id=client.id,
        name=client.name,
        email=client.email,
        company=client.company,
        phone=client.phone,
        status=client.status,
        is_archived=client.is_archived,
        notes=client.notes,
        created_at=client.created_at,
        updated_at=client.updated_at,
        projects_count=len(client.projects) if client.projects else 0,
        conversations_count=len(client.conversations) if client.conversations else 0,
    )


@router.get("", response_model=List[ClientRead])
def list_clients(
    status_filter: Optional[str] = Query(None, alias="status"),
    is_archived: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List clients with optional search and archive/status filters."""
    query = db.query(Client)

    if is_archived is not None:
        query = query.filter(Client.is_archived == is_archived)

    if status_filter:
        query = query.filter(Client.status == status_filter)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.name.ilike(term),
                Client.email.ilike(term),
                Client.company.ilike(term),
            )
        )

    clients = query.order_by(Client.updated_at.desc()).all()
    return [_format_client(c) for c in clients]


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    """Create a new client with unique email validation."""
    existing = db.query(Client).filter(Client.email == client_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A client with email '{client_in.email}' already exists.",
        )

    client = Client(
        name=client_in.name,
        email=client_in.email,
        company=client_in.company,
        phone=client_in.phone,
        status=client_in.status or "active",
        notes=client_in.notes,
        is_archived=False,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _format_client(client)


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found",
        )
    return _format_client(client)


@router.put("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, client_in: ClientUpdate, db: Session = Depends(get_db)):
    """Update fields on an existing client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found",
        )

    update_data = client_in.model_dump(exclude_unset=True)

    # If updating email, check for uniqueness conflict
    if "email" in update_data and update_data["email"] != client.email:
        conflict = db.query(Client).filter(Client.email == update_data["email"]).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{update_data['email']}' is already in use by another client.",
            )

    for field, value in update_data.items():
        setattr(client, field, value)

    # Sync status with archive if needed
    if client.is_archived and client.status != "archived":
        client.status = "archived"
    elif not client.is_archived and client.status == "archived":
        client.status = "active"

    db.commit()
    db.refresh(client)
    return _format_client(client)


@router.patch("/{client_id}/archive", response_model=ClientRead)
def archive_client(client_id: int, db: Session = Depends(get_db)):
    """Archive a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found",
        )
    client.is_archived = True
    client.status = "archived"
    db.commit()
    db.refresh(client)
    return _format_client(client)


@router.patch("/{client_id}/unarchive", response_model=ClientRead)
def unarchive_client(client_id: int, db: Session = Depends(get_db)):
    """Restore an archived client back to active state."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found",
        )
    client.is_archived = False
    client.status = "active"
    db.commit()
    db.refresh(client)
    return _format_client(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    """Delete a client and cascade to linked projects/conversations."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with id {client_id} not found",
        )
    db.delete(client)
    db.commit()
    return None
