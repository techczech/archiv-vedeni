
import type { Schema } from "@google/genai";
import { generateContent, SchemaType as Type } from "./aiClient";
import { Category, Difficulty, Question, AIModel, WorkshopQuestion, EvaluationResult } from "../types";
import { 
  getCategoryGeneratorPrompt, 
  UNIQUENESS_EVALUATOR_PROMPT, 
  DISTRACTOR_EVALUATOR_PROMPT, 
  LEVEL_EVALUATOR_PROMPT,
  PROMPT_REFINEMENT_PROMPT 
} from "../prompts/workshopPrompts";
import { getQuestionBank } from "./storageService";

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    feedback: { type: Type.STRING },
    passed: { type: Type.BOOLEAN },
  },
  required: ["score", "feedback", "passed"],
};

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
  },
  required: ["text", "options", "correctIndex", "explanation", "hint", "keyEntity", "wikipediaSearchQuery"],
};

export const runWorkshopAgent = async (
  category: Category,
  difficulty: Difficulty,
  systemRefinement: string = "",
  positiveExamples: Question[] = []
): Promise<WorkshopQuestion> => {

  // 1. GENERATE (Using Gemini 3 Flash as requested for high-volume batches)
  const genPrompt = getCategoryGeneratorPrompt(category, difficulty, systemRefinement, positiveExamples);
  const genResponse = await generateContent({
    model: AIModel.FLASH, 
    contents: genPrompt,
    config: { responseMimeType: "application/json", responseSchema: questionSchema }
  });
  const rawQ = JSON.parse(genResponse.text || "{}");
  const question: Question = {
    ...rawQ,
    id: crypto.randomUUID(),
    category,
    difficulty,
    sourceUrl: `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(rawQ.wikipediaSearchQuery || rawQ.text)}`
  };

  // 2. EVALUATE UNIQUENESS
  const bank = getQuestionBank();
  const context = bank.slice(-20).map(q => q.text).join("\n");
  const uniqResponse = await generateContent({
    model: AIModel.FLASH,
    contents: UNIQUENESS_EVALUATOR_PROMPT(question.text, context),
    config: { responseMimeType: "application/json", responseSchema: evaluationSchema }
  });
  const uniquenessEval: EvaluationResult = JSON.parse(uniqResponse.text || "{}");

  // 3. EVALUATE DISTRACTORS
  const distResponse = await generateContent({
    model: AIModel.FLASH,
    contents: DISTRACTOR_EVALUATOR_PROMPT(question),
    config: { responseMimeType: "application/json", responseSchema: evaluationSchema }
  });
  const distractorEval: EvaluationResult = JSON.parse(distResponse.text || "{}");

  // 4. EVALUATE LEVEL
  const levelResponse = await generateContent({
    model: AIModel.FLASH,
    contents: LEVEL_EVALUATOR_PROMPT(question, difficulty),
    config: { responseMimeType: "application/json", responseSchema: evaluationSchema }
  });
  const levelEval: EvaluationResult = JSON.parse(levelResponse.text || "{}");

  const overallPassed = uniquenessEval.passed && distractorEval.passed && levelEval.passed;

  return {
    question,
    uniquenessEval,
    distractorEval,
    levelEval,
    status: overallPassed ? 'PENDING' : 'PENDING' 
  };
};

export const refineWorkshopPrompt = async (
  batchQuestions: WorkshopQuestion[],
  positiveExamples: Question[],
  negativeExamples: { question: Question; feedback: string }[],
  globalFeedback: string,
  currentRefinement: string
): Promise<string> => {

  const batchResults = batchQuestions.map(h => ({
    text: h.question.text,
    status: h.status,
    evals: {
      uniq: h.uniquenessEval.score,
      dist: h.distractorEval.score,
      level: h.levelEval.score
    }
  }));

  const response = await generateContent({
    model: AIModel.FLASH, // Flash is sufficient for refinement summary
    contents: PROMPT_REFINEMENT_PROMPT(batchResults, positiveExamples, negativeExamples, globalFeedback, currentRefinement)
  });

  return response.text?.trim() || currentRefinement;
};
