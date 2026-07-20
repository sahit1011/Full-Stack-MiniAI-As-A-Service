"""
Database configuration and session management for SQLite database.
"""
import os
from sqlalchemy import create_engine, text, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Database configuration
# For PostgreSQL (production)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/klaro")

# Fallback to SQLite for development if PostgreSQL not available
SQLITE_URL = "sqlite:///./data/klaro.db"

# Ensure data directory exists for SQLite fallback
os.makedirs("./data", exist_ok=True)

# Try PostgreSQL first, fallback to SQLite
try:
    # Create PostgreSQL engine
    engine = create_engine(
        DATABASE_URL,
        echo=False,  # Set to True for SQL query logging
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=300,  # Recycle connections every 5 minutes
    )
    # Test connection (SQLAlchemy 2.0 requires executable text(), not a raw string)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("✅ Connected to PostgreSQL database")

except Exception as e:
    print(f"⚠️  PostgreSQL connection failed: {e}")
    print("🔄 Falling back to SQLite for development")

    # Create SQLite engine as fallback.
    # NOTE: the previous StaticPool shared ONE connection across all requests; under the
    # concurrent requests a page fires (e.g. history's Promise.all + auth/me), the shared
    # connection's cursor state corrupted -> "sqlite3.InterfaceError: bad parameter or other
    # API misuse" / 500s, and the broken connection also failed the auth query -> spurious
    # 401s ("back to login"). NullPool gives each request its own connection (no sharing),
    # and WAL + busy_timeout make concurrent reads/writes safe.
    engine = create_engine(
        SQLITE_URL,
        connect_args={
            "check_same_thread": False,  # connection may be used by the request's worker thread
            "timeout": 30,               # wait up to 30s for a write lock instead of erroring
        },
        poolclass=NullPool,              # one fresh connection per checkout (no cross-request sharing)
        echo=False,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _record):
        """WAL = concurrent readers + a single writer without 'database is locked' storms."""
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=30000")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Create all database tables.
    """
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """
    Drop all database tables (for testing/development).
    """
    Base.metadata.drop_all(bind=engine)
