import logging
from typing import Optional
from app.config import settings
from app.services.email.base import BaseEmailProvider
from app.services.email.mock_provider import MockEmailProvider
from app.services.email.smtp_provider import SMTPEmailProvider
from app.services.email.resend_provider import ResendEmailProvider

logger = logging.getLogger(__name__)


def get_email_provider(override_provider: Optional[str] = None) -> BaseEmailProvider:
    """
    Factory function returning the configured email provider.
    If credentials or settings are missing, gracefully defaults to MockEmailProvider with a log warning.
    """
    provider_type = (override_provider or settings.EMAIL_PROVIDER or "mock").strip().lower()

    if provider_type == "smtp":
        if not settings.SMTP_HOST:
            logger.warning(
                "[EmailService] EMAIL_PROVIDER is set to 'smtp' but SMTP_HOST is not configured. "
                "Safely falling back to MockEmailProvider."
            )
            return MockEmailProvider()

        return SMTPEmailProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
            default_from=settings.EMAIL_FROM,
        )

    elif provider_type == "resend":
        if not settings.RESEND_API_KEY or "your_resend_api_key" in settings.RESEND_API_KEY:
            logger.warning(
                "[EmailService] EMAIL_PROVIDER is set to 'resend' but RESEND_API_KEY is missing or placeholder. "
                "Safely falling back to MockEmailProvider."
            )
            return MockEmailProvider()

        return ResendEmailProvider(
            api_key=settings.RESEND_API_KEY,
            default_from=settings.EMAIL_FROM,
        )

    # Default to MockEmailProvider
    return MockEmailProvider()
