# Backend Dockerfile
# Python 3.12 (3.9 is end-of-life) — matches the local dev interpreter and has
# manylinux wheels for pandas/numpy/scikit-learn/xgboost so no heavy compilation.
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p data/uploads data/models logs

# Set permissions
RUN chmod 755 data/uploads data/models

# Expose port (documentation only; the app binds $PORT at runtime)
EXPOSE 8001

# Health check — honor the runtime port ($PORT on Render, 8001 locally)
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider "http://localhost:${PORT:-8001}/health" || exit 1

# Run the application. Shell form so ${PORT} expands — Render assigns the port via
# $PORT; local/docker-compose falls back to 8001.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
