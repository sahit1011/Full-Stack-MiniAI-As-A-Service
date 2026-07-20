# Klaro - Local Development Startup Script for PowerShell
# This script starts both frontend and backend servers locally

Write-Host "Starting Klaro - Local Development Mode" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed. Please install Python 3.8+ first." -ForegroundColor Red
    Write-Host "   Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version 2>&1
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install Node.js (includes npm)." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create required directories
Write-Host "📁 Creating required directories..." -ForegroundColor Cyan
$directories = @("data\uploads", "data\models", "logs")
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   Created: $dir" -ForegroundColor Gray
    }
}

# Check if backend virtual environment exists
if (!(Test-Path "backend\venv")) {
    Write-Host "📦 Creating Python virtual environment..." -ForegroundColor Cyan
    Set-Location backend
    python -m venv venv
    Set-Location ..
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
& "venv\Scripts\activate.ps1"
pip install -r requirements.txt
Set-Location ..

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location frontend
npm install
Set-Location ..

Write-Host "🔧 Starting services..." -ForegroundColor Cyan
Write-Host ""

# Start backend server in background
Write-Host "🐍 Starting Backend Server (Port 8001)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    & "venv\Scripts\activate.ps1"
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server in background
Write-Host "⚛️  Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🎉 Klaro Local Development is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access the application:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8001" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "📋 Background jobs started:" -ForegroundColor Cyan
Write-Host "   - Backend Server (Job ID: $($backendJob.Id))" -ForegroundColor Gray
Write-Host "   - Frontend Server (Job ID: $($frontendJob.Id))" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  To stop the servers:" -ForegroundColor Yellow
Write-Host "   Stop-Job $($backendJob.Id), $($frontendJob.Id)" -ForegroundColor Gray
Write-Host "   Remove-Job $($backendJob.Id), $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "⏳ Services may take 1-2 minutes to fully start up." -ForegroundColor Cyan
Write-Host "   If you see errors, wait a moment and refresh the page." -ForegroundColor Cyan
Write-Host ""

# Keep script running and show job status
Write-Host "Press Ctrl+C to stop all services and exit..." -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 5
        $backendStatus = Get-Job -Id $backendJob.Id
        $frontendStatus = Get-Job -Id $frontendJob.Id
        
        if ($backendStatus.State -eq "Failed" -or $frontendStatus.State -eq "Failed") {
            Write-Host "❌ One or more services failed. Check the logs above." -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Red
    Stop-Job $backendJob.Id, $frontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job $backendJob.Id, $frontendJob.Id -ErrorAction SilentlyContinue
    Write-Host "Services stopped." -ForegroundColor Green
}
