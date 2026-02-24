"""FastAPI server for Peritia Languages TTS/STT backend."""

import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Global download progress tracking
download_progress = {
    "phase": "idle",  # idle, detecting, downloading_whisper, downloading_tts, ready, error
    "progress": 0,  # 0-100
    "detail": "",
    "hardware": None,
    "whisper_model": None,
    "tts_model": None,
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Peritia Voice Backend starting...")
    from backend.models import get_hardware
    hw = get_hardware()
    logger.info(f"Device: {hw['device']} | RAM: {hw['ram_gb']}GB | GPU: {hw.get('gpu_name', 'N/A')}")
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


@app.get("/api/voice/download-progress")
async def get_download_progress():
    """Get current model download/setup progress."""
    return download_progress


@app.post("/api/voice/setup")
async def setup_models():
    """Detect hardware and start downloading models. Returns immediately, poll /download-progress."""
    global download_progress

    if download_progress["phase"] in ("downloading_whisper", "downloading_tts"):
        return {"status": "already_in_progress"}

    download_progress = {
        "phase": "detecting",
        "progress": 5,
        "detail": "Detecting hardware...",
        "hardware": None,
        "whisper_model": None,
        "tts_model": None,
    }

    # Run in background
    asyncio.create_task(_download_models_bg())
    return {"status": "started"}


async def _download_models_bg():
    """Background task to download models."""
    global download_progress
    try:
        from backend.models import get_hardware
        from backend.hardware import select_whisper_model, select_chatterbox_model

        hw = get_hardware()
        whisper_size = select_whisper_model(hw)
        tts_variant = select_chatterbox_model(hw)

        download_progress.update({
            "phase": "detecting",
            "progress": 10,
            "detail": f"Detected: {hw['device'].upper()} | RAM: {hw['ram_gb']}GB" + (f" | GPU: {hw['gpu_name']}" if hw['gpu_available'] else ""),
            "hardware": hw,
            "whisper_model": whisper_size,
            "tts_model": tts_variant,
        })
        await asyncio.sleep(1)

        # Download Whisper
        download_progress.update({
            "phase": "downloading_whisper",
            "progress": 20,
            "detail": f"Downloading Whisper ({whisper_size})...",
        })

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _load_whisper)

        download_progress.update({
            "phase": "downloading_tts",
            "progress": 60,
            "detail": f"Downloading Chatterbox TTS ({tts_variant})...",
        })

        await loop.run_in_executor(None, _load_tts)

        download_progress.update({
            "phase": "ready",
            "progress": 100,
            "detail": "All models ready!",
        })

    except Exception as e:
        logger.error(f"Model setup error: {e}", exc_info=True)
        download_progress.update({
            "phase": "error",
            "progress": 0,
            "detail": f"Setup failed: {str(e)}",
        })


def _load_whisper():
    from backend.models import get_whisper_model
    get_whisper_model()


def _load_tts():
    from backend.models import get_tts_model
    get_tts_model()


@app.post("/api/voice/tts")
async def text_to_speech(req: TTSRequest):
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
    contents = await audio.read()
    if len(contents) == 0:
        raise HTTPException(400, "Empty audio file")
    if len(contents) > 25 * 1024 * 1024:
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
