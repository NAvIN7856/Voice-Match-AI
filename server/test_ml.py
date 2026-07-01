import os
import wave
import numpy as np
from app.ml.embedding import get_embedding
from app.ml.similarity import compare_embeddings

def create_dummy_wav(filename, duration=1.0, sample_rate=16000):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    # Generate a simple 440Hz sine wave
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    data = np.sin(2 * np.pi * 440 * t)
    # Convert to 16-bit PCM
    data = (data * 32767).astype(np.int16)
    
    with wave.open(filename, 'wb') as w:
        w.setnchannels(1)  # Mono
        w.setsampwidth(2)  # 16-bit PCM
        w.setframerate(sample_rate)
        w.writeframes(data.tobytes())
    print(f"Created {filename}")

def main():
    file1 = "app/uploads/test_voice1.wav"
    file2 = "app/uploads/test_voice2.wav"
    
    create_dummy_wav(file1, duration=1.0)
    create_dummy_wav(file2, duration=1.0)
    
    try:
        print("Extracting embedding for file 1...")
        emb1 = get_embedding(file1)
        print("Embedding 1 shape:", emb1.shape)
        
        print("Extracting embedding for file 2...")
        emb2 = get_embedding(file2)
        print("Embedding 2 shape:", emb2.shape)
        
        res = compare_embeddings(emb1, emb2)
        print(f"Similarity score: {res['similarity']}%")
        print(f"Confidence score: {res['confidence']}%")
        print(f"Raw cosine similarity: {res['raw_cosine']:.4f}")
    except Exception as e:
        print("An error occurred during embedding extraction/comparison:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
