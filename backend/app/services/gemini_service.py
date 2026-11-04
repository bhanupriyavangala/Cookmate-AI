import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.config import settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.client import Client
from app.models.project import Project
from app.models.contact import Contact
from app.schemas.ai import ConversationAnalysisResponse, GeneratedFollowUpResponse
from app.schemas.email import EmailDraftResponse

logger = logging.getLogger(__name__)


class GeminiService:
    """Backend-only service interfacing with Google Gemini API with robust validation and local fallback."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        # For testing: optional mock hook
        self._mock_caller = None

    def _call_gemini_api(self, prompt: str, as_json: bool = True) -> str:
        """Invokes Gemini REST API. Can be overridden in tests via self._mock_caller."""
        if self._mock_caller is not None:
            return self._mock_caller(prompt, as_json)

        if not self.api_key or self.api_key.strip() in ("", "your_gemini_api_key_here"):
            raise ValueError("GEMINI_API_KEY is not configured in environment.")

        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload: Dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        if as_json:
            payload["generationConfig"] = {
                "responseMimeType": "application/json"
            }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=12) as response:
            result = json.loads(response.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if not candidates:
                raise RuntimeError("No candidate responses returned by Gemini API.")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise RuntimeError("Candidate content is empty.")
            return parts[0].get("text", "")

    def _build_conversation_context(self, conv: Conversation) -> str:
        client = conv.client
        project = conv.project
        messages = sorted(conv.messages, key=lambda m: m.sent_at) if conv.messages else []

        context_lines = [
            f"Conversation ID: {conv.id}",
            f"Subject: {conv.subject}",
            f"Channel: {conv.channel}",
            f"Status: {conv.status}",
            f"Client Name: {client.name if client else 'Unknown'}",
            f"Client Company: {client.company if client and client.company else 'N/A'}",
            f"Project: {project.title if project else 'None linked'}",
            f"Project Description: {project.description if project and project.description else 'N/A'}",
            "\n--- Message History (Chronological) ---",
        ]

        for m in messages:
            sent_str = m.sent_at.strftime("%Y-%m-%d %H:%M:%S") if m.sent_at else "Unknown"
            context_lines.append(f"[{m.sender_type.upper()}] {m.sender_name} ({sent_str}): {m.content}")

        return "\n".join(context_lines)

    def analyze_conversation(self, conv: Conversation) -> ConversationAnalysisResponse:
        """
        Feature 1: Conversation Analysis
        Understands what action is pending, who is expected to respond,
        what the client was asked to provide, expected response date,
        whether the client has completed the requested action,
        priority, and recommended next action.
        """
        conv_context = self._build_conversation_context(conv)

        prompt = f"""You are an expert SaaS client communication manager. Analyze this conversation thread and output pure JSON matching this exact structure:
{{
  "pending_action": "<concise sentence describing the pending deliverable or question>",
  "who_needs_to_respond": "<'team' or 'client' or 'none'>",
  "response_required": <true or false>,
  "client_action_completed": <true if client has provided the requested confirmation/deliverable, false otherwise>,
  "expected_response_date": "<estimated date or timeframe e.g. 'Within 48 hours' or specific ISO date if discussed>",
  "client_was_asked_to_provide": "<specific requirements, signoff, file, or decision requested from client>",
  "priority": "<'low' or 'medium' or 'high' or 'urgent'>",
  "possible_project_impact": "<explanation of how this affects budget, timeline, or relationship>",
  "recommended_next_action": "<actionable recommendation for the employee>"
}}

Guidelines:
- CRITICAL BUSINESS LOGIC: When an employee sends a request/reminder to a client, the client owes a response. The follow-up is NOT completed merely because the employee sent a reminder.
- Mark client_action_completed as true ONLY when the client has genuinely provided the confirmation, sign-off, or deliverable requested.
- If the conversation is closed or deliverables are confirmed completed, response_required is false and who_needs_to_respond is 'none'.
- If the client sent the last message asking a question, who_needs_to_respond is 'team'.
- If the team sent a request and client has not replied, who_needs_to_respond is 'client'.

