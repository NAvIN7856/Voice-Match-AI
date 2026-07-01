from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.ml.embedding import get_embedding
from app.ml.similarity import compare_embeddings
from app.core.config import settings
from sklearn.cluster import KMeans
import numpy as np
import uuid
import os

router = APIRouter(prefix="/clustering", tags=["clustering"])

@router.post("")
async def cluster_voices_endpoint(
    files: list[UploadFile] = File(...),
    n_clusters: int = Form(2)
):
    """
    Cluster multiple uploaded voice samples into distinct speaker groupings using K-Means.
    Returns:
        cluster assignments and a full pairwise similarity matrix.
    """
    if len(files) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A minimum of 2 voice files are required for clustering analysis"
        )
    if len(files) < n_clusters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot segment {n_clusters} speaker groups with only {len(files)} uploaded files"
        )
    if n_clusters < 2:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vocal clustering requires at least 2 distinct speaker divisions"
        )

    unique_id = uuid.uuid4().hex
    saved_paths = []
    
    try:
        embeddings = []
        filenames = []
        
        # Save clips locally and compute embedding vectors
        for file in files:
            path = str(settings.UPLOAD_DIR / f"cluster_{unique_id}_{file.filename}")
            with open(path, "wb") as f:
                content = await file.read()
                f.write(content)
            saved_paths.append(path)
            
            emb = get_embedding(path)
            embeddings.append(emb)
            filenames.append(file.filename)
            
        # Fit K-Means cluster classifier
        emb_matrix = np.vstack(embeddings)
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(emb_matrix)
        
        # Build pairwise cosine similarity comparison matrix
        sim_matrix = []
        for i in range(len(filenames)):
            row = []
            for j in range(len(filenames)):
                sim_res = compare_embeddings(embeddings[i], embeddings[j])
                row.append({
                    "target_file": filenames[j],
                    "similarity": sim_res["similarity"],
                    "confidence": sim_res["confidence"]
                })
            sim_matrix.append({
                "source_file": filenames[i],
                "comparisons": row
            })
            
            # Format and label speakers (Speaker A, Speaker B, etc.)
        cluster_assignments = []
        for i in range(len(filenames)):
            cluster_assignments.append({
                "filename": filenames[i],
                "cluster_id": int(labels[i]),
                "speaker_label": f"Speaker {chr(65 + labels[i])}" # ASCII A, B, C...
            })
            
        return {
            "success": True,
            "clusters": cluster_assignments,
            "similarity_matrix": sim_matrix
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vocal clustering calculation failed: {str(e)}"
        )
        
    finally:
        # Clear out files
        for p in saved_paths:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except Exception:
                pass
