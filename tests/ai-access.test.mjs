import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAIHandler } from '../server/aiHandler.ts';
import { requestAI } from '../services/aiClient.ts';
const body = { action: 'speak', text: 'Test', language: 'en' };
const req = (data = body, code = 'test-placeholder', ip = '192.0.2.1') => new Request('https://quiz.example/api/ai', {
  method: 'POST', headers: { origin: 'https://quiz.example', 'content-type': 'application/json',
    ...(code === undefined ? {} : { 'x-app-access': code }), 'x-forwarded-for': ip }, body: JSON.stringify(data)
});
const provider = async () => new Response(new Uint8Array([1,2]));
for (const code of ['', 'wrong-placeholder', 'test-placeholde', 'test-placeholder-extra', 'chybné']) test(`invalid access (${code.length} chars) makes zero provider calls`, async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder', ALLOW_OPEN_AI_ENDPOINT: '1' }, async () => { calls++; return provider(); });
  assert.equal((await handler(req(body, code))).status, 401); assert.equal(calls, 0);
});
test('missing access header makes zero provider calls', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  const request = req(); request.headers.delete('x-app-access');
  assert.equal((await handler(request)).status, 401); assert.equal(calls, 0);
});
test('correct access reaches provider', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  assert.equal((await handler(req())).status, 200); assert.equal(calls, 1);
});
for (const flag of [undefined, '', '0', 'true', '1']) test(`unset access code only opens with explicit flag ${flag}`, async () => {
  let calls = 0;
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder', ALLOW_OPEN_AI_ENDPOINT: flag }, async () => { calls++; return provider(); });
  assert.equal((await handler(req())).status, flag === '1' ? 200 : 401); assert.equal(calls, flag === '1' ? 1 : 0);
});
test('minute token bucket uses first forwarded IP, refills and separates clients', async t => {
  let now = 0, calls = 0; t.mock.method(Date, 'now', () => now);
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  for (let i = 0; i < 30; i++) assert.equal((await handler(req(body, 'test-placeholder', `192.0.2.1, 198.51.100.${i}`))).status, 200);
  assert.equal((await handler(req())).status, 429); assert.equal(calls, 30);
  assert.equal((await handler(req(body, 'test-placeholder', '192.0.2.2'))).status, 200);
  now = 2000; assert.equal((await handler(req())).status, 200);
});
test('hourly bucket limits sustained traffic below minute capacity', async t => {
  let now = 0; t.mock.method(Date, 'now', () => now);
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }, provider);
  for (let i = 0; i < 359; i++) { assert.equal((await handler(req())).status, 200); now += 2000; }
  assert.equal((await handler(req())).status, 429);
  now += 3_600_000; assert.equal((await handler(req())).status, 200);
});
test('caps and unknown actions reject without provider calls', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  for (const data of [{ ...body, text: 'a'.repeat(601) }, { action: 'unknown' },
    { action: 'transcribe', audio: Buffer.alloc(2_000_001).toString('base64'), mimeType: 'audio/webm' }]) {
    assert.equal((await handler(req(data))).status, data.action === 'transcribe' ? 413 : 400);
  }
  assert.equal(calls, 0);
});
const generation = (operation, params) => ({ action: 'generate', request: { model: 'gemini-3-flash-preview', operation, params } });
test('arbitrary contents, config, unknown operations and invalid typed parameters are refused', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', GEMINI_API_KEY: 'test-placeholder' }, async () => { calls++; return Response.json({}); });
  for (const data of [
    { action: { toString: 'generate' } },
    { action: 'generate', request: { model: 'gemini-3-flash-preview', contents: 'Write an essay' } },
    { ...generation('batch', { count: 10 }), contents: 'override' },
    { action: 'generate', request: { ...generation('batch', { count: 10 }).request, config: { maxOutputTokens: 999999 } } },
    generation('unknown', {}), generation('batch', { count: 21 }), generation('batch', { count: '10' }),
    generation('judge', { questionText: 'Q', correctAnswer: 'A', userAnswer: 'a'.repeat(2001) }),
    generation('judge', { questionText: 'Q', correctAnswer: 'A', userAnswer: 'A', contents: 'override' }),
    generation('question', { category: 'arbitrary topic', difficulty: 'Lehká', avoidEntities: [], childMode: false }),
    generation('question', { category: 'Česko', difficulty: 'unknown', avoidEntities: [], childMode: false }),
  ]) assert.equal((await handler(req(data))).status, 400);
  assert.equal(calls, 0);
});
test('valid typed quiz and workshop operations use fixed server prompts and schemas', async () => {
  const sent = [];
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', GEMINI_API_KEY: 'test-placeholder' }, async (url, init) => {
    sent.push(JSON.parse(init.body)); return Response.json({ candidates: [{ content: { parts: [{ text: '{}' }] } }] });
  });
  const question = { text: 'Kdo?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 };
  for (const [operation, params, prompt] of [
    ['question', { category: 'Česko', difficulty: 'Lehká', avoidEntities: [], childMode: false }, /Mistr Archivář/],
    ['batch', { count: 10 }, /10 unikátních/],
    ['judge', { questionText: 'Kdo?', correctAnswer: 'A', userAnswer: 'A' }, /Soudce Gem/],
    ['workshopQuestion', { category: 'Česko', difficulty: 'Lehká', refinement: '', positiveExamples: [] }, /špičkový specialista/],
    ['workshopUniqueness', { questionText: 'Kdo?', context: ['Co?'] }, /Unikátnost/],
    ['workshopDistractors', { question }, /Distraktory/],
    ['workshopLevel', { questionText: 'Kdo?', difficulty: 'Lehká' }, /Úroveň/],
    ['workshopRefinement', { batchResults: [], positiveExamples: [], negativeExamples: [], globalFeedback: '', currentRefinement: '' }, /Inženýr Promptů/],
  ]) {
    assert.equal((await handler(req(generation(operation, params)))).status, 200, operation);
    const last = sent.at(-1); assert.match(last.contents[0].parts[0].text, prompt);
    assert.ok(last.systemInstruction); assert.ok(last.generationConfig.maxOutputTokens <= 8192);
  }
});
test('client sends stored access header with every AI request and emits Czech 401 notice', async () => {
  const headers = [], notices = [];
  globalThis.localStorage = { getItem: () => 'test-placeholder' };
  globalThis.window = new EventTarget(); window.addEventListener('ai-access-required', () => notices.push(true));
  globalThis.fetch = async (url, init) => { headers.push(init.headers); return new Response('', { status: 401 }); };
  for (const action of ['speak', 'transcribe', 'generate']) await assert.rejects(requestAI({ action }), /[Kk]ód.*[Nn]astavení/);
  assert.equal(headers.length, 3); assert.ok(headers.every(h => h['x-app-access'] === 'test-placeholder')); assert.equal(notices.length, 3);
});

