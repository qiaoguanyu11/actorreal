from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import datetime
import json
import logging
import traceback

from app.core.database import get_db
from app.models.actor import Actor, ActorProfessionalInfo, ActorContactInfo, ActorContractInfo
from app.models.user import User
from app.schemas.actor import ActorCreate, ActorBasicUpdate, ActorOut, ActorProfessionalUpdate, ActorContactUpdate
from app.api.v1.dependencies import get_current_user, get_current_user_optional

router = APIRouter()


@router.post("/", response_model=ActorOut, status_code=status.HTTP_201_CREATED)
def create_actor(
    actor: ActorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    agent_id: Optional[int] = None
):
    """
    创建演员基本信息
    
    - 如果是经纪人创建，自动将演员归属于该经纪人
    - 如果是管理员创建，可以指定归属的经纪人
    """
    # 记录接收到的请求数据
    try:
        logging.info(f"创建演员请求数据: {actor.model_dump()}")
        
        # 创建基本信息
        actor_data = actor.model_dump()
        
        # 将中文性别转换为英文
        gender_mapping = {
            '男': 'male',
            '女': 'female',
            '其他': 'other'
        }
        if actor_data.get('gender') in gender_mapping:
            actor_data['gender'] = gender_mapping[actor_data['gender']]
        
        # 提取专业信息和联系信息
        professional_info = {}
        contact_info = {}
        
        # 专业信息字段
        professional_fields = ['bio', 'skills', 'experience', 'education', 'awards', 'languages', 'current_rank', 'minimum_fee']
        for field in professional_fields:
            if field in actor_data:
                # 处理JSON字段
                if field in ['skills', 'experience', 'education', 'awards', 'languages'] and actor_data[field] is not None:
                    try:
                        professional_info[field] = json.dumps(actor_data[field], ensure_ascii=False)
                    except Exception as e:
                        logging.error(f"JSON序列化字段 {field} 失败: {str(e)}")
                        professional_info[field] = None
                else:
                    professional_info[field] = actor_data[field]
                actor_data.pop(field)
        
        # 联系信息字段
        contact_fields = ['phone', 'email', 'address', 'wechat', 'social_media', 'emergency_contact', 'emergency_phone']
        for field in contact_fields:
            if field in actor_data:
                # 处理JSON字段
                if field == 'social_media' and actor_data[field] is not None:
                    try:
                        contact_info[field] = json.dumps(actor_data[field], ensure_ascii=False)
                    except Exception as e:
                        logging.error(f"JSON序列化字段 {field} 失败: {str(e)}")
                        contact_info[field] = None
                else:
                    contact_info[field] = actor_data[field]
                actor_data.pop(field)
        
        # 生成唯一ID (如果没有提供)
        if not actor_data.get('id'):
            # 生成基于时间的ID: AC + 年月日 + 随机字符
            current_date = datetime.datetime.now().strftime('%Y%m%d')
            random_str = str(uuid.uuid4())[:8]  # 取前8位作为随机字符
            actor_data['id'] = f"AC{current_date}{random_str}"
        
        # 处理用户关联，如果提供了user_id
        if actor.user_id:
            # 验证用户是否存在
            user = db.query(User).filter(User.id == actor.user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="关联的用户不存在"
                )
        
        # 创建演员记录
        db_actor = Actor(**actor_data)
        db.add(db_actor)
        db.flush()  # 确保获取actor_id
        
        # 创建专业信息记录（如果有数据）
        if professional_info:
            professional_info['actor_id'] = db_actor.id
            db_professional = ActorProfessionalInfo(**professional_info)
            db.add(db_professional)
        
        # 创建联系信息记录（如果有数据）
        if contact_info:
            contact_info['actor_id'] = db_actor.id
            db_contact = ActorContactInfo(**contact_info)
            db.add(db_contact)
        
        # 处理经纪人关联
        if current_user.role == "manager":
            # 经纪人创建的演员自动归属于自己
            new_contract = ActorContractInfo(
                actor_id=db_actor.id,
                agent_id=current_user.id
            )
            db.add(new_contract)
        elif current_user.role == "admin" and agent_id:
            # 管理员可以指定归属的经纪人
            agent = db.query(User).filter(User.id == agent_id, User.role == "manager").first()
            if not agent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="指定的经纪人不存在或不是经纪人角色"
                )
            new_contract = ActorContractInfo(
                actor_id=db_actor.id,
                agent_id=agent_id
            )
            db.add(new_contract)
        
        db.commit()
        db.refresh(db_actor)
        
        # 构建返回结果，确保contract_info是字典形式
        result = db_actor.__dict__.copy()
        if '_sa_instance_state' in result:
            del result['_sa_instance_state']
            
        # 添加专业信息
        if professional_info:
            prof_obj = db.query(ActorProfessionalInfo).filter(ActorProfessionalInfo.actor_id == db_actor.id).first()
            if prof_obj:
                prof_dict = prof_obj.__dict__.copy()
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
        
        # 添加联系信息
        if contact_info:
            contact_obj = db.query(ActorContactInfo).filter(ActorContactInfo.actor_id == db_actor.id).first()
            if contact_obj:
                contact_dict = contact_obj.__dict__.copy()
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
        
        # 添加合约信息 - 确保以字典形式返回
        contract_obj = db.query(ActorContractInfo).filter(ActorContractInfo.actor_id == db_actor.id).first()
        if contract_obj:
            try:
                # 确保contract_info是一个对象而不是其他类型
                if hasattr(contract_obj, '__dict__'):
                    contract_dict = {
                        'agent_id': contract_obj.agent_id,
                        'fee_standard': contract_obj.fee_standard,
                        'contract_start_date': contract_obj.contract_start_date,
                        'contract_end_date': contract_obj.contract_end_date,
                        'contract_terms': contract_obj.contract_terms,
                        'commission_rate': contract_obj.commission_rate
                    }
                    
                    # 获取经纪人名称
                    if contract_obj.agent_id:
                        agent = db.query(User).filter(User.id == contract_obj.agent_id).first()
                        if agent:
                            contract_dict['agent_name'] = agent.username
                    
                    result['contract_info'] = contract_dict
                else:
                    # 如果contract_info不是对象，记录错误并设置为None
                    logging.error(f"contract_info不是对象类型: {type(contract_obj)}")
                    result['contract_info'] = None
            except Exception as e:
                # 如果转换失败，记录错误并设置为None
                logging.error(f"转换合约信息失败: {str(e)}")
                result['contract_info'] = None
        else:
            result['contract_info'] = None
            
        return result
    except Exception as e:
        logging.error(f"创建演员失败: {str(e)}")
        logging.error(traceback.format_exc())
        raise


