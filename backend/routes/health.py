"""
Health check routes
"""
from fastapi import APIRouter
from backend.models import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint

    Returns:
        HealthResponse: Service health status
    """
    return HealthResponse(
        status="healthy",
        service="FlexiMesh API"
    )
