#!/bin/bash

# Klaro - Docker Startup Script
# This script makes it easy for recruiters to start the application

echo "🚀 Starting Klaro - Mini AI Analyst as a Service"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p data/uploads data/models logs

# Set permissions
chmod 755 data/uploads data/models logs

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down --remove-orphans

# Build and start the services
echo "🔨 Building and starting services..."
echo "   This may take a few minutes on first run..."

# Use docker-compose or docker compose based on availability
if command -v docker-compose &> /dev/null; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "🔍 Checking service status..."

# Check backend health
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health 2>/dev/null || echo "000")
if [ "$backend_status" = "200" ]; then
    echo "✅ Backend is healthy (Port 8001)"
else
    echo "⚠️  Backend is starting up... (Port 8001)"
fi

# Check frontend health
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$frontend_status" = "200" ]; then
    echo "✅ Frontend is healthy (Port 3000)"
else
    echo "⚠️  Frontend is starting up... (Port 3000)"
fi

echo ""
echo "🎉 Klaro is starting up!"
echo ""
echo "📱 Access the application:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8001"
echo "   API Docs:  http://localhost:8001/docs"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "⏳ Services may take 1-2 minutes to fully start up."
echo "   If you see errors, wait a moment and refresh the page."
