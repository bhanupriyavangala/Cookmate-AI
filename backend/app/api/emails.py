import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.config import settings
from app.models.email_message import EmailMessage
from app.models.contact import Contact
from app.models.client import Client
from app.models.project import Project
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp
from app.schemas.email import (
    EmailSendRequest,
    EmailRead,
    EmailDraftRequest,
    EmailDraftResponse,
    EmailWebhookPayload,
)
from app.services.email.factory import get_email_provider
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/emails", tags=["Emails"])


def _format_email_read(email: EmailMessage) -> EmailRead:
    """Helper to convert EmailMessage model to EmailRead schema with enriched relationship names."""
    contact_name = email.contact.name if email.contact else email.recipient_name
    client_name = email.client.name if email.client else None
    project_title = email.project.title if email.project else None

    return EmailRead(
        id=email.id,
        contact_id=email.contact_id,
        client_id=email.client_id,
        project_id=email.project_id,
        recipient_email=email.recipient_email,
        recipient_name=email.recipient_name,
        sender_email=email.sender_email,
        subject=email.subject,
        body_text=email.body_text,
        body_html=email.body_html,
        status=email.status,
        direction=email.direction,
        provider=email.provider,
        provider_message_id=email.provider_message_id,
        idempotency_key=email.idempotency_key,
        error_details=email.error_details,
        ai_drafted=email.ai_drafted,
        sent_at=email.sent_at,
        created_at=email.created_at,
        updated_at=email.updated_at,
        contact_name=contact_name,
        client_name=client_name,
        project_title=project_title,
    )


# ============================================================================
# 1. Send Email (Backend Email Sending Through Provider Only)
# ============================================================================
@router.post("/send", response_model=EmailRead, status_code=status.HTTP_201_CREATED)
def send_email(
    payload: EmailSendRequest,
    db: Session = Depends(get_db),
):
    """
    Dispatches an email to a contact via the configured backend provider (Mock, SMTP, or Resend).
    Prevents duplicate sends, enforces recipient validation and consent status, and records message history.
    """
    recipient_email = payload.recipient_email.strip().lower()
    subject = payload.subject.strip()
    body_text = payload.body_text.strip()

    # 1. Verify Contact & Consent
    contact: Optional[Contact] = None
    client_id = payload.client_id
    project_id = payload.project_id
    recipient_name = payload.recipient_name

    if payload.contact_id:
        contact = db.query(Contact).filter(Contact.id == payload.contact_id).first()
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with ID {payload.contact_id} not found."
            )
        # Prefill metadata from contact if not supplied
        recipient_name = recipient_name or contact.name
        client_id = client_id or contact.client_id
        project_id = project_id or contact.project_id

        # Consent status check
        if contact.consent_status == "opted_out" and not payload.force_send:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Recipient '{contact.name}' ({recipient_email}) has opted out of communication. "
                    "Sending to this contact requires explicit confirmation (force_send=True)."
                ),
            )

    # 2. Duplicate Prevention: Idempotency Key
    if payload.idempotency_key:
        existing_by_key = (
            db.query(EmailMessage)
            .filter(EmailMessage.idempotency_key == payload.idempotency_key)
            .first()
        )
        if existing_by_key:
            logger.info(
                f"[EmailService] Idempotent send requested (key={payload.idempotency_key}). "
                f"Returning existing record ID={existing_by_key.id}."
            )
            return _format_email_read(existing_by_key)

    # 3. Duplicate Prevention: Rapid Repeat Detection (within last 60 seconds)
    if not payload.force_send:
        sixty_secs_ago = datetime.utcnow() - timedelta(seconds=60)
        recent_duplicate = (
            db.query(EmailMessage)
            .filter(
                EmailMessage.recipient_email == recipient_email,
                EmailMessage.subject == subject,
                EmailMessage.body_text == body_text,
                EmailMessage.direction == "outbound",
                EmailMessage.status == "sent",
                EmailMessage.created_at >= sixty_secs_ago,
            )
            .first()
        )
        if recent_duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Duplicate email detected: an identical message was already sent to this recipient "
                    "in the last 60 seconds. Please wait before retrying."
                ),
            )

    # 4. Dispatch Email via Provider Abstraction
    provider = get_email_provider()
    sender_email = settings.EMAIL_FROM

    send_result = provider.send_email(
        to_email=recipient_email,
        subject=subject,
        body_text=body_text,
        body_html=payload.body_html,
        sender_email=sender_email,
        reply_to=settings.EMAIL_REPLY_TO,
    )

    # 5. Persist Email Record (Without Sensitive Secrets)
    email_record = EmailMessage(
        contact_id=payload.contact_id,
        client_id=client_id,
        project_id=project_id,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        sender_email=sender_email,
        subject=subject,
        body_text=body_text,
        body_html=payload.body_html,
        status=send_result.status,
        direction="outbound",
        provider=send_result.provider,
        provider_message_id=send_result.provider_message_id,
        idempotency_key=payload.idempotency_key,
        error_details=send_result.error_message,
        ai_drafted=payload.ai_drafted,
        sent_at=datetime.utcnow() if send_result.success else None,
    )

    db.add(email_record)
    db.commit()
    db.refresh(email_record)

    # If provider reported a critical failure, report it clearly
    if not send_result.success:
        logger.error(
            f"[EmailService] Provider failure logged for Email ID={email_record.id}: {send_result.error_message}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Email provider delivery failed: {send_result.error_message}",
        )

    return _format_email_read(email_record)


