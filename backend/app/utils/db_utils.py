import mysql.connector
from mysql.connector import Error
import logging
from typing import List, Dict, Any, Optional
from ..core.config import settings
import uuid
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.connection = None
        self.config = {
            'user': settings.MYSQL_USER,
            'password': settings.MYSQL_PASSWORD,
            'host': settings.MYSQL_HOST,
            'port': int(settings.MYSQL_PORT),  # 确保端口是整数
            'database': settings.MYSQL_DB,
            'raise_on_warnings': True,
            'charset': 'utf8mb4'
        }

    def connect(self) -> bool:
        """连接到数据库"""
        try:
            if self.connection is None or not self.connection.is_connected():
                logger.debug(f"尝试连接到数据库，配置：{self.config}")
                self.connection = mysql.connector.connect(**self.config)
                logger.info("成功连接到 MySQL 数据库")
                return True
        except Error as e:
            logger.error(f"连接数据库时出错: {str(e)}")
            return False
        return True

    def disconnect(self):
        """断开数据库连接"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("数据库连接已关闭")

    def execute_query(self, query: str, params: tuple = None) -> Optional[List[Dict[str, Any]]]:
        """执行查询并返回结果"""
        try:
            if not self.connect():
                return None

            cursor = self.connection.cursor(dictionary=True)
            logger.debug(f"执行查询: {query}")
            logger.debug(f"参数: {params}")
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            result = cursor.fetchall()
            logger.debug(f"查询结果: {result}")
            return result
        except Error as e:
            logger.error(f"执行查询时出错: {str(e)}")
            return None
        finally:
            if 'cursor' in locals():
                cursor.close()

    def execute_update(self, query: str, params: tuple = None) -> bool:
        """执行更新操作"""
        try:
            if not self.connect():
                return False

            cursor = self.connection.cursor()
            logger.debug(f"执行更新: {query}")
            logger.debug(f"参数: {params}")
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            self.connection.commit()
            logger.debug(f"更新成功，影响的行数: {cursor.rowcount}")
            return True
        except Error as e:
            logger.error(f"执行更新时出错: {str(e)}")
            if self.connection:
                self.connection.rollback()
            return False
        finally:
            if 'cursor' in locals():
                cursor.close()

    def get_invite_codes(self, agent_id: int) -> Optional[List[Dict[str, Any]]]:
        """获取邀请码列表"""
        query = """
        SELECT id, code, created_at, status, agent_id, used_by 
        FROM invite_codes 
        WHERE agent_id = %s
        """
        return self.execute_query(query, (agent_id,))

    def check_invite_code_exists(self, code: str) -> bool:
        """检查邀请码是否已存在"""
        query = """
        SELECT COUNT(*) as count
        FROM invite_codes 
        WHERE code = %s
        """
        try:
            result = self.execute_query(query, (code,))
            return result[0]['count'] > 0 if result else False
        except Exception as e:
            logger.error(f"检查邀请码是否存在时出错: {str(e)}")
            return True  # 如果出错，假设邀请码已存在，以防重复

    def create_invite_code(self, code: str, agent_id: int) -> Optional[Dict[str, Any]]:
        """创建新的邀请码"""
        try:
            # 生成唯一ID
            code_id = str(uuid.uuid4())
            
            # 检查邀请码长度
            if len(code) != 6:
                logger.error(f"邀请码长度必须为6位: {code}")
                return None
            
            query = """
            INSERT INTO invite_codes (id, code, agent_id, status, created_at) 
            VALUES (%s, %s, %s, 'active', %s)
            """
            
            current_time = datetime.now()
            params = (code_id, code, agent_id, current_time)
            
            if self.execute_update(query, params):
                return {
                    "id": code_id,
                    "code": code,
                    "agent_id": agent_id,
                    "status": "active",
                    "created_at": current_time,
                    "used_by": None
                }
            return None
        except Exception as e:
            logger.error(f"创建邀请码时出错: {str(e)}")
            return None

    def update_invite_code_status(self, code_id: str, status: str) -> bool:
        """更新邀请码状态"""
        if status not in ["active", "used", "inactive"]:
            logger.error(f"无效的状态值: {status}")
            return False
        
        query = """
        UPDATE invite_codes 
        SET status = %s 
        WHERE id = %s
        """
        return self.execute_update(query, (status.lower(), code_id))

    def get_invite_code(self, code_id: str) -> Optional[Dict[str, Any]]:
        """获取单个邀请码"""
        query = """
        SELECT id, code, created_at, status, agent_id, used_by 
        FROM invite_codes 
        WHERE id = %s
        """
        results = self.execute_query(query, (code_id,))
        return results[0] if results else None

    def delete_invite_code(self, code_id: str) -> bool:
        """删除邀请码"""
        query = """
        DELETE FROM invite_codes 
        WHERE id = %s
        """
        return self.execute_update(query, (code_id,))

# 创建全局数据库管理器实例
db_manager = DatabaseManager() 