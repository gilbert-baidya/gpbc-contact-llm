#!/bin/bash

# ============================================
# Secret Rotation Script
# ============================================
# Run this to rotate all secrets after a leak
# or for regular security maintenance
# ============================================

set -e

echo "🔒 Secret Rotation Script"
echo "========================="
echo ""
echo "This script will help you generate new secure secrets."
echo "You'll need to update these in:"
echo "  - backend/.env file"
echo "  - Your deployment platform (Railway, Render, etc.)"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: openssl not found. Please install it first."
    exit 1
fi

echo "📝 Generating new secrets..."
echo ""

# Generate JWT SECRET_KEY
echo "1. JWT SECRET_KEY:"
NEW_SECRET_KEY=$(openssl rand -hex 32)
echo "   $NEW_SECRET_KEY"
echo ""

# Generate admin password
echo "2. Admin Password:"
NEW_ADMIN_PASSWORD=$(openssl rand -base64 24)
echo "   $NEW_ADMIN_PASSWORD"
echo ""

# Generate session secret
echo "3. Session Secret:"
NEW_SESSION_SECRET=$(openssl rand -hex 32)
echo "   $NEW_SESSION_SECRET"
echo ""

echo "✅ New secrets generated!"
echo ""
echo "⚠️  IMPORTANT: Update these in your .env files:"
echo ""
echo "backend/.env:"
echo "-------------"
echo "SECRET_KEY=$NEW_SECRET_KEY"
echo "DEFAULT_ADMIN_PASSWORD=$NEW_ADMIN_PASSWORD"
echo ""
echo "Also update on your deployment platform!"
echo ""

# Prompt to save to file
read -p "💾 Save to secrets.txt? (NOT recommended, store in password manager) [y/N]: " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cat > secrets.txt << EOF
# Generated on $(date)
# DELETE THIS FILE after storing in password manager!

SECRET_KEY=$NEW_SECRET_KEY
DEFAULT_ADMIN_PASSWORD=$NEW_ADMIN_PASSWORD
SESSION_SECRET=$NEW_SESSION_SECRET

# Remember to also rotate:
# - TWILIO_AUTH_TOKEN (https://console.twilio.com/)
# - OPENAI_API_KEY (https://platform.openai.com/api-keys)
# - Database passwords
EOF
    echo "✅ Saved to secrets.txt"
    echo "⚠️  DELETE THIS FILE after copying to your password manager!"
    echo "⚠️  This file contains sensitive information!"
else
    echo "✅ Not saved to file (recommended)"
fi

echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with new SECRET_KEY and DEFAULT_ADMIN_PASSWORD"
echo "2. Rotate Twilio auth token at https://console.twilio.com/"
echo "3. Rotate OpenAI API key at https://platform.openai.com/api-keys"
echo "4. Update deployment platform environment variables"
echo "5. Restart all services"
echo "6. Run: cd backend && python init_auth.py (if database is empty)"
echo ""
echo "🔍 Don't forget to:"
echo "   - Store secrets in a password manager"
echo "   - Update your deployment platform"
echo "   - Delete any backup files containing old secrets"
echo ""
