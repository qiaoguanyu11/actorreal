#!/usr/bin/env python3
"""
初始化数据库，创建所有表和初始数据
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 修复导入路径
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import bcrypt
import logging

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 数据库配置
DATABASE_URI = "mysql+pymysql://root:hepzibah1@localhost:3306/actor_management"

# 初始化数据库连接
engine = create_engine(
    DATABASE_URI,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"charset": "utf8mb4"}
)

Base = declarative_base()

# 定义简化版的模型用于初始化
class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    from sqlalchemy import Column, Integer, String, DateTime, Enum
    import datetime
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    role = Column(Enum('performer', 'manager', 'admin', name='user_role_enum'), 
                 nullable=False, default='performer')
    status = Column(Enum('active', 'inactive', 'banned', name='user_status_enum'), 
                   nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class UserPermission(Base):
    """用户权限模型"""
    __tablename__ = "user_permissions"
    
    from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
    import datetime
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class IDCounter(Base):
    """ID计数器模型"""
    __tablename__ = "id_counters"
    
    from sqlalchemy import Column, String, Integer, DateTime
    import datetime
    
    counter_key = Column(String(50), primary_key=True)
    current_value = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


def init_database():
    """初始化数据库，创建所有表和初始管理员用户"""
    logger.info("开始初始化数据库...")
    
    # 创建必要的表
    Base.metadata.create_all(bind=engine)
    logger.info("基础表已创建")
    
    # 创建初始管理员用户
    with Session(engine) as session:
        # 检查是否已存在管理员用户
        admin_exists = session.query(User).filter(User.username == "admin").first()
        
        if not admin_exists:
            # 生成密码哈希
            password_hash = bcrypt.hashpw("admin123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            
            # 创建管理员用户
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=password_hash,
                role="admin"
            )
            session.add(admin_user)
            session.commit()
            
            # 添加管理员权限
            admin_permission = UserPermission(
                user_id=admin_user.id,
                permission="all"
            )
            session.add(admin_permission)
            session.commit()
            
            logger.info(f"已创建管理员用户: admin (ID: {admin_user.id})")
        else:
            logger.info("管理员用户已存在，跳过创建")
        
        # 初始化ID计数器
        counters = [
            {"key": "actor", "value": 10000},
            {"key": "manager", "value": 1000},
            {"key": "admin", "value": 100}
        ]
        
        for counter in counters:
            counter_exists = session.query(IDCounter).filter(IDCounter.counter_key == counter["key"]).first()
            
            if not counter_exists:
                id_counter = IDCounter(
                    counter_key=counter["key"],
                    current_value=counter["value"]
                )
                session.add(id_counter)
                session.commit()
                logger.info(f"已创建ID计数器: {counter['key']} = {counter['value']}")
            else:
                logger.info(f"ID计数器已存在: {counter['key']}")
    
    logger.info("数据库初始化完成")

if __name__ == "__main__":
    init_database() 