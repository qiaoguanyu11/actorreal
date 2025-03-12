from sqlalchemy import Column, String, Integer, Date, Enum, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base


class Actor(Base):
    """演员基本信息模型"""
    __tablename__ = "actors"

    id = Column(String(20), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    real_name = Column(String(100), nullable=False)
    stage_name = Column(String(100), nullable=True)
    gender = Column(Enum('male', 'female', 'other', name='gender_enum'), nullable=False)
    age = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True, comment='身高(cm)')
    weight = Column(Integer, nullable=True, comment='体重(kg)')
    bust = Column(Integer, nullable=True, comment='胸围(cm)')
    waist = Column(Integer, nullable=True, comment='腰围(cm)')
    hip = Column(Integer, nullable=True, comment='臀围(cm)')
    status = Column(Enum('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted', 
                        name='actor_status_enum'), nullable=False, default='active')
    avatar_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    professional_info = relationship("ActorProfessionalInfo", back_populates="actor", uselist=False, cascade="all, delete-orphan")
    contact_info = relationship("ActorContactInfo", back_populates="actor", uselist=False, cascade="all, delete-orphan")
    contract_info = relationship("ActorContractInfo", back_populates="actor", uselist=False, cascade="all, delete-orphan")
    media = relationship("ActorMedia", back_populates="actor", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="actor_tags", back_populates="actors")
    status_history = relationship("ActorStatusHistory", back_populates="actor", cascade="all, delete-orphan")
    
    user = relationship("User", back_populates="actor")


class ActorProfessionalInfo(Base):
    """演员专业信息模型"""
    __tablename__ = "actor_professional_info"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(20), ForeignKey("actors.id"), nullable=False)
    bio = Column(String(2000), nullable=True, comment='个人简介')
    skills = Column(String(500), nullable=True, comment='技能，JSON格式存储')
    experience = Column(String(2000), nullable=True, comment='经验，JSON格式存储')
    education = Column(String(1000), nullable=True, comment='教育背景，JSON格式存储')
    awards = Column(String(1000), nullable=True, comment='获奖情况，JSON格式存储')
    languages = Column(String(500), nullable=True, comment='语言能力，JSON格式存储')
    current_rank = Column(Enum('主角', '角色', '特约', '群演', '无经验', name='actor_rank_enum'), 
                         nullable=True, comment='演员等级')
    minimum_fee = Column(Float, nullable=True, comment='接受最低片酬（元/天）')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="professional_info")


class ActorContactInfo(Base):
    """演员联系信息模型"""
    __tablename__ = "actor_contact_info"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(20), ForeignKey("actors.id"), nullable=False)
    phone = Column(String(20), nullable=True)
    wechat = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    emergency_phone = Column(String(20), nullable=True)
    social_media = Column(String(1000), nullable=True, comment='社交媒体，JSON格式存储')
    email = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="contact_info")


class ActorContractInfo(Base):
    """演员合同信息模型"""
    __tablename__ = "actor_contract_info"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(20), ForeignKey("actors.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment='经纪人ID')
    fee_standard = Column(String(500), nullable=True, comment='片酬标准')
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    contract_terms = Column(String(1000), nullable=True, comment='合同条款')
    commission_rate = Column(Integer, nullable=True, comment='佣金比例')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="contract_info")
    agent = relationship("User")


class ActorStatusHistory(Base):
    """演员状态变更历史模型"""
    __tablename__ = "actor_status_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(String(20), ForeignKey("actors.id"), nullable=False)
    previous_status = Column(Enum('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted', 
                           name='actor_status_history_enum'), nullable=True)
    new_status = Column(Enum('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted', 
                       name='actor_status_history_enum2'), nullable=False)
    reason = Column(String(255), nullable=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # 关系
    actor = relationship("Actor", back_populates="status_history") 