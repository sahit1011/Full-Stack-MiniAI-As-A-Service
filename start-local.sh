#!/bin/bash
# Klaro - Local Development Startup Script for Linux/macOS
# This script starts both frontend and backend servers locally

echo "🚀 Starting Klaro - Local Development Mode"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if Python is installed
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python found: $PYTHON_VERSION${NC}"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✅ Python found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python is not installed. Please install Python 3.8+ first.${NC}"
    echo -e "${YELLOW}   Install with: sudo apt install python3 python3-pip python3-venv (Ubuntu/Debian)${NC}"
    echo -e "${YELLOW}   Or download from: https://www.python.org/downloads/${NC}"
    exit 1
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo -e "${YELLOW}   Install with: sudo apt install nodejs npm (Ubuntu/Debian)${NC}"
    echo -e "${YELLOW}   Or download from: https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is installed
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: v$NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is not installed. Please install Node.js (includes npm).${NC}"
    exit 1
fi

# Create required directories
echo -e "${CYAN}📁 Creating required directories...${NC}"
mkdir -p data/uploads data/models logs
echo -e "${GRAY}   Created: data/uploads, data/models, logs${NC}"

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${CYAN}📦 Creating Python virtual environment...${NC}"
    cd backend
    $PYTHON_CMD -m venv venv
    cd ..
fi

# Install backend dependencies
echo -e "${CYAN}📦 Installing backend dependencies...${NC}"
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Install frontend dependencies
echo -e "${CYAN}📦 Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

echo -e "${CYAN}🔧 Starting services...${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo -e "${GREEN}✅ Services stopped.${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server in background
echo -e "${YELLOW}🐍 Starting Backend Server (Port 8001)...${NC}"
cd backend
source venv/bin/activate
$PYTHON_CMD -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
echo -e "${YELLOW}⚛️  Starting Frontend Server (Port 3000)...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for services to be ready
echo -e "${CYAN}⏳ Waiting for services to be ready...${NC}"
sleep 10

echo ""
echo -e "${GREEN}🎉 Klaro Local Development is starting up!${NC}"
echo ""
echo -e "${CYAN}📱 Access the application:${NC}"
echo -e "${NC}   Frontend:  http://localhost:3000${NC}"
echo -e "${NC}   Backend:   http://localhost:8001${NC}"
echo -e "${NC}   API Docs:  http://localhost:8001/docs${NC}"
echo ""
echo -e "${CYAN}📋 Background processes started:${NC}"
echo -e "${GRAY}   - Backend Server (PID: $BACKEND_PID)${NC}"
echo -e "${GRAY}   - Frontend Server (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${CYAN}📄 Logs are being written to:${NC}"
echo -e "${GRAY}   - Backend:  logs/backend.log${NC}"
echo -e "${GRAY}   - Frontend: logs/frontend.log${NC}"
echo ""
echo -e "${YELLOW}⚠️  To stop the servers: Press Ctrl+C${NC}"
echo ""
echo -e "${CYAN}⏳ Services may take 1-2 minutes to fully start up.${NC}"
echo -e "${CYAN}   If you see errors, wait a moment and refresh the page.${NC}"
echo ""

# Keep script running and monitor processes
echo -e "${YELLOW}Press Ctrl+C to stop all services and exit...${NC}"
while true; do
    sleep 5
    
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Backend server stopped unexpectedly. Check logs/backend.log${NC}"
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Frontend server stopped unexpectedly. Check logs/frontend.log${NC}"
        break
    fi
done

cleanup
