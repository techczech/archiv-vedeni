import React, { useState } from 'react';
import { TurnHistoryItem } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, DIFFICULTY_POINTS } from '../constants';
import Button from './Button';

interface GameReviewProps {
  history: TurnHistoryItem[];
  onClose: () => void;
}

const GameReview: React.FC<GameReviewProps> = ({ history, onClose }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif text-amber-400">Kronika Hry</h2>
        <Button onClick={onClose} variant="secondary" className="text-sm">Zavřít</Button>
      </div>

      <div className="space-y-4">
        {history.map((item, idx) => {
          const isExpanded = expandedId === idx;
          return (
            <div 
              key={idx} 
              className={`bg-slate-900 border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-amber-500/50 shadow-lg' : 'border-slate-800'}`}
            >
              <button 
                onClick={() => setExpandedId(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${CATEGORY_COLORS[item.question.category]}`}>
                    <span className="material-icons text-lg">{CATEGORY_ICONS[item.question.category]}</span>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                      {item.playerName} &bull; {item.question.category} &bull; {item.question.difficulty}
                    </div>
                    <div className="font-serif text-slate-200 line-clamp-1">{item.question.text}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className={`font-bold ${item.isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                    {item.isCorrect ? `+${item.points}` : '0'}
                  </div>
                  <span className={`material-icons transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                  <div className="mb-4 text-lg text-slate-200 font-serif">
                    {item.question.text}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {item.question.options.map((opt, i) => {
                      let style = "border-slate-700 text-slate-500";
                      if (i === item.question.correctIndex) style = "border-emerald-500 bg-emerald-900/20 text-emerald-300 font-bold";
                      else if (i === item.selectedOptionIndex && !item.isCorrect) style = "border-red-500 bg-red-900/20 text-red-300";
                      
                      return (
                        <div key={i} className={`p-3 rounded border ${style}`}>
                           {opt} {i === item.question.correctIndex && <span className="material-icons text-xs float-right">check</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-800 p-4 rounded-lg mb-4">
                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Vysvětlení</div>
                    <p className="text-slate-300 italic">{item.question.explanation}</p>
                  </div>

                  {item.question.sourceUrl && (
                    <div className="text-right">
                       <a 
                         href={item.question.sourceUrl} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="inline-flex items-center gap-2 text-xs text-amber-500 hover:text-amber-400 uppercase font-bold tracking-wider"
                       >
                         <span className="material-icons text-sm">link</span>
                         Zdroj: {item.question.sourceTitle || 'Odkaz'}
                       </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameReview;