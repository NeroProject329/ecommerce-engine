import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin · Ecommerce Engine',
  description:
    'Operação completa de catálogo, estoque, vendas, clientes, conteúdo, marketing e configurações do Ecommerce Engine.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
