import React from 'react';
import Card from './Card';
import { Player, Question, Difficulty } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, DIFFICULTY_POINTS } from '../constants';

interface ChallengeSelectionScreenProps {
  challenger: Player;
  question: Question;
  availablePlayers: Player[];
  onSelectPlayer: (playerIndex: number) => void;
  players: Player[]; // Full list to map IDs to indices
}

const ChallengeSelectionScreen: React.FC<ChallengeSelectionScreenProps> = ({
  challenger,
  question,
  availablePlayers,
  onSelectPlayer,
  players
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col items-center justify-center text-center mb-8 animate-fade-in-up">
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-3xl font-bold text-slate-900 mb-4 shadow-lg shadow-amber-900/50">
           <span className="material-icons text-4xl">swords</span>
        </div>
        <h2 className="text-3xl font-serif text-white mb-2">Výzva!</h2>
        <p className="text-slate-300 max-w-lg">
          Jsi vyzyvatel <span className="text-amber-400 font-bold">{challenger.name}</span>. 
          Přečti otázku nahlas a vyber, koho chceš vyzvat.
          <br/>
          <span className="text-xs text-slate-500 mt-2 block">(Pokud odpoví špatně, body získáš ty!)</span>
        </p>
      </div>

      {/* Question Preview (No Options) */}
      <Card className="relative overflow-hidden border-amber-500/30">
        <div className="flex items-center gap-3 mb-4 opacity-70">
           <span className={`material-icons p-1 rounded-full text-sm ${CATEGORY_COLORS[question.category]}`}>
             {CATEGORY_ICONS[question.category]}
           </span>
           <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
             {question.category} &bull; {question.difficulty} ({DIFFICULTY_POINTS[question.difficulty]}b)
           </span>
        </div>
        
        <h3 className="text-2xl font-serif text-center text-slate-100 py-4">
          {question.text}
        </h3>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {availablePlayers.map((p) => {
          // Find original index
          const originalIndex = players.findIndex(pl => pl.id === p.id);
          
          return (
            <button
              key={p.id}
              onClick={() => onSelectPlayer(originalIndex)}
              className="group relative p-4 bg-slate-800 border border-slate-700 hover:border-amber-500 hover:bg-slate-750 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-full ${p.avatarColor} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                <span className="material-icons text-white">person</span>
              </div>
              <div className="text-left">
                 <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Vyzvat hráče</div>
                 <div className="text-lg font-bold text-slate-200 group-hover:text-amber-400">{p.name}</div>
                 <div className="text-xs text-amber-500/70">{p.score} bodů</div>
              </div>
              <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="material-icons text-amber-500">arrow_forward</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChallengeSelectionScreen;