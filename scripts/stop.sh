#!/bin/bash

# Church Contact System - Stop Script

echo "================================================"
echo "Stopping Church Contact System"
echo "================================================"
echo ""

docker-compose down

echo ""
echo "✅ System stopped successfully!"
echo ""
echo "To start again, run: ./scripts/start.sh"
echo "To remove all data, run: docker-compose down -v"
echo ""
