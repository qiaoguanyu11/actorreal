from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from sqlalchemy import func

from app.core.database import get_db
from app.models.actor import Actor
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagOut, TagUpdate, ActorTagsUpdate, ActorTagsOut
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


# 标签统计API
@router.get("/count/tags", response_model=Dict[str, int])
def count_tags(db: Session = Depends(get_db)):
    """
    获取标签统计信息
    """
    # 统计每个标签被使用的次数
    tag_counts = db.query(
        Tag.id, 
        Tag.name, 
        func.count(Actor.id).label('count')
    ).join(
        Actor.tags
    ).group_by(
        Tag.id
    ).all()
    
    # 构建结果
    result = {}
    for tag_id, tag_name, count in tag_counts:
        result[str(tag_id)] = count
    
    return result


# 标签基础API
@router.get("", response_model=List[TagOut])
def get_tags(
    category: Optional[str] = None,
    sort_by: str = "name",
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    """
    获取所有标签
    """
    query = db.query(Tag)
    
    # 应用筛选
    if category:
        query = query.filter(Tag.category == category)
    
    # 应用排序
    if sort_desc:
        query = query.order_by(getattr(Tag, sort_by).desc())
    else:
        query = query.order_by(getattr(Tag, sort_by))
    
    return query.all()


@router.post("", response_model=TagOut)
def create_tag(
    tag: TagCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    创建新标签（管理员专用）
    """
    db_tag = Tag(**tag.dict())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.put("/{tag_id}", response_model=TagOut)
def update_tag(tag_id: int, tag: TagUpdate, db: Session = Depends(get_db)):
    """
    更新标签
    """
    db_tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    for key, value in tag.dict(exclude_unset=True).items():
        setattr(db_tag, key, value)
    
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/{tag_id}", response_model=TagOut)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """
    删除标签
    """
    db_tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not db_tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    db.delete(db_tag)
    db.commit()
    return db_tag


# 演员标签关联API
@router.get("/{actor_id}/tags", response_model=ActorTagsOut)
def get_actor_tags(actor_id: str, db: Session = Depends(get_db)):
    """
    获取演员的所有标签
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    return {
        "actor_id": actor.id,
        "actor_name": actor.real_name,
        "tags": actor.tags
    }


@router.put("/{actor_id}/tags", response_model=ActorTagsOut)
def update_actor_tags(actor_id: str, tags_data: ActorTagsUpdate, db: Session = Depends(get_db)):
    """
    更新演员的标签
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 获取所有指定的标签
    tags = db.query(Tag).filter(Tag.id.in_(tags_data.tags)).all()
    if len(tags) != len(tags_data.tags):
        raise HTTPException(status_code=400, detail="部分标签不存在")
    
    # 更新演员的标签
    actor.tags = tags
    db.commit()
    
    return {
        "actor_id": actor.id,
        "actor_name": actor.real_name,
        "tags": actor.tags
    }


@router.post("/{actor_id}/tags", response_model=ActorTagsOut)
def add_actor_tags(
    actor_id: str, 
    tag_ids: List[int] = Query(..., description="标签ID列表"), 
    db: Session = Depends(get_db)
):
    """
    添加演员标签
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 获取所有指定的标签
    new_tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    if len(new_tags) != len(tag_ids):
        raise HTTPException(status_code=400, detail="部分标签不存在")
    
    # 添加新标签（不重复添加）
    current_tag_ids = [tag.id for tag in actor.tags]
    for tag in new_tags:
        if tag.id not in current_tag_ids:
            actor.tags.append(tag)
    
    db.commit()
    
    return {
        "actor_id": actor.id,
        "actor_name": actor.real_name,
        "tags": actor.tags
    }


@router.delete("/{actor_id}/tags/{tag_id}", response_model=ActorTagsOut)
def delete_actor_tag(actor_id: str, tag_id: int, db: Session = Depends(get_db)):
    """
    删除演员标签
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    # 检查演员是否有此标签
    if tag not in actor.tags:
        raise HTTPException(status_code=400, detail="演员没有此标签")
    
    # 移除标签
    actor.tags.remove(tag)
    db.commit()
    
    return {
        "actor_id": actor.id,
        "actor_name": actor.real_name,
        "tags": actor.tags
    }


# 根据标签搜索演员
@router.get("/search", response_model=List[dict])
def search_actors_by_tags(
    tag_ids: List[int] = Query(..., description="标签ID列表"),
    db: Session = Depends(get_db)
):
    """根据标签搜索演员"""
    # 查询同时拥有所有指定标签的演员
    actors = db.query(Actor).filter(
        Actor.tags.any(Tag.id.in_(tag_ids))
    ).all()
    
    return [{
        "id": actor.id,
        "real_name": actor.real_name,
        "stage_name": actor.stage_name,
        "tags": [{"id": tag.id, "name": tag.name} for tag in actor.tags]
    } for actor in actors]
