from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
import logging
import uuid
import datetime
import traceback

from app.core.database import get_db
from app.models.user import User, UserPermission
from app.models.actor import Actor, ActorProfessionalInfo, ActorContactInfo
from app.schemas.user import UserCreate, UserOut, UserCreateManager, UserCreateAdmin
from app.core.security import get_password_hash
from app.api.v1.dependencies import get_current_admin
from app.utils.db_utils import db_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/performer", response_model=UserOut)
async def register_performer(user: UserCreate, db: Session = Depends(get_db)):
    """
    注册新演员用户
    """
    try:
        # 检查用户名是否已存在
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        
        # 检查手机号是否已存在
        db_phone = db.query(User).filter(User.phone == user.phone).first()
        if db_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号已被注册"
            )
        
        # 检查邀请码并获取经纪人信息
        invite_code_info = db_manager.get_invite_code_by_code(user.invite_code)
        if not invite_code_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的邀请码"
            )
        
        # 获取经纪人信息
        agent = db.query(User).filter(User.id == invite_code_info['agent_id']).first()
        if not agent or agent.role != 'manager':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邀请码关联的用户不是经纪人"
            )
        
        # 创建新用户
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username,
            phone=user.phone,
            password_hash=hashed_password,
            role="performer",
            status="active"
        )
        
        try:
            # 添加用户到数据库
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            # 添加默认权限
            permissions = ["edit_self", "view_self"]
            for perm in permissions:
                db_perm = UserPermission(user_id=db_user.id, permission=perm)
                db.add(db_perm)
            db.commit()
            
            # 更新邀请码状态，添加邀请码用户关联
            invite_code_result = db_manager.add_invite_code_user(user.invite_code, db_user.id)
            
            if not invite_code_result:
                logger.error(f"添加邀请码用户关联失败。用户ID: {db_user.id}, 邀请码: {user.invite_code}")
                # 即使邀请码关联失败，仍然允许用户注册成功，但记录错误日志
            else:
                logger.info(f"用户 {db_user.username}(ID:{db_user.id}) 成功关联到邀请码 {user.invite_code}")
            
            return db_user
            
        except Exception as e:
            db.rollback()
            logger.error(f"创建用户时出错: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建用户失败，请稍后重试"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"注册过程中出错: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请稍后重试"
        )


@router.post("/manager", response_model=UserOut)
def register_manager(
    user: UserCreateManager,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    注册经纪人账号（管理员专用）
    """
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查手机号是否已存在
    db_phone = db.query(User).filter(User.phone == user.phone).first()
    if db_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="手机号已被注册"
        )
    
    # 哈希密码
    hashed_password = get_password_hash(user.password)
    
    # 创建经纪人用户
    db_user = User(
        username=user.username,
        phone=user.phone,
        password_hash=hashed_password,
        role="manager",
        status="active"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 添加经纪人默认权限
    manager_permissions = ["edit_self", "create_actor", "edit_actor", "assign_actor", "view_actor_detail"]
    for perm in manager_permissions:
        db_perm = UserPermission(user_id=db_user.id, permission=perm)
        db.add(db_perm)
    db.commit()
    
    return db_user


@router.post("/admin", response_model=UserOut)
def register_admin(
    user: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    注册管理员账号（管理员专用）
    """
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查手机号是否已存在
    db_phone = db.query(User).filter(User.phone == user.phone).first()
    if db_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="手机号已被注册"
        )
    
    # 哈希密码
    hashed_password = get_password_hash(user.password)
    
    # 创建管理员用户
    db_user = User(
        username=user.username,
        phone=user.phone,
        password_hash=hashed_password,
        role="admin",
        status="active"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 添加管理员默认权限
    admin_permissions = [
        "manage_users", "create_actor", "edit_actor", "delete_actor", 
        "view_all_actors", "assign_actor", "create_manager"
    ]
    for perm in admin_permissions:
        db_perm = UserPermission(user_id=db_user.id, permission=perm)
        db.add(db_perm)
    db.commit()
    
    return db_user 