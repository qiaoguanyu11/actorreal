# 演员管理系统

## 项目概述

演员管理系统是一个全栈应用，用于管理演员信息、媒体资料及演员与经纪人之间的关系。系统支持演员信息的创建、查询、更新和删除，以及媒体文件（头像、照片、视频）的管理。

## 项目架构

### 前端

- **框架**：React
- **UI库**：Ant Design
- **状态管理**：React Context API
- **路由**：React Router

### 后端

- **框架**：FastAPI
- **数据库**：MySQL
- **ORM**：SQLAlchemy
- **迁移工具**：Alembic
- **存储**：MinIO (对象存储服务)
- **容器化**：Docker

### 部署

- **本地部署**：使用脚本一键启动所有服务
- **公网访问**：使用NATAPP实现内网穿透，将前端暴露到公网

## 功能模块

### 用户角色

- **访客**：可浏览演员基本信息和公开媒体
- **演员(Performer)**：可管理自己的信息和媒体
- **经纪人(Agent)**：可管理旗下演员的信息和媒体
- **管理员(Admin)**：拥有系统最高权限，可管理所有用户和数据

### 主要功能

1. **演员信息管理**
   - 基本信息管理（姓名、性别、年龄等）
   - 专业信息管理（技能、经验、教育背景等）
   - 联系信息管理（电话、微信、地址等）
   - 标签管理（为演员添加分类标签）

2. **媒体资料管理**
   - 头像上传与管理
   - 照片上传与管理（支持多张照片和相册分类）
   - 视频上传与管理（支持多个视频和分类）

3. **用户管理**
   - 用户注册与登录
   - 角色权限控制
   - 个人资料管理

4. **经纪人管理**
   - 经纪人分配未分配的演员
   - 查看旗下演员列表
   - 管理旗下演员信息

## 目录结构

```
├── backend/                # 后端代码
│   ├── app/                # 应用主目录
│   ├── alembic.ini         # 数据库迁移配置
│   └── media/              # 媒体文件存储
├── frontend/               # 前端代码
│   ├── public/             # 静态资源
│   ├── src/                # 源代码
│   │   ├── api/            # API调用模块
│   │   ├── assets/         # 资源文件
│   │   ├── components/     # 通用组件
│   │   ├── context/        # 上下文管理
│   │   ├── pages/          # 页面组件
│   │   └── utils/          # 工具函数
├── minio_data/             # MinIO数据存储目录
├── scripts/                # 脚本文件
├── api_documentation.md    # API文档
└── requirements.txt        # 后端依赖文件
```

## 前端页面

1. **登录页面** - `LoginPage.js`
   - 用户登录功能
   - 身份验证

2. **注册页面** - `RegisterPage.js`
   - 新用户注册

3. **演员列表页面** - `ActorListPage.js`
   - 显示演员列表
   - 支持筛选、排序和分页

4. **演员详情页面** - `ActorDetailPage.js`
   - 显示演员详细信息
   - 查看演员媒体资料

5. **创建演员页面** - `CreateActorPage.js`
   - 创建新演员记录
   - 表单验证

6. **编辑演员页面** - `EditActorPage.js`
   - 编辑现有演员信息

7. **媒体上传页面** - `ActorMediaUploadPage.js`
   - 上传演员照片和视频
   - 文件预览和管理

8. **个人媒体页面** - `ActorSelfMediaPage.js`
   - 演员自己管理媒体资料

9. **个人资料页面** - `MyProfilePage.js`、`ProfilePage.js`
   - 用户个人资料管理

10. **经纪人管理页面** - `AgentManagementPage.js`
    - 经纪人账户管理

11. **未分配演员页面** - `UnassignedActorsPage.js`
    - 显示尚未分配给经纪人的演员

## API接口

系统提供了丰富的RESTful API，包括但不限于：

1. **基本信息管理**
   - 创建演员：`POST /api/v1/actors`
   - 获取演员详情：`GET /api/v1/actors/{id}`
   - 获取演员列表：`GET /api/v1/actors`
   - 更新基本信息：`PUT /api/v1/actors/{id}/basic-info`
   - 演员自行更新：`POST /api/v1/actors/basic/self-update`

2. **标签管理**
   - 获取所有标签：`GET /api/v1/tags`
   - 获取演员标签：`GET /api/v1/actors/{id}/tags`
   - 添加演员标签：`POST /api/v1/actors/{id}/tags`

3. **媒体资料管理**
   - 上传头像：`POST /api/v1/actors/{id}/media/avatar`
   - 上传照片：`POST /api/v1/actors/{id}/media/photos`
   - 上传视频：`POST /api/v1/actors/{id}/media/videos`
   - 获取媒体列表：`GET /api/v1/actors/{id}/media`

## 待完成功能

1. **批量操作**
   - 批量创建演员
   - 批量更新演员信息
   - 批量删除演员

2. **版本控制**
   - 获取历史版本
   - 恢复到指定版本

3. **审核流程**
   - 提交审核
   - 获取审核状态
   - 审核通过/拒绝

4. **数据验证**
   - 验证数据格式

## 快速开始

### 环境要求

- Node.js 16+
- Python 3.8+
- Docker
- npm/yarn
- pip
- NATAPP客户端（用于公网访问）

### 后端设置

1. 安装依赖：
```bash
pip3 install -r requirements.txt
```

2. 启动MinIO服务（用于存储媒体文件）：
```bash
./scripts/start_minio.sh
```

3. 启动后端服务：
```bash
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8002
```

### 前端设置

1. 安装依赖：
```bash
cd frontend
npm install
```

2. 启动开发服务器：
```bash
npm start
```

3. 构建生产版本：
```bash
npm run build
```

### 一键启动所有服务

使用以下命令一键启动后端、前端和NATAPP隧道：

```bash
./start_with_natapp.sh
```

### 公网访问设置

1. 在NATAPP官网（https://natapp.cn）注册账号并购买隧道
2. 下载NATAPP客户端并放置在项目根目录
3. 配置config.ini文件，设置authtoken和本地端口
4. 使用start_with_natapp.sh脚本启动所有服务

访问地址：
- 前端本地地址：http://localhost:8001
- 后端本地地址：http://localhost:8002
- 前端公网地址：http://你的域名.natapp1.cc

## MinIO服务

MinIO用于存储演员的媒体文件（头像、照片、视频）。

- API地址：http://localhost:9000
- 控制台地址：http://localhost:9001
- 默认用户名：minioadmin
- 默认密码：minioadmin

## API文档

启动应用后，访问以下地址查看API文档：

```
http://localhost:8000/docs
```

完整的API文档请参考 `api_documentation.md` 文件。

## 跨平台支持

媒体上传API支持以下平台：

- 电脑端：Windows, Mac, Linux
- 手机端：iOS, Android, HarmonyOS

特别优化了iOS设备的HEIC/HEIF格式图片处理。 