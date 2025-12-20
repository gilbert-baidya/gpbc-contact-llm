#!/bin/bash

# Start Docker containers
echo "Starting Docker containers..."
cd "/Users/gbaidya/Documents/Project cool/Church contact LLM"
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Start Cloudflare tunnel
echo "Starting Cloudflare tunnel..."
cloudflared tunnel --url http://localhost:3000
