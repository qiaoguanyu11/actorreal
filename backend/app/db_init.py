from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import bcrypt
import logging

from app.core.config import settings
from app.models.user import User, UserPermission, Base
from app.models.actor import Actor, ActorProfessionalInfo, ActorContactInfo, ActorContractInfo, ActorStatusHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    engine = create_engine(
        settings.DATABASE_URI,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={"charset": "utf8mb4"}
    )
    
    # 创建所有表
    logger.info("创建数据库表...")
    Base.metadata.create_all(bind=engine)
    
    # 创建会话
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # 检查是否已存在管理员账号
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            logger.info("创建默认管理员账号...")
            # 生成密码哈希
            password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # 创建管理员用户
            admin = User(
                username="admin",
                password_hash=password_hash,
                email="admin@example.com",
                role="admin",
                status="active"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            
            # 为管理员添加所有权限
            permissions = [
                "manage_users",
                "create_actor",
                "edit_actor",
                "delete_actor",
                "view_all_actors",
                "assign_actor",
                "create_manager"
            ]
            
            for perm in permissions:
                db_perm = UserPermission(user_id=admin.id, permission=perm)
                db.add(db_perm)
            
            db.commit()
            logger.info(f"管理员用户创建成功，ID: {admin.id}")
        else:
            logger.info("管理员账号已存在，跳过创建")
            
    except Exception as e:
        logger.error(f"初始化数据库时发生错误: {e}")
        db.rollback()
    finally:
        db.close()
    
    logger.info("数据库初始化完成")

if __name__ == "__main__":
    init_db() 