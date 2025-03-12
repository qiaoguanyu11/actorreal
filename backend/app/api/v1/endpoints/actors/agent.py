from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.actor import Actor, ActorContractInfo
from app.models.user import User
from app.schemas.actor import ActorAgentAssignment
from app.api.v1.dependencies import get_current_user

router = APIRouter()


@router.post("/assign-agent", response_model=dict)
def assign_actor_to_agent(
    assignment: ActorAgentAssignment, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    将演员归属于经纪人
    只有管理员或当前的经纪人可以修改演员归属
    """
    # 检查当前用户是否有权限
    if current_user.role != "admin" and current_user.id != assignment.agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员或者经纪人本人可以执行此操作"
        )
    
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == assignment.actor_id).first()
    if not actor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="演员不存在"
        )
    
    # 检查经纪人是否存在且具有经纪人角色
    agent = db.query(User).filter(User.id == assignment.agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="经纪人不存在"
        )
    if agent.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="指定的用户不是经纪人角色"
        )
    
    # 检查是否已存在合同信息
    contract_info = db.query(ActorContractInfo).filter(
        ActorContractInfo.actor_id == assignment.actor_id
    ).first()
    
    if contract_info:
        # 更新现有合同信息
        contract_info.agent_id = assignment.agent_id
    else:
        # 创建新的合同信息
        new_contract = ActorContractInfo(
            actor_id=assignment.actor_id,
            agent_id=assignment.agent_id
        )
        db.add(new_contract)
    
    db.commit()
    
    return {"message": "演员已成功归属于经纪人", "actor_id": assignment.actor_id, "agent_id": assignment.agent_id}


@router.get("/agent/{agent_id}/actors", response_model=List[dict])
def get_agent_actors(
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取某个经纪人旗下的所有演员
    """
    # 检查当前用户是否有权限
    if current_user.role != "admin" and current_user.id != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员或者经纪人本人可以查看此信息"
        )
    
    # 检查经纪人是否存在
    agent = db.query(User).filter(User.id == agent_id).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="经纪人不存在"
        )
    
    # 查询该经纪人旗下的所有演员
    contracts = db.query(ActorContractInfo).filter(ActorContractInfo.agent_id == agent_id).all()
    actor_ids = [contract.actor_id for contract in contracts]
    
    actors = db.query(Actor).filter(Actor.id.in_(actor_ids)).all()
    
    result = []
    for actor in actors:
        result.append({
            "id": actor.id,
            "real_name": actor.real_name,
            "stage_name": actor.stage_name,
            "gender": actor.gender,
            "age": actor.age,
            "status": actor.status
        })
    
    return result


@router.delete("/actor/{actor_id}/agent", response_model=dict)
def remove_actor_agent(
    actor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    移除演员与经纪人的关联
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="演员不存在"
        )
    
    # 检查合同信息
    contract_info = db.query(ActorContractInfo).filter(ActorContractInfo.actor_id == actor_id).first()
    if not contract_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="演员没有关联的经纪人"
        )
    
    # 检查权限
    if current_user.role != "admin" and current_user.id != contract_info.agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，只有管理员或经纪人本人可以解除关联"
        )
    
    # 移除经纪人关联（保留合同其他信息）
    contract_info.agent_id = None
    db.commit()
    
    return {"message": "已成功解除演员与经纪人的关联", "actor_id": actor_id} 