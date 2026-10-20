import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { speak, stopAllSpeech } from '../services/ttsService.ts';
import { requestAI } from '../services/aiClient.ts';
import { createAIHandler } from '../server/aiHandler.ts';
import { TTSMode } from '../types.ts';

let spoken, played, requests;
beforeEach(() => {
  stopAllSpeech();
  spoken = []; played = []; requests = [];
  globalThis.window = { speechSynthesis: { cancel() {}, getVoices: () => [], speak: u => { spoken.push(u); u.onend?.(); } } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.Audio = class { constructor(url) { this.url = url; } async play() { played.push(this); } pause() {} };
  globalThis.fetch = async (url, init) => { requests.push(JSON.parse(init.body)); return Response.json({ audio: 'UklGRg==', mimeType: 'audio/wav' }); };
});

test('browser speech remains the default path without provider calls', async () => {
  await speak('Výchozí hlas', TTSMode.BROWSER);
  assert.equal(spoken[0].text, 'Výchozí hlas'); assert.equal(requests.length, 0);
});
test('successful AI speech is cached by text, voice and language', async () => {
  await speak('Mezipaměť', TTSMode.GEMINI, 'Kore');
  await speak('Mezipaměť', TTSMode.GEMINI, 'Kore');
  assert.equal(requests.length, 1); assert.equal(played.length, 2);
  await speak('Mezipaměť', TTSMode.GEMINI, 'Puck');
  assert.equal(requests.length, 2);
});
for (const status of [503, 500, 504]) test(`AI speech falls back to browser on HTTP ${status}`, async () => {
  globalThis.fetch = async () => new Response('', { status });
  let ends = 0; await speak(`Záloha ${status}`, TTSMode.GEMINI, 'Kore', () => ends++);
  assert.equal(spoken.length, 1); assert.equal(ends, 1);
});
test('network rejection falls back', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  await speak('Bez sítě', TTSMode.GEMINI); assert.equal(spoken.length, 1);
});
test('client timeout rejects even if fetch ignores abort', async () => {
  globalThis.fetch = () => new Promise(() => {});
  await assert.rejects(requestAI({ action: 'speak' }, undefined, 5), /timeout/i);
});
test('stopping speech while the request is pending prevents late audio and fallback', async () => {
  let resolve; globalThis.fetch = () => new Promise(r => resolve = r);
  const pending = speak('Zrušená otázka', TTSMode.GEMINI);
  stopAllSpeech(); resolve(Response.json({ audio: 'UklGRg==', mimeType: 'audio/wav' }));
  await pending; assert.equal(played.length, 0); assert.equal(spoken.length, 0);
});
test('audio playback failure falls back to browser', async () => {
  globalThis.Audio = class { async play() { throw new Error('decode'); } pause() {} };
  await speak('Chybný zvuk', TTSMode.GEMINI); assert.equal(spoken.length, 1);
});

const request = body => new Request('https://quiz.example/api/ai', { method: 'POST', headers: { origin: 'https://quiz.example', 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('missing server keys return 503 without any upstream request', async () => {
  const handler = createAIHandler({}, () => { throw new Error('must not call'); });
  for (const language of ['cs', 'en']) assert.equal((await handler(request({ action: 'speak', text: 'Test', language }))).status, 503);
});
test('Czech uses Gemini 3.8 Interactions and returns WAV audio', async () => {
  let sent;
  const handler = createAIHandler({ GEMINI_API_KEY: 'test-placeholder' }, async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'audio', data: 'UklGRg==', mime_type: 'audio/wav' }] }] });
  });
  const result = await handler(request({ action: 'speak', language: 'cs', text: 'Kdo je to?', voice: 'Kore' }));
  assert.equal(result.status, 200); assert.match(sent.url, /interactions$/);
  assert.equal(sent.body.model, 'gemini-3.8-flash-tts');
  assert.deepEqual(sent.body.generation_config.speech_config, [{ voice: 'Kore' }]);
  assert.equal((await result.json()).mimeType, 'audio/wav');
});
test('English uses OpenAI mini TTS and an OpenAI voice', async () => {
  let sent;
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder' }, async (url, init) => {
    sent = { url, body: JSON.parse(init.body) }; return new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg' } });
  });
  assert.equal((await handler(request({ action: 'speak', language: 'en', text: 'Who?', voice: 'Zephyr' }))).status, 200);
  assert.equal(sent.body.model, 'gpt-4o-mini-tts'); assert.equal(sent.body.voice, 'coral');
});
test('transcription uses a recorded file and plural languages hint', async () => {
  let sent;
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder' }, async (url, init) => {
    sent = { url, form: init.body }; return Response.json({ text: 'Karel Čapek' });
  });
  const result = await handler(request({ action: 'transcribe', language: 'cs', audio: 'AQID', mimeType: 'audio/webm;codecs=opus' }));
  assert.equal((await result.json()).text, 'Karel Čapek');
  assert.match(sent.url, /audio\/transcriptions$/); assert.equal(sent.form.get('model'), 'gpt-transcribe');
  assert.equal(sent.form.get('languages[]'), 'cs'); assert.equal(sent.form.get('file').name, 'answer.webm');
});
test('server strips upstream errors and rejects cross-origin and oversized input', async () => {
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder' }, async () => new Response('sensitive upstream diagnostic', { status: 401 }));
  const result = await handler(request({ action: 'speak', text: 'Hi', language: 'en' }));
  assert.equal(result.status, 502); assert.doesNotMatch(await result.text(), /sensitive|placeholder/);
  const foreign = new Request('https://quiz.example/api/ai', { method: 'POST', headers: { origin: 'https://elsewhere.example' }, body: '{}' });
  assert.equal((await handler(foreign)).status, 403);
  assert.equal((await handler(request({ action: 'speak', text: 'a'.repeat(5000), language: 'cs' }))).status, 400);
});

