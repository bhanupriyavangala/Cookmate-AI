from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.project_link import ProjectShareLink
from app.schemas.portal import (
    PortalProjectResponse,
    PortalConversationItem,
    PortalMessageItem,
    PortalMessageCreate,
)
from app.services.followup_engine import sync_followups

router = APIRouter(prefix="/portal", tags=["Client Portal"])


def _get_active_share_link(token: str, db: Session) -> ProjectShareLink:
    """Verifies that the share token exists and is not revoked."""
    link = db.query(ProjectShareLink).filter(ProjectShareLink.token == token).first()
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid, expired, or non-existent client communication link.",
        )
    if not link.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This client communication link has been revoked by the project team. Please request an updated link from your account representative.",
        )
    return link


@router.get("/{token}", response_model=PortalProjectResponse)
def get_portal_project(token: str, db: Session = Depends(get_db)):
    """
    Public portal endpoint: Fetch project details and conversation threads
    using only the secure, unguessable project share token.
    Internal employee notes, AI analyses, and team secrets are strictly omitted.
    """
    link = _get_active_share_link(token, db)

    # Touch last_accessed_at timestamp
    link.last_accessed_at = datetime.utcnow()
    db.commit()

    project = link.project
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked project could not be found.",
        )

    client = project.client

    # Fetch conversations belonging to this project
    conversations = (
        db.query(Conversation)
        .filter(Conversation.project_id == project.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    # If no conversation exists yet for this project, create a default portal thread
    if not conversations:
        default_conv = Conversation(
            client_id=client.id,
            project_id=project.id,
            subject=f"{project.title} - Client Updates & Discussion",
            channel="portal",
            status="open",
        )
        db.add(default_conv)
        db.commit()
        db.refresh(default_conv)
        conversations = [default_conv]

    conv_items: List[PortalConversationItem] = []
    for conv in conversations:
        # Sort messages chronologically
        sorted_messages = sorted(conv.messages or [], key=lambda m: m.sent_at)
        msg_items = [
            PortalMessageItem(
                id=m.id,
                sender_type=m.sender_type,
                sender_name=m.sender_name,
                content=m.content,
                sent_at=m.sent_at,
            )
            for m in sorted_messages
        ]
        conv_items.append(
            PortalConversationItem(
                id=conv.id,
                subject=conv.subject,
                channel=conv.channel,
                status=conv.status,
                updated_at=conv.updated_at,
                messages=msg_items,
            )
        )

    return PortalProjectResponse(
        project_id=project.id,
        project_title=project.title,
        project_description=project.description,
        client_name=client.name,
        client_company=client.company,
        token=link.token,
        is_active=link.is_active,
        conversations=conv_items,
    )


@router.post("/{token}/messages", response_model=PortalMessageItem, status_code=status.HTTP_201_CREATED)
def post_portal_message(
    token: str,
    payload: PortalMessageCreate,
    db: Session = Depends(get_db),
):
    """
    Public portal endpoint: Submit a client message to a project conversation.
    Records the message with sender_type='client', touches conversation updated_at,
    and immediately reevaluates pending actions in the deterministic follow-up engine.
    """
    link = _get_active_share_link(token, db)
    project = link.project
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated project not found.",
        )

    client = project.client

    # Resolve target conversation within this project
    conversation = None
    if payload.conversation_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.id == payload.conversation_id)
            .first()
        )
        if not conversation or conversation.project_id != project.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The specified conversation does not belong to this project.",
            )
    else:
        # Select active conversation or create one
        conversation = (
            db.query(Conversation)
            .filter(Conversation.project_id == project.id, Conversation.status == "open")
            .order_by(Conversation.updated_at.desc())
            .first()
        )
        if not conversation:
            conversation = Conversation(
                client_id=client.id,
                project_id=project.id,
                subject=f"{project.title} - Communication",
                channel="portal",
                status="open",
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

    # Record incoming client message
    sender_name = (payload.sender_name.strip() if payload.sender_name else "") or client.name
    now_utc = datetime.utcnow()

    new_msg = Message(
        conversation_id=conversation.id,
        sender_type="client",
        sender_name=sender_name,
        content=payload.content.strip(),
        sent_at=now_utc,
    )
    db.add(new_msg)

    # Touch conversation timestamp
    conversation.updated_at = now_utc
    db.commit()
    db.refresh(new_msg)

    # Reevaluate deterministic follow-ups and pending actions
    sync_followups(db)

    return PortalMessageItem(
        id=new_msg.id,
        sender_type=new_msg.sender_type,
        sender_name=new_msg.sender_name,
        content=new_msg.content,
        sent_at=new_msg.sent_at,
    )