@router.get("/without-agent", response_model=List[ActorOut])
async def list_actors_without_agent(
    skip: int = 0, 
    limit: int = 10, 
    name: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    height_min: Optional[int] = None,
    height_max: Optional[int] = None,
    count_only: bool = False,  # 添加count_only参数
    db: Session = Depends(get_db)
):
    """
    获取未签约经纪人的演员列表
    
    可选参数:
    - count_only: 如果为True，则只返回符合条件的记录数（用于分页）
    """
    # 查询所有已签约的演员ID
    contracted_actor_ids = db.query(ActorContractInfo.actor_id).filter(
        ActorContractInfo.agent_id.isnot(None)
    ).all()
    contracted_actor_ids = [actor_id for (actor_id,) in contracted_actor_ids]
    
    # 查询未签约的演员
    query = db.query(Actor).filter(~Actor.id.in_(contracted_actor_ids) if contracted_actor_ids else True)
    
    # 应用筛选条件
    if name:
        query = query.filter(Actor.real_name.like(f"%{name}%"))
    if age_min is not None:
        query = query.filter(Actor.age >= age_min)
    if age_max is not None:
        query = query.filter(Actor.age <= age_max)
    if height_min is not None:
        query = query.filter(Actor.height >= height_min)
    if height_max is not None:
        query = query.filter(Actor.height <= height_max)
    
    # 如果仅需计数，返回符合条件的记录总数
    if count_only:
        total_count = query.count()
        # 返回一个示例演员，但设置total_count属性
        sample_actor = {"id": "count", "real_name": "计数", "gender": "male", "status": "active", "total_count": total_count}
        return [sample_actor]
    
    # 确保limit有效（最小为1）
    if limit <= 0:
        # 如果limit=0，返回所有匹配的记录ID和总数量，而不是完整对象
        # 这用于获取总数而不传输大量数据
        if limit == 0:
            ids = query.with_entities(Actor.id).all()
            return [{"id": id[0]} for id in ids]
        else:
            limit = 100  # 对于其他无效值，设置一个合理的最大值
    
    actors = query.offset(skip).limit(limit).all()
    
    # 处理每个演员的合约信息，确保以字典形式返回
    result_actors = []
    for actor in actors:
        actor_dict = actor.__dict__.copy()
        if '_sa_instance_state' in actor_dict:
            del actor_dict['_sa_instance_state']
        
        # 这些演员没有经纪人，所以contract_info应该为null
        actor_dict['contract_info'] = None
        
        result_actors.append(actor_dict)
    
    return result_actors


