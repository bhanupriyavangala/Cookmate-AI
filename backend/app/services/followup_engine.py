from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from app.config import settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.followup import FollowUp


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware UTC for accurate time delta math."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def calculate_waiting_time(sent_at: datetime, now: Optional[datetime] = None) -> float:
    """
    Calculates waiting time in fractional days between sent_at and now.
    Example: 48 hours = 2.0 days.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = ensure_utc(now)
    sent_utc = ensure_utc(sent_at)

    delta = now_utc - sent_utc
    total_seconds = max(0.0, delta.total_seconds())
    return round(total_seconds / 86400.0, 2)


def determine_priority_and_status(
    days_waiting: float,
    is_escalated: bool = False,
    snoozed_until: Optional[datetime] = None,
    now: Optional[datetime] = None,
    due_threshold: Optional[float] = None,
    overdue_threshold: Optional[float] = None,
    escalation_threshold: Optional[float] = None,
) -> Tuple[str, str]:
    """
    Deterministic rule engine calculating (status, priority).
    Configurable thresholds:
      - days_waiting >= 7.0: escalated / urgent
      - days_waiting >= 5.0: overdue / high
      - days_waiting >= 2.0: due / medium
      - days_waiting < 2.0: pending / low
    Snooze condition:
      - if snoozed_until > now: snoozed / low
    """
    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = ensure_utc(now)
    snooze_utc = ensure_utc(snoozed_until)

    due_th = due_threshold if due_threshold is not None else settings.FOLLOWUP_DUE_THRESHOLD_DAYS
    overdue_th = overdue_threshold if overdue_threshold is not None else settings.FOLLOWUP_OVERDUE_THRESHOLD_DAYS
    escalate_th = escalation_threshold if escalation_threshold is not None else settings.FOLLOWUP_ESCALATION_THRESHOLD_DAYS

    # If actively snoozed, suppress priority and mark snoozed
    if snooze_utc and snooze_utc > now_utc:
        return ("snoozed", "low")

    # If explicitly flagged for escalation or waiting time exceeds escalation threshold
    if is_escalated or days_waiting >= escalate_th:
        return ("escalated", "urgent")

    # If waiting time exceeds overdue threshold
    if days_waiting >= overdue_th:
        return ("overdue", "high")

    # If waiting time exceeds recommended follow-up threshold
    if days_waiting >= due_th:
        return ("due", "medium")

    return ("pending", "low")


def evaluate_conversation_needs_response(conversation: Conversation) -> Tuple[bool, Optional[Message]]:
    """
    Evaluates whether a conversation deterministically requires an employee response.
    Rules:
      1. Closed conversations DO NOT require a response.
      2. Conversations with no messages DO NOT require a response.
      3. If the last message was sent by 'team' or 'system', the team already answered -> NO response needed.
      4. If the last message was sent by 'client', a response IS required -> returns (True, last_message).
    """
    if conversation.status == "closed":
        return (False, None)

    if not conversation.messages or len(conversation.messages) == 0:
        return (False, None)

    # Sort messages chronologically by sent_at
    sorted_messages = sorted(conversation.messages, key=lambda m: m.sent_at)
    last_message = sorted_messages[-1]

    if last_message.sender_type != "client":
        return (False, None)

    return (True, last_message)


def sync_followups(db: Session, now: Optional[datetime] = None) -> List[FollowUp]:
    """
    Synchronizes all conversations into deterministic FollowUp records.
    - Accurately creates or updates follow-ups for conversations needing responses.
    - Marks follow-ups as 'completed' if the conversation is closed or answered by team.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    conversations = db.query(Conversation).all()
    followups = []

    for conv in conversations:
        needs_response, last_client_msg = evaluate_conversation_needs_response(conv)
        existing = db.query(FollowUp).filter(FollowUp.conversation_id == conv.id).first()

        if needs_response and last_client_msg:
            days = calculate_waiting_time(last_client_msg.sent_at, now=now)
            is_esc = existing.is_escalated if existing else False
            snooze_until = existing.snoozed_until if existing else None
            esc_reason = existing.escalation_reason if existing else None

            # If it was previously marked completed, but client sent a new message, reopen it!
            new_status, new_priority = determine_priority_and_status(
                days_waiting=days,
                is_escalated=is_esc,
                snoozed_until=snooze_until,
                now=now,
            )

            if existing:
                existing.status = new_status
                existing.priority = new_priority
                existing.days_waiting = days
                existing.last_client_message_at = last_client_msg.sent_at
                existing.last_message_content = last_client_msg.content[:200]
                followup_record = existing
            else:
                followup_record = FollowUp(
                    conversation_id=conv.id,
                    client_id=conv.client_id,
                    project_id=conv.project_id,
                    status=new_status,
                    priority=new_priority,
                    days_waiting=days,
                    last_client_message_at=last_client_msg.sent_at,
                    last_message_content=last_client_msg.content[:200],
                    is_escalated=is_esc,
                    escalation_reason=esc_reason,
                )
                db.add(followup_record)
            followups.append(followup_record)

        elif existing and existing.status != "completed":
            # Conversation is either closed or was answered by team -> mark follow-up as completed
            existing.status = "completed"
            existing.days_waiting = 0.0

    db.commit()
    return followups


def snooze_followup(db: Session, followup_id: int, days: float = 1.0, now: Optional[datetime] = None) -> FollowUp:
    """Snoozes a follow-up item for N days."""
    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = ensure_utc(now)

    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise ValueError(f"FollowUp with id {followup_id} not found.")

    followup.snoozed_until = now_utc + timedelta(days=days)
    followup.status = "snoozed"
    followup.priority = "low"
    db.commit()
    db.refresh(followup)
    return followup


def complete_followup(db: Session, followup_id: int) -> FollowUp:
    """Marks a follow-up item as completed."""
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise ValueError(f"FollowUp with id {followup_id} not found.")

    followup.status = "completed"
    db.commit()
    db.refresh(followup)
    return followup


def escalate_followup(db: Session, followup_id: int, reason: Optional[str] = None) -> FollowUp:
    """Escalates a follow-up item."""
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise ValueError(f"FollowUp with id {followup_id} not found.")

    followup.is_escalated = True
    followup.escalation_reason = reason or "Flagged by employee for urgent manager review."
    followup.status = "escalated"
    followup.priority = "urgent"
    followup.snoozed_until = None  # Cancel any snooze when escalated
    db.commit()
    db.refresh(followup)
    return followup
