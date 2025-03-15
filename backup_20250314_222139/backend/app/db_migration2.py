import logging
from sqlalchemy import create_engine, text
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """运行数据库迁移脚本 - 添加新字段"""
    try:
        # 构建数据库URL
        database_url = f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DB}"
        engine = create_engine(database_url)
        conn = engine.connect()
        
        # 迁移演员专业信息表 - 添加新字段
        logger.info("正在添加新字段...")
        try:
            # 添加新字段
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN current_rank VARCHAR(20) NULL COMMENT '目前咖位（主演，角色，特约，群演，无）';"))
            conn.execute(text("ALTER TABLE actor_professional_info ADD COLUMN minimum_fee FLOAT NULL COMMENT '接受最低片酬（金额）';"))
            logger.info("新字段添加完成")
        except Exception as e:
            logger.warning(f"添加新字段时发生错误: {e}")
        
        conn.close()
        logger.info("数据库迁移完成")
    except Exception as e:
        logger.error(f"数据库迁移失败: {e}")

if __name__ == "__main__":
    run_migrations() 