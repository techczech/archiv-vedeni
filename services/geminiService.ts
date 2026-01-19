
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Category, Question, Difficulty, AIModel } from "../types";
import { getGenerationPrompt, getBatchGenerationPrompt, getJudgePrompt } from "../prompts";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: (currentModel: AIModel) => Promise<T>, initialModel: AIModel, maxRetries = 3): Promise<T> {
  let delay = 2000;
  let currentModel = initialModel;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn(currentModel);
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('429');
      
      if (isRateLimit && i < maxRetries - 1) {
        if (currentModel !== AIModel.LITE) {
          console.warn(`Rate limit hit on ${currentModel}. Falling back to LITE model...`);
          currentModel = AIModel.LITE;
        }
        
        console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Maximální počet pokusů vyčerpán. Knihovna Archivu je momentálně přetížena.");
}

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctIndex: { type: Type.INTEGER },
    explanation: { type: Type.STRING },
    hint: { type: Type.STRING },
    keyEntity: { type: Type.STRING },
    wikipediaSearchQuery: { type: Type.STRING },
    category: { type: Type.STRING },
    difficulty: { type: Type.STRING }
  },
  required: ["text", "options", "correctIndex", "explanation", "hint", "keyEntity", "wikipediaSearchQuery", "category", "difficulty"],
};

const batchQuestionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: questionSchema
    }
  },
  required: ["questions"]
};

export const generateQuestion = async (
  category: Category, 
  difficulty: Difficulty, 
  avoidEntities: string[] = [],
  childMode: boolean = false,
  preferredModel: AIModel = AIModel.FLASH
): Promise<Question> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chybí API klíč.");

  return withRetry(async (modelToUse) => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = getGenerationPrompt(category, difficulty, avoidEntities, childMode);

    const response = await ai.models.generateContent({
      model: modelToUse, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.9,
      },
    });

    const data = JSON.parse(response.text || "{}");
    let sourceUrl = `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(data.wikipediaSearchQuery || data.text)}`;

    return {
      id: crypto.randomUUID(),
      category, 
      difficulty, 
      text: data.text, 
      options: data.options,
      correctIndex: data.correctIndex, 
      explanation: data.explanation, 
      hint: data.hint,
      sourceUrl, 
      keyEntity: data.keyEntity,
      wikipediaSearchQuery: data.wikipediaSearchQuery
    };
  }, preferredModel);
};

export const generateBatchQuestions = async (
  count: number = 10,
  preferredModel: AIModel = AIModel.FLASH
): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chybí API klíč.");

  return withRetry(async (modelToUse) => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = getBatchGenerationPrompt(count);

    const response = await ai.models.generateContent({
      model: modelToUse, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: batchQuestionSchema,
        temperature: 1.0,
      },
    });

    const data = JSON.parse(response.text || "{\"questions\": []}");
    return data.questions.map((q: any) => ({
      ...q,
      id: crypto.randomUUID(),
      sourceUrl: `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(q.wikipediaSearchQuery || q.text)}`
    }));
  }, preferredModel);
};

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    correctnessScore: { type: Type.NUMBER },
    bonusPoints: { type: Type.INTEGER },
    verdict: { type: Type.STRING },
  },
  required: ["correctnessScore", "bonusPoints", "verdict"],
};

export const evaluateAnswer = async (
  question: Question,
  userAnswer: string,
  preferredModel: AIModel = AIModel.FLASH
): Promise<{ correctnessScore: number; bonusPoints: number; verdict: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Chybí API klíč.");

  return withRetry(async (modelToUse) => {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = getJudgePrompt(question.text, question.options[question.correctIndex], userAnswer);

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || "{}");
  }, preferredModel);
};
