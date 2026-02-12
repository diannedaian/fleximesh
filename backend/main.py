"""
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.config import (
    FRONTEND_DIR, HOST, PORT, DEBUG, CORS_ORIGINS, LOG_LEVEL
)
from backend.routes import api, health
from backend.middleware import LoggingMiddleware, ErrorHandlingMiddleware
import logging

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL))
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="FlexiMesh API",
    description="3D Scene Management API",
    version="1.0.0",
    debug=DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(api.router)


@app.get("/")
async def root():
    """Serve frontend index.html"""
    return FileResponse(FRONTEND_DIR / "index.html")


# Mount static files from frontend directory
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on {HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, reload=DEBUG)
