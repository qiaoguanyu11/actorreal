import sys
import os
from pathlib import Path
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import ValidationError
import logging

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.app.api.v1.api import api_router
from backend.app.core.config import settings
from backend.app.utils.minio_setup import setup_minio_buckets

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 设置日志记录
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)  # 确保日志目录存在
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "backend.log"),
        logging.StreamHandler()
    ]
)

# 设置某些特定模块的日志级别
logging.getLogger("app.api.v1.endpoints.actors.basic").setLevel(logging.DEBUG)
logging.getLogger("app.utils.db_utils").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

# 设置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:3003", "http://127.0.0.1:3003"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# 挂载静态文件目录
media_dir = Path(settings.MEDIA_ROOT)
media_dir.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

# 注册API路由
app.include_router(api_router, prefix=settings.API_V1_STR)

# 调试中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"请求开始: {request.method} {request.url}")
    logger.debug(f"请求头: {request.headers}")
    response = await call_next(request)
    logger.debug(f"响应状态: {response.status_code}")
    return response

@app.on_event("startup")
async def startup_event():
    """应用启动时执行的操作"""
    print("正在启动应用...")
    
    # 设置MinIO存储桶权限
    setup_result = setup_minio_buckets()
    if setup_result:
        print("MinIO存储桶设置成功")
    else:
        print("警告：MinIO存储桶设置失败，媒体文件可能无法正常访问")
    
    print(f"{settings.APP_NAME} 启动完成，版本: {settings.APP_VERSION}")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行的操作"""
    print("应用正在关闭...")

@app.get("/", include_in_schema=False)
async def root():
    """API根路径,返回基本信息"""
    return {"message": f"欢迎访问 {settings.APP_NAME} API"}

@app.get("/info", include_in_schema=False)
async def info():
    """返回系统信息"""
    return settings.SYSTEM_INFO

# 验证错误处理
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """验证错误处理器"""
    logging.error(f"数据验证错误: {str(exc)}")
    
    return JSONResponse(
        status_code=422,
        content={"detail": f"数据验证错误: {str(exc.errors())}"}
    )

# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    import traceback
    logging.error(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"服务器内部错误: {str(exc)}"}
    )

if __name__ == "__main__":
    # 本地运行应用
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8002, reload=True) 