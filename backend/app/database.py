import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()


def get_engine():
    """Initializes SQLAlchemy engine with PostgreSQL or seamless fallback for development."""
    db_url = settings.DATABASE_URL.strip()

    # Automatically adapt postgresql:// schema to SQLAlchemy 2.0 psycopg driver
    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if "sqlite" in db_url:
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )

    try:
        # Test connection to configured PostgreSQL database
        pg_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to primary PostgreSQL database.")
        return pg_engine
    except Exception as exc:
        logger.warning(
            f"Could not connect to PostgreSQL ({exc}). "
            "Falling back to local SQLite database (sqlite:///./clientpulse_dev.db) for development."
        )
        fallback_url = "sqlite:///./clientpulse_dev.db"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False},
        )


engine = get_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """Dependency providing database session with automatic cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables."""
    # Ensure all models are imported before creating tables
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")


def check_db_connection() -> dict:
    """Checks database connectivity status and details."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        dialect_name = engine.dialect.name
        is_fallback = "sqlite" in str(engine.url) and "sqlite" not in settings.DATABASE_URL

        return {
            "status": "connected",
            "dialect": dialect_name,
            "engine": "PostgreSQL" if dialect_name == "postgresql" else ("SQLite (Dev Fallback)" if is_fallback else "SQLite"),
            "url": str(engine.url).split("@")[-1] if "@" in str(engine.url) else "local",
            "error": None
        }
    except SQLAlchemyError as err:
        logger.warning(f"Database connection check failed: {err}")
        return {
            "status": "disconnected",
            "dialect": engine.dialect.name,
            "engine": "Unavailable",
            "url": "disconnected",
            "error": "Could not connect to database server."
        }
    except Exception as exc:
        logger.warning(f"Unexpected database error: {exc}")
        return {
            "status": "error",
            "dialect": "unknown",
            "engine": "Error",
            "url": "error",
            "error": str(exc)
        }
