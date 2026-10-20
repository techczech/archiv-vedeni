type Secrets = { GEMINI_API_KEY?: string; OPENAI_API_KEY?: string };
const googleVoices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const openAIVoices = ['coral', 'alloy', 'nova', 'sage'];
const models = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-flash-lite-latest'];
const MAX_BODY = 3_000_000;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
class ServiceError extends Error { constructor(public status: number) { super('AI unavailable'); } }

export function createAIHandler(secrets: Secrets, upstream: typeof fetch = fetch, timeoutMs = 12000) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    // Same-origin browser endpoint. There are no cross-origin credentials or CORS permissions.
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ error: 'Forbidden' }, 403);
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'Expected JSON' }, 415);
    if (Number(request.headers.get('content-length')) > MAX_BODY) return json({ error: 'Too large' }, 413);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new ServiceError(504)); }, timeoutMs);
    });
    const call = async (url: string, init: RequestInit) => {
      const response = await upstream(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new ServiceError(response.status === 429 ? 429 : 502);
      return response;
    };
    const key = (name: keyof Secrets) => { if (!secrets[name]) throw new ServiceError(503); return secrets[name]!; };
    const process = async () => {
      const raw = await request.text();
      if (Buffer.byteLength(raw) > MAX_BODY) throw new ServiceError(413);
      let body: any;
      try { body = JSON.parse(raw); } catch { throw new ServiceError(400); }
      if (!body || typeof body !== 'object') throw new ServiceError(400);
      const language = body.language || 'cs';
      if (!['cs', 'en', 'cs-CZ', 'en-GB', 'en-US'].includes(language)) throw new ServiceError(400);
      if (body.action === 'speak') {
        if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4000) throw new ServiceError(400);
        if (language.startsWith('cs')) {
          const response = await call('https://generativelanguage.googleapis.com/v1beta/interactions', {
            method: 'POST', headers: { 'x-goog-api-key': key('GEMINI_API_KEY'), 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-3.8-flash-tts',
              input: [{ type: 'user_input', content: [{ type: 'text', text: body.text }] }],
              response_format: { type: 'audio', mime_type: 'audio/wav' },
              generation_config: { speech_config: [{ voice: googleVoices.includes(body.voice) ? body.voice : 'Zephyr' }] },
            }),
          });
          const result = await response.json();
          const audio = result.steps?.filter((s: any) => s.type === 'model_output')
            .flatMap((s: any) => s.content || []).filter((c: any) => c.type === 'audio').at(-1);
          if (!audio?.data || (audio.mime_type && audio.mime_type !== 'audio/wav')) throw new ServiceError(502);
          return json({ audio: audio.data, mimeType: 'audio/wav' });
        }
        const response = await call('https://api.openai.com/v1/audio/speech', {
          method: 'POST', headers: { Authorization: `Bearer ${key('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini-tts', input: body.text,
            voice: openAIVoices.includes(body.voice) ? body.voice : 'coral', response_format: 'mp3' }),
        });
        return json({ audio: Buffer.from(await response.arrayBuffer()).toString('base64'), mimeType: 'audio/mpeg' });
      }
      if (body.action === 'transcribe') {
        const mime = typeof body.mimeType === 'string' ? body.mimeType.split(';')[0] : '';
        const extensions: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/wav': 'wav' };
        if (!extensions[mime] || typeof body.audio !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)) throw new ServiceError(400);
        const bytes = Buffer.from(body.audio, 'base64');
        if (!bytes.length || bytes.length > 2_000_000) throw new ServiceError(413);
        const form = new FormData();
        form.set('model', 'gpt-transcribe');
        form.append('languages[]', language.slice(0, 2));
        form.set('file', new Blob([bytes], { type: mime }), `answer.${extensions[mime]}`);
        const response = await call('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST', headers: { Authorization: `Bearer ${key('OPENAI_API_KEY')}` }, body: form,
        });
        const result = await response.json();
        if (typeof result.text !== 'string' || !result.text.trim()) throw new ServiceError(502);
        return json({ text: result.text });
      }
      if (body.action === 'generate') {
        const r = body.request;
        if (!r || !models.includes(r.model) || typeof r.contents !== 'string' || r.contents.length > 60000) throw new ServiceError(400);
        const config = { responseMimeType: r.config?.responseMimeType === 'application/json' ? 'application/json' : 'text/plain',
          responseSchema: r.config?.responseSchema, temperature: Math.max(0, Math.min(1, Number(r.config?.temperature ?? 0.9))),
          maxOutputTokens: 8192 };
        // Existing quiz generation and judging also use the server, so a shared Gemini key cannot leak through Vite.
        const response = await call(`https://generativelanguage.googleapis.com/v1beta/models/${r.model}:generateContent`, {
          method: 'POST', headers: { 'x-goog-api-key': key('GEMINI_API_KEY'), 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: r.contents }] }], generationConfig: config }),
        });
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.filter((part: any) => !part.thought).map((part: any) => part.text || '').join('');
        if (!text) throw new ServiceError(502);
        return json({ text });
      }
      throw new ServiceError(400);
    };
    try { return await Promise.race([process(), timeout]); }
    catch (error) { return json({ error: 'AI služba není dostupná.' }, error instanceof ServiceError ? error.status : 502); }
    finally { clearTimeout(timer!); }
  };
}
