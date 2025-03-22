from fastapi import APIRouter
from app.api.v1.endpoints.system import info, auth, users
from .auth import router as auth_router
from .register import router as register_router

router = APIRouter()

# 注册系统信息API
router.include_router(info.router, prefix="/info", tags=["系统信息"])

# 注册用户认证API
router.include_router(auth_router, prefix="/auth", tags=["认证"])

# 注册用户管理API
router.include_router(users.router, prefix="/users", tags=["用户管理"])

router.include_router(register_router, prefix="/register", tags=["注册"])
