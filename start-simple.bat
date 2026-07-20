@echo off
echo Starting Klaro - Local Development Mode
echo ===============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.8+ first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Create required directories
echo Creating required directories...
if not exist "data\uploads" mkdir "data\uploads"
if not exist "data\models" mkdir "data\models"
if not exist "logs" mkdir "logs"

REM Check if backend virtual environment exists
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    cd ..
)

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Starting services...
echo.

REM Start backend server in background
echo Starting Backend Server (Port 8001)...
start "Backend Server" cmd /c "cd backend && venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server in background
echo Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /c "cd frontend && npm run dev"

echo.
echo Klaro Local Development is starting up!
echo.
echo Access the application:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:8001
echo   API Docs:  http://localhost:8001/docs
echo.
echo Two terminal windows have opened for the servers.
echo To stop the servers, close both terminal windows.
echo.
echo Services may take 1-2 minutes to fully start up.
echo If you see errors, wait a moment and refresh the page.
echo.
pause
