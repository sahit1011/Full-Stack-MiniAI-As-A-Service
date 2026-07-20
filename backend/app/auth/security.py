"""
Security utilities for password hashing and JWT token management.
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import warnings

# Suppress bcrypt warnings
warnings.filterwarnings("ignore", category=UserWarning, module="passlib")

# Password hashing configuration with error handling
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    # Fallback configuration if bcrypt has issues
    print(f"Warning: bcrypt configuration issue: {e}")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__default_rounds=12)

# JWT configuration
# SECRET_KEY must be provided via env. We refuse to run on a placeholder in production
# (a known/committed signing key lets anyone forge tokens). In DEBUG we fall back to a
# random ephemeral key so local dev still works (tokens simply reset on restart).
_PLACEHOLDER_SECRETS = {
    None,
    "",
    "your-secret-key-change-this-in-production",
    "your-secret-key",
    "changeme",
    "change-this-in-production",
    "secret",
}
SECRET_KEY = os.getenv("SECRET_KEY")
if SECRET_KEY in _PLACEHOLDER_SECRETS:
    if os.getenv("DEBUG", "True").lower() == "true":
        import secrets as _secrets
        SECRET_KEY = _secrets.token_urlsafe(48)
        warnings.warn(
            "SECRET_KEY is not set — generated a random ephemeral key for DEBUG mode only. "
            "Set a strong, unique SECRET_KEY env var before deploying.",
            RuntimeWarning,
        )
    else:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong, unique value via the SECRET_KEY env var. "
            "Refusing to start with a missing or placeholder key in production."
        )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash.

    Args:
        plain_password: The plain text password
        hashed_password: The hashed password from database

    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash

    Returns:
        str: The hashed password
    """
    try:
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Password hashing error: {e}")
        # Fallback to a simple hash if bcrypt fails (not recommended for production)
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: The data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        str: The encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        dict: The decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception
