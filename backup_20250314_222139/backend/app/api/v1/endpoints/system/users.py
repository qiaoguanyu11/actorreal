from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserOut, UserUpdate
from backend.app.api.v1.dependencies import get_current_admin
from backend.app.core.security import get_password_hash

router = APIRouter()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    获取指定用户信息（管理员专用）
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    更新用户信息（管理员专用）
    """
    # 查找用户
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新用户名（如果提供）
    if user_data.username and user_data.username != db_user.username:
        # 检查用户名是否已存在
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已存在"
            )
        db_user.username = user_data.username
    
    # 更新邮箱（如果提供）
    if user_data.email and user_data.email != db_user.email:
        # 检查邮箱是否已存在
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing and existing.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册"
            )
        db_user.email = user_data.email
    
    # 更新密码（如果提供）
    if user_data.password:
        db_user.password_hash = get_password_hash(user_data.password)
    
    # 更新状态（如果提供）
    if user_data.status:
        # 防止将唯一管理员设为非活跃状态
        if db_user.role == "admin" and user_data.status != "active":
            # 检查是否还有其他活跃的管理员
            active_admins = db.query(User).filter(
                User.role == "admin",
                User.status == "active",
                User.id != user_id
            ).count()
            if active_admins == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="不能禁用唯一的管理员账户"
                )
        db_user.status = user_data.status
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", response_model=dict)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    删除用户（管理员专用）
    """
    # 查找用户
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 防止删除最后一个管理员
    if db_user.role == "admin":
        active_admins = db.query(User).filter(
            User.role == "admin",
            User.id != user_id
        ).count()
        if active_admins == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能删除唯一的管理员账户"
            )
    
    # 防止自删除
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账户"
        )
    
    # 删除用户
    db.delete(db_user)
    db.commit()
    
    return {"message": "用户已成功删除", "user_id": user_id}


@router.post("/{user_id}/ban", response_model=UserOut)
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    禁止用户（管理员专用）
    """
    # 查找用户
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 防止禁止最后一个管理员
    if db_user.role == "admin":
        active_admins = db.query(User).filter(
            User.role == "admin",
            User.status == "active",
            User.id != user_id
        ).count()
        if active_admins == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能禁止唯一的管理员账户"
            )
    
    # 防止自禁止
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能禁止自己的账户"
        )
    
    # 更新用户状态
    db_user.status = "banned"
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    激活用户（管理员专用）
    """
    # 查找用户
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 更新用户状态
    db_user.status = "active"
    db.commit()
    db.refresh(db_user)
    
    return db_user 