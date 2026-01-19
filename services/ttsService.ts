
import { GoogleGenAI, Modality } from "@google/genai";
import { TTSMode } from "../types";

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const stopAllSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // already stopped
    }
    currentSource = null;
  }
};

export const playWarningBeep = () => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

export const speak = async (text: string, mode: TTSMode, voice: string = 'Zephyr', onEnd?: () => void): Promise<void> => {
  stopAllSpeech();
  
  if (mode === TTSMode.BROWSER) {
    if (!window.speechSynthesis) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'cs-CZ';
    utterance.rate = 1.0;
    
    // Improved voice lookup: check for exact name match first
    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find(v => v.name === voice);
    if (exactVoice) {
      utterance.voice = exactVoice;
    } else {
      // Fallback: any czech voice
      const fallbackVoice = voices.find(v => v.lang.startsWith('cs'));
      if (fallbackVoice) utterance.voice = fallbackVoice;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } else {
    // Gemini TTS
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Missing API key for Gemini TTS");
      onEnd?.();
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `V češtině: ${text}` }] }], 
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        onEnd?.();
        return;
      }

      const ctx = getAudioContext();
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        ctx,
        24000,
        1,
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (currentSource === source) currentSource = null;
        onEnd?.();
      };
      currentSource = source;
      source.start();
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      onEnd?.();
    }
  }
};
