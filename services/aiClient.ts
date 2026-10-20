import type { AIGenerationRequest } from '../types';

export const AI_ACCESS_NOTICE = 'Zadejte platný kód pro AI funkce v Nastavení. Hlasové funkce použijí prohlížeč, pokud je dostupný.';
const ACCESS_STORAGE_KEY = 'archivari_ai_access';
export function getAIAccessCode(): string {
  try { return localStorage.getItem(ACCESS_STORAGE_KEY) || ''; } catch { return ''; }
}
export function setAIAccessCode(code: string): void { localStorage.setItem(ACCESS_STORAGE_KEY, code); }
export class AIAccessError extends Error { constructor() { super(AI_ACCESS_NOTICE); } }

// The browser only talks to its own server; provider credentials never enter this module.
export async function requestAI<T>(body: unknown, signal?: AbortSignal, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let abort: () => void;
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => { controller.abort(); reject(new Error('Cancelled')); };
    timer = setTimeout(() => { controller.abort(); reject(new Error('AI timeout')); }, timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
  try {
    return await Promise.race([cancelled, (async () => {
      const response = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-app-access': getAIAccessCode() },
        body: JSON.stringify(body), signal: controller.signal,
      });
      if (response.status === 401) {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('ai-access-required'));
        throw new AIAccessError();
      }
      if (!response.ok) throw new Error(`AI služba není dostupná (${response.status}).`);
      return response.json() as Promise<T>;
    })()]);
  } finally {
    clearTimeout(timer!);
    signal?.removeEventListener('abort', abort!);
  }
}

export const generateContent = (request: AIGenerationRequest) => requestAI<{ text: string }>({ action: 'generate', request }, undefined, 30000);

export function encodeAudio(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
