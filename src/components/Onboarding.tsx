import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Difficulty, LanguageCode, SUPPORTED_LANGUAGES } from "@/lib/types";
import ApiKeyInput from "./ApiKeyInput";
import LanguageSelector from "./LanguageSelector";
import { getApiKey } from "@/lib/storage";
import { isVoiceAvailable, startModelSetup, getDownloadProgress, DownloadProgress } from "@/lib/voice";
import { Sparkles, ArrowRight, Cpu, Download, CheckCircle2, AlertCircle, Volume2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingProps {
  onComplete: (language: LanguageCode, difficulty: Difficulty) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; desc: string; emoji: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Start from scratch", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", desc: "I know some basics", emoji: "📚" },
  { value: "advanced", label: "Advanced", desc: "I want to refine my skills", emoji: "🚀" },
];

const ModelSetupStep = ({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) => {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [started, setStarted] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Check if voice backend is even running
    isVoiceAvailable().then((available) => {
      setBackendAvailable(available);
      if (available) {
        // Auto-start setup
        startModelSetup().then((ok) => {
          if (ok) {
            setStarted(true);
            // Poll for progress
            pollRef.current = setInterval(async () => {
              const p = await getDownloadProgress();
              if (p) {
                setProgress(p);
                if (p.phase === "ready" || p.phase === "error") {
                  clearInterval(pollRef.current);
                  if (p.phase === "ready") {
                    setTimeout(onComplete, 1000);
                  }
                }
              }
            }, 500);
          }
        });
      }
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [onComplete]);

  // No voice backend running
  if (backendAvailable === false) {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Volume2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">Voice Features</h2>
          <p className="text-muted-foreground text-sm">
            No voice backend detected. Voice features (TTS/STT) are optional.
            Start the voice backend to enable pronunciation and listening exercises.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono bg-secondary rounded-lg p-2">
            ./start-voice-backend.sh
          </p>
        </div>
        <button
          onClick={onSkip}
          className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
        >
          Continue without voice →
        </button>
      </div>
    );
  }

  // Loading/detecting
  if (backendAvailable === null || !started || !progress) {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Cpu className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">Detecting Hardware</h2>
          <p className="text-muted-foreground">Analyzing your system for optimal model selection...</p>
        </div>
      </div>
    );
  }

  // Error
  if (progress.phase === "error") {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">Setup Failed</h2>
          <p className="text-muted-foreground text-sm">{progress.detail}</p>
        </div>
        <button
          onClick={onSkip}
          className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all"
        >
          Continue without voice →
        </button>
      </div>
    );
  }

  // Ready
  if (progress.phase === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center"
        >
          <CheckCircle2 className="w-8 h-8 text-success" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-foreground">Voice Ready!</h2>
          <p className="text-muted-foreground text-sm">
            {progress.hardware?.device === "cuda"
              ? `GPU: ${progress.hardware.gpu_name}`
              : `CPU mode (${progress.hardware?.ram_gb}GB RAM)`}
            {" · "}Whisper {progress.whisper_model} · Chatterbox {progress.tts_model}
          </p>
        </div>
      </div>
    );
  }

  // Downloading
  const phaseLabel =
    progress.phase === "detecting"
      ? "Detecting hardware..."
      : progress.phase === "downloading_whisper"
      ? "Downloading speech recognition model..."
      : progress.phase === "downloading_tts"
      ? "Downloading text-to-speech model..."
      : "Setting up...";

  return (
    <div className="flex flex-col items-center gap-6 text-center max-w-md w-full">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Download className="w-8 h-8 text-primary animate-bounce" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">Setting Up Voice</h2>
        <p className="text-muted-foreground text-sm">{phaseLabel}</p>
      </div>

      <div className="w-full space-y-2">
        <Progress value={progress.progress} className="h-3" />
        <p className="text-xs text-muted-foreground">{progress.detail}</p>
      </div>

      {progress.hardware && (
        <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 w-full">
          <p>
            <span className="font-semibold">Device:</span> {progress.hardware.device.toUpperCase()}
            {progress.hardware.gpu_name && ` (${progress.hardware.gpu_name})`}
          </p>
          <p><span className="font-semibold">RAM:</span> {progress.hardware.ram_gb}GB</p>
          {progress.whisper_model && (
            <p><span className="font-semibold">Whisper:</span> {progress.whisper_model}</p>
          )}
          {progress.tts_model && (
            <p><span className="font-semibold">TTS:</span> Chatterbox {progress.tts_model}</p>
          )}
        </div>
      )}

      <button
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip — continue without voice
      </button>
    </div>
  );
};

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState<"welcome" | "api_key" | "model_setup" | "language" | "difficulty">(
    getApiKey() ? "welcome" : "welcome"
  );
  const [selectedLang, setSelectedLang] = useState<LanguageCode | null>(null);

  const langName = selectedLang
    ? SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.name
    : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col items-center gap-8 text-center max-w-md"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>

            <div className="space-y-3">
              <h1 className="text-4xl font-display font-bold text-foreground">
                Peritia Languages
              </h1>
              <p className="text-muted-foreground text-lg">
                Learn any language with AI-powered interactive lessons
              </p>
            </div>

            <button
              onClick={() => setStep(getApiKey() ? "model_setup" : "api_key")}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg transition-all hover:opacity-90 active:scale-95"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === "api_key" && (
          <motion.div
            key="api_key"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <ApiKeyInput onKeySet={() => setStep("model_setup")} />
          </motion.div>
        )}

        {step === "model_setup" && (
          <motion.div
            key="model_setup"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <ModelSetupStep
              onComplete={() => setStep("language")}
              onSkip={() => setStep("language")}
            />
          </motion.div>
        )}

        {step === "language" && (
          <motion.div
            key="language"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-lg"
          >
            <LanguageSelector
              onSelect={(code) => {
                setSelectedLang(code);
                setStep("difficulty");
              }}
              selected={selectedLang}
            />
          </motion.div>
        )}

        {step === "difficulty" && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center gap-6 p-6 max-w-md mx-auto w-full"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">
                What's your {langName} level?
              </h2>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {DIFFICULTIES.map((d) => (
                <motion.button
                  key={d.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectedLang && onComplete(selectedLang, d.value)}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all text-left"
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <div>
                    <p className="font-semibold text-foreground">{d.label}</p>
                    <p className="text-sm text-muted-foreground">{d.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => setStep("language")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to languages
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
