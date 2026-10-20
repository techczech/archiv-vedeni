
import { generateContent } from "./aiClient";
import { Category, Difficulty, Question, AIModel, WorkshopQuestion, EvaluationResult } from "../types";
import { getQuestionBank } from "./storageService";

export const runWorkshopAgent = async (
  category: Category,
  difficulty: Difficulty,
  systemRefinement: string = "",
  positiveExamples: Question[] = []
): Promise<WorkshopQuestion> => {

  // 1. GENERATE (Using Gemini 3 Flash as requested for high-volume batches)
  const genResponse = await generateContent({
    model: AIModel.FLASH, 
    operation: 'workshopQuestion', params: { category, difficulty, refinement: systemRefinement,
      positiveExamples: positiveExamples.slice(-5).map(({ text, options, explanation }) => ({ text, options, explanation })) }
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
  const context = bank.slice(-20).map(q => q.text);
  const uniqResponse = await generateContent({
    model: AIModel.FLASH,
    operation: 'workshopUniqueness', params: { questionText: question.text, context }
  });
  const uniquenessEval: EvaluationResult = JSON.parse(uniqResponse.text || "{}");

  // 3. EVALUATE DISTRACTORS
  const distResponse = await generateContent({
    model: AIModel.FLASH,
    operation: 'workshopDistractors', params: { question: { text: question.text, options: question.options, correctIndex: question.correctIndex } }
  });
  const distractorEval: EvaluationResult = JSON.parse(distResponse.text || "{}");

  // 4. EVALUATE LEVEL
  const levelResponse = await generateContent({
    model: AIModel.FLASH,
    operation: 'workshopLevel', params: { questionText: question.text, difficulty }
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

  const batchResults = batchQuestions.slice(-20).map(h => ({
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
    operation: 'workshopRefinement', params: { batchResults,
      positiveExamples: positiveExamples.slice(-5).map(({ text }) => ({ text })),
      negativeExamples: negativeExamples.slice(-5).map(({ question, feedback }) => ({ question: { text: question.text }, feedback })),
      globalFeedback, currentRefinement }
  });

  return response.text?.trim() || currentRefinement;
};
