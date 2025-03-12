#!/usr/bin/env python3
"""
测试数据库连接和CRUD操作
"""
from sqlalchemy import create_engine, Column, String, Integer, Float, Enum, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

# 数据库连接URI
DATABASE_URI = "mysql+pymysql://root:hepzibah1@localhost:3306/actors_management"

# 创建数据库引擎和基类
engine = create_engine(DATABASE_URI)
Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 定义简化的演员模型类
class Actor(Base):
    __tablename__ = "actors"
    
    id = Column(String(20), primary_key=True)
    real_name = Column(String(100), nullable=False)
    stage_name = Column(String(100), nullable=True)
    gender = Column(Enum('male', 'female', 'other'), nullable=False)
    age = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    weight = Column(Integer, nullable=True)
    bust = Column(Integer, nullable=True)
    waist = Column(Integer, nullable=True)
    hip = Column(Integer, nullable=True)
    status = Column(Enum('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted'), 
                   nullable=False, default='active')
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        db.close()

def test_actors_table():
    """测试演员表的CRUD操作"""
    print("开始测试演员表...")
    
    db = get_db()
    
    try:
        # 查询所有演员
        actors = db.query(Actor).all()
        print(f"当前演员数量: {len(actors)}")
        
        # 如果没有演员，创建一个测试演员
        if not actors:
            print("创建测试演员...")
            test_actor = Actor(
                id="A10001",
                real_name="测试演员",
                stage_name="测试艺名",
                gender="male",
                age=25,
                height=180,
                weight=70,
                bust=90,
                waist=70,
                hip=90,
                status="active"
            )
            db.add(test_actor)
            db.commit()
            db.refresh(test_actor)
            print(f"已创建测试演员: {test_actor.real_name} (ID: {test_actor.id})")
        else:
            print("已存在演员数据，跳过创建")
            for actor in actors:
                print(f"  - {actor.real_name} (ID: {actor.id})")
        
        # 测试更新
        if actors:
            test_actor = actors[0]
            print(f"更新演员 {test_actor.real_name}...")
            test_actor.age = test_actor.age + 1 if test_actor.age else 25
            db.commit()
            print(f"已更新演员年龄为 {test_actor.age}")
        
        print("演员表测试成功")
    except Exception as e:
        print(f"演员表测试失败: {e}")
    finally:
        db.close()

def test_database_connection():
    """测试数据库连接"""
    print("测试数据库连接...")
    
    try:
        # 执行简单查询
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("数据库连接成功")
        return True
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return False

if __name__ == "__main__":
    if test_database_connection():
        test_actors_table()
    else:
        print("由于数据库连接失败，跳过后续测试") 