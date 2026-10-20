import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAIHandler } from '../server/aiHandler.ts';
import { requestAI } from '../services/aiClient.ts';
const body = { action: 'speak', text: 'Test', language: 'en' };
const req = (data = body, code = 'test-placeholder-long-enough', ip = '192.0.2.1') => new Request('https://quiz.example/api/ai', {
  method: 'POST', headers: { origin: 'https://quiz.example', 'content-type': 'application/json',
    ...(code === undefined ? {} : { 'x-app-access': code }), 'x-forwarded-for': ip }, body: JSON.stringify(data)
});
const provider = async () => new Response(new Uint8Array([1,2]));
for (const code of ['', 'wrong-placeholder', 'test-placeholde', 'test-placeholder-long-enough-extra', 'chybné']) test(`invalid access (${code.length} chars) makes zero provider calls`, async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough', ALLOW_OPEN_AI_ENDPOINT: '1' }, async () => { calls++; return provider(); });
  assert.equal((await handler(req(body, code))).status, 401); assert.equal(calls, 0);
});
test('missing access header makes zero provider calls', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return provider(); });
  const request = req(); request.headers.delete('x-app-access');
  assert.equal((await handler(request)).status, 401); assert.equal(calls, 0);
});
test('correct access reaches provider', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return provider(); });
  assert.equal((await handler(req())).status, 200); assert.equal(calls, 1);
});
for (const flag of [undefined, '', '0', 'true', '1']) test(`unset access code only opens with explicit flag ${flag}`, async () => {
  let calls = 0;
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder-long-enough', ALLOW_OPEN_AI_ENDPOINT: flag }, async () => { calls++; return provider(); });
  assert.equal((await handler(req())).status, flag === '1' ? 200 : 503); assert.equal(calls, flag === '1' ? 1 : 0);
});
test('minute token bucket uses first forwarded IP, refills and separates clients', async t => {
  let now = 0, calls = 0; t.mock.method(Date, 'now', () => now);
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return provider(); });
  for (let i = 0; i < 30; i++) assert.equal((await handler(req(body, 'test-placeholder-long-enough', `192.0.2.1, 198.51.100.${i}`))).status, 200);
  assert.equal((await handler(req())).status, 429); assert.equal(calls, 30);
  assert.equal((await handler(req(body, 'test-placeholder-long-enough', '192.0.2.2'))).status, 200);
  now = 2000; assert.equal((await handler(req())).status, 200);
});
test('hourly bucket limits sustained traffic below minute capacity', async t => {
  let now = 0; t.mock.method(Date, 'now', () => now);
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough' }, provider);
  for (let i = 0; i < 359; i++) { assert.equal((await handler(req())).status, 200); now += 2000; }
  assert.equal((await handler(req())).status, 429);
  now += 3_600_000; assert.equal((await handler(req())).status, 200);
});
test('caps and unknown actions reject without provider calls', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return provider(); });
  for (const data of [{ ...body, text: 'a'.repeat(601) }, { action: 'unknown' },
    { action: 'transcribe', audio: Buffer.alloc(2_000_001).toString('base64'), mimeType: 'audio/webm' }]) {
    assert.equal((await handler(req(data))).status, data.action === 'transcribe' ? 413 : 400);
  }
  assert.equal(calls, 0);
});
const generation = (operation, params) => ({ action: 'generate', request: { model: 'gemini-3-flash-preview', operation, params } });
test('arbitrary contents, config, unknown operations and invalid typed parameters are refused', async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', GEMINI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return Response.json({}); });
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
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', GEMINI_API_KEY: 'test-placeholder-long-enough' }, async (url, init) => {
    const payload = JSON.parse(init.body); sent.push(payload);
    const properties = payload.generationConfig.responseSchema.properties;
    const output = properties.refinement ? { refinement: 'Piš stručně.' } : properties.verdict ? { verdict: 'Ano' } : {};
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] });
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
  globalThis.localStorage = { getItem: () => 'test-placeholder-long-enough' };
  globalThis.window = new EventTarget(); window.addEventListener('ai-access-required', () => notices.push(true));
  globalThis.fetch = async (url, init) => { headers.push(init.headers); return new Response('', { status: 401 }); };
  for (const action of ['speak', 'transcribe', 'generate']) await assert.rejects(requestAI({ action }), /[Kk]ód.*[Nn]astavení/);
  assert.equal(headers.length, 3); assert.ok(headers.every(h => h['x-app-access'] === 'test-placeholder-long-enough')); assert.equal(notices.length, 3);
});

