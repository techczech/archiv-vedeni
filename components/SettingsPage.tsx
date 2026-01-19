
import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';
import { GameConfig, AIModel, FamilyMember, Question, TTSMode, GameSource } from '../types';
import { saveFamilyMembers, getFamilyMembers, getQuestionBank } from '../services/storageService';
import { AVATAR_COLORS, GEMINI_VOICES } from '../constants';
import { MASTER_USER_PROMPT } from '../prompts';
import { STARTER_MEMBERS, StarterMember } from '../data/starterMembers';

interface SettingsPageProps {
  config: GameConfig;
  questionBankCount: number;
  isGeneratingBatch: boolean;
  onUpdateConfig: (config: GameConfig) => void;
  onGenerateBatch: (count: number) => void;
  onImportBank: (questions: any[]) => void;
  onGoToArchive: () => void;
  onGoToWorkshop: () => void; // Added
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  config, 
  questionBankCount,
  isGeneratingBatch,
  onUpdateConfig, 
  onGenerateBatch,
  onImportBank,
  onGoToArchive,
  onGoToWorkshop,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'BANK' | 'FAMILY' | 'AI' | 'PARAMS'>('PARAMS');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkArea, setShowBulkArea] = useState(false);
  const [showPackSelector, setShowPackSelector] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupData, setBackupData] = useState<{ family?: FamilyMember[], bank?: Question[] } | null>(null);
  const [importOptions, setImportOptions] = useState({ family: true, bank: true });

  const [availableBrowserVoices, setAvailableBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setMembers(getFamilyMembers());
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter(v => 
        v.lang.toLowerCase().includes('cs') || v.lang.toLowerCase().includes('czech')
      );
      setAvailableBrowserVoices(voices);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const saveMembers = (updated: FamilyMember[]) => {
    setMembers(updated);
    saveFamilyMembers(updated);
  };

  const removeMember = (id: string) => {
    saveMembers(members.filter(m => m.id !== id));
  };

  const parseLinesToMembers = (lines: string[]): FamilyMember[] => {
    return lines.map((line, idx) => {
      const parts = line.split(',').map(p => p.trim());
      const name = parts[0];
      const group = parts[1] || 'Ostatní';
      const typeStr = parts.join(' ').toLowerCase();
      const isChild = typeStr.includes('dite') || typeStr.includes('dítě') || typeStr.includes('child') || typeStr.includes('junior');
      
      return {
        id: crypto.randomUUID() + idx + Date.now(),
        name,
        group,
        isChild,
        defaultColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
      };
    });
  };

  const handleSmartImport = () => {
    if (!bulkImportText.trim()) return;
    const lines = bulkImportText.split(/[\n;]/).filter(l => l.trim());
    const newMembers = parseLinesToMembers(lines);
    saveMembers([...members, ...newMembers]);
    setBulkImportText('');
    setShowBulkArea(false);
  };

  const importPackMembers = (pack: StarterMember[]) => {
    const newOnes: FamilyMember[] = pack.map(m => ({
        id: crypto.randomUUID() + Date.now(),
        name: m.name,
        group: m.group,
        isChild: m.isChild,
        defaultColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
    }));
    const existingNames = new Set(members.map(m => m.name));
    const filtered = newOnes.filter(n => !existingNames.has(n.name));
    saveMembers([...members, ...filtered]);
  };

  const openKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    } else {
      alert("Tato funkce je dostupná pouze v prostředí AI Studio.");
    }
  };

  const copyAIPrompt = () => {
    navigator.clipboard.writeText(MASTER_USER_PROMPT);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleImportText = () => {
    try {
      const data = JSON.parse(importJson);
      const questions = Array.isArray(data) ? data : (data.questions || []);
      onImportBank(questions);
      setImportJson('');
      setShowImportArea(false);
    } catch (e) {
      alert("Chyba při zpracování JSONu.");
    }
  };

  const exportData = () => {
    const data = {
      version: "2.4",
      timestamp: new Date().toISOString(),
      family: getFamilyMembers(),
      bank: getQuestionBank()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archiv_vedeni_zaloha_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setBackupData({
          family: json.family || [],
          bank: json.bank || []
        });
      } catch (err) {
        alert("Neplatný soubor zálohy.");
      }
    };
    reader.readAsText(file);
  };

  const confirmFileImport = () => {
    if (!backupData) return;
    if (importOptions.family && backupData.family) {
      const existingNames = new Set(members.map(m => m.name));
      const newOnes = backupData.family.filter(f => !existingNames.has(f.name));
      saveMembers([...members, ...newOnes]);
    }
    if (importOptions.bank && backupData.bank) {
      onImportBank(backupData.bank);
    }
    setBackupData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert("Import dokončen.");
  };

  const groups = Array.from(new Set(members.map(m => m.group || 'Bez skupiny'))).sort();
  const packGroups = Array.from(new Set(STARTER_MEMBERS.map(m => m.group))).sort();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in-up pb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-serif text-white">Konfigurace Archivu</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
            <span className="material-icons text-[10px] mr-1 align-middle">info</span>
            Data jsou vázána na váš prohlížeč
          </p>
        </div>
        <Button onClick={onBack} variant="secondary">Zpět k Hře</Button>
      </div>

      <div className="flex border-b border-slate-800 mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('PARAMS')}
          className={`px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'PARAMS' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="material-icons text-sm mr-2 align-middle">settings_suggest</span>
          Parametry Hry
        </button>
        <button
          onClick={() => setActiveTab('BANK')}
          className={`px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'BANK' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="material-icons text-sm mr-2 align-middle">auto_stories</span>
          Banka Otázek
        </button>
        <button
          onClick={() => setActiveTab('FAMILY')}
          className={`px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'FAMILY' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="material-icons text-sm mr-2 align-middle">groups</span>
          Badatelé
        </button>
        <button
          onClick={() => setActiveTab('AI')}
          className={`px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'AI' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="material-icons text-sm mr-2 align-middle">psychology</span>
          AI & Systém
        </button>
      </div>

      {activeTab === 'PARAMS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Časomíra a Průběh">
             <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex items-center gap-3">
                       <span className={`material-icons ${config.timerEnabled ? 'text-amber-500' : 'text-slate-600'}`}>timer</span>
                       <span className="text-sm font-bold uppercase tracking-widest">Aktivovat časomíru</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.timerEnabled} 
                      onChange={(e) => onUpdateConfig({ ...config, timerEnabled: e.target.checked })} 
                      className="w-6 h-6 accent-amber-500 cursor-pointer" 
                    />
                  </div>
                  
                  {config.timerEnabled && (
                    <div className="space-y-2 px-1">
                      <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                        <span>Délka odpovědi</span>
                        <span className="text-amber-500 font-mono text-base">{config.timerDuration}s</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="300" 
                        step="5"
                        value={config.timerDuration} 
                        onChange={(e) => onUpdateConfig({ ...config, timerDuration: parseInt(e.target.value) })} 
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                        <span>10s</span>
                        <span>150s</span>
                        <span>300s</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-800" />

                <div className="space-y-2 px-1">
                  <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                    <span>Počet kol na hráče</span>
                    <span className="text-amber-500 font-mono text-base">{config.totalRounds}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={config.totalRounds} 
                    onChange={(e) => onUpdateConfig({ ...config, totalRounds: parseInt(e.target.value) })} 
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                    <span>1 kolo</span>
                    <span>10 kol</span>
                    <span>20 kol</span>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                <div className="space-y-4">
                  <label className="text-slate-300 font-bold block uppercase tracking-widest text-xs">Zdroj Otázek</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(GameSource).map((src) => (
                      <button 
                        key={src} 
                        onClick={() => onUpdateConfig({ ...config, source: src })} 
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${config.source === src ? 'bg-amber-900/30 border-amber-500 text-amber-500 ring-1 ring-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
          </Card>

          <Card title="Předčítání (TTS)">
             <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
                    <div className="flex items-center gap-3">
                       <span className={`material-icons ${config.ttsEnabled ? 'text-amber-500' : 'text-slate-600'}`}>volume_up</span>
                       <span className="text-sm font-bold uppercase tracking-widest">Hlasový asistent</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={config.ttsEnabled} 
                      onChange={(e) => onUpdateConfig({ ...config, ttsEnabled: e.target.checked })} 
                      className="w-6 h-6 accent-amber-500 cursor-pointer" 
                    />
                  </div>

                  {config.ttsEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        {Object.values(TTSMode).map((m) => (
                          <button 
                            key={m} 
                            onClick={() => {
                               const firstVoice = m === TTSMode.GEMINI ? GEMINI_VOICES[0] : (availableBrowserVoices[0]?.name || 'default');
                               onUpdateConfig({ ...config, ttsMode: m, ttsVoice: firstVoice });
                            }} 
                            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${config.ttsMode === m ? 'bg-amber-900/20 border-amber-500 shadow-lg ring-1 ring-amber-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500 opacity-60'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-100">{m}</span>
                              {config.ttsMode === m && <span className="material-icons text-amber-500 text-sm">check_circle</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {m === TTSMode.BROWSER ? "Využívá vestavěné hlasy systému (včetně Siri na iPadu)." : "Prémiové hlasy Google AI (vyžaduje internet)."}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <span className="material-icons text-xs">record_voice_over</span>
                          Vybrat Hlas ({config.ttsMode === TTSMode.GEMINI ? 'AI' : 'Systém'})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                           {config.ttsMode === TTSMode.GEMINI ? (
                              GEMINI_VOICES.map(v => (
                                 <button 
                                    key={v} 
                                    onClick={() => onUpdateConfig({ ...config, ttsVoice: v })}
                                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${config.ttsVoice === v ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                 >
                                    {v}
                                 </button>
                              ))
                           ) : (
                              availableBrowserVoices.length > 0 ? (
                                 availableBrowserVoices.map(v => (
                                    <button 
                                       key={v.name} 
                                       onClick={() => onUpdateConfig({ ...config, ttsVoice: v.name })}
                                       className={`py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-between gap-2 ${config.ttsVoice === v.name ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md ring-1 ring-amber-400/30' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                       title={v.name}
                                    >
                                       <span className="truncate flex-1 text-left">{v.name.replace('Microsoft', '').replace('Google', '').trim()}</span>
                                       {v.name.toLowerCase().includes('siri') && <span className="material-icons text-[12px]">apple</span>}
                                       {config.ttsVoice === v.name && <span className="material-icons text-[12px]">check</span>}
                                    </button>
                                 ))
                              ) : (
                                 <div className="col-span-2 text-[10px] text-slate-600 text-center italic py-4 border border-dashed border-slate-800 rounded-xl">
                                    Nenačteny žádné systémové hlasy. <br/> Zkuste obnovit stránku nebo přepnout na Gemini TTS.
                                 </div>
                              )
                           )}
                        </div>
                      </div>
                    </div>
                  )}
             </div>
          </Card>
        </div>
      )}

      {activeTab === 'BANK' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Správa Místního Archivu">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-indigo-500/20">
                <div className="text-sm text-slate-300">Dostupné svazky:</div>
                <div className="text-amber-500 font-bold font-mono text-2xl">{questionBankCount}</div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <Button onClick={() => onGenerateBatch(10)} disabled={isGeneratingBatch} variant="accent" fullWidth className="py-4">
                  {isGeneratingBatch ? 'Sepisuji nové svazky...' : <><span className="material-icons text-sm mr-2">auto_awesome</span> Rychlých 10 otázek přes AI</>}
                </Button>
                <Button onClick={onGoToWorkshop} variant="primary" fullWidth className="py-4 border-amber-500/30 text-amber-200">
                  <span className="material-icons text-sm mr-2">build_circle</span> 
                  Vstoupit do Dílny Archiváře
                </Button>
              </div>

              <div className="h-px bg-slate-800 my-4" />
              <Button onClick={onGoToArchive} variant="secondary" fullWidth className="py-3">
                 <span className="material-icons text-sm mr-2">history_edu</span>
                 Zobrazit Historii Her
              </Button>
            </div>
          </Card>
          <Card title="Pokročilý Import">
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Vložte JSON kód pro hromadné přidání otázek.</p>
              <div className="flex gap-2">
                <Button onClick={copyAIPrompt} variant="secondary" className="flex-1 py-2 text-[10px] flex items-center justify-center gap-2">
                   <span className="material-icons text-sm">{copyFeedback ? 'check' : 'content_copy'}</span>
                   Master Prompt
                </Button>
                <Button onClick={() => setShowImportArea(!showImportArea)} variant="secondary" className="flex-1 py-2 text-[10px] flex items-center justify-center gap-2">
                   <span className="material-icons text-sm">terminal</span>
                   Vložit Text
                </Button>
              </div>
              {showImportArea && (
                <div className="animate-fade-in-up space-y-2">
                   <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} placeholder="Vložte JSON..." className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] font-mono text-emerald-400 outline-none" />
                   <Button onClick={handleImportText} disabled={!importJson.trim()} variant="accent" fullWidth className="py-2 text-xs">Importovat</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'FAMILY' && (
        <div className="space-y-6">
          <Card title="Badatelé v Archivu">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <p className="text-slate-400 text-sm">Seznam osob, které můžete rychle vybrat pro hru.</p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowPackSelector(!showPackSelector)} variant="secondary" className="text-xs">
                     <span className="material-icons text-sm mr-2">library_add</span>
                     Rychlé Balíčky
                  </Button>
                  <Button onClick={() => setShowBulkArea(!showBulkArea)} variant="accent" className="text-xs">
                     <span className="material-icons text-sm mr-2">group_add</span>
                     Vlastní Seznam
                  </Button>
                </div>
              </div>

              {showPackSelector && (
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 animate-fade-in-up">
                   <h4 className="text-xs font-bold uppercase text-amber-500 mb-4 flex items-center gap-2">
                      <span className="material-icons text-sm">auto_awesome_motion</span>
                      Starter Packy Badatelů
                   </h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {packGroups.map(pg => {
                        const mInPack = STARTER_MEMBERS.filter(m => m.group === pg);
                        const names = mInPack.map(m => `${m.name}${m.isChild ? ' (Dítě)' : ''}`).join(', ');
                        
                        return (
                          <div key={pg} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
                             <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-200">{pg}</span>
                                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">{mInPack.length}</span>
                             </div>
                             <p className="text-[10px] text-slate-500 italic line-clamp-2">{names}</p>
                             <div className="flex gap-1 mt-auto">
                                <Button onClick={() => importPackMembers(mInPack)} variant="accent" className="flex-1 py-1 text-[10px]">Import Skupiny</Button>
                                <Button onClick={() => {
                                   const choice = prompt(`Vyberte jména z ${pg} (oddělte čárkou):\n${mInPack.map(m => m.name).join(', ')}`, mInPack.map(m => m.name).join(', '));
                                   if (choice) {
                                      const selectedNames = choice.split(',').map(s => s.trim());
                                      const selectedMembers = mInPack.filter(m => selectedNames.includes(m.name));
                                      importPackMembers(selectedMembers);
                                   }
                                }} variant="secondary" className="py-1 px-2 text-[10px]">Indiv.</Button>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
              )}

              {showBulkArea && (
                <div className="bg-slate-800/50 p-6 rounded-xl border border-amber-500/30 animate-fade-in-up space-y-4">
                  <label className="text-xs font-bold uppercase text-amber-500">Formát: Jméno, Skupina, Dítě (nepovinné)</label>
                  <textarea value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)} placeholder="Petr, Badatelé&#10;Lucie, Badatelé, Dítě" className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm text-white focus:border-amber-500 outline-none" />
                  <div className="flex gap-2">
                    <Button onClick={handleSmartImport} variant="accent" className="flex-1">Importovat</Button>
                    <Button onClick={() => setShowBulkArea(false)} variant="secondary">Zrušit</Button>
                  </div>
                </div>
              )}

              <div className="space-y-8 mt-4">
                {groups.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 italic">
                    Zatím žádní badatelé. Použijte starter packy nebo vlastní seznam výše.
                  </div>
                ) : (
                  groups.map(groupName => (
                    <div key={groupName} className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 border-b border-slate-800 pb-1 flex items-center justify-between">
                         {groupName}
                         <span className="text-[10px] text-slate-600 font-normal">{members.filter(m => m.group === groupName).length} badatelů</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {members.filter(m => m.group === groupName).map(member => (
                          <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 ${member.defaultColor || 'bg-slate-700'} shadow-inner flex items-center justify-center`}>
                                 {member.isChild && <span className="material-icons text-[10px] text-white">child_care</span>}
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="text-sm font-bold text-slate-200 truncate">{member.name}</span>
                                {member.isChild && <span className="text-[9px] text-sky-400 font-bold uppercase">Dítě</span>}
                              </div>
                            </div>
                            <button onClick={() => removeMember(member.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                               <span className="material-icons text-sm">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'AI' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Technologie Gemini">
            <div className="space-y-6">
              <div>
                <label className="text-slate-300 font-bold block mb-2 uppercase tracking-widest text-xs">Výběr Mozku</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: AIModel.FLASH, name: 'Gemini 3 Flash (Standard)' },
                    { id: AIModel.PRO, name: 'Gemini 3 Pro (Expert)' },
                    { id: AIModel.LITE, name: 'Gemini Flash Lite (Eco)' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => onUpdateConfig({ ...config, model: m.id as AIModel })} className={`p-3 rounded-xl border text-left transition-all text-sm ${config.model === m.id ? 'bg-amber-900/30 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                      <div className="font-bold text-slate-100">{m.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                 <Button onClick={openKeyDialog} variant="secondary" fullWidth className="py-3">
                    <span className="material-icons text-sm mr-2">key</span>
                    Správa API Klíče
                 </Button>
              </div>
            </div>
          </Card>
          <Card title="Export / Import Zálohy" className="border-emerald-500/30">
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Přeneste svou banku a badatele mezi prohlížeči.</p>
              <div className="space-y-3">
                <Button onClick={exportData} variant="primary" fullWidth className="py-3 border-emerald-500/30 text-emerald-200 bg-emerald-950/20">
                  <span className="material-icons text-sm mr-2">download</span>
                  Zálohovat vše do souboru
                </Button>
                <div className="relative">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} variant="secondary" fullWidth className="py-3">
                    <span className="material-icons text-sm mr-2">upload</span>
                    Obnovit ze souboru
                  </Button>
                </div>
              </div>
              {backupData && (
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/50 animate-fade-in-up space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={importOptions.family} onChange={() => setImportOptions(p => ({ ...p, family: !p.family }))} className="w-4 h-4 accent-amber-500" />
                      <span className="text-xs text-slate-300">Importovat Badatele ({backupData.family?.length || 0})</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={importOptions.bank} onChange={() => setImportOptions(p => ({ ...p, bank: !p.bank }))} className="w-4 h-4 accent-amber-500" />
                      <span className="text-xs text-slate-300">Importovat Banku ({backupData.bank?.length || 0})</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={confirmFileImport} variant="accent" className="flex-1 py-2 text-xs">Potvrdit</Button>
                    <Button onClick={() => setBackupData(null)} variant="secondary" className="flex-1 py-2 text-xs">Zrušit</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
