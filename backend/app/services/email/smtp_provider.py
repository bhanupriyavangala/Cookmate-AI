import smtplib
import uuid
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict
from app.services.email.base import BaseEmailProvider, EmailSendResult

logger = logging.getLogger(__name__)


class SMTPEmailProvider(BaseEmailProvider):
    """
    Standard SMTP provider supporting STARTTLS, authentication, and custom SMTP servers.
    Sanitizes all exceptions to prevent password or credential exposure in application logs.
    """

    name: str = "smtp"

    def __init__(
        self,
        host: str,
        port: int = 587,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: bool = True,
        default_from: str = "ClientPulse AI <notifications@clientpulse.ai>",
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.default_from = default_from

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
        from_address = sender_email or self.default_from
        message_id = f"<{uuid.uuid4().hex}@{self.host}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = to_email
        msg["Message-ID"] = message_id

        if reply_to:
            msg["Reply-To"] = reply_to

        if headers:
            for k, v in headers.items():
                msg[k] = v

        msg.attach(MIMEText(body_text, "plain", "utf-8"))
        if body_html:
            msg.attach(MIMEText(body_html, "html", "utf-8"))

        try:
            with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                if self.use_tls:
                    server.starttls()
                if self.username and self.password:
                    server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"[SMTPEmailProvider] Email successfully dispatched to {to_email} via {self.host}")
            return EmailSendResult(
                success=True,
                provider_message_id=message_id,
                provider=self.name,
                status="sent",
                error_message=None,
            )
        except smtplib.SMTPResponseException as exc:
            # Capture SMTP error code and message safely without printing passwords
            err_msg = f"SMTP error ({exc.smtp_code}): {exc.smtp_error.decode('utf-8', errors='ignore') if isinstance(exc.smtp_error, bytes) else str(exc.smtp_error)}"
            logger.error(f"[SMTPEmailProvider] Failed to send email to {to_email}: {err_msg}")
            return EmailSendResult(
                success=False,
                provider=self.name,
                status="failed",
                error_message=err_msg,
            )
        except Exception as exc:
            clean_err = f"SMTP connection error: {exc.__class__.__name__} - {str(exc)}"
            logger.error(f"[SMTPEmailProvider] Unexpected error sending email to {to_email}: {clean_err}")
            return EmailSendResult(
                success=False,
                provider=self.name,
                status="failed",
                error_message=clean_err,
            )
