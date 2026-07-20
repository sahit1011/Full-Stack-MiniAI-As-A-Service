# 🚀 Klaro - Local Development Guide

This guide provides multiple ways to run the Klaro application locally for development and testing.

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

### Required Software
- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Optional (for Docker deployment)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)

## 🎯 Quick Start Options

### Option 1: Automated Local Setup (Recommended)

Choose the script for your operating system:

#### Windows (Command Prompt)
```bash
start-local.bat
```

#### Windows (PowerShell)
```powershell
.\start-local.ps1
```

#### Linux/macOS (Bash)
```bash
./start-local.sh
```

### Option 2: Docker Deployment
```bash
# Windows
start-docker.bat

# Linux/macOS
./start-docker.sh
```

### Option 3: Manual Setup

If you prefer to run services manually:

#### Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### Frontend Setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Points

Once the services are running, you can access:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **API Redoc**: http://localhost:8001/redoc

## 📁 Project Structure

```
OthorAI-assesment/
├── backend/                 # FastAPI backend
│   ├── app/                # Application code
│   ├── venv/               # Python virtual environment
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend tests
├── frontend/               # Next.js frontend
│   ├── src/                # Source code
│   ├── public/             # Static assets
│   ├── package.json        # Node.js dependencies
│   └── node_modules/       # Node.js packages
├── data/                   # Application data
│   ├── uploads/            # Uploaded files
│   ├── models/             # ML models
│   └── othor_ai.db         # SQLite database
├── logs/                   # Application logs
├── docs/                   # Documentation
└── dump/                   # Unused/archived files
```

## 🔧 Script Features

### Local Development Scripts

All local development scripts (`start-local.*`) provide:

- ✅ **Dependency Checking**: Verifies Python, Node.js, and npm installation
- 📦 **Auto Installation**: Creates virtual environment and installs dependencies
- 🚀 **Concurrent Startup**: Starts both frontend and backend simultaneously
- 📁 **Directory Creation**: Creates required data and log directories
- 🔍 **Health Monitoring**: Monitors service status
- 🛑 **Graceful Shutdown**: Properly stops services on exit

### Platform-Specific Features

#### Windows Batch Script (`start-local.bat`)
- Opens separate terminal windows for each service
- Easy to monitor individual service logs
- Simple to stop (close terminal windows)

#### PowerShell Script (`start-local.ps1`)
- Uses PowerShell jobs for background processes
- Colored output for better readability
- Job management commands provided

#### Bash Script (`start-local.sh`)
- Cross-platform (Linux/macOS)
- Signal handling for clean shutdown
- Log files written to `logs/` directory
- Process monitoring with PID tracking

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Backend (8001): Stop any existing FastAPI/uvicorn processes
   - Frontend (3000): Stop any existing Next.js processes

2. **Python Virtual Environment Issues**
   - Delete `backend/venv` folder and run the script again
   - Ensure Python 3.8+ is installed

3. **Node.js Dependencies Issues**
   - Delete `frontend/node_modules` and run `npm install`
   - Clear npm cache: `npm cache clean --force`

4. **Database Issues**
   - Check if `data/othor_ai.db` exists
   - Run backend setup scripts if needed

### Log Locations

- **Windows Batch**: Check individual terminal windows
- **PowerShell**: Use `Receive-Job <JobID>` to see job output
- **Bash**: Check `logs/backend.log` and `logs/frontend.log`

## 🔄 Development Workflow

1. **Start Services**: Use appropriate script for your OS
2. **Make Changes**: Edit code in `backend/` or `frontend/`
3. **Auto Reload**: Both services support hot reloading
4. **Test**: Access http://localhost:3000 to test changes
5. **Stop Services**: Use Ctrl+C or close terminal windows

## 📚 Additional Resources

- [Backend API Documentation](http://localhost:8001/docs) (when running)
- [Project Setup Guide](SETUP_GUIDE.md)
- [Docker Guide](DOCKER_GUIDE.md)
- [Architecture Documentation](docs/architecture.md)

## 🤝 For Recruiters

The easiest way to run this application:

1. **Install Prerequisites**: Python 3.8+ and Node.js 16+
2. **Run Script**: Double-click `start-local.bat` (Windows) or run `./start-local.sh` (Linux/macOS)
3. **Access Application**: Open http://localhost:3000 in your browser
4. **Test Features**: Upload documents, train models, make predictions

The application will automatically set up everything needed and start both services.
