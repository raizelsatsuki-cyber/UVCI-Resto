'use client';

import React from 'react';
import { Button3D } from '../components/ui/Button3D';
import { Utensils, Info } from 'lucide-react';
import { useRouter } from '../lib/routerContext';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 flex flex-col items-center justify-center min-h-[75vh] text-center space-y-10 animate-in fade-in zoom-in duration-500 pb-12">
      
      {/* Hero Content */}
      <div className="space-y-6 max-w-3xl">
        <p className="text-gray-500 text-lg sm:text-2xl font-medium max-w-2xl mx-auto leading-relaxed pt-10">
          La solution digitale pour vos pauses déjeuner. Commandez, payez avec Wave, et évitez les files d'attente.
        </p>
      </div>

      {/* 3D Visual Element */}
      <div className="w-full max-w-sm mx-auto relative group my-8">
        <div className="absolute inset-0 bg-gradient-to-r from-uvci-purple to-uvci-green rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
        <img
          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800"
          alt="Délicieux plat"
          className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 object-cover rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border-[8px] border-white transform transition-transform hover:scale-105 duration-500 rotate-6 hover:rotate-0"
        />
        {/* Floating Badges */}
        <div className="absolute top-10 -right-4 bg-white p-3 rounded-2xl shadow-xl transform rotate-12 animate-in slide-in-from-bottom-4 duration-1000 delay-300">
           <span className="text-2xl">⚡</span>
        </div>
        <div className="absolute bottom-10 -left-4 bg-white p-3 rounded-2xl shadow-xl transform -rotate-12 animate-in slide-in-from-bottom-4 duration-1000 delay-500">
           <span className="text-2xl">🥗</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
        <Button3D
          variant="primary"
          onClick={() => router.push('/menu')}
          className="text-lg py-4 flex-1 shadow-uvci-purple/20 shadow-xl"
        >
          <div className="flex items-center justify-center gap-2">
            <Utensils size={24} />
            <span>Commander Maintenant</span>
          </div>
        </Button3D>

        <Button3D
          variant="ghost"
          onClick={() => router.push('/about')}
          className="text-lg py-4 flex-1"
        >
          <div className="flex items-center justify-center gap-2">
            <Info size={24} />
            <span>En savoir plus</span>
          </div>
        </Button3D>
      </div>
    </div>
  );
}
