import librosa
import numpy as np
from scipy.signal import find_peaks

def analyze_emotion(audio_path: str):
    """
    Classify the emotional state of the speaker from a WAV file.
    Analyzes acoustic features: Pitch trajectory, energy/loudness, and speaking rate.
    Returns:
        dict: {
            "primary_emotion": str,
            "probabilities": {
                "Angry": float,
                "Happy": float,
                "Sad": float,
                "Fear": float,
                "Neutral": float
            }
        }
    """
    try:
        # Load audio at 16kHz
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        if len(audio) == 0:
            return {
                "primary_emotion": "Neutral",
                "probabilities": {"Angry": 0.0, "Happy": 0.0, "Sad": 0.0, "Fear": 0.0, "Neutral": 100.0}
            }

        # 1. Pitch characteristics (F0)
        f0, voiced_flag, _ = librosa.pyin(
            audio, 
            fmin=75, 
            fmax=500, 
            sr=sr,
            frame_length=2048,
            hop_length=512
        )
        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)]
        
        # Calculate pitch statistics or use default human values
        mean_pitch = float(np.mean(voiced_f0)) if len(voiced_f0) > 0 else 150.0
        std_pitch = float(np.std(voiced_f0)) if len(voiced_f0) > 0 else 20.0
        
        # Normalize pitch (human baseline: mean=150Hz, std=25Hz)
        norm_pitch = (mean_pitch - 150.0) / 50.0
        norm_std = (std_pitch - 25.0) / 15.0

        # 2. RMS Energy
        rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
        mean_rms = float(np.mean(rms))
        # Normalize energy (typical speech RMS around 0.05)
        norm_energy = (mean_rms - 0.05) / 0.03

        # 3. Syllable Rate (Tempo)
        window_size = 5
        smoothed_rms = np.convolve(rms, np.ones(window_size)/window_size, mode='same')
        peaks, _ = find_peaks(smoothed_rms, height=max(0.005, np.mean(smoothed_rms) * 0.4), distance=8)
        duration = len(audio) / sr
        speaking_rate = len(peaks) / duration if duration > 0 else 2.5
        # Normalize speaking rate (baseline: 2.5 syllables/sec)
        norm_rate = (speaking_rate - 2.5) / 1.0

        # 4. Map Acoustic Features to Emotion Profiles
        # Angry: high energy, high pitch, high pitch variance, high tempo
        angry_score = (0.45 * norm_energy) + (0.25 * norm_pitch) + (0.20 * norm_std) + (0.10 * norm_rate)
        
        # Happy: moderate-high energy, high pitch, high pitch variance, moderate tempo
        happy_score = (0.25 * norm_energy) + (0.35 * norm_pitch) + (0.30 * norm_std) + (0.10 * norm_rate)
        
        # Sad: low energy, low pitch, low pitch variance, slow tempo
        sad_score = (-0.45 * norm_energy) + (-0.25 * norm_pitch) + (-0.20 * norm_std) + (-0.10 * norm_rate)
        
        # Fear: low-moderate energy, high pitch, low pitch variance, fast tempo
        fear_score = (-0.10 * norm_energy) + (0.45 * norm_pitch) + (-0.15 * norm_std) + (0.50 * norm_rate)
        
        # Neutral: moderate energy, baseline pitch, low pitch variance, moderate tempo
        # Centered around zero normalized values
        neutral_score = -0.5 * (abs(norm_energy) + abs(norm_pitch) + abs(norm_std) + abs(norm_rate))

        # Softmax conversion to probability distribution
        scores = np.array([angry_score, happy_score, sad_score, fear_score, neutral_score])
        
        # Use a scaling factor (temperature) of 0.4 for distinct classification splits
        exp_scores = np.exp(scores / 0.4)
        probabilities = exp_scores / np.sum(exp_scores)
        
        emotions = ["Angry", "Happy", "Sad", "Fear", "Neutral"]
        prob_dict = {emotions[i]: round(float(probabilities[i] * 100), 2) for i in range(len(emotions))}
        primary_emotion = emotions[np.argmax(probabilities)]
        
        return {
            "primary_emotion": primary_emotion,
            "probabilities": prob_dict
        }
        
    except Exception as e:
        return {
            "primary_emotion": "Neutral",
            "probabilities": {"Angry": 0.0, "Happy": 0.0, "Sad": 0.0, "Fear": 0.0, "Neutral": 100.0},
            "error": str(e)
        }
