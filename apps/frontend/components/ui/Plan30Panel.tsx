'use client';
import { useStore } from '@/lib/store';
import { PLAN_30_DAYS } from '@/lib/constants';
import { useRouter } from 'next/navigation';

const TYPE_ICONS: Record<string, string> = { qcm: '📋', exam: '📝', revision: '📖', vision: '📸' };

export function Plan30Panel() {
  const router = useRouter();
  const { profile, setTopic } = useStore();
  const planDay = profile.plan_day || 0;
  const pct = Math.round((planDay / 30) * 100);

  const startDay = (day: typeof PLAN_30_DAYS[number]) => {
    if (day.day > planDay + 1) return;
    setTopic(day.topic);
    if (day.type === 'exam') router.push('/exam');
    else if (day.type === 'vision') router.push('/vision');
    else router.push('/qcm');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between font-display text-base font-extrabold">
        <span>📅 Plan de révision 30 jours</span>
        <span className="text-xs text-ma1-teal">{pct}%</span>
      </div>
      <div className="h-[5px] bg-ma1-teal/[0.08] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-ma1-teal to-ma1-sky rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {PLAN_30_DAYS.map((day) => {
        const done = day.day <= planDay;
        const current = day.day === planDay + 1;
        const locked = day.day > planDay + 1;
        return (
          <button key={day.day} onClick={() => startDay(day)} disabled={locked}
            className={`flex items-center gap-2.5 p-3 rounded-xl border backdrop-blur-[12px] transition-all text-left
              ${done ? 'border-ma1-green/20 bg-ma1-green/[0.04]' : ''}
              ${current ? 'border-ma1-teal/20 bg-ma1-teal/10' : ''}
              ${locked ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-white/[0.04] hover:translate-x-0.5'}
              ${!done && !current && !locked ? 'border-white/[0.08] bg-[rgba(15,40,70,0.35)]' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
              ${done ? 'bg-ma1-green text-white' : 'bg-[rgba(15,40,70,0.35)] border border-white/[0.08]'}`}>
              {done ? '✓' : day.day}
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] font-semibold">{TYPE_ICONS[day.type] || ''} {day.title}</div>
              <div className="text-[10px] text-white/30 mt-0.5">Jour {day.day} · {day.type.toUpperCase()}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
