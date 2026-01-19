
import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import { Player, GameConfig, GameMode, GameSource, FamilyMember } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS, AVATAR_COLORS } from '../constants';
import { getFamilyMembers } from '../services/storageService';

interface SetupScreenProps {
  players: Player[];
  config: GameConfig;
  hasActiveGame: boolean;
  questionBankCount: number;
  onAddPlayer: (name: string, color?: string, isChild?: boolean, group?: string, isHardMode?: boolean) => void;
  onUpdatePlayerColor: (name: string, color: string) => void;
  onUpdatePlayerDifficulty: (id: string, isHardMode: boolean) => void;
  onRemovePlayer: (id: string) => void;
  onUpdateConfig: (config: GameConfig) => void;
  onStartGame: () => void;
  onResumeGame: () => void;
  onDiscardGame: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  players,
  config,
  hasActiveGame,
  questionBankCount,
  onAddPlayer,
  onUpdatePlayerColor,
  onUpdatePlayerDifficulty,
  onRemovePlayer,
  onUpdateConfig,
  onStartGame,
  onResumeGame,
  onDiscardGame
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    setMembers(getFamilyMembers());
  }, []);

  const handleAdd = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  const toggleMember = (member: FamilyMember) => {
    const existing = players.find(p => p.name === member.name);
    if (existing) {
      onRemovePlayer(existing.id);
    } else {
      if (players.length >= MAX_PLAYERS) return;
      onAddPlayer(member.name, member.defaultColor, member.isChild, member.group);
    }
  };

  const cycleColor = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const activePlayer = players.find(p => p.name === name);
    const currentColor = activePlayer?.avatarColor || AVATAR_COLORS[0];
    const currentIndex = AVATAR_COLORS.indexOf(currentColor);
    const nextColor = AVATAR_COLORS[(currentIndex + 1) % AVATAR_COLORS.length];
    onUpdatePlayerColor(name, nextColor);
  };

  const groups = Array.from(new Set(members.map(m => m.group || 'Ostatní'))).sort();

  const MemberButton: React.FC<{ member: FamilyMember }> = ({ member }) => {
    const selectedPlayer = players.find(p => p.name === member.name);
    const selected = !!selectedPlayer;
    const color = selectedPlayer?.avatarColor || member.defaultColor || AVATAR_COLORS[0];
    
    return (
      <button
        onClick={() => toggleMember(member)}
        className={`group relative p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 outline-none
          ${selected 
            ? 'bg-amber-900/30 border-amber-500 shadow-lg scale-105 z-10' 
            : 'bg-slate-800/40 border-slate-700 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
          }`}
      >
        <div className="relative">
          <div className={`w-11 h-11 rounded-full ${color} border-2 border-white/10 shadow-inner flex items-center justify-center`}>
            {selected && <span className="material-icons text-white text-base">check</span>}
          </div>
          <div 
            onClick={(e) => cycleColor(member.name, e)} 
            className="absolute -top-1 -right-1 w-6 h-6 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-400"
          >
            <span className="material-icons text-[14px]">palette</span>
          </div>
        </div>
        <span className={`text-[12px] font-bold truncate w-full text-center ${selected ? 'text-amber-400' : 'text-slate-400'}`}>
          {member.name}
        </span>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-6 h-full">
        <Card title="Kniha Badatelů" className="flex-1 flex flex-col relative overflow-hidden">
          {hasActiveGame && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
              <span className="material-icons text-5xl text-amber-500 mb-4">pause_circle</span>
              <h3 className="text-2xl font-serif text-white mb-2">Rozepsaná Kronika</h3>
              <div className="w-full space-y-3">
                <Button onClick={onResumeGame} variant="accent" fullWidth className="py-4 text-lg">POKRAČOVAT VE HŘE</Button>
                <Button onClick={onDiscardGame} variant="danger" fullWidth className="text-sm opacity-80">Zahodit a začít znovu</Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-2">
              <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Jméno hosta..." className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white" disabled={hasActiveGame} />
              <Button onClick={handleAdd} disabled={hasActiveGame || !newPlayerName.trim() || players.length >= MAX_PLAYERS} variant="accent"><span className="material-icons">add</span></Button>
            </div>
            <Button onClick={() => setIsMemberSelectorOpen(!isMemberSelectorOpen)} variant="secondary" fullWidth className="flex items-center justify-center gap-2 border-slate-700">
              <span className="material-icons text-amber-500">{isMemberSelectorOpen ? 'expand_less' : 'people_outline'}</span>
              {isMemberSelectorOpen ? 'Zavřít výběr badatelů' : 'Vybrat ze seznamu badatelů'}
            </Button>
          </div>

          {isMemberSelectorOpen && (
            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-700/50 mb-6 animate-fade-in-up max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
              {members.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  V seznamu není nikdo uložen. <br/> Přidejte badatele v Nastavení.
                </div>
              ) : (
                groups.map(group => (
                  <div key={group} className="mb-4">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold mb-3 border-b border-slate-800 pb-1">{group}</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {members.filter(m => (m.group || 'Ostatní') === group).map(member => (
                        <MemberButton key={member.id} member={member} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="space-y-3 flex-1 overflow-y-auto min-h-[150px] mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {players.map(player => (
              <div key={player.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${player.avatarColor} shadow-lg border border-white/10`} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-sm leading-tight">{player.name}</span>
                      {player.isChild && <span className="text-[9px] bg-sky-500 text-white px-1.5 py-0.5 rounded-full font-bold">Dítě</span>}
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">{player.group || 'Host'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onUpdatePlayerDifficulty(player.id, !player.isHardMode)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-all text-[10px] font-bold uppercase tracking-tighter ${player.isHardMode ? 'bg-amber-500 text-slate-900 border-amber-400' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                    title={player.isHardMode ? 'Hard Mode Aktivní (Bez možností)' : 'Standardní obtížnost'}
                  >
                    <span className="material-icons text-xs">{player.isHardMode ? 'workspace_premium' : 'auto_stories'}</span>
                    {player.isHardMode ? 'Hard' : 'Std'}
                  </button>
                  <button onClick={() => onRemovePlayer(player.id)} className="text-slate-500 hover:text-red-400 p-1" disabled={hasActiveGame}><span className="material-icons text-sm">close</span></button>
                </div>
              </div>
            ))}
            {players.length === 0 && !isMemberSelectorOpen && <div className="text-center text-slate-600 py-10 italic border-2 border-dashed border-slate-800 rounded-lg">Přidejte badatele nebo hosta...</div>}
          </div>
          <div className="text-xs text-slate-500 text-center font-mono">{players.length} / {MAX_PLAYERS} aktivních</div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card title="Konfigurace Seance">
          <div className="space-y-6">
            <div>
              <label className="text-slate-300 font-bold block mb-2 uppercase tracking-widest text-xs">Globální Režim</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Object.values(GameMode).map((mode) => (
                  <button key={mode} onClick={() => onUpdateConfig({ ...config, mode })} disabled={hasActiveGame} className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 ${config.mode === mode ? 'bg-amber-900/40 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}>
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            <div>
              <label className="text-slate-300 font-bold block mb-2 uppercase tracking-widest text-xs">Zdroj Otázek</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(GameSource).map((source) => (
                  <button key={source} onClick={() => onUpdateConfig({ ...config, source })} disabled={hasActiveGame} className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center ${config.source === source ? 'bg-amber-900/40 border-amber-500 text-amber-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}>
                    {source}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">Kola</label>
                    <span className="text-amber-500 font-mono font-bold">{config.totalRounds}</span>
                  </div>
                  <input type="range" min="1" max="15" value={config.totalRounds} onChange={(e) => onUpdateConfig({...config, totalRounds: parseInt(e.target.value)})} className="w-full accent-amber-500" disabled={hasActiveGame} />
               </div>
               <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">Timer</label>
                    <span className="text-amber-500 font-mono font-bold">{config.timerEnabled ? `${config.timerDuration}s` : 'Vypnut'}</span>
                  </div>
                  <input 
                    type="range" 
                    min="15" 
                    max="180" 
                    step="15"
                    value={config.timerDuration} 
                    onChange={(e) => onUpdateConfig({...config, timerDuration: parseInt(e.target.value), timerEnabled: true})} 
                    className={`w-full accent-amber-500 ${!config.timerEnabled && 'opacity-30'}`} 
                    disabled={hasActiveGame} 
                  />
               </div>
            </div>
          </div>
        </Card>
        <Button fullWidth onClick={onStartGame} disabled={players.length < MIN_PLAYERS || hasActiveGame} className="py-4 text-xl" variant="accent">ZAČÍT SEANCI</Button>
      </div>
    </div>
  );
};

export default SetupScreen;