@router.get("/", response_model=List[ActorOut])
def list_actors(
    skip: int = 0, 
    limit: int = 10, 
    name: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    height_min: Optional[int] = None,
    height_max: Optional[int] = None,
    user_id: Optional[int] = None,
    count_only: bool = False,  # 添加参数，仅返回计数
    db: Session = Depends(get_db)
):
    """
    获取演员列表
    
    可选过滤条件:
    - name: 姓名模糊搜索
    - age_min/age_max: 年龄范围
    - height_min/height_max: 身高范围
    - user_id: 关联的用户ID
    - count_only: 如果为True，则只返回符合条件的记录数（用于分页）
    """
    query = db.query(Actor)
    
    # 应用筛选条件
    if name:
        query = query.filter(Actor.real_name.like(f"%{name}%"))
    if age_min is not None:
        query = query.filter(Actor.age >= age_min)
    if age_max is not None:
        query = query.filter(Actor.age <= age_max)
    if height_min is not None:
        query = query.filter(Actor.height >= height_min)
    if height_max is not None:
        query = query.filter(Actor.height <= height_max)
    if user_id is not None:
        query = query.filter(Actor.user_id == user_id)
    
    # 如果仅需计数，返回符合条件的记录总数
    if count_only:
        total_count = query.count()
        # 返回一个示例演员，但设置total_count属性
        sample_actor = Actor(id="count", real_name="计数", gender="male", status="active")
        sample_dict = {"id": "count", "real_name": "计数", "gender": "male", "status": "active", "total_count": total_count}
        return [sample_dict]
    
    # 确保limit有效（最小为1）
    if limit <= 0:
        limit = 100  # 对于无效值，设置一个合理的最大值
    
    actors = query.offset(skip).limit(limit).all()
    
    # 处理每个演员的合约信息，确保以字典形式返回
    result_actors = []
    for actor in actors:
        actor_dict = actor.__dict__.copy()
        if '_sa_instance_state' in actor_dict:
            del actor_dict['_sa_instance_state']
        
        # 获取合约信息并转换为字典
        contract_info = db.query(ActorContractInfo).filter(ActorContractInfo.actor_id == actor.id).first()
        if contract_info:
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
            
            actor_dict['contract_info'] = contract_dict
        else:
            actor_dict['contract_info'] = None
        
        result_actors.append(actor_dict)
    
    return result_actors


