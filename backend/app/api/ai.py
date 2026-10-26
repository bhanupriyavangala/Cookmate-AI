from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.schemas.ai import (
    ConversationAnalysisResponse,
    FollowUpGenerationRequest,
    GeneratedFollowUpResponse,
    SendGeneratedMessageRequest,
)
from app.services.gemini_service import gemini_service
from app.services.followup_engine import complete_followup

router = APIRouter(prefix="/ai", tags=["Gemini AI Assistant"])


@router.post("/conversations/{conversation_id}/analyze", response_model=ConversationAnalysisResponse)
def analyze_conversation_endpoint(conversation_id: int, db: Session = Depends(get_db)):
    """
    Feature 1: Conversation Analysis
    Identifies pending action, who needs to respond, whether response is required,
    priority, possible project impact, and recommended next action.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found."
        )

    analysis = gemini_service.analyze_conversation(conv)
    return analysis


@router.post("/conversations/{conversation_id}/generate-followup", response_model=GeneratedFollowUpResponse)
def generate_followup_endpoint(
    conversation_id: int,
    req: FollowUpGenerationRequest,
    db: Session = Depends(get_db),
):
    """
    Feature 2: Follow-up Generation
    Generates a personalized, context-aware message draft using relevant thread history.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found."
        )

    draft = gemini_service.generate_followup(
        conv,
        tone=req.tone or "professional",
        instructions=req.instructions
    )
    return draft


@router.post("/conversations/{conversation_id}/send-generated", status_code=status.HTTP_201_CREATED)
def mark_generated_as_sent_endpoint(
    conversation_id: int,
    send_req: SendGeneratedMessageRequest,
    db: Session = Depends(get_db),
):
    """
    Records reviewed and edited AI follow-up message into the conversation log and resolves follow-up item.
    (Simulates sending without actual external email/SMS dispatch).
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found."
        )

    now = datetime.now(timezone.utc)

    # 1. Store message in conversation
    msg = Message(
        conversation_id=conversation_id,
        sender_type="team",
        sender_name=send_req.sender_name or "ClientPulse Support",
        content=send_req.content.strip(),
        sent_at=now,
    )
    db.add(msg)

    # Touch conversation updated timestamp
    conv.updated_at = now

    # 2. Mark follow-up as completed if one exists
    followup = db.query(FollowUp).filter(FollowUp.conversation_id == conversation_id).first()
    if followup:
        followup.status = "completed"
        followup.days_waiting = 0.0

    db.commit()
    db.refresh(msg)

    return {
        "status": "sent",
        "message_id": msg.id,
        "conversation_id": conversation_id,
        "followup_status": followup.status if followup else "none",
        "message": "Follow-up message recorded in conversation thread and follow-up marked as completed.",
        "sent_at": msg.sent_at,
    }
