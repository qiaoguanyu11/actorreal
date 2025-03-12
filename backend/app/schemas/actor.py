from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal, Any
from datetime import datetime, date


# 基本信息模型
class ActorBasicBase(BaseModel):
    real_name: str
    stage_name: Optional[str] = None
    gender: str
    age: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    bust: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None


# 专业信息模型
class ActorProfessionalBase(BaseModel):
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[str]] = None
    education: Optional[List[str]] = None
    awards: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    current_rank: Optional[str] = None
    minimum_fee: Optional[float] = Field(None, description='接受最低片酬（元/天）', ge=0)


# 联系信息模型
class ActorContactBase(BaseModel):
    phone: Optional[str] = None
    wechat: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    email: Optional[str] = None


# 创建演员模型（包含基本信息）
class ActorCreate(ActorBasicBase):
    """
    演员创建模型
    """
    id: Optional[str] = None
    status: str = "active"
    user_id: Optional[int] = None
    
    # 专业信息
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[str]] = None
    education: Optional[List[str]] = None
    awards: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    current_rank: Optional[str] = None  # 允许任何字符串值
    minimum_fee: Optional[float] = None  # 接受最低片酬（金额）
    
    # 联系信息
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    wechat: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None


# 更新基本信息模型
class ActorBasicUpdate(BaseModel):
    real_name: Optional[str] = None
    stage_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    bust: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None


# 更新专业信息模型
class ActorProfessionalUpdate(ActorProfessionalBase):
    pass


# 更新联系信息模型
class ActorContactUpdate(ActorContactBase):
    pass


# 合同信息模型
class ActorContractInfoBase(BaseModel):
    fee_standard: Optional[str] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_terms: Optional[str] = None
    commission_rate: Optional[int] = None


# 创建/更新合同信息
class ActorContractInfoUpdate(ActorContractInfoBase):
    pass


# 经纪人归属设置
class ActorAgentAssignment(BaseModel):
    actor_id: str
    agent_id: int


# 演员输出模型（包含所有信息）
class ActorOut(BaseModel):
    id: str
    real_name: str
    stage_name: Optional[str] = None
    gender: str
    age: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    bust: Optional[int] = None
    waist: Optional[int] = None
    hip: Optional[int] = None
    status: str = "active"
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_id: Optional[int] = None
    
    # 专业信息
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[str]] = None
    education: Optional[List[str]] = None
    awards: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    current_rank: Optional[str] = None  # 目前咖位（主演，角色，特约，群演，无）
    minimum_fee: Optional[float] = None  # 接受最低片酬（金额）
    
    # 联系信息
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    wechat: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    
    # 合约信息
    contract_info: Optional[Dict[str, Any]] = None
    
    # 额外字段 - 仅用于计数结果
    total_count: Optional[int] = None
    
    class Config:
        from_attributes = True 