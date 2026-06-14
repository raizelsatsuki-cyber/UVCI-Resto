import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Enregistrement du Service Worker ─────────────────────────────────
// public/sw.js existait mais n'était jamais enregistré.
// Conséquence : navigator.serviceWorker.ready ne se résolvait JAMAIS
// (aucun SW actif), ce qui bloquait isSubscribed() pour toujours
// → Promise.all dans ProfilePage ne se résolvait jamais
// → dataLoading restait true à l'infini (page profil bloquée sur le skeleton).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Échec enregistrement Service Worker:', err);
    });
  });
}