from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.client import Client
from app.models.project import Project
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationRead,
    ConversationDetail,
)
from app.schemas.message import MessageCreate, MessageRead

router = APIRouter(prefix="/conversations", tags=["Conversations & Messages"])


def _format_conversation(conv: Conversation) -> ConversationRead:
    last_msg = conv.messages[-1] if conv.messages else None
    return ConversationRead(
        id=conv.id,
        client_id=conv.client_id,
        client_name=conv.client.name if conv.client else None,
        project_id=conv.project_id,
        project_title=conv.project.title if conv.project else None,
        subject=conv.subject,
        channel=conv.channel,
        status=conv.status,
        messages_count=len(conv.messages),
        last_message_preview=last_msg.content[:100] if last_msg else None,
        last_message_at=last_msg.sent_at if last_msg else conv.updated_at,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


def _format_message(msg: Message) -> MessageRead:
    return MessageRead(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_type=msg.sender_type,
        sender_name=msg.sender_name,
        content=msg.content,
        sent_at=msg.sent_at,
        created_at=msg.created_at,
    )


@router.get("", response_model=List[ConversationRead])
def list_conversations(
    client_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """List conversations with optional client/project/status filtering."""
    query = db.query(Conversation)

    if client_id is not None:
        query = query.filter(Conversation.client_id == client_id)

    if project_id is not None:
        query = query.filter(Conversation.project_id == project_id)

    if status_filter:
        query = query.filter(Conversation.status == status_filter)

    conversations = query.order_by(Conversation.updated_at.desc()).all()
    return [_format_conversation(c) for c in conversations]


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
def create_conversation(conv_in: ConversationCreate, db: Session = Depends(get_db)):
    """Start a new conversation thread with optional initial message."""
    client = db.query(Client).filter(Client.id == conv_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot start conversation: Client with id {conv_in.client_id} does not exist.",
        )

    if conv_in.project_id:
        project = db.query(Project).filter(Project.id == conv_in.project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {conv_in.project_id} does not exist.",
            )

    conversation = Conversation(
        client_id=conv_in.client_id,
        project_id=conv_in.project_id,
        subject=conv_in.subject,
        channel=conv_in.channel or "email",
        status=conv_in.status or "open",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    # If an opening message was provided, store it
    if conv_in.initial_message and conv_in.initial_message.strip():
        msg = Message(
            conversation_id=conversation.id,
            sender_type="client",
            sender_name=client.name,
            content=conv_in.initial_message.strip(),
            sent_at=datetime.now(timezone.utc),
        )
        db.add(msg)
        db.commit()
        db.refresh(conversation)

    base = _format_conversation(conversation)
    return ConversationDetail(
        **base.model_dump(),
        messages=[_format_message(m) for m in conversation.messages],
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Retrieve conversation details including all chronologically ordered messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )

    base = _format_conversation(conv)
    return ConversationDetail(
        **base.model_dump(),
        messages=[_format_message(m) for m in conv.messages],
    )


@router.put("/{conversation_id}", response_model=ConversationRead)
def update_conversation(
    conversation_id: int,
    conv_in: ConversationUpdate,
    db: Session = Depends(get_db),
):
    """Update conversation topic, channel, or status."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )

    update_data = conv_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(conv, field, value)

    db.commit()
    db.refresh(conv)
    return _format_conversation(conv)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Delete a conversation and all its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )
    db.delete(conv)
    db.commit()
    return None


@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
def list_messages(conversation_id: int, db: Session = Depends(get_db)):
    """List all messages in a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )
    return [_format_message(m) for m in conv.messages]


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def post_message(
    conversation_id: int,
    message_in: MessageCreate,
    db: Session = Depends(get_db),
):
    """Send and record a message within a conversation."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot add message: Conversation with id {conversation_id} not found.",
        )

    msg = Message(
        conversation_id=conversation_id,
        sender_type=message_in.sender_type,
        sender_name=message_in.sender_name,
        content=message_in.content,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(msg)

    # Touch conversation updated_at
    conv.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(msg)
    return _format_message(msg)
