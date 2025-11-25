
import React, { createContext, useContext, useState, useEffect } from 'react';

// Contexte pour le routeur
const RouterContext = createContext<any>(null);

// Hook pour accéder au routeur
export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    // Fallback de sécurité pour éviter le crash si utilisé hors provider
    return { 
        push: (path: string) => { window.location.hash = path; },
        replace: (path: string) => { window.location.hash = path; }
    };
  }
  return context;
};

// Hook pour accéder au chemin actuel
export const usePathname = () => {
  const context = useContext(RouterContext);
  if (!context) return window.location.hash.replace(/^#/, '') || '/';
  return context.pathname;
};

// Le Provider composant
export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    // Fonction pour gérer les changements de hash
    const handleHashChange = () => {
      // Récupérer le hash, enlever le #, défaut à '/'
      let path = window.location.hash.replace(/^#/, '');
      if (!path) path = '/';
      setCurrentPath(path);
    };

    // Initialisation
    handleHashChange();

    // Écouteur d'événement
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const router = {
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
    <RouterContext.Provider value={{ ...router, pathname: currentPath }}>
      {children}
    </RouterContext.Provider>
  );
};
