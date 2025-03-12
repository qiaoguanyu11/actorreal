#!/usr/bin/env python3
"""
设置MinIO存储桶权限为公共可访问
"""
import json
from minio import Minio
from minio.error import S3Error
from app.core.config import settings

def setup_minio_buckets():
    """设置MinIO存储桶并配置公共访问权限"""
    try:
        # 创建MinIO客户端
        minio_client = Minio(
            settings.MINIO_URL,
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=False  # 本地开发环境通常不使用HTTPS
        )
        
        # 要设置的存储桶列表
        buckets = [
            "actor-avatars", 
            "actor-photos", 
            "actor-videos", 
            "actor-media"
        ]
        
        # 为每个存储桶设置公共访问策略
        for bucket_name in buckets:
            # 检查存储桶是否存在，不存在则创建
            if not minio_client.bucket_exists(bucket_name):
                minio_client.make_bucket(bucket_name)
                print(f"存储桶 {bucket_name} 创建成功")
            
            # 设置为公共可读的策略
            # 允许公共读取访问
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                    }
                ]
            }
            
            # 应用策略
            minio_client.set_bucket_policy(bucket_name, json.dumps(policy))
            print(f"存储桶 {bucket_name} 已设置为公共可读")
        
        print("所有存储桶设置完成")
        return True
    except S3Error as err:
        print(f"设置MinIO存储桶时出错: {err}")
        return False

if __name__ == "__main__":
    # 直接运行脚本时执行设置
    setup_minio_buckets() 