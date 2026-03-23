'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

interface Student { user_id: string; name: string; level: string; success_rate: number; score_total: number; readiness: number; xp: number; plan_day: number; }

export function MoniteurProfile() {
  const { userName, userId, plan } = useStore();
  const [data, setData] = useState<{ total_students: number; avg_success_rate: number; ready_for_exam: number; students: Student[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard(userId).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {/* Header moniteur */}
      <div className="glass rounded-3xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-ma1-gold/10 flex items-center justify-center text-2xl">🎓</div>
        <div className="flex-1">
          <div className="font-display text-lg font-extrabold text-ma1-ice">{userName || 'Moniteur'}</div>
          <div className="text-sm font-semibold text-[#e8b84d]">Moniteur d'auto-école</div>
          <div className="text-[11px] text-white/30">Tableau de bord professionnel</div>
        </div>
        <div className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-gradient-to-br from-[rgba(232,184,77,0.15)] to-[rgba(255,165,2,0.15)] border border-[rgba(232,184,77,0.25)] text-[#e8b84d]">
          {plan === 'autoecole' ? '🏫 Pro' : plan === 'free' ? 'Gratuit' : '✨ Premium'}
        </div>
      </div>

      {/* Stats classe */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-ma1-teal animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Élèves', value: data.total_students, icon: '👥', color: 'text-ma1-sky' },
              { label: 'Taux moyen', value: `${Math.round(data.avg_success_rate)}%`, icon: '📊', color: data.avg_success_rate >= 70 ? 'text-ma1-green' : 'text-ma1-red' },
              { label: 'Prêts examen', value: data.ready_for_exam, icon: '🎯', color: 'text-ma1-green' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`font-display text-xl font-extrabold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-white/30">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Liste élèves */}
          <div className="glass rounded-3xl p-4">
            <h3 className="font-display text-sm font-extrabold mb-3">👥 Mes élèves</h3>
            {data.students.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">Aucun élève pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.students.slice(0, 10).map(s => (
                  <div key={s.user_id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-ma1-teal/10 flex items-center justify-center text-xs font-bold text-ma1-sky">{s.name?.charAt(0).toUpperCase() || '?'}</div>
                      <div>
                        <div className="text-xs font-semibold text-ma1-ice">{s.name || 'Élève'}</div>
                        <div className="text-[10px] text-white/30">{s.score_total} questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-bold ${s.success_rate >= 70 ? 'text-ma1-green' : s.success_rate >= 50 ? 'text-ma1-gold' : 'text-ma1-red'}`}>{s.success_rate}%</div>
                      <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-ma1-teal to-ma1-sky rounded-full" style={{ width: `${s.readiness}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center text-white/30 py-8">Données indisponibles.</div>
      )}
    </div>
  );
}
