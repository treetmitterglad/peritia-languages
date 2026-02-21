import { LessonData, LessonExercise, LanguageCode, SUPPORTED_LANGUAGES, Difficulty, FlashcardItem } from "./types";
import { compressContext, getProgress } from "./storage";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

async function callMistral(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function getLangName(code: LanguageCode): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export async function generateLesson(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  topic?: string
): Promise<LessonData> {
  const progress = getProgress(language);
  const context = compressContext(progress);
  const langName = getLangName(language);

  const prompt = `You are a ${langName} language tutor for an American English speaker at ${difficulty} level.
Student context: ${context}
${topic ? `Requested topic: ${topic}` : "Choose an appropriate next topic based on their progress."}

Generate a lesson with exactly 5 exercises. Return ONLY valid JSON (no markdown, no code blocks):
{
  "topic": "topic name",
  "exercises": [
    {
      "type": "multiple_choice",
      "question": "What does 'X' mean in English?",
      "options": ["option1", "option2", "option3", "option4"],
      "correctIndex": 0,
      "hint": "optional hint",
      "explanation": "brief explanation"
    }
  ],
  "newWords": [{"word": "target word", "translation": "english meaning"}]
}

Mix exercise types: multiple_choice (translate word/phrase), word_match (match pairs), fill_blank (complete the sentence).
For fill_blank, put ___ where the blank goes and options are possible fills.
For word_match, question describes the task, options are the items to consider, correctIndex is the matching one.
Keep it mobile-friendly: short text, 4 options max. Make it progressively challenging.`;

  const response = await callMistral(apiKey, [
    { role: "system", content: "You are a language teaching AI. Always respond with valid JSON only, no markdown formatting." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback lesson
    return {
      topic: "Basic Greetings",
      exercises: [
        {
          type: "multiple_choice",
          question: `How do you say "Hello" in ${langName}?`,
          options: ["Hola", "Adiós", "Gracias", "Por favor"],
          correctIndex: 0,
          explanation: `"Hola" is the standard greeting in ${langName}.`,
        },
      ],
      newWords: [{ word: "Hola", translation: "Hello" }],
    };
  }
}

export async function generateFlashcards(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  category: string
): Promise<FlashcardItem[]> {
  const langName = getLangName(language);

  const prompt = `Generate 10 flashcard pairs for learning ${langName} at ${difficulty} level, category: ${category}.
Return ONLY valid JSON array (no markdown):
[{"front":"target language word/phrase","back":"English translation","category":"${category}"}]`;

  const response = await callMistral(apiKey, [
    { role: "system", content: "Respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const cards = JSON.parse(cleaned);
    return cards.map((c: any) => ({
      ...c,
      nextReview: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    }));
  } catch {
    return [];
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await callMistral(apiKey, [
      { role: "user", content: "Say 'ok'" },
    ]);
    return true;
  } catch {
    return false;
  }
}
