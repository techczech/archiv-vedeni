---
title: Archiv vedení AI voices — implementation handoff
date: 2026-10-20
status: implemented-uncommitted-not-deployed
---

# Archiv vedení AI voices

- Both speech engines default to the browser, and the AI paths automatically fall back when available.
- Provider keys and access-code verification are server-only. Quiz and workshop calls use fixed server prompt templates with validated game parameters.
- Fifty-five offline tests, TypeScript checking and the Vite production build pass.
- Deployment and live provider/device checks remain outstanding. No keys were created or configured.

## Language and hosting found

The HTML language tag is `cs`. The interface, starter questions, generation prompts and original browser speech settings are Czech. There was no existing language switch. The new speech-language setting defaults to Czech and supports English narration/recognition for English content; it does not translate questions or the interface. An explicit language setting avoids guessing from short questions or names.

The checkout is a React 19 / TypeScript / Vite SPA. No Supabase functions/configuration, backend, Cloudflare configuration, Vercel configuration, deployment metadata or original lockfile was present. The original README listed multiple possible static hosts; the actual deployed host cannot be established from this checkout. The Lovable description in the brief is not evidence of a Supabase backend here.

Vercel is the added deployment target because a single Node function fits the existing Vite app without a database, server framework or new provider SDK. npm was selected because no lockfile or package-manager declaration existed. `package-lock.json` now pins dependencies, and `npm ci` was used successfully. No upstream pull was attempted because the parcel restricts network access.

## Behaviour and decisions

Read-aloud uses the selected language: Czech calls Google `gemini-3.8-flash-tts` through Interactions and plays WAV; English calls OpenAI `gpt-4o-mini-tts` and plays MP3. The existing Google voice choices are retained; English offers prebuilt OpenAI voices and defaults to coral. Audio is cached in memory for up to 32 `(text, voice, language)` entries. Language is included to prevent a cached voice in the wrong language. No audio is persisted across page reloads.

Missing keys, HTTP errors, network errors, invalid responses, playback failure and request timeout return read-aloud to browser speech. Stopping speech aborts the request and prevents late audio or fallback after a question has changed.

AI recognition is optional. It records with MediaRecorder, stops on the next microphone press or after 45 seconds, and sends a bounded file to the same function. OpenAI `gpt-transcribe` receives a multipart `languages[]` hint of cs or en. Only documented WebM/MP4 recording formats are selected; uploads are capped at 2 MB. The transcript enters the same editable text state and `onAnswer(text)` submission path as browser recognition. It is never automatically judged on arrival.

AI recognition failure starts the browser recogniser and tells the player to repeat the answer. If that engine is absent, the player gets an instruction to type or choose AI in settings. AI therefore has a usable path without webkitSpeechRecognition. Question changes, verdicts, submission and unmount cancel recognition, release microphone tracks and discard stale transcripts. A late microphone permission grant cannot restart cancelled recording.

The speech client timeout is 15 seconds; generation uses 30 seconds. The server bounds each provider operation to 12 seconds and aborts its fetch on timeout. Provider URLs, models and voices are allowlisted, responses use no-store, and provider diagnostics are not returned. Origin checking remains a CSRF defence only. It does not authenticate direct callers.

Every AI operation requires `x-app-access` when `APP_ACCESS_CODE` is configured. The server hashes the configured and supplied values to fixed-size SHA-256 digests and compares them with Node's `timingSafeEqual`, including wrong-length inputs. A missing or wrong code returns 401 before provider work. With no configured code (including an empty value), access fails closed unless `ALLOW_OPEN_AI_ENDPOINT=1` is explicitly set. A configured code takes precedence over that override. Settings contains a masked “Kód pro AI funkce” input; it persists only in browser localStorage, separately from saved games and exported configuration. Every AI request carries the stored code. A 401 displays a Czech Settings notice, falls speech back to browser speech, and falls recognition back to browser recognition where supported.

