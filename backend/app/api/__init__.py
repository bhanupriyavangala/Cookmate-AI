from fastapi import APIRouter, Depends
from app.api.health import router as health_router
from app.api.clients import router as clients_router
from app.api.projects import router as projects_router
from app.api.conversations import router as conversations_router
from app.api.followups import router as followups_router
from app.api.ai import router as ai_router
from app.api.seed import router as seed_router
from app.api.auth import router as auth_router
from app.api.portal import router as portal_router
from app.api.contacts import router as contacts_router
from app.api.emails import router as emails_router, webhook_router as email_webhook_router
from app.core.auth import require_employee_auth

api_router = APIRouter()

# 1. Public & Webhook Endpoints
api_router.include_router(health_router)
api_router.include_router(portal_router)
api_router.include_router(email_webhook_router)

# 2. Employee Endpoints (Protected by Employee Authentication & Authorization)
api_router.include_router(auth_router)
api_router.include_router(clients_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(contacts_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(emails_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(projects_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(conversations_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(followups_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(ai_router, dependencies=[Depends(require_employee_auth)])
api_router.include_router(seed_router, dependencies=[Depends(require_employee_auth)])

__all__ = ["api_router"]
