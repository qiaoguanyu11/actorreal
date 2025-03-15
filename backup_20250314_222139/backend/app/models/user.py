from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Table
from sqlalchemy.orm import relationship
import datetime
from backend.app.core.database import Base


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    role = Column(Enum('performer', 'manager', 'admin', name='user_role_enum'), 
                 nullable=False, default='performer')
    status = Column(Enum('active', 'inactive', 'banned', name='user_status_enum'), 
                   nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="user", uselist=False)
    permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    managed_contracts = relationship("ActorContractInfo", foreign_keys="ActorContractInfo.agent_id")
    status_changes = relationship("ActorStatusHistory", foreign_keys="ActorStatusHistory.changed_by")
    uploaded_media = relationship("ActorMedia", foreign_keys="ActorMedia.uploaded_by")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"


class UserPermission(Base):
    """用户权限模型"""
    __tablename__ = "user_permissions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="permissions")
    
    def __repr__(self):
        return f"<UserPermission(id={self.id}, user_id={self.user_id}, permission={self.permission})>"


class IDCounter(Base):
    """ID计数器模型，用于生成自定义ID"""
    __tablename__ = "id_counters"
    __table_args__ = {'extend_existing': True}
    
    counter_key = Column(String(50), primary_key=True)
    current_value = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f"<IDCounter(counter_key={self.counter_key}, current_value={self.current_value})>" 