test('all quiz/workshop client calls satisfy the server contract without raw prompts', async () => {
  const { generateQuestion, generateBatchQuestions, evaluateAnswer } = await import('../services/geminiService.ts');
  const { runWorkshopAgent, refineWorkshopPrompt } = await import('../services/workshopService.ts');
  const { Category, Difficulty } = await import('../types.ts');
  const question = { text: 'Kdo napsal R.U.R.?', options: ['Čapek','Neruda','Kafka','Hašek'], correctIndex: 0,
    explanation: 'Karel Čapek.', hint: 'Robot', keyEntity: 'Čapek', wikipediaSearchQuery: 'Karel Čapek' };
  const captured = []; let upstreamCalls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', GEMINI_API_KEY: 'test-placeholder-long-enough' }, async () => {
    upstreamCalls++;
    const operation = captured.at(-1).request.operation;
    const result = operation === 'batch' ? { questions: [question] } : operation === 'judge' ? { correctnessScore: 1, bonusPoints: 0, verdict: 'Ano' }
      : operation === 'workshopRefinement' ? { refinement: 'Piš stručné otázky.' } : operation.startsWith('workshop') && operation !== 'workshopQuestion' ? { score: 8, feedback: 'Dobré', passed: true } : question;
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
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', GEMINI_API_KEY: 'test-placeholder-long-enough' }, async () => { calls++; return Response.json({}); });
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


test('five wrong codes lock out the IP for fifteen minutes, including correct codes', async t => {
  let now = 0, calls = 0; t.mock.method(Date, 'now', () => now);
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  for (let i = 0; i < 500; i++) {
    const response = await handler(req(body, 'wrong'));
    assert.equal(response.status, i < 5 ? 401 : 429);
    if (i >= 5) assert.equal((await response.json()).code, 'rate_limited');
  }
  now = 899999; assert.equal((await handler(req())).status, 429);
  assert.equal(calls, 0);
  now = 900000; assert.equal((await handler(req())).status, 200);
  assert.equal(calls, 1);
});
test('wrong codes also consume the normal token allowance', async () => {
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder' }, provider);
  for (let i = 0; i < 26; i++) assert.equal((await handler(req())).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await handler(req(body, 'wrong'))).status, 401);
  assert.equal((await handler(req())).status, 429);
});
for (const code of ['', 'short', 'a'.repeat(19), 'a'.repeat(20) + 'č']) test(`invalid configured access code fails closed (${code.length} chars)`, async () => {
  let calls = 0;
  const handler = createAIHandler({ APP_ACCESS_CODE: code, ALLOW_OPEN_AI_ENDPOINT: '1', OPENAI_API_KEY: 'test-placeholder' }, async () => { calls++; return provider(); });
  assert.equal((await handler(req())).status, 503); assert.equal(calls, 0);
});
test('IPv6 addresses and spellings in one /64 share token and failure buckets', async () => {
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder' }, provider);
  for (let i = 0; i < 30; i++) assert.equal((await handler(req(body, 'test-placeholder-long-enough', `2001:db8:abcd:1::${i+1}`))).status, 200);
  assert.equal((await handler(req(body, 'test-placeholder-long-enough', '2001:0db8:abcd:0001:ffff:0:0:1'))).status, 429);
  assert.equal((await handler(req(body, 'test-placeholder-long-enough', '2001:db8:abcd:2::1'))).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await handler(req(body, 'wrong', `2001:db8:abcd:3::${i+1}`))).status, 401);
  assert.equal((await handler(req(body, 'test-placeholder-long-enough', '2001:db8:abcd:3::ffff'))).status, 429);
});
test('a full IP map evicts the oldest client and admits a new IP', async () => {
  const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', OPENAI_API_KEY: 'test-placeholder' }, provider);
  // Exhaust the oldest client's allowance before filling the remaining map slots.
  for (let i = 0; i < 30; i++) assert.equal((await handler(req())).status, 200);
  assert.equal((await handler(req())).status, 429);
  for (let i = 0; i < 9999; i++) assert.equal((await handler(req({ action: 'unknown' }, 'test-placeholder-long-enough', `10.${i >> 16}.${(i >> 8) & 255}.${i & 255}`))).status, 400);
  assert.equal((await handler(req(body, 'test-placeholder-long-enough', '192.0.2.2'))).status, 200);
  // Returning with a fresh allowance proves the oldest entry was evicted.
  assert.equal((await handler(req())).status, 200);
});
test('server limiter 429 shows a Czech notice without retry or model switch', async () => {
  const { generateBatchQuestions } = await import('../services/geminiService.ts');
  let calls = 0; globalThis.localStorage = { getItem: () => '' };
  globalThis.fetch = async () => { calls++; return Response.json({ code: 'rate_limited', error: 'limited' }, { status: 429 }); };
  await assert.rejects(generateBatchQuestions(1), /Příliš mnoho AI požadavků/);
  assert.equal(calls, 1);
});
test('refinement schema and judge verdict enforce bounded outputs', async () => {
  const { buildQuizGeneration } = await import('../server/quizGeneration.ts');
  const refinement = buildQuizGeneration(generation('workshopRefinement', { batchResults: [], positiveExamples: [], negativeExamples: [], globalFeedback: '', currentRefinement: '' }).request);
  assert.equal(refinement.config.responseMimeType, 'application/json');
  assert.equal(refinement.config.responseSchema.properties.refinement.maxLength, '1000');
  assert.ok(refinement.config.maxOutputTokens <= 1024);
  const judge = buildQuizGeneration(generation('judge', { questionText: 'Q', correctAnswer: 'A', userAnswer: 'A' }).request);
  assert.equal(judge.config.responseSchema.properties.verdict.maxLength, '500');
});


test('provider output over verdict and refinement caps returns a safe 502', async () => {
  for (const [operation, params, field, cap] of [
    ['judge', { questionText: 'Q', correctAnswer: 'A', userAnswer: 'A' }, 'verdict', 500],
    ['workshopRefinement', { batchResults: [], positiveExamples: [], negativeExamples: [], globalFeedback: '', currentRefinement: '' }, 'refinement', 1000],
  ]) {
    for (const length of [cap, cap + 1]) {
      const handler = createAIHandler({ APP_ACCESS_CODE: 'test-placeholder-long-enough', GEMINI_API_KEY: 'test-placeholder' }, async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ [field]: 'x'.repeat(length) }) }] } }] }));
      assert.equal((await handler(req(generation(operation, params)))).status, length === cap ? 200 : 502);
    }
  }
});
test('stored non-ASCII codes are not forwarded and the storage setter rejects them', async () => {
  const { getAIAccessCode, setAIAccessCode } = await import('../services/aiClient.ts');
  let writes = 0; globalThis.localStorage = { getItem: () => 'kód', setItem() { writes++; } };
  assert.equal(getAIAccessCode(), '');
  assert.throws(() => setAIAccessCode('kód'), /ASCII/); assert.equal(writes, 0);
});
