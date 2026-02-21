import { LessonData, LessonExercise, LanguageCode, SUPPORTED_LANGUAGES, Difficulty, FlashcardItem } from "./types";
import { compressContext, getProgress } from "./storage";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

async function callMistral(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Invalid API key");
  }

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
    if (res.status === 401) {
      throw new Error("Invalid API key. Please check your Mistral API key.");
    }
    if (res.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    const err = await res.text();
    throw new Error(`API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response from API");
  }
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

Create a structured lesson that TEACHES first, then tests. Return ONLY valid JSON (no markdown, no code blocks):
{
  "topic": "topic name",
  "introduction": "1-2 sentence intro explaining what the student will learn and why it's useful",
  "teachingCards": [
    {
      "targetPhrase": "word or phrase in ${langName}",
      "translation": "English meaning",
      "pronunciation": "approximate pronunciation guide for English speakers",
      "exampleSentence": "a simple sentence using this word in ${langName}",
      "exampleTranslation": "English translation of the example",
      "note": "optional grammar tip, cultural note, or memory trick"
    }
  ],
  "exercises": [
    {
      "type": "multiple_choice",
      "question": "question that tests what was just taught",
      "options": ["option1", "option2", "option3", "option4"],
      "correctIndex": 0,
      "hint": "optional hint referencing the teaching",
      "explanation": "brief explanation connecting back to what was taught"
    }
  ],
  "newWords": [{"word": "target word", "translation": "english meaning"}]
}

IMPORTANT RULES:
- Include 4-6 teachingCards that build on each other (simple → complex).
- Then 5 exercises that ONLY test vocabulary/concepts from the teachingCards above.
- Exercises should directly reference what was taught, not random trivia.
- Mix exercise types: multiple_choice, fill_blank (use ___ for blank), word_match.
- For fill_blank, options are possible fills. For word_match, correctIndex is the match.
- Keep text short and mobile-friendly. 4 options max per exercise.`;

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
      introduction: `Let's learn how to greet people in ${langName}!`,
      teachingCards: [
        { targetPhrase: "Hola", translation: "Hello", pronunciation: "OH-lah", exampleSentence: "¡Hola! ¿Cómo estás?", exampleTranslation: "Hello! How are you?" },
      ],
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
