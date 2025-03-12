#!/usr/bin/env python3
"""
初始化MinIO存储桶
"""
from minio import Minio
from minio.error import S3Error
import json

# MinIO连接配置
MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_SECURE = False  # 本地开发环境通常不使用HTTPS

# 需要创建的存储桶
BUCKETS = [
    "actor-avatars",  # 演员头像
    "actor-photos",   # 演员照片
    "actor-videos"    # 演员视频
]

def main():
    """主函数"""
    try:
        # 初始化MinIO客户端
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
        
        # 创建存储桶
        for bucket in BUCKETS:
            if not minio_client.bucket_exists(bucket):
                minio_client.make_bucket(bucket)
                
                # 设置桶策略为公开读取
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "*"},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{bucket}/*"]
                        }
                    ]
                }
                
                # 将策略转换为JSON字符串
                policy_str = json.dumps(policy)
                
                # 设置存储桶策略
                minio_client.set_bucket_policy(bucket, policy_str)
                print(f"已创建存储桶: {bucket}，并设置为公开读取")
            else:
                print(f"存储桶已存在: {bucket}")
        
        print("MinIO存储桶初始化完成")
        
    except S3Error as exc:
        print(f"出错了: {exc}")

if __name__ == "__main__":
    main() 