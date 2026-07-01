from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def get_confidence_score(similarity: float, model_name: str = None) -> float:
    """
    Map cosine similarity to a confidence percentage of being the same speaker.
    Calibrated based on the active speaker verification model backbone:
    - Same speaker threshold varies by model.
    - Cosine similarity ranges from -1.0 to 1.0.
    """
    if model_name is None:
        from app.core.config import settings
        model_name = settings.DEFAULT_MODEL
        
    model_name = model_name.strip().lower()
    s = float(np.clip(similarity, -1.0, 1.0))
    
    # Define verification thresholds based on empirical EER of each backbone
    if model_name == "campplus":
        th_strong = 0.65
        th_mid = 0.50
        th_weak = 0.35
    elif model_name == "resnet":
        th_strong = 0.62
        th_mid = 0.48
        th_weak = 0.32
    elif model_name == "ensemble":
        th_strong = 0.61
        th_mid = 0.47
        th_weak = 0.32
    else: # ecapa
        th_strong = 0.58
        th_mid = 0.45
        th_weak = 0.30
    
    if s >= th_strong:
        # Strong match: th_strong -> 80%, 1.00 -> 100%
        conf = 80.0 + (s - th_strong) * (20.0 / (1.0 - th_strong))
    elif s >= th_mid:
        # Borderline/Probable match: th_mid -> 50%, th_strong -> 80%
        conf = 50.0 + (s - th_mid) * (30.0 / (th_strong - th_mid))
    elif s >= th_weak:
        # Unlikely match: th_weak -> 15%, th_mid -> 50%
        conf = 15.0 + (s - th_weak) * (35.0 / (th_mid - th_weak))
    else:
        # Distinct speakers: -1.0 to th_weak -> 0% to 15%
        s_clamped = max(-0.10, s)
        conf = 0.0 + (s_clamped + 0.10) * (15.0 / (th_weak + 0.10))
        
    return round(float(conf), 2)

def compare_embeddings(emb1: np.ndarray, emb2: np.ndarray, model_name: str = None):
    """
    Calculate the cosine similarity between two speaker embeddings.
    Returns:
        dict: {
            "similarity": float (0-100 scale),
            "raw_cosine": float (-1.0 to 1.0),
            "confidence": float (0-100 percentage)
        }
    """
    raw_cosine = cosine_similarity(
        emb1.reshape(1, -1),
        emb2.reshape(1, -1)
    )[0][0]
    
    raw_cosine = float(raw_cosine)
    confidence = get_confidence_score(raw_cosine, model_name)
    
    return {
        "similarity": round(max(0.0, raw_cosine) * 100, 2), # 0-100 scale for UI
        "raw_cosine": raw_cosine,
        "confidence": confidence
    }