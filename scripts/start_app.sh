#!/bin/bash

# 确保脚本在项目根目录运行
cd "$(dirname "$0")/.." || exit

# 启动MinIO服务
echo "正在启动MinIO服务..."
./scripts/start_minio.sh

# 等待MinIO服务启动
echo "等待MinIO服务启动..."
sleep 3

# 创建minio_data目录（如果不存在）
mkdir -p minio_data

# 激活虚拟环境（如果存在）
if [ -d "venv" ]; then
    echo "激活虚拟环境..."
    source venv/bin/activate
fi

# 安装依赖
echo "检查依赖..."
pip3 install -r requirements.txt

# 启动应用
echo "启动应用..."
cd backend && python3 -m app.main 