import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sole Silva — Administración',
  description: 'Cuenta corriente y proformas',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
