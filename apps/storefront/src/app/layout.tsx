import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StoreProvider } from '../components/store-context';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000'),
  title: { default: 'Casas Bahia · Demonstração Ecommerce Engine', template: '%s | Casas Bahia' },
  description: 'Loja demonstrativa conectada ao catálogo e ao painel administrativo do Ecommerce Engine.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><StoreProvider>{children}</StoreProvider></body>
    </html>
  );
}
