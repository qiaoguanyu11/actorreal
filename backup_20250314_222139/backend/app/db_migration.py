import logging
from sqlalchemy import create_engine, text
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """运行数据库迁移脚本"""
    try:
        # 构建数据库URL
        database_url = f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"
        engine = create_engine(database_url)
        conn = engine.connect()
        
        # 迁移演员专业信息表
        logger.info("正在迁移演员专业信息表...")
        try:
            # 添加新字段
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN bio VARCHAR(2000) NULL COMMENT '个人简介';"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN skills VARCHAR(500) NULL COMMENT '技能，JSON格式存储';"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN experience VARCHAR(2000) NULL COMMENT '经验，JSON格式存储';"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN awards VARCHAR(1000) NULL COMMENT '获奖情况，JSON格式存储';"))
            
            # 修改旧字段
            conn.execute(text("ALTER TABLE actor_professional_info MODIFY COLUMN education VARCHAR(1000) NULL COMMENT '教育背景，JSON格式存储';"))
            conn.execute(text("ALTER TABLE actor_professional_info MODIFY COLUMN languages VARCHAR(500) NULL COMMENT '语言能力，JSON格式存储';"))
            
            # 删除旧字段
            conn.execute(text("ALTER TABLE actor_professional_info DROP COLUMN specialties;"))
            conn.execute(text("ALTER TABLE actor_professional_info DROP COLUMN performance_experience;"))
            conn.execute(text("ALTER TABLE actor_professional_info DROP COLUMN preferred_types;"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN current_rank VARCHAR(20) NULL COMMENT '目前咖位（主演，角色，特约，群演，无）';"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN minimum_fee FLOAT NULL COMMENT '接受最低片酬（金额）';"))
            logger.info("演员专业信息表迁移完成")
        except Exception as e:
            logger.warning(f"迁移演员专业信息表时发生错误: {e}")
        
        # 迁移演员联系信息表
        logger.info("正在迁移演员联系信息表...")
        try:
            # 添加新字段
            conn.execute(text("ALTER TABLE actor_contact_info ADD COLUMN emergency_phone VARCHAR(20) NULL;"))
            conn.execute(text("ALTER TABLE actor_contact_info ADD COLUMN social_media VARCHAR(1000) NULL COMMENT '社交媒体，JSON格式存储';"))
            logger.info("演员联系信息表迁移完成")
        except Exception as e:
            logger.warning(f"迁移演员联系信息表时发生错误: {e}")
        
        # 修改演员等级字段
        logger.info("正在修改演员等级字段...")
        try:
            # 修改字段类型为新的枚举值
            conn.execute(text("""
                ALTER TABLE actor_professional_info 
                MODIFY COLUMN current_rank ENUM('主角', '角色', '特约', '群演', '无经验') 
                COMMENT '演员等级';
            """))
            logger.info("演员等级字段修改完成")
        except Exception as e:
            logger.warning(f"修改演员等级字段时发生错误: {e}")
        
        conn.close()
        logger.info("数据库迁移完成")
    except Exception as e:
        logger.error(f"数据库迁移失败: {e}")

if __name__ == "__main__":
    run_migrations() 