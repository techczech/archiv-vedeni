import { GameState, GameSummary, GameStatus, Question, FamilyMember } from '../types';
import { STARTER_QUESTIONS } from '../data/starterQuestions';

const STORAGE_KEYS = {
  ACTIVE_GAME: 'archivari_active_game',
  ARCHIVE: 'archivari_archive_v2', 
  GLOBAL_ASKED_ENTITIES: 'archivari_global_entities',
  QUESTION_BANK: 'archivari_question_bank',
  FAMILY_MEMBERS: 'archivari_family_v1'
};

// --- AUTO-SAVE (CRASH RECOVERY) ---
export const saveActiveGame = (state: GameState) => {
  const stateToSave = { ...state, lastPlayed: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, JSON.stringify(stateToSave));
};

export const loadActiveGame = (): GameState | null => {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME);
  return data ? JSON.parse(data) : null;
};

export const clearActiveGame = () => {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_GAME);
};

// --- GLOBAL ENTITY TRACKING ---
export const getGlobalAskedEntities = (): string[] => {
  const data = localStorage.getItem(STORAGE_KEYS.GLOBAL_ASKED_ENTITIES);
  return data ? JSON.parse(data) : [];
};

const updateGlobalAskedEntities = (newEntities: string[]) => {
  if (newEntities.length === 0) return;
  const current = getGlobalAskedEntities();
  const updated = [...new Set([...current, ...newEntities])].slice(-1000);
  localStorage.setItem(STORAGE_KEYS.GLOBAL_ASKED_ENTITIES, JSON.stringify(updated));
};

// --- QUESTION BANK MANAGEMENT ---

export const getQuestionBank = (): Question[] => {
  const data = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
  return data ? JSON.parse(data) : [];
};

export const saveQuestionsToBank = (questions: Question[]) => {
  const currentBank = getQuestionBank();
  const bankMap = new Map(currentBank.map(q => [q.text + q.correctIndex, q]));
  
  let addedCount = 0;
  questions.forEach(q => {
    const key = q.text + q.correctIndex;
    if (!bankMap.has(key)) {
      bankMap.set(key, q);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    const updatedBank = Array.from(bankMap.values());
    localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(updatedBank));
  }
};

export const initializeQuestionBank = () => {
  const currentBank = getQuestionBank();
  if (currentBank.length === 0) {
    const formattedStarters = STARTER_QUESTIONS.map(q => ({
      ...q,
      id: crypto.randomUUID(),
      sourceUrl: q.sourceUrl || `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(q.wikipediaSearchQuery || q.text || '')}`
    })) as Question[];
    saveQuestionsToBank(formattedStarters);
  }
};

// --- FAMILY MANAGEMENT ---

export const getFamilyMembers = (): FamilyMember[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS);
  if (!data) return [];
  return JSON.parse(data);
};

export const saveFamilyMembers = (members: FamilyMember[]) => {
  localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(members));
};

// --- ARCHIVE MANAGEMENT (HISTORY & SAVED GAMES) ---

export const getArchive = (): GameSummary[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ARCHIVE);
  return data ? JSON.parse(data) : [];
};

export const saveToArchive = (state: GameState) => {
  const archive = getArchive();
  
  const summary: GameSummary = {
    id: state.id,
    date: state.startTime, 
    winner: state.winner?.name,
    score: state.winner?.score,
    players: state.players.map(p => p.name),
    rounds: state.currentRound,
    status: state.status,
    history: state.history,
    mode: state.config.mode,
    savedState: state.status !== 'COMPLETED' ? state : undefined
  };

  const index = archive.findIndex(g => g.id === state.id);
  let updatedArchive;
  
  if (index >= 0) {
    updatedArchive = [...archive];
    updatedArchive[index] = summary;
  } else {
    updatedArchive = [summary, ...archive];
  }

  localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(updatedArchive));

  if (state.history.length > 0) {
    const questions = state.history.map(h => h.question);
    saveQuestionsToBank(questions);
  }

  if (state.status === 'COMPLETED') {
    const newEntities = state.history.map(h => h.question.keyEntity).filter(Boolean);
    updateGlobalAskedEntities(newEntities);
  }
};

export const deleteFromArchive = (id: string) => {
  const archive = getArchive();
  const updated = archive.filter(g => g.id !== id);
  localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(updated));
};

export const saveAndQuit = (state: GameState) => {
  const suspendedState: GameState = {
    ...state,
    status: 'SUSPENDED',
    lastPlayed: new Date().toISOString()
  };
  saveToArchive(suspendedState);
  clearActiveGame();
};

export const saveCompletedGame = (state: GameState) => {
  saveToArchive({ ...state, status: 'COMPLETED' });
  clearActiveGame();
};
