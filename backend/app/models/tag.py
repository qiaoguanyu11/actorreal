from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

# 演员和标签的多对多关联表
actor_tag = Table(
    "actor_tags",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("actor_id", String(20), ForeignKey("actors.id", ondelete="CASCADE"), nullable=False),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False),
    Column("created_by", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    Column("created_at", DateTime, default=datetime.datetime.utcnow)
)


class Tag(Base):
    """标签模型"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    category = Column(String(50), nullable=True)  # 类别，如：演员定位、作品类型等
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 与演员的多对多关系
    actors = relationship("Actor", secondary=actor_tag, back_populates="tags") 