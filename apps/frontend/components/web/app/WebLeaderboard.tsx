'use client';
import { useState, useEffect, useCallback } from 'react';
import { Crown } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { AppPage, Spinner } from './AppPage';

interface Entry { user_id: string; name: string; xp: number; streak: number; success_rate: number; level: string }
const SORTS = [['xp', 'Global (XP)'], ['streak', 'Série'], ['rate', 'Réussite']] as const;

function Avatar({ name, size = 44, ring }: { name: string; size?: number; ring?: string }) {
  return <span className={`flex items-center justify-center rounded-full bg-gradient-to-br from-ma1-blue to-ma1-teal font-display font-extrabold text-white ${ring || ''}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>{(name || '?').charAt(0).toUpperCase()}</span>;
}

// Maquette 13 — Classement. Données réelles (API /leaderboard + /user/rank), aucun joueur fictif.
export function WebLeaderboard() {
  const { userId, isLoggedIn } = useStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sort, setSort] = useState<'xp' | 'streak' | 'rate'>('xp');
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<{ rank: number | null; total_players: number; xp?: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.getLeaderboard(30);
      const list: Entry[] = [...(d.leaderboard || [])];
      if (sort === 'streak') list.sort((a, b) => b.streak - a.streak);
      else if (sort === 'rate') list.sort((a, b) => b.success_rate - a.success_rate);
      setEntries(list);
    } catch { setEntries([]); }
    setLoading(false);
  }, [sort]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (isLoggedIn) api.getUserRank().then(setRank).catch(() => {}); }, [isLoggedIn]);

  const metric = (e: Entry) => sort === 'xp' ? `${e.xp} pts` : sort === 'streak' ? `${e.streak} j` : `${e.success_rate} %`;
  const top = entries.slice(0, 3);
  // Ordre d'affichage du podium : 2e, 1er, 3e.
  const podium = [top[1], top[0], top[2]].map((e, i) => e && { e, place: [2, 1, 3][i] });

  return (
    <AppPage title="Classement" subtitle="Progressez et défiez la communauté MA1."
      actions={
        <div className="app-card min-w-[200px] px-6 py-3 text-center">
          <div className="text-[11px] font-semibold text-ma1-sky">Votre position</div>
          <div className="font-display text-3xl font-extrabold">{rank?.rank ? `#${rank.rank}` : '—'}</div>
          <div className="text-[11px] text-slate-400">{isLoggedIn ? (rank?.xp !== undefined ? `${rank.xp} points` : 'Pas encore classé') : 'Connectez-vous pour être classé'}</div>
        </div>
      }>
      <div role="tablist" aria-label="Tri" className="mb-6 flex gap-2">
        {SORTS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={sort === k} onClick={() => setSort(k)}
            className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-colors ${sort === k ? 'bg-ma1-blue text-white' : 'border border-ma1-app-line text-slate-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {loading ? <Spinner label="Chargement…" /> : entries.length === 0 ? (
        <div className="app-card py-16 text-center text-sm text-slate-400">Aucun classement disponible pour le moment.</div>
      ) : (
        <>
          <div className="app-card mb-6 grid grid-cols-3 items-end gap-4 px-8 pb-6 pt-10">
            {podium.map((p, i) => p ? (
              <div key={p.e.user_id} className={`flex flex-col items-center gap-2 text-center ${p.place === 1 ? '-translate-y-3' : ''}`}>
                {p.place === 1 && <Crown size={26} className="text-ma1-gold" />}
                <Avatar name={p.e.name} size={p.place === 1 ? 84 : 66} ring={p.place === 1 ? 'ring-4 ring-ma1-gold/70' : 'ring-4 ring-ma1-blue/50'} />
                <span className={`flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-extrabold ${p.place === 1 ? 'bg-ma1-gold text-ma1-ink' : 'bg-ma1-blue text-white'}`}>{p.place}</span>
                <div className="text-sm font-bold">{p.e.name}{p.e.user_id === userId ? ' (vous)' : ''}</div>
                <div className="text-xs font-semibold text-ma1-sky">{metric(p.e)}</div>
              </div>
            ) : <div key={i} />)}
          </div>
          <ul className="flex flex-col gap-2">
            {entries.slice(3).map((e, i) => (
              <li key={e.user_id} className={`app-card flex items-center gap-4 px-5 py-3 ${e.user_id === userId ? '!border-ma1-blue/70 bg-ma1-blue/10' : ''}`}>
                <span className="w-7 text-center font-display text-sm font-extrabold text-slate-400">{i + 4}</span>
                <Avatar name={e.name} size={36} />
                <span className="flex-1 text-sm font-semibold">{e.name}{e.user_id === userId ? ' (vous)' : ''}<span className="ml-2 text-[11px] font-normal text-slate-500">{e.level} · {e.success_rate} %</span></span>
                <span className="text-sm font-bold text-slate-300">{metric(e)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppPage>
  );
}
