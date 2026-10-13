'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Masque le chrome mobile historique (Header, MobileNav) sur l'accueil, qui a son propre header responsive. */
export function MobileChromeGate({ children }: { children: ReactNode }) {
  const p = usePathname();
  return p === '/landing' || p === '/' ? null : <>{children}</>;
}
