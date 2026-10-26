from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.database import check_db_connection

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    """Health check endpoint to verify backend service and database connectivity."""
    db_status = check_db_connection()

    return {
        "status": "healthy" if db_status["status"] == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
    }