Conversation to analyze:
{conv_context}
"""
        try:
            raw_response = self._call_gemini_api(prompt, as_json=True)
            # Clean possible markdown fence
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())

            # Validate against Pydantic schema
            validated = ConversationAnalysisResponse(
                conversation_id=conv.id,
                pending_action=str(parsed.get("pending_action", "Address client inquiry")),
                who_needs_to_respond=parsed.get("who_needs_to_respond", "team"),
                response_required=bool(parsed.get("response_required", True)),
                client_action_completed=bool(parsed.get("client_action_completed", False)),
                expected_response_date=parsed.get("expected_response_date", "Within 48 hours"),
                client_was_asked_to_provide=parsed.get("client_was_asked_to_provide", "Awaiting requested feedback or approval"),
                priority=parsed.get("priority", "medium"),
                possible_project_impact=str(parsed.get("possible_project_impact", "Routine project milestone communication")),
                recommended_next_action=str(parsed.get("recommended_next_action", "Review message and provide requested update")),
                ai_source="gemini",
                analysis_timestamp=datetime.now(timezone.utc),
            )
            return validated

        except Exception as exc:
            logger.warning(f"Gemini API analysis unavailable or failed ({exc}). Using high-fidelity local fallback.")
            return self._generate_fallback_analysis(conv)

    def _generate_fallback_analysis(self, conv: Conversation) -> ConversationAnalysisResponse:
        """Deterministic, context-aware analysis fallback when API key is unset or unreachable."""
        client_name = conv.client.name if conv.client else "Client"
        project_title = conv.project.title if conv.project else "General Engagement"
        messages = sorted(conv.messages, key=lambda m: m.sent_at) if conv.messages else []

        if conv.status == "closed":
            return ConversationAnalysisResponse(
                conversation_id=conv.id,
                pending_action="Thread concluded and archived.",
                who_needs_to_respond="none",
                response_required=False,
                client_action_completed=True,
                expected_response_date=None,
                client_was_asked_to_provide=None,
                priority="low",
                possible_project_impact="None. Deliverables have been received and signed off.",
                recommended_next_action="Archive conversation thread records for historical reference.",
                ai_source="local_fallback",
            )

        if not messages:
            return ConversationAnalysisResponse(
                conversation_id=conv.id,
                pending_action="Initiate initial outreach to client.",
                who_needs_to_respond="team",
                response_required=True,
                client_action_completed=False,
                expected_response_date="Within 24 hours",
                client_was_asked_to_provide="Kickoff requirements and project objectives",
                priority="medium",
                possible_project_impact="Client onboarding timeline pending kickoff outreach.",
                recommended_next_action=f"Draft welcome greeting and introductory agenda for {client_name}.",
                ai_source="local_fallback",
            )

        last_msg = messages[-1]

        # Scan recent messages to see if employee asked for deliverables
        team_messages = [m for m in messages if m.sender_type == "team"]
        last_team_msg = team_messages[-1] if team_messages else None

        if last_msg.sender_type != "client":
            # Team sent last message -> client owes a response!
            content_lower = last_msg.content.lower()
            asked_for = "Deliverable approval or feedback"
            if "confirm" in content_lower or "approve" in content_lower:
                asked_for = "Confirmation and sign-off on proposed deliverables"
            elif "invoice" in content_lower or "payment" in content_lower:
                asked_for = "Invoice payment confirmation"
            elif "provide" in content_lower or "send" in content_lower:
                asked_for = "Requested documentation or credentials"

            return ConversationAnalysisResponse(
                conversation_id=conv.id,
                pending_action=f"Awaiting response from {client_name} regarding '{last_msg.content[:80]}...'",
                who_needs_to_respond="client",
                response_required=True,
                client_action_completed=False,
                expected_response_date="Within 48 hours",
                client_was_asked_to_provide=asked_for,
                priority="medium",
                possible_project_impact=f"Project progress on {project_title} paused pending client response.",
                recommended_next_action=f"Follow up with {client_name} if no response within standard follow-up window.",
                ai_source="local_fallback",
            )

        # Client sent the last message!
        # Check if client message indicates completion of what was asked
        content_lower = last_msg.content.lower()
        completion_words = ["approved", "confirmed", "signed off", "here is the", "attached", "completed", "done", "agreed"]
        has_completed = any(w in content_lower for w in completion_words)

        is_urgent = any(w in content_lower for w in ["critical", "blocking", "error", "fail", "urgent", "asap"])
        is_high = any(w in content_lower for w in ["delay", "schedule", "deadline", "review", "confirm", "when"])

        priority = "urgent" if is_urgent else ("high" if is_high else "medium")

        if has_completed:
            return ConversationAnalysisResponse(
                conversation_id=conv.id,
                pending_action=f"Client confirmed deliverable: '{last_msg.content[:80]}...'",
                who_needs_to_respond="team",
                response_required=False,
                client_action_completed=True,
                expected_response_date=None,
                client_was_asked_to_provide="Confirmed by client in latest response",
                priority="low",
                possible_project_impact=f"Milestone requirements for {project_title} satisfied.",
                recommended_next_action="Acknowledge receipt and transition to next milestone phase.",
                ai_source="local_fallback",
            )

        return ConversationAnalysisResponse(
            conversation_id=conv.id,
            pending_action=f"Respond to {client_name}'s inquiry: '{last_msg.content[:80]}...'",
            who_needs_to_respond="team",
            response_required=True,
            client_action_completed=False,
            expected_response_date="Within 24 hours",
            client_was_asked_to_provide="Inquiry pending team clarification",
            priority=priority,
            possible_project_impact=f"Delivery milestones for {project_title} depend on unblocking client's inquiries promptly.",
            recommended_next_action=f"Draft technical follow-up answering {client_name}'s specific points and offer review walkthrough.",
            ai_source="local_fallback",
        )

    def generate_followup(
        self,
        conv: Conversation,
        tone: str = "professional",
        instructions: Optional[str] = None
    ) -> GeneratedFollowUpResponse:
        """
        Feature 2: Follow-up Generation
        Creates a tailored, professional response message using relevant conversation context.
        """
        conv_context = self._build_conversation_context(conv)

        prompt = f"""You are an executive client communications specialist. Draft a clear, courteous follow-up response for an employee to send to the client.
