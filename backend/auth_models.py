"""
Authentication Models
Handles user authentication, roles, and permissions
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    PASTOR = "pastor"
    MEMBER = "member"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 2FA fields
    is_2fa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    
    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    
    # Last login
    last_login = Column(DateTime, nullable=True)

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    ip_address = Column(String)
    success = Column(Boolean)
    timestamp = Column(DateTime, default=datetime.utcnow)
