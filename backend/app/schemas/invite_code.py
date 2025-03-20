from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class InviteCodeBase(BaseModel):
    """邀请码基础模型"""
    code: str

class InviteCodeCreate(InviteCodeBase):
    """创建邀请码请求模型"""
    pass

class InviteCodeOut(InviteCodeBase):
    """邀请码响应模型"""
    id: Optional[str] = None
    agent_id: int
    status: str
    created_at: datetime
    used_by: Optional[int] = None

    class Config:
        from_attributes = True 