@router.get("/{actor_id}", response_model=ActorOut)
def get_actor(actor_id: str, db: Session = Depends(get_db)):
    """
    获取演员详情
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 获取专业信息
    professional_info = db.query(ActorProfessionalInfo).filter(ActorProfessionalInfo.actor_id == actor_id).first()
    
    # 获取联系信息
    contact_info = db.query(ActorContactInfo).filter(ActorContactInfo.actor_id == actor_id).first()
    
    # 获取合约信息（经纪人信息）
    contract_info = db.query(ActorContractInfo).filter(ActorContractInfo.actor_id == actor_id).first()
    
    # 构建返回结果
    result = actor.__dict__.copy()
    if '_sa_instance_state' in result:
        del result['_sa_instance_state']
    
    # 添加专业信息
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
    
    # 添加联系信息
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
    
    # 添加合约信息 - 确保以字典形式返回
    try:
        if contract_info:
            try:
                # 确保contract_info是一个对象而不是其他类型
                if hasattr(contract_info, '__dict__'):
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
                    
                    result['contract_info'] = contract_dict
                else:
                    # 如果contract_info不是对象，记录错误并设置为None
                    logging.error(f"contract_info不是对象类型: {type(contract_info)}")
                    result['contract_info'] = None
            except Exception as e:
                # 如果转换失败，记录错误并设置为None
                logging.error(f"转换合约信息失败: {str(e)}")
                result['contract_info'] = None
        else:
            result['contract_info'] = None
    except Exception as e:
        # 如果整个处理过程失败，记录错误并设置为None
        logging.error(f"处理合约信息失败: {str(e)}")
        result['contract_info'] = None
    
    return result


@router.put("/{actor_id}/basic-info", response_model=ActorOut)
def update_actor_basic_info(
    actor_id: str, 
    actor_info: ActorBasicUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新演员基本信息
    
    权限:
    - 管理员可以更新任何演员
    - 经纪人可以更新自己管理的演员
    - 演员只能更新自己的信息
    """
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查
    if current_user.role == 'performer' and db_actor.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="您只能更新自己的演员信息"
        )
    
    # 如果是经纪人，检查是否是其管理的演员
    if current_user.role == 'manager':
        # 查询该演员的合约信息，确认经纪人关系
        contract_info = db.query(ActorContractInfo).filter(
            ActorContractInfo.actor_id == actor_id,
            ActorContractInfo.agent_id == current_user.id
        ).first()
        
        if not contract_info and not current_user.role == 'admin':
            raise HTTPException(
                status_code=403,
                detail="您没有权限更新该演员的信息"
            )
    
    # 更新非空字段
    for key, value in actor_info.model_dump(exclude_unset=True).items():
        setattr(db_actor, key, value)
    
    db.commit()
    db.refresh(db_actor)
    
    # 使用get_actor函数返回完整的演员信息，确保contract_info是字典类型
    return get_actor(actor_id, db)


@router.delete("/actors/{actor_id}", response_model=dict)
def delete_actor(actor_id: str, db: Session = Depends(get_db)):
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    
    # 保存ID用于返回
    actor_id = db_actor.id
    
    db.delete(db_actor)
    db.commit()
    
    return {"message": "演员已成功删除", "actor_id": actor_id}


@router.put("/{actor_id}/professional", response_model=ActorOut)
def update_actor_professional(
    actor_id: str,
    actor_professional: ActorProfessionalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新演员专业信息
    
    权限:
    - 管理员可以更新任何演员
    - 经纪人可以更新自己管理的演员
    - 演员只能更新自己的信息
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="您只能更新自己的演员信息"
        )
    
    # 如果是经纪人，检查是否是其管理的演员
    if current_user.role == 'manager':
        # 查询该演员的合约信息，确认经纪人关系
        contract_info = db.query(ActorContractInfo).filter(
            ActorContractInfo.actor_id == actor_id,
            ActorContractInfo.agent_id == current_user.id
        ).first()
        
        if not contract_info and not current_user.role == 'admin':
            raise HTTPException(
                status_code=403,
                detail="您没有权限更新该演员的信息"
            )
    
    # 检查专业信息是否存在
    professional_info = db.query(ActorProfessionalInfo).filter(ActorProfessionalInfo.actor_id == actor_id).first()
    
    # 准备数据
    professional_data = {}
    data = actor_professional.model_dump(exclude_unset=True)
    
    # 处理可能的JSON字段
    for key, value in data.items():
        if key in ['skills', 'experience', 'education', 'awards', 'languages'] and value is not None:
            professional_data[key] = json.dumps(value, ensure_ascii=False)
        else:
            professional_data[key] = value
    
    if professional_info:
        # 更新现有记录
        for key, value in professional_data.items():
            setattr(professional_info, key, value)
    else:
        # 创建新记录
        professional_data['actor_id'] = actor_id
        professional_info = ActorProfessionalInfo(**professional_data)
        db.add(professional_info)
    
    db.commit()
    
    # 返回完整的演员信息
    return get_actor(actor_id, db)


