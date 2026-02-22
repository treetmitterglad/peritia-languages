import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LessonData, TeachingCard, LessonExercise, LanguageCode, Difficulty, SUPPORTED_LANGUAGES } from "@/lib/types";
import { generateLessonProgressive } from "@/lib/mistral";
import { getApiKey, getProgress, saveProgress } from "@/lib/storage";
import { playSound } from "@/lib/sounds";
import { Loader2, Check, X, ArrowRight, Zap, Trophy, BookOpen, Sparkles, Star } from "lucide-react";

interface LessonViewProps {
  language: LanguageCode;
  difficulty: Difficulty;
  onBack: () => void;
}

type LessonPhase = "loading" | "teaching" | "quiz" | "results";

const TeachingCardView = ({
  card,
  index,
  total,
  onNext,
  onStartQuiz,
  isLast,
  quizReady,
}: {
  card: TeachingCard;
  index: number;
  total: number;
  onNext: () => void;
  onStartQuiz: () => void;
  isLast: boolean;
  quizReady: boolean;
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
      {isLast ? (
        <button
          onClick={onStartQuiz}
          disabled={!quizReady}
          className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
        >
          {quizReady ? (
            <>Start Practice <Zap className="w-5 h-5" /></>
          ) : (
            <><Loader2 className="w-5 h-5 animate-spin" /> Preparing exercises...</>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          Next <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  </motion.div>
);

const LessonView = ({ language, difficulty, onBack }: LessonViewProps) => {
  const [phase, setPhase] = useState<LessonPhase>("loading");
  const [error, setError] = useState("");

  // Teaching state
  const [topic, setTopic] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [teachingCards, setTeachingCards] = useState<TeachingCard[]>([]);
  const [newWords, setNewWords] = useState<{ word: string; translation: string }[]>([]);
  const [teachIdx, setTeachIdx] = useState(0);

  // Exercise state
  const [exercises, setExercises] = useState<LessonExercise[]>([]);
  const [exercisesReady, setExercisesReady] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const langName = SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ?? "";

  const loadLesson = useCallback(async () => {
    setPhase("loading");
    setError("");
    setTeachingCards([]);
    setExercises([]);
    setExercisesReady(false);
    setTeachIdx(0);
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);

    const apiKey = getApiKey();
    if (!apiKey) {
      setError("No API key found. Please add your API key in settings.");
      return;
    }

    await generateLessonProgressive(apiKey, language, difficulty, {
      onTeachingReady: (data) => {
        setTopic(data.topic);
        setIntroduction(data.introduction);
        setTeachingCards(data.teachingCards);
        setNewWords(data.newWords);
        setPhase("teaching");
      },
      onExerciseReady: (exercise, _index) => {
        setExercises(prev => [...prev, exercise]);
      },
      onComplete: () => {
        setExercisesReady(true);
      },
      onError: (err) => {
        setError(err);
      },
    });
  }, [language, difficulty]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const exercise = exercises[currentIdx];
  const isCorrect = selected === exercise?.correctIndex;

  const handleSelect = (idx: number) => {
    if (answered || !exercise) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === exercise.correctIndex) {
      setScore((s) => s + 1);
      playSound("correct");
    } else {
      playSound("fail");
    }
  };

  const handleNext = () => {
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      playSound("finished");
      setPhase("results");
      const progress = getProgress(language);
      progress.lessonsCompleted += 1;
      const earnedXP = score * 10;
      progress.xp += earnedXP;
      const today = new Date().toISOString().split("T")[0];
      if (progress.lastSessionDate !== today) {
        progress.streak += 1;
      }
      progress.lastSessionDate = today;
      if (newWords.length > 0) {
        progress.wordsLearned = [
          ...new Set([...progress.wordsLearned, ...newWords.map((w) => w.word)]),
        ];
      }
      progress.sessionHistory.push({
        date: today,
        topic,
        wordsIntroduced: newWords.map((w) => w.word),
        accuracy: Math.round((score / exercises.length) * 100),
      });
      saveProgress(language, progress);
    }
  };

  // — LOADING PHASE —
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Generating your {langName} lesson...</p>
      </div>
    );
  }

  if (error && phase !== "teaching") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <p className="text-destructive">{error}</p>
        <button onClick={loadLesson} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium">
          Retry
        </button>
      </div>
    );
  }

  const totalSteps = teachingCards.length + exercises.length;
  const currentStep = phase === "teaching" ? teachIdx : teachingCards.length + currentIdx;
  const progressPct = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // — TEACHING PHASE —
  if (phase === "teaching") {
    const card = teachingCards[teachIdx];
    if (!card) {
      if (exercisesReady && exercises.length > 0) {
        setPhase("quiz");
      }
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
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{topic}</span>
          <span className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Learn
          </span>
          {!exercisesReady && (
            <span className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Validating
            </span>
          )}
        </div>

        {teachIdx === 0 && introduction && (
          <p className="text-muted-foreground text-sm mb-4">{introduction}</p>
        )}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            <TeachingCardView
              key={teachIdx}
              card={card}
              index={teachIdx}
              total={teachingCards.length}
              onNext={() => setTeachIdx((i) => i + 1)}
              onStartQuiz={() => {
                if (exercisesReady && exercises.length > 0) setPhase("quiz");
              }}
              isLast={teachIdx === teachingCards.length - 1}
              quizReady={exercisesReady && exercises.length > 0}
            />
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // — RESULTS PHASE —
  if (phase === "results") {
    const pct = Math.round((score / exercises.length) * 100);
    const isPerfect = pct === 100;
    const isGreat = pct >= 80;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 relative overflow-hidden"
      >
        {isPerfect && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  y: [-20, -120],
                  scale: [0, 1.5, 0.5],
                  x: [0, (Math.random() - 0.5) * 200]
                }}
                transition={{ duration: 1.5, delay: i * 0.1 }}
                className="absolute top-1/2 left-1/2"
              >
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
          </>
        )}
        
        <motion.div 
          animate={{ 
            rotate: isPerfect ? [0, 10, -10, 10, 0] : [0, 10, -10, 0],
            scale: isPerfect ? [1, 1.1, 1] : [1]
          }} 
          transition={{ duration: 0.6 }} 
          className={`w-20 h-20 rounded-3xl flex items-center justify-center ${
            isPerfect ? "bg-yellow-500/20" : isGreat ? "bg-success/10" : "bg-primary/10"
          }`}
        >
          {isPerfect ? (
            <Sparkles className="w-10 h-10 text-yellow-500" />
          ) : (
            <Trophy className={`w-10 h-10 ${isGreat ? "text-success" : "text-primary"}`} />
          )}
        </motion.div>
        
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            {isPerfect ? "Perfect! 🎉" : isGreat ? "Great Job!" : "Lesson Complete!"}
          </h2>
          {isPerfect && (
            <p className="text-sm text-muted-foreground">Flawless performance!</p>
          )}
        </div>
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="flex items-center gap-4 text-lg"
        >
          <span className="text-foreground font-semibold">{pct}% accuracy</span>
          <span className="text-muted-foreground">•</span>
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-1 text-primary font-semibold"
          >
            <Zap className="w-5 h-5" /> +{score * 10} XP
          </motion.span>
        </motion.div>
        
        {newWords.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card border border-border rounded-xl p-4 w-full max-w-sm"
          >
            <p className="text-sm font-semibold text-foreground mb-2">Words learned:</p>
            <div className="flex flex-wrap gap-2">
              {newWords.map((w, i) => (
                <motion.span 
                  key={w.word}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                  className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-sm"
                >
                  {w.word} = {w.translation}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3"
        >
          <button onClick={onBack} className="px-6 py-3 rounded-xl border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors">Home</button>
          <button onClick={loadLesson} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all">Next Lesson →</button>
        </motion.div>
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
        <span className="text-sm text-muted-foreground font-medium">{currentIdx + 1}/{exercises.length}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{topic}</span>
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
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={!answered ? { scale: 0.97 } : {}}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`relative px-5 py-4 rounded-xl border-2 text-left transition-all ${optClass} disabled:cursor-not-allowed`}
                >
                  <span className="text-foreground font-medium">{opt}</span>
                  {answered && i === exercise.correctIndex && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <Check className="w-5 h-5 text-success" />
                    </motion.div>
                  )}
                  {answered && i === selected && !isCorrect && i !== exercise.correctIndex && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.3, 1] }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-5 h-5 text-destructive" />
                    </motion.div>
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 pb-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNext}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                isCorrect ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
              }`}
            >
              {currentIdx < exercises.length - 1 ? (
                <>Continue <ArrowRight className="w-5 h-5" /></>
              ) : (
                <>See Results <Trophy className="w-5 h-5" /></>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonView;
