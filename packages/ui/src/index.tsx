import type { ReactNode } from 'react';

export interface StatusCardProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function StatusCard({ eyebrow, title, children }: StatusCardProps) {
  return (
    <section className="status-card">
      <p className="status-card__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
