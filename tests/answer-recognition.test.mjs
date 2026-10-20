import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { create } from 'react-test-renderer';
import QuestionScreen from '../components/QuestionScreen.tsx';
import { createAnswerRecognition } from '../services/recognitionService.ts';
import { DEFAULT_CONFIG } from '../constants.ts';
import { GameMode, Category, Difficulty } from '../types.ts';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function environment({ browser = true, failAI = false } = {}) {
  let recognition, recorder, stopped = 0;
  const stream = { getTracks: () => [{ stop() { stopped++; } }] };
  globalThis.window = { speechSynthesis: { cancel() {} }, ...(browser ? { webkitSpeechRecognition: class {
    constructor() { recognition = this; }
    start() { this.onresult?.({ results: [[{ transcript: 'Karel Čapek' }]] }); this.onend?.(); }
    stop() {} abort() {}
  } } : {}) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => stream } } });
  globalThis.MediaRecorder = class {
    static isTypeSupported(type) { return type.startsWith('audio/webm'); }
    constructor() { recorder = this; this.mimeType = 'audio/webm'; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['recorded'], { type: this.mimeType }) }); this.onstop?.(); }
  };
  globalThis.fetch = async () => failAI ? new Response('', { status: 503 }) : Response.json({ text: 'Karel Čapek' });
  return { get recorder() { return recorder; }, get recognition() { return recognition; }, get stopped() { return stopped; } };
}
const settle = () => new Promise(r => setTimeout(r, 15));
for (const mode of ['browser', 'ai']) test(`${mode} transcript reaches the unchanged answer-checking callback`, async () => {
  const env = environment(); let submitted, renderer;
  const props = {
    question: { id: mode, text: 'Kdo napsal R.U.R.?', options: ['Karel Čapek'], correctIndex: 0, category: Category.ARTS, difficulty: Difficulty.HARD },
    config: { ...DEFAULT_CONFIG, mode: GameMode.JUDGE, timerEnabled: false, recognitionMode: mode },
    currentPlayer: { name: 'Test', isHardMode: true, lifelines: {}, completedCategories: [], challengedPlayerIds: [], score: 0 }, selectedAnswer: null, isCorrect: null,
    hiddenOptions: [], hintRevealed: false, onAnswer: answer => submitted = answer,
    onManualVerdict() {}, onNext() {}, onUseLifeline() {}
  };
  await act(async () => { renderer = create(React.createElement(QuestionScreen, props)); });
  await act(async () => { renderer.root.findByProps({ title: 'Hlasový vstup' }).props.onClick(); await settle(); });
  if (mode === 'ai') await act(async () => { renderer.root.findByProps({ title: 'Hlasový vstup' }).props.onClick(); await settle(); });
  assert.equal(renderer.root.findByType('textarea').props.value, 'Karel Čapek');
  await act(async () => { renderer.root.findAllByType('button').find(b => b.children.join('').includes('Posoudit AI')).props.onClick(); });
  assert.equal(submitted, 'Karel Čapek');
  await act(async () => renderer.unmount());
  if (mode === 'ai') assert.ok(env.stopped > 0);
});
test('AI failure automatically starts browser recognition', async () => {
  const env = environment({ failAI: true }); const results = []; const notices = [];
  const session = createAnswerRecognition({ mode: 'ai', language: 'cs', onTranscript: t => results.push(t), onState() {}, onNotice: t => notices.push(t) });
  await session.start(); session.stop(); await settle();
  assert.deepEqual(results, ['Karel Čapek']); assert.ok(env.recognition); assert.ok(env.stopped > 0); assert.ok(notices.length);
  session.cancel();
});
test('AI works without browser recognition (Firefox path)', async () => {
  environment({ browser: false }); const results = [];
  const session = createAnswerRecognition({ mode: 'ai', language: 'cs', onTranscript: t => results.push(t), onState() {}, onNotice() {} });
  await session.start(); session.stop(); await settle(); assert.deepEqual(results, ['Karel Čapek']); session.cancel();
});
test('cancel prevents a late transcript and releases the microphone', async () => {
  const env = environment(); const results = []; let resolve;
  globalThis.fetch = () => new Promise(r => resolve = r);
  const session = createAnswerRecognition({ mode: 'ai', language: 'cs', onTranscript: t => results.push(t), onState() {}, onNotice() {} });
  await session.start(); session.stop(); await settle(); session.cancel();
  resolve(Response.json({ text: 'Late' })); await settle(); assert.deepEqual(results, []); assert.ok(env.stopped > 0);
});
test('missing browser recognition gives a usable notice without pretending to listen', async () => {
  environment({ browser: false }); const states = [], notices = [];
  const session = createAnswerRecognition({ mode: 'browser', onTranscript() {}, onState: s => states.push(s), onNotice: s => notices.push(s) });
  await session.start(); assert.equal(states.at(-1), 'idle'); assert.ok(notices.length); session.cancel();
});

test('AI recognition timeout automatically falls back to browser', async t => {
  const env = environment(); const results = [];
  t.mock.timers.enable({ apis: ['setTimeout'] });
  globalThis.fetch = () => new Promise(() => {});
  const session = createAnswerRecognition({ mode: 'ai', onTranscript: t => results.push(t), onState() {}, onNotice() {} });
  await session.start(); session.stop();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  t.mock.timers.tick(15001);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.ok(env.recognition); assert.deepEqual(results, ['Karel Čapek']); session.cancel();
});
test('stopping while microphone permission is pending prevents recording after permission arrives', async () => {
  const env = environment(); let grant;
  navigator.mediaDevices.getUserMedia = () => new Promise(resolve => grant = resolve);
  const states = [];
  const session = createAnswerRecognition({ mode: 'ai', onTranscript() { assert.fail('Unexpected transcript'); }, onState: s => states.push(s), onNotice() {} });
  const starting = session.start(); session.stop();
  grant({ getTracks: () => [{ stop() {} }] }); await starting;
  assert.equal(env.recorder, undefined); assert.equal(states.at(-1), 'idle'); session.cancel();
});

test('settings keep browser defaults and expose optional AI recognition and English speech', async () => {
  const { default: SettingsPage } = await import('../components/SettingsPage.tsx');
  environment({ browser: false }); globalThis.localStorage = { getItem: () => null };
  window.speechSynthesis = undefined;
  let updated, renderer;
  await act(async () => { renderer = create(React.createElement(SettingsPage, {
    config: DEFAULT_CONFIG, questionBankCount: 0, isGeneratingBatch: false,
    onUpdateConfig: config => updated = config, onGenerateBatch() {}, onImportBank() {},
    onGoToArchive() {}, onGoToWorkshop() {}, onBack() {}
  })); });
  const recognition = renderer.root.findByProps({ 'aria-label': 'Rozpoznávání odpovědí' });
  assert.equal(recognition.props.value, 'browser');
  await act(async () => recognition.props.onChange({ target: { value: 'ai' } }));
  assert.equal(updated.recognitionMode, 'ai');
  const language = renderer.root.findByProps({ 'aria-label': 'Jazyk hlasu a odpovědí' });
  await act(async () => language.props.onChange({ target: { value: 'en' } }));
  assert.equal(updated.speechLanguage, 'en');
  assert.equal(DEFAULT_CONFIG.ttsMode, 'Prohlížeč (Zdarma)');
  await act(async () => renderer.unmount());
});
