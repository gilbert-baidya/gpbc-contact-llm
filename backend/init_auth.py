"""
Database initialization script for authentication
Run this to create the auth tables and seed initial admin user

SECURITY: This script reads DEFAULT_ADMIN_PASSWORD from .env
Never hardcode passwords!
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from auth_models import Base, User, UserRole, LoginAttempt
from auth_service import AuthService
from dotenv import load_dotenv
import sys
import os

# Load environment variables
load_dotenv()

# Database URL - same as your main app
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./church_contacts.db")

def init_auth_db():
    """Initialize authentication tables"""
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✓ Authentication tables created")
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@gpbc.org")
        admin = db.query(User).filter(User.email == admin_email).first()
        
        if not admin:
            # Get credentials from environment
            admin_name = os.getenv("DEFAULT_ADMIN_NAME", "Admin User")
            admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD")
            
            if not admin_password:
                print("❌ ERROR: DEFAULT_ADMIN_PASSWORD not set in .env file!")
                print("Please add this line to your .env file:")
                print("DEFAULT_ADMIN_PASSWORD=your_secure_password_here")
                sys.exit(1)
            
            # Create default admin user
            admin = AuthService.create_user(
                db=db,
                email=admin_email,
                name=admin_name,
                password=admin_password,
                role=UserRole.ADMIN
            )
            print("✓ Default admin user created")
            print(f"  Email: {admin_email}")
            print("  Password: ********")
            print("  ⚠️  IMPORTANT: Store these credentials securely!")
        else:
            print("✓ Admin user already exists")
        
        print("\n✅ Authentication system initialized successfully!")
        print("\n📝 Next steps:")
        print("1. Verify SECRET_KEY is set in your .env file")
        print("2. Store admin credentials in a secure password manager")
        print("3. Restart your backend server")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔐 Initializing Authentication System...\n")
    init_auth_db()
