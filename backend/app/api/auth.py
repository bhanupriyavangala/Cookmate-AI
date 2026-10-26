from fastapi import APIRouter, Depends
from app.core.auth import require_employee_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/verify")
def verify_employee(is_auth: bool = Depends(require_employee_auth)):
    """
    Verifies employee authorization.
    Returns 200 OK if valid employee credentials (X-Employee-Key or Bearer token) are supplied.
    """
    return {
        "authenticated": True,
        "role": "employee",
        "status": "authorized",
    }
