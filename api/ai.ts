import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAIHandler } from '../server/aiHandler';

// Reuse one handler so rate buckets survive subsequent invocations in this instance.
const handleAI = createAIHandler({ GEMINI_API_KEY: process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  APP_ACCESS_CODE: process.env.APP_ACCESS_CODE, ALLOW_OPEN_AI_ENDPOINT: process.env.ALLOW_OPEN_AI_ENDPOINT });

// Vercel's Node function adapter; kept separate from the provider logic for offline tests.
export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  let body: string;
  try {
    const parsedBody = req.body;
    if (parsedBody !== undefined) body = Buffer.isBuffer(parsedBody) ? parsedBody.toString('utf8') : typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody);
    else {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 3_000_000) { res.writeHead(413).end(); return; }
        chunks.push(Buffer.from(chunk));
      }
      body = Buffer.concat(chunks).toString('utf8');
    }
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }
  const protocol = headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https';
  const request = new Request(`${protocol}://${headers.get('host')}/api/ai`, {
    method: req.method, headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body } : {}),
  });
  const response = await handleAI(request);
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}
