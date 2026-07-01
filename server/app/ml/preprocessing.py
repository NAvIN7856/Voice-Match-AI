import librosa
import soundfile as sf
import numpy as np
import os

from scipy.signal import butter, sosfiltfilt

TARGET_SR = 16000

def bandpass_filter(audio, sr, lowcut=80, highcut=7500):
    """
    Apply a 5th-order Butterworth bandpass filter to restrict audio to speech frequencies.
    Removes low-end hum/rumble and high-end static hiss.
    """
    nyq = 0.5 * sr
    low = lowcut / nyq
    high = highcut / nyq
    # 5th-order filter is stable and has sharp roll-off
    sos = butter(5, [low, high], btype='band', output='sos')
    return sosfiltfilt(sos, audio)

def noise_reduction(audio, sr):
    """
    Apply dynamic spectral subtraction noise reduction.
    Estimates the noise floor profile from lower-energy frequency bins and subtracts it.
    """
    if len(audio) == 0:
        return audio
        
    # Short-Time Fourier Transform
    stft = librosa.stft(audio, n_fft=2048, hop_length=512)
    magnitude = np.abs(stft)
    phase = np.angle(stft)
    
    # Estimate noise from the 10th percentile of magnitude for each frequency bin
    # (assumes at least some part of the recording contains quiet speech pauses/background)
    noise_est = np.percentile(magnitude, 10, axis=1, keepdims=True)
    
    # Subtract noise floor with a small oversubtraction factor and spectral floor (beta)
    # to avoid musical noise / negative amplitude values
    oversub_factor = 1.5
    beta = 0.05
    magnitude_clean = np.maximum(magnitude - oversub_factor * noise_est, beta * magnitude)
    
    # Reconstruct complex spectrogram and perform inverse STFT
    stft_clean = magnitude_clean * np.exp(1j * phase)
    return librosa.istft(stft_clean, hop_length=512)

def validate_audio_quality(audio, sr):
    """
    Validate the quality of the audio signal.
    Returns: (is_valid: bool, reason: str)
    """
    # 1. Check if empty or zeros
    if len(audio) == 0 or np.max(np.abs(audio)) == 0:
        return False, "Audio is empty or silent"
    
    # 2. Check raw duration
    duration = len(audio) / sr
    if duration < 1.0:
        return False, f"Audio is too short ({duration:.2f}s). Minimum active duration is 1.0s."
        
    # 3. Check if too quiet (RMS energy)
    rms = np.sqrt(np.mean(audio**2))
    if rms < 0.002:
        return False, "Audio volume is too low / contains no significant signal"
        
    # 4. Check for digital clipping / distortion
    # Measure what percentage of samples are sitting at peak amplitude
    max_val = np.max(np.abs(audio))
    if max_val > 0.95:
        peak_percentage = np.sum(np.abs(audio) >= (max_val * 0.99)) / len(audio)
        if peak_percentage > 0.15:
            return False, "Audio contains severe digital clipping or sound distortion"
            
    return True, "Valid audio quality"

def preprocess_audio(input_path: str, output_path: str):
    """
    Convert audio to:
    - WAV
    - 16kHz
    - Mono
    - Bandpass filtered (80-7500Hz)
    - Noise reduced (spectral subtraction)
    - Silence Removed
    - Volume Normalized
    Returns:
        dict: containing processing metadata and status
    """
    try:
        # Load audio at 16kHz mono
        audio, sr = librosa.load(input_path, sr=TARGET_SR, mono=True)
        original_duration = len(audio) / sr
        
        # Run raw quality validation
        is_valid, reason = validate_audio_quality(audio, sr)
        if not is_valid:
            return {
                "success": False,
                "error": f"Validation failed: {reason}",
                "original_duration": original_duration,
                "processed_duration": 0.0,
                "rms_energy": 0.0,
                "peak_amplitude": 0.0
            }
            
        # Apply bandpass filtering to remove low-frequency rumble and high-frequency noise
        audio_filtered = bandpass_filter(audio, sr)
        
        # Apply dynamic spectral noise reduction
        audio_clean = noise_reduction(audio_filtered, sr)
        
        # Remove silence (top_db=30 is a standard threshold for speech)
        intervals = librosa.effects.split(audio_clean, top_db=30)
        if len(intervals) == 0:
            return {
                "success": False,
                "error": "Audio contains only silence",
                "original_duration": original_duration,
                "processed_duration": 0.0,
                "rms_energy": 0.0,
                "peak_amplitude": 0.0
            }
            
        audio_no_silence = np.concatenate([audio_clean[start:end] for start, end in intervals])
        processed_duration = len(audio_no_silence) / sr
        
        if processed_duration < 1.0:
            return {
                "success": False,
                "error": f"Vocal duration too short ({processed_duration:.2f}s after silence removal)",
                "original_duration": original_duration,
                "processed_duration": processed_duration,
                "rms_energy": 0.0,
                "peak_amplitude": 0.0
            }
            
        # Normalize volume to standard peak amplitude of -1 dBFS (0.89 amplitude)
        max_val = np.max(np.abs(audio_no_silence))
        if max_val > 0:
            audio_normalized = (audio_no_silence / max_val) * 0.89
        else:
            audio_normalized = audio_no_silence
            
        # Calculate RMS energy of normalized audio
        rms = float(np.sqrt(np.mean(audio_normalized**2)))
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save preprocessed audio
        sf.write(output_path, audio_normalized, TARGET_SR)
        
        return {
            "success": True,
            "error": None,
            "original_duration": float(original_duration),
            "processed_duration": float(processed_duration),
            "rms_energy": rms,
            "peak_amplitude": float(np.max(np.abs(audio_normalized)))
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Audio processing failed: {str(e)}",
            "original_duration": 0.0,
            "processed_duration": 0.0,
            "rms_energy": 0.0,
            "peak_amplitude": 0.0
        }