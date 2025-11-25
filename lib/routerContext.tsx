
import React, { createContext, useContext, useEffect, useState } from 'react';

// Interface imitant le routeur Next.js
interface RouterContextType {
  pathname: string;
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fonction utilitaire pour extraire le chemin propre depuis le hash
  // Ex: "#/menu" -> "/menu", "" -> "/"
  const getHashPath = () => {
    if (typeof window === 'undefined') return '/';
    const hash = window.location.hash;
    // On enlève le '#' initial
    const path = hash.slice(1);
    // Si vide, on considère que c'est la racine
    return path || '/';
  };

  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    // Initialisation
    setPathname(getHashPath());

    const handleHashChange = () => {
      setPathname(getHashPath());
    };

    // On écoute l'événement hashchange au lieu de popstate
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const router = {
    push: (url: string) => {
      // On modifie le hash, ce qui est autorisé partout (même dans les iframes/blobs)
      window.location.hash = url;
    },
    replace: (url: string) => {
      // Pour replace, on remplace l'URL courante avec le nouveau hash
      const currentUrl = window.location.href.split('#')[0];
      window.location.replace(currentUrl + '#' + url);
    },
    back: () => {
      window.history.back();
    }
  };

  return (
    <RouterContext.Provider value={{ pathname, ...router }}>
      {children}
    </RouterContext.Provider>
  );
};

// Hooks personnalisés imitant Next.js
export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

export const usePathname = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('usePathname must be used within a RouterProvider');
  }
  return context.pathname;
};
