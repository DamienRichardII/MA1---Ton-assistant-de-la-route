'use client';
import { useStore } from '@/lib/store';

const TOPIC_LABELS: Record<string, string> = {
  vitesse: 'Limitations de vitesse', signalisation: 'Signalisation', priorite: 'Priorités',
  alcool: 'Alcool & drogues', permis: 'Permis probatoire', autoroute: 'Autoroute',
  stationnement: 'Stationnement', securite: 'Sécurité passive', premiers_secours: 'Premiers secours',
};

export function ApprenticeProfile() {
  const { userName, xp, streakDays, profile, qcmTotal, qcmCorrect, plan } = useStore();
  const { level, weak_topics, strong_topics, exam_results, plan_day } = profile;
  const successRate = qcmTotal > 0 ? Math.round((qcmCorrect / qcmTotal) * 100) : 0;
  const lastExams = [...(exam_results || [])].reverse().slice(0, 5);

  const LEVEL_MAP: Record<string, { label: string; icon: string; color: string }> = {
    debutant: { label: 'Débutant', icon: '🌱', color: 'text-ma1-gold' },
    intermediaire: { label: 'Intermédiaire', icon: '⚡', color: 'text-ma1-sky' },
    avance: { label: 'Avancé', icon: '🏆', color: 'text-ma1-green' },
  };
  const lvl = LEVEL_MAP[level] || LEVEL_MAP.debutant;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="glass rounded-3xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-ma1-teal/15 flex items-center justify-center text-2xl">🚗</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-extrabold text-ma1-ice truncate">{userName || 'Mon profil'}</div>
          <div className={`text-sm font-semibold ${lvl.color}`}>{lvl.icon} {lvl.label}</div>
          <div className="text-[11px] text-white/30">Apprenti conducteur · Plan jour {plan_day}/30</div>
        </div>
        <div className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-gradient-to-br from-[rgba(232,184,77,0.15)] to-[rgba(255,165,2,0.15)] border border-[rgba(232,184,77,0.25)] text-[#e8b84d]">
          {plan === 'free' ? 'Gratuit' : '✨ Premium'}
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'XP Total', value: xp, icon: '⚡', color: 'text-ma1-purple' },
          { label: 'Taux de réussite', value: `${successRate}%`, icon: '🎯', color: successRate >= 70 ? 'text-ma1-green' : 'text-ma1-red' },
          { label: 'Questions', value: qcmTotal, icon: '📋', color: 'text-ma1-sky' },
          { label: 'Streak', value: `${streakDays}j`, icon: '🔥', color: 'text-ma1-orange' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-3.5 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`font-display text-xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-white/30">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Examens blancs */}
      {lastExams.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <h3 className="font-display text-sm font-extrabold mb-3">📝 Derniers examens blancs</h3>
          <div className="flex flex-col gap-2">
            {lastExams.map((e, i) => (
              <div key={i} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${e.passed ? 'bg-ma1-green/[0.04] border-ma1-green/15' : 'bg-ma1-red/[0.03] border-ma1-red/12'}`}>
                <div className="flex items-center gap-2">
                  <span>{e.passed ? '✅' : '❌'}</span>
                  <span className="text-xs text-white/50">{new Date(e.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className={`font-display font-extrabold text-sm ${e.passed ? 'text-ma1-green' : 'text-ma1-red'}`}>{e.correct}/{e.total} — {e.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points forts / faibles */}
      <div className="grid grid-cols-2 gap-3">
        {strong_topics.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] font-bold text-ma1-green mb-2 uppercase tracking-wide">✅ Points forts</div>
            {strong_topics.slice(0, 4).map(t => (
              <div key={t} className="text-xs text-white/50 py-0.5">{TOPIC_LABELS[t] || t}</div>
            ))}
          </div>
        )}
        {weak_topics.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] font-bold text-ma1-red mb-2 uppercase tracking-wide">❌ À travailler</div>
            {weak_topics.slice(0, 4).map(t => (
              <div key={t} className="text-xs text-white/50 py-0.5">{TOPIC_LABELS[t] || t}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
