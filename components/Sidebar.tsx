
import React from 'react';
import { Player } from '../types';
import Button from './Button';
import Counter from './Counter';

interface SidebarProps {
  players: Player[];
  currentPlayerId: string;
  currentRound: number;
  totalRounds: number;
  onPause: () => void;
  onSaveAndQuit: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  players,
  currentPlayerId,
  currentRound,
  totalRounds,
  onPause,
  onSaveAndQuit
}) => {
  // Sort players by score descending for the leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-full transition-all duration-300 shadow-2xl z-20">
      <div className="p-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* Game Status */}
        <div className="mb-8">
          <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-2">Stav Hry</h3>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-slate-300 text-sm">
              Kolo <span className="text-amber-500 font-bold text-lg ml-1">{currentRound}</span> <span className="text-slate-600">/ {totalRounds}</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
               <div 
                 className="bg-amber-500 h-full transition-all duration-500" 
                 style={{ width: `${(currentRound / totalRounds) * 100}%` }}
               />
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <h3 className="text-slate-500 uppercase text-xs font-bold tracking-widest mb-4 flex items-center gap-2">
          <span className="material-icons text-xs">leaderboard</span>
          Žebříček
        </h3>
        
        <div className="space-y-3">
          {sortedPlayers.map((p, idx) => {
            const isCurrentTurn = p.id === currentPlayerId;
            const isLeader = idx === 0 && p.score > 0;
            
            return (
              <div 
                key={p.id} 
                className={`
                  relative p-3 rounded-xl border flex items-center justify-between transition-all duration-300
                  ${isCurrentTurn 
                    ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-900/10 scale-[1.02]' 
                    : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/80'
                  }
                `}
              >
                {/* Active Indicator Dot */}
                {isCurrentTurn && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full" />
                )}

                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`
                    text-xs font-mono font-bold w-5 text-center
                    ${isLeader ? 'text-amber-400' : 'text-slate-500'}
                  `}>
                    {idx + 1}.
                  </div>
                  
                  <div className={`
                    w-8 h-8 rounded-full flex-shrink-0 ${p.avatarColor} shadow-inner flex items-center justify-center
                    ${isLeader ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : ''}
                  `}>
                    {isLeader && <span className="material-icons text-amber-900 text-xs font-bold">emoji_events</span>}
                  </div>
                  
                  <div className="flex flex-col min-w-0">
                    <div className={`font-bold text-sm truncate ${isCurrentTurn ? 'text-white' : 'text-slate-300'}`}>
                      {p.name}
                    </div>
                    {isCurrentTurn && (
                      <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                        Na tahu
                      </div>
                    )}
                  </div>
                </div>

                <div className="font-mono font-bold text-lg text-amber-400 pl-2">
                  <Counter value={p.score} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur space-y-3">
        <Button onClick={onSaveAndQuit} variant="secondary" fullWidth className="text-xs py-2 border-amber-500/20 text-amber-200 hover:bg-amber-900/20">
           <span className="material-icons text-sm mr-2 align-text-bottom">save</span>
           Uložit a Ukončit
        </Button>
        <Button onClick={onPause} variant="secondary" fullWidth className="text-xs py-2 text-slate-400">
           <span className="material-icons text-sm mr-2 align-text-bottom">pause</span>
           Pozastavit
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
