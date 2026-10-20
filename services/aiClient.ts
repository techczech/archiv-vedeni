import type { Type as GoogleSchemaType } from '@google/genai';

// Schema literals do not require loading the provider's credential-handling SDK in the browser.
export const SchemaType = Object.fromEntries(['OBJECT', 'ARRAY', 'STRING', 'NUMBER', 'INTEGER', 'BOOLEAN'].map(value => [value, value])) as Record<'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN', GoogleSchemaType>;

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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`AI služba není dostupná (${response.status}).`);
      return response.json() as Promise<T>;
    })()]);
  } finally {
    clearTimeout(timer!);
    signal?.removeEventListener('abort', abort!);
  }
}

export const generateContent = (request: unknown) => requestAI<{ text: string }>({ action: 'generate', request }, undefined, 30000);

export function encodeAudio(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
