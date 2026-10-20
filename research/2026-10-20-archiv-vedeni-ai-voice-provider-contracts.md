---
title: "Archiv vedeni AI voice provider contracts"
kind: "evidence"
created: "2026-10-20T20:11:19Z"
project: "."
sources:
  - url: "https://ai.google.dev/gemini-api/docs/speech-generation"
  - url: "https://developers.openai.com/api/docs/guides/text-to-speech"
  - url: "https://developers.openai.com/api/docs/guides/speech-to-text"
  - url: "https://vercel.com/docs/functions/runtimes/node-js"
  - url: "https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta"
  - file: index.html
  - file: package.json
---
# Archiv vedení AI voice provider evidence

Observed on 20 October 2026. This captures documentation and local inspection, not a live provider test.

The checked-out application has a Czech HTML language tag, Czech interface, Czech starter questions, Czech generation prompts and Czech browser speech settings. It has a Vite manifest but no original lockfile, server folder, Supabase setup, Cloudflare configuration or Vercel configuration. Its README names several possible static hosts; it does not establish the actual deployed host.

Google's speech generation guide documents Czech support for gemini-3.8-flash-tts. Its REST examples use POST /v1beta/interactions with response_format audio and single-speaker speech_config as an array of voice objects. Unary audio defaults to WAV; raw REST audio is under steps[].content[].data. The implementation explicitly requests audio/wav.

OpenAI's text-to-speech guide documents gpt-4o-mini-tts at POST /v1/audio/speech. The implementation uses MP3 and an allowlisted prebuilt voice for English.

OpenAI's file transcription guide documents gpt-transcribe at POST /v1/audio/transcriptions, with multipart languages[] hints. Its listed formats include WebM and MP4; Ogg is not listed and is excluded. The app records a bounded answer and sends a file with the selected cs or en hint.

Vercel's Node runtime documentation supports an api/ TypeScript server function beside a frontend. Vercel is the new deployment target chosen for this parcel, not a verified historical host.

All provider tests use synthetic responses. Model account access, latency, pronunciation, device microphone codecs and the actual deployed function remain unverified.
