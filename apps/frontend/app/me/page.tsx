'use client';
// [Sprint] Espace joueur mobile — dashboard personnel dynamique, données réelles serveur.
// Accessible depuis le header (Mon espace). Aucune stat factice : états vides propres.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

interface ThemeStat { topic: string; label: string; total_answers: number; success_rate: number; }
interface Stats {
  level: string; xp: number; score_total: number; score_correct: number;
  success_rate: number; streak_days: number; qcm_count: number; exam_count: number;
  weak_topics: string[]; strong_topics: string[]; themes: ThemeStat[];
}
interface MeResponse {
  user_id: string; name: string;
  stats: Stats; rank: { rank: number | null; total_players: number; xp?: number };
}

// Paliers de niveau pour la barre de progression XP.
const TIERS = [0, 100, 300, 700, 1500, 3000, 6000];
function tierProgress(xp: number) {
  let lo = 0, hi = TIERS[TIERS.length - 1];
  for (let i = 0; i < TIERS.length - 1; i++) {
    if (xp >= TIERS[i] && xp < TIERS[i + 1]) { lo = TIERS[i]; hi = TIERS[i + 1]; break; }
    if (xp >= TIERS[TIERS.length - 1]) { lo = TIERS[TIERS.length - 1]; hi = lo; }
  }
  const pct = hi > lo ? Math.round(((xp - lo) / (hi - lo)) * 100) : 100;
  return { lo, hi, pct: Math.min(100, Math.max(0, pct)), toNext: Math.max(0, hi - xp) };
}

const LEVEL_LABEL: Record<string, string> = {
  debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé',
};

function Kpi({ value, label, accent }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <div className={`font-display text-xl font-black ${accent ? 'bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] bg-clip-text text-transparent' : 'text-white/90'}`}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

export default function MePage() {
  const { isLoggedIn, userName } = useStore();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const load = async () => {
    try { setData(await api.getUserMe()); } catch { /* géré par état vide */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // Laisse le Header restaurer la session avant de décider.
    const t = setTimeout(() => setReady(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    load();
    const id = setInterval(load, 30_000); // auto-refresh léger
    return () => clearInterval(id);
  }, [isLoggedIn]);

  if (!isLoggedIn && ready) {
    return (
      <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-4xl">🔒</div>
        <p className="text-sm text-white/60 max-w-xs">Connecte-toi pour accéder à ton espace personnel et suivre ta progression.</p>
        <Link href="/" className="btn-primary !text-sm">Retour à MA1</Link>
      </div>
    );
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-[#3a9db0] animate-spin" />
    </div>
  );

  const stats = data?.stats;
  const rank = data?.rank;
  const xp = stats?.xp ?? 0;
  const prog = tierProgress(xp);
  const hasActivity = !!stats && (stats.qcm_count > 0 || stats.exam_count > 0 || xp > 0);
  const themesSorted = (stats?.themes || []).slice().sort((a, b) => b.success_rate - a.success_rate);
  const best = themesSorted.filter(t => t.total_answers >= 1).slice(0, 3);
  const toWork = themesSorted.filter(t => t.total_answers >= 1).slice(-3).reverse();

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-20 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      {/* Header espace joueur */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold">👤 {data?.name || userName || 'Mon espace'}</h1>
          <p className="text-[11px] text-white/35">
            {LEVEL_LABEL[stats?.level || 'debutant'] || 'Débutant'}
            {rank?.rank ? ` · Rang #${rank.rank}${rank.total_players ? `/${rank.total_players}` : ''}` : ''}
          </p>
        </div>
        <button onClick={load} className="btn-ghost !text-[11px]">🔄</button>
      </div>

      {!hasActivity ? (
        <div className="glass rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">🚦</div>
          <p className="text-sm text-white/60">Commence un QCM pour voir tes premières statistiques.</p>
          <Link href="/qcm" className="btn-primary !text-sm mt-4 inline-block">Commencer un QCM</Link>
        </div>
      ) : (
        <>
          {/* Barre XP / niveau */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="font-display text-2xl font-black bg-gradient-to-br from-[#a55eea] to-[#7ec8e3] bg-clip-text text-transparent">⚡ {xp} XP</div>
                <div className="text-[11px] text-white/40">{LEVEL_LABEL[stats?.level || 'debutant']}</div>
              </div>
              <div className="text-right text-[11px] text-white/40">
                {prog.toNext > 0 ? `${prog.toNext} XP → palier suivant` : 'Palier max atteint'}
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#3a9db0] to-[#7ec8e3]" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>

          {/* KPI grid (mobile : 2 colonnes) */}
          <div id="stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi value={rank?.rank ? `#${rank.rank}` : '—'} label="Classement" accent />
            <Kpi value={`${stats?.success_rate ?? 0}%`} label="Réussite" />
            <Kpi value={stats?.qcm_count ?? 0} label="QCM réalisés" />
            <Kpi value={stats?.exam_count ?? 0} label="Examens blancs" />
            <Kpi value={stats?.score_correct ?? 0} label="Bonnes réponses" />
            <Kpi value={stats?.score_total ?? 0} label="Réponses totales" />
            <Kpi value={`🔥 ${stats?.streak_days ?? 0}j`} label="Série" />
            <Kpi value={LEVEL_LABEL[stats?.level || 'debutant']} label="Niveau" />
          </div>

          {/* Thèmes forts / à retravailler */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-sm font-bold text-[#2ed573] mb-2">💪 Meilleures catégories</h3>
              {best.length === 0 ? (
                <p className="text-[12px] text-white/30">Fais plus de QCM pour identifier tes points forts.</p>
              ) : best.map(t => (
                <div key={t.topic} className="flex justify-between text-[12px] py-1">
                  <span className="text-white/70">{t.label}</span>
                  <span className="text-[#2ed573]">{t.success_rate}%</span>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-sm font-bold text-[#e8b84d] mb-2">🎯 À retravailler</h3>
              {toWork.length === 0 ? (
                <p className="text-[12px] text-white/30">Aucune faiblesse identifiée pour l'instant.</p>
              ) : toWork.map(t => (
                <div key={t.topic} className="flex justify-between text-[12px] py-1">
                  <span className="text-white/70">{t.label}</span>
                  <span className={t.success_rate >= 50 ? 'text-[#e8b84d]' : 'text-[#ff4757]'}>{t.success_rate}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Accès rapides */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/qcm" className="glass rounded-xl p-3 text-center text-[12px] text-white/70 hover:bg-white/[0.03]">📋 Faire un QCM</Link>
            <Link href="/leaderboard" className="glass rounded-xl p-3 text-center text-[12px] text-white/70 hover:bg-white/[0.03]">🏆 Voir le classement</Link>
          </div>
        </>
      )}

      <Link href="/" className="text-center text-[11px] text-white/30 hover:text-white/50 py-2">← Retour à MA1</Link>
    </div>
  );
}
