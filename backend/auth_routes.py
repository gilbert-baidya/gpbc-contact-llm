"""
Authentication API Endpoints
FastAPI routes for authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from database import get_db
from auth_service import AuthService
from auth_models import User, UserRole

router = APIRouter(prefix="/api/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.MEMBER

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    is_active: bool
    is_2fa_enabled: bool
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_token: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class Enable2FARequest(BaseModel):
    token: str

# Dependency to get current user from token
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    payload = AuthService.verify_token(token)
    email: str = payload.get("sub")
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not AuthService.is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_messaging_user(current_user: User = Depends(get_current_user)) -> User:
    if not AuthService.can_send_messages(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Pastor can send messages"
        )
    return current_user

# Routes
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Only admins can register new users
):
    """Register a new user (Admin only)"""
    user = AuthService.create_user(
        db=db,
        email=user_data.email,
        name=user_data.name,
        password=user_data.password,
        role=user_data.role
    )
    return user

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    ip_address = request.client.host if request.client else None
    
    user = AuthService.authenticate_user(
        db=db,
        email=login_data.email,
        password=login_data.password,
        ip_address=ip_address
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check 2FA if enabled
    if user.is_2fa_enabled:
        if not login_data.totp_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="2FA token required"
            )
        
        if not AuthService.verify_2fa(user, login_data.totp_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA token"
            )
    
    # Create tokens
    access_token = AuthService.create_access_token(data={"sub": user.email})
    refresh_token = AuthService.create_refresh_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/password-reset-request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request a password reset token"""
    token = AuthService.create_reset_token(db, reset_request.email)
    
    # In production, send this token via email
    # For now, return it (REMOVE IN PRODUCTION!)
    if token:
        return {
            "message": "Password reset token created",
            "token": token,  # REMOVE THIS IN PRODUCTION
            "note": "In production, this would be sent via email"
        }
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/password-reset-confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    success = AuthService.reset_password(
        db=db,
        token=reset_data.token,
        new_password=reset_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Password reset successful"}

@router.post("/2fa/setup")
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup 2FA for current user"""
    result = AuthService.setup_2fa(db, current_user.id)
    return {
        "secret": result["secret"],
        "qr_uri": result["qr_uri"],
        "message": "Scan the QR code with your authenticator app and verify with a token"
    }

@router.post("/2fa/enable")
async def enable_2fa(
    request: Enable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enable 2FA after verifying initial token"""
    success = AuthService.enable_2fa(db, current_user.id, request.token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )
    
    return {"message": "2FA enabled successfully"}

@router.post("/2fa/disable")
async def disable_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA for current user"""
    AuthService.disable_2fa(db, current_user.id)
    return {"message": "2FA disabled successfully"}

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """List all users (Admin only)"""
    users = db.query(User).all()
    return users

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete a user (Admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: UserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update user role (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    db.commit()
    
    return {"message": f"User role updated to {role}"}
