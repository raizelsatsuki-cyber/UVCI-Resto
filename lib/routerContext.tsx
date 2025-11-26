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
    // Fallback de sécurité : permet une navigation basique même hors contexte
    return { push: (path: string) => { window.location.hash = path; } };
  }
  return { push: context.push };
};

export const usePathname = () => {
  const context = useContext(RouterContext);
  // Retourne '/' par défaut si le contexte n'est pas encore monté
  return context?.pathname || '/';
};

// --- PROVIDER ---
// Implémentation d'un routeur basé sur le Hash (#) pour compatibilité universelle
// (Fonctionne à la fois en SPA via index.tsx et en déploiement statique)
export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    // Fonction pour lire le hash actuel (sans le #)
    const getHashPath = () => {
      const hash = window.location.hash.replace(/^#/, '');
      return hash || '/';
    };

    const onHashChange = () => {
      setCurrentPath(getHashPath());
    };

    // Initialisation
    setCurrentPath(getHashPath());

    // Écoute des changements
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const push = (path: string) => {
    window.location.hash = path;
  };

  return (
    <RouterContext.Provider value={{ push, pathname: currentPath }}>
      {children}
    </RouterContext.Provider>
  );
};