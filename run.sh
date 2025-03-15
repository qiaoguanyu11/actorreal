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

echo "启动演员管理系统API服务..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002

# 退出虚拟环境
deactivate 