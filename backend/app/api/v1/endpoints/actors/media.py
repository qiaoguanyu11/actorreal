from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Header
from typing import List, Optional, Dict
from pathlib import Path
import aiofiles
import os
import uuid
import magic
from datetime import datetime
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
import tempfile

from ...dependencies import get_current_user, get_current_user_optional
from app.models.actor import Actor
from app.models.media import ActorMedia
from app.models.user import User
from app.core.config import settings
from app.core.database import get_db
from app.utils.file_utils import (
    validate_file_type, 
    compress_image, 
    create_thumbnail, 
    create_video_thumbnail,
    upload_file_to_minio
)
from app.schemas.media import MediaResponse, MediaList

# 配置日志记录器
logger = logging.getLogger(__name__)

router = APIRouter()
# 创建一个单独的路由器用于演员自己的媒体API
self_router = APIRouter()  # 移除dependencies参数，改为每个端点单独定义

# 文件类型和大小限制
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp', 'video/x-matroska']
MAX_AVATAR_SIZE = 10 * 1024 * 1024  # 10MB
MAX_PHOTO_SIZE = 10 * 1024 * 1024   # 10MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
MAX_PHOTOS_COUNT = 50
MAX_VIDEOS_COUNT = 20

@router.post("/{actor_id}/media/avatar", response_model=dict)
async def upload_avatar(
    actor_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # 启用身份验证
    db: Session = Depends(get_db)
):
    """上传演员头像
    
    支持所有主流设备上传:
    - 电脑: Windows/Mac/Linux
    - 手机: iOS/Android/HarmonyOS
    
    文件限制:
    - 大小: 最大10MB
    - 格式: JPG, PNG, GIF, WebP, HEIC, HEIF
    - 数量: 每个演员只能有一个头像
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查：管理员可以上传任何演员的媒体，演员只能上传自己的媒体
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限上传此演员的媒体资料")
    
    # 验证文件类型
    if not file.filename:
        raise HTTPException(status_code=400, detail="无效的文件")
    
    mime_type = validate_file_type(file.filename, ALLOWED_IMAGE_TYPES)
    if not mime_type:
        raise HTTPException(status_code=400, detail="不支持的文件类型，仅支持JPG、PNG、GIF和WEBP格式图片")
    
    # 保存文件到临时目录
    file_extension = os.path.splitext(file.filename)[1]
    temp_filename = f"{uuid.uuid4()}{file_extension}"
    temp_filepath = os.path.join(settings.MEDIA_ROOT, temp_filename)
    
    os.makedirs(os.path.dirname(temp_filepath), exist_ok=True)
    
    # 异步写入文件
    async with aiofiles.open(temp_filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # 获取文件大小
    file_size = os.path.getsize(temp_filepath)
    
    try:
        # 获取现有头像
        existing_avatar = db.query(ActorMedia).filter(
            ActorMedia.actor_id == actor_id,
            ActorMedia.type == "avatar"
        ).first()
        
        # 如果存在则删除
        if existing_avatar:
            # 删除存储的文件
            try:
                if settings.USE_MINIO:
                    minio_client = create_minio_client()
                    if existing_avatar.bucket_name and existing_avatar.object_name:
                        minio_client.remove_object(existing_avatar.bucket_name, existing_avatar.object_name)
                else:
                    avatar_path = Path(settings.UPLOAD_DIR) / "avatars" / actor_id / existing_avatar.file_name
                    if avatar_path.exists():
                        avatar_path.unlink()
            except Exception as e:
                logger.error(f"删除旧头像失败: {str(e)}")
            
            # 删除数据库记录
            db.delete(existing_avatar)
        
        # 压缩图片
        compressed_filepath = await compress_image(temp_filepath)
        
        # 上传到MinIO
        object_name = f"avatars/{actor_id}/{os.path.basename(compressed_filepath)}"
        bucket_name = "actor-avatars"
        
        file_url = await upload_file_to_minio(compressed_filepath, bucket_name, object_name)
        
        # 更新数据库
        media = ActorMedia(
            actor_id=actor_id,
            type="avatar",
            file_name=os.path.basename(compressed_filepath),
            file_path=file_url,
            file_size=file_size,
            mime_type=mime_type,
            is_public=True,
            bucket_name=bucket_name,
            object_name=object_name,
            uploaded_by=None
        )
        db.add(media)
        db.commit()
        db.refresh(media)
        
        # 更新演员头像URL
        actor.avatar_url = file_url
        db.commit()
        
        return {
            "id": media.id,
            "url": file_url,
            "file_name": media.file_name,
            "file_size": media.file_size,
            "mime_type": media.mime_type,
            "uploaded_at": media.created_at
        }
    
    except Exception as e:
        # 发生错误时删除临时文件
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=f"上传文件失败: {str(e)}")
    
    finally:
        # 删除临时文件
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@router.post("/{actor_id}/media/photos", response_model=List[dict])
async def upload_photos(
    actor_id: str,
    files: List[UploadFile] = File(...),
    album: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),  # 启用身份验证
    db: Session = Depends(get_db)
):
    """上传演员照片
    
    支持所有主流设备上传:
    - 电脑: Windows/Mac/Linux
    - 手机: iOS/Android/HarmonyOS
    
    文件限制:
    - 大小: 每张最大10MB
    - 格式: JPG, PNG, GIF, WebP, HEIC, HEIF
    - 数量: 每次最多上传10张
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查：管理员可以上传任何演员的媒体，演员只能上传自己的媒体
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限上传此演员的媒体资料")
    
    # 获取当前照片数量
    current_photos_count = db.query(ActorMedia).filter(ActorMedia.actor_id == actor_id, ActorMedia.type == "photo").count()
    if current_photos_count + len(files) > MAX_PHOTOS_COUNT:
        raise HTTPException(status_code=400, detail=f"照片数量超过限制，每个演员最多允许{MAX_PHOTOS_COUNT}张照片")
    
    result = []
    for file in files:
        if not file.filename:
            continue
        
        # 验证文件类型
        mime_type = validate_file_type(file.filename, ALLOWED_IMAGE_TYPES)
        if not mime_type:
            continue
        
        # 保存文件到临时目录
        file_extension = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{file_extension}"
        temp_filepath = os.path.join(settings.MEDIA_ROOT, temp_filename)
        
        os.makedirs(os.path.dirname(temp_filepath), exist_ok=True)
        
        # 异步写入文件
        async with aiofiles.open(temp_filepath, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # 获取文件大小
        file_size = os.path.getsize(temp_filepath)
        
        try:
            # 压缩图片
            compressed_filepath = await compress_image(temp_filepath)
            
            # 生成缩略图
            thumbnail_filepath = await create_thumbnail(compressed_filepath)
            
            # 上传到MinIO
            album_path = f"{album}/" if album else ""
            object_name = f"photos/{actor_id}/{album_path}{os.path.basename(compressed_filepath)}"
            bucket_name = "actor-photos"
            
            # 上传原图
            file_url = await upload_file_to_minio(compressed_filepath, bucket_name, object_name)
            
            # 上传缩略图
            thumbnail_object_name = f"thumbnails/{actor_id}/{album_path}{os.path.basename(thumbnail_filepath)}"
            thumbnail_url = await upload_file_to_minio(thumbnail_filepath, bucket_name, thumbnail_object_name)
            
            # 更新数据库
            media = ActorMedia(
                actor_id=actor_id,
                type="photo",
                file_name=os.path.basename(compressed_filepath),
                file_path=file_url,
                file_size=file_size,
                mime_type=mime_type,
                description=album,  # 使用album作为description存储
                is_public=True,
                bucket_name=bucket_name,
                object_name=object_name,
                uploaded_by=None
            )
            db.add(media)
            db.commit()
            db.refresh(media)
            
            result.append({
                "id": media.id,
                "url": file_url,
                "thumbnail_url": thumbnail_url,
                "file_name": media.file_name,
                "file_size": media.file_size,
                "mime_type": media.mime_type,
                "album": album,
                "uploaded_at": media.created_at
            })
            
        except Exception as e:
            # 发生错误时删除临时文件
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            continue
        
        finally:
            # 删除临时文件
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
    
    if not result:
        raise HTTPException(status_code=400, detail="没有成功上传的照片")
    
    return result

@router.post("/{actor_id}/media/videos", response_model=List[dict])
async def upload_videos(
    actor_id: str,
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),  # 启用身份验证
    db: Session = Depends(get_db)
):
    """上传演员视频
    
    支持所有主流设备上传:
    - 电脑: Windows/Mac/Linux
    - 手机: iOS/Android/HarmonyOS
    
    文件限制:
    - 大小: 每个最大100MB
    - 格式: MP4, MOV, AVI, 3GP, MKV
    - 数量: 每次最多上传5个
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查：管理员可以上传任何演员的媒体，演员只能上传自己的媒体
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限上传此演员的媒体资料")
    
    # 获取当前视频数量
    current_videos_count = db.query(ActorMedia).filter(ActorMedia.actor_id == actor_id, ActorMedia.type == "video").count()
    if current_videos_count + len(files) > MAX_VIDEOS_COUNT:
        raise HTTPException(status_code=400, detail=f"视频数量超过限制，每个演员最多允许{MAX_VIDEOS_COUNT}个视频")
    
    result = []
    for file in files:
        if not file.filename:
            continue
        
        # 验证文件类型
        mime_type = validate_file_type(file.filename, ALLOWED_VIDEO_TYPES)
        if not mime_type:
            continue
        
        # 保存文件到临时目录
        file_extension = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{file_extension}"
        temp_filepath = os.path.join(settings.MEDIA_ROOT, temp_filename)
        
        os.makedirs(os.path.dirname(temp_filepath), exist_ok=True)
        
        # 异步写入文件
        async with aiofiles.open(temp_filepath, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # 获取文件大小
        file_size = os.path.getsize(temp_filepath)
        
        # 检查文件大小
        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail=f"文件过大，最大允许上传{settings.MAX_UPLOAD_SIZE/1024/1024}MB")
        
        try:
            # 生成视频缩略图
            thumbnail_filepath = await create_video_thumbnail(temp_filepath)
            
            # 上传到MinIO
            category_path = f"{category}/" if category else ""
            object_name = f"videos/{actor_id}/{category_path}{os.path.basename(temp_filepath)}"
            bucket_name = "actor-videos"
            
            # 上传视频
            file_url = await upload_file_to_minio(temp_filepath, bucket_name, object_name)
            
            # 上传缩略图
            thumbnail_object_name = f"thumbnails/{actor_id}/{category_path}{os.path.basename(thumbnail_filepath)}"
            thumbnail_url = await upload_file_to_minio(thumbnail_filepath, bucket_name, thumbnail_object_name)
            
            # 更新数据库
            media = ActorMedia(
                actor_id=actor_id,
                type="video",
                file_name=os.path.basename(temp_filepath),
                file_path=file_url,
                file_size=file_size,
                mime_type=mime_type,
                description=category,  # 使用category作为description存储
                is_public=True,
                bucket_name=bucket_name,
                object_name=object_name,
                uploaded_by=None
            )
            db.add(media)
            db.commit()
            db.refresh(media)
            
            result.append({
                "id": media.id,
                "url": file_url,
                "thumbnail_url": thumbnail_url,
                "file_name": media.file_name,
                "file_size": media.file_size,
                "mime_type": media.mime_type,
                "category": category,
                "uploaded_at": media.created_at
            })
            
        except Exception as e:
            # 发生错误时删除临时文件
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
            continue
        
        finally:
            # 删除临时文件
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
    
    if not result:
        raise HTTPException(status_code=400, detail="没有成功上传的视频")
    
    return result

@router.get("/{actor_id}/media", response_model=dict)
async def get_media_list(
    actor_id: str,
    file_type: Optional[str] = None,
    album: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user_optional),  # 允许可选的用户认证
    db: Session = Depends(get_db)
):
    """获取演员的媒体文件列表
    
    可以根据文件类型、相册或分类筛选结果
    """
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 基本查询
    query = db.query(ActorMedia).filter(ActorMedia.actor_id == actor_id)
    
    if file_type:
        query = query.filter(ActorMedia.type == file_type)
    
    if album:
        query = query.filter(ActorMedia.description.contains(album))
    
    if category:
        query = query.filter(ActorMedia.description.contains(category))
    
    # 执行查询
    try:
        media_list = query.order_by(ActorMedia.created_at.desc()).all()
        logger.info(f"查询到{len(media_list)}个媒体文件")
    except Exception as e:
        logger.error(f"查询媒体文件时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询媒体文件时出错: {str(e)}")
    
    # 构建结果
    result = {
        "actor_id": actor_id,
        "actor_name": actor.real_name,
        "items": []
    }
    
    for media in media_list:
        # 转换为前端友好格式
        media_info = {
            "id": media.id,
            "file_type": media.type,
            "file_url": media.file_path,
            "thumbnail_url": media.file_path,
            "created_at": media.created_at.isoformat() if media.created_at else None,
            "updated_at": media.updated_at.isoformat() if media.updated_at else None,
        }
        
        # 为照片添加额外信息
        if media.type == "photo":
            if hasattr(media, 'description') and media.description:
                media_info["album"] = media.description
            media_info["file_name"] = media.file_name
            media_info["file_size"] = media.file_size
            media_info["mime_type"] = media.mime_type
        elif media.type == "video":
            if hasattr(media, 'description') and media.description:
                media_info["category"] = media.description
            media_info["file_name"] = media.file_name
            media_info["file_size"] = media.file_size
            media_info["mime_type"] = media.mime_type
        
        result["items"].append(media_info)
    
    return result

@router.delete("/{actor_id}/media/{media_id}", response_model=dict)
async def delete_media(
    actor_id: str,
    media_id: int,
    current_user: User = Depends(get_current_user),  # 启用身份验证
    db: Session = Depends(get_db)
):
    """删除演员媒体文件"""
    # 检查演员是否存在
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="演员不存在")
    
    # 权限检查：管理员可以删除任何演员的媒体，演员只能删除自己的媒体
    if current_user.role == 'performer' and actor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="您没有权限删除此演员的媒体资料")
    
    # 查找指定的媒体文件
    media = db.query(ActorMedia).filter(ActorMedia.id == media_id, ActorMedia.actor_id == actor_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="未找到指定的媒体文件")
    
    # 删除MinIO中的文件(TODO: 实现异步删除)
    try:
        from app.core.storage import minio_client
        bucket_name = media.bucket_name or settings.MINIO_BUCKET
        object_name = media.object_name
        
        if bucket_name and object_name:
            minio_client.remove_object(bucket_name, object_name)
    except Exception as e:
        # 即使删除MinIO文件失败，也继续删除数据库记录
        pass
    
    # 删除数据库记录
    db.delete(media)
    db.commit()
    
    return {"message": "媒体文件已删除"}

# 专门用于演员自行上传媒体资料的API，以避免与经纪人/管理员上传冲突
@self_router.post("/avatar", response_model=dict)
async def performer_upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    演员自行上传头像的API
    
    - 仅限performer角色使用
    - 自动关联到当前登录的演员
    """
    logger.info(f"上传头像 - 用户: {current_user.username}, 角色: {current_user.role}, 文件名: {file.filename}, Token: {'已提供' if authorization else '未提供'}")
    
    # 权限检查
    if current_user.role != "performer":
        logger.warning(f"权限不足 - 用户: {current_user.username}, 角色: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="只有演员本人才能使用此API"
        )
    
    # 获取当前用户关联的演员
    actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
    if not actor:
        raise HTTPException(
            status_code=404,
            detail="未找到关联的演员信息"
        )
    
    # 复用现有的头像上传逻辑
    try:
        # 检查文件大小
        content = await file.read()
        await file.seek(0)  # 重置文件指针
        if len(content) > MAX_AVATAR_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"头像文件过大，不能超过{MAX_AVATAR_SIZE / 1024 / 1024}MB"
            )
        
        # 检查文件类型
        mime_type = magic.from_buffer(content, mime=True)
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"头像文件类型错误，仅支持以下格式: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # 检查演员是否存在
        actor_id = actor.id
        db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
        if not db_actor:
            raise HTTPException(
                status_code=404, 
                detail=f"演员不存在 (ID: {actor_id})"
            )
        
        # 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{actor_id}_avatar_{timestamp}_{uuid.uuid4()}.jpg"
        
        # 创建文件保存路径
        use_minio = hasattr(settings, 'MINIO_URL') and settings.MINIO_URL
        if use_minio:
            # 使用MinIO服务
            # 先保存到临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            try:
                # 使用临时文件路径上传到MinIO
                file_url = await upload_file_to_minio(temp_file_path, "actor-avatars", filename)
                
                # 处理路径，确保URL可访问
                if not file_url.startswith('http'):
                    file_url = f"{settings.MINIO_EXTERNAL_URL}/actor-avatars/{filename}"
                
                bucket_name = "actor-avatars"
                object_name = filename
            finally:
                # 清理临时文件
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        else:
            # 本地存储
            media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path("./media")
            upload_dir = media_root / "avatars" / actor_id
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            file_path = upload_dir / filename
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # 生成缩略图
            thumbnail_path = upload_dir / f"thumb_{filename}"
            await create_thumbnail(file_path, thumbnail_path)
            
            # 文件URL (相对路径)
            file_url = f"/media/avatars/{actor_id}/{filename}"
            bucket_name = None
            object_name = None
        
        # 检查现有头像媒体记录
        existing_avatar = db.query(ActorMedia).filter(
            ActorMedia.actor_id == actor_id,
            ActorMedia.type == "avatar"
        ).first()
        
        # 如果存在则删除
        if existing_avatar:
            # 删除存储的文件
            try:
                if settings.USE_MINIO:
                    minio_client = create_minio_client()
                    if existing_avatar.bucket_name and existing_avatar.object_name:
                        minio_client.remove_object(existing_avatar.bucket_name, existing_avatar.object_name)
                else:
                    avatar_path = Path(settings.UPLOAD_DIR) / "avatars" / actor_id / existing_avatar.file_name
                    if avatar_path.exists():
                        avatar_path.unlink()
            except Exception as e:
                logger.error(f"删除旧头像失败: {str(e)}")
            
            # 删除数据库记录
            db.delete(existing_avatar)
        
        # 创建媒体记录
        new_media = ActorMedia(
            actor_id=actor_id,
            type="avatar",
            file_name=filename,
            file_path=file_url,
            file_size=len(content),
            mime_type=mime_type,
            description="演员头像",
            bucket_name=bucket_name,
            object_name=object_name,
            uploaded_by=current_user.id
        )
        
        db.add(new_media)
        
        # 更新演员头像URL
        db_actor.avatar_url = file_url
        db.commit()
        
        return {
            "success": True,
            "avatar_url": file_url,
            "message": "头像上传成功",
            "id": new_media.id
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"头像上传失败: {str(e)}"
        )


