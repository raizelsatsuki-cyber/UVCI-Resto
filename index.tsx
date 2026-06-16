import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

// ── Error Boundary global ─────────────────────────────────────────────
// Remplace la page blanche silencieuse par un message d'erreur visible.
// Sans ça, tout ReferenceError ou crash de composant = écran blanc total.
class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Crash global:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', padding: '2rem', background: '#f9fafb',
        }}>
          <div style={{
            background: 'white', borderRadius: '1rem', padding: '2rem',
            maxWidth: '480px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,.08)',
            border: '1px solid #fecaca',
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
              ⚠️ Une erreur est survenue
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {(this.state.error as Error).message}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#7D2E8D', color: 'white', border: 'none',
                borderRadius: '0.5rem', padding: '0.75rem 1.5rem',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// ── Enregistrement du Service Worker ─────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Forcer la mise à jour si un nouveau SW est disponible
      reg.onupdatefound = () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.onstatechange = () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouveau SW installé — recharger pour appliquer les changements
            window.location.reload();
          }
        };
      };
    }).catch((err) => {
      console.warn('Échec enregistrement Service Worker:', err);
    });
  });
}
