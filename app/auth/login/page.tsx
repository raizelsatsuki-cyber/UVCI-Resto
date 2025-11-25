
import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { Button3D } from '../../../components/ui/Button3D';
import { Card3D } from '../../../components/ui/Card3D';
import { toast } from 'react-toastify';
// CHANGEMENT ICI
import { useRouter } from '../../../lib/routerContext';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // --- VALIDATION DU DOMAINE INSTITUTIONNEL ---
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail.endsWith('@uvci.edu.ci')) {
      toast.error("Accès restreint. Utilisez votre email @uvci.edu.ci");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // --- CONNEXION ---
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        
        toast.success("Connexion réussie !");
        
        // Redirection explicite avec le router
        router.push('/menu');
        
      } else {
        // --- INSCRIPTION ---
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          // LOGIQUE ADMIN PROTOTYPE :
          const assignedRole = cleanEmail === 'resto@uvci.edu.ci' ? 'admin' : 'client';

          // FIX FK: Insertion dans public.users pour satisfaire la clé étrangère des commandes
          const { error: userError } = await supabase
            .from('users')
            .upsert({ id: data.user.id, email: cleanEmail });

          if (userError) console.warn("Erreur insertion users:", userError);

          // Création du profil utilisateur dans public.profiles (Rôles)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: data.user.id, 
                email: cleanEmail, 
                role: assignedRole 
              }
            ]);

          if (profileError) {
             console.error("Erreur création profil:", profileError);
             if (profileError.code === '23505') { // Code unique violation
                await supabase.from('profiles').update({ role: assignedRole }).eq('id', data.user.id);
             }
          }

          toast.success(`Compte créé ! Vous êtes ${assignedRole === 'admin' ? 'Admin' : 'Client'}. Connectez-vous.`);
          setIsLogin(true); // Basculer vers le login
          setLoading(false); 
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-uvci-purple/10 via-white to-uvci-green/10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-uvci-purple to-uvci-green rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg border-b-4 border-black/10 mx-auto mb-4">
            U
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800">UVCI Resto</h1>
          <p className="text-gray-500 font-medium">Authentification Étudiant & Admin</p>
        </div>

        <Card3D className="p-8 border-t-4 border-t-uvci-purple">
          <div className="flex justify-center mb-6 border-b border-gray-100 pb-2">
            <button
              onClick={() => setIsLogin(true)}
              className={`pb-2 px-4 font-bold text-sm transition-colors relative ${isLogin ? 'text-uvci-purple' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Connexion
              {isLogin && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-uvci-purple rounded-full"></span>}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`pb-2 px-4 font-bold text-sm transition-colors relative ${!isLogin ? 'text-uvci-green' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Inscription
              {!isLogin && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-uvci-green rounded-full"></span>}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email UVCI</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="nom.prenom@uvci.edu.ci"
                  className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none transition-all font-medium text-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-gray-400 ml-1">Uniquement les adresses @uvci.edu.ci sont acceptées.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none transition-all font-medium text-black"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button3D
              type="submit"
              disabled={loading}
              fullWidth
              variant={isLogin ? 'primary' : 'secondary'}
              className="py-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : isLogin ? (
                <span className="flex items-center gap-2">Se connecter <ArrowRight size={18} /></span>
              ) : (
                <span className="flex items-center gap-2">Créer un compte <UserPlus size={18} /></span>
              )}
            </Button3D>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            En continuant, vous acceptez les conditions d'utilisation de l'UVCI Resto App.
          </p>
        </Card3D>
      </div>
    </div>
  );
}
