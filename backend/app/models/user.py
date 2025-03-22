from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Table
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False, unique=True)
    role = Column(Enum('performer', 'manager', 'admin', name='user_role_enum'), 
                 nullable=False, default='performer')
    status = Column(Enum('active', 'inactive', 'banned', name='user_status_enum'), 
                   nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="user", uselist=False, foreign_keys="Actor.user_id")
    permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    managed_contracts = relationship("ActorContractInfo", foreign_keys="ActorContractInfo.agent_id")
    status_changes = relationship("ActorStatusHistory", foreign_keys="ActorStatusHistory.changed_by")
    uploaded_media = relationship("ActorMedia", foreign_keys="ActorMedia.uploaded_by")
    created_invite_codes = relationship("InviteCode", foreign_keys="InviteCode.agent_id", back_populates="agent")
    used_invite_code = relationship("InviteCode", foreign_keys="InviteCode.used_by", back_populates="actor")
    
    def __repr__(self):
        return f"<User {self.username}>"


class UserPermission(Base):
    """用户权限模型"""
    __tablename__ = "user_permissions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="permissions")
    
    def __repr__(self):
        return f"<Permission {self.permission} for {self.user_id}>"


class IDCounter(Base):
    """ID计数器模型，用于生成自定义ID"""
    __tablename__ = "id_counters"
    
    counter_key = Column(String(50), primary_key=True)
    current_value = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f"<IDCounter {self.counter_key}: {self.current_value}>" 