from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.models.user import User, UserPermission
from app.schemas.user import UserCreate, UserOut, Token, UserLogin, UserCreateManager, UserCreateAdmin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.v1.dependencies import get_current_user, get_current_admin
from app.utils.db_utils import db_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserOut)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    注册新用户（仅演员角色可以自主注册）
    """
    try:
        # 检查用户名是否已存在
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        
        # 检查邮箱是否已存在
        db_email = db.query(User).filter(User.email == user.email).first()
        if db_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册"
            )
        
        # 检查邀请码并获取经纪人信息
        invite_code_info = db_manager.get_invite_code_by_code(user.invite_code)
        if not invite_code_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的邀请码"
            )
        
        if invite_code_info['manager_role'] != 'manager':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邀请码关联的用户不是经纪人"
            )
        
        # 创建新用户
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            role="performer",
            status="active"
        )
        
        try:
            # 添加用户到数据库
            db.add(db_user)
            db.flush()  # 获取用户ID但不提交
            
            # 添加默认权限
            permissions = ["edit_self", "create_actor"]
            for perm in permissions:
                db_perm = UserPermission(user_id=db_user.id, permission=perm)
                db.add(db_perm)
            
            # 创建演员资料
            from app.models.actor import Actor, ActorProfessionalInfo, ActorContactInfo
            import uuid
            import datetime
            
            # 生成演员ID
            current_date = datetime.datetime.now().strftime('%Y%m%d')
            random_str = str(uuid.uuid4())[:8]
            actor_id = f"AC{current_date}{random_str}"
            
            # 创建演员基本信息
            db_actor = Actor(
                id=actor_id,
                user_id=db_user.id,
                real_name=user.username,
                gender='other',
                status='active',
                manager_id=invite_code_info['manager_id']
            )
            db.add(db_actor)
            
            # 创建演员专业信息
            db_professional = ActorProfessionalInfo(actor_id=actor_id)
            db.add(db_professional)
            
            # 创建演员联系信息
            db_contact = ActorContactInfo(actor_id=actor_id, email=user.email)
            db.add(db_contact)
            
            # 提交所有更改
            db.commit()
            db.refresh(db_user)
            
            return db_user
            
        except Exception as e:
            db.rollback()
            logger.error(f"创建用户时出错: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建用户失败，请稍后重试"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"注册过程中出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="注册失败，请稍后重试"
        )


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    用户登录
    """
    # 查找用户
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 验证密码
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查用户状态
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )
    
    # 创建访问令牌
    token_data = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    
    # 预加载权限
    db.refresh(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login/json", response_model=Token)
def login_json(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    用户登录（JSON格式）
    """
    # 查找用户
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 验证密码
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查用户状态
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用",
        )
    
    # 创建访问令牌
    token_data = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role,
    }
    access_token = create_access_token(token_data)
    
    # 预加载权限
    db.refresh(user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/users/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    获取当前登录用户信息
    """
    return current_user


@router.post("/admin/create-manager", response_model=UserOut)
def create_manager(
    user: UserCreateManager,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    创建经纪人账号（管理员专用）
    """
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在
    db_email = db.query(User).filter(User.email == user.email).first()
    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 哈希密码
    hashed_password = get_password_hash(user.password)
    
    # 创建经纪人用户
    db_user = User(
        username=user.username,
        email=user.email,
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


@router.post("/admin/create-admin", response_model=UserOut)
def create_admin(
    user: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    创建管理员账号（管理员专用）
    """
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在
    db_email = db.query(User).filter(User.email == user.email).first()
    if db_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 哈希密码
    hashed_password = get_password_hash(user.password)
    
    # 创建管理员用户
    db_user = User(
        username=user.username,
        email=user.email,
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


@router.get("/users", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    count_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    获取用户列表（管理员专用）
    可以通过role参数筛选特定角色的用户
    
    可选参数:
    - count_only: 如果为True，则只返回符合条件的记录数（用于分页）
    """
    query = db.query(User)
    
    # 如果指定了角色，按角色筛选
    if role:
        query = query.filter(User.role == role)

    # 如果仅需计数，返回符合条件的记录总数
    if count_only:
        total_count = query.count()
        # 返回一个示例用户，但设置total_count属性
        return [{"id": -1, "username": "count", "email": "count@example.com", "role": "none", "status": "active", "total_count": total_count}]
        
    # 应用分页
    users = query.offset(skip).limit(limit).all()
    return users 