# PostgreSQL Setup Guide

## 🗄️ Database Migration: SQLite → PostgreSQL

The application now supports both PostgreSQL (production) and SQLite (development fallback).

## 📋 Prerequisites

### 1. Install PostgreSQL

**Windows:**
```bash
# Download and install from: https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Install Python Dependencies

```bash
pip install psycopg2-binary==2.9.9
```

## 🔧 Configuration

### 1. Create Database

```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database and user
CREATE DATABASE klaro;
CREATE USER klaro_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE klaro TO klaro_user;

-- Exit PostgreSQL
\q
```

### 2. Environment Variables

Create or update your `.env` file:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://klaro_user:your_secure_password@localhost:5432/klaro

# Alternative format for some deployments
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=klaro
POSTGRES_USER=klaro_user
POSTGRES_PASSWORD=your_secure_password
```

### 3. Test Connection

```bash
# Test PostgreSQL connection
psql -h localhost -U klaro_user -d klaro -c "SELECT version();"
```

## 🚀 Migration Process

### Automatic Migration

The application will automatically:
1. Try to connect to PostgreSQL using `DATABASE_URL`
2. If PostgreSQL is unavailable, fallback to SQLite
3. Create all tables on first startup

### Manual Migration (if needed)

If you want to migrate existing SQLite data to PostgreSQL:

```python
# Run this script to migrate data
python scripts/migrate_sqlite_to_postgresql.py
```

## 🔍 Verification

### 1. Check Database Connection

```bash
# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8001

# Look for this message in logs:
# ✅ Connected to PostgreSQL database
```

### 2. Verify Tables

```sql
-- Connect to PostgreSQL
psql -h localhost -U klaro_user -d klaro

-- List tables
\dt

-- Should show:
-- users
-- file_metadata  
-- model_metadata
```

### 3. Test API Endpoints

```bash
# Test user creation
curl -X POST "http://localhost:8001/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

## 🐳 Docker Setup (Optional)

For easy PostgreSQL setup with Docker:

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: klaro
      POSTGRES_USER: klaro_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres
```

## 🔧 Production Deployment

### Environment Variables for Production

```bash
# Use connection pooling for production
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# For cloud providers (Heroku, Railway, etc.)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require&pool_size=20&max_overflow=0
```

### Performance Tuning

The application includes production-ready PostgreSQL settings:
- Connection pooling with pre-ping
- Connection recycling every 5 minutes
- SSL support for secure connections

## 🚨 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Start if not running
   sudo systemctl start postgresql
   ```

2. **Authentication Failed**
   ```bash
   # Reset password
   sudo -u postgres psql
   ALTER USER klaro_user PASSWORD 'new_password';
   ```

3. **Database Does Not Exist**
   ```sql
   -- Create database
   CREATE DATABASE klaro;
   ```

4. **Permission Denied**
   ```sql
   -- Grant permissions
   GRANT ALL PRIVILEGES ON DATABASE klaro TO klaro_user;
   GRANT ALL ON SCHEMA public TO klaro_user;
   ```

## ✅ Benefits of PostgreSQL

- **ACID Compliance**: Full transaction support
- **Scalability**: Better performance for concurrent users
- **Advanced Features**: JSON support, full-text search, etc.
- **Production Ready**: Used by major applications worldwide
- **Assignment Compliance**: Meets the PostgreSQL requirement

The migration is seamless - all existing functionality works exactly the same!
