import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import api_router
from app.api.health import router as health_router

logger = logging.getLogger(__name__)


async def background_followup_worker():
    """
    Automatic background worker evaluating and synchronizing follow-up items
    every 60 seconds without relying solely on manual dashboard page refresh.
    """
    from app.database import SessionLocal
    from app.services.followup_engine import sync_followups

    while True:
        try:
            await asyncio.sleep(60)
            with SessionLocal() as db:
                sync_followups(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Periodic follow-up sync notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan handler: auto-initialize tables, seed demo records, and start background follow-up worker."""
    from app.database import init_db, SessionLocal
    from app.seed import seed_demo_data

    try:
        init_db()
        with SessionLocal() as session:
            seed_demo_data(session, force=False)
        logger.info("Application startup: database ready and verified.")
    except Exception as exc:
        logger.warning(f"Notice during startup initialization: {exc}")

    # Launch background follow-up evaluation worker task
    worker_task = asyncio.create_task(background_followup_worker())

    yield

    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for ClientPulse AI client communication and follow-up management.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/health",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

# Mount health router at top level and API prefix
app.include_router(health_router)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