# ============================================================================
# 2. Email History / Logs
# ============================================================================
@router.get("", response_model=List[EmailRead])
def list_emails(
    contact_id: Optional[int] = Query(None, description="Filter by contact ID"),
    client_id: Optional[int] = Query(None, description="Filter by client ID"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status ('sent', 'failed', 'received')"),
    direction: Optional[str] = Query(None, description="Filter by direction ('outbound', 'inbound')"),
    search: Optional[str] = Query(None, description="Search recipient, sender, or subject"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieves email communication history with filtering and search."""
    query = db.query(EmailMessage)

    if contact_id:
        query = query.filter(EmailMessage.contact_id == contact_id)
    if client_id:
        query = query.filter(EmailMessage.client_id == client_id)
    if project_id:
        query = query.filter(EmailMessage.project_id == project_id)
    if status:
        query = query.filter(EmailMessage.status == status)
    if direction:
        query = query.filter(EmailMessage.direction == direction)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(EmailMessage.recipient_email).like(term)
            | func.lower(EmailMessage.recipient_name).like(term)
            | func.lower(EmailMessage.subject).like(term)
        )

    emails = query.order_by(desc(EmailMessage.created_at)).limit(limit).all()
    return [_format_email_read(e) for e in emails]


@router.get("/{email_id}", response_model=EmailRead)
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
):
    """Retrieves full details for a single email record."""
    email = db.query(EmailMessage).filter(EmailMessage.id == email_id).first()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email record with ID {email_id} not found."
        )
    return _format_email_read(email)


# ============================================================================
# 3. AI-Generated Email Draft Follow-Up
# ============================================================================
@router.post("/draft", response_model=EmailDraftResponse)
def generate_email_draft(
    payload: EmailDraftRequest,
    db: Session = Depends(get_db),
):
    """
    Generates a personalized email follow-up draft using Gemini AI (with local fallback).
    Draft is returned for employee preview, editing, and approval before sending.
    """
    contact = db.query(Contact).filter(Contact.id == payload.contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID {payload.contact_id} not found."
        )

    project: Optional[Project] = None
    if payload.project_id:
        project = db.query(Project).filter(Project.id == payload.project_id).first()
    elif contact.project_id:
        project = db.query(Project).filter(Project.id == contact.project_id).first()

    tone = payload.tone or "professional"
    draft = gemini_service.generate_contact_email_draft(
        contact=contact,
        project=project,
        tone=tone,
        instructions=payload.instructions,
    )
    return draft


# ============================================================================
# 4. Verified Inbound Webhook (Reply Synchronization)
# ============================================================================
webhook_router = APIRouter(prefix="/emails", tags=["Emails Webhook"])


@webhook_router.post("/webhook", status_code=status.HTTP_200_OK)
def handle_email_webhook(
    payload: EmailWebhookPayload,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: Session = Depends(get_db),
):
    """
    Verified inbound webhook receiving client email replies from provider.
    Associates replies with existing contacts and projects, and updates communication tracking.
    """
    # 1. Webhook Signature / Secret Verification
    expected_secret = settings.EMAIL_WEBHOOK_SECRET
    if expected_secret:
        if not x_webhook_secret or x_webhook_secret != expected_secret:
            logger.warning("[EmailWebhook] Unauthorized webhook attempt: secret mismatch or missing.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized: invalid or missing X-Webhook-Secret.",
            )

    sender_email = payload.from_email.strip().lower()

    # 2. Match Inbound Sender with Contact
    contact = (
        db.query(Contact)
        .filter(func.lower(Contact.email) == sender_email)
        .first()
    )

    contact_id = contact.id if contact else None
    client_id = contact.client_id if contact else None
    project_id = contact.project_id if contact else None
    recipient_name = contact.name if contact else None

    # 3. Record Inbound Message
    inbound_record = EmailMessage(
        contact_id=contact_id,
        client_id=client_id,
        project_id=project_id,
        recipient_email=payload.to_email or settings.EMAIL_FROM,
        recipient_name="ClientPulse AI Team",
        sender_email=sender_email,
        subject=payload.subject,
        body_text=payload.text,
        body_html=payload.html,
        status="received",
        direction="inbound",
        provider="webhook",
        provider_message_id=payload.provider_message_id,
        sent_at=datetime.utcnow(),
    )
    db.add(inbound_record)

    # 4. If linked to an ongoing conversation or project, record message and update waiting status
    if client_id:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.client_id == client_id)
            .order_by(desc(Conversation.updated_at))
            .first()
        )
        if conversation:
            client_msg = Message(
                conversation_id=conversation.id,
                sender_type="client",
                sender_name=recipient_name or sender_email,
                content=payload.text,
                sent_at=datetime.utcnow(),
            )
            db.add(client_msg)
            conversation.updated_at = datetime.utcnow()

            # Automatically resolve pending employee follow-ups for this conversation
            pending_followup = (
                db.query(FollowUp)
                .filter(FollowUp.conversation_id == conversation.id, FollowUp.status == "pending")
                .first()
            )
            if pending_followup:
                pending_followup.status = "completed"
                pending_followup.notes = f"Client replied via email: '{payload.subject}'"

    db.commit()
    db.refresh(inbound_record)

    logger.info(
        f"[EmailWebhook] Successfully processed inbound email from {sender_email} "
        f"(Contact: {recipient_name or 'Unmatched'}, Email ID={inbound_record.id})"
    )

    return {
        "status": "processed",
        "email_id": inbound_record.id,
        "matched_contact": recipient_name,
        "matched_contact_id": contact_id,
        "direction": "inbound",
    }
