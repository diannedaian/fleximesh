"""
Pydantic models for API schemas
"""
from pydantic import BaseModel
from typing import List, Optional


class ThreeJSObject(BaseModel):
    """Model for 3D object position data"""
    id: str
    x: float
    y: float
    z: float


class SceneData(BaseModel):
    """Model for scene data containing multiple 3D objects"""
    objects: List[ThreeJSObject]


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    service: str
