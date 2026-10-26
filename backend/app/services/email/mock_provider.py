import uuid
import logging
from typing import Optional, Dict
from app.services.email.base import BaseEmailProvider, EmailSendResult

logger = logging.getLogger(__name__)


class MockEmailProvider(BaseEmailProvider):
    """
    Simulated email provider for local development, demo environments, and automated testing.
    Outputs delivery metadata to application logs without sending real external emails.
    """

    name: str = "mock"

    def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
        sender_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> EmailSendResult:
        # Check for simulated error trigger for testing error handling
        if "simulate_error" in to_email.lower() or "fail" in to_email.lower():
            logger.warning(
                f"[MockEmailProvider] Simulated email failure triggered for {to_email}"
            )
            return EmailSendResult(
                success=False,
                provider=self.name,
                status="failed",
                error_message=f"Simulated provider failure: Destination mailbox {to_email} temporarily unavailable (550).",
            )

        provider_msg_id = f"mock_msg_{uuid.uuid4().hex[:12]}"
        logger.info(
            f"[MockEmailProvider] Simulated email sent successfully to {to_email} | "
            f"Subject: '{subject}' | MessageID: {provider_msg_id}"
        )

        return EmailSendResult(
            success=True,
            provider_message_id=provider_msg_id,
            provider=self.name,
            status="sent",
            error_message=None,
        )
