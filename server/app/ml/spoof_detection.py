import librosa
import numpy as np

def detect_spoof(audio_path: str):
    """
    Analyze the acoustic profile of the audio to detect synthetic, TTS, or deepfaked speech.
    Returns a dictionary with the spoof probability, a categorical verdict, and explanation reasons.
    """
    try:
        # Load audio at 16kHz
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        if len(audio) == 0:
            return {
                "spoof_score": 0.0,
                "verdict": "Unknown",
                "reasons": ["Empty audio signal"],
                "details": {}
            }

        # 1. Spectral Flatness (tests for uniform noise/vocoder phase mismatches)
        flatness = librosa.feature.spectral_flatness(y=audio)[0]
        mean_flatness = float(np.mean(flatness))
        
        # 2. High Frequency Energy Ratio (energy above 6kHz vs below 6kHz)
        # Standard human speech concentrates power in lower formants; synthesizers often cut off or leak noise.
        stft = np.abs(librosa.stft(audio))
        freqs = librosa.fft_frequencies(sr=sr)
        high_freq_mask = freqs >= 6000
        low_freq_mask = freqs < 6000
        
        high_energy = np.sum(stft[high_freq_mask, :])
        low_energy = np.sum(stft[low_freq_mask, :])
        hf_ratio = float(high_energy / (low_energy + 1e-8))
        
        # 3. Pitch Monotony and Jitter
        # TTS/deepfakes often have extremely flat pitch (robotic) or lack natural micro-jitter.
        f0, voiced_flag, voiced_probs = librosa.pyin(
            audio, 
            fmin=75, 
            fmax=500, 
            sr=sr,
            frame_length=2048,
            hop_length=512
        )
        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)]
        
        if len(voiced_f0) > 2:
            pitch_std = float(np.std(voiced_f0))
            periods = 1.0 / voiced_f0
            jitter = float(np.mean(np.abs(np.diff(periods))) / np.mean(periods))
        else:
            pitch_std = 0.0
            jitter = 0.0

        # Heuristic Spoof Score calculation
        score = 0.0
        reasons = []
        
        # Criterion A: Pitch variance checking
        if pitch_std > 0 and pitch_std < 7.0:
            score += 30
            reasons.append("Abnormally flat/monotonous pitch variance, typical of robotic TTS voice generation.")
            
        # Criterion B: Jitter analysis
        if jitter > 0 and jitter < 0.0015:
            score += 30
            reasons.append("Unnaturally stable vocal cycle vibrations (extremely low jitter). Human voices exhibit minor micro-instability.")
        elif jitter > 0.05:
            score += 15
            reasons.append("Extreme pitch cycle fluctuations suggesting speech reconstruction phase artifacts.")

        # Criterion C: High-frequency vocoder bounds
        if hf_ratio < 0.0005:
            score += 20
            reasons.append("Sharp high-frequency energy cutoff (frequently found in classic neural vocoders like WaveNet/WaveGlow).")
        elif hf_ratio > 0.09:
            score += 25
            reasons.append("Excessive high-frequency energy leakage, indicating synthetic hiss or phase noise artifacts.")
            
        # Criterion D: Noise floor profile
        if mean_flatness > 0.005:
            score += 15
            reasons.append("High spectral flatness indicating flat noise floor characteristics of vocoder background synthesis.")

        # Clamp between 0.0 and 100.0
        score = min(98.0, max(2.0, score))
        
        # Final Verdict Decision
        if score >= 70.0:
            verdict = "Highly Suspicious (Likely AI/Synthetic)"
        elif score >= 40.0:
            verdict = "Suspicious (Possible Deepfake/TTS)"
        else:
            verdict = "Natural (Human Voice)"
            
        return {
            "spoof_score": round(score, 2),
            "verdict": verdict,
            "reasons": reasons if reasons else ["vocal profile matches natural human vocal dynamics."],
            "details": {
                "jitter": round(jitter, 5),
                "pitch_std": round(pitch_std, 2),
                "high_freq_ratio": round(hf_ratio, 5),
                "spectral_flatness": round(mean_flatness, 6)
            }
        }
    except Exception as e:
        return {
            "spoof_score": 0.0,
            "verdict": "Unknown (Error)",
            "reasons": [f"Deepfake detection analysis encountered an error: {str(e)}"],
            "details": {}
        }
