# 🚀 Setup Guide for Recruiters

This guide will help you quickly set up and test the Klaro application locally.

## 📋 Prerequisites

### Required Software
- **Git** - [Download here](https://git-scm.com/downloads)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)

### Optional (for local development)
- **Python 3.9+** - [Download here](https://www.python.org/downloads/)
- **Node.js 16+** - [Download here](https://nodejs.org/)

---

## 🎯 Quick Start (Recommended)

### Step 1: Clone the Repository
```bash
git clone https://github.com/sahit1011/OthorAI-Take-Home-Assignment.git
cd OthorAI-Take-Home-Assignment
```

### Step 2: Start with Docker
```bash
# Start all services
docker-compose up --build

# Wait for services to start (about 2-3 minutes)
# You'll see logs from both frontend and backend
```

### Step 3: Access the Application
- **Frontend (Main App):** http://localhost:3000
- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/docs

### Step 4: Test the Application
1. Open http://localhost:3000 in your browser
2. You should see the Klaro homepage
3. Click "Start Analysis" to begin testing
4. Visit http://localhost:8001/docs to explore the API

---

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:8001/health
```
Expected response:
```json
{"status":"healthy","message":"Klaro API is running","version":"1.0.0"}
```

### API Documentation
Visit http://localhost:8001/docs for interactive API testing with Swagger UI.

---

## 🛠️ Alternative: Local Development Setup

If you prefer to run without Docker:

### Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

### Frontend Setup (New Terminal)
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run the frontend
npm run dev
```

---

## 📊 Sample Data

The application includes sample CSV files in the `data/samples/` directory for testing:
- Sales data for regression analysis
- Customer churn data for classification
- General business data for analysis

---

## 🔧 Troubleshooting

### Docker Issues
```bash
# If containers fail to start
docker-compose down
docker-compose up --build --force-recreate

# Check container logs
docker-compose logs backend
docker-compose logs frontend
```

### Port Conflicts
If ports 3000 or 8001 are already in use:
```bash
# Stop the conflicting services or modify docker-compose.yml
# Change the port mappings:
# "3001:3000" for frontend
# "8002:8001" for backend
```

### Permission Issues (Windows)
- Run Docker Desktop as Administrator
- Ensure Docker Desktop is running before executing commands

---

## ✅ Verification Checklist

- [ ] Repository cloned successfully
- [ ] Docker containers started without errors
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend health check returns 200 OK
- [ ] API documentation loads at http://localhost:8001/docs
- [ ] Can upload a CSV file through the interface

---

## 📞 Support

If you encounter any issues:

1. **Check the logs:** `docker-compose logs`
2. **Restart services:** `docker-compose restart`
3. **Clean restart:** `docker-compose down && docker-compose up --build`

---

## 🎯 What to Test

### Core Features
1. **File Upload** - Upload a CSV file (max 50MB)
2. **Data Profiling** - View automatic data analysis
3. **Model Training** - Train ML models on your data
4. **Predictions** - Generate predictions with trained models
5. **API Endpoints** - Test via Swagger UI at /docs

### Expected Workflow
1. Upload CSV → Get session ID and schema analysis
2. View data profile → Statistical insights and correlations
3. Train model → Select target column and algorithm
4. Make predictions → Input new data for predictions
5. View summary → Natural language insights

---

**Total setup time: ~5 minutes**  
**First-time Docker build: ~10 minutes**

The application is designed to work out-of-the-box with minimal configuration required.
