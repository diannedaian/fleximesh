"""
API routes for scene data and other endpoints
"""
from fastapi import APIRouter, HTTPException
from backend.models import SceneData, ThreeJSObject
from backend.config import API_PREFIX

router = APIRouter(prefix=API_PREFIX, tags=["api"])


@router.get("/scene-data", response_model=SceneData)
async def get_scene_data():
    """
    Returns JSON object for 3D object positions

    Returns:
        SceneData: Scene data containing list of 3D objects
    """
    try:
        scene_data = SceneData(
            objects=[
                ThreeJSObject(
                    id="object-1",
                    x=0.0,
                    y=0.0,
                    z=0.0
                ),
                ThreeJSObject(
                    id="object-2",
                    x=3.0,
                    y=1.0,
                    z=-2.0
                ),
                ThreeJSObject(
                    id="object-3",
                    x=-2.0,
                    y=1.5,
                    z=1.0
                )
            ]
        )
        return scene_data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating scene data: {str(e)}"
        )
