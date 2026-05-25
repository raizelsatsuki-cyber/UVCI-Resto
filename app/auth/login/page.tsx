'use client';

import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, UserPlus, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button3D } from '../../../components/ui/Button3D';
import { Card3D } from '../../../components/ui/Card3D';
import { signIn, signUp, resetPassword } from '../../../lib/services/authService';
import { useRouter } from '../../../lib/routerContext';

type Tab = 'login' | 'register' | 'reset';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@uvci.edu.ci')) {
      toast.error('Accès restreint aux adresses @uvci.edu.ci');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(cleanEmail, password);
        toast.success('Connexion réussie !');
        router.push('/menu');

      } else if (tab === 'register') {
        const { user, session } = await signUp(cleanEmail, password);
        if (session) {
          toast.success('Compte créé ! Bienvenue.');
          router.push('/menu');
        } else if (user) {
          toast.info('Compte créé. Vérifiez votre email pour confirmer votre inscription.');
          setTab('login');
        }

      } else {
        await resetPassword(cleanEmail);
        toast.success('Email de réinitialisation envoyé. Vérifiez votre boîte mail.');
        setTab('login');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-uvci-purple/10 via-white to-uvci-green/10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-uvci-purple to-uvci-green rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg border-b-4 border-black/10 mx-auto mb-4">
            U
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800">UVCI Resto</h1>
          <p className="text-gray-500 font-medium">Espace étudiant & administrateur</p>
        </div>

        <Card3D className="p-8 border-t-4 border-t-uvci-purple">
          {/* Onglets */}
          <div className="flex justify-center mb-6 border-b border-gray-100 pb-2 gap-2">
            {(['login', 'register', 'reset'] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { login: 'Connexion', register: 'Inscription', reset: 'Mot de passe' };
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-2 px-3 font-bold text-xs transition-colors relative ${tab === t ? 'text-uvci-purple' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {labels[t]}
                  {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-uvci-purple rounded-full" />}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email UVCI</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="prenom.nom@uvci.edu.ci"
                  className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none transition-all font-medium text-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-gray-400 ml-1">Uniquement les adresses @uvci.edu.ci sont acceptées.</p>
            </div>

            {/* Mot de passe (masqué sur reset) */}
            {tab !== 'reset' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none transition-all font-medium text-black"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button3D
              type="submit"
              disabled={loading}
              fullWidth
              variant={tab === 'register' ? 'secondary' : 'primary'}
              className="py-4"
            >
              {loading ? (
                <><Loader2 className="animate-spin" /><span>Traitement…</span></>
              ) : tab === 'login' ? (
                <span className="flex items-center gap-2">Se connecter <ArrowRight size={18} /></span>
              ) : tab === 'register' ? (
                <span className="flex items-center gap-2">Créer mon compte <UserPlus size={18} /></span>
              ) : (
                <span className="flex items-center gap-2">Envoyer le lien <KeyRound size={18} /></span>
              )}
            </Button3D>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            En continuant, vous acceptez les conditions d'utilisation de l'UVCI Resto.
          </p>
        </Card3D>
      </div>
    </div>
  );
}
