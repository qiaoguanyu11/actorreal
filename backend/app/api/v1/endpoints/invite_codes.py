from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import random
import string
import logging
import uuid
from datetime import datetime

from ....models.user import User
from ....schemas.invite_code import InviteCodeCreate, InviteCodeOut
from ....utils.db_utils import db_manager
from ...v1.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

def generate_invite_code() -> str:
    """生成6位数字邀请码"""
    return ''.join(random.choices(string.digits, k=6))

@router.get("/", response_model=List[InviteCodeOut])
def get_invite_codes(current_user: User = Depends(get_current_user)):
    """获取当前用户的邀请码列表"""
    try:
        invite_codes = db_manager.get_invite_codes(current_user.id)
        if invite_codes is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="获取邀请码列表失败"
            )
        return invite_codes
    except Exception as e:
        logger.error(f"获取邀请码列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取邀请码列表时出错: {str(e)}"
        )

@router.post("/", response_model=InviteCodeOut)
def create_invite_code(current_user: User = Depends(get_current_user)):
    """创建新的邀请码（仅限经纪人和管理员）"""
    try:
        # 检查用户权限
        if current_user.role not in ["manager", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有经纪人和管理员可以创建邀请码"
            )
            
        # 生成6位数字邀请码
        for _ in range(10):  # 最多尝试10次
            code = generate_invite_code()
            # 检查邀请码是否已存在
            if not db_manager.check_invite_code_exists(code):
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="无法生成唯一邀请码，请稍后重试"
            )
        
        # 保存到数据库
        result = db_manager.create_invite_code(code, current_user.id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建邀请码失败"
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建邀请码时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建邀请码时出错: {str(e)}"
        )

@router.delete("/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invite_code(
    code_id: str,
    current_user: User = Depends(get_current_user)
):
    """删除邀请码"""
    try:
        if current_user.role not in ["manager", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有经纪人和管理员可以删除邀请码"
            )
        
        invite_code = db_manager.get_invite_code(code_id)
        if not invite_code:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邀请码不存在或无权限删除"
            )
        
        if not db_manager.delete_invite_code(code_id):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除邀请码失败"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除邀请码时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除邀请码时出错: {str(e)}"
        )

@router.get("/verify/{code}", response_model=InviteCodeOut)
def verify_invite_code(code: str):
    """验证邀请码是否可用"""
    try:
        invite_code = db_manager.get_invite_code(code)
        
        if not invite_code:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邀请码无效"
            )
        
        if invite_code["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邀请码已被使用或已失效"
            )
        
        return invite_code
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"验证邀请码时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"验证邀请码时出错: {str(e)}"
        ) 