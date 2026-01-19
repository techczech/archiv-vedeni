
import React, { useState } from 'react';
import { Category, Difficulty, WorkshopSession, WorkshopQuestion, Question, EvaluationResult } from '../types';
import { runWorkshopAgent, refineWorkshopPrompt } from '../services/workshopService';
import { saveQuestionsToBank } from '../services/storageService';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import Card from './Card';
import Button from './Button';

const BATCH_SIZE = 20;

interface WorkshopScreenProps {
  onBack: () => void;
}

const WorkshopScreen: React.FC<WorkshopScreenProps> = ({ onBack }) => {
  const [session, setSession] = useState<WorkshopSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [currentGlobalFeedback, setCurrentGlobalFeedback] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.TRIVIA);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);

  const startSession = () => {
    setSession({
      id: crypto.randomUUID(),
      category: selectedCategory,
      difficulty: selectedDifficulty,
      questions: [],
      positiveExamples: [],
      negativeExamples: [],
      currentBatchFeedback: "",
      systemRefinement: "",
      totalQuestionsProcessed: 0
    });
  };

  const generateOne = async (currentSession: WorkshopSession) => {
    try {
      const res = await runWorkshopAgent(
        currentSession.category, 
        currentSession.difficulty, 
        currentSession.systemRefinement, 
        currentSession.positiveExamples
      );
      return res;
    } catch (e: any) {
      throw e;
    }
  };

  const generateBatch = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const remainingInBatch = BATCH_SIZE - session.questions.length;
      if (remainingInBatch <= 0) return;

      // We generate sequentially to respect few-shot context updates and avoid hitting rate limits too hard, 
      // but users see it as one automated action.
      let currentQuestions = [...session.questions];
      for (let i = 0; i < remainingInBatch; i++) {
        const res = await generateOne(session);
        currentQuestions = [...currentQuestions, res];
        setSession(prev => prev ? {
          ...prev,
          questions: currentQuestions,
          totalQuestionsProcessed: prev.totalQuestionsProcessed + 1
        } : null);
        // Small delay to allow UI to update and not spam the API too fast
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (e: any) {
      alert("Chyba při hromadném generování: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const generateNext = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await generateOne(session);
      setSession(prev => prev ? {
        ...prev,
        questions: [...prev.questions, res],
        totalQuestionsProcessed: prev.totalQuestionsProcessed + 1
      } : null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!session) return;
    setIsRefining(true);
    try {
      const newRefinement = await refineWorkshopPrompt(
        session.questions,
        session.positiveExamples,
        session.negativeExamples,
        currentGlobalFeedback,
        session.systemRefinement
      );
      setSession(prev => prev ? {
        ...prev,
        systemRefinement: newRefinement,
        questions: [] // Clear batch after refinement
      } : null);
      setCurrentGlobalFeedback("");
      alert("Generátor byl aktualizován na základě vašich schválených příkladů a připomínek.");
    } catch (e) {
      alert("Chyba při upřesňování promptu.");
    } finally {
      setIsRefining(false);
    }
  };

  const approveQuestion = (index: number) => {
    if (!session) return;
    const wq = session.questions[index];
    saveQuestionsToBank([wq.question]);
    
    setSession(prev => {
      if (!prev) return null;
      const updatedQuestions = prev.questions.map((item, i) => i === index ? { ...item, status: 'APPROVED' as const } : item);
      return {
        ...prev,
        questions: updatedQuestions,
        positiveExamples: [...prev.positiveExamples, wq.question] // Add to positive examples pool
      };
    });
  };

  const rejectQuestion = (index: number) => {
    if (!session) return;
    const wq = session.questions[index];
    setSession(prev => {
      if (!prev) return null;
      const updatedQuestions = prev.questions.map((item, i) => i === index ? { ...item, status: 'REJECTED' as const } : item);
      return {
        ...prev,
        questions: updatedQuestions,
        negativeExamples: [...prev.negativeExamples, { question: wq.question, feedback: wq.userFeedback || "Neuvedeno" }]
      };
    });
  };

  const updateItemFeedback = (index: number, feedback: string) => {
    if (!session) return;
    setSession(prev => prev ? {
      ...prev,
      questions: prev.questions.map((item, i) => i === index ? { ...item, userFeedback: feedback } : item)
    } : null);
  };

  const isBatchComplete = session && session.questions.length >= BATCH_SIZE;

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-600/20 rounded-2xl flex items-center justify-center mx-auto text-amber-500 shadow-xl shadow-amber-900/20">
            <span className="material-icons text-4xl">build_circle</span>
          </div>
          <h2 className="text-4xl font-serif text-white">Dílna Archiváře</h2>
          <p className="text-slate-400">Poloautomatický generátor (20 otázek v dávce) využívající Gemini 3 Flash.</p>
        </div>

        <Card title="Nové Sezení">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Kategorie</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(Category).filter(c => c !== Category.CZECH_WORLD).map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-amber-900/30 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Obtížnost</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(Difficulty).map(diff => (
                  <button 
                    key={diff} 
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedDifficulty === diff ? 'bg-amber-900/30 border-amber-500 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button onClick={onBack} variant="secondary" fullWidth>Zpět</Button>
              <Button onClick={startSession} variant="accent" fullWidth>Otevřít Dílnu</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${CATEGORY_COLORS[session.category]}`}>
            <span className="material-icons">{CATEGORY_ICONS[session.category]}</span>
          </div>
          <div>
            <h3 className="text-2xl font-serif text-white">{session.category}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              {session.difficulty} &bull; {session.positiveExamples.length} schválených vzorů
            </p>
          </div>
        </div>
        <Button onClick={() => setSession(null)} variant="secondary" className="text-xs">Ukončit sezení</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {session.systemRefinement && (
          <div className="bg-amber-900/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
            <span className="material-icons text-amber-500 text-sm mt-0.5">auto_fix_high</span>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Aktivní pravidla</div>
              <p className="text-xs text-slate-300 italic">"{session.systemRefinement}"</p>
            </div>
          </div>
        )}
        <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
          <span className="material-icons text-emerald-500 text-sm mt-0.5">stars</span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Vzory kvality</div>
            <p className="text-xs text-slate-300">Generátor používá {session.positiveExamples.length} vašich otázek jako vzor.</p>
          </div>
        </div>
      </div>

      {isBatchComplete ? (
        <Card title={`Dávka ${BATCH_SIZE} otázek hotova`}>
          <div className="space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              Zhodnoťte tuto sadu {BATCH_SIZE} otázek. AI analyzuje vaše individuální komentáře i tento globální postřeh pro další upřesnění generátoru.
            </p>
            <div className="space-y-4">
              <textarea 
                value={currentGlobalFeedback}
                onChange={(e) => setCurrentGlobalFeedback(e.target.value)}
                placeholder="Souhrnná zpětná vazba pro inženýra promptů..."
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 outline-none"
              />
              <Button onClick={handleRefine} disabled={isRefining} variant="accent" fullWidth className="py-4 shadow-xl shadow-amber-900/20">
                {isRefining ? "Analýza 20 položek a přeučování..." : "Aktualizovat generátor a vyčistit plochu"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
             <div className="text-sm font-bold text-slate-400">
               Postup: <span className="text-amber-500 font-mono">{session.questions.length} / {BATCH_SIZE}</span>
             </div>
             <div className="flex gap-2">
                <Button onClick={generateBatch} disabled={loading} variant="accent" className="flex items-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-icons text-sm">auto_awesome</span>}
                  Generovat zbytek dávky
                </Button>
                <Button onClick={generateNext} disabled={loading} variant="secondary" className="flex items-center gap-2">
                  <span className="material-icons text-sm">add</span>
                  +1 otázka
                </Button>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {session.questions.map((wq, idx) => (
              <div key={wq.question.id} className={`bg-slate-900 rounded-2xl border transition-all overflow-hidden ${wq.status === 'APPROVED' ? 'border-emerald-500 bg-emerald-950/20' : wq.status === 'REJECTED' ? 'border-red-500 opacity-60' : 'border-slate-800'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-serif text-white pr-8">{wq.question.text}</h4>
                    <div className="flex gap-2 shrink-0">
                       {wq.status === 'PENDING' && (
                         <>
                          <button onClick={() => approveQuestion(idx)} className="w-10 h-10 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all"><span className="material-icons">check</span></button>
                          <button onClick={() => rejectQuestion(idx)} className="w-10 h-10 rounded-full bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all"><span className="material-icons">close</span></button>
                         </>
                       )}
                       {wq.status === 'APPROVED' && <span className="material-icons text-emerald-400">check_circle</span>}
                       {wq.status === 'REJECTED' && <span className="material-icons text-red-400">cancel</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {wq.question.options.map((opt, i) => (
                      <div key={i} className={`p-3 rounded-lg border text-sm ${i === wq.question.correctIndex ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {String.fromCharCode(65+i)}: {opt}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <EvalBadge label="Unikátnost" result={wq.uniquenessEval} />
                    <EvalBadge label="Možnosti" result={wq.distractorEval} />
                    <EvalBadge label="Úroveň" result={wq.levelEval} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                      <span className="material-icons text-xs">rate_review</span>
                      Komentář / Zpětná vazba k položce
                    </label>
                    <textarea 
                      disabled={wq.status !== 'PENDING'}
                      value={wq.userFeedback || ""}
                      onChange={(e) => updateItemFeedback(idx, e.target.value)}
                      placeholder="Specifikujte, co je na této otázce dobře/špatně..."
                      className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EvalBadge: React.FC<{ label: string; result: EvaluationResult }> = ({ label, result }) => {
  return (
    <div className={`p-3 rounded-xl border flex flex-col gap-1 ${result.passed ? 'bg-slate-950 border-emerald-500/20' : 'bg-slate-950 border-amber-500/20'}`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className={`text-xs font-mono font-bold ${result.score >= 7 ? 'text-emerald-500' : 'text-amber-500'}`}>{result.score}/10</span>
      </div>
      <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-tight" title={result.feedback}>{result.feedback}</p>
    </div>
  );
};

export default WorkshopScreen;
