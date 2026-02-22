import { LessonData, LessonExercise, TeachingCard, LanguageCode, SUPPORTED_LANGUAGES, Difficulty, FlashcardItem } from "./types";
import { compressContext, getProgress } from "./storage";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const PRIMARY_MODEL = "mistral-medium-latest";
const VALIDATOR_MODEL = "mistral-medium-latest";

async function callMistral(
  apiKey: string,
  messages: { role: string; content: string }[],
  model: string = PRIMARY_MODEL
): Promise<string> {
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
      model,
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

function cleanJson(raw: string): string {
  return raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
}

// Phase 1: Generate teaching cards (fast, small output)
async function generateTeachingContent(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  topic?: string
): Promise<{ topic: string; introduction: string; teachingCards: TeachingCard[]; newWords: { word: string; translation: string }[] }> {
  const progress = getProgress(language);
  const context = compressContext(progress);
  const langName = getLangName(language);

  const prompt = `You are a ${langName} language tutor for an American English speaker at ${difficulty} level.
Student context: ${context}
${topic ? `Requested topic: ${topic}` : "Choose an appropriate next topic based on their progress."}

Create ONLY the teaching portion of a lesson. Return ONLY valid JSON (no markdown, no code blocks):
{
  "topic": "topic name",
  "introduction": "1-2 sentence intro explaining what the student will learn",
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
  "newWords": [{"word": "target word", "translation": "english meaning"}]
}

Include 4-6 teachingCards that build on each other (simple → complex). Keep text short and mobile-friendly.`;

  const response = await callMistral(apiKey, [
    { role: "system", content: "You are a language teaching AI. Always respond with valid JSON only, no markdown formatting." },
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(cleanJson(response));
  } catch {
    const langName2 = getLangName(language);
    return {
      topic: "Basic Greetings",
      introduction: `Let's learn how to greet people in ${langName2}!`,
      teachingCards: [
        { targetPhrase: "Hola", translation: "Hello", pronunciation: "OH-lah", exampleSentence: "¡Hola! ¿Cómo estás?", exampleTranslation: "Hello! How are you?" },
      ],
      newWords: [{ word: "Hola", translation: "Hello" }],
    };
  }
}

// Phase 2: Generate exercises based on teaching content
async function generateExercises(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  teachingCards: TeachingCard[],
  topic: string
): Promise<LessonExercise[]> {
  const langName = getLangName(language);
  const wordsRef = teachingCards.map(c => `${c.targetPhrase} = ${c.translation}`).join(", ");

  const prompt = `You are a ${langName} language tutor for an American English speaker. A student just learned these words/phrases: ${wordsRef}
Topic: ${topic}, Level: ${difficulty}.

Generate exercises that ONLY test the vocabulary listed above. Return ONLY a JSON array (no markdown):
[
  {
    "type": "multiple_choice",
    "question": "question testing the taught vocabulary",
    "options": ["option1", "option2", "option3", "option4"],
    "correctIndex": 0,
    "hint": "optional hint",
    "explanation": "brief explanation"
  }
]

RULES:
- Generate between 3 and 8 exercises. More if the vocabulary is rich, fewer if simple.
- ONLY test words from the list above. Do NOT introduce new vocabulary.
- Each exercise must have exactly ONE unambiguous correct answer.
- Mix types: multiple_choice, fill_blank (use ___ for blank), word_match.
- For fill_blank, options are possible fills. For word_match, correctIndex is the match.
- 4 options max per exercise. All options must be plausible but distinguishable.
- Questions must be clear and complete — no truncated sentences.
- IMPORTANT: Write ALL questions, hints, and explanations in ENGLISH. Only the answer options for ${langName} vocabulary should be in ${langName}. The student is an English speaker — they need to understand the questions.
- Example good question: "How do you say 'hello' in ${langName}?" or "What does 'Hola' mean in English?"
- Example BAD question: "¿Cómo se dice 'hello'?" — do NOT write questions in ${langName}.`;

  const response = await callMistral(apiKey, [
    { role: "system", content: "You are a language teaching AI. Always respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const exercises: LessonExercise[] = JSON.parse(cleanJson(response));
    return exercises;
  } catch {
    return [];
  }
}

// Validation agent: checks each exercise for quality
async function validateExercise(
  apiKey: string,
  exercise: LessonExercise,
  teachingCards: TeachingCard[],
  language: LanguageCode
): Promise<{ valid: boolean; fixed?: LessonExercise }> {
  const langName = getLangName(language);
  const wordsRef = teachingCards.map(c => `${c.targetPhrase} = ${c.translation}`).join(", ");

  const prompt = `You are a QA validator for a ${langName} language learning app. Evaluate this exercise:

${JSON.stringify(exercise)}

Taught vocabulary: ${wordsRef}

Check ALL of these:
1. The question is complete and makes grammatical sense.
2. There is exactly ONE correct answer at the specified correctIndex.
3. The correct answer is actually correct for ${langName}.
4. All options are plausible but clearly distinguishable.
5. The question only tests the taught vocabulary above.

Return ONLY valid JSON (no markdown):
{"valid": true}
OR if there's a problem, fix it:
{"valid": false, "fixed": <the corrected exercise object with same schema>}
If the exercise is unfixable, return: {"valid": false}`;

  try {
    const response = await callMistral(apiKey, [
      { role: "system", content: "You are a strict QA validator. Respond with valid JSON only." },
      { role: "user", content: prompt },
    ], VALIDATOR_MODEL);

    const result = JSON.parse(cleanJson(response));
    return result;
  } catch {
    // If validation fails, assume exercise is okay
    return { valid: true };
  }
}

// Main export: progressive lesson generation with callbacks
export interface LessonGenerationCallbacks {
  onTeachingReady: (data: {
    topic: string;
    introduction: string;
    teachingCards: TeachingCard[];
    newWords: { word: string; translation: string }[];
  }) => void;
  onExerciseReady: (exercise: LessonExercise, index: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export async function generateLessonProgressive(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  callbacks: LessonGenerationCallbacks,
  topic?: string
): Promise<void> {
  // Phase 1: Teaching content
  let teaching;
  try {
    teaching = await generateTeachingContent(apiKey, language, difficulty, topic);
    if (!teaching.teachingCards || teaching.teachingCards.length === 0) {
      throw new Error("No teaching content generated");
    }
    callbacks.onTeachingReady(teaching);
  } catch (e: any) {
    callbacks.onError(e.message || "Failed to generate teaching content");
    return;
  }

  // Phase 2: Generate exercises
  let exercises: LessonExercise[];
  try {
    exercises = await generateExercises(apiKey, language, difficulty, teaching.teachingCards, teaching.topic);
    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises generated");
    }
  } catch (e: any) {
    callbacks.onError(e.message || "Failed to generate exercises");
    return;
  }

  // Phase 3: Validate each exercise in parallel (batched)
  const validationResults = await Promise.all(
    exercises.map(ex => validateExercise(apiKey, ex, teaching.teachingCards, language))
  );

  let validIndex = 0;
  for (let i = 0; i < exercises.length; i++) {
    const result = validationResults[i];
    if (result.valid) {
      callbacks.onExerciseReady(exercises[i], validIndex++);
    } else if (result.fixed) {
      callbacks.onExerciseReady(result.fixed, validIndex++);
    }
    // Skip exercises that are invalid and unfixable
  }

  if (validIndex === 0) {
    callbacks.onError("All exercises failed validation. Please try again.");
    return;
  }

  callbacks.onComplete();
}

// Legacy synchronous API (kept for flashcards)
export async function generateLesson(
  apiKey: string,
  language: LanguageCode,
  difficulty: Difficulty,
  topic?: string
): Promise<LessonData> {
  return new Promise((resolve, reject) => {
    let lessonData: Partial<LessonData> = { exercises: [] };

    generateLessonProgressive(apiKey, language, difficulty, {
      onTeachingReady: (data) => {
        lessonData.topic = data.topic;
        lessonData.introduction = data.introduction;
        lessonData.teachingCards = data.teachingCards;
        lessonData.newWords = data.newWords;
      },
      onExerciseReady: (exercise) => {
        lessonData.exercises!.push(exercise);
      },
      onComplete: () => {
        resolve(lessonData as LessonData);
      },
      onError: (error) => {
        reject(new Error(error));
      },
    }, topic);
  });
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
    const cleaned = cleanJson(response);
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
