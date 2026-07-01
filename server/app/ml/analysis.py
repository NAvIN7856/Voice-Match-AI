import librosa
import numpy as np
from scipy.signal import find_peaks

def analyze_voice(audio_path: str):
    """
    Extract detailed vocal characteristics and voice quality metrics from a WAV file.
    """
    try:
        # Load audio at standard 16kHz
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        duration = len(audio) / sr
        
        if len(audio) == 0:
            return {}

        # 1. RMS Energy and Loudness (dBFS)
        rms_frames = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
        avg_rms = float(np.mean(rms_frames))
        # Add tiny offset to avoid log10(0)
        loudness_db = 20 * np.log10(avg_rms + 1e-6)
        
        # 2. Pitch Tracking (F0) using Probabilistic YIN (Pyin)
        # 75Hz to 500Hz covers the normal speech fundamental frequencies for adults
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio, 
            fmin=75, 
            fmax=500, 
            sr=sr,
            frame_length=2048,
            hop_length=512
        )
        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)]
        
        if len(voiced_f0) > 0:
            mean_pitch = float(np.mean(voiced_f0))
            min_pitch = float(np.min(voiced_f0))
            max_pitch = float(np.max(voiced_f0))
            std_pitch = float(np.std(voiced_f0))
        else:
            mean_pitch = min_pitch = max_pitch = std_pitch = 0.0

        # 3. Speaking Rate (Syllable Detection)
        # Smooth RMS envelope to detect vocalic nuclei/syllables
        window_size = 5
        smoothed_rms = np.convolve(rms_frames, np.ones(window_size)/window_size, mode='same')
        # Dynamic threshold based on median and mean
        threshold = max(0.005, np.mean(smoothed_rms) * 0.45)
        
        # Min distance of 8 frames (~256ms) prevents double-triggering on single syllables
        peaks, _ = find_peaks(smoothed_rms, height=threshold, distance=8)
        syllable_count = len(peaks)
        speaking_rate = syllable_count / duration if duration > 0 else 0.0

        # 4. Voice Quality: Jitter (pitch stability) and Shimmer (amplitude stability)
        if len(voiced_f0) > 2:
            periods = 1.0 / voiced_f0
            period_diffs = np.abs(np.diff(periods))
            jitter = float(np.mean(period_diffs) / np.mean(periods))
        else:
            jitter = 0.0
            
        # Shimmer: measure frame peak amplitudes during voiced frames
        voiced_frames = []
        hop_length = 512
        frame_length = 2048
        for i, flag in enumerate(voiced_flag):
            if flag and i * hop_length + frame_length < len(audio):
                frame = audio[i*hop_length : i*hop_length + frame_length]
                voiced_frames.append(np.max(np.abs(frame)))
                
        if len(voiced_frames) > 2:
            amp_diffs = np.abs(np.diff(voiced_frames))
            shimmer = float(np.mean(amp_diffs) / np.mean(voiced_frames))
        else:
            shimmer = 0.0

        # 5. Spectral Centroid (Brightness) and Flatness (Noisiness)
        centroid = librosa.feature.spectral_centroid(y=audio, sr=sr, n_fft=2048, hop_length=512)[0]
        flatness = librosa.feature.spectral_flatness(y=audio, n_fft=2048, hop_length=512)[0]
        
        mean_centroid = float(np.mean(centroid))
        mean_flatness = float(np.mean(flatness))

        return {
            "duration": round(duration, 2),
            "energy": round(avg_rms, 4),
            "loudness_db": round(loudness_db, 2),
            "pitch": {
                "mean": round(mean_pitch, 2),
                "min": round(min_pitch, 2),
                "max": round(max_pitch, 2),
                "std": round(std_pitch, 2),
            },
            "speaking_rate": round(speaking_rate, 2),
            "syllables": syllable_count,
            "quality": {
                "jitter": round(jitter, 5),
                "shimmer": round(shimmer, 5),
                "spectral_centroid": round(mean_centroid, 2),
                "spectral_flatness": round(mean_flatness, 6)
            }
        }
    except Exception as e:
        # Graceful fallback in case of analysis issues
        return {
            "duration": 0.0,
            "energy": 0.0,
            "loudness_db": 0.0,
            "pitch": {"mean": 0.0, "min": 0.0, "max": 0.0, "std": 0.0},
            "speaking_rate": 0.0,
            "syllables": 0,
            "quality": {"jitter": 0.0, "shimmer": 0.0, "spectral_centroid": 0.0, "spectral_flatness": 0.0},
            "error": str(e)
        }
