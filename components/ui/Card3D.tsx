import React from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

export const Card3D: React.FC<Card3DProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-white rounded-2xl
        shadow-xl
        border border-gray-100
        [border-bottom-width:6px] [border-bottom-color:#E5E7EB]
        transition-all duration-300 ease-out
        hover:-translate-y-2 hover:shadow-2xl
        flex flex-col
        ${className}
      `}
    >
      {children}
    </div>
  );
};