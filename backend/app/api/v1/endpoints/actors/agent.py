from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.actor import Actor, ActorContractInfo, ActorProfessionalInfo, ActorContactInfo
from app.models.user import User
from app.schemas.actor import ActorAgentAssignment, ActorContractInfoUpdate, ActorOut
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


@router.put("/{actor_id}/contract", response_model=ActorOut)
def update_actor_contract(
    actor_id: str,
    contract_data: ActorContractInfoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新演员合同信息
    
    权限:
    - 管理员可以更新任何演员的合同
    - 经纪人只能更新自己管理的演员的合同
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="演员不存在"
        )
    
    # 检查合同信息是否存在
    contract_info = db.query(ActorContractInfo).filter(ActorContractInfo.actor_id == actor_id).first()
    
    # 权限检查
    if current_user.role != "admin":
        if current_user.role != "manager":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有管理员或经纪人可以更新合同信息"
            )
        
        # 如果是经纪人，检查是否是其管理的演员
        if not contract_info or contract_info.agent_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您没有权限更新该演员的合同信息"
            )
    
    # 准备更新数据
    update_data = contract_data.model_dump(exclude_unset=True)
    
    if contract_info:
        # 更新现有合同信息
        for key, value in update_data.items():
            setattr(contract_info, key, value)
    else:
        # 创建新的合同信息
        update_data['actor_id'] = actor_id
        contract_info = ActorContractInfo(**update_data)
        db.add(contract_info)
    
    db.commit()
    db.refresh(contract_info)
    
    try:
        # 手动构建完整的演员信息响应
        import json
        import logging
        
        # 1. 获取演员基本信息
        result = actor.__dict__.copy()
        if '_sa_instance_state' in result:
            del result['_sa_instance_state']
        
        # 2. 获取专业信息
        professional_info = db.query(ActorProfessionalInfo).filter(ActorProfessionalInfo.actor_id == actor_id).first()
        if professional_info:
            prof_dict = professional_info.__dict__.copy()
            if '_sa_instance_state' in prof_dict:
                del prof_dict['_sa_instance_state']
            
            # 处理JSON字段
            json_fields = ['skills', 'experience', 'education', 'awards', 'languages']
            for field in json_fields:
                if field in prof_dict and prof_dict[field]:
                    try:
                        result[field] = json.loads(prof_dict[field])
                    except json.JSONDecodeError:
                        result[field] = prof_dict[field]
                else:
                    result[field] = None
            
            # 添加非JSON字段
            for key, value in prof_dict.items():
                if key not in json_fields and key not in ('id', 'actor_id', 'created_at', 'updated_at'):
                    result[key] = value
        
        # 3. 获取联系信息
        contact_info = db.query(ActorContactInfo).filter(ActorContactInfo.actor_id == actor_id).first()
        if contact_info:
            contact_dict = contact_info.__dict__.copy()
            if '_sa_instance_state' in contact_dict:
                del contact_dict['_sa_instance_state']
            
            # 处理JSON字段
            if 'social_media' in contact_dict and contact_dict['social_media']:
                try:
                    result['social_media'] = json.loads(contact_dict['social_media'])
                except json.JSONDecodeError:
                    result['social_media'] = contact_dict['social_media']
            else:
                result['social_media'] = None
            
            # 添加非JSON字段
            for key, value in contact_dict.items():
                if key != 'social_media' and key not in ('id', 'actor_id', 'created_at', 'updated_at'):
                    result[key] = value
        
        # 4. 手动将contract_info转换为字典
        contract_dict = {
            'agent_id': contract_info.agent_id,
            'fee_standard': contract_info.fee_standard,
            'contract_start_date': contract_info.contract_start_date,
            'contract_end_date': contract_info.contract_end_date,
            'contract_terms': contract_info.contract_terms,
            'commission_rate': contract_info.commission_rate
        }
        
        # 获取经纪人名称
        if contract_info.agent_id:
            agent = db.query(User).filter(User.id == contract_info.agent_id).first()
            if agent:
                contract_dict['agent_name'] = agent.username
        
        # 设置contract_info为字典
        result['contract_info'] = contract_dict
        
        return result
    except Exception as e:
        logging.error(f"更新演员合同信息失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器内部错误: {str(e)}"
        ) 