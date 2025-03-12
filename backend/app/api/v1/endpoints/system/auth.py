from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.user import User, UserPermission
from app.schemas.user import UserCreate, UserOut, Token, UserLogin, UserCreateManager, UserCreateAdmin
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.v1.dependencies import get_current_user, get_current_admin

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    注册新用户（仅演员角色可以自主注册）
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
    
    # 创建新用户（仅演员角色）
    if user.role != "performer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="通过此API只能注册普通用户账号"
        )
    
    # 哈希密码
    hashed_password = get_password_hash(user.password)
    
    # 创建用户
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        status="active"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 添加默认权限
    default_permissions = ["edit_self", "create_actor"]
    for perm in default_permissions:
        db_perm = UserPermission(user_id=db_user.id, permission=perm)
        db.add(db_perm)
    db.commit()
    
    # 演员角色自动创建关联的演员资料
    if user.role == "performer":
        from app.models.actor import Actor, ActorProfessionalInfo, ActorContactInfo
        import uuid
        import datetime
        
        # 生成唯一ID
        current_date = datetime.datetime.now().strftime('%Y%m%d')
        random_str = str(uuid.uuid4())[:8]  # 取前8位作为随机字符
        actor_id = f"AC{current_date}{random_str}"
        
        # 创建基本演员信息
        db_actor = Actor(
            id=actor_id,
            user_id=db_user.id,
            real_name=user.username,  # 默认使用用户名作为真实姓名
            gender='other',  # 默认性别为"其他"
            status='active'
        )
        db.add(db_actor)
        
        # 创建空的专业信息
        db_professional = ActorProfessionalInfo(actor_id=actor_id)
        db.add(db_professional)
        
        # 创建空的联系信息，但设置默认的邮箱
        db_contact = ActorContactInfo(actor_id=actor_id, email=user.email)
        db.add(db_contact)
        
        db.commit()
    
    return db_user


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
        sample_user = {"id": -1, "username": "count", "email": "count@example.com", "role": "none", "total_count": total_count}
        return [sample_user]
        
    # 应用分页
    users = query.offset(skip).limit(limit).all()
    return users 