The adapter reuses one handler per function instance. That handler keeps per-IP token buckets: capacity 30/refill 30 per minute and capacity 300/refill 300 per hour. Both must have a token; otherwise the response is 429 before any provider call. Vercel's first `x-forwarded-for` hop is the client key; missing addresses share a bucket. Buckets expire after an hour of inactivity. At most 10,000 active IPs are retained; additional IPs are refused rather than evicting active limits. These are per-instance burst/refill limits, not fixed-window quotas, global limits or a global spending cap. A cold start or another instance starts separate buckets.

Caller-written `contents` and provider `config` are rejected, even with a valid access code. The eight allowed generation tasks are a single quiz question, a batch, answer judging, a workshop question, uniqueness checking, distractor checking, difficulty checking and workshop refinement. Server code chooses the prompt template, output schema, temperature and output-token cap (8,192 for batches; 2,048 otherwise). A fixed system instruction treats supplied game text as untrusted data. This limits the API contract; model compliance with instructions has not been tested live.

Validation rejects unknown fields, unknown operations/models, invalid enum values and wrong parameter types with 400 before provider work. TTS and question text are capped at 600 characters; options/correct answers at 300; player answers at 2,000; individual avoided entities at 100; workshop explanations at 1,500; refinement/global feedback at 1,000; individual negative feedback at 500. Batches allow 1–20 questions. Context is bounded to 100 avoided entities, 20 previous question texts, 20 workshop results and five positive/negative examples. The client sends the latest entries within those context limits. Assembled prompts have a 32,000-character ceiling, including escaped data and template text. The existing 2 MB decoded recording cap and 3 MB JSON-body cap remain.

Removing Vite's original key injection required moving existing generation, judging and workshop calls behind the server too. Their prompt wording and allowlisted model choices are preserved, but prompt assembly and output configuration now belong to the server. The migrated response parser excludes thought parts, preserving the former SDK text behaviour. Runtime provider SDK imports were removed from the client; schema types are type-only imports. The HTML was missing its TSX entry script, so that script was added to make the production build load the app.

## Changed files

- `api/ai.ts:5` adds the Vercel Node adapter and server-only environment lookup.
- `server/aiHandler.ts` adds fail-closed access verification, per-instance rate limits, request caps and CSRF defence before provider routing.
- `server/quizGeneration.ts` validates the eight typed tasks and assembles fixed prompts and provider configuration.
- `types.ts` defines the discriminated generation request contract.
- `vercel.json:1` configures the Vite output and function duration.
- `services/aiClient.ts` sends the local access code and signals 401 notices; `App.tsx` displays the Czech Settings notice.
- `services/ttsService.ts:47` replaces direct authenticated TTS with cached server audio and automatic browser fallback.
- `services/recognitionService.ts:11` adds bounded recording, transcription, browser fallback and microphone cleanup.
- `components/QuestionScreen.tsx:53` integrates recognition state and shared transcript submission; `components/QuestionScreen.tsx:186` handles lifecycle cleanup.
- `components/SettingsPage.tsx` adds the persistent masked access-code input alongside the speech controls. Provider keys remain server-only.
- `constants.ts:60` and `types.ts:155` add compatible speech settings with browser/Czech defaults. Old saved configurations continue to work.
- `services/geminiService.ts:3` and `services/workshopService.ts:3` move existing provider calls to the server client.
- `vite.config.ts:5` removes credential injection; `index.html:50` adds the missing app entry script.
- `package.json:10` adds test/typecheck scripts and a supported Node version. `package-lock.json:1` pins npm dependencies; React's headless renderer is the only added test dependency.
- `tests/register.mjs:1` loads TS/TSX through the existing TypeScript compiler for Node's built-in test runner. No prior tests or runner existed.
- `tests/ai-access.test.mjs` covers access, fail-closed/open override, both rate buckets, typed contracts, field caps and all quiz/workshop client calls against the server.
- `tests/ai-speech.test.mjs` covers speech cache/fallback (including 401), provider contracts, validation, key separation and adapter body handling/rate persistence.
- `tests/answer-recognition.test.mjs:1` covers both engines reaching the actual question component's answer callback, recognition fallback/timeouts, missing browser support, cancellation and settings.
- `README.md:76` replaces obsolete static deployment/key-entry instructions with the server deployment route.
- `research/2026-10-20-archiv-vedeni-ai-voice-provider-contracts.md:1` records source-linked provider and hosting evidence; its capture manifest is also included.
- `research/2026-10-20-archiv-vedeni-ai-voices-headless-verification.md:1` retains the test/build evidence and regression finding.
- `research/_manifest.jsonl:1` contains the two source-linked capture receipts.
- `docs/report-ai-voices.md:1` is this handoff.

