'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { signInWithGoogle } from '../../../lib/services/authService';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // La redirection OAuth est gérée par Supabase — pas de suite ici
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur de connexion Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-uvci-purple/10 via-white to-uvci-green/10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-uvci-purple to-uvci-green rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl border-b-4 border-black/10 mx-auto mb-5">
            U
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">UVCI Resto</h1>
          <p className="text-gray-400 font-medium mt-1">Espace étudiant &amp; administrateur</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 border-t-4 border-t-uvci-purple">

          <h2 className="text-center text-lg font-extrabold text-gray-700 mb-2">Connexion</h2>
          <p className="text-center text-sm text-gray-400 mb-8 leading-relaxed">
            Utilisez votre compte institutionnel<br />
            <span className="font-bold text-uvci-purple">@uvci.edu.ci</span> pour accéder à l'application.
          </p>

          {/* Bouton Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 text-sm hover:border-uvci-purple/40 hover:bg-uvci-purple/5 hover:shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-uvci-purple" />
            ) : (
              /* Logo Google SVG officiel */
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            <span>{loading ? 'Redirection vers Google…' : 'Continuer avec Google'}</span>
          </button>

          {/* Badge sécurité */}
          <div className="mt-6 flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <ShieldCheck size={18} className="text-uvci-green flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 leading-relaxed">
              Connexion sécurisée via Google. Seuls les comptes{' '}
              <span className="font-bold">@uvci.edu.ci</span> sont autorisés.
              Aucun mot de passe n'est stocké dans l'application.
            </p>
          </div>

          {/* Alerte domaine non autorisé */}
          <div id="domain-warning" className="hidden mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">
              Ce compte Google n'est pas autorisé. Utilisez votre adresse{' '}
              <span className="font-bold">@uvci.edu.ci</span>.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          UVCI Resto © {new Date().getFullYear()} — Usage interne UVCI
        </p>
      </div>
    </div>
  );
}
