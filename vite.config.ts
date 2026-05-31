import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * FIX : suppression des define GEMINI_API_KEY (ce projet n'utilise pas Gemini).
 * Exposer une API key via define() la rendait visible dans le bundle JS — fuite de sécurité.
 * Toutes les variables sensibles doivent rester dans les variables VITE_* côté serveur ou
 * dans les Edge Functions Supabase.
 */
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
