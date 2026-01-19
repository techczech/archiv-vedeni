import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "py-3 px-6 rounded-lg font-bold transition-all duration-200 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-500",
    secondary: "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-600",
    accent: "bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 shadow-amber-900/50",
    danger: "bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;