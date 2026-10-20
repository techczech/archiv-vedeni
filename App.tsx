
import React, { useState, useEffect } from 'react';
import { AI_ACCESS_NOTICE } from './services/aiClient';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SetupScreen from './components/SetupScreen';
import CategorySelector from './components/CategorySelector';
import DifficultySelector from './components/DifficultySelector';
import QuestionScreen from './components/QuestionScreen';
import LandingPage from './components/LandingPage';
import ArchiveScreen from './components/ArchiveScreen';
import SettingsPage from './components/SettingsPage';
import ManualPage from './components/ManualPage';
import WorkshopScreen from './components/WorkshopScreen';
import Button from './components/Button';
import Card from './components/Card';
import { Player, GameState, GamePhase, Category, Difficulty, GameConfig, LifelineType, GameStatus, GameSummary, GameMode, GameSource, AIModel, TTSMode, Question } from './types';
import { generateQuestion, evaluateAnswer, generateBatchQuestions } from './services/geminiService';
import { saveActiveGame, loadActiveGame, saveCompletedGame, clearActiveGame, getGlobalAskedEntities, saveAndQuit, getArchive, getQuestionBank, saveQuestionsToBank, initializeQuestionBank } from './services/storageService';
import { AVATAR_COLORS, MAX_PLAYERS, MIN_PLAYERS, DEFAULT_CONFIG, DIFFICULTY_POINTS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    id: crypto.randomUUID(),
    status: 'ACTIVE',
    startTime: new Date().toISOString(),
    lastPlayed: new Date().toISOString(),
    config: DEFAULT_CONFIG,
    phase: GamePhase.WELCOME,
    players: [],
    currentPlayerIndex: 0,
    challengedPlayerIndex: null,
    currentRound: 1,
    currentCategory: null,
    currentDifficulty: null,
    currentQuestion: null,
    selectedAnswerIndex: null,
    isCorrect: null,
    winner: null,
    history: [],
    hiddenOptions: [],
    hintRevealed: false,
    askedEntityHashes: [],
    roundState: { challengers: [], victims: [] },
    lastChallengerId: null,
    questionDeck: []
  });

  const [activeGameExists, setActiveGameExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [archiveList, setArchiveList] = useState<GameSummary[]>([]);
  const [questionBankCount, setQuestionBankCount] = useState(0);

  useEffect(() => {
    const notify = () => setErrorMsg(AI_ACCESS_NOTICE);
    window.addEventListener('ai-access-required', notify);
    return () => window.removeEventListener('ai-access-required', notify);
  }, []);

  useEffect(() => {
    initializeQuestionBank();
    const saved = loadActiveGame();
    if (saved && saved.phase !== GamePhase.GAME_OVER) {
      setGameState({ ...saved, config: { ...DEFAULT_CONFIG, ...saved.config } });
      setActiveGameExists(true);
    }
    setArchiveList(getArchive());
    setQuestionBankCount(getQuestionBank().length);
  }, []);

  useEffect(() => {
    const activePhases = [
      GamePhase.TURN_START, GamePhase.DIFFICULTY_SELECT, GamePhase.FETCHING_QUESTION,
      GamePhase.CHALLENGE_SELECT, GamePhase.QUESTION_ACTIVE, GamePhase.EVALUATION, GamePhase.ANSWER_RESULT
    ];
    if (activePhases.includes(gameState.phase)) {
      saveActiveGame(gameState);
      setActiveGameExists(true);
    }
  }, [gameState]);

  const shuffleQuestion = (question: Question): Question => {
    if (!question.options || question.options.length === 0) return question;
    const originalOptions = [...question.options];
    const correctOptionText = originalOptions[question.correctIndex];
    const shuffledOptions = [...originalOptions];
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
    const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);
    return {
      ...question,
      options: shuffledOptions,
      correctIndex: newCorrectIndex === -1 ? question.correctIndex : newCorrectIndex
    };
  };

  const handleLandingStart = () => setGameState(prev => ({ ...prev, phase: GamePhase.SETUP }));
  const handleLandingArchive = () => { setArchiveList(getArchive()); setGameState(prev => ({ ...prev, phase: GamePhase.ARCHIVE })); };
  const handleLandingSettings = () => setGameState(prev => ({ ...prev, phase: GamePhase.SETTINGS }));
  const handleLandingManual = () => setGameState(prev => ({ ...prev, phase: GamePhase.MANUAL }));
  const handleGoHome = () => { setGameState(prev => ({ ...prev, phase: GamePhase.WELCOME })); };
  const refreshArchive = () => { setArchiveList(getArchive()); setQuestionBankCount(getQuestionBank().length); };

  const addPlayer = (name: string, color?: string, isChild: boolean = false, group?: string, isHardMode: boolean = false) => {
    if (gameState.players.length >= MAX_PLAYERS) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(), 
      name, 
      score: 0, 
      avatarColor: color || AVATAR_COLORS[gameState.players.length % AVATAR_COLORS.length],
      completedCategories: [], 
      lifelines: { [LifelineType.FIFTY_FIFTY]: true, [LifelineType.HINT]: true }, 
      challengedPlayerIds: [],
      isChild,
      isHardMode,
      group
    };
    setGameState(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
  };

  const updatePlayerColor = (name: string, color: string) => setGameState(prev => ({ ...prev, players: prev.players.map(p => p.name === name ? { ...p, avatarColor: color } : p) }));
  
  const updatePlayerDifficulty = (id: string, isHardMode: boolean) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, isHardMode } : p)
    }));
  };

  const removePlayer = (id: string) => setGameState(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
  const updateConfig = (newConfig: GameConfig) => setGameState(prev => ({ ...prev, config: newConfig }));

  const startGame = () => {
    if (gameState.players.length < MIN_PLAYERS) return;
    clearActiveGame();
    setGameState(prev => ({
      ...prev, id: crypto.randomUUID(), startTime: new Date().toISOString(), phase: GamePhase.TURN_START,
      currentRound: 1, currentPlayerIndex: 0, challengedPlayerIndex: null, history: [], askedEntityHashes: [],
      roundState: { challengers: [], victims: [] }, lastChallengerId: null
    }));
  };

  const resumeGame = () => {
    const saved = loadActiveGame();
    if (saved) setGameState(saved);
    setActiveGameExists(false); 
  };

  const discardActiveGame = () => {
    clearActiveGame();
    setActiveGameExists(false);
    setGameState(prev => ({ ...prev, id: crypto.randomUUID(), players: [], history: [], currentRound: 1, roundState: { challengers: [], victims: [] }, questionDeck: [] }));
  };

  const handleCategorySelect = (category: Category) => setGameState(prev => ({ ...prev, currentCategory: category, phase: GamePhase.DIFFICULTY_SELECT }));

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    const category = gameState.currentCategory;
    if (!category) return;

    if (gameState.config.source === GameSource.BANK) {
      const bank = getQuestionBank();
      const askedInThisGame = new Set(gameState.history.map(h => h.question.id));
      const availableInBank = bank.filter(q => q.category === category && q.difficulty === difficulty && !askedInThisGame.has(q.id));

      if (availableInBank.length > 0) {
        const rawQuestion = availableInBank[Math.floor(Math.random() * availableInBank.length)];
        const question = shuffleQuestion(rawQuestion);
        setGameState(prev => ({
          ...prev, currentDifficulty: difficulty, currentQuestion: question, phase: GamePhase.QUESTION_ACTIVE,
          selectedAnswerIndex: null, isCorrect: null, hiddenOptions: [], hintRevealed: false
        }));
        return;
      } else {
        setErrorMsg("Místní archiv už pro tuto kombinaci nemá žádné další unikátní otázky.");
        setGameState(prev => ({ ...prev, phase: GamePhase.DIFFICULTY_SELECT }));
        return;
      }
    }

    setGameState(prev => ({ ...prev, currentDifficulty: difficulty, phase: GamePhase.FETCHING_QUESTION }));
    setLoading(true);
    setErrorMsg(null);
    const isGlobalChildMode = gameState.players[gameState.currentPlayerIndex]?.isChild || false;
    try {
      const rawQuestion = await generateQuestion(category, difficulty, getGlobalAskedEntities(), isGlobalChildMode, gameState.config.model);
      const question = shuffleQuestion(rawQuestion);
      saveQuestionsToBank([question]);
      setQuestionBankCount(getQuestionBank().length);
      setGameState(prev => ({
        ...prev, currentQuestion: question, phase: GamePhase.QUESTION_ACTIVE,
        selectedAnswerIndex: null, isCorrect: null, hiddenOptions: [], hintRevealed: false,
        askedEntityHashes: [...prev.askedEntityHashes, question!.keyEntity].filter(Boolean)
      }));
    } catch (err: any) {
      setErrorMsg(err.message || "Nepodařilo se načíst otázku.");
      setGameState(prev => ({ ...prev, phase: GamePhase.DIFFICULTY_SELECT }));
    } finally { setLoading(false); }
  };

  const handleGenerateBatch = async (count: number) => {
    setIsGeneratingBatch(true);
    setErrorMsg(null);
    try {
      const questions = await generateBatchQuestions(count, gameState.config.model);
      saveQuestionsToBank(questions);
      setQuestionBankCount(getQuestionBank().length);
    } catch (err: any) {
      setErrorMsg(err.message || "Chyba při hromadném generování.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleImportQuestions = (questions: any[]) => {
    const formattedQuestions = questions.map(q => ({
      ...q,
      id: q.id || crypto.randomUUID(),
      sourceUrl: q.sourceUrl || `https://cs.wikipedia.org/w/index.php?search=${encodeURIComponent(q.wikipediaSearchQuery || q.text)}`
    }));
    saveQuestionsToBank(formattedQuestions);
    setQuestionBankCount(getQuestionBank().length);
  };

  const handleAnswer = async (input: number | string) => {
    if (!gameState.currentQuestion || !gameState.currentDifficulty || !gameState.currentCategory) return;
    const activePlayer = gameState.players[gameState.currentPlayerIndex];
    const isJudgeNeeded = activePlayer.isHardMode || gameState.config.mode === GameMode.JUDGE;

    if (isJudgeNeeded) {
       const userAnswerText = typeof input === 'string' ? input : "";
       setGameState(prev => ({ ...prev, phase: GamePhase.EVALUATION }));
       try {
         const judgeResult = await evaluateAnswer(gameState.currentQuestion!, userAnswerText, gameState.config.model);
         const points = Math.floor(DIFFICULTY_POINTS[gameState.currentDifficulty!] * judgeResult.correctnessScore) + judgeResult.bonusPoints;
         const isCorrect = judgeResult.correctnessScore > 0.6;
         setGameState(prev => {
            const updated = [...prev.players];
            updated[prev.currentPlayerIndex].score += points;
            return {
               ...prev, players: updated, phase: GamePhase.ANSWER_RESULT, isCorrect,
               lastJudgeResult: { 
                 scorePercentage: judgeResult.correctnessScore, 
                 bonusPoints: judgeResult.bonusPoints, 
                 verdict: judgeResult.verdict, 
                 userAnswer: userAnswerText 
               },
               history: [{ round: prev.currentRound, playerName: updated[prev.currentPlayerIndex].name, question: prev.currentQuestion!, selectedOptionIndex: -1, isCorrect, points, timestamp: new Date().toISOString(), aiVerdict: judgeResult.verdict, bonusPoints: judgeResult.bonusPoints, userAnswerText: userAnswerText }, ...prev.history]
            };
         });
       } catch (err: any) { setErrorMsg(err.message); setGameState(prev => ({ ...prev, phase: GamePhase.QUESTION_ACTIVE })); }
       return;
    }
    
    if (typeof input !== 'number') return;
    const isCorrect = input === gameState.currentQuestion.correctIndex;
    const points = isCorrect ? DIFFICULTY_POINTS[gameState.currentDifficulty] : 0;
    setGameState(prev => {
       const updated = [...prev.players];
       updated[prev.currentPlayerIndex].score += points;
       return { ...prev, selectedAnswerIndex: input, isCorrect, players: updated, phase: GamePhase.ANSWER_RESULT, history: [{ round: prev.currentRound, playerName: updated[prev.currentPlayerIndex].name, question: prev.currentQuestion!, selectedOptionIndex: input, isCorrect, points, timestamp: new Date().toISOString() }, ...prev.history] };
    });
  };

  const handleManualVerdict = (isCorrect: boolean) => {
    if (!gameState.currentQuestion || !gameState.currentDifficulty) return;
    const points = isCorrect ? DIFFICULTY_POINTS[gameState.currentDifficulty] : 0;
    setGameState(prev => {
       const updated = [...prev.players];
       updated[prev.currentPlayerIndex].score += points;
       return { 
         ...prev, 
         isCorrect, 
         players: updated, 
         phase: GamePhase.ANSWER_RESULT, 
         lastJudgeResult: { 
           scorePercentage: isCorrect ? 1 : 0, 
           bonusPoints: 0, 
           verdict: isCorrect ? "Ostatní badatelé uznali tvou odpověď jako správnou." : "Ostatní badatelé tvou odpověď zamítli.", 
           userAnswer: "Ústní odpověď" 
         },
         history: [{ round: prev.currentRound, playerName: updated[prev.currentPlayerIndex].name, question: prev.currentQuestion!, selectedOptionIndex: -1, isCorrect, points, timestamp: new Date().toISOString() }, ...prev.history] 
       };
    });
  };

  const nextTurn = () => {
    setGameState(prev => {
      const isLast = prev.currentPlayerIndex === prev.players.length - 1;
      if (isLast && prev.currentRound === prev.config.totalRounds) {
        const sorted = [...prev.players].sort((a,b) => b.score - a.score);
        const final = { ...prev, phase: GamePhase.GAME_OVER, winner: sorted[0], status: 'COMPLETED' as GameStatus };
        saveCompletedGame(final); return final;
      }
      return { ...prev, currentPlayerIndex: isLast ? 0 : prev.currentPlayerIndex + 1, currentRound: isLast ? prev.currentRound + 1 : prev.currentRound, phase: GamePhase.TURN_START, currentQuestion: null, currentCategory: null, currentDifficulty: null, lastJudgeResult: undefined };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      <Header onHome={handleGoHome} />
      <div className="flex h-[calc(100vh-80px)]">
        {![GamePhase.WELCOME, GamePhase.SETUP, GamePhase.SETTINGS, GamePhase.GAME_OVER, GamePhase.ARCHIVE, GamePhase.MANUAL, GamePhase.WORKSHOP].includes(gameState.phase) && (
          <Sidebar players={gameState.players} currentPlayerId={gameState.players[gameState.currentPlayerIndex]?.id} currentRound={gameState.currentRound} totalRounds={gameState.config.totalRounds} onPause={() => setGameState(prev => ({ ...prev, phase: GamePhase.SETUP }))} onSaveAndQuit={() => { saveAndQuit(gameState); handleGoHome(); }} />
        )}
        <main className="flex-1 overflow-y-auto relative p-4 md:p-8">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col justify-center">
            {gameState.phase === GamePhase.WELCOME && <LandingPage onStartGame={handleLandingStart} onViewHistory={handleLandingArchive} onOpenSettings={handleLandingSettings} onOpenManual={handleLandingManual} />}
            {gameState.phase === GamePhase.MANUAL && <ManualPage onBack={handleGoHome} />}
            {gameState.phase === GamePhase.WORKSHOP && <WorkshopScreen onBack={handleLandingSettings} />}
            {gameState.phase === GamePhase.SETTINGS && (
              <SettingsPage 
                config={gameState.config} 
                questionBankCount={questionBankCount}
                isGeneratingBatch={isGeneratingBatch}
                onUpdateConfig={updateConfig} 
                onGenerateBatch={handleGenerateBatch}
                onImportBank={handleImportQuestions}
                onGoToArchive={handleLandingArchive}
                onGoToWorkshop={() => setGameState(prev => ({ ...prev, phase: GamePhase.WORKSHOP }))}
                onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.SETUP }))} 
              />
            )}
            {gameState.phase === GamePhase.SETUP && (
              <div className="space-y-6">
                <div className="flex justify-end gap-2">
                  <Button onClick={handleLandingManual} variant="secondary" className="text-xs"><span className="material-icons text-sm mr-2">menu_book</span>Pravidla</Button>
                  <Button onClick={handleLandingSettings} variant="secondary" className="text-xs"><span className="material-icons text-sm mr-2">settings</span>Nastavení AI a Audio</Button>
                </div>
                <SetupScreen 
                  players={gameState.players} 
                  config={gameState.config} 
                  hasActiveGame={activeGameExists} 
                  questionBankCount={questionBankCount} 
                  onAddPlayer={addPlayer} 
                  onUpdatePlayerColor={updatePlayerColor} 
                  onUpdatePlayerDifficulty={updatePlayerDifficulty}
                  onRemovePlayer={removePlayer} 
                  onUpdateConfig={updateConfig} 
                  onStartGame={startGame} 
                  onResumeGame={resumeGame} 
                  onDiscardGame={discardActiveGame} 
                />
              </div>
            )}
            {gameState.phase === GamePhase.ARCHIVE && <ArchiveScreen archive={archiveList} onResume={(state) => { setGameState(state); setActiveGameExists(false); }} onReplay={(s) => setGameState(p => ({ ...p, phase: GamePhase.SETUP }))} onBack={handleGoHome} onRefresh={refreshArchive} />}
            {gameState.phase === GamePhase.TURN_START && <CategorySelector config={gameState.config} player={gameState.players[gameState.currentPlayerIndex]} onSelect={handleCategorySelect} />}
            {gameState.phase === GamePhase.DIFFICULTY_SELECT && gameState.currentCategory && <DifficultySelector category={gameState.currentCategory} player={gameState.players[gameState.currentPlayerIndex]} onSelect={handleDifficultySelect} onBack={() => setGameState(prev => ({ ...prev, phase: GamePhase.TURN_START }))} />}
            {gameState.phase === GamePhase.FETCHING_QUESTION && <div className="text-center animate-pulse"><div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><div className="text-xl font-serif text-amber-400">Archivář hledá v kronikách...</div></div>}
            {[GamePhase.QUESTION_ACTIVE, GamePhase.ANSWER_RESULT, GamePhase.EVALUATION].includes(gameState.phase) && gameState.currentQuestion && (
              <QuestionScreen 
                question={gameState.currentQuestion} 
                config={gameState.config} 
                currentPlayer={gameState.players[gameState.currentPlayerIndex]} 
                onAnswer={handleAnswer} 
                onManualVerdict={handleManualVerdict}
                onNext={nextTurn} 
                onUseLifeline={() => {}} 
                selectedAnswer={gameState.selectedAnswerIndex} 
                isCorrect={gameState.isCorrect} 
                hiddenOptions={gameState.hiddenOptions} 
                hintRevealed={gameState.hintRevealed} 
                judgeResult={gameState.lastJudgeResult} 
                isJudging={gameState.phase === GamePhase.EVALUATION} 
              />
            )}
            {gameState.phase === GamePhase.GAME_OVER && <Card className="text-center"><div className="text-5xl font-serif text-amber-400 mb-4">{gameState.winner?.name} vyhrává!</div><Button onClick={handleGoHome} variant="primary">Domů</Button></Card>}
            {errorMsg && <div role="alert" onClick={() => setErrorMsg(null)} className="fixed bottom-4 right-4 bg-red-900 text-white px-6 py-4 rounded-lg shadow-xl cursor-pointer z-50 flex items-center gap-3"><span className="material-icons">error</span>{errorMsg}</div>}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
