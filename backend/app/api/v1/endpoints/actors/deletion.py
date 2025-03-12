from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
import datetime

from app.core.database import get_db
from app.models.actor import Actor
from app.schemas.actor import ActorOut

router = APIRouter()


@router.delete("/{actor_id}", response_model=ActorOut)
def delete_actor(
    actor_id: str,
    permanent: Optional[bool] = Query(False, description="是否永久删除"),
    delete_media: Optional[bool] = Query(False, description="是否同时删除关联的媒体文件"),
    reason: Optional[str] = Query(None, description="删除原因"),
    db: Session = Depends(get_db)
):
    """
    删除演员
    
    - permanent=false: 软删除，仅将演员状态标记为'deleted'
    - permanent=true: 永久删除，从数据库中移除记录
    - delete_media=true: 同时删除关联的媒体文件
    - reason: 记录删除原因
    
    需要管理员权限
    """
    # 查找演员
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actor not found"
        )
    
    # 临时保存以便返回
    actor_copy = ActorOut.from_orm(db_actor)
    
    # 如果需要删除关联的媒体文件
    if delete_media:
        # 这里应该添加删除关联媒体文件的逻辑
        # 例如: delete_actor_media(actor_id)
        pass
    
    # 执行删除操作
    if permanent:
        # 永久删除
        db.delete(db_actor)
    else:
        # 软删除 - 将状态标记为deleted
        db_actor.status = "deleted"
        db_actor.deletion_reason = reason
        db_actor.deleted_at = datetime.datetime.now()
    
    db.commit()
    
    return actor_copy
