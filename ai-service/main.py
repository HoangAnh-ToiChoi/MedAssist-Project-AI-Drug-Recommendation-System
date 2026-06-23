import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from services.provider_router import get_provider_health_snapshot

# Load env variables from .env if present
load_dotenv()

from routers.chat import router as chat_router
from routers.grounded_chat import router as grounded_chat_router
from routers.recommendation import router as recommendation_router

app = FastAPI(
    title="MedAssist AI - AI Service",
    description="Internal AI service for NLP symptom mapping, rule engine, and chatbot fallback features.",
    version="1.0.0"
)

# Enable CORS (allow connections from backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)
app.include_router(grounded_chat_router)
app.include_router(recommendation_router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "provider_health": get_provider_health_snapshot(),
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    # Run server locally
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
