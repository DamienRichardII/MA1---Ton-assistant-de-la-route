'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Instagram, Menu, X, Moon, Sun } from 'lucide-react';
import { useStore } from '@/lib/store';
import { SITE_NAV } from './nav';
import { TikTokIcon, SnapchatIcon } from './brand-icons';
import { useWebTheme } from './theme';

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link href="/landing" className="flex items-center gap-3" aria-label="MA1 — accueil">
      <Image src="/ma1-logo.jpeg" alt="MA1" width={compact ? 38 : 46} height={compact ? 38 : 46} className={`rounded-[10px] shadow-md ${compact ? 'h-[38px] w-[38px]' : ''}`} priority />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[19px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-[var(--h-text,#0b1a33)]'}`}>MA1</span>
        <span className={`mt-1 whitespace-nowrap text-[8px] font-bold uppercase tracking-[1.3px] ${dark ? 'text-ma1-sky' : 'text-[var(--h-text,#0b1a33)] opacity-80'}`}>Ton assistant de la route</span>
      </span>
    </Link>
  );
}

// URLs des réseaux : à renseigner via variables d'environnement. Sans URL, l'icône reste décorative (pas de lien mort).
const SOCIALS = [
  { label: 'TikTok', url: process.env.NEXT_PUBLIC_TIKTOK_URL, Icon: TikTokIcon },
  { label: 'Snapchat', url: process.env.NEXT_PUBLIC_SNAPCHAT_URL, Icon: SnapchatIcon },
  { label: 'Instagram', url: process.env.NEXT_PUBLIC_INSTAGRAM_URL, Icon: Instagram },
];

/** Header web. `scope` : l'accueil utilise les variables de thème (--h-*), les autres pages le style clair par défaut. */
export function WebHeader() {
  const pathname = usePathname() || '/';
  const { isLoggedIn, userName, logout } = useStore();
  const { theme, toggle } = useWebTheme();
  const [open, setOpen] = useState(false);
  const isHome = pathname === '/landing' || pathname === '/';
  const onLogout = () => { logout(); localStorage.removeItem('ma1_token'); setOpen(false); };
  const activeOf = (href: string) => pathname === href || (href === '/landing' && pathname === '/');

  const navLink = (item: (typeof SITE_NAV)[number], mobile = false) => (
    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
      className={mobile
        ? `rounded-xl px-4 py-3 text-sm font-semibold ${activeOf(item.href) ? 'bg-[var(--h-accent-soft,#e8f0ff)] text-[var(--h-accent,#1553e0)]' : 'text-[var(--h-text,#0b1a33)]'}`
        : `relative py-1.5 text-[12.5px] font-semibold transition-colors ${activeOf(item.href) ? 'text-[var(--h-accent,#1553e0)]' : 'text-[var(--h-text,#0b1a33)] opacity-80 hover:opacity-100'}`}>
      {item.label}
      {!mobile && activeOf(item.href) && <span className="absolute inset-x-0 -bottom-1 h-[2px] rounded-full bg-[var(--h-accent,#1553e0)]" />}
    </Link>
  );

  return (
    <header className="sticky top-0 z-[200]">
      <div className="mx-auto flex h-[62px] max-w-[1400px] items-center justify-between gap-4 rounded-b-[18px] border border-t-0 border-[var(--h-bar-line,rgba(255,255,255,.9))] bg-[var(--h-bar,rgba(255,255,255,.88))] px-5 shadow-[0_4px_24px_rgba(15,63,184,0.08)] backdrop-blur-xl">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">{SITE_NAV.map(i => navLink(i))}</nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="hidden items-center gap-3.5 xl:flex">
            {SOCIALS.map(({ label, url, Icon }) => url
              ? <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-[var(--h-text,#0b1a33)] transition-opacity hover:opacity-70"><Icon width={19} height={19} /></a>
              : <span key={label} aria-hidden className="text-[var(--h-text,#0b1a33)]"><Icon width={19} height={19} /></span>)}
            <span className="mx-1 h-6 w-px bg-[var(--h-text,#0b1a33)] opacity-15" />
          </div>
          {isHome && (
            <button onClick={toggle} aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--h-card-line,rgba(21,83,224,.15))] text-[var(--h-text,#0b1a33)] hover:bg-[var(--h-accent-soft,#e8f0ff)]">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          {isLoggedIn ? (
            <>
              <Link href="/me" className="rounded-full bg-[var(--h-accent-soft,#e8f0ff)] px-4 py-2 text-xs font-bold text-[var(--h-accent,#1553e0)]">{userName || 'Mon espace'}</Link>
              <Link href="/chat" className="web-btn-primary !px-5 !py-2 !text-xs">Ouvrir l&apos;app</Link>
              <button onClick={onLogout} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/connexion" className="rounded-full border border-[var(--h-accent,#1553e0)] bg-transparent px-5 py-2 text-xs font-bold text-[var(--h-accent,#1553e0)] transition-colors hover:bg-[var(--h-accent-soft,#e8f0ff)]">Connexion</Link>
              <Link href="/connexion?mode=register" className="web-btn-primary !bg-[var(--h-accent,#1553e0)] !px-5 !py-2.5 !text-xs">Commencer gratuitement</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--h-text,#0b1a33)] lg:hidden">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>

      {open && (
        <div className="mx-3 mt-2 rounded-2xl border border-[var(--h-card-line,rgba(21,83,224,.1))] bg-[var(--h-card,#fff)] p-3 shadow-[var(--h-card-shadow)] lg:hidden">
          <nav className="flex flex-col" aria-label="Menu mobile">{SITE_NAV.map(i => navLink(i, true))}</nav>
          <div className="mt-3 grid gap-2 border-t border-[var(--h-card-line,rgba(21,83,224,.1))] pt-3">
            {isLoggedIn ? (
              <><Link href="/chat" onClick={() => setOpen(false)} className="web-btn-primary !bg-[var(--h-accent,#1553e0)] !py-2.5 !text-sm">Ouvrir l&apos;app</Link>
                <button onClick={onLogout} className="py-2 text-sm font-semibold text-slate-400">Déconnexion</button></>
            ) : (
              <><Link href="/connexion?mode=register" onClick={() => setOpen(false)} className="web-btn-primary !bg-[var(--h-accent,#1553e0)] !py-3 !text-sm">Commencer gratuitement</Link>
                <Link href="/connexion" onClick={() => setOpen(false)} className="web-btn border border-[var(--h-accent,#1553e0)] !py-3 !text-sm text-[var(--h-accent,#1553e0)]">Connexion</Link></>
            )}
            {isHome && <button onClick={toggle} className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[var(--h-muted,#5b6b86)]">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</button>}
          </div>
        </div>
      )}
    </header>
  );
}
