# 🚀 Setup Guide - Klaro Assignment

## 📋 Prerequisites

### System Requirements
- **Python:** 3.9 or higher
- **Node.js:** 16.x or higher
- **npm/yarn:** Latest version
- **Docker:** 20.x or higher (optional but recommended)
- **Git:** Latest version

### Development Tools (Recommended)
- **IDE:** VS Code, PyCharm, or similar
- **API Testing:** Postman, Insomnia, or curl
- **Database Client:** pgAdmin, MongoDB Compass (for bonus features)

---

## 🏗️ Project Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd othor-ai-assignment
```

### 2. Environment Setup

#### Option A: Docker Setup (Recommended)
```bash
# Build and run all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

#### Option B: Manual Setup

##### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

##### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB in bytes
UPLOAD_DIR=./data/uploads
MODEL_DIR=./data/models

# Session Configuration
SESSION_TIMEOUT=86400  # 24 hours in seconds

# Optional: Database Configuration (for bonus features)
DATABASE_URL=postgresql://user:password@localhost:5432/othor_ai
REDIS_URL=redis://localhost:6379

# Optional: Cloud Storage (for bonus features)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=othor-ai-bucket
```

#### Frontend (.env.local)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000

# Upload Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=52428800
```

---

## 📁 Directory Structure Creation

### Create Required Directories
```bash
# Create data directories
mkdir -p data/uploads
mkdir -p data/models
mkdir -p data/samples

# Create log directory
mkdir -p logs

# Set permissions (Unix/Linux/macOS)
chmod 755 data/uploads
chmod 755 data/models
```

---

## 🧪 Testing Setup

### Backend Testing
```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/ -v

# Run tests with coverage
pytest tests/ --cov=app --cov-report=html
```

### Frontend Testing
```bash
cd frontend

# Install test dependencies (if not already included)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

---

## 🐳 Docker Configuration

### Docker Compose Services

#### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - DEBUG=True
      - UPLOAD_DIR=/app/data/uploads
      - MODEL_DIR=/app/data/models
    depends_on:
      - redis  # if using bonus features

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  # Optional: Redis for background jobs
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  # Optional: PostgreSQL for data persistence
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: othor_ai
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📊 Sample Data Setup

### Create Sample CSV Files
```bash
# Navigate to samples directory
cd data/samples

# Create sample datasets (you can add your own CSV files here)
# Example files to include:
# - sales_data.csv (for regression)
# - customer_churn.csv (for classification)
# - product_analysis.csv (for general analysis)
```

---

## 🔍 Verification Steps

### 1. Backend Health Check
```bash
curl http://localhost:8000/health
# Expected response: {"status": "healthy"}
```

### 2. API Documentation
Visit: http://localhost:8000/docs
- Verify all endpoints are listed
- Test file upload functionality

### 3. Frontend Access
Visit: http://localhost:3000
- Verify page loads correctly
- Test file upload component
- Check API connectivity

---

## 🐛 Troubleshooting

### Common Issues

#### Backend Issues
```bash
# Port already in use
lsof -ti:8000 | xargs kill -9

# Permission denied for uploads
chmod 755 data/uploads

# Module not found
pip install -r requirements.txt
```

#### Frontend Issues
```bash
# Node modules issues
rm -rf node_modules package-lock.json
npm install

# Port already in use
lsof -ti:3000 | xargs kill -9
```

#### Docker Issues
```bash
# Clean up containers
docker-compose down -v
docker system prune -f

# Rebuild containers
docker-compose up --build --force-recreate
```

### Log Locations
- **Backend Logs:** `logs/app.log`
- **Docker Logs:** `docker-compose logs [service_name]`
- **Frontend Logs:** Browser console

---

## 🔧 Development Workflow

### 1. Start Development Environment
```bash
# Option 1: Docker
docker-compose up

# Option 2: Manual
# Terminal 1 (Backend)
cd backend && uvicorn app.main:app --reload

# Terminal 2 (Frontend)
cd frontend && npm run dev
```

### 2. Make Changes
- Backend changes auto-reload with `--reload` flag
- Frontend changes auto-reload with Next.js dev server

### 3. Testing
```bash
# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test
```

### 4. API Testing
- Use Swagger UI: http://localhost:8000/docs
- Or use Postman/curl for manual testing

---

## 📝 Next Steps

1. ✅ Verify all services are running
2. ✅ Test file upload functionality
3. ✅ Review API documentation
4. ✅ Start implementing core features
5. ✅ Follow the task breakdown in `docs/tasks.md`

---

## 🆘 Getting Help

### Resources
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **React Docs:** https://reactjs.org/docs/
- **Next.js Docs:** https://nextjs.org/docs
- **Scikit-learn Docs:** https://scikit-learn.org/

### Support
- Check `docs/tasks.md` for implementation guidance
- Review `docs/architecture.md` for system design
- Use GitHub issues for bug reports
- Refer to API documentation at `/docs` endpoint