@router.put("/{actor_id}/contact", response_model=ActorOut)
def update_actor_contact(
    actor_id: str,
    actor_contact: ActorContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新演员联系信息
    
    权限:
    - 管理员可以更新任何演员
    - 经纪人可以更新自己管理的演员
    - 演员只能更新自己的信息
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="您只能更新自己的演员信息"
        )
    
    # 如果是经纪人，检查是否是其管理的演员
    if current_user.role == 'manager':
        # 查询该演员的合约信息，确认经纪人关系
        contract_info = db.query(ActorContractInfo).filter(
            ActorContractInfo.actor_id == actor_id,
            ActorContractInfo.agent_id == current_user.id
        ).first()
        
        if not contract_info and not current_user.role == 'admin':
            raise HTTPException(
                status_code=403,
                detail="您没有权限更新该演员的信息"
            )
    
    # 检查联系信息是否存在
    contact_info = db.query(ActorContactInfo).filter(ActorContactInfo.actor_id == actor_id).first()
    
    # 准备数据
    contact_data = {}
    data = actor_contact.model_dump(exclude_unset=True)
    
    # 处理可能的JSON字段
    for key, value in data.items():
        if key in ['social_media'] and value is not None:
            contact_data[key] = json.dumps(value, ensure_ascii=False)
        else:
            contact_data[key] = value
    
    if contact_info:
        # 更新现有记录
        for key, value in contact_data.items():
            setattr(contact_info, key, value)
    else:
        # 创建新记录
        contact_data['actor_id'] = actor_id
        contact_info = ActorContactInfo(**contact_data)
        db.add(contact_info)
    
    db.commit()
    
    # 返回完整的演员信息
    return get_actor(actor_id, db)


