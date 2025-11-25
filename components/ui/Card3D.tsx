import React from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
}

export const Card3D: React.FC<Card3DProps> = ({ children, className = '' }) => {
  return (
    <div className={`
      bg-white rounded-2xl 
      border border-gray-100 border-b-[6px] border-b-gray-200
      shadow-xl
      transition-all duration-300 ease-out
      hover:-translate-y-2 hover:shadow-2xl hover:border-b-uvci-purple/20
      flex flex-col
      ${className}
    `}>
      {children}
    </div>
  );
};