
import React from 'react';
import Button from './Button';
import Card from './Card';
import { GameMode } from '../types';

interface LandingPageProps {
  onStartGame: () => void;
  onViewHistory: () => void;
  onOpenSettings?: () => void;
  onOpenManual?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartGame, onViewHistory, onOpenSettings, onOpenManual }) => {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 py-8 px-4 animate-fade-in-up">
      
      {/* Hero Section */}
      <section className="text-center space-y-8 min-h-[60vh] flex flex-col justify-center items-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-amber-500/30 bg-amber-900/10 text-amber-400 text-sm font-bold uppercase tracking-widest mb-4">
             <span className="material-icons text-sm">auto_awesome</span> Powered by Google Gemini
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif text-slate-100 drop-shadow-2xl">
            Vstupte do <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">
              Archivu Vědění
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Společenská hra, kde se historie snoubí s umělou inteligencí. 
            Prověřte své znalosti v nekonečném kvízu generovaném v reálném čase.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto relative z-10 pt-8">
          <Button onClick={onStartGame} variant="accent" className="py-4 text-lg shadow-amber-900/50 shadow-xl flex-1 flex items-center justify-center">
            <span className="material-icons mr-2">play_arrow</span>
            Začít novou hru
          </Button>
          <Button onClick={onViewHistory} variant="secondary" className="py-4 text-lg flex-1 bg-slate-900/50 backdrop-blur flex items-center justify-center">
            <span className="material-icons mr-2">history_edu</span>
            Archivní záznamy
          </Button>
        </div>
        
        <div className="flex gap-6 mt-12 relative z-10">
          <button onClick={onOpenManual} className="text-slate-500 hover:text-amber-400 transition-colors flex flex-col items-center gap-1 text-[10px] uppercase font-bold tracking-[0.2em] cursor-pointer">
            <span className="material-icons text-lg">menu_book</span>
            Příručka
          </button>
          <button onClick={scrollToHowItWorks} className="text-slate-500 hover:text-amber-400 transition-colors flex flex-col items-center gap-1 text-[10px] uppercase font-bold tracking-[0.2em] animate-bounce cursor-pointer">
            <span className="material-icons text-lg">expand_more</span>
            Jak to funguje
          </button>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="space-y-12 pt-12 border-t border-slate-800">
        <div className="text-center">
          <h2 className="text-3xl font-serif text-white mb-4">Herní Režimy</h2>
          <p className="text-slate-400">Archiv nabízí tři způsoby, jak prokázat své znalosti.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-default h-full">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-amber-500">
              <span className="material-icons text-2xl">school</span>
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">{GameMode.CLASSIC}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Tradiční kvízový souboj. Každý hráč dostává vlastní otázky s výběrem možností. 
              Sbírejte body za správné odpovědi, využívejte nápovědy a staňte se hlavním Archivářem.
            </p>
          </Card>

          <Card className="cursor-default h-full">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-amber-500">
              <span className="material-icons text-2xl">sports_kabaddi</span>
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">{GameMode.CHALLENGE}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Strategická varianta. Hráč na tahu přečte otázku a <b>vyzve soupeře</b>. 
              Pokud vyzvaný odpoví správně, získává body on. Pokud chybuje, body získává vyzyvatel.
            </p>
          </Card>

          <Card className="cursor-default h-full border-amber-500/30 bg-amber-900/10">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-amber-500">
              <span className="material-icons text-2xl">gavel</span>
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-2">{GameMode.JUDGE}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Žádné možnosti, jen vaše znalosti. Odpovídejte <b>hlasem</b> nebo textem vlastními slovy. 
              Umělá inteligence v roli soudce vyhodnotí přesnost a udělí <b>bonusové body</b> za expertní detaily.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer CTA & Settings Link */}
      <section className="text-center py-12 border-t border-slate-900 mt-16">
         <h2 className="text-2xl text-slate-300 mb-6">Jste připraveni otevřít první knihu?</h2>
         <div className="flex flex-col items-center gap-6">
            <Button onClick={onStartGame} variant="primary" className="py-3 px-8 text-lg hover:scale-105 transition-transform">
               Vstoupit do Archivu
            </Button>
            
            <button 
               onClick={onOpenSettings}
               className="text-slate-500 hover:text-amber-500 transition-colors flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
            >
               <span className="material-icons text-sm">settings</span>
               Konfigurace systému a rodiny
            </button>
         </div>
      </section>

    </div>
  );
};

export default LandingPage;
