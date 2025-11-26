'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// --- TYPES ---
interface RouterContextType {
  push: (path: string) => void;
  pathname: string;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

// --- HOOKS ---
export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
     // Fallback de sécurité si utilisé hors du Provider (ne devrait pas arriver)
     return { push: (path: string) => window.location.hash = path };
  }
  return { push: context.push };
};

export const usePathname = () => {
  const context = useContext(RouterContext);
  return context ? context.pathname : '/';
};

// --- PROVIDER ---
export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    // 1. Initialiser le chemin basé sur le hash actuel ou par défaut '/'
    const handleHashChange = () => {
      let hash = window.location.hash.slice(1); // Enlever le '#'
      if (!hash) {
          hash = '/';
          // Ne pas forcer le hash si on est à la racine pour éviter une boucle, 
          // sauf si on veut explicitement initialiser l'app.
      }
      setPathname(hash);
    };

    // Gestion initiale
    if (!window.location.hash) {
        window.location.hash = '/';
    }
    handleHashChange();

    // Ecouteur
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const push = (path: string) => {
    window.location.hash = path;
  };

  return (
    <RouterContext.Provider value={{ push, pathname }}>
      {children}
    </RouterContext.Provider>
  );
};