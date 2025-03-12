from fastapi import APIRouter
from app.api.v1.endpoints.system import info, auth, users

router = APIRouter()

# 注册系统信息API
router.include_router(info.router, prefix="/info", tags=["系统信息"])

# 注册用户认证API
router.include_router(auth.router, prefix="/auth", tags=["用户认证"])

# 注册用户管理API
router.include_router(users.router, prefix="/users", tags=["用户管理"])
