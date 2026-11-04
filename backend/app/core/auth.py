import secrets
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.config import settings


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT bearer token for employee session."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "role": "employee"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify signed JWT bearer token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def require_employee_auth(
    x_employee_key: Optional[str] = Header(None, alias="X-Employee-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """
    Authentication & Authorization dependency for employee endpoints.
    Accepts:
      1. Valid JWT bearer token via 'Authorization: Bearer <jwt_token>'
      2. Valid employee secret key via 'Authorization: Bearer <key>' or 'X-Employee-Key: <key>'
    """
    token: Optional[str] = None

    if authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif len(parts) == 1:
            token = parts[0]
    elif x_employee_key:
        token = x_employee_key.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid employee credentials required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Try JWT verification first
    payload = verify_token(token)
    if payload and payload.get("role") == "employee":
        return True

    # 2. Try EMPLOYEE_API_KEY match (backward compatibility for system scripts/webhooks)
    if secrets.compare_digest(token, settings.EMPLOYEE_API_KEY):
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Valid employee credentials required.",
        headers={"WWW-Authenticate": "Bearer"},
    )
