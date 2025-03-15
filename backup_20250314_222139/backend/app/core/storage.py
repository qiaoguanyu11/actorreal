from minio import Minio
from minio.error import S3Error
from backend.app.core.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    # 初始化MinIO客户端
    minio_client = Minio(
        settings.MINIO_URL,
        access_key=settings.MINIO_ROOT_USER,
        secret_key=settings.MINIO_ROOT_PASSWORD,
        secure=False  # 本地开发环境通常不使用HTTPS
    )
    
    # 检查存储桶是否存在，如果不存在则创建
    if not minio_client.bucket_exists(settings.MINIO_BUCKET):
        minio_client.make_bucket(settings.MINIO_BUCKET)
        logger.info(f"创建存储桶: {settings.MINIO_BUCKET}")
    
    logger.info("MinIO存储服务连接成功")
    
except S3Error as e:
    logger.error(f"MinIO存储服务连接失败: {e}")
    raise e


def get_minio_client():
    """获取MinIO客户端"""
    return minio_client 