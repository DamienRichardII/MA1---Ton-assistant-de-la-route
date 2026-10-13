'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { WebHeader } from './WebHeader';
import { WebFooter } from './WebFooter';
import { WebAppSidebar } from './WebAppSidebar';
import { variantFor } from './nav';
import { ThemeProvider } from './theme';

/**
 * Cadre desktop (≥ lg). Sous lg, tous les wrappers sont `display: contents`
 * et les éléments web sont `hidden` : le mobile garde exactement le même DOM visible.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const variant = variantFor(pathname);

  if (variant === 'bare') return <>{children}</>;

  if (variant === 'app') {
    return (
      <div className="max-lg:contents lg:flex lg:min-h-screen lg:bg-ma1-app-bg">
        <div className="hidden lg:block"><WebAppSidebar /></div>
        <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col">{children}</div>
      </div>
    );
  }

  const isHome = pathname === '/landing' || pathname === '/';
  // Accueil : visible à toutes les largeurs (calque plein écran sous lg, qui recouvre le shell mobile).
  // Autres pages marketing : desktop uniquement, le shell mobile historique reste en place.
  return (
    <ThemeProvider>
      {theme => (
        <div data-theme={isHome ? theme : 'light'}
          className={`home-scope bg-[var(--h-page)] text-[var(--h-text)] ${isHome
            ? 'max-lg:fixed max-lg:inset-0 max-lg:z-[400] max-lg:overflow-y-auto lg:flex lg:min-h-screen lg:flex-col'
            : 'max-lg:contents lg:flex lg:min-h-screen lg:flex-col'}`}>
          <div className={isHome ? 'contents' : 'hidden lg:contents'}><WebHeader /></div>
          <div className="max-lg:contents lg:flex-1">{children}</div>
          <div className={isHome ? '' : 'hidden lg:block'}><WebFooter /></div>
        </div>
      )}
    </ThemeProvider>
  );
}
