import React from 'react';

interface HeaderProps {
  onHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHome }) => {
  return (
    <header className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center shadow-xl">
      <div className="flex items-center gap-3">
        {onHome && (
          <button 
            onClick={onHome} 
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors mr-1"
            title="Zpět na úvodní stránku"
          >
            <span className="material-icons">home</span>
          </button>
        )}
        <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-slate-950 font-bold text-xl border-2 border-amber-400">
          <span className="material-icons">auto_stories</span>
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-amber-500 tracking-wider">ARCHIV VĚDĚNÍ</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest hidden sm:block">Společnost pro uchování historie</p>
        </div>
      </div>
      <div className="text-slate-500 text-sm italic font-serif hidden md:block">
        "Scientia Potentia Est"
      </div>
    </header>
  );
};

export default Header;