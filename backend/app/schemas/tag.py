from pydantic import BaseModel
from typing import Optional, List


class TagBase(BaseModel):
    name: str
    category: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    name: Optional[str] = None


class TagOut(TagBase):
    id: int
    
    class Config:
        orm_mode = True


# 演员标签关联模型
class ActorTagsUpdate(BaseModel):
    tags: List[int]  # 标签ID列表


# 演员标签输出模型
class ActorTagsOut(BaseModel):
    actor_id: str  # 修改为字符串类型，因为演员ID是字符串格式
    actor_name: str
    tags: List[TagOut]
    
    class Config:
        orm_mode = True 