'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock, ListChecks, FileText, BookOpen, Camera } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PLAN_30_DAYS } from '@/lib/constants';
import { AppPage } from './AppPage';

const ICON = { qcm: ListChecks, exam: FileText, revision: BookOpen, vision: Camera } as const;
const WEEKS = [[1, 7], [8, 14], [15, 21], [22, 30]] as const;

// Maquette 12 — Plan 30 jours. Même règles de déverrouillage que Plan30Panel.
export function WebPlan30() {
  const router = useRouter();
  const { profile, setTopic } = useStore();
  const planDay = profile.plan_day || 0;
  const pct = Math.round((planDay / 30) * 100);
  const [week, setWeek] = useState(Math.min(3, Math.floor(planDay / 7)));
  const [from, to] = WEEKS[week];
  const days = PLAN_30_DAYS.filter(d => d.day >= from && d.day <= to);

  const start = (day: (typeof PLAN_30_DAYS)[number]) => {
    if (day.day > planDay + 1) return;
    setTopic(day.topic);
    router.push(day.type === 'exam' ? '/exam' : day.type === 'vision' ? '/vision' : '/qcm');
  };

  return (
    <AppPage title="Plan 30 jours" subtitle="Un programme personnalisé pour réussir."
      actions={
        <div className="app-card w-[210px] px-5 py-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">Ma progression<span className="font-display text-sm font-extrabold text-white">{pct}%</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-ma1-blue" style={{ width: `${pct}%` }} /></div>
        </div>
      }>
      <div className="app-card p-6">
        <div role="tablist" aria-label="Semaines" className="mb-6 grid grid-cols-4 gap-2">
          {WEEKS.map((_, i) => (
            <button key={i} role="tab" aria-selected={week === i} onClick={() => setWeek(i)}
              className={`rounded-xl border py-3 text-sm font-bold transition-colors ${week === i ? 'border-ma1-blue bg-ma1-blue text-white' : 'border-ma1-app-line text-slate-400 hover:text-white'}`}>Semaine {i + 1}</button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-4">
          {days.map(day => {
            const done = day.day <= planDay, current = day.day === planDay + 1, locked = day.day > planDay + 1;
            const Icon = ICON[day.type];
            return (
              <button key={day.day} onClick={() => start(day)} disabled={locked} aria-label={`Jour ${day.day} : ${day.title}`}
                className={`flex min-h-[150px] flex-col items-center justify-between rounded-2xl border p-4 text-center transition-all
                  ${current ? 'border-ma1-blue bg-ma1-blue/15 shadow-[0_0_0_1px_rgba(21,83,224,0.6)]' : done ? 'border-ma1-green/30 bg-ma1-green/[0.06]' : 'border-ma1-app-line bg-white/[0.03]'}
                  ${locked ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5 hover:border-ma1-blue/60'}`}>
                <div><div className="font-display text-sm font-extrabold">Jour {day.day}</div>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] leading-tight text-slate-400"><Icon size={12} />{day.title}</div></div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-ma1-green text-white' : current ? 'bg-ma1-blue text-white' : 'bg-white/10 text-slate-500'}`}>
                  {done ? <Check size={18} strokeWidth={3} /> : locked ? <Lock size={14} /> : <span className="text-xs font-bold">GO</span>}</span>
              </button>
            );
          })}
        </div>
      </div>
    </AppPage>
  );
}
