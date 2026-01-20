"""
Authentication Service
Handles user authentication, JWT tokens, password hashing, 2FA
"""
from datetime import datetime, timedelta
from typing import Optional, Dict
import secrets
import pyotp
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from auth_models import User, UserRole, LoginAttempt

# Configuration - In production, move these to environment variables
SECRET_KEY = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create a JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Dict:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str, ip_address: str = None) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(User.email == email.lower()).first()
        
        # Log attempt
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            success=False
        )
        
        if not user:
            db.add(attempt)
            db.commit()
            return None
        
        if not user.is_active:
            db.add(attempt)
            db.commit()
            return None
        
        if not AuthService.verify_password(password, user.hashed_password):
            db.add(attempt)
            db.commit()
            return None
        
        # Successful login
        attempt.success = True
        user.last_login = datetime.utcnow()
        db.add(attempt)
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def create_user(db: Session, email: str, name: str, password: str, role: UserRole = UserRole.MEMBER) -> User:
        """Create a new user"""
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email.lower()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        hashed_password = AuthService.hash_password(password)
        
        user = User(
            email=email.lower(),
            name=name,
            hashed_password=hashed_password,
            role=role,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        return user
    
    @staticmethod
    def generate_reset_token() -> str:
        """Generate a secure password reset token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def create_reset_token(db: Session, email: str) -> Optional[str]:
        """Create a password reset token for a user"""
        user = db.query(User).filter(User.email == email.lower()).first()
        if not user:
            return None
        
        token = AuthService.generate_reset_token()
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        
        db.commit()
        return token
    
    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> bool:
        """Reset a user's password using a reset token"""
        user = db.query(User).filter(User.reset_token == token).first()
        
        if not user:
            return False
        
        if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            return False
        
        user.hashed_password = AuthService.hash_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        
        db.commit()
        return True
    
    @staticmethod
    def setup_2fa(db: Session, user_id: int) -> Dict:
        """Set up 2FA for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Generate TOTP secret
        secret = pyotp.random_base32()
        user.totp_secret = secret
        db.commit()
        
        # Generate QR code URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="Church Contact System"
        )
        
        return {
            "secret": secret,
            "qr_uri": provisioning_uri
        }
    
    @staticmethod
    def verify_2fa(user: User, token: str) -> bool:
        """Verify a 2FA token"""
        if not user.is_2fa_enabled or not user.totp_secret:
            return True  # 2FA not enabled
        
        totp = pyotp.TOTP(user.totp_secret)
        return totp.verify(token, valid_window=1)
    
    @staticmethod
    def enable_2fa(db: Session, user_id: int, token: str) -> bool:
        """Enable 2FA for a user after verifying the initial token"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.totp_secret:
            return False
        
        if not AuthService.verify_2fa(user, token):
            return False
        
        user.is_2fa_enabled = True
        db.commit()
        return True
    
    @staticmethod
    def disable_2fa(db: Session, user_id: int) -> bool:
        """Disable 2FA for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.is_2fa_enabled = False
        user.totp_secret = None
        db.commit()
        return True
    
    @staticmethod
    def can_send_messages(user: User) -> bool:
        """Check if user has permission to send messages"""
        return user.role in [UserRole.ADMIN, UserRole.PASTOR]
    
    @staticmethod
    def is_admin(user: User) -> bool:
        """Check if user is an admin"""
        return user.role == UserRole.ADMIN
