
import { generateContent } from "./aiClient";
import { Category, Question, Difficulty, AIModel } from "../types";

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

export const generateQuestion = async (
  category: Category, 
  difficulty: Difficulty, 
  avoidEntities: string[] = [],
  childMode: boolean = false,
  preferredModel: AIModel = AIModel.FLASH
): Promise<Question> => {

  return withRetry(async (modelToUse) => {
    const response = await generateContent({
      model: modelToUse, 
      operation: 'question', params: { category, difficulty, avoidEntities: avoidEntities.slice(-100), childMode },
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

  return withRetry(async (modelToUse) => {
    const response = await generateContent({
      model: modelToUse, 
      operation: 'batch', params: { count },
    });

    const data = JSON.parse(response.text || "{\"questions\": []}");
    return data.questions.map((q: any) => ({
      ...q,
      id: crypto.randomUUID(),
      sourceUrl: `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(q.wikipediaSearchQuery || q.text)}`
    }));
  }, preferredModel);
};

export const evaluateAnswer = async (
  question: Question,
  userAnswer: string,
  preferredModel: AIModel = AIModel.FLASH
): Promise<{ correctnessScore: number; bonusPoints: number; verdict: string }> => {

  return withRetry(async (modelToUse) => {
    const response = await generateContent({
      model: modelToUse,
      operation: 'judge', params: { questionText: question.text, correctAnswer: question.options[question.correctIndex], userAnswer },
    });

    return JSON.parse(response.text || "{}");
  }, preferredModel);
};
