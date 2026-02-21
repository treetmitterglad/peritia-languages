export const SUPPORTED_LANGUAGES = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "zh-s", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "zh-t", name: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface UserProgress {
  language: LanguageCode;
  difficulty: Difficulty;
  xp: number;
  streak: number;
  lastSessionDate: string;
  lessonsCompleted: number;
  wordsLearned: string[];
  flashcardsDue: FlashcardItem[];
  sessionHistory: CompressedSession[];
}

export interface FlashcardItem {
  front: string;
  back: string;
  category: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export interface CompressedSession {
  date: string;
  topic: string;
  wordsIntroduced: string[];
  accuracy: number;
}

export interface LessonExercise {
  type: "multiple_choice" | "word_match" | "fill_blank" | "listen_select";
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
  explanation?: string;
}

export interface TeachingCard {
  targetPhrase: string;
  translation: string;
  pronunciation?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  note?: string;
}

export interface LessonData {
  topic: string;
  introduction: string;
  teachingCards: TeachingCard[];
  exercises: LessonExercise[];
  newWords: { word: string; translation: string }[];
}

export interface AppState {
  apiKey: string | null;
  currentLanguage: LanguageCode | null;
  difficulty: Difficulty;
  progress: Record<string, UserProgress>;
  onboarded: boolean;
}
