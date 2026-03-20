'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [data, setData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [days, setDays] = useState(7);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const login = () => {
    if (pw === 'ma1admin2026' || pw === (typeof window !== 'undefined' ? localStorage.getItem('ma1_admin_pw') : '')) {
      setAuth(true); load();
    }
  };

  const load = async () => {
    try {
      const [a, h] = await Promise.all([
        fetch(`${API}/analytics/summary?days=${days}`).then(r => r.json()),
        fetch(`${API}/health`).then(r => r.json()),
      ]);
      setData(a); setHealth(h);
    } catch {}
  };

  useEffect(() => { if (auth) load(); }, [days, auth]);

  if (!auth) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="glass rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="font-display text-xl font-extrabold mb-4">🔐 Admin MA1</h2>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Mot de passe admin"
          className="w-full px-4 py-3 rounded-xl border border-white/[0.12] bg-white/[0.03] text-white text-sm outline-none mb-3"
          onKeyDown={e => { if (e.key === 'Enter') login(); }} />
        <button onClick={login} className="btn-primary w-full">Connexion</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold">🛡️ Admin DamCompany</h1>
        <select value={days} onChange={e => setDays(+e.target.value)} className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white text-xs outline-none">
          <option value={1}>24h</option><option value={7}>7 jours</option><option value={30}>30 jours</option><option value={90}>90 jours</option>
        </select>
      </div>

      {/* Health */}
      {health && (
        <div className="glass rounded-xl p-4">
          <h3 className="font-display text-sm font-bold mb-2">Système</h3>
          <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-2 text-xs">
            <div>Version: <strong>{health.version}</strong></div>
            <div>RAG: <strong className={health.rag ? 'text-[#2ed573]' : 'text-[#ff4757]'}>{health.rag ? 'OK' : 'OFF'}</strong></div>
            <div>Supabase: <strong className={health.supabase ? 'text-[#2ed573]' : 'text-[#ffa502]'}>{health.supabase ? 'OK' : 'Memory'}</strong></div>
            <div>Stripe: <strong className={health.stripe ? 'text-[#2ed573]' : 'text-[#ff4757]'}>{health.stripe ? 'OK' : 'OFF'}</strong></div>
            <div>Email: <strong className={health.email ? 'text-[#2ed573]' : 'text-[#ffa502]'}>{health.email ? 'OK' : 'OFF'}</strong></div>
            <div>API Key: <strong className={health.api_key ? 'text-[#2ed573]' : 'text-[#ff4757]'}>{health.api_key ? 'OK' : 'MISSING'}</strong></div>
          </div>
        </div>
      )}

      {/* KPIs */}
      {data && (
        <>
          <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-3">
            {[
              { v: data.total_users || 0, l: 'Utilisateurs totaux', c: '#7ec8e3' },
              { v: data.unique_users || 0, l: `Actifs (${days}j)`, c: '#2ed573' },
              { v: data.events || 0, l: `Événements (${days}j)`, c: '#a55eea' },
              { v: data.by_type?.register || 0, l: `Inscriptions (${days}j)`, c: '#ffa502' },
            ].map((s, i) => (
              <div key={i} className="glass rounded-xl p-4 text-center">
                <div className="font-display text-2xl font-black" style={{ color: s.c }}>{s.v}</div>
                <div className="text-[9px] text-white/30 uppercase tracking-wide mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Events by type */}
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-3">Événements par type</h3>
            <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-2">
              {Object.entries(data.by_type || {}).sort((a: any, b: any) => b[1] - a[1]).map(([k, v]: any) => (
                <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-xs text-white/50">{k}</span>
                  <span className="font-display font-bold text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DAU */}
          {data.dau && Object.keys(data.dau).length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="font-display text-sm font-bold mb-3">DAU (Users actifs par jour)</h3>
              <div className="flex items-end gap-1 h-24">
                {Object.entries(data.dau).slice(-14).map(([date, count]: any) => {
                  const max = Math.max(...Object.values(data.dau).map(Number));
                  const pct = max > 0 ? (count / max) * 100 : 0;
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-gradient-to-t from-[#3a9db0] to-[#7ec8e3]" style={{ height: `${Math.max(pct, 4)}%` }} />
                      <span className="text-[8px] text-white/20 -rotate-45">{date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Conversions */}
          <div className="glass rounded-xl p-4">
            <h3 className="font-display text-sm font-bold mb-2">Métriques clés</h3>
            <div className="text-xs text-white/40 space-y-1">
              <div>Inscriptions: {data.by_type?.register || 0} | Logins: {data.by_type?.login || 0}</div>
              <div>Chats: {data.by_type?.chat || 0} | QCM: {data.by_type?.qcm || data.by_type?.qcm_cached || 0} | Exams: {data.by_type?.exam || 0}</div>
              <div>Subscriptions: {data.by_type?.subscription || 0}</div>
              <div className="pt-2 text-white/25">Taux conversion = subscriptions / registrations = {data.by_type?.register ? Math.round(((data.by_type?.subscription || 0) / data.by_type.register) * 100) : 0}%</div>
            </div>
          </div>

          {/* Trigger cron */}
          <button onClick={async () => {
            const r = await fetch(`${API}/cron/daily`, { method: 'POST' });
            const d = await r.json();
            alert(JSON.stringify(d, null, 2));
          }} className="btn-ghost self-start">⏰ Trigger cron daily</button>
        </>
      )}
    </div>
  );
}
