import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LessonData, TeachingCard, LanguageCode, Difficulty, SUPPORTED_LANGUAGES } from "@/lib/types";
import { generateLesson } from "@/lib/mistral";
import { getApiKey, getProgress, saveProgress } from "@/lib/storage";
import { Loader2, Check, X, ArrowRight, Zap, Trophy, BookOpen, Volume2 } from "lucide-react";

interface LessonViewProps {
  language: LanguageCode;
  difficulty: Difficulty;
  onBack: () => void;
}

type LessonPhase = "teaching" | "quiz" | "results";

const TeachingCardView = ({
  card,
  index,
  total,
  onNext,
  onStartQuiz,
  isLast,
}: {
  card: TeachingCard;
  index: number;
  total: number;
  onNext: () => void;
  onStartQuiz: () => void;
  isLast: boolean;
}) => (
  <motion.div
    key={index}
    initial={{ opacity: 0, x: 40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -40 }}
    className="flex flex-col gap-4"
  >
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <p className="text-3xl font-display font-bold text-foreground mb-1">
        {card.targetPhrase}
      </p>
      {card.pronunciation && (
        <p className="text-sm text-muted-foreground italic mb-3">
          /{card.pronunciation}/
        </p>
      )}
      <p className="text-lg text-primary font-semibold">{card.translation}</p>
    </div>

    {card.exampleSentence && (
      <div className="bg-secondary/50 border border-border rounded-xl p-4">
        <p className="text-sm font-semibold text-muted-foreground mb-1">Example</p>
        <p className="text-foreground font-medium">{card.exampleSentence}</p>
        <p className="text-sm text-muted-foreground mt-1">{card.exampleTranslation}</p>
      </div>
    )}

    {card.note && (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="text-sm text-primary font-medium">💡 {card.note}</p>
      </div>
    )}

    <div className="flex gap-3 mt-2">
      <button
        onClick={isLast ? onStartQuiz : onNext}
        className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
      >
        {isLast ? (
          <>
            Start Practice <Zap className="w-5 h-5" />
          </>
        ) : (
          <>
            Next <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  </motion.div>
);

const LessonView = ({ language, difficulty, onBack }: LessonViewProps) => {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<LessonPhase>("teaching");
  const [teachIdx, setTeachIdx] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const langName = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ?? "";

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError("");
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("No API key found");
      setLoading(false);
      return;
    }
    try {
      const data = await generateLesson(apiKey, language, difficulty);
      setLesson(data);
      setPhase("teaching");
      setTeachIdx(0);
      setCurrentIdx(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
    } catch (e: any) {
      setError(e.message || "Failed to generate lesson");
    }
    setLoading(false);
  }, [language, difficulty]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const exercise = lesson?.exercises[currentIdx];
  const isCorrect = selected === exercise?.correctIndex;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === exercise?.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!lesson) return;
    if (currentIdx < lesson.exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase("results");
      const progress = getProgress(language);
      progress.lessonsCompleted += 1;
      progress.xp += score * 10;
      const today = new Date().toISOString().split("T")[0];
      if (progress.lastSessionDate !== today) {
        progress.streak += 1;
      }
      progress.lastSessionDate = today;
      if (lesson.newWords) {
        progress.wordsLearned = [
          ...new Set([...progress.wordsLearned, ...lesson.newWords.map((w) => w.word)]),
        ];
      }
      progress.sessionHistory.push({
        date: today,
        topic: lesson.topic,
        wordsIntroduced: lesson.newWords?.map((w) => w.word) ?? [],
        accuracy: Math.round((score / lesson.exercises.length) * 100),
      });
      saveProgress(language, progress);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Generating your {langName} lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <p className="text-destructive">{error}</p>
        <button onClick={loadLesson} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (!lesson) return null;

  const teachingCards = lesson.teachingCards ?? [];
  const totalSteps = teachingCards.length + lesson.exercises.length;
  const currentStep = phase === "teaching" ? teachIdx : teachingCards.length + currentIdx;
  const progressPct = (currentStep / totalSteps) * 100;

  // — TEACHING PHASE —
  if (phase === "teaching") {
    const card = teachingCards[teachIdx];
    if (!card) {
      setPhase("quiz");
      return null;
    }

    return (
      <div className="flex flex-col min-h-[80vh] p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">✕</button>
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
          </div>
          <span className="text-sm text-muted-foreground font-medium">{teachIdx + 1}/{teachingCards.length}</span>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{lesson.topic}</span>
          <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Learn
          </span>
        </div>

        {teachIdx === 0 && lesson.introduction && (
          <p className="text-muted-foreground text-sm mb-4">{lesson.introduction}</p>
        )}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            <TeachingCardView
              key={teachIdx}
              card={card}
              index={teachIdx}
              total={teachingCards.length}
              onNext={() => setTeachIdx((i) => i + 1)}
              onStartQuiz={() => setPhase("quiz")}
              isLast={teachIdx === teachingCards.length - 1}
            />
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // — RESULTS PHASE —
  if (phase === "results") {
    const pct = Math.round((score / lesson.exercises.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6"
      >
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.6 }} className="w-20 h-20 rounded-3xl bg-success/10 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-success" />
        </motion.div>
        <h2 className="text-3xl font-display font-bold text-foreground">Lesson Complete!</h2>
        <div className="flex items-center gap-4 text-lg">
          <span className="text-foreground font-semibold">{pct}% accuracy</span>
          <span className="text-muted-foreground">•</span>
          <span className="flex items-center gap-1 text-primary font-semibold">
            <Zap className="w-5 h-5" /> +{score * 10} XP
          </span>
        </div>
        {lesson.newWords && lesson.newWords.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 w-full max-w-sm">
            <p className="text-sm font-semibold text-foreground mb-2">Words learned:</p>
            <div className="flex flex-wrap gap-2">
              {lesson.newWords.map((w) => (
                <span key={w.word} className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-sm">
                  {w.word} = {w.translation}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onBack} className="px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">Home</button>
          <button onClick={loadLesson} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all">Next Lesson →</button>
        </div>
      </motion.div>
    );
  }

  // — QUIZ PHASE —
  if (!exercise) return null;

  return (
    <div className="flex flex-col min-h-[80vh] p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">✕</button>
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
        </div>
        <span className="text-sm text-muted-foreground font-medium">{currentIdx + 1}/{lesson.exercises.length}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{lesson.topic}</span>
        <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1">
          <Zap className="w-3 h-3" /> Practice
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex-1">
          <h3 className="text-xl font-display font-bold text-foreground mb-6">{exercise.question}</h3>

          {exercise.hint && !answered && (
            <p className="text-sm text-muted-foreground mb-4 italic">💡 {exercise.hint}</p>
          )}

          <div className="flex flex-col gap-3">
            {exercise.options.map((opt, i) => {
              let optClass = "border-border bg-card hover:border-primary/40";
              if (answered) {
                if (i === exercise.correctIndex) optClass = "border-success bg-success/10";
                else if (i === selected && !isCorrect) optClass = "border-destructive bg-destructive/10";
                else optClass = "border-border bg-card opacity-50";
              } else if (i === selected) {
                optClass = "border-primary bg-primary/5";
              }

              return (
                <motion.button
                  key={i}
                  whileTap={!answered ? { scale: 0.97 } : {}}
                  onClick={() => handleSelect(i)}
                  className={`relative px-5 py-4 rounded-xl border-2 text-left transition-all ${optClass}`}
                >
                  <span className="text-foreground font-medium">{opt}</span>
                  {answered && i === exercise.correctIndex && (
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                  )}
                  {answered && i === selected && !isCorrect && i !== exercise.correctIndex && (
                    <X className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {answered && exercise.explanation && (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-4 rounded-xl bg-secondary text-secondary-foreground text-sm">
              {exercise.explanation}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {answered && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pb-4">
            <button
              onClick={handleNext}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                isCorrect ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {currentIdx < lesson.exercises.length - 1 ? (
                <>Continue <ArrowRight className="w-5 h-5" /></>
              ) : (
                "See Results"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonView;
