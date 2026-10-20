import { Type, type Schema } from '@google/genai';
import { AIModel, Category, Difficulty } from '../types';
import { getGenerationPrompt, getBatchGenerationPrompt, getJudgePrompt } from '../prompts';
import { getCategoryGeneratorPrompt, UNIQUENESS_EVALUATOR_PROMPT, DISTRACTOR_EVALUATOR_PROMPT,
  LEVEL_EVALUATOR_PROMPT, PROMPT_REFINEMENT_PROMPT } from '../prompts/workshopPrompts';

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

const judgeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    correctnessScore: { type: Type.NUMBER },
    bonusPoints: { type: Type.INTEGER },
    verdict: { type: Type.STRING, maxLength: '500' },
  },
  required: ["correctnessScore", "bonusPoints", "verdict"],
};

const refinementSchema: Schema = {
  type: Type.OBJECT,
  properties: { refinement: { type: Type.STRING, maxLength: '1000' } },
  required: ['refinement'],
};

const evaluationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    feedback: { type: Type.STRING },
    passed: { type: Type.BOOLEAN },
  },
  required: ["score", "feedback", "passed"],
};


// Validate unknown JSON before interpolating any game data into fixed templates.
export class InvalidGeneration extends Error {}
function invalid(): never { throw new InvalidGeneration(); }
function object(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !fields.includes(k))) invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) invalid();
  return value;
}
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) invalid();
  return value.map(parse);
}
function choice<T extends string>(value: unknown, values: T[]): T {
  if (!values.includes(value as T)) invalid();
  return value as T;
}
function number(value: unknown, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) invalid();
  return value;
}
const category = (v: unknown) => choice(v, Object.values(Category));
const difficulty = (v: unknown) => choice(v, Object.values(Difficulty));
const questionText = (v: unknown) => text(v, 600);
function options(value: unknown) {
  const result = list(value, 4, v => text(v, 300));
  if (result.length !== 4) invalid();
  return result;
}
function example(value: unknown) {
  const p = object(value, ['text', 'options', 'explanation']);
  return { text: questionText(p.text), options: options(p.options), explanation: text(p.explanation, 1500) };
}
function shortExample(value: unknown) {
  const p = object(value, ['text']); return { text: questionText(p.text) };
}

export function buildQuizGeneration(value: unknown) {
  const r = object(value, ['model', 'operation', 'params']);
  const model = choice(r.model, Object.values(AIModel));
  let contents: string;
  let schema: Schema | undefined;
  let temperature = 0.9;
  switch (r.operation) {
    case 'question': {
      const p = object(r.params, ['category', 'difficulty', 'avoidEntities', 'childMode']);
      if (typeof p.childMode !== 'boolean') invalid();
      contents = getGenerationPrompt(category(p.category), difficulty(p.difficulty), list(p.avoidEntities, 100, v => text(v, 100)), p.childMode);
      schema = questionSchema; break;
    }
    case 'batch': {
      const p = object(r.params, ['count']);
      contents = getBatchGenerationPrompt(number(p.count, 1, 20, true)); schema = batchQuestionSchema; temperature = 1; break;
    }
    case 'judge': {
      const p = object(r.params, ['questionText', 'correctAnswer', 'userAnswer']);
      contents = getJudgePrompt(questionText(p.questionText), text(p.correctAnswer, 300), text(p.userAnswer, 2000));
      schema = judgeSchema; temperature = 0.1; break;
    }
    case 'workshopQuestion': {
      const p = object(r.params, ['category', 'difficulty', 'refinement', 'positiveExamples']);
      contents = getCategoryGeneratorPrompt(category(p.category), difficulty(p.difficulty), text(p.refinement, 1000, true), list(p.positiveExamples, 5, example));
      schema = questionSchema; break;
    }
    case 'workshopUniqueness': {
      const p = object(r.params, ['questionText', 'context']);
      contents = UNIQUENESS_EVALUATOR_PROMPT(questionText(p.questionText), list(p.context, 20, questionText).join('\n'));
      schema = evaluationSchema; break;
    }
    case 'workshopDistractors': {
      const p = object(r.params, ['question']); const q = object(p.question, ['text', 'options', 'correctIndex']);
      contents = DISTRACTOR_EVALUATOR_PROMPT({ text: questionText(q.text), options: options(q.options), correctIndex: number(q.correctIndex, 0, 3, true) });
      schema = evaluationSchema; break;
    }
    case 'workshopLevel': {
      const p = object(r.params, ['questionText', 'difficulty']);
      contents = LEVEL_EVALUATOR_PROMPT({ text: questionText(p.questionText) }, difficulty(p.difficulty)); schema = evaluationSchema; break;
    }
    case 'workshopRefinement': {
      const p = object(r.params, ['batchResults', 'positiveExamples', 'negativeExamples', 'globalFeedback', 'currentRefinement']);
      const results = list(p.batchResults, 20, v => {
        const b = object(v, ['text', 'status', 'evals']); const e = object(b.evals, ['uniq', 'dist', 'level']);
        return { text: questionText(b.text), status: choice(b.status, ['PENDING', 'APPROVED', 'REJECTED']),
          evals: { uniq: number(e.uniq, 0, 10), dist: number(e.dist, 0, 10), level: number(e.level, 0, 10) } };
      });
      const positives = list(p.positiveExamples, 5, shortExample);
      const negatives = list(p.negativeExamples, 5, v => {
        const n = object(v, ['question', 'feedback']); return { question: shortExample(n.question), feedback: text(n.feedback, 500, true) };
      });
      contents = PROMPT_REFINEMENT_PROMPT(results, positives, negatives, text(p.globalFeedback, 1000, true), text(p.currentRefinement, 1000, true));
      schema = refinementSchema; temperature = 0.2;
      break;
    }
    default: invalid();
  }
  // Aggregate cap includes escaped parameters and the fixed instructions.
  if (contents.length > 32000) invalid();
  return { model, contents, config: { responseMimeType: schema ? 'application/json' : 'text/plain',
    ...(schema ? { responseSchema: schema } : {}), temperature, maxOutputTokens: r.operation === 'batch' ? 8192 : r.operation === 'workshopRefinement' ? 1024 : r.operation === 'judge' ? 512 : 2048 } };
}

// Provider schemas guide generation; enforce the bounds again before returning data.
export function validateGenerationOutput(operation: unknown, output: string): void {
  if (operation === 'judge') {
    const result = object(JSON.parse(output), ['correctnessScore', 'bonusPoints', 'verdict']);
    text(result.verdict, 500);
  } else if (operation === 'workshopRefinement') {
    const result = object(JSON.parse(output), ['refinement']);
    text(result.refinement, 1000);
  }
}