test('AI speech timeout automatically reads the question with the browser', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = () => new Promise(() => {});
  const pending = speak('Pomalý server', TTSMode.GEMINI);
  t.mock.timers.tick(15001); await pending; assert.equal(spoken.length, 1);
});
test('server times out upstream requests and returns a safe fallback status', async () => {
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder' }, () => new Promise(() => {}), 5);
  assert.equal((await handler(request({ action: 'speak', text: 'Hello', language: 'en' }))).status, 504);
});
test('generation stays server-side and returns only the generated text', async () => {
  let sent;
  const handler = createAIHandler({ GEMINI_API_KEY: 'test-placeholder' }, async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return Response.json({ candidates: [{ content: { parts: [{ thought: true, text: 'private model reasoning' }, { text: '{"correctnessScore":100}' }] } }], diagnostic: 'must not return' });
  });
  const result = await handler(request({ action: 'generate', request: { model: 'gemini-3-flash-preview', contents: 'Judge answer', config: { responseMimeType: 'application/json' } } }));
  assert.match(sent.url, /generateContent$/); assert.equal(sent.body.contents[0].parts[0].text, 'Judge answer');
  assert.deepEqual(await result.json(), { text: '{"correctnessScore":100}' });
});

test('cache separates languages even when text and requested voice are identical', async () => {
  await speak('Shared words', TTSMode.GEMINI, 'Kore', undefined, 'cs');
  await speak('Shared words', TTSMode.GEMINI, 'Kore', undefined, 'en');
  assert.equal(requests.length, 2); assert.equal(requests[1].language, 'en');
});
test('missing transcription key and upstream errors return fallback statuses', async () => {
  const body = { action: 'transcribe', audio: 'AQID', mimeType: 'audio/webm', language: 'cs' };
  assert.equal((await createAIHandler({})(request(body))).status, 503);
  const handler = createAIHandler({ OPENAI_API_KEY: 'test-placeholder' }, async () => new Response('', { status: 500 }));
  assert.equal((await handler(request(body))).status, 502);
});

test('client does not import credential-handling SDK or inject provider env variables', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const path of ['services/geminiService.ts', 'services/workshopService.ts']) {
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /import \{[^}]*\} from ["']@google\/genai/);
    assert.doesNotMatch(source, /process\.env|new GoogleGenAI/);
  }
  assert.doesNotMatch(await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8'), /process\.env|loadEnv|API_KEY/);
});

test('Vercel adapter accepts parsed, raw and buffer request bodies without exposing server configuration', async () => {
  const { default: handler } = await import('../api/ai.ts');
  const payload = { action: 'speak', language: 'cs', text: '' };
  for (const body of [payload, JSON.stringify(payload), Buffer.from(JSON.stringify(payload))]) {
    let status, output;
    const res = { writeHead(code) { status = code; return this; }, end(data) { output = data; } };
    await handler({ headers: { host: 'quiz.example', origin: 'https://quiz.example', 'content-type': 'application/json' }, method: 'POST', body }, res);
    assert.equal(status, 400); assert.doesNotMatch(output.toString(), /API_KEY|placeholder/);
  }
});
