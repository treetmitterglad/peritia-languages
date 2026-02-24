/**
 * Voice service for TTS/STT integration with local backend.
 * Works with both Docker and npm run dev setups.
 */

const VOICE_API_BASE = import.meta.env.VITE_VOICE_API_URL || "http://localhost:5151";

interface VoiceStatus {
  hardware: {
    cpu_cores: number;
    ram_gb: number;
    gpu_available: boolean;
    gpu_name: string | null;
    vram_gb: number;
    device: string;
  };
  whisper_model: string;
  whisper_loaded: boolean;
  tts_model: string;
  tts_loaded: boolean;
}

interface STTResult {
  text: string;
  language: string;
  language_probability: number;
}

let _voiceAvailable: boolean | null = null;

/**
 * Check if the voice backend is running.
 */
export async function isVoiceAvailable(): Promise<boolean> {
  if (_voiceAvailable !== null) return _voiceAvailable;
  try {
    const res = await fetch(`${VOICE_API_BASE}/api/voice/health`, {
      signal: AbortSignal.timeout(2000),
    });
    _voiceAvailable = res.ok;
  } catch {
    _voiceAvailable = false;
  }
  return _voiceAvailable;
}

/** Reset availability check (for retry) */
export function resetVoiceCheck() {
  _voiceAvailable = null;
}

/**
 * Get voice backend status including hardware info and loaded models.
 */
export async function getVoiceStatus(): Promise<VoiceStatus | null> {
  try {
    const res = await fetch(`${VOICE_API_BASE}/api/voice/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Synthesize speech from text. Returns an audio URL for playback.
 */
export async function textToSpeech(text: string, language: string = "en"): Promise<string> {
  const res = await fetch(`${VOICE_API_BASE}/api/voice/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS failed: ${err}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Play TTS audio for given text. Returns cleanup function.
 */
export async function playTTS(text: string, language: string = "en"): Promise<() => void> {
  const url = await textToSpeech(text, language);
  const audio = new Audio(url);
  audio.play().catch(() => {});
  return () => {
    audio.pause();
    audio.currentTime = 0;
    URL.revokeObjectURL(url);
  };
}

/**
 * Transcribe audio blob using Whisper STT.
 */
export async function speechToText(audioBlob: Blob, language?: string): Promise<STTResult> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");
  if (language) formData.append("language", language);

  const res = await fetch(`${VOICE_API_BASE}/api/voice/stt`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STT failed: ${err}`);
  }
  return await res.json();
}

/**
 * Record audio from microphone. Returns controls.
 */
export function createAudioRecorder(): {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  cancel: () => void;
  isRecording: () => boolean;
} {
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start(100);
    },
    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
          reject(new Error("Not recording"));
          return;
        }
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          resolve(blob);
        };
        mediaRecorder.stop();
      });
    },
    cancel() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      chunks = [];
    },
    isRecording() {
      return mediaRecorder?.state === "recording";
    },
  };
}
