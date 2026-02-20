#!/bin/bash

# Restart Frontend Development Server
# This script kills any existing server and starts a fresh one

echo "🔄 Restarting Church Contact LLM Frontend..."
echo ""

# Kill any existing process on port 5173
echo "🧹 Stopping existing server..."
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✅ Stopped existing server" || echo "ℹ️  No server was running"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Start the server
echo "✨ Starting fresh Vite dev server..."
echo "🌐 Server will be available at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
