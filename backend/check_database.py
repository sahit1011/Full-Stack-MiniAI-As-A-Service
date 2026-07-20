"""
Simple script to check the database contents and verify our implementation.
"""
import sqlite3
import os

def check_database():
    """Check the database contents and structure."""
    
    db_path = "data/klaro.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        return
    
    print("🔍 Checking database contents...")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"📋 Found {len(tables)} tables:")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Check users table
        if ('users',) in tables:
            print("\n👥 Users table:")
            cursor.execute("SELECT id, username, email, is_active, is_admin, created_at FROM users;")
            users = cursor.fetchall()
            print(f"   Found {len(users)} users:")
            for user in users:
                print(f"   - ID: {user[0]}, Username: {user[1]}, Email: {user[2]}, Active: {user[3]}, Admin: {user[4]}")
        
        # Check file_metadata table
        if ('file_metadata',) in tables:
            print("\n📁 File metadata table:")
            cursor.execute("SELECT COUNT(*) FROM file_metadata;")
            file_count = cursor.fetchone()[0]
            print(f"   Found {file_count} file records")
            
            if file_count > 0:
                cursor.execute("SELECT session_id, original_filename, status, user_id FROM file_metadata LIMIT 5;")
                files = cursor.fetchall()
                print("   Recent files:")
                for file in files:
                    print(f"   - Session: {file[0][:8]}..., File: {file[1]}, Status: {file[2]}, User: {file[3]}")
        
        # Check model_metadata table
        if ('model_metadata',) in tables:
            print("\n🤖 Model metadata table:")
            cursor.execute("SELECT COUNT(*) FROM model_metadata;")
            model_count = cursor.fetchone()[0]
            print(f"   Found {model_count} model records")
            
            if model_count > 0:
                cursor.execute("SELECT model_id, algorithm, model_type, status, user_id FROM model_metadata LIMIT 5;")
                models = cursor.fetchall()
                print("   Recent models:")
                for model in models:
                    print(f"   - Model: {model[0][:8]}..., Algorithm: {model[1]}, Type: {model[2]}, Status: {model[3]}, User: {model[4]}")
        
        conn.close()
        
        print("\n✅ Database check completed successfully!")
        
        # Provide recommendations
        print("\n💡 Recommendations:")
        if ('users',) not in tables:
            print("   - Users table not found. Database tables may not be initialized.")
        elif len(users) == 0:
            print("   - No users found. You may need to create a user first.")
        else:
            print("   - Database appears to be properly set up!")
            print("   - You can test the API endpoints with existing users.")
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_database()
