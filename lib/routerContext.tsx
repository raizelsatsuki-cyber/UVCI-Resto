'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// --- TYPES ---
interface Router {
  push: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
}

// --- CONTEXT ---
const RouterContext = createContext<Router | null>(null);
const PathnameContext = createContext<string>('/');

// --- PROVIDER ---
export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    // Fonction pour synchroniser l'état avec le hash URL
    const handleHashChange = () => {
      // On retire le '#' du début. Si vide, on considère '/'
      const hash = window.location.hash.slice(1) || '/';
      setPathname(hash);
    };
    
    // Initialisation : Si pas de hash, on met '#/' par défaut
    if (!window.location.hash) {
        window.location.hash = '#/';
    }
    handleHashChange();

    // Écoute des changements
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const router: Router = {
    push: (path: string) => {
      window.location.hash = path;
    },
    replace: (path: string) => {
      window.location.hash = path;
    },
    back: () => {
      window.history.back();
    }
  };

  return (
    <RouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        {children}
      </PathnameContext.Provider>
    </RouterContext.Provider>
  );
};

// --- HOOKS ---
export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    // Fallback de sécurité si utilisé hors du Provider (ne devrait pas arriver avec la correction)
    return {
        push: (path: string) => window.location.hash = path,
        replace: (path: string) => window.location.hash = path,
        back: () => window.history.back(),
    };
  }
  return context;
};

export const usePathname = () => {
    // On retourne le pathname stocké dans le contexte (mis à jour via le hash)
    return useContext(PathnameContext);
};