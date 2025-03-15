from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
import datetime


class ActorMedia(Base):
    """演员媒体文件模型"""
    __tablename__ = "actor_media"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(20), ForeignKey("actors.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum('avatar', 'photo', 'video', name='media_type_enum'), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True, comment='文件大小(字节)')
    mime_type = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_public = Column(Boolean, default=True)
    bucket_name = Column(String(100), nullable=True, comment='MinIO bucket名称')
    object_name = Column(String(255), nullable=True, comment='MinIO对象名称')
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="media")
    uploader = relationship("User") 