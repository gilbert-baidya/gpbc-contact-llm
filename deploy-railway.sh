#!/bin/bash

# ============================================
# Railway Deployment Script
# ============================================
# Deploys both backend and frontend to Railway
# ============================================

set -e

echo "🚀 Railway Deployment Script"
echo "=============================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    brew install railway || {
        echo "❌ Failed to install Railway CLI"
        echo "Please install manually: https://docs.railway.app/develop/cli"
        exit 1
    }
fi

# Check if logged in
railway whoami &> /dev/null || {
    echo "📝 Please login to Railway..."
    railway login
}

echo "✅ Railway CLI ready"
echo ""

# Get secrets
echo "🔐 Setting up secrets..."
echo ""
read -p "Enter your Twilio Account SID: " TWILIO_SID
read -p "Enter your Twilio Auth Token: " TWILIO_TOKEN
read -p "Enter your Twilio Phone Number (e.g., +1234567890): " TWILIO_PHONE
read -p "Enter your OpenAI API Key: " OPENAI_KEY
read -p "Enter your Google Apps Script URL: " GOOGLE_SCRIPT_URL
read -sp "Enter secure admin password: " ADMIN_PASSWORD
echo ""

# Generate SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)
echo "✅ Generated SECRET_KEY"

# Deploy Backend
echo ""
echo "📦 Deploying Backend..."
cd "$(dirname "$0")/backend"

# Initialize Railway project for backend
railway init --name "gpbc-contact-backend" 2>/dev/null || echo "Backend project exists"

# Set environment variables
echo "Setting backend environment variables..."
railway variables set \
    TWILIO_ACCOUNT_SID="$TWILIO_SID" \
    TWILIO_AUTH_TOKEN="$TWILIO_TOKEN" \
    TWILIO_PHONE_NUMBER="$TWILIO_PHONE" \
    OPENAI_API_KEY="$OPENAI_KEY" \
    SECRET_KEY="$SECRET_KEY" \
    DEFAULT_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    GOOGLE_SCRIPT_URL="$GOOGLE_SCRIPT_URL" \
    DATABASE_URL="sqlite:///./church_contacts.db" \
    DEBUG="False" \
    ENV="production"

# Deploy backend
echo "Deploying backend code..."
railway up --detach

# Get backend URL
echo "Waiting for backend to deploy..."
sleep 10
BACKEND_URL=$(railway domain 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  Backend deployed but domain not assigned yet"
    echo "Please run: cd backend && railway domain"
    echo "Then update frontend with: VITE_API_URL=https://your-domain.up.railway.app"
    read -p "Enter backend domain manually (or press Enter to skip): " BACKEND_URL
fi

if [ ! -z "$BACKEND_URL" ]; then
    # Add https:// if not present
    if [[ ! "$BACKEND_URL" =~ ^https?:// ]]; then
        BACKEND_URL="https://$BACKEND_URL"
    fi
    
    echo "✅ Backend deployed at: $BACKEND_URL"
    
    # Update CORS
    railway variables set ALLOWED_ORIGINS="$BACKEND_URL,https://*.railway.app"
fi

# Deploy Frontend
echo ""
echo "📦 Deploying Frontend..."
cd ../frontend

# Initialize Railway project for frontend
railway init --name "gpbc-contact-frontend" 2>/dev/null || echo "Frontend project exists"

# Set frontend environment variable
if [ ! -z "$BACKEND_URL" ]; then
    echo "Setting frontend environment variable..."
    railway variables set VITE_API_URL="$BACKEND_URL"
fi

# Deploy frontend
echo "Deploying frontend code..."
railway up --detach

# Get frontend URL
echo "Waiting for frontend to deploy..."
sleep 10
FRONTEND_URL=$(railway domain 2>/dev/null || echo "")

if [ -z "$FRONTEND_URL" ]; then
    echo "⚠️  Frontend deployed but domain not assigned yet"
    echo "Please run: cd frontend && railway domain"
else
    if [[ ! "$FRONTEND_URL" =~ ^https?:// ]]; then
        FRONTEND_URL="https://$FRONTEND_URL"
    fi
    echo "✅ Frontend deployed at: $FRONTEND_URL"
fi

# Update backend CORS with frontend URL
if [ ! -z "$FRONTEND_URL" ] && [ ! -z "$BACKEND_URL" ]; then
    cd ../backend
    railway variables set ALLOWED_ORIGINS="$FRONTEND_URL,https://*.railway.app"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
if [ ! -z "$BACKEND_URL" ]; then
    echo "Backend:  $BACKEND_URL"
    echo "API Docs: $BACKEND_URL/docs"
fi
if [ ! -z "$FRONTEND_URL" ]; then
    echo "Frontend: $FRONTEND_URL"
fi
echo ""
echo "📋 Next Steps:"
echo "1. Visit $FRONTEND_URL/login"
echo "2. Login with your admin credentials"
echo "3. Change the default password immediately"
echo "4. Initialize database at $BACKEND_URL/docs (if needed)"
echo ""
echo "⚠️  Important:"
echo "- Store your admin password securely"
echo "- Monitor your Railway usage (free tier: \$5/month)"
echo "- Set up a custom domain if desired"
echo ""
