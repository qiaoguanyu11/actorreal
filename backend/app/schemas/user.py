from pydantic import BaseModel, Field, constr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    """用户基本信息"""
    username: str = Field(..., min_length=3, max_length=50)
    phone: str = Field(..., min_length=11, max_length=11)


class UserCreate(UserBase):
    """用户创建请求模型"""
    password: str = Field(..., min_length=6, max_length=50)
    role: str = "performer"  # 默认为演员角色
    invite_code: str  # 添加邀请码字段
    

class UserLogin(BaseModel):
    """用户登录请求模型"""
    username: str
    password: str


class UserCreateManager(UserBase):
    """创建经纪人账号请求模型（管理员专用）"""
    password: str = Field(..., min_length=6, max_length=50)
    role: str = "manager"  # 固定为经纪人角色


class UserCreateAdmin(UserBase):
    """创建管理员账号请求模型（管理员专用）"""
    password: str = Field(..., min_length=6, max_length=50)
    role: str = "admin"  # 固定为管理员角色


class UserUpdate(BaseModel):
    """用户信息更新请求模型"""
    username: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    status: Optional[str] = None


class UserPermissionCreate(BaseModel):
    """用户权限创建请求模型"""
    permission: str


class UserPermissionOut(BaseModel):
    """用户权限输出模型"""
    id: int
    user_id: int
    permission: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserOut(UserBase):
    """用户信息输出模型"""
    id: int
    role: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    permissions: Optional[List[UserPermissionOut]] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """令牌响应模型"""
    access_token: str
    token_type: str
    user: UserOut


class TokenData(BaseModel):
    """令牌数据模型"""
    username: str
    user_id: int
    role: str
    exp: datetime 