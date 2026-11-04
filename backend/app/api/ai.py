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
    Records reviewed and approved AI follow-up message into the conversation log.
    Restarts the waiting period tracking for client response rather than falsely
    marking the follow-up completed before client responds.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found."
        )

    now = datetime.now(timezone.utc)

    # 1. Store message in conversation history
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

    # 2. Update follow-up record: reminder has been delivered, restart waiting window
    followup = db.query(FollowUp).filter(FollowUp.conversation_id == conversation_id).first()
    if followup:
        followup.days_waiting = 0.0
        followup.status = "pending"
        followup.priority = "low"
        followup.last_client_message_at = now
        followup.last_message_content = f"[Reminder sent]: {msg.content[:160]}"

    db.commit()
    db.refresh(msg)

    return {
        "status": "sent",
        "message_id": msg.id,
        "conversation_id": conversation_id,
        "followup_status": followup.status if followup else "pending",
        "message": "Follow-up reminder recorded into conversation history. Client waiting period reset.",
        "sent_at": msg.sent_at,
    }
