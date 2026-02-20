#!/bin/bash

# Start Frontend Development Server
# Double-click this file or run: ./start-frontend.sh

cd "$(dirname "$0")/frontend"

echo "🚀 Starting Church Contact LLM Frontend..."
echo "📁 Working directory: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Kill any existing process on port 5173
echo "🧹 Cleaning up port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
echo ""

# Start the server
echo "✨ Starting Vite dev server..."
echo "🌐 Server will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
