"""
Database initialization script for authentication
Run this to create the auth tables and seed initial admin user
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from auth_models import Base, User, UserRole, LoginAttempt
from auth_service import AuthService
import sys

# Database URL - same as your main app
DATABASE_URL = "sqlite:///./church_contacts.db"

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
        admin = db.query(User).filter(User.email == "admin@gpbc.org").first()
        
        if not admin:
            # Create default admin user
            admin = AuthService.create_user(
                db=db,
                email="admin@gpbc.org",
                name="Admin User",
                password="admin123",  # Change this immediately!
                role=UserRole.ADMIN
            )
            print("✓ Default admin user created")
            print("  Email: admin@gpbc.org")
            print("  Password: admin123")
            print("  ⚠️  IMPORTANT: Change this password immediately!")
        else:
            print("✓ Admin user already exists")
        
        # Create pastor user if doesn't exist
        pastor = db.query(User).filter(User.email == "pastor@gpbc.org").first()
        if not pastor:
            pastor = AuthService.create_user(
                db=db,
                email="pastor@gpbc.org",
                name="Pastor John",
                password="pastor123",
                role=UserRole.PASTOR
            )
            print("✓ Default pastor user created")
            print("  Email: pastor@gpbc.org")
            print("  Password: pastor123")
        
        # Create member user if doesn't exist
        member = db.query(User).filter(User.email == "member@gpbc.org").first()
        if not member:
            member = AuthService.create_user(
                db=db,
                email="member@gpbc.org",
                name="Member Tom",
                password="member123",
                role=UserRole.MEMBER
            )
            print("✓ Default member user created")
            print("  Email: member@gpbc.org")
            print("  Password: member123")
        
        print("\n✅ Authentication system initialized successfully!")
        print("\n📝 Next steps:")
        print("1. Update the SECRET_KEY in auth_service.py")
        print("2. Change default passwords")
        print("3. Restart your backend server")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔐 Initializing Authentication System...\n")
    init_auth_db()
