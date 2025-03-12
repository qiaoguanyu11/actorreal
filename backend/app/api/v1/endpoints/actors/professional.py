from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.actor import Actor
from app.schemas.actor import ActorProfessionalUpdate, ActorOut

router = APIRouter()


@router.put("/{actor_id}/professional-info", response_model=ActorOut)
def update_actor_professional_info(
    actor_id: int, 
    professional_info: ActorProfessionalUpdate, 
    db: Session = Depends(get_db)
):
    """
    更新演员专业信息
    """
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # 更新专业信息字段
    for key, value in professional_info.dict(exclude_unset=True).items():
        setattr(db_actor, key, value)
    
    db.commit()
    db.refresh(db_actor)
    return db_actor
