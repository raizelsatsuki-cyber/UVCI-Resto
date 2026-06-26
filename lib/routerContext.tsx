'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  push:     (path: string) => void;
  pathname: string;   // chemin seul, sans query string
  search:   string;   // query string complet (ex: "?order=abc")
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) return { push: (path: string) => { window.location.hash = path; } };
  return { push: ctx.push };
};

export const usePathname = () => useContext(RouterContext)?.pathname ?? '/';

/** Retourne les query params de l'URL courante */
export const useSearchParams = () => {
  const search = useContext(RouterContext)?.search ?? '';
  return new URLSearchParams(search.replace(/^\?/, ''));
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({ pathname: '/', search: '' });

  const parseHash = () => {
    const raw = window.location.hash.replace(/^#/, '') || '/';

    // Supabase OAuth redirige vers origin/#access_token=...&token_type=bearer...
    // Ce n'est PAS une route de notre app — on ignore et on retourne '/'
    // AuthContext.onAuthStateChange intercepte les tokens automatiquement.
    if (raw.startsWith('access_token=') || raw.startsWith('/access_token=')) {
      return { pathname: '/', search: '' };
    }

    const qIdx = raw.indexOf('?');
    if (qIdx === -1) return { pathname: raw, search: '' };
    return {
      pathname: raw.slice(0, qIdx),          // ex: /commande/succes
      search:   raw.slice(qIdx),             // ex: ?order=abc123
    };
  };

  useEffect(() => {
    const onHashChange = () => setState(parseHash());
    setState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const push = (path: string) => {
    window.location.hash = path;
    // Scroll-to-top à chaque navigation — évite d'arriver à mi-page
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <RouterContext.Provider value={{ push, ...state }}>
      {children}
    </RouterContext.Provider>
  );
};
