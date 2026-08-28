from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from backend.config import settings

# pool_pre_ping=True added to handle idle/stale connections seamlessly
engine = create_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)

# Base class for all ORM models
Base = declarative_base()