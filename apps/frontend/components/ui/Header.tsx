'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { AuthModal } from '@/components/auth/AuthModal';
import { api } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Chat', icon: '💬' },
  { href: '/qcm', label: 'QCM', icon: '📋' },
  { href: '/vision', label: 'Vision', icon: '📸' },
  { href: '/plan30', label: 'Plan 30j', icon: '📅' },
  { href: '/leaderboard', label: 'Classement', icon: '🏆' },
  { href: '/veille', label: 'Veille', icon: '📡' },
];

export function Header() {
  const pathname = usePathname();
  const store = useStore();
  const { userName, isLoggedIn, plan, xp, streakDays, logout, setUser, setProfile } = store;
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('ma1_token');
    if (token && !isLoggedIn) {
      api.me(token).then(d => {
        setUser({ userId: d.user_id, token, name: d.name || d.email?.split('@')[0] || '', plan: d.plan });
        if (d.profile) setProfile(d.profile);
      }).catch(() => localStorage.removeItem('ma1_token'));
    }
  }, []);

  const handleLogout = () => { logout(); localStorage.removeItem('ma1_token'); setMenuOpen(false); };

  return (
    <>
      <header className="sticky top-0 z-[200] h-[54px] bg-[rgba(10,22,40,0.8)] backdrop-blur-[60px] saturate-[180%] border-b border-white/[0.08] flex items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/ma1-logo.jpeg" alt="MA1" width={34} height={34} className="rounded-md" style={{ filter: 'drop-shadow(0 0 8px rgba(58,157,176,0.3))' }} />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-extrabold text-[15px] text-ma1-ice tracking-tight">MA1</span>
            <span className="text-[9.5px] text-ma1-teal tracking-[1.5px] uppercase font-semibold">Ton Assistant de la Route</span>
          </div>
        </Link>

        <nav className="hidden lg:flex gap-0.5 bg-white/[0.04] border border-white/[0.08] rounded-full p-[3px] backdrop-blur-sm">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${active ? 'bg-[rgba(58,157,176,0.1)] text-[#a8dce8] shadow-sm' : 'text-white/30 hover:text-white/50'}`}>
                <span className="mr-1 text-[11px]">{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {streakDays > 0 && <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-display bg-[rgba(255,165,2,0.1)] border border-[rgba(255,165,2,0.2)] text-[#ffa502]">🔥 {streakDays}j</div>}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-display bg-[rgba(165,94,234,0.1)] border border-[rgba(165,94,234,0.2)] text-[#a55eea]">⚡ {xp} XP</div>

          {isLoggedIn ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="px-3 py-1 rounded-full text-[10px] font-bold font-display bg-[rgba(58,157,176,0.1)] border border-[rgba(58,157,176,0.2)] text-[#7ec8e3] cursor-pointer hover:bg-[rgba(58,157,176,0.2)] transition-all">
                {userName || 'Mon compte'}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-xl p-2 z-50 animate-msg-in">
                  <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-xs text-white/60 hover:bg-white/[0.04]" onClick={() => setMenuOpen(false)}>🏫 Dashboard</Link>
                  <button onClick={() => { window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/rgpd/export/${store.userId}`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/60 hover:bg-white/[0.04]">📤 Exporter mes données</button>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#ff4757]/70 hover:bg-[#ff4757]/[0.04]">Déconnexion</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)}
              className="px-3 py-1 rounded-full text-[10px] font-bold font-display border border-white/[0.08] text-white/40 cursor-pointer hover:text-white/60 transition-all">Connexion</button>
          )}

          <div className="px-3 py-1 rounded-full text-[10px] font-bold font-display bg-gradient-to-br from-[rgba(232,184,77,0.15)] to-[rgba(255,165,2,0.15)] border border-[rgba(232,184,77,0.25)] text-[#e8b84d]">
            {plan === 'free' ? 'Gratuit' : 'Premium'}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
