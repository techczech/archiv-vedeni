import { AIAccessError, encodeAudio, requestAI } from './aiClient';

export type RecognitionState = 'idle' | 'listening' | 'transcribing';
type Options = {
  mode: 'browser' | 'ai'; language?: string;
  onTranscript: (text: string) => void;
  onState: (state: RecognitionState) => void;
  onNotice: (message: string) => void;
};

export function createAnswerRecognition(options: Options) {
  let cancelled = false;
  let browser: any;
  let recorder: MediaRecorder | undefined;
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let permissionTimer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const state = (value: RecognitionState) => { if (!cancelled) options.onState(value); };
  const releaseMic = () => { stream?.getTracks().forEach(track => track.stop()); stream = undefined; clearTimeout(timer); };
  const accept = (text: unknown) => {
    if (typeof text !== 'string' || !text.trim()) throw new Error('Empty transcript');
    if (!cancelled) options.onTranscript(text.trim());
  };
  const startBrowser = (fallback = false) => {
    if (cancelled) return;
    const Constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Constructor) {
      options.onNotice('Hlasový vstup prohlížeče není dostupný. Zvolte AI rozpoznávání v nastavení nebo odpověď napište.');
      state('idle'); return;
    }
    if (fallback) options.onNotice('AI rozpoznávání není dostupné. Zopakujte odpověď do mikrofonu prohlížeče.');
    browser = new Constructor();
    browser.lang = options.language?.startsWith('en') ? 'en-GB' : 'cs-CZ';
    browser.continuous = false;
    browser.interimResults = false;
    browser.onresult = (event: any) => { try { accept(event.results?.[0]?.[0]?.transcript); } catch {} state('idle'); };
    browser.onerror = () => { if (!cancelled) options.onNotice('Mikrofon není dostupný. Odpověď můžete napsat.'); state('idle'); };
    browser.onend = () => state('idle');
    try { state('listening'); browser.start(); }
    catch { state('idle'); if (!cancelled) options.onNotice('Mikrofon nelze spustit. Odpověď můžete napsat.'); }
  };
  const fallback = (error?: unknown) => {
    releaseMic(); startBrowser(true);
    if (!cancelled && error instanceof AIAccessError) options.onNotice(error.message);
  };
  const start = async () => {
    if (cancelled) return;
    if (options.mode !== 'ai') { startBrowser(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { fallback(); return; }
    try {
      state('listening');
      const permission = navigator.mediaDevices.getUserMedia({ audio: true });
      let permissionExpired = false;
      // A late permission grant must not leave an unused microphone running.
      permission.then(s => { if (cancelled || permissionExpired) s.getTracks().forEach(t => t.stop()); }, () => {});
      const permissionTimeout = new Promise<never>((_, reject) => {
        permissionTimer = setTimeout(() => { permissionExpired = true; reject(new Error('Microphone timeout')); }, 10000);
      });
      stream = await Promise.race([permission, permissionTimeout]);
      clearTimeout(permissionTimer);
      if (cancelled) { releaseMic(); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Unsupported recording format');
      recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      let size = 0;
      recorder.ondataavailable = event => {
        if (cancelled) return;
        size += event.data.size;
        if (size <= 2_000_000) chunks.push(event.data);
        else if (recorder?.state === 'recording') recorder.stop();
      };
      recorder.onerror = () => { recorder!.onstop = null; if (recorder?.state === 'recording') recorder.stop(); fallback(); };
      recorder.onstop = async () => {
        releaseMic();
        if (cancelled) return;
        state('transcribing');
        try {
          const blob = new Blob(chunks, { type: recorder!.mimeType || mimeType });
          if (!blob.size || size > 2_000_000) throw new Error('Invalid recording');
          const audio = encodeAudio(new Uint8Array(await blob.arrayBuffer()));
          const result = await requestAI<{ text: string }>({ action: 'transcribe', audio, mimeType: blob.type, language: options.language || 'cs' }, controller.signal);
          accept(result.text);
          state('idle');
        } catch (error) { if (!cancelled) fallback(error); }
      };
      recorder.start(1000);
      timer = setTimeout(() => { if (recorder?.state === 'recording') recorder.stop(); }, 45000);
    } catch { clearTimeout(permissionTimer); if (!cancelled) fallback(); }
  };
  return {
    start,
    stop() {
      if (recorder?.state === 'recording') recorder.stop();
      else if (browser) browser.stop();
      else { this.cancel(); options.onState('idle'); }
    },
    cancel() {
      cancelled = true;
      controller.abort();
      clearTimeout(permissionTimer);
      browser?.abort();
      if (recorder?.state === 'recording') { recorder.onstop = null; recorder.stop(); }
      releaseMic();
    },
  };
}
