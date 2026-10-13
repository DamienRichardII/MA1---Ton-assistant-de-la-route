'use client';
import { useSyncExternalStore, type ReactNode } from 'react';

// Breakpoint `lg` de Tailwind : en dessous = mobile (inchangé), au-dessus = site web.
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useIsDesktop(): boolean {
  // Côté serveur : on suppose le mobile (mobile-first) → aucun changement de rendu pour le mobile.
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP_QUERY).matches, () => false);
}

/** Rend `children` uniquement sur desktop. Évite de monter deux fois les composants à état. */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() ? <>{children}</> : null;
}

/** Rend `children` uniquement sur mobile (rendu serveur inclus). */
export function MobileOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() ? null : <>{children}</>;
}
