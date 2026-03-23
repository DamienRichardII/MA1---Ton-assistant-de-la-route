'use client';
import { useState, useEffect } from 'react';

const ADMIN_PW = 'ma1admin2026';

interface Analytics {
  total_users?: number;
  new_users?: number;
  active_users?: number;
  total_sessions?: number;
  avg_session_duration?: number;
  total_questions?: number;
  avg_success_rate?: number;
  premium_users?: number;
  revenue_estimate?: number;
  top_topics?: Array<{ topic: string; count: number }>;
  exam_stats?: { total: number; passed: number; avg_score: number };
  daily_users?: Array<{ date: string; count: number }>;
}

interface Health { status: string; version?: string; uptime?: number; db?: string; ai?: string; }

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [data, setData] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<'overview' | 'users' | 'content' | 'system'>('overview');
  const [loading, setLoading] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const login = () => {
    if (pw === ADMIN_PW || pw === (typeof window !== 'undefined' ? localStorage.getItem('ma1_admin_pw') || '' : '')) {
      setAuth(true);
      load();
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [a, h] = await Promise.all([
        fetch(`${API}/analytics/summary?days=${days}`).then(r => r.json()),
        fetch(`${API}/health`).then(r => r.json()),
      ]);
      setData(a);
      setHealth(h);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (auth) load(); }, [days, auth]);

  if (!auth) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-3">🛡️</div>
        <h2 className="font-display text-xl font-extrabold mb-1">Admin MA1</h2>
        <p className="text-white/40 text-xs mb-5">Accès réservé à DamCompany</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Mot de passe admin"
          className="w-full px-4 py-3 rounded-xl border border-white/[0.12] bg-white/[0.03] text-white text-sm outline-none mb-3"
          onKeyDown={e => { if (e.key === 'Enter') login(); }} />
        <button onClick={login} className="btn-primary w-full">Connexion Admin</button>
      </div>
    </div>
  );

  const statCard = (icon: string, label: string, value: string | number | undefined, sub?: string, color = 'text-ma1-ice') => (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-display text-2xl font-extrabold ${color}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-white/50 font-semibold">{label}</div>
      {sub && <div className="text-[9px] text-white/25 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold">🛡️ Admin Dashboard — DamCompany</h1>
          <div className={`text-[11px] mt-0.5 ${health?.status === 'ok' ? 'text-ma1-green' : 'text-ma1-red'}`}>
            {health ? `● Backend ${health.status} · v${health.version || '?'}` : '○ Connexion backend…'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(+e.target.value)}
            className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white text-xs outline-none">
            <option value={1}>24h</option><option value={7}>7 jours</option><option value={30}>30 jours</option><option value={90}>90 jours</option>
          </select>
          <button onClick={load} className="px-3 py-1.5 rounded-full border border-ma1-teal/20 bg-ma1-teal/8 text-ma1-sky text-xs font-semibold hover:bg-ma1-teal/16 transition-all">
            {loading ? '…' : '↻ Actualiser'}
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-1 w-fit">
        {(['overview', 'users', 'content', 'system'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-ma1-teal/15 text-ma1-sky border border-ma1-teal/25' : 'text-white/30 hover:text-white/60'}`}>
            {t === 'overview' ? '📊 Vue globale' : t === 'users' ? '👥 Utilisateurs' : t === 'content' ? '📋 Contenu' : '⚙️ Système'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCard('👥', 'Utilisateurs totaux', data?.total_users, `+${data?.new_users ?? 0} nouveaux`, 'text-ma1-sky')}
            {statCard('🔥', 'Actifs (période)', data?.active_users, `sur ${days} jours`, 'text-ma1-teal')}
            {statCard('✨', 'Comptes Premium', data?.premium_users, undefined, 'text-ma1-gold')}
            {statCard('💶', 'Revenu estimé', data?.revenue_estimate ? `${data.revenue_estimate}€` : '—', 'sur la période', 'text-ma1-green')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCard('📋', 'Questions posées', data?.total_questions, undefined, 'text-ma1-purple')}
            {statCard('🎯', 'Taux de réussite', data?.avg_success_rate ? `${Math.round(data.avg_success_rate)}%` : '—', 'moyen global')}
            {statCard('📝', 'Examens passés', data?.exam_stats?.total, undefined, 'text-ma1-sky')}
            {statCard('✅', 'Taux réussite exam', data?.exam_stats ? `${Math.round((data.exam_stats.passed / Math.max(1, data.exam_stats.total)) * 100)}%` : '—', undefined, 'text-ma1-green')}
          </div>

          {/* Daily graph placeholder */}
          {data?.daily_users && data.daily_users.length > 0 && (
            <div className="glass rounded-3xl p-5">
              <h3 className="font-display text-sm font-extrabold mb-3">📈 Utilisateurs actifs par jour</h3>
              <div className="flex items-end gap-1 h-24">
                {data.daily_users.map((d, i) => {
                  const max = Math.max(...data.daily_users!.map(x => x.count), 1);
                  const h = Math.max(4, (d.count / max) * 88);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="rounded-t-sm bg-gradient-to-t from-ma1-teal to-ma1-sky opacity-70 w-full transition-all" style={{ height: `${h}px` }} title={`${d.date}: ${d.count}`} />
                      {i % Math.ceil(data.daily_users!.length / 7) === 0 && (
                        <span className="text-[8px] text-white/20 truncate">{d.date.slice(5)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'users' && (
        <div className="glass rounded-3xl p-5 flex flex-col gap-3">
          <h3 className="font-display text-sm font-extrabold">👥 Gestion Utilisateurs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statCard('🆕', 'Nouveaux / période', data?.new_users, undefined, 'text-ma1-sky')}
            {statCard('📊', 'Sessions totales', data?.total_sessions, undefined, 'text-ma1-teal')}
            {statCard('⏱', 'Durée moy. session', data?.avg_session_duration ? `${Math.round(data.avg_session_duration)}s` : '—', undefined)}
          </div>
          <div className="mt-2 text-center text-white/30 text-xs py-6 border border-white/[0.04] rounded-2xl">
            🔗 Tableau complet des utilisateurs via Supabase Studio
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div className="glass rounded-3xl p-5 flex flex-col gap-3">
          <h3 className="font-display text-sm font-extrabold">📋 Statistiques de contenu</h3>
          {data?.top_topics && data.top_topics.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-white/30 font-bold uppercase tracking-wide mb-1">Thèmes les + pratiqués</div>
              {data.top_topics.map((t, i) => {
                const max = Math.max(...data.top_topics!.map(x => x.count), 1);
                return (
                  <div key={t.topic} className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 w-4 text-right">{i + 1}</span>
                    <span className="text-xs text-white/60 w-32 truncate capitalize">{t.topic.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-ma1-teal to-ma1-sky rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-white/30 w-10 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-white/30 text-sm py-6">Aucune donnée de contenu disponible.</div>
          )}
        </div>
      )}

      {tab === 'system' && (
        <div className="flex flex-col gap-3">
          <div className="glass rounded-3xl p-5">
            <h3 className="font-display text-sm font-extrabold mb-3">⚙️ État du système</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Backend FastAPI', val: health?.status === 'ok' ? '● OK' : '○ KO', ok: health?.status === 'ok' },
                { label: 'Base de données', val: health?.db === 'ok' ? '● OK' : '○ KO', ok: health?.db === 'ok' },
                { label: 'IA / LLM', val: health?.ai === 'ok' ? '● OK' : '○ KO', ok: health?.ai === 'ok' },
                { label: 'Uptime', val: health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : '—', ok: true },
              ].map(s => (
                <div key={s.label} className="glass-subtle rounded-2xl p-3 text-center">
                  <div className={`font-display text-sm font-extrabold ${s.ok ? 'text-ma1-green' : 'text-ma1-red'}`}>{s.val}</div>
                  <div className="text-[10px] text-white/30">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="font-display text-sm font-extrabold mb-3">🔗 Liens rapides</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '📊 Supabase', href: 'https://app.supabase.com' },
                { label: '🚀 Vercel', href: 'https://vercel.com/dashboard' },
                { label: '🚂 Railway', href: 'https://railway.app' },
                { label: '💳 Stripe', href: 'https://dashboard.stripe.com' },
                { label: '📧 Resend', href: 'https://resend.com/dashboard' },
                { label: '🤖 Anthropic', href: 'https://console.anthropic.com' },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all">{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
