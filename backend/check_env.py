#!/usr/bin/env python3
"""
Environment variable checker for Railway deployment.
Run this to verify all required environment variables are set.
"""
import os
import sys

REQUIRED_VARS = [
    "DATABASE_URL",
    "REDIS_URL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "OPENAI_API_KEY",
    "SECRET_KEY"
]

OPTIONAL_VARS = [
    "OPENAI_MODEL",
    "DEBUG",
    "ALLOWED_ORIGINS",
    "BACKEND_URL",
    "FRONTEND_URL",
    "TWILIO_WEBHOOK_URL"
]

def check_environment():
    print("=" * 60)
    print("Environment Variable Check")
    print("=" * 60)
    
    missing_vars = []
    present_vars = []
    
    print("\n✅ REQUIRED VARIABLES:")
    for var in REQUIRED_VARS:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if any(key in var.upper() for key in ["KEY", "TOKEN", "PASSWORD", "SECRET"]):
                masked_value = value[:4] + "..." + value[-4:] if len(value) > 8 else "***"
                print(f"  ✓ {var}: {masked_value}")
            else:
                print(f"  ✓ {var}: {value[:50]}...")
            present_vars.append(var)
        else:
            print(f"  ✗ {var}: MISSING")
            missing_vars.append(var)
    
    print("\n📋 OPTIONAL VARIABLES:")
    for var in OPTIONAL_VARS:
        value = os.getenv(var)
        if value:
            print(f"  ✓ {var}: {value[:50]}")
        else:
            print(f"  - {var}: Not set (will use default)")
    
    print("\n" + "=" * 60)
    if missing_vars:
        print(f"❌ MISSING {len(missing_vars)} REQUIRED VARIABLES:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these in Railway's Variables tab.")
        return False
    else:
        print(f"✅ ALL {len(REQUIRED_VARS)} REQUIRED VARIABLES ARE SET!")
        return True

if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1)
