#!/bin/bash

# Start Docker containers if not already running
echo "Checking Docker containers..."
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
docker-compose up -d

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 5

# Start Cloudflare tunnel for backend
echo "Starting Cloudflare tunnel for backend on port 8000..."
echo "Copy the generated URL and add it to Vercel as VITE_API_URL"
cloudflared tunnel --url http://localhost:8000
