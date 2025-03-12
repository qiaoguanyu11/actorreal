import os
import magic
import aiofiles
from fastapi import UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError
import asyncio
import subprocess
from pathlib import Path
import shutil
import tempfile
import io
from minio import Minio
from minio.error import S3Error
from ..core.config import settings
import uuid

# 初始化MinIO客户端
try:
    minio_client = Minio(
        settings.MINIO_URL,
        access_key=settings.MINIO_ROOT_USER,
        secret_key=settings.MINIO_ROOT_PASSWORD,
        secure=False  # 本地开发环境通常不使用HTTPS
    )
except Exception as e:
    print(f"MinIO客户端初始化失败: {e}")
    minio_client = None

# 确保媒体目录存在
os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

# 允许的文件类型
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/3gpp", "video/x-matroska"]
ALLOWED_MIME_TYPES = ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES

def validate_file_type(filename, allowed_mime_types=None):
    """验证文件类型"""
    if not filename:
        return None
    
    # 根据文件扩展名初步判断
    ext = os.path.splitext(filename)[1].lower()
    
    # 图片扩展名映射
    image_ext_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif'
    }
    
    # 视频扩展名映射
    video_ext_map = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.3gp': 'video/3gpp',
        '.mkv': 'video/x-matroska'
    }
    
    # 根据文件扩展名判断MIME类型
    if ext in image_ext_map:
        mime_type = image_ext_map[ext]
    elif ext in video_ext_map:
        mime_type = video_ext_map[ext]
    else:
        # 无法根据扩展名判断时
        return None
    
    # 如果指定了允许的MIME类型，则验证
    if allowed_mime_types and mime_type not in allowed_mime_types:
        return None
    
    return mime_type

async def upload_file_to_minio(file_path, bucket_name, object_name):
    """上传文件到MinIO"""
    if not minio_client:
        raise Exception("MinIO客户端未初始化")
    
    # 检查存储桶是否存在，不存在则创建
    try:
        if not minio_client.bucket_exists(bucket_name):
            minio_client.make_bucket(bucket_name)
    except S3Error as e:
        raise Exception(f"无法创建存储桶: {e}")
    
    # 上传文件
    try:
        with open(file_path, 'rb') as file_data:
            file_stat = os.stat(file_path)
            minio_client.put_object(
                bucket_name, 
                object_name, 
                file_data, 
                file_stat.st_size,
                content_type=magic.from_file(file_path, mime=True)
            )
    except Exception as e:
        raise Exception(f"上传文件失败: {e}")
    
    # 返回文件URL
    return f"{settings.MINIO_EXTERNAL_URL}/{bucket_name}/{object_name}"

async def compress_image(file_path, quality=85):
    """压缩图片"""
    # 检查文件是否存在
    if not os.path.exists(file_path):
        raise Exception("文件不存在")
    
    # 处理HEIC/HEIF格式
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    if ext in ['.heic', '.heif']:
        try:
            # 转换HEIC/HEIF为JPG
            output_path = os.path.splitext(file_path)[0] + '.jpg'
            with Image.open(file_path) as img:
                img.save(output_path, 'JPEG', quality=quality)
            return output_path
        except Exception as e:
            raise Exception(f"转换HEIC图片失败: {e}")
    
    # 压缩其他格式图片
    try:
        output_path = os.path.splitext(file_path)[0] + '_compressed' + ext
        with Image.open(file_path) as img:
            # 转为RGB模式(去除透明通道)
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            
            # 保存压缩后的图片
            img.save(output_path, quality=quality, optimize=True)
        
        return output_path
    except Exception as e:
        raise Exception(f"压缩图片失败: {e}")

async def create_thumbnail(file_path, size=(300, 300)):
    """创建缩略图"""
    # 检查文件是否存在
    if not os.path.exists(file_path):
        raise Exception("文件不存在")
    
    # 创建缩略图
    try:
        # 生成缩略图文件名
        thumbnail_path = os.path.splitext(file_path)[0] + '_thumbnail.jpg'
        
        with Image.open(file_path) as img:
            # 转为RGB模式(去除透明通道)
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            
            # 生成缩略图
            img.thumbnail(size)
            
            # 保存缩略图
            img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
        
        return thumbnail_path
    except Exception as e:
        raise Exception(f"生成缩略图失败: {e}")

async def create_video_thumbnail(file_path, output_size=(480, 270)):
    """从视频创建缩略图"""
    # 检查文件是否存在
    if not os.path.exists(file_path):
        raise Exception("文件不存在")
    
    # 检查ffmpeg是否可用
    try:
        process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.communicate()
        ffmpeg_available = process.returncode == 0
    except:
        ffmpeg_available = False
    
    # 创建临时目录
    temp_dir = tempfile.mkdtemp()
    thumbnail_path = os.path.splitext(file_path)[0] + '_thumbnail.jpg'
    
    try:
        if ffmpeg_available:
            # 使用FFmpeg获取视频的第一帧
            command = [
                "ffmpeg",
                "-i", file_path,        # 输入文件
                "-ss", "00:00:01",      # 从视频的1秒处开始
                "-frames:v", "1",       # 只截取一帧
                "-s", f"{output_size[0]}x{output_size[1]}",  # 设置输出尺寸
                "-f", "image2",         # 输出格式
                thumbnail_path          # 输出文件
            ]
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # 检查FFmpeg是否成功
            if process.returncode != 0:
                raise Exception(f"无法生成视频缩略图: {stderr.decode()}")
        else:
            # 如果ffmpeg不可用，使用默认缩略图
            raise Exception("FFmpeg不可用")
        
        return thumbnail_path
    except Exception as e:
        # 使用默认缩略图
        default_thumbnail = os.path.join(settings.MEDIA_ROOT, 'default-video-thumbnail.jpg')
        
        # 如果默认缩略图不存在，创建一个
        if not os.path.exists(default_thumbnail):
            # 创建一个简单的黑色图片作为默认缩略图
            img = Image.new('RGB', output_size, color='black')
            img.save(default_thumbnail, 'JPEG', quality=85)
        
        shutil.copy(default_thumbnail, thumbnail_path)
        return thumbnail_path
    finally:
        # 清理临时目录
        shutil.rmtree(temp_dir, ignore_errors=True) 