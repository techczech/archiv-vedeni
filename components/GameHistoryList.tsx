import React from 'react';
import { GameSummary } from '../types';
import Button from './Button';

interface GameHistoryListProps {
  history: GameSummary[];
  onSelectGame: (game: GameSummary) => void;
  onClose: () => void;
}

const GameHistoryList: React.FC<GameHistoryListProps> = ({ history, onSelectGame, onClose }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-serif text-slate-300">Historie Archivu</h3>
        <Button onClick={onClose} variant="secondary" className="px-3 py-1 text-xs">Zavřít</Button>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
        {history.length === 0 ? (
          <div className="text-slate-500 text-center py-8 italic border border-dashed border-slate-800 rounded-lg">
            Zatím žádné záznamy v kronice.
          </div>
        ) : (
          history.map((game) => (
            <div key={game.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-1">{new Date(game.date).toLocaleDateString('cs-CZ')} &bull; {new Date(game.date).toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'})}</div>
                <div className="font-bold text-slate-200">
                  {game.status === 'COMPLETED' ? (
                     <>Vítěz: <span className="text-amber-400">{game.winner}</span> ({game.score}b)</>
                  ) : (
                     <span className="text-slate-500 italic">Nedohráno</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Hráči: {game.players.join(', ')}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="text-right hidden md:block">
                    <div className="text-xs text-slate-500 uppercase">Kola</div>
                    <div className="font-mono text-lg">{game.rounds}</div>
                 </div>
                 
                 <Button 
                   onClick={() => onSelectGame(game)} 
                   variant="secondary" 
                   className="py-2 px-3 text-xs flex items-center gap-2"
                   disabled={!game.history || game.history.length === 0}
                 >
                   <span className="material-icons text-sm">visibility</span>
                   Kronika
                 </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameHistoryList;