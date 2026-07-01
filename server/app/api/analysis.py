from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from app.services.audio_service import audio_service
from app.services.db_service import db_service
from app.ml.embedding import get_embedding
from app.api.auth import get_current_user
from app.core.config import settings
import uuid
import os

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/spoof")
async def spoof_detection_endpoint(file: UploadFile = File(...)):
    """Analyze a single vocal sample for deepfake or synthetic indicators."""
    unique_id = uuid.uuid4().hex
    path = str(settings.UPLOAD_DIR / f"spoof_{unique_id}_{file.filename}")
    prep_path = str(settings.UPLOAD_DIR / f"prep_spoof_{unique_id}.wav")
    
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
            
        res = audio_service.process_and_analyze(path, prep_path)
        if not res["success"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
            
        return res["spoof"]
        
    finally:
        for p in (path, prep_path):
            if os.path.exists(p):
                os.remove(p)

@router.post("/emotion")
async def emotion_analysis_endpoint(file: UploadFile = File(...)):
    """Analyze a single vocal sample to extract emotion distribution probabilities."""
    unique_id = uuid.uuid4().hex
    path = str(settings.UPLOAD_DIR / f"emotion_{unique_id}_{file.filename}")
    prep_path = str(settings.UPLOAD_DIR / f"prep_emotion_{unique_id}.wav")
    
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
            
        res = audio_service.process_and_analyze(path, prep_path)
        if not res["success"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
            
        return res["emotion"]
        
    finally:
        for p in (path, prep_path):
            if os.path.exists(p):
                os.remove(p)

@router.post("/voice")
async def voice_analysis_endpoint(file: UploadFile = File(...)):
    """Perform full standalone voice parameter and acoustic metrics extraction."""
    unique_id = uuid.uuid4().hex
    path = str(settings.UPLOAD_DIR / f"voice_{unique_id}_{file.filename}")
    prep_path = str(settings.UPLOAD_DIR / f"prep_voice_{unique_id}.wav")
    
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
            
        res = audio_service.process_and_analyze(path, prep_path)
        if not res["success"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
            
        return {
            "metadata": res["metadata"],
            "analysis": res["analysis"],
            "spoof": res["spoof"],
            "emotion": res["emotion"]
        }
        
    finally:
        for p in (path, prep_path):
            if os.path.exists(p):
                os.remove(p)

@router.post("/catalog")
async def catalog_voice_endpoint(
    label: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Save an analyzed voice print containing its neural embedding to the catalog."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session authentication required to register voice signatures"
        )
        
    unique_id = uuid.uuid4().hex
    path = str(settings.UPLOAD_DIR / f"cat_{unique_id}_{file.filename}")
    prep_path = str(settings.UPLOAD_DIR / f"prep_cat_{unique_id}.wav")
    
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
            
        res = audio_service.process_and_analyze(path, prep_path)
        if not res["success"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
            
        emb = get_embedding(prep_path)
        
        saved_voice = db_service.save_voice(
            user_id=current_user["_id"],
            label=label,
            filename=file.filename,
            embedding=emb,
            metrics=res["analysis"]
        )
        
        # Strip heavy embedding array from the JSON response
        saved_voice.pop("embedding", None)
        return saved_voice
        
    finally:
        for p in (path, prep_path):
            if os.path.exists(p):
                os.remove(p)

@router.get("/catalog")
async def get_catalog_voices(current_user: dict = Depends(get_current_user)):
    """Fetch the authenticated user's catalog of voice prints."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return db_service.get_user_voices(current_user["_id"])

@router.delete("/catalog/{voice_id}")
async def delete_catalog_voice(
    voice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a voice print from the user's catalog."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    res = db_service.delete_voice(current_user["_id"], voice_id)
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voice catalog sample not found or unauthorized")
    return {"message": "Voice signature deleted successfully"}

@router.post("/catalog/search")
async def search_catalog_voices(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Find the closest voice signatures matching the uploaded voice query using vector search."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        
    unique_id = uuid.uuid4().hex
    path = str(settings.UPLOAD_DIR / f"search_{unique_id}_{file.filename}")
    prep_path = str(settings.UPLOAD_DIR / f"prep_search_{unique_id}.wav")
    
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
            
        res = audio_service.process_and_analyze(path, prep_path)
        if not res["success"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["error"])
            
        emb = get_embedding(prep_path)
        similar_voices = db_service.find_similar_voices(current_user["_id"], emb)
        return similar_voices
        
    finally:
        for p in (path, prep_path):
            if os.path.exists(p):
                os.remove(p)
