import React from 'react';

interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button3D: React.FC<Button3DProps> = ({ 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-bold transition-all duration-100 active:translate-y-[4px] active:border-b-0 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-uvci-purple text-white border-b-4 border-[#5a1f66] hover:brightness-110",
    secondary: "bg-uvci-green text-white border-b-4 border-[#006e2f] hover:brightness-110",
    danger: "bg-red-500 text-white border-b-4 border-red-700 hover:brightness-110",
    ghost: "bg-white text-gray-700 border border-gray-200 border-b-4 border-gray-300 hover:bg-gray-50"
  };

  const sizes = "py-3 px-6 rounded-xl text-sm sm:text-base";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};