'use client';

import React, { useState } from 'react';
import { Loader2, ShieldCheck, Lock, Mail, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { signInWithGoogle, signInWithPassword } from '../../../lib/services/authService';

type Tab = 'student' | 'admin';

export default function LoginPage() {
  const [tab, setTab]           = useState<Tab>('student');
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  /* Connexion Google (étudiants) */
  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur de connexion Google.');
      setLoading(false);
    }
  };

  /* Connexion admin email/mot de passe */
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
      toast.success('Bienvenue, Administrateur !');
    } catch (err: any) {
      toast.error(err.message ?? 'Identifiants incorrects.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-uvci-purple/10 via-white to-uvci-green/10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Resto UVCI"
            className="w-32 h-32 mx-auto object-contain drop-shadow-lg mb-3"
          />
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">Resto UVCI</h1>
          <p className="text-gray-400 text-sm mt-1">La restauration de votre campus</p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Onglets */}
          <div className="flex border-b border-gray-100">
            {(['student', 'admin'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setLoading(false); setEmail(''); setPassword(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-all ${
                  tab === t
                    ? t === 'student'
                      ? 'text-uvci-green border-b-2 border-uvci-green bg-green-50/50'
                      : 'text-uvci-purple border-b-2 border-uvci-purple bg-purple-50/50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t === 'student' ? '🎓 Étudiant' : '🔐 Administration'}
              </button>
            ))}
          </div>

          <div className="p-7">

            {/* ── Onglet Étudiant ── */}
            {tab === 'student' && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Connectez-vous avec votre compte Google institutionnel
                    <br />
                    <span className="font-bold text-uvci-green">@uvci.edu.ci</span>
                  </p>
                </div>

                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-white border-2 border-gray-200 rounded-2xl font-bold text-gray-700 text-sm hover:border-uvci-green/50 hover:bg-green-50/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading
                    ? <Loader2 size={20} className="animate-spin text-uvci-green" />
                    : (
                      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )
                  }
                  <span>{loading ? 'Redirection…' : 'Continuer avec Google'}</span>
                </button>

                <div className="flex items-start gap-2.5 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                  <ShieldCheck size={16} className="text-uvci-green flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700 leading-relaxed">
                    Connexion sécurisée. Seuls les comptes <strong>@uvci.edu.ci</strong> sont autorisés. Aucun mot de passe stocké.
                  </p>
                </div>
              </div>
            )}

            {/* ── Onglet Admin ── */}
            {tab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">Accès réservé au personnel administratif</p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Email administrateur</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="resto@uvci.edu.ci"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none text-sm font-medium bg-gray-50"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none text-sm font-medium bg-gray-50"
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-3.5 bg-uvci-purple text-white font-extrabold rounded-xl hover:bg-uvci-purple/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-2"
                >
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> Connexion…</>
                    : <><Lock size={16} /> Connexion Admin</>}
                </button>

                <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                  <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Espace sécurisé. Ne partagez jamais vos identifiants administrateur.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Resto UVCI © {new Date().getFullYear()} — Usage interne UVCI
        </p>
      </div>
    </div>
  );
}
