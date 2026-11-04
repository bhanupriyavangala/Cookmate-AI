from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.auth import require_employee_auth, create_access_token
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=LoginResponse)
def employee_login(creds: LoginRequest):
    """
    Authenticate employee credentials and return signed JWT bearer token session.
    """
    email_clean = creds.email.strip().lower()
    default_email = settings.DEFAULT_EMPLOYEE_EMAIL.strip().lower()

    # Verify credentials against configured employee identity
    if email_clean != default_email or creds.password != settings.DEFAULT_EMPLOYEE_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    token = create_access_token(data={"sub": email_clean, "role": "employee", "name": "Lead Solutions Engineer"})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user={
            "email": email_clean,
            "name": "Lead Solutions Engineer",
            "role": "employee",
        },
    )


@router.get("/verify")
def verify_employee(is_auth: bool = Depends(require_employee_auth)):
    """
    Verifies employee authorization.
    Returns 200 OK if valid employee credentials (JWT Bearer token or key) are supplied.
    """
    return {
        "authenticated": True,
        "role": "employee",
        "status": "authorized",
    }
