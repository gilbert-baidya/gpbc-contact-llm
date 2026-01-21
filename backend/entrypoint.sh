#!/bin/bash
set -e

echo "🚀 Starting Church Contact Backend..."
echo "=================================="

# Check environment variables
echo "📋 Checking environment variables..."
python check_env.py

if [ $? -ne 0 ]; then
    echo "❌ Environment check failed. Please set all required variables in Railway."
    exit 1
fi

echo "✅ Environment check passed!"
echo ""
echo "🔥 Starting uvicorn server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
