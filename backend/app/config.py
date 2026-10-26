import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ClientPulse AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/clientpulse_db"

    # CORS
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Deterministic Follow-Up Thresholds (in days)
    FOLLOWUP_DUE_THRESHOLD_DAYS: float = 2.0        # >= 2 days: recommended follow-up due
    FOLLOWUP_OVERDUE_THRESHOLD_DAYS: float = 5.0    # >= 5 days: overdue item
    FOLLOWUP_ESCALATION_THRESHOLD_DAYS: float = 7.0 # >= 7 days: recommended escalation

    # Gemini AI Configuration (Backend Only)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Employee Authentication
    EMPLOYEE_API_KEY: str = "cp_employee_secret_key_2026"

    # Portal Base URL (for link generation)
    PORTAL_BASE_URL: str = "http://localhost:5173"

    # Email Service Configuration (Provider Abstraction)
    EMAIL_PROVIDER: str = "mock"  # "mock", "smtp", "resend", "sendgrid"
    EMAIL_FROM: str = "ClientPulse AI <notifications@clientpulse.ai>"
    EMAIL_REPLY_TO: Optional[str] = None
    EMAIL_WEBHOOK_SECRET: str = "cp_webhook_secret_key_2026"

    # SMTP Configuration (Used when EMAIL_PROVIDER="smtp")
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Cloud Email Provider Keys (Used when EMAIL_PROVIDER="resend" or "sendgrid")
    RESEND_API_KEY: Optional[str] = None
    SENDGRID_API_KEY: Optional[str] = None

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
