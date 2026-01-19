
import React from 'react';
import Card from './Card';
import Button from './Button';
import { GameMode } from '../types';

interface ManualPageProps {
  onBack: () => void;
}

const ManualPage: React.FC<ManualPageProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-fade-in-up pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-serif text-white">Příručka Archiváře</h2>
          <p className="text-slate-400 uppercase tracking-[0.3em] text-[10px] mt-2 font-bold">Kodex znalostí a pravidel</p>
        </div>
        <Button onClick={onBack} variant="secondary">
          <span className="material-icons text-sm mr-2">arrow_back</span>
          Zpět
        </Button>
      </div>

      {/* Section 1: Basics */}
      <section className="space-y-6">
        <h3 className="text-2xl font-serif text-amber-500 border-b border-slate-800 pb-2">Základy Seance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-slate-300 leading-relaxed">
              Archiv Vědění je interaktivní společenská hra, ve které se hráči vžívají do role badatelů prozkoumávajících zapomenuté svazky historie, umění a vědy. Cílem je nasbírat co nejvíce bodů skrze správné odpovědi na otázky generované umělou inteligencí.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-3 text-sm">
                <span className="material-icons text-amber-500 text-sm">auto_stories</span>
                <span className="text-slate-400"><strong className="text-slate-200">Badatelé:</strong> Do hry lze vstoupit jako uložený člen rodiny nebo host.</span>
              </li>
              <li className="flex gap-3 text-sm">
                <span className="material-icons text-amber-500 text-sm">history_edu</span>
                <span className="text-slate-400"><strong className="text-slate-200">Kronika:</strong> Každá hra se ukládá do archivu, kde si ji můžete kdykoliv zpětně prohlédnout.</span>
              </li>
            </ul>
          </div>
          <Card className="bg-slate-900/40 border-slate-800">
            <h4 className="font-bold text-amber-400 uppercase text-xs tracking-widest mb-4">Bodování a Obtížnost</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-emerald-900/30">
                <span className="font-bold text-emerald-400">LEHKÁ</span>
                <span className="font-mono font-bold">10 bodů</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-amber-900/30">
                <span className="font-bold text-amber-400">STŘEDNÍ</span>
                <span className="font-mono font-bold">20 bodů</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-red-900/30">
                <span className="font-bold text-red-400">TĚŽKÁ</span>
                <span className="font-mono font-bold">30 bodů</span>
              </div>
              <p className="text-[10px] text-slate-500 italic text-center">
                Pozor! V těžké obtížnosti jsou možnosti formulovány jako popisy faktů, nikoliv jako jména či data.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Section 2: Game Modes */}
      <section className="space-y-8">
        <h3 className="text-2xl font-serif text-amber-500 border-b border-slate-800 pb-2">Globální Herní Režimy</h3>
        
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-400">
                 <span className="material-icons">school</span>
               </div>
               <h4 className="text-xl font-bold text-slate-100">{GameMode.CLASSIC}</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Standardní režim pro klidný večer. Hráči se střídají v tazích. V každém tahu si hráč zvolí kategorii a obtížnost. Otázka má 4 možnosti (A, B, C, D), z nichž pouze jedna je správná.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Pravidlo 50/50</div>
                  <div className="text-xs text-slate-300">Odstraní dvě nesprávné odpovědi. Lze použít jednou za hru.</div>
               </div>
               <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-black text-slate-500 mb-1">Nápověda</div>
                  <div className="text-xs text-slate-300">Archivář vám našeptá souvislost k otázce. Lze použít jednou za hru.</div>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-amber-900/30 rounded-full flex items-center justify-center text-amber-400">
                 <span className="material-icons">sports_kabaddi</span>
               </div>
               <h4 className="text-xl font-bold text-slate-100">{GameMode.CHALLENGE}</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Režim zaměřený na interakci mezi hráči. Hráč na tahu (Vyzyvatel) si zvolí otázku, přečte ji nahlas a <strong className="text-amber-500">vybere oběť</strong>.
            </p>
            <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-500/20 text-xs text-amber-200 space-y-2">
               <div className="flex gap-2">
                 <span className="material-icons text-sm">info</span>
                 <span>Pokud vyzvaný odpoví <strong className="text-emerald-400">správně</strong>, získává body on.</span>
               </div>
               <div className="flex gap-2">
                 <span className="material-icons text-sm">info</span>
                 <span>Pokud vyzvaný odpoví <strong className="text-red-400">špatně</strong>, získává body Vyzyvatel.</span>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400">
                 <span className="material-icons">gavel</span>
               </div>
               <h4 className="text-xl font-bold text-slate-100">{GameMode.JUDGE}</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Nejtěžší globální režim. Nikdo nevidí možnosti. Odpovídáte vlastními slovy skrze psaní nebo <strong className="text-emerald-500">mikrofon</strong>. Soudce Gem (AI) pak vyhodnotí vaši odpověď.
            </p>
            <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20 text-xs text-emerald-200">
               <span className="font-bold">Bonus za hloubku vědění:</span> Pokud odpovíte nad rámec otázky (uvedete data, jména navíc), AI vám udělí až 5 bonusových bodů k základu.
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Hard Mode */}
      <section className="space-y-6">
        <h3 className="text-2xl font-serif text-amber-500 border-b border-slate-800 pb-2">Individuální "Hard Mode"</h3>
        <Card className="border-amber-500/50 bg-amber-900/5">
           <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-900/40">
                 <span className="material-icons text-4xl text-slate-900">workspace_premium</span>
              </div>
              <div className="space-y-3">
                 <h4 className="text-xl font-bold text-white uppercase tracking-widest">Mistr Archivář (Hard Mode)</h4>
                 <p className="text-slate-400 text-sm leading-relaxed">
                    V nastavení hráčů můžete u každého jednotlivce zapnout Hard Mode. Tento hráč pak <strong className="text-white">neuvidí žádné možnosti A, B, C, D</strong> bez ohledu na globální režim hry.
                 </p>
                 <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                       <span className="material-icons text-xs">psychology</span>
                       Vyhodnocení přes AI
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                       <span className="material-icons text-xs">groups</span>
                       Ruční verdikt spoluhráčů
                    </div>
                 </div>
              </div>
           </div>
        </Card>
      </section>

      {/* Section 4: Technical */}
      <section className="space-y-6">
        <h3 className="text-2xl font-serif text-amber-500 border-b border-slate-800 pb-2">Konfigurace a Audio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <h4 className="font-bold text-slate-200">Hlasový Asistent (TTS)</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                 Archiv umí předčítat otázky. V nastavení můžete zvolit mezi <strong className="text-slate-200">Gemini TTS</strong> (vyžaduje internet, vysoká kvalita) a <strong className="text-slate-200">Systémovými hlasy</strong>. Na iPadu doporučujeme zvolit hlasy označené jako "Siri" pro nejlepší srozumitelnost.
              </p>
           </div>
           <div className="space-y-4">
              <h4 className="font-bold text-slate-200">Zdroje Znalostí</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                 Můžete hrát buď z <strong className="text-slate-200">AI Generátoru</strong> (vždy nové otázky), nebo z <strong className="text-slate-200">Místního Archivu</strong>. Místní archiv funguje okamžitě i bez internetu a otázky do něj přibývají s každou odehranou hrou nebo hromadným importem v nastavení.
              </p>
           </div>
        </div>
      </section>

      <div className="flex justify-center pt-8 border-t border-slate-900">
         <Button onClick={onBack} variant="accent" className="px-12 py-4 text-xl">ROZUMÍM, JDEME HRÁT</Button>
      </div>
    </div>
  );
};

export default ManualPage;