@router.post("/self-update", response_model=ActorOut, status_code=status.HTTP_201_CREATED)
def performer_update_self_info(
    actor: ActorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    演员自己上传/更新个人信息的API
    
    - 仅限于performer角色使用
    - 如果演员已有信息，则更新；如果没有，则创建
    - 不会影响经纪人关系
    """
    # 权限检查
    if current_user.role != "performer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有演员本人才能使用此API"
        )
    
    # 记录接收到的请求数据
    try:
        logging.info(f"演员自行更新信息请求数据: {actor.model_dump()}")
        
        # 创建基本信息
        actor_data = actor.model_dump()
        
        # 将中文性别转换为英文
        gender_mapping = {
            '男': 'male',
            '女': 'female',
            '其他': 'other'
        }
        if actor_data.get('gender') in gender_mapping:
            actor_data['gender'] = gender_mapping[actor_data['gender']]
        
        # 提取专业信息和联系信息
        professional_info = {}
        contact_info = {}
        
        # 专业信息字段
        professional_fields = ['bio', 'skills', 'experience', 'education', 'awards', 'languages', 'current_rank', 'minimum_fee']
        for field in professional_fields:
            if field in actor_data:
                # 处理JSON字段
                if field in ['skills', 'experience', 'education', 'awards', 'languages'] and actor_data[field] is not None:
                    try:
                        professional_info[field] = json.dumps(actor_data[field], ensure_ascii=False)
                    except Exception as e:
                        logging.error(f"JSON序列化字段 {field} 失败: {str(e)}")
                        professional_info[field] = None
                else:
                    professional_info[field] = actor_data[field]
                actor_data.pop(field)
        
        # 联系信息字段
        contact_fields = ['phone', 'email', 'address', 'wechat', 'social_media', 'emergency_contact', 'emergency_phone']
        for field in contact_fields:
            if field in actor_data:
                # 处理JSON字段
                if field == 'social_media' and actor_data[field] is not None:
                    try:
                        contact_info[field] = json.dumps(actor_data[field], ensure_ascii=False)
                    except Exception as e:
                        logging.error(f"JSON序列化字段 {field} 失败: {str(e)}")
                        contact_info[field] = None
                else:
                    contact_info[field] = actor_data[field]
                actor_data.pop(field)
                
        # 查找是否已经存在该用户关联的演员信息
        existing_actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
        
        if existing_actor:
            # 更新现有演员信息
            # 不更新ID和user_id字段
            if 'id' in actor_data:
                actor_data.pop('id')
            if 'user_id' in actor_data:
                actor_data.pop('user_id')
                
            # 更新基本信息
            for key, value in actor_data.items():
                if value is not None:  # 只更新非空字段
                    setattr(existing_actor, key, value)
            
            # 更新专业信息
            if professional_info:
                prof_obj = db.query(ActorProfessionalInfo).filter(ActorProfessionalInfo.actor_id == existing_actor.id).first()
                if prof_obj:
                    for key, value in professional_info.items():
                        if value is not None:  # 只更新非空字段
                            setattr(prof_obj, key, value)
                else:
                    professional_info['actor_id'] = existing_actor.id
                    db_professional = ActorProfessionalInfo(**professional_info)
                    db.add(db_professional)
            
            # 更新联系信息
            if contact_info:
                contact_obj = db.query(ActorContactInfo).filter(ActorContactInfo.actor_id == existing_actor.id).first()
                if contact_obj:
                    for key, value in contact_info.items():
                        if value is not None:  # 只更新非空字段
                            setattr(contact_obj, key, value)
                else:
                    contact_info['actor_id'] = existing_actor.id
                    db_contact = ActorContactInfo(**contact_info)
                    db.add(db_contact)
            
            # 不修改合同信息，保持与经纪人的关系不变
            db_actor = existing_actor
            
        else:
            # 创建新演员记录
            # 强制设置user_id为当前用户
            actor_data['user_id'] = current_user.id
            
            # 生成唯一ID (如果没有提供)
            if not actor_data.get('id'):
                # 生成基于时间的ID: AC + 年月日 + 随机字符
                current_date = datetime.datetime.now().strftime('%Y%m%d')
                random_str = str(uuid.uuid4())[:8]  # 取前8位作为随机字符
                actor_data['id'] = f"AC{current_date}{random_str}"
            
            # 创建演员记录
            db_actor = Actor(**actor_data)
            db.add(db_actor)
            db.flush()  # 确保获取actor_id
            
            # 创建专业信息记录（如果有数据）
            if professional_info:
                professional_info['actor_id'] = db_actor.id
                db_professional = ActorProfessionalInfo(**professional_info)
                db.add(db_professional)
            
            # 创建联系信息记录（如果有数据）
            if contact_info:
                contact_info['actor_id'] = db_actor.id
                db_contact = ActorContactInfo(**contact_info)
                db.add(db_contact)
                
            # 注意：不创建合同信息，由经纪人或管理员负责
        
        db.commit()
        db.refresh(db_actor)
        
        # 使用get_actor函数返回结果，确保contract_info是字典类型
        return get_actor(db_actor.id, db)
    
    except Exception as e:
        db.rollback()
        logging.error(f"演员自行更新信息失败: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"服务器内部错误: {str(e)}"
        )
