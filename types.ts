
export enum Category {
  TRIVIA = 'Všeobecný přehled',
  HISTORY = 'Dějiny a Historie',
  SPORT = 'Sport a Výkony',
  GEOGRAPHY = 'Geografie a Cestování',
  CZECH = 'Česko',
  WORLD = 'Evropa a Svět',
  ARTS = 'Umění a Kultura',
  CZECH_WORLD = 'Česko, Evropa a Svět' // Legacy key for starterQuestions.ts compatibility
}

export enum Difficulty {
  CHILD = 'Dětská',
  EASY = 'Lehká',
  MEDIUM = 'Střední',
  HARD = 'Těžká'
}

export enum LifelineType {
  FIFTY_FIFTY = '50/50',
  HINT = 'Nápověda'
}

export enum GameMode {
  CLASSIC = 'Klasická Hra',
  CHALLENGE = 'Výzva',
  JUDGE = 'Soudce Gem'
}

export enum GameSource {
  AI = 'AI Generátor',
  BANK = 'Místní Archiv (Rychlé)'
}

export enum AIModel {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview',
  LITE = 'gemini-flash-lite-latest'
}

export enum TTSMode {
  BROWSER = 'Prohlížeč (Zdarma)',
  GEMINI = 'Gemini TTS (Prémiové)'
}

export type PlayerId = string;

export interface FamilyMember {
  id: string;
  name: string;
  isChild: boolean;
  group?: string;
  defaultColor?: string;
}

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  avatarColor: string;
  completedCategories: { category: Category; difficulty: Difficulty }[];
  lifelines: Record<LifelineType, boolean>;
  challengedPlayerIds: PlayerId[];
  isChild?: boolean;
  isHardMode?: boolean;
  group?: string;
}

export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint: string;
  sourceUrl?: string;
  sourceTitle?: string;
  keyEntity: string;
  wikipediaSearchQuery?: string;
}

export enum GamePhase {
  WELCOME = 'WELCOME',
  SETUP = 'SETUP',
  SETTINGS = 'SETTINGS',
  MANUAL = 'MANUAL',
  TURN_START = 'TURN_START',
  DIFFICULTY_SELECT = 'DIFFICULTY_SELECT',
  FETCHING_QUESTION = 'FETCHING_QUESTION',
  CHALLENGE_SELECT = 'CHALLENGE_SELECT', 
  QUESTION_ACTIVE = 'QUESTION_ACTIVE',
  EVALUATION = 'EVALUATION',
  ANSWER_RESULT = 'ANSWER_RESULT',
  GAME_OVER = 'GAME_OVER',
  GAME_REVIEW = 'GAME_REVIEW',
  HISTORY_VIEW = 'HISTORY_VIEW',
  ARCHIVE = 'ARCHIVE',
  WORKSHOP = 'WORKSHOP'
}

export interface EvaluationResult {
  score: number; // 0 to 10
  feedback: string;
  passed: boolean;
}

export interface WorkshopQuestion {
  question: Question;
  uniquenessEval: EvaluationResult;
  distractorEval: EvaluationResult;
  levelEval: EvaluationResult;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  userFeedback?: string;
}

export interface WorkshopSession {
  id: string;
  category: Category;
  difficulty: Difficulty;
  questions: WorkshopQuestion[];
  positiveExamples: Question[];
  negativeExamples: { question: Question; feedback: string }[];
  currentBatchFeedback: string;
  systemRefinement: string;
  totalQuestionsProcessed: number;
}

export interface TurnHistoryItem {
  round: number;
  playerName: string;
  question: Question;
  selectedOptionIndex: number;
  isCorrect: boolean;
  points: number;
  timestamp: string;
  challengerName?: string;
  userAnswerText?: string;
  aiVerdict?: string;
  bonusPoints?: number;
}

export interface GameConfig {
  mode: GameMode;
  source: GameSource;
  model: AIModel;
  timerEnabled: boolean;
  timerDuration: number;
  totalRounds: number;
  ttsEnabled: boolean;
  ttsMode: TTSMode;
  ttsVoice: string;
}

export type GameStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'SUSPENDED';

export interface RoundState {
  challengers: PlayerId[];
  victims: PlayerId[];
}

export interface GameState {
  id: string;
  status: GameStatus;
  startTime: string;
  lastPlayed: string;
  config: GameConfig;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number; 
  challengedPlayerIndex: number | null; 
  currentRound: number;
  currentCategory: Category | null;
  currentDifficulty: Difficulty | null;
  currentQuestion: Question | null;
  selectedAnswerIndex: number | null;
  isCorrect: boolean | null;
  winner: Player | null;
  history: TurnHistoryItem[];
  hiddenOptions: number[]; 
  hintRevealed: boolean;
  askedEntityHashes: string[]; 
  roundState: RoundState; 
  lastChallengerId: PlayerId | null;
  questionDeck: Question[];
  lastJudgeResult?: {
    scorePercentage: number;
    bonusPoints: number;
    verdict: string;
    userAnswer: string;
  };
}

export interface GameSummary {
  id: string;
  date: string;
  winner?: string;
  score?: number;
  players: string[];
  rounds: number;
  status: GameStatus;
  history: TurnHistoryItem[];
  mode?: GameMode;
  savedState?: GameState;
}