@self_router.post("/photos", response_model=List[dict])
async def performer_upload_photos(
    files: List[UploadFile] = File(...),
    album: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    演员自行上传照片的API
    
    - 仅限performer角色使用
    - 自动关联到当前登录的演员
    """
    logger.info(f"上传照片 - 用户: {current_user.username}, 角色: {current_user.role}, 照片数量: {len(files)}, Token: {'已提供' if authorization else '未提供'}")
    
    # 权限检查
    if current_user.role != "performer":
        logger.warning(f"权限不足 - 用户: {current_user.username}, 角色: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="只有演员本人才能使用此API"
        )
    
    try:
        # 获取当前用户关联的演员
        actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
        if not actor:
            logger.warning(f"找不到与用户关联的演员信息: 用户ID={current_user.id}")
            raise HTTPException(
                status_code=404,
                detail="未找到关联的演员信息"
            )
        
        actor_id = actor.id
        logger.info(f"找到与用户关联的演员: 演员ID={actor_id}")
        
        # 检查演员是否存在
        db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
        if not db_actor:
            logger.warning(f"演员记录不存在: 演员ID={actor_id}")
            raise HTTPException(
                status_code=404, 
                detail=f"演员不存在 (ID: {actor_id})"
            )
        
        # 检查当前照片数量是否超过限制
        current_photos_count = db.query(ActorMedia).filter(
            ActorMedia.actor_id == actor_id,
            ActorMedia.type == "photo"
        ).count()
        
        if current_photos_count + len(files) > MAX_PHOTOS_COUNT:
            logger.warning(f"照片数量超过限制: 当前={current_photos_count}, 新增={len(files)}, 最大={MAX_PHOTOS_COUNT}")
            raise HTTPException(
                status_code=400,
                detail=f"照片数量超过限制，每个演员最多可以上传{MAX_PHOTOS_COUNT}张照片"
            )
        
        # 上传结果
        result = []
        
        for file in files:
            try:
                logger.info(f"开始处理照片: 演员ID={actor_id}, 文件名={file.filename}")
                
                # 读取文件内容
                content = await file.read()
                await file.seek(0)
                
                # 检查文件大小
                if len(content) > MAX_PHOTO_SIZE:
                    logger.warning(f"文件过大: 文件名={file.filename}, 大小={len(content)}")
                    result.append({
                        "filename": file.filename,
                        "success": False,
                        "message": f"文件过大，不能超过{MAX_PHOTO_SIZE / 1024 / 1024}MB"
                    })
                    continue
                
                # 检查文件类型
                try:
                    mime_type = magic.from_buffer(content, mime=True)
                    logger.info(f"检测到文件类型: 文件名={file.filename}, MIME类型={mime_type}")
                    
                    if mime_type not in ALLOWED_IMAGE_TYPES:
                        logger.warning(f"文件类型不支持: 文件名={file.filename}, MIME类型={mime_type}")
                        result.append({
                            "filename": file.filename,
                            "success": False,
                            "message": f"文件类型错误，仅支持以下格式: {', '.join(ALLOWED_IMAGE_TYPES)}"
                        })
                        continue
                except Exception as e:
                    logger.error(f"检测文件类型时出错: 文件名={file.filename}, 错误={str(e)}")
                    result.append({
                        "filename": file.filename,
                        "success": False,
                        "message": f"检测文件类型失败: {str(e)}"
                    })
                    continue
                
                # 生成唯一文件名
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                filename = f"{actor_id}_photo_{timestamp}_{uuid.uuid4()}.jpg"
                logger.info(f"生成唯一文件名: {filename}")
                
                # 创建文件保存路径
                use_minio = hasattr(settings, 'MINIO_URL') and settings.MINIO_URL
                if use_minio:
                    logger.info(f"使用MinIO保存文件: {filename}")
                    # 使用MinIO服务
                    # 先保存到临时文件
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                        temp_file.write(content)
                        temp_file_path = temp_file.name
                    
                    try:
                        # 使用临时文件路径上传到MinIO
                        file_url = await upload_file_to_minio(temp_file_path, "actor-photos", filename)
                        
                        # 处理路径，确保URL可访问
                        if not file_url.startswith('http'):
                            file_url = f"{settings.MINIO_EXTERNAL_URL}/actor-photos/{filename}"
                        
                        thumbnail_url = file_url  # MinIO不自动生成缩略图，使用原图
                        bucket_name = "actor-photos"
                        object_name = filename
                    finally:
                        # 清理临时文件
                        if os.path.exists(temp_file_path):
                            os.unlink(temp_file_path)
                else:
                    logger.info(f"使用本地文件系统保存文件: {filename}")
                    # 本地存储
                    media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path("./media")
                    upload_dir = media_root / "photos" / actor_id
                    upload_dir.mkdir(parents=True, exist_ok=True)
                    
                    try:
                        file_path = upload_dir / filename
                        async with aiofiles.open(file_path, 'wb') as f:
                            await f.write(content)
                        
                        # 生成缩略图
                        thumbnail_filename = f"thumb_{filename}"
                        thumbnail_path = upload_dir / thumbnail_filename
                        await create_thumbnail(file_path, thumbnail_path)
                        
                        # 文件URL (相对路径)
                        file_url = f"/media/photos/{actor_id}/{filename}"
                        thumbnail_url = f"/media/photos/{actor_id}/{thumbnail_filename}"
                        bucket_name = None
                        object_name = None
                    except Exception as e:
                        logger.error(f"保存文件时出错: 文件名={filename}, 错误={str(e)}")
                        result.append({
                            "filename": file.filename,
                            "success": False,
                            "message": f"保存文件失败: {str(e)}"
                        })
                        continue
                
                try:
                    # 创建媒体记录
                    logger.info(f"创建媒体记录: 演员ID={actor_id}, 文件URL={file_url}")
                    new_media = ActorMedia(
                        actor_id=actor_id,
                        type="photo",
                        file_path=file_url,
                        file_name=file.filename,
                        file_size=len(content),
                        mime_type=mime_type,
                        description=album or "默认相册",
                        bucket_name=bucket_name,
                        object_name=object_name,
                        uploaded_by=current_user.id
                    )
                    
                    db.add(new_media)
                    db.flush()
                    
                    result.append({
                        "id": new_media.id,
                        "filename": file.filename,
                        "file_url": file_url,
                        "thumbnail_url": thumbnail_url,  # 前端展示仍可使用thumbnail_url
                        "album": album or "默认相册",
                        "success": True,
                        "message": "照片上传成功"
                    })
                    logger.info(f"媒体记录创建成功: ID={new_media.id}")
                except Exception as e:
                    logger.error(f"创建媒体记录时出错: 文件名={file.filename}, 错误={str(e)}")
                    result.append({
                        "filename": file.filename,
                        "success": False,
                        "message": f"创建媒体记录失败: {str(e)}"
                    })
            except Exception as e:
                logger.error(f"处理照片时出现未处理的异常: 文件名={file.filename}, 错误={str(e)}")
                result.append({
                    "filename": file.filename,
                    "success": False,
                    "message": f"照片上传失败: {str(e)}"
                })
        
        db.commit()
        logger.info(f"照片上传完成: 成功={len([r for r in result if r.get('success')])}, 失败={len([r for r in result if not r.get('success')])}")
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"照片上传API整体处理失败: 错误={str(e)}")
        # 返回详细的错误信息而不是抛出异常，这样前端可以更好地处理错误
        return [{"success": False, "message": f"服务器处理错误: {str(e)}"}]


@self_router.post("/videos", response_model=List[dict])
async def performer_upload_videos(
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    演员自行上传视频的API
    
    - 仅限performer角色使用
    - 自动关联到当前登录的演员
    """
    logger.info(f"上传视频 - 用户: {current_user.username}, 角色: {current_user.role}, 视频数量: {len(files)}, Token: {'已提供' if authorization else '未提供'}")
    
    # 权限检查
    if current_user.role != "performer":
        logger.warning(f"权限不足 - 用户: {current_user.username}, 角色: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="只有演员本人才能使用此API"
        )
    
    # 获取当前用户关联的演员
    actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
    if not actor:
        raise HTTPException(
            status_code=404,
            detail="未找到关联的演员信息"
        )
    
    actor_id = actor.id
    
    # 检查演员是否存在
    db_actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not db_actor:
        raise HTTPException(
            status_code=404, 
            detail=f"演员不存在 (ID: {actor_id})"
        )
    
    # 检查当前视频数量是否超过限制
    current_videos_count = db.query(ActorMedia).filter(
        ActorMedia.actor_id == actor_id,
        ActorMedia.type == "video"
    ).count()
    
    if current_videos_count + len(files) > MAX_VIDEOS_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"视频数量超过限制，每个演员最多可以上传{MAX_VIDEOS_COUNT}个视频"
        )
    
    # 上传结果
    result = []
    
    for file in files:
        try:
            # 读取文件内容
            content = await file.read()
            await file.seek(0)
            
            # 检查文件大小
            if len(content) > MAX_VIDEO_SIZE:
                result.append({
                    "filename": file.filename,
                    "success": False,
                    "message": f"文件过大，不能超过{MAX_VIDEO_SIZE / 1024 / 1024}MB"
                })
                continue
            
            # 检查文件类型
            mime_type = magic.from_buffer(content, mime=True)
            if mime_type not in ALLOWED_VIDEO_TYPES:
                result.append({
                    "filename": file.filename,
                    "success": False,
                    "message": f"文件类型错误，仅支持以下格式: {', '.join(ALLOWED_VIDEO_TYPES)}"
                })
                continue
            
            # 生成唯一文件名
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{actor_id}_video_{timestamp}_{uuid.uuid4()}.mp4"
            
            # 创建文件保存路径
            use_minio = hasattr(settings, 'MINIO_URL') and settings.MINIO_URL
            if use_minio:
                # 使用MinIO服务
                # 先保存到临时文件
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1] or '.mp4') as temp_file:
                    temp_file.write(content)
                    temp_file_path = temp_file.name
                
                try:
                    # 使用临时文件路径上传到MinIO
                    file_url = await upload_file_to_minio(temp_file_path, "actor-videos", filename)
                    
                    # 处理路径，确保URL可访问
                    if not file_url.startswith('http'):
                        file_url = f"{settings.MINIO_EXTERNAL_URL}/actor-videos/{filename}"
                    
                    thumbnail_url = f"{settings.MINIO_EXTERNAL_URL}/actor-videos/thumb_{filename}.jpg"  # 默认缩略图URL
                    bucket_name = "actor-videos"
                    object_name = filename
                finally:
                    # 清理临时文件
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
            else:
                # 本地存储
                media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path("./media")
                upload_dir = media_root / "videos" / actor_id
                upload_dir.mkdir(parents=True, exist_ok=True)
                
                file_path = upload_dir / filename
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                
                # 创建缩略图 - 先保存临时截图，然后使用它创建缩略图
                thumb_filename = f"thumb_{filename}.jpg"
                thumb_path = upload_dir / thumb_filename
                # 这里可以集成视频缩略图生成逻辑，比如调用ffmpeg等
                await create_video_thumbnail(file_path, thumb_path)  # 假设有这个函数
                
                # 文件URL (相对路径)
                file_url = f"/media/videos/{actor_id}/{filename}"
                thumbnail_url = f"/media/videos/{actor_id}/{thumb_filename}"
                bucket_name = None
                object_name = None
            
            # 创建视频媒体记录
            new_media = ActorMedia(
                actor_id=actor_id,
                type="video",
                file_path=file_url,
                file_name=file.filename,
                file_size=len(content),
                mime_type=mime_type,
                description=category or "默认视频",  # 使用description存储分类信息
                bucket_name=bucket_name,
                object_name=object_name,
                uploaded_by=current_user.id
            )
            
            db.add(new_media)
            db.flush()
            
            result.append({
                "id": new_media.id,
                "filename": file.filename,
                "file_url": file_url,
                "thumbnail_url": thumbnail_url,  # 前端展示仍可使用thumbnail_url
                "category": category or "默认视频",
                "success": True,
                "message": "视频上传成功"
            })
            
        except Exception as e:
            result.append({
                "filename": file.filename,
                "success": False,
                "message": f"视频上传失败: {str(e)}"
            })
    
    db.commit()
    return result


