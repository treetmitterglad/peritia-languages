import { AppState, UserProgress, LanguageCode, FlashcardItem, CompressedSession } from "./types";

const STORAGE_KEY = "peritia_app_state";
const KEY_STORAGE = "peritia_api_key";

// Simple encryption for API key using base64 + reversal (not military grade, but obscures from casual inspection)
function encryptKey(key: string): string {
  const reversed = key.split("").reverse().join("");
  return btoa(reversed);
}

function decryptKey(encrypted: string): string {
  const reversed = atob(encrypted);
  return reversed.split("").reverse().join("");
}

export function saveApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, encryptKey(key));
}

export function getApiKey(): string | null {
  const encrypted = localStorage.getItem(KEY_STORAGE);
  if (!encrypted) return null;
  try {
    return decryptKey(encrypted);
  } catch {
    return null;
  }
}

export function removeApiKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}

export function getAppState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      apiKey: null,
      currentLanguage: null,
      difficulty: "beginner",
      progress: {},
      onboarded: false,
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      apiKey: null,
      currentLanguage: null,
      difficulty: "beginner",
      progress: {},
      onboarded: false,
    };
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save app state:", error);
  }
}

export function getProgress(language: LanguageCode): UserProgress {
  const state = getAppState();
  return (
    state.progress[language] ?? {
      language,
      difficulty: state.difficulty,
      xp: 0,
      streak: 0,
      lastSessionDate: "",
      lessonsCompleted: 0,
      wordsLearned: [],
      flashcardsDue: [],
      sessionHistory: [],
    }
  );
}

export function saveProgress(language: LanguageCode, progress: UserProgress): void {
  try {
    const state = getAppState();
    state.progress[language] = progress;
    saveAppState(state);
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

export function compressContext(progress: UserProgress): string {
  const recentSessions = progress.sessionHistory.slice(-5);
  const wordCount = progress.wordsLearned.length;
  const recentWords = progress.wordsLearned.slice(-20);
  
  return [
    `LVL:${progress.difficulty}`,
    `XP:${progress.xp}`,
    `LESSONS:${progress.lessonsCompleted}`,
    `WORDS_TOTAL:${wordCount}`,
    `RECENT_WORDS:[${recentWords.join(",")}]`,
    `STREAK:${progress.streak}`,
    recentSessions.length > 0
      ? `SESSIONS:[${recentSessions.map(s => `${s.topic}:${s.accuracy}%`).join(",")}]`
      : "SESSIONS:none",
  ].join("|");
}
