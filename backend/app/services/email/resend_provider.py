import logging
import httpx
from typing import Optional, Dict
from app.services.email.base import BaseEmailProvider, EmailSendResult

logger = logging.getLogger(__name__)


class ResendEmailProvider(BaseEmailProvider):
    """
    Direct REST integration for Resend email platform (resend.com).
    Uses backend environment variable RESEND_API_KEY.
    """

    name: str = "resend"

    def __init__(self, api_key: str, default_from: str = "ClientPulse AI <notifications@clientpulse.ai>"):
        self.api_key = api_key
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
        url = "https://api.resend.com/emails"
        from_address = sender_email or self.default_from

        payload = {
            "from": from_address,
            "to": [to_email],
            "subject": subject,
            "text": body_text,
        }
        if body_html:
            payload["html"] = body_html
        if reply_to:
            payload["reply_to"] = reply_to
        if headers:
            payload["headers"] = headers

        try:
            # Mask API key in any outgoing headers/logs
            auth_header = {"Authorization": f"Bearer {self.api_key}"}
            with httpx.Client(timeout=15.0) as client:
                response = client.post(url, json=payload, headers=auth_header)

            if response.status_code in (200, 201):
                res_data = response.json()
                msg_id = res_data.get("id")
                logger.info(f"[ResendEmailProvider] Email sent successfully to {to_email} | ID: {msg_id}")
                return EmailSendResult(
                    success=True,
                    provider_message_id=msg_id,
                    provider=self.name,
                    status="sent",
                    error_message=None,
                )
            else:
                err_text = response.text
                try:
                    err_json = response.json()
                    err_msg = err_json.get("message", err_text)
                except Exception:
                    err_msg = err_text

                clean_err = f"Resend API error (HTTP {response.status_code}): {err_msg}"
                logger.error(f"[ResendEmailProvider] Delivery failed: {clean_err}")
                return EmailSendResult(
                    success=False,
                    provider=self.name,
                    status="failed",
                    error_message=clean_err,
                )
        except Exception as exc:
            clean_err = f"Resend connection failed: {exc.__class__.__name__} - {str(exc)}"
            logger.error(f"[ResendEmailProvider] Exception while sending: {clean_err}")
            return EmailSendResult(
                success=False,
                provider=self.name,
                status="failed",
                error_message=clean_err,
            )
