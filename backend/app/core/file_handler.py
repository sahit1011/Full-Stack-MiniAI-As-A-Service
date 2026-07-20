"""
File handling utilities for CSV processing
"""
import os
import uuid
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from fastapi import UploadFile, HTTPException
import aiofiles
import asyncio
from datetime import datetime

from .config import settings
from .storage import storage


class FileHandler:
    """Handles file upload, validation, and basic processing"""
    
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.ALLOWED_FILE_TYPES
    
    def generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return str(uuid.uuid4())
    
    def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file"""
        # Check file extension
        if not any(file.filename.lower().endswith(ext) for ext in self.allowed_extensions):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_FILE_TYPE",
                    "message": f"Only {', '.join(self.allowed_extensions)} files are allowed",
                    "filename": file.filename,
                    "allowed_types": self.allowed_extensions
                }
            )
        
        # Check file size (if available)
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            max_size_mb = self.max_file_size / (1024 * 1024)
            file_size_mb = file.size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "FILE_TOO_LARGE",
                    "message": f"File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb:.1f}MB)",
                    "file_size_mb": file_size_mb,
                    "max_size_mb": max_size_mb
                }
            )
    
    async def save_uploaded_file(self, file: UploadFile, session_id: str) -> Path:
        """Save uploaded file to disk with streaming"""
        # Create filename with session ID
        file_extension = Path(file.filename).suffix
        filename = f"{session_id}{file_extension}"
        file_path = self.upload_dir / filename
        
        # Ensure upload directory exists
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Stream file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                await f.write(chunk)
        
        # Validate file size after saving
        file_size = file_path.stat().st_size
        if file_size > self.max_file_size:
            # Clean up the file
            file_path.unlink(missing_ok=True)
            max_size_mb = self.max_file_size / (1024 * 1024)
            file_size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail={
                    "error": "FILE_TOO_LARGE",
                    "message": f"File size ({file_size_mb:.1f}MB) exceeds maximum allowed size ({max_size_mb:.1f}MB)",
                    "file_size_mb": file_size_mb,
                    "max_size_mb": max_size_mb
                }
            )

        # Write-through to Supabase Storage so the upload survives a redeploy
        # (no-op when storage is not configured — local disk is authoritative then).
        storage.upload(file_path, f"uploads/{filename}", content_type="text/csv")

        return file_path

    def get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get basic file information"""
        stat = file_path.stat()
        return {
            "file_path": str(file_path),
            "file_size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime),
            "modified_at": datetime.fromtimestamp(stat.st_mtime)
        }
    
    def cleanup_file(self, session_id: str) -> bool:
        """Clean up uploaded file (local cache and storage backing)"""
        removed = False
        try:
            # Find file with session_id
            for file_path in self.upload_dir.glob(f"{session_id}.*"):
                file_path.unlink(missing_ok=True)
                removed = True
        except Exception:
            pass
        # Best-effort removal of the storage-backed copy for every known extension.
        for ext in self.allowed_extensions:
            storage.remove(f"uploads/{session_id}{ext}")
        return removed

    def get_file_path(self, session_id: str) -> Optional[Path]:
        """Get file path for a session ID.

        Prefer the local cache; on a miss (e.g. after a redeploy wiped the disk),
        pull the object back from Supabase Storage so callers still get a real Path.
        """
        for ext in self.allowed_extensions:
            file_path = self.upload_dir / f"{session_id}{ext}"
            if file_path.exists():
                return file_path

        # Local miss — try to restore from storage backing.
        for ext in self.allowed_extensions:
            file_path = self.upload_dir / f"{session_id}{ext}"
            if storage.download_to(f"uploads/{session_id}{ext}", file_path):
                return file_path
        return None


# Global file handler instance
file_handler = FileHandler()
