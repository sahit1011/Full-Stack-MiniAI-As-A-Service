"""
FastAPI main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import API routers
from .api import upload, profile, train, predict, summary, auth, history, analysis

# Import database initialization
from .database.database import create_tables

# Create FastAPI app instance
app = FastAPI(
    title="Klaro - Mini AI Analyst as a Service",
    description="A microservice for CSV data analysis, ML model training, and predictions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize database tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup"""
    create_tables()

# Configure CORS.
# Origins come from the ALLOWED_ORIGINS env var (comma-separated) so the deployed
# frontend (e.g. the Vercel URL) can be whitelisted in production without a code
# change. Falls back to the local dev ports when the var is unset.
_DEFAULT_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,"
    "http://localhost:3002,http://127.0.0.1:3002"
)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)  # Authentication routes
app.include_router(upload.router)
app.include_router(profile.router)
app.include_router(analysis.router)  # Comprehensive analysis routes
app.include_router(train.router)
app.include_router(predict.router)
app.include_router(summary.router)
app.include_router(history.router)  # History routes

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Klaro API is running",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Klaro - Mini AI Analyst as a Service",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
