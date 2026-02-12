"""
Configuration management for the application
"""
import os
from pathlib import Path

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent
BACKEND_DIR = Path(__file__).parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# API Configuration
API_PREFIX = "/api"
API_VERSION = "v1"

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
]

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
