from fastapi import APIRouter
from backend.app.api.v1.endpoints.actors import (
    basic, 
    professional, 
    contact, 
    media, 
    tags, 
    deletion,
    agent
)

router = APIRouter()

# 注册基本信息API
router.include_router(basic.router, prefix="/basic", tags=["演员基本信息"])

# 注册专业信息API
router.include_router(professional.router, prefix="/professional", tags=["演员专业信息"])

# 注册联系信息API
router.include_router(contact.router, prefix="/contact", tags=["演员联系信息"])

# 注册删除API
router.include_router(deletion.router, prefix="/deletion", tags=["演员删除"])

# 注册标签管理API
router.include_router(tags.router, prefix="/tags", tags=["演员标签"])

# 注册媒体管理API
router.include_router(media.router, prefix="/media", tags=["演员媒体"])

# 演员自行管理媒体API
router.include_router(media.self_router, prefix="/self-media", tags=["演员个人媒体"])

# 演员经纪人归属API
router.include_router(agent.router, prefix="/agent", tags=["演员经纪人归属"])
