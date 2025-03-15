from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import datetime
import psutil
import platform

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.storage import get_minio_client

router = APIRouter()


@router.get("/")
async def get_system_info():
    """
    获取系统基本信息
    """
    try:
        # 系统运行信息
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        system_info = {
            **settings.SYSTEM_INFO,
            "current_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "system": platform.system(),
            "node": platform.node(),
            "processor": platform.processor(),
            "cpu_usage": f"{cpu_percent}%",
            "memory_usage": f"{memory_percent}%",
            "disk_usage": f"{disk_percent}%"
        }
        
        return {
            "code": 200,
            "message": "success",
            "data": system_info,
            "timestamp": datetime.datetime.now().isoformat(),
            "request_id": "sys_info_request"
        }
    except Exception as e:
        return {
            "code": 500,
            "message": f"获取系统信息失败: {str(e)}",
            "timestamp": datetime.datetime.now().isoformat(),
            "request_id": "sys_info_request"
        }


@router.get("/health-check")
async def health_check(db: Session = Depends(get_db)):
    """
    系统健康检查
    检查数据库和存储服务是否正常
    """
    health_status = {
        "status": "ok",
        "timestamp": datetime.datetime.now().isoformat(),
        "services": {
            "api": {"status": "up"},
            "database": {"status": "unknown"},
            "storage": {"status": "unknown"}
        }
    }
    
    # 检查数据库连接
    try:
        # 执行一个简单查询
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = {
            "status": "up",
            "message": "数据库连接正常"
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = {
            "status": "down",
            "message": f"数据库连接失败: {str(e)}"
        }
    
    # 检查MinIO存储服务
    try:
        minio_client = get_minio_client()
        bucket_exists = minio_client.bucket_exists(settings.MINIO_BUCKET)
        health_status["services"]["storage"] = {
            "status": "up",
            "message": f"存储服务连接正常，存储桶{settings.MINIO_BUCKET}{'存在' if bucket_exists else '不存在'}"
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["storage"] = {
            "status": "down",
            "message": f"存储服务连接失败: {str(e)}"
        }
    
    if any(service["status"] == "down" for service in health_status["services"].values()):
        health_status["status"] = "down"
    
    return {
        "code": 200,
        "message": "success",
        "data": health_status,
        "timestamp": datetime.datetime.now().isoformat(),
        "request_id": "health_check_request"
    } 