Output pure JSON matching this exact structure:
{{
  "subject": "<Re: subject line>",
  "message": "<the full email/message body draft, addressing the client by name and providing specific, helpful progress>",
  "recommended_tone": "{tone}",
  "confidence_score": 0.95
}}

Guidelines:
- Tone requested: {tone}
- Additional employee guidance: {instructions or 'None'}
- Include greeting, clear responses to the client's questions, next steps, and professional sign-off.
- Do NOT use markdown code fences in the output.

Conversation Context:
{conv_context}
"""
        try:
            raw_response = self._call_gemini_api(prompt, as_json=True)
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())

            validated = GeneratedFollowUpResponse(
                conversation_id=conv.id,
                subject=str(parsed.get("subject", f"Re: {conv.subject}")),
                message=str(parsed.get("message", "")),
                tone=tone,
                ai_source="gemini",
                confidence_score=float(parsed.get("confidence_score", 0.95)),
            )
            return validated

        except Exception as exc:
            logger.warning(f"Gemini API follow-up generation failed ({exc}). Using high-fidelity local fallback.")
            return self._generate_fallback_followup(conv, tone=tone, instructions=instructions)

    def _generate_fallback_followup(
        self,
        conv: Conversation,
        tone: str = "professional",
        instructions: Optional[str] = None
    ) -> GeneratedFollowUpResponse:
        """Deterministic, tailored follow-up draft generation fallback."""
        client_name = conv.client.name if conv.client else "there"
        project_title = conv.project.title if conv.project else "our engagement"
        messages = sorted(conv.messages, key=lambda m: m.sent_at) if conv.messages else []
        last_msg = messages[-1] if messages else None

        greeting = f"Hi {client_name}," if tone != "formal" else f"Dear {client_name},"

        body_paragraphs = []
        if last_msg and last_msg.sender_type == "client":
            body_paragraphs.append(
                f"Thank you for following up regarding our progress on {project_title}. "
                f"I reviewed your note regarding \"{last_msg.content[:90]}...\" and wanted to share an update."
            )
            body_paragraphs.append(
                "Our technical team has reviewed the requirements and verified that the deliverables are proceeding as planned. "
                "All items highlighted in your inquiry are being addressed to ensure full alignment with your timeline."
            )
        else:
            body_paragraphs.append(
                f"I am checking in to provide our scheduled status update on {project_title}. "
                "Our engineering milestones are progressing on schedule, and we are preparing the next milestone review."
            )

        if instructions and instructions.strip():
            body_paragraphs.append(f"Regarding your specific request: {instructions.strip()}")

        body_paragraphs.append(
            "Please let us know if you have any questions or if you would like to schedule a brief call this week to review everything together."
        )

        signoff = "Best regards,\nClientPulse Team"
        full_message = f"{greeting}\n\n" + "\n\n".join(body_paragraphs) + f"\n\n{signoff}"

        return GeneratedFollowUpResponse(
            conversation_id=conv.id,
            subject=f"Re: {conv.subject}",
            message=full_message,
            tone=tone,
            ai_source="local_fallback",
            confidence_score=0.92,
        )

    def generate_contact_email_draft(
        self,
        contact: Contact,
        project: Optional[Project] = None,
        tone: str = "professional",
        instructions: Optional[str] = None,
    ) -> EmailDraftResponse:
        """
        Generates an AI-drafted email follow-up tailored to a specific contact and project.
        Draft requires human employee review and approval before dispatch.
        """
        client_name = contact.client.name if contact.client else (contact.company or "our client")
        project_title = project.title if project else (contact.project.title if contact.project else "Ongoing Collaboration")

        prompt = f"""You are a client communications manager drafting an email to an executive stakeholder.
