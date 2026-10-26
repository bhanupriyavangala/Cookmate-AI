import secrets
from typing import Optional
from fastapi import Header, HTTPException, status
from app.config import settings


def require_employee_auth(
    x_employee_key: Optional[str] = Header(None, alias="X-Employee-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """
    Authentication & Authorization dependency for employee endpoints.
    Verifies that the caller provides valid employee credentials via
    either the 'X-Employee-Key' header or 'Authorization: Bearer <token>'.
    """
    token: Optional[str] = None

    if x_employee_key:
        token = x_employee_key.strip()
    elif authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif len(parts) == 1:
            token = parts[0]

    expected = settings.EMPLOYEE_API_KEY
    if not token or not secrets.compare_digest(token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid employee credentials required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True
