'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { TOPICS, PREMIUM_TOPICS } from '@/lib/constants';

export function Sidebar() {
  const pathname = usePathname();
  const { plan, topic, setTopic, qUsed, qMax } = useStore();
  const quotaPct = Math.min(100, (qUsed / qMax) * 100);

  return (
    <aside className="hidden lg:flex flex-col gap-0.5 border-r border-white/[0.08] bg-ma1-navy/50 backdrop-blur-[24px] p-3.5 overflow-y-auto">
      <p className="text-[9px] font-bold tracking-[2px] text-white/15 uppercase px-2.5 pt-3.5 pb-1.5">Thèmes</p>
      {TOPICS.map((t) => (
        <Link key={t.id} href="/qcm"
          onClick={() => setTopic(t.id)}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 border border-transparent
            ${topic === t.id && pathname === '/qcm'
              ? 'bg-ma1-teal/10 border-ma1-teal/20 text-ma1-sky-bright shadow-[inset_0_0_16px_rgba(58,157,176,0.06)]'
              : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'}`}>
          <span className="text-[14px] w-[22px] text-center">{t.icon}</span>{t.label}
        </Link>
      ))}

      <div className="h-px bg-white/[0.08] mx-2 my-1.5" />

      {PREMIUM_TOPICS.map((t) => (
        <Link key={t.id} href={plan === 'free' ? '#' : '/qcm'}
          onClick={() => plan !== 'free' && setTopic(t.id)}
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-white/50 hover:bg-white/[0.04] transition-all border border-transparent">
          <span className="text-[14px] w-[22px] text-center">{t.icon}</span>
          {t.label}
          <span className="ml-auto text-[8px] font-bold text-ma1-gold tracking-wide">PRO</span>
        </Link>
      ))}

      <div className="h-px bg-white/[0.08] mx-2 my-1.5" />
      <Link href="/exam" className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-ma1-teal/20 bg-ma1-teal/5 text-ma1-teal font-display font-bold text-[11.5px] hover:bg-ma1-teal/10 transition-all mt-1">
        📝 Examen Blanc
      </Link>

      <div className="mt-auto glass rounded-[22px] p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-ma1-gold">Plan Gratuit</span>
          <span className="text-[10px] text-white/30 font-medium">{qUsed} / {qMax}</span>
        </div>
        <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full bg-gradient-to-r from-ma1-gold to-ma1-orange transition-all duration-500" style={{ width: `${quotaPct}%` }} />
        </div>
        <button className="btn-primary w-full !py-2 !text-[11.5px]">Passer Premium</button>
      </div>
    </aside>
  );
}
