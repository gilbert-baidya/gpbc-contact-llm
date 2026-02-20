#!/bin/bash

# GPBC Contact System - Start Script
# This script starts all services and provides helpful information

echo "================================================"
echo "Church Contact Communication System"
echo "================================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "🔑 Please edit .env file and add your API keys:"
    echo "   - TWILIO_ACCOUNT_SID"
    echo "   - TWILIO_AUTH_TOKEN"
    echo "   - TWILIO_PHONE_NUMBER"
    echo "   - OPENAI_API_KEY"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo "🚀 Starting GPBC Contact System..."
echo ""

# Start services
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "================================================"
echo "✅ System Started Successfully!"
echo "================================================"
echo ""
echo "📱 Access Points:"
echo "   Dashboard:  http://localhost:3000"
echo "   API:        http://localhost:8000"
echo "   API Docs:   http://localhost:8000/docs"
echo ""
echo "📚 Documentation:"
echo "   Quick Start:    See QUICKSTART.md"
echo "   Setup Guide:    See SETUP_GUIDE.md"
echo "   API Docs:       See API_DOCUMENTATION.md"
echo "   Features:       See FEATURES.md"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:      docker-compose logs -f"
echo "   Stop system:    docker-compose down"
echo "   Restart:        docker-compose restart"
echo "   Stop script:    ./scripts/stop.sh"
echo ""
echo "📞 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Go to Contacts → Import CSV"
echo "   3. Upload your contacts file"
echo "   4. Start sending messages!"
echo ""
echo "================================================"
