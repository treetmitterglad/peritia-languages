"""Model loading and management for TTS/STT."""

import logging
import io
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Global model instances
_whisper_model = None
_tts_model = None
_hardware_info = None
_models_dir = os.environ.get("MODELS_DIR", os.path.expanduser("~/.cache/peritia-models"))


def get_hardware():
    global _hardware_info
    if _hardware_info is None:
        from backend.hardware import detect_hardware
        _hardware_info = detect_hardware()
    return _hardware_info


def get_whisper_model():
    """Get or load the Whisper STT model."""
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    from backend.hardware import select_whisper_model
    hw = get_hardware()
    model_size = select_whisper_model(hw)
    device = hw["device"]

    # faster-whisper uses CTranslate2 and supports CPU, CUDA
    compute_type = "float16" if device == "cuda" else "int8"
    if device == "mps":
        device = "cpu"  # faster-whisper doesn't support MPS, fallback

    logger.info(f"Loading Whisper model: {model_size} on {device} ({compute_type})")

    from faster_whisper import WhisperModel
    _whisper_model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
        download_root=os.path.join(_models_dir, "whisper"),
    )
    logger.info(f"Whisper model '{model_size}' loaded successfully")
    return _whisper_model


def get_tts_model():
    """Get or load the Chatterbox TTS model."""
    global _tts_model
    if _tts_model is not None:
        return _tts_model

    import torch
    from backend.hardware import select_chatterbox_model
    hw = get_hardware()
    variant = select_chatterbox_model(hw)
    device = hw["device"]

    logger.info(f"Loading Chatterbox TTS model: {variant} on {device}")

    if variant == "turbo":
        from chatterbox.tts_turbo import ChatterboxTurboTTS
        _tts_model = ChatterboxTurboTTS.from_pretrained(device=device)
    else:
        from chatterbox.tts import ChatterboxTTS
        _tts_model = ChatterboxTTS.from_pretrained(device=device)

    logger.info(f"Chatterbox TTS '{variant}' loaded successfully")
    return _tts_model


def transcribe_audio(audio_bytes: bytes, language: Optional[str] = None) -> dict:
    """Transcribe audio bytes using Whisper."""
    import tempfile
    model = get_whisper_model()

    # Write bytes to a temp file (faster-whisper needs a file path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True,
        )
        text = " ".join(seg.text.strip() for seg in segments)
        return {
            "text": text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
        }
    finally:
        os.unlink(tmp_path)


def synthesize_speech(text: str, language: str = "en") -> bytes:
    """Synthesize speech from text using Chatterbox TTS."""
    import torch
    import torchaudio

    model = get_tts_model()
    hw = get_hardware()

    with torch.no_grad():
        wav = model.generate(text)

    # Convert to WAV bytes
    buf = io.BytesIO()
    # Chatterbox outputs at 24kHz
    torchaudio.save(buf, wav.cpu(), 24000, format="wav")
    buf.seek(0)
    return buf.read()


def get_model_status() -> dict:
    """Return current model loading status."""
    hw = get_hardware()
    from backend.hardware import select_whisper_model, select_chatterbox_model
    return {
        "hardware": hw,
        "whisper_model": select_whisper_model(hw),
        "whisper_loaded": _whisper_model is not None,
        "tts_model": select_chatterbox_model(hw),
        "tts_loaded": _tts_model is not None,
    }
