import React, { useState } from 'react';
import { GameSummary, GameState } from '../types';
import Card from './Card';
import Button from './Button';
import GameReview from './GameReview';
import { deleteFromArchive } from '../services/storageService';

interface ArchiveScreenProps {
  archive: GameSummary[];
  onResume: (state: GameState) => void;
  onReplay: (summary: GameSummary) => void; // New prop
  onBack: () => void;
  onRefresh: () => void;
}

const ArchiveScreen: React.FC<ArchiveScreenProps> = ({ archive, onResume, onReplay, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'SAVED' | 'HISTORY'>('SAVED');
  const [selectedReview, setSelectedReview] = useState<GameSummary | null>(null);

  const savedGames = archive.filter(g => g.status !== 'COMPLETED');
  const completedGames = archive.filter(g => g.status === 'COMPLETED');

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Opravdu chcete smazat tento záznam?')) {
      deleteFromArchive(id);
      onRefresh();
    }
  };

  if (selectedReview) {
    return (
      <Card>
         <GameReview history={selectedReview.history} onClose={() => setSelectedReview(null)} />
      </Card>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif text-white">Velký Archiv</h2>
          <p className="text-slate-400">Záznamy minulých i rozepsaných her.</p>
        </div>
        <Button onClick={onBack} variant="secondary">
          <span className="material-icons mr-2 text-sm">arrow_back</span>
          Zpět
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('SAVED')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'SAVED' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Rozepsané Hry ({savedGames.length})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'HISTORY' 
              ? 'border-amber-500 text-amber-500' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Historie ({completedGames.length})
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTab === 'SAVED' && (
          <>
            {savedGames.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                Žádné rozepsané hry.
              </div>
            )}
            {savedGames.map(game => (
              <div key={game.id} className="bg-slate-900 border border-slate-700 hover:border-amber-500/50 rounded-xl p-5 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => handleDelete(game.id, e)} className="text-slate-600 hover:text-red-500 p-2">
                      <span className="material-icons text-sm">delete</span>
                   </button>
                </div>

                <div className="flex justify-between items-start mb-4">
                   <div>
                      <div className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-1">
                         {game.mode} &bull; Kolo {game.rounds}
                      </div>
                      <div className="text-xs text-slate-500">
                         Založeno: {new Date(game.date).toLocaleDateString()}
                      </div>
                   </div>
                   <span className="material-icons text-amber-500/20 text-4xl">edit_note</span>
                </div>

                <div className="mb-6">
                   <div className="text-slate-300 text-sm font-bold mb-2">Hráči:</div>
                   <div className="flex flex-wrap gap-2">
                      {game.players.map((p, i) => (
                         <span key={i} className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">{p}</span>
                      ))}
                   </div>
                </div>

                <Button 
                   onClick={() => game.savedState && onResume(game.savedState)} 
                   variant="accent" 
                   fullWidth
                   className="flex items-center justify-center"
                >
                   <span className="material-icons text-sm mr-2">play_arrow</span>
                   Pokračovat
                </Button>
              </div>
            ))}
          </>
        )}

        {activeTab === 'HISTORY' && (
          <>
            {completedGames.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                Archiv je prázdný.
              </div>
            )}
            {completedGames.map(game => (
              <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                     <div className="text-xs text-slate-500">
                        {new Date(game.date).toLocaleDateString()}
                     </div>
                     <button onClick={(e) => handleDelete(game.id, e)} className="text-slate-600 hover:text-red-500">
                        <span className="material-icons text-sm">delete</span>
                     </button>
                  </div>
                  
                  <div className="mb-4">
                     <div className="text-sm text-slate-400 uppercase tracking-widest">Vítěz</div>
                     <div className="text-xl font-serif text-amber-400 font-bold">{game.winner}</div>
                     <div className="text-sm text-slate-500">{game.score} bodů</div>
                  </div>
                  
                  <div className="text-xs text-slate-500 mb-4">
                     {game.players.length} hráčů &bull; {game.rounds} kol
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                     onClick={() => setSelectedReview(game)} 
                     variant="secondary" 
                     fullWidth
                     className="text-xs"
                  >
                     Kronika
                  </Button>
                  <Button 
                     onClick={() => onReplay(game)} 
                     variant="accent" 
                     fullWidth
                     className="text-xs"
                  >
                     Hrát Znovu
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ArchiveScreen;