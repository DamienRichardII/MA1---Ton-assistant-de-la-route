'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', icon: '💬', label: 'Chat' },
  { href: '/qcm', icon: '📋', label: 'QCM' },
  { href: '/exam', icon: '📝', label: 'Examen' },
  { href: '/leaderboard', icon: '🏆', label: 'Classement' },
  { href: '/plan30', icon: '📅', label: 'Plan' },
  { href: '/settings', icon: '⚙️', label: 'Compte' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[300] h-14 bg-ma1-navy/88 backdrop-blur-[60px] border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-full">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[9px] font-semibold transition-colors
              ${pathname === item.href ? 'text-ma1-sky' : 'text-white/30'}`}>
            <span className="text-[18px]">{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
