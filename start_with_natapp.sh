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

# 停止可能已经运行的服务
echo "停止已运行的服务..."
pkill -f "minio server" || true
pkill -f "uvicorn" || true
pkill -f "serve_frontend.py" || true
pkill -f "natapp" || true

# 等待服务完全停止
sleep 2

# 启动 MinIO 服务
echo "启动 MinIO 服务..."
mkdir -p ./minio_data
minio server ./minio_data --console-address ":9001" &
MINIO_PID=$!

# 等待 MinIO 服务完全启动
echo "等待 MinIO 服务启动..."
sleep 5

# 设置环境变量
export MINIO_EXTERNAL_URL="http://huameng.natapp1.cc"
echo "已设置 MINIO_EXTERNAL_URL=$MINIO_EXTERNAL_URL"

# 启动后端服务
echo "启动演员管理系统API服务..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002 &
BACKEND_PID=$!
cd ..

# 等待后端服务启动
echo "等待后端服务启动..."
sleep 5

# 启动前端静态文件服务器
echo "启动前端静态文件服务器..."
python3 serve_frontend.py 8001 &
FRONTEND_PID=$!

# 等待前端服务启动
echo "等待前端服务启动..."
sleep 2

# 启动 NATAPP 隧道
echo "启动 NATAPP 隧道..."
./natapp -config=natapp_config.ini &
NATAPP_PID=$!

# 捕获 CTRL+C 信号
trap "echo '正在关闭服务...'; kill $FRONTEND_PID; kill $BACKEND_PID; kill $MINIO_PID; kill $NATAPP_PID; exit" INT

# 输出服务信息
echo "所有服务已启动:"
echo "- MinIO 服务: http://localhost:9000 (控制台: http://localhost:9001)"
echo "  用户名: minioadmin"
echo "  密码: minioadmin"
echo "- 后端服务: http://localhost:8002"
echo "- 前端本地地址: http://localhost:8001"
echo "- 前端公网地址: http://huameng.natapp1.cc"
echo "按 CTRL+C 停止所有服务..."

# 等待用户按下 CTRL+C
wait 