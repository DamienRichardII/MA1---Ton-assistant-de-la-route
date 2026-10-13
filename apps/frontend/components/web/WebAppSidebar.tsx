'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Logo } from './WebHeader';
import { APP_NAV } from './nav';
import { LogIn, LogOut, Globe } from 'lucide-react';

export function WebAppSidebar() {
  const pathname = usePathname();
  const { isLoggedIn, userName, plan, xp, qUsed, qMax, logout } = useStore();
  const pct = Math.min(100, (qUsed / qMax) * 100);
  const onLogout = () => { logout(); localStorage.removeItem('ma1_token'); };

  return (
    <aside className="sticky top-0 z-[100] flex h-screen w-[248px] shrink-0 flex-col border-r border-ma1-app-line bg-ma1-app-bg px-4 py-6">
      <div className="px-1"><Logo dark /></div>

      <nav className="mt-9 flex flex-col gap-1.5" aria-label="Application">
        {APP_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-all
                ${active ? 'bg-ma1-blue text-white shadow-[0_6px_20px_rgba(21,83,224,0.4)]' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
              <Icon size={17} strokeWidth={2} />{label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="app-card p-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
            <span className="text-ma1-gold">{plan === 'free' ? 'Plan Gratuit' : 'Premium'}</span>
            <span className="text-slate-400">{plan === 'free' ? `${qUsed} / ${qMax}` : `${xp} XP`}</span>
          </div>
          {plan === 'free' && (
            <>
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-gradient-to-r from-ma1-gold to-ma1-orange" style={{ width: `${pct}%` }} />
              </div>
              <Link href="/abonnement" className="block rounded-full bg-ma1-blue py-2 text-center font-display text-[11.5px] font-bold text-white hover:bg-ma1-blue-dark">Passer Premium</Link>
            </>
          )}
        </div>
        <Link href="/landing" className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-white"><Globe size={15} />Retour au site</Link>
        {isLoggedIn ? (
          <button onClick={onLogout} className="flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-500 hover:text-white">
            <LogOut size={15} />Déconnexion{userName ? ` · ${userName}` : ''}
          </button>
        ) : (
          <Link href="/connexion" className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-ma1-sky hover:text-white"><LogIn size={15} />Connexion</Link>
        )}
      </div>
    </aside>
  );
}
