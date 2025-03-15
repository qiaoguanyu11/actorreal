from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings

engine = create_engine(
    settings.DATABASE_URI,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"charset": "utf8mb4"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 