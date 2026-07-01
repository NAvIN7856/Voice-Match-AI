import os
import uuid
from app.services.audio_service import audio_service
from app.services.db_service import db_service
from app.ml.embedding import get_embedding
from app.ml.similarity import compare_embeddings
from app.core.config import settings

class CompareService:
    @staticmethod
    def compare_voices(
        path1: str,
        path2: str,
        filename1: str,
        filename2: str,
        user_id: str = None,
        is_public: bool = False
    ):
        """
        Processes, validates, analyzes, and compares two speaker audio files.
        Optionally logs results in user history.
        """
        # Define clean preprocessed paths
        unique_id = uuid.uuid4().hex
        prep_path1 = str(settings.UPLOAD_DIR / f"prep_{unique_id}_1.wav")
        prep_path2 = str(settings.UPLOAD_DIR / f"prep_{unique_id}_2.wav")

        try:
            # 1. Process and analyze both files
            res1 = audio_service.process_and_analyze(path1, prep_path1)
            if not res1["success"]:
                return {"success": False, "error": f"File 1: {res1['error']}"}

            res2 = audio_service.process_and_analyze(path2, prep_path2)
            if not res2["success"]:
                return {"success": False, "error": f"File 2: {res2['error']}"}

            # 2. Extract speaker embeddings
            emb1 = get_embedding(prep_path1)
            emb2 = get_embedding(prep_path2)

            # 3. Calculate similarity and confidence
            comparison_results = compare_embeddings(emb1, emb2)

            # 4. Formulate metrics dictionary comparing specific vocal indicators
            # Side-by-side pitch differences, speaking rate comparison, quality comparison.
            metrics = {
                "file1": {
                    "filename": filename1,
                    "analysis": res1["analysis"],
                    "spoof": res1["spoof"],
                    "emotion": res1["emotion"]
                },
                "file2": {
                    "filename": filename2,
                    "analysis": res2["analysis"],
                    "spoof": res2["spoof"],
                    "emotion": res2["emotion"]
                }
            }

            # 5. Save history if user is authenticated
            comparison_record = None
            if user_id:
                comparison_record = db_service.save_comparison(
                    user_id=user_id,
                    file1_name=filename1,
                    file2_name=filename2,
                    similarity=comparison_results["similarity"],
                    confidence=comparison_results["confidence"],
                    metrics=metrics,
                    is_public=is_public
                )

            return {
                "success": True,
                "similarity": comparison_results["similarity"],
                "confidence": comparison_results["confidence"],
                "raw_cosine": comparison_results["raw_cosine"],
                "file1": metrics["file1"],
                "file2": metrics["file2"],
                "comparison_id": comparison_record["_id"] if comparison_record else None
            }

        finally:
            # Clean up all uploaded and intermediate files
            for p in (path1, path2, prep_path1, prep_path2):
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass

compare_service = CompareService()
