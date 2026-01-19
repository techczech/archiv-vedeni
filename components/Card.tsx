import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-6 shadow-2xl ${className}`}>
      {title && (
        <h2 className="text-2xl font-serif text-amber-400 mb-6 text-center border-b border-slate-700 pb-2">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;