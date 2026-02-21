import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { FlashcardItem, LanguageCode, Difficulty, SUPPORTED_LANGUAGES } from "@/lib/types";
import { generateFlashcards } from "@/lib/mistral";
import { getApiKey, getProgress, saveProgress } from "@/lib/storage";
import { Loader2, RotateCcw, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface FlashcardViewProps {
  language: LanguageCode;
  difficulty: Difficulty;
  onBack: () => void;
}

const CATEGORIES = ["Greetings", "Food & Drink", "Travel", "Numbers", "Colors", "Family", "Weather", "Shopping"];

const FlashcardView = ({ language, difficulty, onBack }: FlashcardViewProps) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const langName = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ?? "";

  const loadCards = useCallback(async (cat: string) => {
    setLoading(true);
    setError("");
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("No API key found");
      setLoading(false);
      return;
    }
    try {
      const data = await generateFlashcards(apiKey, language, difficulty, cat);
      if (!data || data.length === 0) {
        throw new Error("No flashcards generated");
      }
      setCards(data);
      setCurrentIdx(0);
      setFlipped(false);
    } catch (e: any) {
      setError(e.message || "Failed to generate flashcards");
    }
    setLoading(false);
  }, [language, difficulty]);

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    loadCards(cat);
  };

  const next = () => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  const prev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setFlipped(false);
    }
  };

  if (!category) {
    return (
      <div className="flex flex-col items-center gap-6 p-6 max-w-md mx-auto min-h-[60vh] justify-center">
        <button onClick={onBack} className="self-start text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Flashcards</h2>
        <p className="text-muted-foreground text-sm">Pick a category for {langName}</p>
        <div className="grid grid-cols-2 gap-3 w-full">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectCategory(cat)}
              className="px-4 py-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all font-medium text-foreground"
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Creating flashcards...</p>
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <p className="text-destructive">{error || "No cards generated"}</p>
        <div className="flex gap-3">
          <button onClick={() => setCategory(null)} className="px-6 py-2 rounded-xl border border-border bg-card text-foreground font-medium">
            Back
          </button>
          <button onClick={() => category && loadCards(category)} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx];
  const isLastCard = currentIdx === cards.length - 1;

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-md mx-auto min-h-[60vh] justify-center">
      <div className="flex items-center justify-between w-full">
        <button onClick={() => setCategory(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Categories
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{currentIdx + 1}/{cards.length}</span>
          {isLastCard && <Sparkles className="w-4 h-4 text-yellow-500" />}
        </div>
      </div>

      <motion.div
        key={currentIdx}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setFlipped(!flipped)}
        className="relative w-full aspect-[3/2] cursor-pointer"
        style={{ perspective: 1000 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={flipped ? "back" : "front"}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center p-6 text-center ${
              flipped
                ? "bg-primary/5 border-primary/30"
                : "bg-card border-border"
            }`}
          >
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
              {flipped ? "English" : langName}
            </p>
            <p className="text-2xl font-display font-bold text-foreground">
              {flipped ? card.back : card.front}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Tap to {flipped ? "see original" : "reveal translation"}
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={prev}
          disabled={currentIdx === 0}
          className="p-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-30 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setFlipped(!flipped)}
          className="p-3 rounded-xl border border-border bg-card hover:bg-secondary transition-all"
        >
          <RotateCcw className="w-5 h-5 text-foreground" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={next}
          disabled={isLastCard}
          className="p-3 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-30 transition-all"
        >
          <ArrowRight className="w-5 h-5 text-foreground" />
        </motion.button>
      </div>
    </div>
  );
};

export default FlashcardView;
