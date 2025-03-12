#!/bin/bash

# 创建MinIO数据目录
mkdir -p ./minio_data

# 设置MinIO环境变量
export MINIO_ROOT_USER=minioadmin
export MINIO_ROOT_PASSWORD=minioadmin

# 启动MinIO服务
minio server ./minio_data --console-address ":9001" &

echo "MinIO服务已启动"
echo "API: http://localhost:9000"
echo "控制台: http://localhost:9001"
echo "登录信息:"
echo "  用户名: minioadmin"
echo "  密码: minioadmin" 