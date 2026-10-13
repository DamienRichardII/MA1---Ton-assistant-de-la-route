'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { WebHeader } from './WebHeader';
import { WebFooter } from './WebFooter';
import { WebAppSidebar } from './WebAppSidebar';
import { variantFor } from './nav';

/**
 * Cadre desktop (≥ lg). Sous lg, tous les wrappers sont `display: contents`
 * et les éléments web sont `hidden` : le mobile garde exactement le même DOM visible.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const variant = variantFor(usePathname() || '/');

  if (variant === 'bare') return <>{children}</>;

  if (variant === 'app') {
    return (
      <div className="max-lg:contents lg:flex lg:min-h-screen lg:bg-ma1-app-bg">
        <div className="hidden lg:block"><WebAppSidebar /></div>
        <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="max-lg:contents lg:flex lg:min-h-screen lg:flex-col lg:bg-[#eef3fb] lg:text-ma1-ink">
      <div className="hidden lg:block"><WebHeader /></div>
      <div className="max-lg:contents lg:flex-1">{children}</div>
      <div className="hidden lg:block"><WebFooter /></div>
    </div>
  );
}
