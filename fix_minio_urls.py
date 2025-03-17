#!/usr/bin/env python3
"""
修复数据库中的MinIO URL
将所有URL统一为当前环境变量中设置的MINIO_EXTERNAL_URL
"""
import os
import sys
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import re

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入配置
from backend.app.core.config import settings

def parse_args():
    parser = argparse.ArgumentParser(description='修复数据库中的MinIO URL')
    parser.add_argument('--dry-run', action='store_true', help='只显示将要修改的内容，不实际修改数据库')
    parser.add_argument('--target-url', type=str, help='目标URL前缀，默认使用环境变量MINIO_EXTERNAL_URL')
    return parser.parse_args()

def main():
    args = parse_args()
    
    # 获取目标URL前缀
    target_url = args.target_url or settings.MINIO_EXTERNAL_URL
    if not target_url:
        print("错误: 未指定目标URL前缀，请设置环境变量MINIO_EXTERNAL_URL或使用--target-url参数")
        sys.exit(1)
    
    print(f"目标URL前缀: {target_url}")
    
    # 创建数据库连接
    engine = create_engine(settings.DATABASE_URI)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 查找所有演员记录
        actors = session.execute(text("SELECT id, real_name, avatar_url FROM actors")).fetchall()
        
        # 统计需要修改的记录数
        modified_count = 0
        
        # 处理演员头像URL
        for actor in actors:
            actor_id = actor[0]
            real_name = actor[1]
            avatar_url = actor[2]
            
            if not avatar_url:
                continue
            
            # 检查URL是否需要修改
            if avatar_url.startswith('http://') and not avatar_url.startswith(target_url):
                # 提取路径部分
                path_match = re.search(r'https?://[^/]+(/.*)', avatar_url)
                if path_match:
                    path = path_match.group(1)
                    new_url = f"{target_url}{path}"
                    
                    print(f"演员 {real_name} (ID: {actor_id}):")
                    print(f"  原URL: {avatar_url}")
                    print(f"  新URL: {new_url}")
                    
                    if not args.dry_run:
                        session.execute(
                            text("UPDATE actors SET avatar_url = :new_url WHERE id = :actor_id"),
                            {"new_url": new_url, "actor_id": actor_id}
                        )
                    
                    modified_count += 1
        
        # 处理媒体文件URL
        media_records = session.execute(text("SELECT id, actor_id, file_path FROM actor_media")).fetchall()
        
        for media in media_records:
            media_id = media[0]
            actor_id = media[1]
            file_path = media[2]
            
            if not file_path:
                continue
            
            # 检查URL是否需要修改
            if file_path.startswith('http://') and not file_path.startswith(target_url):
                # 提取路径部分
                path_match = re.search(r'https?://[^/]+(/.*)', file_path)
                if path_match:
                    path = path_match.group(1)
                    new_url = f"{target_url}{path}"
                    
                    print(f"媒体文件 (ID: {media_id}, 演员ID: {actor_id}):")
                    print(f"  原URL: {file_path}")
                    print(f"  新URL: {new_url}")
                    
                    if not args.dry_run:
                        session.execute(
                            text("UPDATE actor_media SET file_path = :new_url WHERE id = :media_id"),
                            {"new_url": new_url, "media_id": media_id}
                        )
                    
                    modified_count += 1
        
        if not args.dry_run:
            session.commit()
            print(f"\n成功修改 {modified_count} 条记录")
        else:
            print(f"\n发现 {modified_count} 条需要修改的记录（干运行模式，未实际修改）")
            print("如需实际修改数据库，请去掉--dry-run参数")
    
    except Exception as e:
        session.rollback()
        print(f"错误: {str(e)}")
        sys.exit(1)
    
    finally:
        session.close()

if __name__ == "__main__":
    main() 