test('all quiz/workshop client calls satisfy the server contract without raw prompts', async () => {
  const { generateQuestion, generateBatchQuestions, evaluateAnswer } = await import('../services/geminiService.ts');
  const { runWorkshopAgent, refineWorkshopPrompt } = await import('../services/workshopService.ts');
  const { Category, Difficulty } = await import('../types.ts');
  const question = { text: 'Kdo napsal R.U.R.?', options: ['Čapek','Neruda','Kafka','Hašek'], correctIndex: 0,
    explanation: 'Karel Čapek.', hint: 'Robot', keyEntity: 'Čapek', wikipediaSearchQuery: 'Karel Čapek' };
  const captured = []; let upstreamCalls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', GEMINI_API_KEY: 'test-placeholder' }, async () => {
    upstreamCalls++;
    const operation = captured.at(-1).request.operation;
    const result = operation === 'batch' ? { questions: [question] } : operation === 'judge' ? { correctnessScore: 1, bonusPoints: 0, verdict: 'Ano' }
      : operation === 'workshopRefinement' ? 'Piš stručné otázky.' : operation.startsWith('workshop') && operation !== 'workshopQuestion' ? { score: 8, feedback: 'Dobré', passed: true } : question;
    return Response.json({ candidates: [{ content: { parts: [{ text: typeof result === 'string' ? result : JSON.stringify(result) }] } }] });
  });
  globalThis.localStorage = { getItem: () => null };
  globalThis.fetch = async (url, init) => {
    const data = JSON.parse(init.body); captured.push(data);
    assert.equal(data.request.contents, undefined); assert.equal(data.request.config, undefined);
    return handler(req(data));
  };
  const q = await generateQuestion(Category.ARTS, Difficulty.EASY, Array.from({ length: 150 }, (_, i) => `Entity ${i}`));
  assert.equal(q.text, question.text); assert.equal(captured[0].request.params.avoidEntities.length, 100);
  assert.equal((await generateBatchQuestions(10)).length, 1);
  assert.equal((await evaluateAnswer(q, 'Čapek')).correctnessScore, 1);
  const workshop = await runWorkshopAgent(Category.ARTS, Difficulty.EASY, '', Array(6).fill(q));
  assert.equal(workshop.uniquenessEval.score, 8);
  assert.equal(await refineWorkshopPrompt(Array(21).fill(workshop), Array(6).fill(q), [{ question: q, feedback: 'Přesněji' }], 'Stručně', ''), 'Piš stručné otázky.');
  assert.equal(upstreamCalls, 8);
});
test('nested game data caps, types and extra fields reject before provider use', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder', GEMINI_API_KEY: 'test-placeholder' }, async () => { calls++; return Response.json({}); });
  const q = { category: 'Česko', difficulty: 'Lehká', avoidEntities: [], childMode: false };
  for (const data of [
    generation('question', { ...q, avoidEntities: Array(101).fill('X') }),
    generation('question', { ...q, avoidEntities: ['x'.repeat(101)] }),
    generation('question', { ...q, childMode: 'false' }),
    generation('judge', { questionText: 'x'.repeat(601), correctAnswer: 'A', userAnswer: 'A' }),
    generation('judge', { questionText: 'Q', correctAnswer: 'x'.repeat(301), userAnswer: 'A' }),
    generation('workshopQuestion', { category: 'Česko', difficulty: 'Lehká', refinement: 'x'.repeat(1001), positiveExamples: [] }),
    generation('workshopQuestion', { category: 'Česko', difficulty: 'Lehká', refinement: '', positiveExamples: Array(6).fill({ text: 'Q', options: ['A','B','C','D'], explanation: 'E' }) }),
    generation('workshopUniqueness', { questionText: 'Q', context: Array(21).fill('Q') }),
    generation('workshopDistractors', { question: { text: 'Q', options: ['A','B','C','D'], correctIndex: 4 } }),
    generation('workshopDistractors', { question: { text: 'Q', options: ['A'], correctIndex: 0 } }),
    generation('workshopLevel', { questionText: 'Q', difficulty: 'Lehká', prompt: 'override' }),
    generation('workshopRefinement', { batchResults: [{ text: 'Q', status: 'PENDING', evals: { uniq: 11, dist: 1, level: 1 } }], positiveExamples: [], negativeExamples: [], globalFeedback: '', currentRefinement: '' }),
    generation('workshopRefinement', { batchResults: [], positiveExamples: [], negativeExamples: [{ question: { text: 'Q' }, feedback: 'x'.repeat(501) }], globalFeedback: '', currentRefinement: '' }),
    generation('batch', { count: 0 }), generation('batch', { count: 1.5 }),
    { action: 'generate', request: { model: 'arbitrary', operation: 'batch', params: { count: 1 } } },
  ]) assert.equal((await handler(req(data))).status, 400);
  assert.equal(calls, 0);
});
