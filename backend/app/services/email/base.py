import abc
from dataclasses import dataclass
from typing import Optional, Dict


@dataclass
class EmailSendResult:
    """Standardized result returned by all email provider implementations."""
    success: bool
    provider_message_id: Optional[str] = None
    provider: str = "mock"
    status: str = "sent"  # 'sent' or 'failed'
    error_message: Optional[str] = None


class BaseEmailProvider(abc.ABC):
    """Abstract email provider interface allowing interchangeable delivery backends."""

    name: str = "base"

    @abc.abstractmethod
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
        """
        Send an email via the underlying provider.
        Must never leak raw credentials or API secrets in logs or error messages.
        """
        pass
