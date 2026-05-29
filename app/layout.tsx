import React from 'react';
import { Providers } from './providers';

interface Metadata {
  title: string;
  description: string;
}

export const metadata: Metadata = {
  title: 'UVCI RESTO',
  description: "Application de restauration pour l'UVCI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>{children}</Providers>
  );
}
