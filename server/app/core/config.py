import os
from pathlib import Path

# Simple .env parser to avoid extra dependency issues
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                # Remove surrounding quotes if present
                val = val.strip().strip("'\"")
                os.environ.setdefault(key.strip(), val)

class Settings:
    PROJECT_NAME: str = "VoiceMatch AI"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "voicematch-ai-very-secure-secret-key-10293847")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # MongoDB Config
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "voicematch")
    
    # Upload Settings
    UPLOAD_DIR: Path = BASE_DIR / "app" / "uploads"
    
    # ML Model Backbone Settings
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "ensemble")

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
