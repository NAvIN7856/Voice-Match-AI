import os
from app.ml.preprocessing import preprocess_audio
from app.ml.analysis import analyze_voice
from app.ml.spoof_detection import detect_spoof
from app.ml.emotion import analyze_emotion

class AudioService:
    @staticmethod
    def process_and_analyze(input_path: str, output_path: str):
        """
        Coordinates full audio processing: validation, silence removal, normalization,
        acoustic voice metrics, deepfake detection, and emotion classification.
        """
        # Preprocess and validate
        prep_res = preprocess_audio(input_path, output_path)
        if not prep_res["success"]:
            return prep_res
            
        # Run speech analysis on the preprocessed/clean audio file
        analysis = analyze_voice(output_path)
        spoof = detect_spoof(output_path)
        emotion = analyze_emotion(output_path)
        
        return {
            "success": True,
            "error": None,
            "metadata": {
                "original_duration": prep_res["original_duration"],
                "processed_duration": prep_res["processed_duration"],
                "rms_energy": prep_res["rms_energy"],
                "peak_amplitude": prep_res["peak_amplitude"]
            },
            "analysis": analysis,
            "spoof": spoof,
            "emotion": emotion
        }

audio_service = AudioService()
