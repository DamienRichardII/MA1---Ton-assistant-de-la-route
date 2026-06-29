import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s — Blog MA1', default: 'Blog MA1 — Code de la Route' },
  description: 'Articles et guides pour réussir le Code de la Route. Rédigés par MA1, votre assistant IA.',
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
