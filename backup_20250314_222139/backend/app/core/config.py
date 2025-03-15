import os
from pydantic_settings import BaseSettings
from typing import List, Optional
from pathlib import Path


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用信息
    APP_NAME: str = "演员管理系统"
    APP_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS设置
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # 数据库设置
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "hepzibah1"
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DB: str = "actors_management"
    DATABASE_URI: Optional[str] = None
    
    # MinIO设置
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"
    MINIO_URL: str = "localhost:9000"
    MINIO_BUCKET: str = "actors-media"
    MINIO_EXTERNAL_URL: str = "http://localhost:9000"  # 外部访问URL
    MINIO_DATA_DIR: Path = Path(os.getenv("MINIO_DATA_DIR", "./minio_data"))  # MinIO数据存储路径
    
    # 系统信息
    SYSTEM_INFO: dict = {
        "name": "演员管理系统",
        "version": "0.1.0",
        "environment": "development",
        "platform": "Mac M2 Pro",
        "memory": "16G",
        "database": "MySQL",
        "storage": "MinIO"
    }
    
    # 媒体文件存储路径
    MEDIA_ROOT: Path = Path(os.getenv("MEDIA_ROOT", "./media"))
    MEDIA_URL: str = "/media"
    
    # 允许的最大文件大小（字节）
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    def __init__(self, **data):
        super().__init__(**data)
        self.DATABASE_URI = f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings() 