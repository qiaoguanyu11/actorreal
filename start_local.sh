#!/bin/bash

# 检查虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 如果需要安装依赖
if [ "$1" = "--install" ]; then
    echo "安装依赖..."
    pip install -r requirements.txt
fi

# 检查前端构建是否存在
if [ ! -d "frontend/build" ]; then
    echo "前端构建不存在，请先构建前端项目: cd frontend && npm run build"
    exit 1
fi

# 设置环境变量
export MINIO_EXTERNAL_URL="http://localhost:9000"

# 启动MinIO服务
echo "启动MinIO服务..."
mkdir -p ./minio_data
minio server ./minio_data --console-address ":9001" &
MINIO_PID=$!

# 等待MinIO服务启动
echo "等待MinIO服务启动..."
sleep 3

# 启动后端服务
echo "启动演员管理系统API服务..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &
BACKEND_PID=$!
cd ..

# 等待后端服务启动
echo "等待后端服务启动..."
sleep 3

# 启动前端静态文件服务器
echo "启动前端静态文件服务器..."
python3 serve_frontend.py 8001 &
FRONTEND_PID=$!

# 捕获CTRL+C信号
trap "echo '正在关闭服务...'; kill $FRONTEND_PID; kill $BACKEND_PID; kill $MINIO_PID; exit" INT

# 等待用户按下CTRL+C
echo "服务已启动:"
echo "- MinIO服务: http://localhost:9000 (控制台: http://localhost:9001)"
echo "- 后端服务: http://localhost:8002"
echo "- 前端服务: http://localhost:8001"
echo "按CTRL+C停止所有服务..."
wait 