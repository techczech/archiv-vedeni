
import React, { useEffect } from 'react';
import { Category, Difficulty, Player, GameConfig } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { speak } from '../services/ttsService';

interface CategorySelectorProps {
  onSelect: (category: Category) => void;
  player: Player;
  config: GameConfig;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ onSelect, player, config }) => {
  
  useEffect(() => {
    if (config.ttsEnabled) {
      speak(`Na řadě je ${player.name}. Vyberte si oblast vědění.`, config.ttsMode);
    }
  }, [player.id, config.ttsEnabled, config.ttsMode]);

  // Calculate how many difficulties are remaining for each category
  const getRemainingCount = (cat: Category) => {
    const completed = player.completedCategories.filter(c => c.category === cat).length;
    return 4 - completed; // Now 4 levels total
  };

  // Filter out legacy compatibility keys to avoid duplicate buttons
  const displayCategories = Object.values(Category).filter(cat => cat !== Category.CZECH_WORLD);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8 animate-fade-in-up">
        <h3 className="text-slate-300 text-lg mb-2">Na řadě je</h3>
        <div className="text-3xl font-serif text-amber-400 mb-2">{player.name}</div>
        <p className="text-slate-400">Vyberte oblast pro průzkum:</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {displayCategories.map((cat, idx) => {
          const remaining = getRemainingCount(cat);
          const isExhausted = remaining === 0;

          return (
            <button
              key={cat}
              onClick={() => !isExhausted && onSelect(cat)}
              disabled={isExhausted}
              className={`
                relative overflow-hidden group p-6 rounded-xl border-2 transition-all duration-300
                flex flex-col items-center justify-center gap-3 shadow-lg
                ${isExhausted 
                  ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed grayscale' 
                  : 'bg-slate-800 hover:bg-slate-750 border-transparent hover:border-amber-400/50 hover:shadow-amber-900/20 active:scale-[0.98]'
                }
              `}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner transition-transform group-hover:scale-110
                ${isExhausted ? 'bg-slate-700 text-slate-500' : CATEGORY_COLORS[cat]}
              `}>
                <span className="material-icons">{CATEGORY_ICONS[cat]}</span>
              </div>
              
              <span className={`font-serif font-bold text-lg text-center transition-colors ${isExhausted ? 'text-slate-600' : 'text-slate-200 group-hover:text-amber-400'}`}>
                {cat}
              </span>

              {/* Progress Indicator */}
              <div className="flex gap-1 mt-2">
                 {[1, 2, 3, 4].map((i) => (
                   <div 
                     key={i} 
                     className={`w-2 h-2 rounded-full ${i <= (4 - remaining) ? 'bg-slate-600' : 'bg-amber-500/50'}`}
                   />
                 ))}
              </div>
              
              {isExhausted && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px]">
                  <span className="material-icons text-4xl text-slate-500 rotate-12 border-2 border-slate-500 rounded-full p-2">done_all</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySelector;
