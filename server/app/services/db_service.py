import uuid
from datetime import datetime
import numpy as np
from app.core.database import db
from sklearn.metrics.pairwise import cosine_similarity

class DBService:
    # --- USER OPERATIONS ---
    @staticmethod
    def create_user(username: str, password_hash: str):
        user = {
            "_id": uuid.uuid4().hex,
            "username": username,
            "password_hash": password_hash,
            "created_at": datetime.utcnow()
        }
        db["users"].insert_one(user)
        return user

    @staticmethod
    def get_user_by_username(username: str):
        return db["users"].find_one({"username": username})

    @staticmethod
    def get_user_by_id(user_id: str):
        return db["users"].find_one({"_id": user_id})

    # --- COMPARISON HISTORY OPERATIONS ---
    @staticmethod
    def save_comparison(
        user_id: str = None,
        file1_name: str = "",
        file2_name: str = "",
        similarity: float = 0.0,
        confidence: float = 0.0,
        metrics: dict = None,
        is_public: bool = False
    ):
        comparison = {
            "_id": uuid.uuid4().hex,
            "user_id": user_id,
            "file1_name": file1_name,
            "file2_name": file2_name,
            "similarity": similarity,
            "confidence": confidence,
            "metrics": metrics or {},
            "is_public": is_public,
            "created_at": datetime.utcnow()
        }
        db["comparisons"].insert_one(comparison)
        return comparison

    @staticmethod
    def get_comparison(comparison_id: str):
        return db["comparisons"].find_one({"_id": comparison_id})

    @staticmethod
    def get_user_comparisons(user_id: str):
        # Retrieve and sort comparisons by created_at descending
        res = db["comparisons"].find({"user_id": user_id})
        # Mock database returns lists, Mongo returns cursors
        comparisons = list(res)
        comparisons.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return comparisons

    @staticmethod
    def delete_comparison(user_id: str, comparison_id: str):
        # Make sure user owns it
        return db["comparisons"].delete_one({"_id": comparison_id, "user_id": user_id})

    @staticmethod
    def set_comparison_privacy(user_id: str, comparison_id: str, is_public: bool):
        # Update is_public flag
        return db["comparisons"].update_one(
            {"_id": comparison_id, "user_id": user_id},
            {"$set": {"is_public": is_public}}
        )

    # --- VOICE CATALOG & VECTOR SEARCH OPERATIONS ---
    @staticmethod
    def save_voice(user_id: str, label: str, filename: str, embedding: np.ndarray, metrics: dict):
        voice = {
            "_id": uuid.uuid4().hex,
            "user_id": user_id,
            "label": label,
            "filename": filename,
            "embedding": embedding.tolist(), # Convert to list for database storage
            "metrics": metrics or {},
            "created_at": datetime.utcnow()
        }
        db["voices"].insert_one(voice)
        return voice

    @staticmethod
    def get_user_voices(user_id: str):
        voices = list(db["voices"].find({"user_id": user_id}))
        voices.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return voices

    @staticmethod
    def delete_voice(user_id: str, voice_id: str):
        return db["voices"].delete_one({"_id": voice_id, "user_id": user_id})

    @staticmethod
    def find_similar_voices(user_id: str, query_embedding: np.ndarray, limit: int = 5):
        """
        Find top matching voices in the catalog using vector similarity.
        Computes cosine similarity in memory across the user's voices.
        """
        voices = list(db["voices"].find({"user_id": user_id}))
        if not voices:
            return []

        # Prepare matrices
        embeddings = [np.array(v["embedding"]) for v in voices]
        emb_matrix = np.vstack(embeddings)
        query_vector = query_embedding.reshape(1, -1)

        # Compute similarities
        similarities = cosine_similarity(query_vector, emb_matrix)[0]

        # Attach scores and sort
        results = []
        for i, voice in enumerate(voices):
            sim_score = float(similarities[i])
            # Calibrate matching confidence percentage
            from app.ml.similarity import get_confidence_score
            confidence = get_confidence_score(sim_score)
            
            results.append({
                "voice": {
                    "_id": voice["_id"],
                    "label": voice["label"],
                    "filename": voice["filename"],
                    "metrics": voice["metrics"],
                    "created_at": voice["created_at"]
                },
                "similarity": round(max(0.0, sim_score) * 100, 2),
                "confidence": confidence
            })

        # Sort descending by similarity score
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]

db_service = DBService()
