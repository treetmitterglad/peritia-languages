import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Difficulty, LanguageCode, SUPPORTED_LANGUAGES } from "@/lib/types";
import ApiKeyInput from "./ApiKeyInput";
import LanguageSelector from "./LanguageSelector";
import { getApiKey } from "@/lib/storage";
import { Sparkles, ArrowRight } from "lucide-react";

interface OnboardingProps {
  onComplete: (language: LanguageCode, difficulty: Difficulty) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; desc: string; emoji: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Start from scratch", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", desc: "I know some basics", emoji: "📚" },
  { value: "advanced", label: "Advanced", desc: "I want to refine my skills", emoji: "🚀" },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState<"welcome" | "api_key" | "language" | "difficulty">(
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
                Lingual
              </h1>
              <p className="text-muted-foreground text-lg">
                Learn any language with AI-powered interactive lessons
              </p>
            </div>

            <button
              onClick={() => setStep(getApiKey() ? "language" : "api_key")}
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
            <ApiKeyInput onKeySet={() => setStep("language")} />
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
