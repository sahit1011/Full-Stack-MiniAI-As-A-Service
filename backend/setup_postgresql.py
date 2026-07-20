"""
PostgreSQL setup script for Klaro.
This script helps set up PostgreSQL database and migrate from SQLite if needed.
"""
import os
import sys
import subprocess
import sqlite3
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json
from datetime import datetime

def check_postgresql_installed():
    """Check if PostgreSQL is installed and accessible."""
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ PostgreSQL found: {result.stdout.strip()}")
            return True
        else:
            print("❌ PostgreSQL not found in PATH")
            return False
    except FileNotFoundError:
        print("❌ PostgreSQL not installed or not in PATH")
        return False

def create_database_and_user():
    """Create PostgreSQL database and user."""
    print("\n🔧 Setting up PostgreSQL database...")
    
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'klaro',
        'user': 'klaro_user',
        'password': 'othor_secure_pass_2024'
    }
    
    try:
        # Connect to PostgreSQL as superuser (postgres)
        print("Connecting to PostgreSQL as superuser...")
        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config['port'],
            database='postgres',  # Connect to default database
            user='postgres',
            password=input("Enter PostgreSQL superuser (postgres) password: ")
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Create database
        print(f"Creating database '{db_config['database']}'...")
        try:
            cursor.execute(f"CREATE DATABASE {db_config['database']};")
            print(f"✅ Database '{db_config['database']}' created successfully")
        except psycopg2.errors.DuplicateDatabase:
            print(f"ℹ️  Database '{db_config['database']}' already exists")
        
        # Create user
        print(f"Creating user '{db_config['user']}'...")
        try:
            cursor.execute(f"CREATE USER {db_config['user']} WITH PASSWORD '{db_config['password']}';")
            print(f"✅ User '{db_config['user']}' created successfully")
        except psycopg2.errors.DuplicateObject:
            print(f"ℹ️  User '{db_config['user']}' already exists")
        
        # Grant privileges
        print("Granting privileges...")
        cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_config['database']} TO {db_config['user']};")
        cursor.execute(f"ALTER USER {db_config['user']} CREATEDB;")
        print("✅ Privileges granted successfully")
        
        cursor.close()
        conn.close()
        
        return db_config
        
    except Exception as e:
        print(f"❌ Error setting up PostgreSQL: {e}")
        return None

def test_connection(db_config):
    """Test connection to the created database."""
    print("\n🔍 Testing database connection...")
    
    try:
        database_url = f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['database']}"
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Connection successful!")
            print(f"   PostgreSQL version: {version}")
            
        return database_url
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None

def create_env_file(database_url):
    """Create .env file with PostgreSQL configuration."""
    print("\n📝 Creating .env file...")
    
    env_content = f"""# Environment Configuration for Klaro Backend

# Database Configuration (PostgreSQL)
DATABASE_URL={database_url}

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001
DEBUG=True

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB
SESSION_TIMEOUT=86400   # 24 hours

# JWT Configuration
SECRET_KEY=othor-ai-super-secret-jwt-key-{datetime.now().strftime('%Y%m%d')}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=deepseek/deepseek-chat

# Application Configuration
APP_NAME=Klaro - Mini AI Analyst
APP_VERSION=1.0.0

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ .env file created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def migrate_sqlite_data(database_url):
    """Migrate existing data from SQLite to PostgreSQL."""
    sqlite_path = "data/klaro.db"
    
    if not os.path.exists(sqlite_path):
        print("ℹ️  No existing SQLite database found. Starting fresh.")
        return True
    
    print(f"\n🔄 Migrating data from SQLite to PostgreSQL...")
    
    try:
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_cursor = sqlite_conn.cursor()
        
        # Connect to PostgreSQL
        pg_engine = create_engine(database_url)
        
        # Get tables from SQLite
        sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in sqlite_cursor.fetchall()]
        
        print(f"Found {len(tables)} tables to migrate: {tables}")
        
        # For now, we'll let the application create the tables fresh
        # This is safer than trying to migrate schema differences
        print("ℹ️  Skipping data migration - will start with fresh PostgreSQL database")
        print("   (Existing SQLite data is preserved in data/klaro.db)")
        
        sqlite_conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False

def main():
    """Main setup function."""
    print("🐘 PostgreSQL Setup for Klaro")
    print("=" * 50)
    
    # Check if PostgreSQL is installed
    if not check_postgresql_installed():
        print("\n❌ PostgreSQL is not installed or not accessible.")
        print("Please install PostgreSQL first:")
        print("  Windows: https://www.postgresql.org/download/windows/")
        print("  macOS: brew install postgresql")
        print("  Linux: sudo apt install postgresql postgresql-contrib")
        return False
    
    # Create database and user
    db_config = create_database_and_user()
    if not db_config:
        return False
    
    # Test connection
    database_url = test_connection(db_config)
    if not database_url:
        return False
    
    # Create .env file
    if not create_env_file(database_url):
        return False
    
    # Migrate data (optional)
    if not migrate_sqlite_data(database_url):
        return False
    
    print("\n" + "=" * 50)
    print("🎉 PostgreSQL setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the backend server: uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
    print("2. The application will automatically create tables on first startup")
    print("3. Test the API endpoints to verify everything works")
    print("\n💡 Database connection details:")
    print(f"   Host: {db_config['host']}")
    print(f"   Port: {db_config['port']}")
    print(f"   Database: {db_config['database']}")
    print(f"   User: {db_config['user']}")
    print(f"   Connection URL: {database_url}")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