@self_router.get("/", response_model=dict)
async def get_performer_media(
    file_type: Optional[str] = None,
    album: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    获取演员自己的媒体列表
    
    - 仅限performer角色使用
    - 自动筛选当前登录的演员的媒体
    """
    logger.info(f"获取演员媒体 - 用户: {current_user.username}, 角色: {current_user.role}, Token: {'已提供' if authorization else '未提供'}")
    
    # 权限检查
    if current_user.role != "performer" and current_user.role != "admin" and current_user.role != "manager":
        logger.warning(f"权限不足 - 用户: {current_user.username}, 角色: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="只有演员本人、经纪人或管理员才能使用此API"
        )
    
    # 获取当前用户关联的演员
    actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
    if not actor and current_user.role == "performer":
        logger.error(f"未找到演员数据 - 用户ID: {current_user.id}")
        raise HTTPException(
            status_code=404,
            detail="未找到关联的演员信息"
        )
    
    # 构建查询
    if current_user.role == "performer":
        actor_id = actor.id
        query = db.query(ActorMedia).filter(ActorMedia.actor_id == actor_id)
    else:
        # 管理员或经纪人需要传递actor_id参数
        raise HTTPException(
            status_code=400,
            detail="管理员或经纪人需要使用'/actors/{actor_id}/media'端点"
        )
    
    # 应用过滤条件
    if file_type:
        query = query.filter(ActorMedia.type == file_type)
    
    if album:
        query = query.filter(ActorMedia.description.contains(album))
    
    if category:
        query = query.filter(ActorMedia.description.contains(category))
    
    # 执行查询
    try:
        media_list = query.order_by(ActorMedia.created_at.desc()).all()
        logger.info(f"查询到{len(media_list)}个媒体文件")
    except Exception as e:
        logger.error(f"查询媒体文件时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"查询媒体文件时出错: {str(e)}")
    
    # 整理返回结果
    result = {
        "actor_id": actor_id,
        "actor_name": actor.real_name,
        "avatar_url": actor.avatar_url,
        "photos": [],
        "videos": [],
        "photo_albums": [],
        "video_categories": [],
        "avatar": None
    }
    
    photo_albums = set()
    video_categories = set()
    
    for media in media_list:
        # 转换为前端友好格式
        media_info = {
            "id": media.id,
            "file_type": media.type,
            "file_url": media.file_path,
            "thumbnail_url": media.file_path,
            "file_name": media.file_name,
            "file_size": media.file_size,
            "mime_type": media.mime_type,
            "created_at": media.created_at.isoformat() if media.created_at else None,
            "updated_at": media.updated_at.isoformat() if media.updated_at else None,
        }
        
        # 根据类型分类
        if media.type == "photo":
            if hasattr(media, 'description') and media.description:
                media_info["album"] = media.description
                photo_albums.add(media.description)
            result["photos"].append(media_info)
        elif media.type == "video":
            if hasattr(media, 'description') and media.description:
                media_info["category"] = media.description
                video_categories.add(media.description)
            result["videos"].append(media_info)
        elif media.type == "avatar":
            result["avatar"] = media_info
    
    # 添加相册和分类信息
    result["photo_albums"] = list(photo_albums)
    result["video_categories"] = list(video_categories)
    
    return result


@self_router.delete("/{media_id}", response_model=dict)
async def delete_performer_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    删除演员自己的媒体
    
    - 仅限performer角色使用
    - 只能删除自己的媒体
    """
    logger.info(f"删除媒体 - 用户: {current_user.username}, 角色: {current_user.role}, 媒体ID: {media_id}, Token: {'已提供' if authorization else '未提供'}")
    
    # 权限检查
    if current_user.role != "performer":
        logger.warning(f"权限不足 - 用户: {current_user.username}, 角色: {current_user.role}")
        raise HTTPException(
            status_code=403,
            detail="只有演员本人才能使用此API"
        )
    
    # 获取当前用户关联的演员
    actor = db.query(Actor).filter(Actor.user_id == current_user.id).first()
    if not actor:
        raise HTTPException(
            status_code=404,
            detail="未找到关联的演员信息"
        )
    
    actor_id = actor.id
    
    # 获取要删除的媒体
    media = db.query(ActorMedia).filter(
        ActorMedia.id == media_id,
        ActorMedia.actor_id == actor_id
    ).first()
    
    if not media:
        raise HTTPException(
            status_code=404,
            detail="未找到该媒体文件或无权限删除"
        )
    
    # 删除媒体记录
    db.delete(media)
    db.commit()
    
    return {
        "success": True,
        "media_id": media_id,
        "message": "媒体文件删除成功"
    }
