# 🐳 Docker Deployment Guide - Klaro

## 🚀 Quick Start for Recruiters

This application is fully containerized with Docker to make it easy to run without installing Python, Node.js, or managing dependencies.

### Prerequisites

1. **Docker Desktop** - Download and install from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Git** - For cloning the repository

### 🎯 One-Click Startup

#### Windows Users:
```bash
git clone https://github.com/sahit1011/OthorAI-Take-Home-Assignment.git
cd OthorAI-Take-Home-Assignment
start-docker.bat
```

#### Mac/Linux Users:
```bash
git clone https://github.com/sahit1011/OthorAI-Take-Home-Assignment.git
cd OthorAI-Take-Home-Assignment
chmod +x start-docker.sh
./start-docker.sh
```

### 📱 Access the Application

After running the startup script, wait 1-2 minutes for services to fully start, then access:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 🔧 Manual Docker Commands

If you prefer to run Docker commands manually:

```bash
# Create required directories
mkdir -p data/uploads data/models logs

# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# If ports 3000 or 8001 are in use, stop other services or change ports in docker-compose.yml
docker-compose down
# Kill processes using the ports (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill processes using the ports (Mac/Linux)
lsof -ti:3000 | xargs kill -9
lsof -ti:8001 | xargs kill -9
```

#### 2. Docker Build Fails
```bash
# Clean Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache
docker-compose up -d
```

#### 3. Services Not Starting
```bash
# Check service status
docker-compose ps

# View detailed logs
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart backend
```

#### 4. Permission Issues (Linux/Mac)
```bash
# Fix directory permissions
sudo chown -R $USER:$USER data logs
chmod -R 755 data logs
```

### Health Checks

The application includes health checks for both services:

```bash
# Check backend health
curl http://localhost:8001/health

# Check frontend health
curl http://localhost:3000

# View health status in Docker
docker-compose ps
```

## 📊 Service Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (Next.js)     │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8001    │
│   Container     │    │   Container     │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                   │
         ┌─────────────────┐
         │   Shared        │
         │   Volumes       │
         │   ./data        │
         │   ./logs        │
         └─────────────────┘
```

## 🔍 Development Commands

For developers who want to work with the containers:

```bash
# Build only
docker-compose build

# Run in foreground (see logs)
docker-compose up

# Run specific service
docker-compose up backend

# Execute commands in running container
docker-compose exec backend bash
docker-compose exec frontend sh

# View resource usage
docker stats

# Clean up everything
docker-compose down -v
docker system prune -a
```

## 📝 Configuration

Environment variables are configured in `docker-compose.yml`:

- **Backend**: Port 8001, SQLite database, file uploads enabled
- **Frontend**: Port 3000, connects to backend at localhost:8001
- **Volumes**: Data and logs are persisted on host machine

## 🚨 Important Notes

1. **First Run**: Initial build may take 5-10 minutes
2. **Startup Time**: Services need 1-2 minutes to fully initialize
3. **Data Persistence**: Uploaded files and models are saved in `./data/`
4. **Logs**: Application logs are saved in `./logs/`
5. **Health Checks**: Both services have automatic health monitoring

## 💡 Tips for Recruiters

- Use the startup scripts (`start-docker.bat` or `start-docker.sh`) for easiest setup
- Wait for health checks to pass before testing the application
- Check `docker-compose logs -f` if you encounter issues
- The application works entirely offline after initial setup
- No need to install Python, Node.js, or any dependencies manually

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify Docker is running: `docker --version`
3. Ensure ports 3000 and 8001 are available
4. Try rebuilding: `docker-compose build --no-cache`
5. Check the troubleshooting section above

---

**Built with ❤️ for easy deployment and evaluation**
