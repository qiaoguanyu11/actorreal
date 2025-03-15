from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.actor import Actor
from backend.app.schemas.actor import ActorContactUpdate, ActorOut

router = APIRouter()


@router.put("/{actor_id}/contact-info", response_model=ActorOut)
def update_actor_contact_info(
    actor_id: int, 
    contact_info: ActorContactUpdate, 
    db: Session = Depends(get_db)
):
    """
    更新演员联系信息
    """
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # 更新联系信息字段
    for key, value in contact_info.dict(exclude_unset=True).items():
        setattr(db_actor, key, value)
    
    db.commit()
    db.refresh(db_actor)
    return db_actor
