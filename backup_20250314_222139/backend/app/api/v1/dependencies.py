from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models.user import User
from backend.app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/system/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    获取当前用户（基于JWT）
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证凭据",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭据",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="用户已被禁用",
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"无效的认证凭据: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# 临时解决方案：跳过身份验证的依赖函数
async def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    获取当前用户（可选）
    """
    if token is None:
        return None
    
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if username is None:
            return None
        
        user = db.query(User).filter(User.username == username, User.status == "active").first()
        return user
    except:
        return None

def get_current_performer(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    验证当前用户是否为演员（普通用户）
    """
    if current_user.role != "performer" and current_user.role != "manager" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要演员权限"
        )
    return current_user

def get_current_manager(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    验证当前用户是否为经纪人
    """
    if current_user.role != "manager" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要经纪人权限"
        )
    return current_user

def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    验证当前用户是否为管理员
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要管理员权限"
        )
    return current_user 