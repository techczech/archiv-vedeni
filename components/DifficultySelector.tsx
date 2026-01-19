
import React from 'react';
import { Category, Difficulty, Player } from '../types';
import { DIFFICULTY_LABELS, DIFFICULTY_POINTS, CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import Button from './Button';

interface DifficultySelectorProps {
  category: Category;
  player: Player;
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ category, player, onSelect, onBack }) => {
  
  const isCompleted = (diff: Difficulty) => {
    return player.completedCategories.some(c => c.category === category && c.difficulty === diff);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-8 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-700 mb-4 text-slate-400">
            <span className={`material-icons text-sm ${CATEGORY_COLORS[category].split(' ')[0]} bg-clip-text text-transparent bg-white`}>
              {CATEGORY_ICONS[category]}
            </span>
            <span className="text-sm font-bold uppercase tracking-wider">{category}</span>
         </div>
         <h3 className="text-2xl font-serif text-white">Zvolte náročnost otázky</h3>
         <p className="text-slate-400 mt-2">Vyšší náročnost přináší více bodů, ale větší riziko.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Object.values(Difficulty).map((diff, idx) => {
          const completed = isCompleted(diff);
          
          let btnColor = "bg-slate-800 hover:bg-slate-700 border-slate-600";
          if (diff === Difficulty.CHILD) btnColor = "bg-sky-900/40 hover:bg-sky-900/60 border-sky-800/50 text-sky-100";
          if (diff === Difficulty.EASY) btnColor = "bg-emerald-900/40 hover:bg-emerald-900/60 border-emerald-800/50 text-emerald-100";
          if (diff === Difficulty.MEDIUM) btnColor = "bg-amber-900/40 hover:bg-amber-900/60 border-amber-800/50 text-amber-100";
          if (diff === Difficulty.HARD) btnColor = "bg-red-900/40 hover:bg-red-900/60 border-red-800/50 text-red-100";

          return (
            <button
              key={diff}
              onClick={() => !completed && onSelect(diff)}
              disabled={completed}
              className={`
                relative p-6 rounded-xl border flex items-center justify-between transition-all duration-200
                ${completed ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800' : `${btnColor} shadow-lg active:scale-[0.99]`}
              `}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex flex-col items-start">
                <span className="font-bold text-lg">{DIFFICULTY_LABELS[diff]}</span>
                <span className="text-xs opacity-70 mt-1 uppercase tracking-wider">{diff}</span>
              </div>
              
              <div className="flex items-center gap-4">
                 <span className="text-xl font-serif font-bold opacity-80">{DIFFICULTY_POINTS[diff]} bodů</span>
                 {completed && <span className="material-icons text-green-500">check_circle</span>}
                 {!completed && <span className="material-icons opacity-50">arrow_forward_ios</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-300 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
          <span className="material-icons text-sm">arrow_back</span>
          Zpět na výběr kategorie
        </button>
      </div>
    </div>
  );
};

export default DifficultySelector;
