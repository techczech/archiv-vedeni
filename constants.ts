
import { Category, Difficulty, GameConfig, LifelineType, GameMode, GameSource, AIModel, TTSMode } from './types';

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.TRIVIA]: 'bg-purple-600 text-white border-purple-800',
  [Category.HISTORY]: 'bg-amber-700 text-white border-amber-900',
  [Category.SPORT]: 'bg-orange-500 text-white border-orange-700',
  [Category.GEOGRAPHY]: 'bg-emerald-600 text-white border-emerald-800',
  [Category.CZECH]: 'bg-blue-600 text-white border-blue-800',
  [Category.WORLD]: 'bg-cyan-600 text-white border-cyan-800',
  [Category.ARTS]: 'bg-rose-600 text-white border-rose-800',
  [Category.CZECH_WORLD]: 'bg-slate-600 text-white border-slate-800', // Legacy
};

export const CATEGORY_ICONS: Record<Category, string> = {
  [Category.TRIVIA]: 'lightbulb',
  [Category.HISTORY]: 'history_edu',
  [Category.SPORT]: 'emoji_events',
  [Category.GEOGRAPHY]: 'public',
  [Category.CZECH]: 'flag',
  [Category.WORLD]: 'language',
  [Category.ARTS]: 'palette',
  [Category.CZECH_WORLD]: 'travel_explore', // Legacy
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.CHILD]: 'Dětská (5b)',
  [Difficulty.EASY]: 'Začátečník (10b)',
  [Difficulty.MEDIUM]: 'Znalec (20b)',
  [Difficulty.HARD]: 'Archivář (30b)'
};

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  [Difficulty.CHILD]: 5,
  [Difficulty.EASY]: 10,
  [Difficulty.MEDIUM]: 20,
  [Difficulty.HARD]: 30
};

export const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
];

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;

export const GEMINI_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

export const DEFAULT_CONFIG: GameConfig = {
  mode: GameMode.CLASSIC,
  source: GameSource.BANK, // Default to predefined questions
  model: AIModel.FLASH,
  timerEnabled: true,
  timerDuration: 90, // Default to 90 seconds
  totalRounds: 5,
  ttsEnabled: false,
  ttsMode: TTSMode.BROWSER,
  ttsVoice: 'Zephyr'
};

export const LIFELINE_ICONS: Record<LifelineType, string> = {
  [LifelineType.FIFTY_FIFTY]: 'contrast',
  [LifelineType.HINT]: 'help_outline'
};