Output pure JSON matching this exact structure:
{{
  "subject": "<Subject line>",
  "body_text": "<Full email text addressing the contact by name, providing structured update/follow-up, and signing off>"
}}

Contact Information:
- Recipient Name: {contact.name}
- Recipient Company: {contact.company or client_name}
- Account: {client_name}
- Project: {project_title}
- Preferred Tone: {tone}
- Additional Guidance / Instructions: {instructions or 'Standard progress check-in'}

Guidelines:
- Maintain a {tone} tone.
- Do not output markdown code blocks or triple backticks.
- Be clear, actionable, and courteous.
"""
        try:
            raw_response = self._call_gemini_api(prompt, as_json=True)
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())

            return EmailDraftResponse(
                subject=str(parsed.get("subject", f"Update regarding {project_title}")),
                body_text=str(parsed.get("body_text", "")),
                tone=tone,
                ai_source="gemini",
            )
        except Exception as exc:
            logger.warning(f"Gemini API contact email drafting failed ({exc}). Using deterministic local fallback.")
            return self._generate_fallback_contact_email(
                contact=contact,
                project_title=project_title,
                tone=tone,
                instructions=instructions,
            )

    def _generate_fallback_contact_email(
        self,
        contact: Contact,
        project_title: str,
        tone: str = "professional",
        instructions: Optional[str] = None,
    ) -> EmailDraftResponse:
        """Deterministic fallback draft when Gemini is not configured or offline."""
        contact_first_name = contact.name.split()[0] if contact.name else "there"
        company_name = contact.company or (contact.client.name if contact.client else "your team")

        if tone == "friendly":
            greeting = f"Hi {contact_first_name},"
            signoff = "Warm regards,\nClientPulse Team"
            subject = f"Quick check-in on {project_title}"
        elif tone == "urgent":
            greeting = f"Dear {contact.name},"
            signoff = "Sincerely,\nClientPulse Team"
            subject = f"Urgent: Action required for {project_title}"
        elif tone == "concise":
            greeting = f"Hi {contact_first_name},"
            signoff = "Thanks,\nClientPulse Team"
            subject = f"Status summary: {project_title}"
        else:  # professional
            greeting = f"Dear {contact.name},"
            signoff = "Best regards,\nClientPulse Team"
            subject = f"Follow-up: {project_title} progress update"

        body_parts = [
            f"{greeting}",
            f"I hope this note finds you well at {company_name}.",
            f"I am writing to share a brief update regarding our progress on {project_title}.",
        ]

        if instructions and instructions.strip():
            body_parts.append(f"Regarding recent priorities: {instructions.strip()}")
        else:
            body_parts.append(
                "Our team has completed the recent milestone requirements and is tracking smoothly "
                "toward the upcoming deliverable schedule."
            )

        body_parts.append(
            "Please review this update at your convenience and let us know if you need any adjustments "
            "or have questions we can address."
        )
        body_parts.append(signoff)

        return EmailDraftResponse(
            subject=subject,
            body_text="\n\n".join(body_parts),
            tone=tone,
            ai_source="local_fallback",
        )


gemini_service = GeminiService()
