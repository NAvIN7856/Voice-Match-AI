import sys
import os

# Dynamic patch to fix SpeechBrain's LazyModule path checking bug on Windows
try:
    import speechbrain.utils.importutils as sb_import
    original_ensure = sb_import.LazyModule.ensure_module

    def patched_ensure_module(self, stacklevel: int):
        # Inspect caller frame
        frame = sys._getframe(stacklevel + 1)
        filename = frame.f_code.co_filename
        # Check both Windows and Unix path structures for inspect.py
        if filename.endswith("inspect.py") or filename.endswith("inspect.pyc"):
            raise AttributeError()
        return original_ensure(self, stacklevel)

    # Override the class method dynamically
    sb_import.LazyModule.ensure_module = patched_ensure_module
except Exception:
    # Fail silently if speechbrain is not installed or import structure changes
    pass

import librosa
import torch
import numpy as np

from app.core.config import settings

_classifiers = {}

def get_classifier(model_name: str = "ecapa"):
    """
    Get or load the requested speaker encoder classifier model on demand, caching it in memory.
    """
    global _classifiers
    
    # Normalize model_name to prevent case/spacing mismatches
    model_name = model_name.strip().lower()
    
    if model_name not in _classifiers:
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        
        if model_name == "resnet":
            source = "speechbrain/spkrec-resnet-voxceleb"
            savedir = "pretrained_models/spkrec-resnet"
        else: # default/fallback to ecapa
            source = "speechbrain/spkrec-ecapa-voxceleb"
            savedir = "pretrained_models/spkrec-ecapa"
            
        print(f"[EmbeddingService] Loading SpeechBrain classifier: {source}...")
        _classifiers[model_name] = EncoderClassifier.from_hparams(
            source=source,
            savedir=savedir,
            local_strategy=LocalStrategy.COPY
        )
        print(f"[EmbeddingService] Classifier {model_name} loaded successfully.")
        
    return _classifiers[model_name]

def get_embedding(audio_path: str, model_name: str = None) -> np.ndarray:
    """
    Generate speaker embedding using the configured or specified SpeechBrain model.
    Loads audio with librosa and converts to PyTorch tensor.
    
    Args:
        audio_path (str): Path to the WAV file.
        model_name (str, optional): The name of the model to use ('ecapa', 'resnet', 'ensemble').
                                    If None, uses the DEFAULT_MODEL from settings.
    Returns:
        np.ndarray: 1D array representing speaker embedding
    """
    if model_name is None:
        model_name = settings.DEFAULT_MODEL
        
    model_name = model_name.strip().lower()
    
    # Ensemble option: Concatenates unit-normalized ECAPA and ResNet embeddings for multi-model verification.
    if model_name == "ensemble":
        emb_ecapa = get_embedding(audio_path, model_name="ecapa")
        emb_resnet = get_embedding(audio_path, model_name="resnet")
        
        # Normalize to unit length
        norm_ecapa = emb_ecapa / (np.linalg.norm(emb_ecapa) + 1e-8)
        norm_resnet = emb_resnet / (np.linalg.norm(emb_resnet) + 1e-8)
        
        # Concatenate: (192 + 512) = 704 dimensional representation
        return np.concatenate([norm_ecapa, norm_resnet])
        
    classifier = get_classifier(model_name)
    
    # Load audio at 16kHz mono using librosa
    audio, sr = librosa.load(audio_path, sr=16000, mono=True)
    signal = torch.tensor(audio, dtype=torch.float32)
    
    # Extract embedding
    with torch.no_grad():
        embedding = classifier.encode_batch(signal.unsqueeze(0))
        
    return embedding.squeeze().detach().cpu().numpy()