## What to deploy and configure

Deploy the complete repository as a Vercel Vite project, including `api/ai.ts`, `server/aiHandler.ts` and `vercel.json`, with a current supported Node runtime satisfying Node 22.15 or newer. Install with `npm ci`, build with `npm run build`, and serve `dist` together with the function at `/api/ai` on the same HTTPS origin. A static-only upload cannot run AI speech, transcription, generation or judging; browser speech and the local question bank remain available.

Set these server environment secret names in Vercel before deploying:

- `GEMINI_API_KEY` enables Czech AI speech and existing Gemini quiz functions.
- `OPENAI_API_KEY` enables English AI speech and AI answer recognition in both languages.
- `APP_ACCESS_CODE` gates every billable operation; share it only with intended players, who enter it once in Settings.

Do not give any secret a public/Vite prefix. Only the access code is entered by the player; provider keys never enter the browser. Without an access code, the endpoint stays closed unless `ALLOW_OPEN_AI_ENDPOINT=1` explicitly enables open access. Leave that override unset for public deployment. No deployment, secret creation, commit or push was performed in this parcel. Plain `npm run dev` serves only Vite, so it exercises browser fallback; the server function requires a compatible function runtime.

## Verification

The final code checks ran headlessly on Node 26.7.0:

```text
npm test
  tests 55
  pass 55
  fail 0
  cancelled 0
  skipped 0
npm run typecheck
  tsc --noEmit — exit 0
npm run build
  vite v6.4.4 — 55 modules transformed
  dist/index.html: 1.68 kB
  dist/assets/index-DXjEzfFv.js: 348.50 kB (103.05 kB gzip)
  built in 1.08s — exit 0
```

React test-renderer deprecation notices are emitted by the headless component tests. All provider responses, microphone events and playback events are synthetic; no test makes a live API call. Browser speech is tested as the default. Missing keys, errors and real timeout paths are covered for AI speech and transcription, along with cache hits, language-specific provider contracts and both transcripts reaching the unchanged answer-checking callback. The Vercel adapter is tested with parsed JSON, string and Buffer bodies, plus repeated invocations sharing the same rate bucket. The new tests verify missing/wrong access codes with zero provider fetches, correct access, the explicit open override, both rate buckets, caps, raw-prompt/config rejection, every typed quiz/workshop path, saved Settings code, the visible app notice and 401 fallback with and without browser recognition.

The production asset scan found no `API_KEY`, `apiKey`, Google provider endpoint or OpenAI provider endpoint strings. The scan tests the built boundary; no real secret was loaded into a build. `git diff --check` passes.

## Unverified details and limits

The three requested model names, the Google Interactions request/response format, Czech support, the OpenAI speech route and multipart plural language hint were checked against the linked official provider documentation. Actual model entitlement for the deployment account, response compatibility under live service conditions, cost, latency and Czech pronunciation were not tested. Neither production Vercel invocation nor platform-origin forwarding was tested against a live deployment. No actual browser/device microphone, codec, autoplay behaviour or Firefox session was exercised; the no-browser-recogniser test simulates that path. The original Gemini generation models are preserved and their live availability was not tested.

## Sources

- [Google speech generation](https://ai.google.dev/gemini-api/docs/speech-generation) supports the Czech model, Interactions contract, voice choices and audio format.
- [Google v1beta discovery specification](https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta) supplies the existing generateContent request shape.
- [OpenAI text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) supplies the English speech contract.
- [OpenAI file transcription](https://developers.openai.com/api/docs/guides/speech-to-text) supplies the recorded-answer contract and language hint.
- [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js) supplies the chosen server adapter convention.
