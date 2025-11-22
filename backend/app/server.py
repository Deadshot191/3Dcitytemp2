"""
Backend server entry point for supervisor
This file is required by the supervisor configuration
"""
from app.main import app

# Export app for uvicorn
__all__ = ["app"]
