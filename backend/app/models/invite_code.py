from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class InviteCodeStatus(str, enum.Enum):
    ACTIVE = "active"
    USED = "used"
    INACTIVE = "inactive"

class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(String(36), primary_key=True)
    code = Column(String(6), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(InviteCodeStatus), default=InviteCodeStatus.ACTIVE)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    used_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 关联关系
    agent = relationship("User", foreign_keys=[agent_id], back_populates="created_invite_codes")
    actor = relationship("User", foreign_keys=[used_by], back_populates="used_invite_code") 