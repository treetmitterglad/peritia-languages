import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LanguageCode, Difficulty, SUPPORTED_LANGUAGES } from "@/lib/types";
import { getProgress, getApiKey, getAppState, saveAppState, removeApiKey } from "@/lib/storage";
import LessonView from "./LessonView";
import FlashcardView from "./FlashcardView";
import LanguageSelector from "./LanguageSelector";
import { BookOpen, Layers, BarChart3, Zap, Flame, Settings, ChevronDown, Key, Moon, Sun } from "lucide-react";

interface DashboardProps {
  language: LanguageCode;
  difficulty: Difficulty;
  onChangeLanguage: () => void;
  onLogout: () => void;
}

type View = "home" | "lesson" | "flashcards" | "stats" | "language_switch";

const Dashboard = ({ language, difficulty, onChangeLanguage, onLogout }: DashboardProps) => {
  const [view, setView] = useState<View>("home");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const progress = getProgress(language);
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === language);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("peritia_theme", next ? "dark" : "light");
  };

  if (view === "lesson") {
    return <LessonView language={language} difficulty={difficulty} onBack={() => setView("home")} />;
  }

  if (view === "flashcards") {
    return <FlashcardView language={language} difficulty={difficulty} onBack={() => setView("home")} />;
  }

  if (view === "language_switch") {
    return (
      <div className="min-h-screen bg-background p-4">
        <LanguageSelector
          onSelect={(code) => {
            const state = getAppState();
            state.currentLanguage = code;
            saveAppState(state);
            window.location.reload();
          }}
          selected={language}
        />
      </div>
    );
  }

  if (view === "stats") {
    return (
      <div className="min-h-screen bg-background p-6 max-w-lg mx-auto">
        <button onClick={() => setView("home")} className="text-sm text-muted-foreground hover:text-foreground mb-6">
          ← Back
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">Your Progress</h2>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total XP</p>
            <p className="text-3xl font-display font-bold text-primary">{progress.xp}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Words Learned</p>
            <p className="text-3xl font-display font-bold text-foreground">{progress.wordsLearned.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Lessons Completed</p>
            <p className="text-3xl font-display font-bold text-foreground">{progress.lessonsCompleted}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Current Streak</p>
            <p className="text-3xl font-display font-bold text-streak">{progress.streak} 🔥</p>
          </div>
          {progress.sessionHistory.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-3">Recent Sessions</p>
              <div className="space-y-2">
                {progress.sessionHistory.slice(-5).reverse().map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{s.topic}</span>
                    <span className="text-muted-foreground">{s.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 space-y-3">
          <button
            onClick={() => {
              removeApiKey();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all text-sm"
          >
            <Key className="w-4 h-4" /> Remove API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setView("language_switch")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-xl">{lang?.flag}</span>
              <span className="font-medium">{lang?.name}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-display font-bold text-foreground mt-1">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}!
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
            </button>
            <button
              onClick={() => setView("stats")}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 flex gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">{progress.xp} XP</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-streak/10">
          <Flame className="w-4 h-4 text-streak" />
          <span className="text-sm font-semibold text-streak">{progress.streak} day streak</span>
        </div>
      </div>

      {/* Main actions */}
      <div className="p-6 space-y-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setView("lesson")}
          className="w-full p-6 rounded-2xl bg-primary text-primary-foreground text-left transition-all hover:opacity-95"
        >
          <BookOpen className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="text-xl font-display font-bold">Start a Lesson</h3>
          <p className="text-sm opacity-80 mt-1">AI-generated interactive exercises</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setView("flashcards")}
          className="w-full p-6 rounded-2xl bg-card border border-border text-left transition-all hover:border-primary/30"
        >
          <Layers className="w-8 h-8 mb-3 text-accent" />
          <h3 className="text-xl font-display font-bold text-foreground">Flashcards</h3>
          <p className="text-sm text-muted-foreground mt-1">Review vocabulary by category</p>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setView("stats")}
          className="w-full p-6 rounded-2xl bg-card border border-border text-left transition-all hover:border-primary/30"
        >
          <BarChart3 className="w-8 h-8 mb-3 text-muted-foreground" />
          <h3 className="text-xl font-display font-bold text-foreground">Progress</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {progress.wordsLearned.length} words • {progress.lessonsCompleted} lessons
          </p>
        </motion.button>
      </div>
    </div>
  );
};

export default Dashboard;
