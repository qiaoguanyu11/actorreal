import mysql.connector
from mysql.connector import Error, pooling
import logging
from typing import List, Dict, Any, Optional
from ..core.config import settings
import uuid
from datetime import datetime
import traceback

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self.config = {
            'user': settings.MYSQL_USER,
            'password': settings.MYSQL_PASSWORD,
            'host': settings.MYSQL_HOST,
            'port': int(settings.MYSQL_PORT),
            'database': settings.MYSQL_DB,
            'raise_on_warnings': True,
            'charset': 'utf8mb4',
            'pool_name': 'mypool',
            'pool_size': 5
        }
        self.init_pool()

    def init_pool(self) -> bool:
        """初始化连接池"""
        try:
            if self.pool is None:
                self.pool = mysql.connector.pooling.MySQLConnectionPool(**self.config)
                logger.info("成功初始化MySQL连接池")
            return True
        except Error as e:
            logger.error(f"初始化连接池时出错: {str(e)}")
            return False

    def get_connection(self):
        """从连接池获取连接"""
        try:
            if self.pool is None:
                self.init_pool()
            return self.pool.get_connection()
        except Error as e:
            logger.error(f"获取数据库连接时出错: {str(e)}")
            return None

    def execute_query(self, query: str, params: tuple = None) -> Optional[List[Dict[str, Any]]]:
        """执行查询并返回结果"""
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if not connection:
                return None

            cursor = connection.cursor(dictionary=True)
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
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def execute_update(self, query: str, params: tuple = None) -> bool:
        """执行更新操作"""
        connection = None
        cursor = None
        try:
            connection = self.get_connection()
            if not connection:
                return False

            cursor = connection.cursor()
            logger.debug(f"执行更新: {query}")
            logger.debug(f"参数: {params}")
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            connection.commit()
            logger.debug(f"更新成功，影响的行数: {cursor.rowcount}")
            return True
        except Error as e:
            logger.error(f"执行更新时出错: {str(e)}")
            if connection:
                connection.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_invite_codes(self, agent_id: int) -> Optional[List[Dict[str, Any]]]:
        """获取邀请码列表"""
        query = """
        SELECT 
            id, 
            code, 
            created_at, 
            agent_id,
            CASE 
                WHEN used_by IS NULL THEN 'active'
                ELSE 'used'
            END as status
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
            INSERT INTO invite_codes (id, code, agent_id, created_at) 
            VALUES (%s, %s, %s, %s)
            """
            
            current_time = datetime.now()
            params = (code_id, code, agent_id, current_time)
            
            if self.execute_update(query, params):
                return {
                    "id": code_id,
                    "code": code,
                    "agent_id": agent_id,
                    "created_at": current_time,
                    "status": "active"  # 新创建的邀请码默认为active状态
                }
            return None
        except Exception as e:
            logger.error(f"创建邀请码时出错: {str(e)}")
            return None

    def get_invite_code(self, code_id: str) -> Optional[Dict[str, Any]]:
        """获取单个邀请码"""
        query = """
        SELECT id, code, created_at, agent_id 
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

    def get_invite_code_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """通过邀请码查找邀请码信息和对应的经纪人"""
        try:
            query = """
            SELECT 
                i.id, 
                i.code, 
                i.created_at, 
                i.agent_id,
                u.id as manager_id, 
                u.username as manager_name, 
                u.role as manager_role,
                u.status as manager_status
            FROM invite_codes i
            JOIN users u ON i.agent_id = u.id
            WHERE i.code = %s
            """
            
            logger.debug(f"执行邀请码查询，邀请码: {code}")
            results = self.execute_query(query, (code,))
            
            if not results:
                logger.warning(f"未找到邀请码: {code}")
                return None
                
            result = results[0]
            
            # 检查经纪人状态
            if result['manager_status'] != 'active':
                logger.warning(f"经纪人状态无效: {result['manager_status']}")
                return None
                
            logger.info(f"成功找到邀请码信息: {result}")
            return result
            
        except Exception as e:
            logger.error(f"查询邀请码时出错: {str(e)}")
            return None

    def update_invite_code_status(self, code: str, used_by: int) -> bool:
        """更新邀请码状态为已使用"""
        try:
            query = """
            UPDATE invite_codes 
            SET used_by = %s
            WHERE code = %s 
            AND used_by IS NULL
            """
            
            logger.debug(f"更新邀请码状态，邀请码: {code}, 使用者: {used_by}")
            return self.execute_update(query, (used_by, code))
            
        except Exception as e:
            logger.error(f"更新邀请码状态时出错: {str(e)}")
            return False

    def add_invite_code_user(self, code: str, user_id: int) -> bool:
        """添加邀请码与用户的关联记录（支持多用户使用同一邀请码）"""
        connection = None
        cursor = None
        try:
            # 获取数据库连接
            connection = self.get_connection()
            if not connection:
                logger.error(f"添加邀请码用户关联失败：无法获取数据库连接")
                return False
                
            # 开始事务
            connection.start_transaction()
            cursor = connection.cursor(dictionary=True)
            
            # 1. 首先获取邀请码ID
            query_code = """
            SELECT id FROM invite_codes WHERE code = %s
            """
            logger.info(f"查询邀请码ID，邀请码: {code}")
            cursor.execute(query_code, (code,))
            results = cursor.fetchall()
            
            if not results or len(results) == 0:
                logger.error(f"未找到邀请码: {code}")
                return False
                
            invite_code_id = results[0]['id']
            logger.info(f"找到邀请码ID: {invite_code_id}")
            
            # 2. 添加到关联表
            query_insert = """
            INSERT INTO invite_code_users (invite_code_id, user_id)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
            """
            
            logger.info(f"添加邀请码用户关联，邀请码ID: {invite_code_id}, 用户ID: {user_id}")
            cursor.execute(query_insert, (invite_code_id, user_id))
            affected_rows = cursor.rowcount
            logger.info(f"影响的行数: {affected_rows}")
            
            # 3. 同时也更新invite_codes表中的used_by字段（兼容旧代码）
            query_update = """
            UPDATE invite_codes 
            SET used_by = %s
            WHERE id = %s
            """
            cursor.execute(query_update, (user_id, invite_code_id))
            affected_rows_update = cursor.rowcount
            logger.info(f"更新邀请码used_by字段，影响的行数: {affected_rows_update}")
            
            # 提交事务
            connection.commit()
            logger.info(f"成功添加邀请码用户关联: 邀请码={code}, 用户ID={user_id}")
            return True
            
        except Exception as e:
            logger.error(f"添加邀请码用户关联失败: {str(e)}")
            logger.error(f"错误详情: {traceback.format_exc()}")
            # 回滚事务
            if connection:
                try:
                    connection.rollback()
                except:
                    pass
            return False
        finally:
            if cursor:
                cursor.close()
            if connection:
                connection.close()

    def get_agent_by_user_id(self, user_id: int) -> dict:
        """根据用户ID查询其使用的邀请码对应的经纪人"""
        try:
            query = """
            SELECT u.id as agent_id, u.username as agent_name
            FROM invite_code_users icu
            JOIN invite_codes ic ON icu.invite_code_id = ic.id
            JOIN users u ON ic.agent_id = u.id
            WHERE icu.user_id = %s AND u.role = 'manager' AND u.status = 'active'
            LIMIT 1
            """
            
            logger.debug(f"查询用户 {user_id} 使用的邀请码对应的经纪人")
            results = self.execute_query(query, (user_id,))
            
            if not results or len(results) == 0:
                logger.warning(f"未找到用户 {user_id} 使用的邀请码对应的经纪人")
                return None
                
            return results[0]
            
        except Exception as e:
            logger.error(f"查询用户邀请码经纪人失败: {str(e)}")
            return None

# 创建全局数据库管理器实例
db_manager = DatabaseManager() 