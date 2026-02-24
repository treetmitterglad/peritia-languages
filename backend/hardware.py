"""Hardware detection and model selection for TTS/STT."""

import psutil
import logging

logger = logging.getLogger(__name__)


def detect_hardware() -> dict:
    """Detect available hardware and return capabilities."""
    info = {
        "cpu_cores": psutil.cpu_count(logical=False) or 1,
        "cpu_threads": psutil.cpu_count(logical=True) or 1,
        "ram_gb": round(psutil.virtual_memory().total / (1024 ** 3), 1),
        "gpu_available": False,
        "gpu_name": None,
        "vram_gb": 0,
        "device": "cpu",
    }

    try:
        import torch
        if torch.cuda.is_available():
            info["gpu_available"] = True
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["vram_gb"] = round(torch.cuda.get_device_properties(0).total_mem / (1024 ** 3), 1)
            info["device"] = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            info["gpu_available"] = True
            info["gpu_name"] = "Apple MPS"
            info["device"] = "mps"
    except ImportError:
        pass

    logger.info(f"Hardware detected: {info}")
    return info


def select_whisper_model(hw: dict) -> str:
    """Select the best Whisper model size for the hardware."""
    if hw["device"] == "cuda":
        vram = hw["vram_gb"]
        if vram >= 10:
            return "large-v3"
        if vram >= 6:
            return "medium"
        if vram >= 4:
            return "small"
        return "base"

    # CPU or MPS: use RAM
    ram = hw["ram_gb"]
    if ram >= 16:
        return "small"
    if ram >= 8:
        return "base"
    return "tiny"


def select_chatterbox_model(hw: dict) -> str:
    """Select Chatterbox model variant. Turbo for constrained hardware."""
    if hw["device"] == "cuda" and hw["vram_gb"] >= 6:
        return "full"  # 500M param model
    return "turbo"  # 350M param model, faster
