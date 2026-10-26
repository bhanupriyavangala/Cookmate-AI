from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.config import settings
from app.models.project import Project
from app.models.client import Client
from app.models.project_link import ProjectShareLink
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead
from app.schemas.project_link import ProjectShareLinkRead, RevokeShareLinkResponse

router = APIRouter(prefix="/projects", tags=["Projects"])


def _format_project(project: Project) -> ProjectRead:
    return ProjectRead(
        id=project.id,
        client_id=project.client_id,
        client_name=project.client.name if project.client else None,
        title=project.title,
        description=project.description,
        status=project.status,
        budget=project.budget,
        deadline=project.deadline,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("", response_model=List[ProjectRead])
def list_projects(
    client_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List projects with optional filtering by client or status."""
    query = db.query(Project)

    if client_id is not None:
        query = query.filter(Project.client_id == client_id)

    if status_filter:
        query = query.filter(Project.status == status_filter)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Project.title.ilike(term),
                Project.description.ilike(term),
            )
        )

    projects = query.order_by(Project.updated_at.desc()).all()
    return [_format_project(p) for p in projects]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project linked to an existing client."""
    client = db.query(Client).filter(Client.id == project_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot create project: Client with id {project_in.client_id} does not exist.",
        )

    project = Project(
        client_id=project_in.client_id,
        title=project_in.title,
        description=project_in.description,
        status=project_in.status or "planning",
        budget=project_in.budget,
        deadline=project_in.deadline,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _format_project(project)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )
    return _format_project(project)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    """Update fields on a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    update_data = project_in.model_dump(exclude_unset=True)

    if "client_id" in update_data and update_data["client_id"] != project.client_id:
        client = db.query(Client).filter(Client.id == update_data["client_id"]).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target client with id {update_data['client_id']} does not exist.",
            )

    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return _format_project(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )
    db.delete(project)
    db.commit()
    return None


# -----------------------------------------------------------------------------
# Secure Client Communication Share Link Endpoints (Employee Only)
# -----------------------------------------------------------------------------

def _format_share_link(link: ProjectShareLink) -> ProjectShareLinkRead:
    return ProjectShareLinkRead(
        id=link.id,
        project_id=link.project_id,
        token=link.token,
        is_active=link.is_active,
        created_at=link.created_at,
        revoked_at=link.revoked_at,
        last_accessed_at=link.last_accessed_at,
        share_url=f"{settings.PORTAL_BASE_URL}/portal/{link.token}",
    )


@router.get("/{project_id}/share-link", response_model=Optional[ProjectShareLinkRead])
def get_project_share_link(project_id: int, db: Session = Depends(get_db)):
    """Retrieve the current active client communication link for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    link = (
        db.query(ProjectShareLink)
        .filter(ProjectShareLink.project_id == project_id, ProjectShareLink.is_active.is_(True))
        .first()
    )
    if not link:
        return None
    return _format_share_link(link)


@router.post("/{project_id}/share-link", response_model=ProjectShareLinkRead, status_code=status.HTTP_201_CREATED)
def generate_project_share_link(project_id: int, db: Session = Depends(get_db)):
    """
    Generate or regenerate a secure, unguessable client communication link for a project.
    Any previously active link for this project is revoked immediately.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    from datetime import datetime
    now_utc = datetime.utcnow()

    # Revoke any currently active links for this project
    active_links = (
        db.query(ProjectShareLink)
        .filter(ProjectShareLink.project_id == project_id, ProjectShareLink.is_active.is_(True))
        .all()
    )
    for al in active_links:
        al.is_active = False
        al.revoked_at = now_utc

    # Create new unguessable link
    new_link = ProjectShareLink(
        project_id=project_id,
        is_active=True,
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)

    return _format_share_link(new_link)


@router.post("/{project_id}/share-link/revoke", response_model=RevokeShareLinkResponse)
def revoke_project_share_link(project_id: int, db: Session = Depends(get_db)):
    """
    Revokes the active client communication link for a project.
    Clients will immediately lose portal access until a new link is generated.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    from datetime import datetime
    now_utc = datetime.utcnow()

    active_links = (
        db.query(ProjectShareLink)
        .filter(ProjectShareLink.project_id == project_id, ProjectShareLink.is_active.is_(True))
        .all()
    )
    if not active_links:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active client communication link found for project {project_id}.",
        )

    for al in active_links:
        al.is_active = False
        al.revoked_at = now_utc

    db.commit()

    return RevokeShareLinkResponse(
        success=True,
        message=f"Client communication link for project '{project.title}' was successfully revoked.",
        project_id=project_id,
        revoked_at=now_utc,
    )

