---
title: "Archiv vedeni AI voices headless verification"
kind: "evidence"
created: "2026-10-20T20:13:14Z"
project: "/Users/dominiklukes/gitrepos/07_webapps-websites/02_lovable/archiv-vedeni.worktrees/ai-voices"
sources:
  - file: docs/report-ai-voices.md
  - file: tests/ai-speech.test.mjs
  - file: tests/answer-recognition.test.mjs
---
# Archiv vedení AI voices: headless verification

Verified on 20 October 2026 in the isolated ai-voices worktree. No commit or deployment was made. Test responses and device events are synthetic.

Commands and observed results:

- npm ci --ignore-scripts --min-release-age=7 --no-audit --no-fund installed the locked dependency tree successfully.
- npm test passed 30 tests with zero failures, cancellations or skips. It ran through Node's built-in runner with the existing TypeScript compiler and React's headless renderer. Three expected React renderer deprecation notices were printed.
- npm run typecheck ran tsc --noEmit with exit 0.
- npm run build ran Vite 6.4.4 with exit 0, transforming 56 modules. Output: dist/index.html 1.68 kB; dist/assets/index-CtMXS5e-.js 356.12 kB, 106.76 kB gzip; reported build time 548 ms.
- git diff --check passed after removing two newly introduced trailing spaces.
- The built asset scan for API_KEY, apiKey, generativelanguage and api.openai returned no matches.

Tests cover browser defaults; AI cache hits and separation by voice/language; missing-key, HTTP, network, timeout and playback fallback; cancellation of late speech/transcripts; server provider/model contracts; multipart cs hint; safe errors, cross-origin rejection and oversized input; Vercel parsed/string/Buffer bodies; the actual question component submitting both engines' transcripts through onAnswer; AI recognition without browser recognition; permission cancellation; and existing-settings controls.

A regression test first reproduced the microphone-permission race: stop before permission resolved could still create a recorder. The implementation now cancels that pending session, releases late-granted tracks and leaves the recorder uncreated. The test passes.

No windows were opened. No live provider requests were made. Real device microphone/audio behaviour and deployed function behaviour remain unverified.
