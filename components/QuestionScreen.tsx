
import React, { useState, useEffect, useRef } from 'react';
import { Question, GameConfig, LifelineType, Player, GameMode } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, DIFFICULTY_POINTS, LIFELINE_ICONS } from '../constants';
import { speak, stopAllSpeech, playWarningBeep } from '../services/ttsService';
import { createAnswerRecognition, RecognitionState } from '../services/recognitionService';
import Button from './Button';
import Card from './Card';
import Counter from './Counter';

interface QuestionScreenProps {
  question: Question;
  config: GameConfig;
  currentPlayer: Player;
  challenger?: Player;
  onAnswer: (indexOrText: number | string) => void;
  onManualVerdict: (isCorrect: boolean) => void;
  onNext: () => void;
  onUseLifeline: (type: LifelineType) => void;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  hiddenOptions: number[];
  hintRevealed: boolean;
  judgeResult?: {
    scorePercentage: number;
    bonusPoints: number;
    verdict: string;
    userAnswer: string;
  }; 
  isJudging?: boolean;
}

const QuestionScreen: React.FC<QuestionScreenProps> = ({
  question,
  config,
  currentPlayer,
  challenger,
  onAnswer,
  onManualVerdict,
  onNext,
  onUseLifeline,
  selectedAnswer,
  isCorrect,
  hiddenOptions,
  hintRevealed,
  judgeResult,
  isJudging
}) => {
  const [timeLeft, setTimeLeft] = useState(config.timerDuration);
  const [timerActive, setTimerActive] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  
  const [textAnswer, setTextAnswer] = useState('');
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');
  const [recognitionNotice, setRecognitionNotice] = useState('');
  const recognitionRef = useRef<ReturnType<typeof createAnswerRecognition> | null>(null);
  const isListening = recognitionState === 'listening';
  const cancelRecognition = () => { recognitionRef.current?.cancel(); recognitionRef.current = null; setRecognitionState('idle'); };
  const resultReadRef = useRef(false);

  const isHardMode = currentPlayer.isHardMode || config.mode === GameMode.JUDGE;

  const startTTS = () => {
    setIsTTSPlaying(true);
    setTimerActive(false);
    
    const english = config.speechLanguage === 'en';
    let ttsText = english ? `Question for ${currentPlayer.name}: ${question.text}` : `Otázka pro hráče ${currentPlayer.name}: ${question.text}`;
    if (!isHardMode) {
      ttsText += (english ? ". The options are: " : ". Možnosti jsou: ") + question.options.map((opt, i) => `${String.fromCharCode(65 + i)}, ${opt}`).join(". ");
    }
    
    speak(ttsText, config.ttsMode, config.ttsVoice, () => {
      setIsTTSPlaying(false);
      if (config.timerEnabled && selectedAnswer === null && !judgeResult && !isJudging) {
        setTimerActive(true);
      }
    }, config.speechLanguage);
  };

  const toggleTTS = () => {
    if (isTTSPlaying) {
      stopAllSpeech();
      setIsTTSPlaying(false);
      if (config.timerEnabled && selectedAnswer === null && !judgeResult && !isJudging) {
        setTimerActive(true);
      }
    } else {
      startTTS();
    }
  };

  const handleSelectAnswer = (idx: number) => {
    stopAllSpeech();
    setIsTTSPlaying(false);
    onAnswer(idx);
  };

  const handleJudgeSubmit = () => {
    cancelRecognition();
    stopAllSpeech();
    setIsTTSPlaying(false);
    onAnswer(textAnswer || "Nevím");
  };

  useEffect(() => {
    stopAllSpeech();
    setTimeLeft(config.timerDuration);
    setTextAnswer('');
    resultReadRef.current = false;
    
    if (config.ttsEnabled) {
      startTTS();
    } else {
      setIsTTSPlaying(false);
      if (config.timerEnabled) {
        setTimerActive(true);
      }
    }

    return () => stopAllSpeech();
  }, [question.id, config.ttsEnabled, config.ttsMode, config.ttsVoice, config.speechLanguage, config.timerDuration, config.timerEnabled, currentPlayer.name]);

  useEffect(() => {
    if (!config.ttsEnabled || resultReadRef.current) return;

    const hasAnswered = selectedAnswer !== null || judgeResult;

    if (hasAnswered) {
      resultReadRef.current = true;
      stopAllSpeech();
      setIsTTSPlaying(false);

      let resultSpeech = "";
      if (judgeResult) {
        const prefix = isCorrect ? "Výborně!" : "Bohužel ne.";
        resultSpeech = `${prefix} Verdikt soudce Gem: ${judgeResult.verdict}`;
      } else if (selectedAnswer !== null) {
        if (selectedAnswer === -1) {
          resultSpeech = `Čas vypršel. Správná odpověď byla: ${question.options[question.correctIndex]}.`;
        } else {
          const prefix = isCorrect ? "Správně!" : "Bohužel špatně.";
          const correctText = question.options[question.correctIndex];
          resultSpeech = `${prefix} Správná odpověď je: ${correctText}.`;
        }
      }

      if (resultSpeech) {
        speak(resultSpeech, config.ttsMode, config.ttsVoice, undefined, config.speechLanguage);
      }
    }
  }, [selectedAnswer, isCorrect, judgeResult, config.ttsEnabled, config.mode, question]);

  useEffect(() => {
    if (!timerActive || !config.timerEnabled) return;
    
    if ((selectedAnswer !== null || judgeResult || isJudging) || timeLeft <= 0) {
      setTimerActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 10 && next > 0) {
          playWarningBeep();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, selectedAnswer, config.timerEnabled, judgeResult, isJudging, timerActive]);

  useEffect(() => {
    if (config.timerEnabled && timeLeft === 0 && timerActive) {
       stopAllSpeech();
       setIsTTSPlaying(false);
       if (isHardMode && !judgeResult && !isJudging) {
          onAnswer("Čas vypršel (žádná odpověď)");
       } else if (selectedAnswer === null) {
          onAnswer(-1);
       }
    }
  }, [timeLeft, selectedAnswer, onAnswer, config.timerEnabled, config.mode, judgeResult, isJudging, timerActive, isHardMode]);

  useEffect(() => {
    cancelRecognition();
    setRecognitionNotice('');
    return () => { recognitionRef.current?.cancel(); recognitionRef.current = null; };
  }, [question.id, isHardMode, config.recognitionMode, config.speechLanguage, selectedAnswer, judgeResult, isJudging]);

  const toggleListening = () => {
    if (recognitionState === 'transcribing') return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    stopAllSpeech();
    setIsTTSPlaying(false);
    if (config.timerEnabled) setTimerActive(true);
    recognitionRef.current?.cancel();
    setRecognitionNotice('');
    const session = createAnswerRecognition({
      mode: config.recognitionMode || 'browser', language: config.speechLanguage || 'cs',
      onTranscript: transcript => setTextAnswer(previous => previous ? `${previous} ${transcript}` : transcript),
      onState: setRecognitionState, onNotice: setRecognitionNotice,
    });
    recognitionRef.current = session;
    void session.start();
  };

  const hasAnswered = selectedAnswer !== null || !!judgeResult;
  const isChallengeMode = config.mode === GameMode.CHALLENGE && challenger;
  const progressPercent = (timeLeft / config.timerDuration) * 100;

  // Points calculation for Counter
  const pointsEarned = isCorrect ? (judgeResult ? Math.floor(DIFFICULTY_POINTS[question.difficulty] * judgeResult.scorePercentage) + judgeResult.bonusPoints : DIFFICULTY_POINTS[question.difficulty]) : 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      
      <div className="flex justify-center mb-2">
         <div className="flex items-center gap-3 bg-slate-800 px-5 py-2.5 rounded-full border border-slate-700 shadow-xl">
            <div className={`w-8 h-8 rounded-full ${currentPlayer.avatarColor} shadow-inner flex items-center justify-center`}>
              {currentPlayer.isHardMode && <span className="material-icons text-xs text-white">workspace_premium</span>}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-200 text-sm">{currentPlayer.name} hraje</span>
              {currentPlayer.isHardMode && <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest leading-none">Hard Mode</span>}
            </div>
         </div>
      </div>

      {isChallengeMode && (
         <div className="bg-amber-900/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 opacity-60">
               <span className="text-xs font-bold text-slate-400 uppercase">Vyzyvatel:</span>
               <span className="font-bold text-slate-300">{challenger.name}</span>
            </div>
            <div className="text-amber-500 font-black text-xs uppercase tracking-tighter">Probíhá Výzva</div>
         </div>
      )}

      {/* Timer Display */}
      <div className="flex flex-col gap-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${timeLeft < 10 ? 'opacity-20 bg-red-600' : 'opacity-0'}`} />

        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${CATEGORY_COLORS[question.category]}`}>
              <span className="material-icons text-2xl">{CATEGORY_ICONS[question.category]}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white uppercase tracking-widest text-xs md:text-sm">
                {question.category}
              </span>
              <span className="text-amber-500 text-[10px] font-bold uppercase tracking-tight">
                {question.difficulty} &bull; {DIFFICULTY_POINTS[question.difficulty]} bodů
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={toggleTTS}
                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isTTSPlaying ? 'bg-amber-500 text-slate-900 border-amber-400 animate-pulse shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}
                title={isTTSPlaying ? 'Zastavit předčítání' : 'Přečíst otázku'}
             >
                <span className="material-icons text-xl">{isTTSPlaying ? 'volume_off' : 'volume_up'}</span>
             </button>

             <div className={`flex flex-col items-end transition-colors ${timeLeft < 10 && config.timerEnabled ? 'text-red-500' : 'text-slate-400'}`}>
               <div className="flex items-center gap-2">
                  <span className="material-icons text-sm">hourglass_bottom</span>
                  <span className="font-mono text-3xl font-black">{config.timerEnabled ? timeLeft : '∞'}</span>
               </div>
               {!hasAnswered && config.timerEnabled && (
                 <span className="text-[10px] uppercase font-bold tracking-tighter opacity-50">s</span>
               )}
             </div>
          </div>
        </div>

        {config.timerEnabled && !isTTSPlaying && !hasAnswered && !isJudging && (
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1 shadow-inner relative border border-slate-700/50">
             <div 
               className={`h-full transition-all duration-1000 linear shadow-[0_0_10px_rgba(245,158,11,0.5)] ${timeLeft < 10 ? 'bg-red-500 shadow-red-500/50' : 'bg-amber-500'}`}
               style={{ width: `${progressPercent}%` }}
             />
          </div>
        )}
      </div>

      {!hasAnswered && !isJudging && (
        <div className="flex justify-center gap-4">
           {Object.values(LifelineType).map((type) => {
             const isUsed = !currentPlayer.lifelines[type];
             if (isHardMode && type === LifelineType.FIFTY_FIFTY) return null;

             return (
               <button
                 key={type}
                 onClick={() => onUseLifeline(type)}
                 disabled={isUsed}
                 className={`
                   flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold uppercase tracking-wider transition-all
                   ${isUsed 
                     ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed' 
                     : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60 hover:shadow-indigo-500/20 shadow-lg active:scale-95'
                   }
                 `}
               >
                 <span className="material-icons text-sm">{LIFELINE_ICONS[type]}</span>
                 {type}
               </button>
             );
           })}
        </div>
      )}

      <Card className="min-h-[350px] flex flex-col justify-center relative overflow-hidden border-slate-700/50 shadow-amber-900/10 p-8">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <h2 className="text-2xl md:text-3xl font-serif text-slate-100 text-center leading-relaxed mb-10 relative z-10 px-4">
          {question.text}
        </h2>

        {hintRevealed && (
          <div className="bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-lg mb-8 animate-fade-in-up mx-auto max-w-lg">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase mb-1">
              <span className="material-icons text-sm">lightbulb</span> Nápověda Archiváře
            </div>
            <p className="text-slate-200 italic text-sm">{question.hint}</p>
          </div>
        )}

        {isHardMode && !hasAnswered && !isJudging && (
          <div className="relative z-10 space-y-6 max-w-xl mx-auto w-full">
             <div className="relative">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Zadejte svou odpověď..."
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl p-6 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none min-h-[120px] shadow-inner text-lg"
                />
                <button 
                   onClick={toggleListening}
                   className={`absolute bottom-4 right-4 p-3 rounded-xl transition-all ${isListening ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                   title="Hlasový vstup"
                   aria-label={isListening ? 'Ukončit nahrávání' : 'Hlasový vstup'}
                   aria-pressed={isListening}
                   disabled={recognitionState === 'transcribing'}
                >
                   <span className="material-icons">{isListening ? 'mic' : 'mic_none'}</span>
                </button>
             </div>
             
             <p role="status" className="text-sm text-slate-400">
               {recognitionState === 'transcribing' ? 'Přepisuji odpověď…' : isListening ? 'Poslouchám. Dalším stiskem mikrofonu ukončíte nahrávání.' : recognitionNotice}
             </p>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button disabled={recognitionState === 'transcribing'} onClick={handleJudgeSubmit} variant="accent" className="py-4 text-lg">
                   Posoudit AI (Gem)
                </Button>
                
                <div className="flex gap-2">
                   <button 
                      onClick={() => { cancelRecognition(); onManualVerdict(true); }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
                   >
                      <span className="material-icons">check_circle</span>
                      Správně (Manuál)
                   </button>
                   <button 
                      onClick={() => { cancelRecognition(); onManualVerdict(false); }}
                      className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs transition-all active:scale-95"
                   >
                      <span className="material-icons">cancel</span>
                      Špatně (Manuál)
                   </button>
                </div>
             </div>
             
             <p className="text-center text-[10px] text-slate-500 uppercase font-black tracking-widest">
                Vyberte posouzení umělou inteligencí nebo ostatními hráči
             </p>
          </div>
        )}
        
        {isJudging && (
           <div className="flex flex-col items-center justify-center space-y-6 py-12 relative z-10">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-xl shadow-amber-900/20"></div>
              <div className="text-xl font-serif text-amber-400 animate-pulse">Soudce Gem zkoumá tvá slova...</div>
           </div>
        )}

        {!isHardMode && (
          <div className="grid grid-cols-1 gap-4 relative z-10 max-w-2xl mx-auto w-full px-4">
            {question.options.map((option, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              
              if (isHidden) {
                return <div key={idx} className="h-[68px] rounded-xl border-2 border-slate-800/50 bg-slate-950/20 flex items-center px-4 opacity-50 select-none" aria-hidden="true"></div>;
              }

              let btnClass = "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200";
              
              if (hasAnswered) {
                if (idx === question.correctIndex) {
                  btnClass = "bg-emerald-900/40 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/20";
                } else if (idx === selectedAnswer) {
                  btnClass = "bg-red-900/40 border-red-500 text-red-100 ring-2 ring-red-500/20";
                } else {
                  btnClass = "bg-slate-900/50 border-slate-800 text-slate-600 opacity-50";
                }
              } else {
                btnClass = "bg-slate-800/40 border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200 active:scale-[0.98]";
              }

              return (
                <button
                  key={idx}
                  disabled={hasAnswered}
                  onClick={() => handleSelectAnswer(idx)}
                  className={`
                    p-5 rounded-xl border-2 text-left transition-all duration-200 text-lg flex items-center gap-4 group
                    ${btnClass}
                  `}
                >
                  <span className={`w-9 h-9 rounded-lg border border-current flex items-center justify-center text-sm font-bold opacity-70 group-hover:bg-amber-500 group-hover:text-slate-900 transition-colors ${idx === question.correctIndex && hasAnswered ? 'bg-emerald-500 text-slate-900' : ''}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {hasAnswered && (
        <div className="animate-fade-in-up space-y-4">
          <div className={`p-6 rounded-2xl border-2 flex items-start gap-5 shadow-xl ${isCorrect ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'}`}>
              <span className="material-icons text-3xl">
                {isCorrect ? 'check_circle' : 'cancel'}
              </span>
            </div>
            <div className="flex-1">
              <h4 className={`font-black text-xl uppercase tracking-widest ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                {judgeResult 
                   ? (isCorrect ? 'Verdikt: Přijato' : 'Verdikt: Zamítnuto')
                   : (isCorrect ? 'Vynikající znalosti!' : 'Bohužel, vedle.')
                }
              </h4>
              
              {judgeResult && (
                 <div className="mt-3 mb-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-inner">
                    {judgeResult.userAnswer && (
                       <>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Tvá odpověď</div>
                        <div className="text-slate-200 italic mb-3">"{judgeResult.userAnswer}"</div>
                       </>
                    )}
                    
                    <div className="text-[10px] text-amber-500/70 uppercase font-black tracking-widest mb-1">Soudce Gem</div>
                    <div className="text-slate-100 font-serif leading-relaxed">"{judgeResult.verdict}"</div>
                 </div>
              )}

              <p className="text-slate-300 mt-2 italic leading-relaxed text-sm md:text-base">
                <span className="font-black text-slate-500 not-italic mr-2 uppercase text-xs tracking-widest">Archivní fakt:</span>
                {question.explanation}
              </p>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                 <div className="flex flex-col">
                   <div className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                     {judgeResult
                       ? "Přesnost: "
                       : "Získáno: "
                     }
                     <span className="text-amber-400 text-xl font-mono">
                       <Counter value={judgeResult ? Math.floor(judgeResult.scorePercentage * 100) : pointsEarned} />
                       {judgeResult ? '%' : ' bodů'}
                     </span>
                   </div>
                   {judgeResult && judgeResult.bonusPoints > 0 && (
                      <div className="text-xs text-amber-400 font-bold uppercase animate-pulse mt-0.5">
                         + {judgeResult.bonusPoints} bonus za hloubku vědění
                      </div>
                   )}
                 </div>
                 
                 {question.sourceUrl && (
                   <a 
                     href={question.sourceUrl} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-amber-500/5"
                   >
                     <span className="material-icons text-xs">auto_stories</span>
                     Ověřit u zdroje
                   </a>
                 )}
              </div>
            </div>
          </div>
          <Button onClick={onNext} variant="accent" fullWidth className="text-xl py-5 shadow-amber-900/20">
            POKRAČOVAT V SEANCI
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionScreen;
