from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import logging
import time
from typing import Generator

from .config import settings

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_db_engine(retries: int = 3, delay: int = 5):
    """创建数据库引擎，带重试机制"""
    for attempt in range(retries):
        try:
            logger.debug(f"Attempting to create database engine (attempt {attempt + 1}/{retries})")
            logger.debug(f"Database URI: {settings.DATABASE_URI}")
            
            engine = create_engine(
                settings.DATABASE_URI,
                pool_pre_ping=True,     # 自动检测断开的连接
                pool_recycle=3600,      # 每小时回收连接
                pool_size=5,            # 连接池大小
                max_overflow=10,        # 最大溢出连接数
                echo=True,              # 输出 SQL 语句用于调试
                pool_timeout=30,        # 连接池超时时间
                connect_args={
                    "charset": "utf8mb4"
                }
            )
            
            # 测试连接
            with engine.connect() as conn:
                logger.debug("Testing database connection...")
                result = conn.execute(text("SELECT 1"))
                logger.debug(f"Connection test result: {result.scalar()}")
                conn.commit()
                logger.info("Successfully connected to the database")
                return engine
                
        except SQLAlchemyError as e:
            logger.error(f"Database connection error: {str(e)}")
            if attempt < retries - 1:
                logger.warning(f"Database connection attempt {attempt + 1} failed")
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                logger.error(f"Failed to connect to database after {retries} attempts")
                raise

# 创建数据库引擎
try:
    engine = create_db_engine()
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()

# 添加连接事件监听器
@event.listens_for(engine, "connect")
def connect(dbapi_connection, connection_record):
    """设置连接属性"""
    cursor = dbapi_connection.cursor()
    cursor.execute("SET SESSION sql_mode='STRICT_TRANS_TABLES'")
    cursor.close()

def get_db() -> Generator:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        logger.debug("Creating new database session")
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        logger.debug("Closing database session")
        db.close() 