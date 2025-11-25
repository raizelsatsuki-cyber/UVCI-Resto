
import React from 'react';
import { Card3D } from '../../components/ui/Card3D';
import { Clock, MapPin, Phone, ShieldCheck, CreditCard, Mail, Info } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 shadow-2xl mb-10">
        <img 
          src="https://uvci.online/portail/assets/images/others/thumb.jpg" 
          alt="Restaurant Ambiance" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-uvci-purple/90 to-uvci-green/80 flex flex-col justify-center px-8 sm:px-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight drop-shadow-md">
            L'Excellence Culinaire<br/>au Cœur du Campus
          </h1>
          <p className="text-white/90 text-lg sm:text-xl max-w-xl font-medium">
            Découvrez une restauration moderne, pensée pour les étudiants et le personnel de l'UVCI. Qualité, rapidité et saveurs locales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Horaires */}
        <div className="lg:col-span-1">
          <Card3D className="h-full p-6 border-t-4 border-t-uvci-purple">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-uvci-purple/10 rounded-xl text-uvci-purple">
                <Clock size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Horaires d'ouverture</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="font-medium text-gray-600">Lundi - Vendredi</span>
                <span className="font-bold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">07:30 - 18:00</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="font-medium text-gray-600">Samedi</span>
                <span className="font-bold text-gray-800 bg-gray-50 px-3 py-1 rounded-lg">08:00 - 14:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Dimanche</span>
                <span className="font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">Fermé</span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
              <Info className="text-blue-500 flex-shrink-0" size={20} />
              <p className="text-sm text-blue-700 font-medium">
                Le service de livraison sur le campus est disponible de 11h à 15h.
              </p>
            </div>
          </Card3D>
        </div>

        {/* Informations Pratiques */}
        <div className="lg:col-span-2">
          <Card3D className="h-full p-6 border-t-4 border-t-uvci-green">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-uvci-green/10 rounded-xl text-uvci-green">
                <ShieldCheck size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Informations Pratiques</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Localisation */}
              <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                <MapPin className="text-uvci-purple mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Localisation</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Siège UVCI, Abidjan Cocody<br/>
                    Deux-Plateaux, Rue K4<br/>
                    <span className="text-xs text-gray-400 font-medium">Bâtiment Principal, RDC</span>
                  </p>
                </div>
              </div>

              {/* Paiement */}
              <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                <CreditCard className="text-[#1dc4ff] mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Moyens de Paiement</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    • Wave (Mobile Money)<br/>
                    • Espèces à la caisse<br/>
                    • Points de fidélité UVCI
                  </p>
                </div>
              </div>

              {/* Contact */}
              <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                <Phone className="text-uvci-green mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Nous Contacter</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Tel: +225 07 07 10 20 30<br/>
                    Email: resto@uvci.edu.ci
                  </p>
                </div>
              </div>

              {/* Hygiène */}
              <div className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                <ShieldCheck className="text-orange-500 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">Allergènes & Hygiène</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Nos plats sont préparés dans le strict respect des normes d'hygiène. La liste des allergènes est indiquée sur chaque plat.
                  </p>
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </div>
    </div>
  );
}
