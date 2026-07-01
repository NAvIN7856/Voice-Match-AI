import os
import wave
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

def create_dummy_wav(filename, duration=1.0, sample_rate=16000):
    dir_name = os.path.dirname(filename)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    # Generate a simple sine wave
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    data = np.sin(2 * np.pi * 440 * t)
    # Convert to 16-bit PCM
    data = (data * 32767).astype(np.int16)
    
    with wave.open(filename, 'wb') as w:
        w.setnchannels(1)  # Mono
        w.setsampwidth(2)  # 16-bit PCM
        w.setframerate(sample_rate)
        w.writeframes(data.tobytes())
    return filename

def main():
    client = TestClient(app)
    
    file1 = "test_audio1.wav"
    file2 = "test_audio2.wav"
    
    create_dummy_wav(file1, duration=1.0)
    create_dummy_wav(file2, duration=1.0)
    
    print("Sending POST request to /api/compare...")
    
    try:
        with open(file1, "rb") as f1, open(file2, "rb") as f2:
            response = client.post(
                "/api/compare",
                files={
                    "file1": ("test_audio1.wav", f1, "audio/wav"),
                    "file2": ("test_audio2.wav", f2, "audio/wav")
                }
            )
            
        print("Response status code:", response.status_code)
        print("Response json:", response.json())
        
        assert response.status_code == 200
        data = response.json()
        assert "similarity" in data
        assert isinstance(data["similarity"], (int, float))
        print("Integration test passed successfully!")
        
    except Exception as e:
        print("Integration test failed!")
        import traceback
        traceback.print_exc()
    finally:
        # clean up local test audio files
        for f in (file1, file2):
            if os.path.exists(f):
                os.remove(f)

if __name__ == "__main__":
    main()
