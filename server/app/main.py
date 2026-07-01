from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import router as upload_router
from app.api.compare import router as compare_router
from app.api.auth import router as auth_router
from app.api.analysis import router as analysis_router
from app.api.history import router as history_router
from app.api.clustering import router as clustering_router

app = FastAPI(title="VoiceMatch AI")

# Add CORS Middleware to enable communication with the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Accept all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route prefixes under "/api"
app.include_router(auth_router, prefix="/api")
app.include_router(compare_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(clustering_router, prefix="/api")
app.include_router(upload_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "VoiceMatch AI Backend Running 🚀"}