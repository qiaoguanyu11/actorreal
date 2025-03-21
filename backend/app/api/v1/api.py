from fastapi import APIRouter

from app.api.v1.endpoints.system import router as system_router
from app.api.v1.endpoints.actors import router as actors_router

api_router = APIRouter()

# 注册系统模块API路由
api_router.include_router(system_router, prefix="/system", tags=["system"])

# 注册演员模块API路由
api_router.include_router(actors_router, prefix="/actors", tags=["actors"])

# 注册演员基本信息API路由
# api_router.include_router(basic.router, prefix="/actors", tags=["actors"])

# 注册演员管理API路由（空路由，待实现）
# 创建演员信息
# api_router.include_router(actors.basic.router, prefix="/actors", tags=["actors"]) 