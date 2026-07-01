from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from app.services.compare_service import compare_service
from app.api.auth import get_current_user
from app.core.config import settings
import uuid
import os

router = APIRouter()

@router.post("/compare")
async def compare_voices_endpoint(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    is_public: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """
    Compare two voice recordings. Extracted metrics are returned along with the match confidence.
    If authenticated, the result is saved to the history database.
    """
    unique_id = uuid.uuid4().hex
    
    # Save uploaded files temporarily
    path1 = str(settings.UPLOAD_DIR / f"{unique_id}_1_{file1.filename}")
    path2 = str(settings.UPLOAD_DIR / f"{unique_id}_2_{file2.filename}")
    
    try:
        # Write bytes locally
        with open(path1, "wb") as f:
            content1 = await file1.read()
            f.write(content1)
            
        with open(path2, "wb") as f:
            content2 = await file2.read()
            f.write(content2)
            
        # Get optional user context
        user_id = current_user["_id"] if current_user else None
        
        result = compare_service.compare_voices(
            path1=path1,
            path2=path2,
            filename1=file1.filename,
            filename2=file2.filename,
            user_id=user_id,
            is_public=is_public
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
            
        return result
        
    except Exception as e:
        if not isinstance(e, HTTPException):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Vocal comparison pipeline failed: {str(e)}"
            )
        raise e