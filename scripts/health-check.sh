#!/bin/bash

# Health check script

echo "================================================"
echo "Church Contact System - Health Check"
echo "================================================"
echo ""

# Check backend
echo "🔍 Checking Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$BACKEND_STATUS" -eq 200 ]; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Not responding (Status: $BACKEND_STATUS)"
fi

# Check frontend
echo ""
echo "🔍 Checking Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$FRONTEND_STATUS" -eq 200 ]; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Not responding (Status: $FRONTEND_STATUS)"
fi

# Check containers
echo ""
echo "🔍 Checking Docker Containers..."
docker-compose ps

# Get statistics
echo ""
echo "📊 System Statistics:"
curl -s http://localhost:8000/api/statistics | python3 -m json.tool

echo ""
echo "================================================"
