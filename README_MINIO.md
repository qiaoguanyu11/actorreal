# MinIO 配置说明

本系统使用MinIO作为对象存储服务，用于存储演员的照片、视频等媒体文件。

## 环境配置

系统支持两种运行环境：

1. 本地开发环境：使用 `http://localhost:9000` 作为MinIO的访问地址
2. 公网环境：使用 `http://huameng.natapp1.cc` 作为MinIO的访问地址（通过natapp隧道实现）

## 启动脚本

系统提供了两个启动脚本：

1. `start_local.sh`：在本地开发环境中启动系统
   - 设置 `MINIO_EXTERNAL_URL=http://localhost:9000`
   - 启动MinIO服务
   - 启动后端API服务
   - 启动前端静态文件服务器

2. `start_with_natapp.sh`：通过natapp隧道启动系统
   - 设置 `MINIO_EXTERNAL_URL=http://huameng.natapp1.cc`
   - 启动后端API服务
   - 启动前端静态文件服务器
   - 启动natapp隧道

## 修复MinIO URL

如果数据库中的MinIO URL不一致（有些使用本地地址，有些使用公网地址），可以使用 `fix_minio_urls.py` 脚本进行修复：

```bash
# 查看将要修改的内容（不实际修改数据库）
python3 fix_minio_urls.py --dry-run

# 修复数据库中的URL，使用当前环境变量中的MINIO_EXTERNAL_URL
python3 fix_minio_urls.py

# 修复数据库中的URL，指定目标URL前缀
python3 fix_minio_urls.py --target-url http://localhost:9000
```

## 注意事项

1. 在切换环境时，需要运行 `fix_minio_urls.py` 脚本修复数据库中的URL
2. 在本地开发环境中，确保MinIO服务已启动
3. 在公网环境中，确保natapp隧道已启动并正常工作

## 环境变量

系统使用以下环境变量：

- `MINIO_EXTERNAL_URL`：MinIO的外部访问URL，默认为 `http://localhost:9000`
- `MINIO_ROOT_USER`：MinIO的管理员用户名，默认为 `minioadmin`
- `MINIO_ROOT_PASSWORD`：MinIO的管理员密码，默认为 `minioadmin` 