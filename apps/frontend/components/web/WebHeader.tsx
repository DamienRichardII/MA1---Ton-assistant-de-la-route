'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { SITE_NAV } from './nav';

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/landing" className="flex items-center gap-3" aria-label="MA1 — accueil">
      <Image src="/ma1-logo.jpeg" alt="MA1" width={46} height={46} className="rounded-xl shadow-md" priority />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[22px] font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ma1-ink'}`}>MA1</span>
        <span className={`mt-1 whitespace-nowrap text-[8.5px] font-bold uppercase tracking-[1.4px] ${dark ? 'text-ma1-sky' : 'text-ma1-blue'}`}>Ton assistant de la route</span>
      </span>
    </Link>
  );
}

export function WebHeader() {
  const pathname = usePathname();
  const { isLoggedIn, userName, logout } = useStore();
  const onLogout = () => { logout(); localStorage.removeItem('ma1_token'); };

  return (
    <header className="sticky top-0 z-[200] px-6 pt-5">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between rounded-[22px] border border-white/80 bg-white/90 px-6 shadow-web-card backdrop-blur-xl">
        <Logo />
        <nav className="flex items-center gap-8" aria-label="Navigation principale">
          {SITE_NAV.map(item => {
            const active = pathname === item.href || (item.href === '/landing' && pathname === '/');
            return (
              <Link key={item.href} href={item.href}
                className={`relative py-2 text-[13px] font-semibold transition-colors ${active ? 'text-ma1-blue' : 'text-slate-500 hover:text-ma1-ink'}`}>
                {item.label}
                {active && <span className="absolute inset-x-0 -bottom-1 h-[2px] rounded-full bg-ma1-blue" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/me" className="rounded-full bg-ma1-blue-soft px-4 py-2 text-xs font-bold text-ma1-blue">{userName || 'Mon espace'}</Link>
              <Link href="/chat" className="web-btn-primary !px-5 !py-2.5 !text-xs">Ouvrir l&apos;app</Link>
              <button onClick={onLogout} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/connexion" className="web-btn-primary !px-6 !py-2.5 !text-xs">Connexion</Link>
              <Link href="/connexion?mode=register" className="web-btn-outline !border !px-5 !py-2.5 !text-xs">Commencer gratuitement</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
