from fastapi import APIRouter, Depends, HTTPException, status
from app.services.db_service import db_service
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/history", tags=["history"])

class PrivacyUpdateSchema(BaseModel):
    is_public: bool

@router.get("")
async def get_history(current_user: dict = Depends(get_current_user)):
    """Fetch the comparison history logged under the authenticated user's account."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session authentication required to access voice comparison history"
        )
    return db_service.get_user_comparisons(current_user["_id"])

@router.get("/public/{comparison_id}")
async def get_public_comparison(comparison_id: str):
    """Retrieve a public comparison log by its ID. Does not require authentication."""
    comparison = db_service.get_comparison(comparison_id)
    if not comparison:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comparison log not found")
        
    if not comparison.get("is_public"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This comparison run has been set to private by the owner"
        )
    return comparison

@router.put("/{comparison_id}/privacy")
async def update_privacy(
    comparison_id: str,
    data: PrivacyUpdateSchema,
    current_user: dict = Depends(get_current_user)
):
    """Toggle a comparison log's visibility between public and private."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        
    res = db_service.set_comparison_privacy(
        user_id=current_user["_id"],
        comparison_id=comparison_id,
        is_public=data.is_public
    )
    if res.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Comparison log not found or unauthorized"
        )
        
    return {"message": f"Comparison log privacy updated. It is now {'public' if data.is_public else 'private'}."}

@router.delete("/{comparison_id}")
async def delete_comparison(
    comparison_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a comparison record from the user's history."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        
    res = db_service.delete_comparison(current_user["_id"], comparison_id)
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Comparison log not found or unauthorized"
        )
        
    return {"message": "Comparison run deleted from history"}
