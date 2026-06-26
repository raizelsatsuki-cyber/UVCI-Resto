import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface RouterContextType {
  pathname: string;
  search:   string;
  push:     (path: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  // FIX : retourne ctx.push directement (fonction stable, pas un nouvel objet)
  // L'ancien code retournait { push: ctx.push } → nouvel objet à chaque render
  // → useEffect([..., router]) se déclenchait en boucle
  if (!ctx) {
    // Fallback hors RouterProvider
    const fallbackPush = (path: string) => { window.location.hash = path; };
    return { push: fallbackPush };
  }
  return ctx; // ctx est stable — même référence tant que RouterProvider ne re-rend pas
};

export const usePathname = () => useContext(RouterContext)?.pathname ?? '/';

export const useSearchParams = () => {
  const search = useContext(RouterContext)?.search ?? '';
  return new URLSearchParams(search.replace(/^\?/, ''));
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({ pathname: '/', search: '' });

  const parseHash = () => {
    const raw = window.location.hash.replace(/^#/, '') || '/';

    // Supabase OAuth redirige vers origin/#access_token=...
    // Ce n'est PAS une route — on ignore et retourne '/'
    if (raw.startsWith('access_token=') || raw.startsWith('/access_token=')) {
      return { pathname: '/', search: '' };
    }

    const qIdx = raw.indexOf('?');
    if (qIdx === -1) return { pathname: raw, search: '' };
    return {
      pathname: raw.slice(0, qIdx),
      search:   raw.slice(qIdx),
    };
  };

  useEffect(() => {
    const onHashChange = () => setState(parseHash());
    setState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // FIX : useCallback pour que push soit stable entre les renders
  // Sans ça, ctx change à chaque render → useRouter() retourne un nouveau ctx
  // → tout useEffect([router]) se re-déclenche
  const push = useCallback((path: string) => {
    window.location.hash = path;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const ctx = React.useMemo(() => ({
    pathname: state.pathname,
    search:   state.search,
    push,
  }), [state.pathname, state.search, push]);

  return (
    <RouterContext.Provider value={ctx}>
      {children}
    </RouterContext.Provider>
  );
};
