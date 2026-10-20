import { TTSMode } from '../types';
import { requestAI } from './aiClient';

type AudioResult = { audio: string; mimeType: string };
const audioCache = new Map<string, AudioResult>();
let generation = 0;
let pending: AbortController | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentURL: string | null = null;
let audioContext: AudioContext | null = null;

function releaseAudio() {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentURL) URL.revokeObjectURL(currentURL);
  currentURL = null;
}

export const stopAllSpeech = () => {
  generation++;
  pending?.abort();
  pending = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  releaseAudio();
};

export const playWarningBeep = () => {
  if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const ctx = audioContext;
  void ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

export const speak = async (text: string, mode: TTSMode, voice = 'Zephyr', onEnd?: () => void, language = 'cs'): Promise<void> => {
  stopAllSpeech();
  const id = generation;
  let ended = false;
  const finish = () => { if (id === generation && !ended) { ended = true; onEnd?.(); } };
  let usingBrowser = false;
  const browserSpeech = () => {
    if (id !== generation || usingBrowser) return;
    usingBrowser = true;
    if (!window.speechSynthesis) { finish(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.startsWith('en') ? 'en-GB' : 'cs-CZ';
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name === voice && v.lang.startsWith(language))
      || voices.find(v => v.lang.startsWith(language)) || null;
    utterance.onend = finish;
    utterance.onerror = finish;
    try { window.speechSynthesis.speak(utterance); } catch { finish(); }
  };
  if (mode === TTSMode.BROWSER) { browserSpeech(); return; }
  // Split only AI speech: the server accepts at most 600 characters per request.
  const chunks: string[] = [];
  for (let offset = 0; offset < text.length;) {
    let end = Math.min(offset + 600, text.length);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end - 1);
      if (boundary > offset) end = boundary + 1;
      else if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    chunks.push(text.slice(offset, end)); offset = end;
  }
  const playChunk = async (index: number): Promise<void> => {
    if (id !== generation) return;
    if (index >= chunks.length) { finish(); return; }
    const controller = new AbortController();
    pending = controller;
    const key = JSON.stringify([chunks[index], voice, language]);
    try {
      let result = audioCache.get(key);
      if (!result) {
        result = await requestAI<AudioResult>({ action: 'speak', text: chunks[index], voice, language }, controller.signal);
        if (!result.audio || !['audio/wav', 'audio/mpeg'].includes(result.mimeType)) throw new Error('Invalid audio');
        if (id !== generation) return;
        // A bounded, session-only cache avoids persisting players' names or growing indefinitely.
        if (audioCache.size >= 32) audioCache.delete(audioCache.keys().next().value!);
        audioCache.set(key, result);
      }
      if (id !== generation) return;
      const bytes = Uint8Array.from(atob(result.audio), char => char.charCodeAt(0));
      currentURL = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
      const audio = new Audio(currentURL);
      currentAudio = audio;
      audio.onended = () => {
        if (id !== generation) return;
        releaseAudio(); void playChunk(index + 1);
      };
      audio.onerror = () => { if (id === generation) { audioCache.delete(key); releaseAudio(); browserSpeech(); } };
      await audio.play();
    } catch {
      if (id === generation) { audioCache.delete(key); releaseAudio(); browserSpeech(); }
    } finally {
      if (pending === controller) pending = null;
    }
  };
  await playChunk(0);
};
