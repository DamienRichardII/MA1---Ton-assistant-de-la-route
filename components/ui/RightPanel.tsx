'use client';
import { useStore } from '@/lib/store';
import { TIPS } from '@/lib/constants';
import { useState, useEffect } from 'react';

export function RightPanel() {
  const { qcmTotal, qcmCorrect, qcmStreak, profile } = useStore();
  const pct = qcmTotal ? Math.round((qcmCorrect / qcmTotal) * 100) : 0;
  const [tip, setTip] = useState(TIPS[0]);
  useEffect(() => { setTip(TIPS[Math.floor(Math.random() * TIPS.length)]); }, []);
  const levelMap: Record<string, string> = { debutant: '🎓 Débutant', intermediaire: '📈 Intermédiaire', avance: '🏆 Expert' };

  return (
    <aside className="hidden lg:flex flex-col gap-2.5 border-l border-white/[0.08] bg-ma1-navy/40 backdrop-blur-[24px] p-3 overflow-y-auto">
      {/* Progression */}
      <div className="glass rounded-[22px] p-3.5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <p className="text-[8.5px] font-bold tracking-[2px] uppercase text-white/15 mb-2.5">📊 Ma progression</p>
        <div className="text-center py-1.5">
          <div className="font-display text-[40px] font-black bg-gradient-to-br from-ma1-teal to-ma1-sky bg-clip-text text-transparent tracking-tighter">{pct}%</div>
          <p className="text-[9.5px] text-white/30 mt-0.5">taux de réussite</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <div className="bg-black/20 rounded-xl p-2 text-center">
            <div className="font-display text-[17px] font-extrabold">{qcmTotal}</div>
            <div className="text-[8.5px] text-white/30 uppercase tracking-wide mt-0.5">Questions</div>
          </div>
          <div className="bg-black/20 rounded-xl p-2 text-center">
            <div className="font-display text-[17px] font-extrabold">{qcmStreak}</div>
            <div className="text-[8.5px] text-white/30 uppercase tracking-wide mt-0.5">Série 🔥</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2 py-1.5 px-3 rounded-full text-[10.5px] font-bold bg-ma1-teal/8 border border-ma1-teal/15 text-ma1-sky w-full">
          {levelMap[profile.level] || '🎓 Débutant'}
        </div>
      </div>

      {/* Tip */}
      <div className="glass rounded-[22px] p-3.5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <p className="text-[8.5px] font-bold tracking-[2px] uppercase text-white/15 mb-2.5">💡 Conseil du jour</p>
        <div className="bg-ma1-green/[0.04] border border-ma1-green/10 rounded-xl p-2.5 text-[11.5px] text-white/50 leading-relaxed">
          <strong className="text-ma1-green block mb-1 text-[10.5px]">{tip.title}</strong>
          {tip.content}
        </div>
      </div>

      {/* Legal links */}
      <div className="mt-auto pt-2 text-center text-[9px] text-white/15 space-x-2">
        <a href="/legal/cgu.html" target="_blank" className="hover:text-white/30 transition-colors">CGU</a>
        <a href="/legal/confidentialite.html" target="_blank" className="hover:text-white/30 transition-colors">Confidentialité</a>
        <a href="/legal/mentions-legales.html" target="_blank" className="hover:text-white/30 transition-colors">Mentions</a>
      </div>
    </aside>
  );
}
