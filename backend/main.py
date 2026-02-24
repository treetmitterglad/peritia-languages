"""FastAPI server for Peritia Languages TTS/STT backend."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load models on startup in background."""
    logger.info("Peritia Voice Backend starting...")
    from backend.models import get_hardware
    hw = get_hardware()
    logger.info(f"Device: {hw['device']} | RAM: {hw['ram_gb']}GB | GPU: {hw.get('gpu_name', 'N/A')}")
    # Models load lazily on first request to avoid blocking startup
    yield
    logger.info("Shutting down voice backend")


app = FastAPI(title="Peritia Voice Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@app.get("/api/voice/health")
async def health():
    return {"status": "ok"}


@app.get("/api/voice/status")
async def model_status():
    from backend.models import get_model_status
    return get_model_status()


@app.post("/api/voice/tts")
async def text_to_speech(req: TTSRequest):
    """Generate speech from text."""
    if not req.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    if len(req.text) > 1000:
        raise HTTPException(400, "Text too long (max 1000 chars)")

    try:
        from backend.models import synthesize_speech
        audio_bytes = synthesize_speech(req.text, req.language)
        return Response(content=audio_bytes, media_type="audio/wav")
    except Exception as e:
        logger.error(f"TTS error: {e}", exc_info=True)
        raise HTTPException(500, f"TTS generation failed: {str(e)}")


@app.post("/api/voice/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe audio to text."""
    contents = await audio.read()
    if len(contents) == 0:
        raise HTTPException(400, "Empty audio file")
    if len(contents) > 25 * 1024 * 1024:  # 25MB limit
        raise HTTPException(400, "Audio file too large (max 25MB)")

    try:
        from backend.models import transcribe_audio
        result = transcribe_audio(contents, language)
        return result
    except Exception as e:
        logger.error(f"STT error: {e}", exc_info=True)
        raise HTTPException(500, f"Transcription failed: {str(e)}")


@app.post("/api/voice/preload")
async def preload_models():
    """Preload both models (call this after startup if you want eager loading)."""
    from backend.models import get_whisper_model, get_tts_model
    try:
        get_whisper_model()
        get_tts_model()
        return {"status": "models loaded"}
    except Exception as e:
        logger.error(f"Preload error: {e}", exc_info=True)
        raise HTTPException(500, f"Failed to preload: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=5151, reload=True)
