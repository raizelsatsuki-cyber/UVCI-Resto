import React from 'react';
import { Providers } from './providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UVCI RESTO',
  description: 'Application de restauration pour l\'UVCI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Tailwind CDN pour assurer le style sans étape de build CSS complexe */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'uvci-purple': '#7D2E8D',
                    'uvci-green': '#009640',
                  },
                  fontFamily: {
                    sans: ['Inter', 'sans-serif'],
                  },
                },
              },
            }
          `
        }} />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" type="text/css" href="https://aistudiocdn.com/react-toastify@^10.0.0/dist/ReactToastify.css" />
        <style dangerouslySetInnerHTML={{
          __html: `
            body { background-color: #F3F4F6; }
            .glass-panel {
              background: rgba(255, 255, 255, 0.7);
              backdrop-filter: blur(10px);
              -webkit-backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
          `
        }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}