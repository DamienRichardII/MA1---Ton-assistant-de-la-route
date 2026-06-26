'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

export function LeaderboardPanel() {
  const { userId } = useStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [sort, setSort] = useState('xp');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLB(); }, [sort]);

  const loadLB = async () => {
    setLoading(true);
    try {
      const d = await api.getLeaderboard(30);
      let list = d.leaderboard || [];
      if (sort === 'streak') list.sort((a: any, b: any) => b.streak - a.streak);
      else if (sort === 'rate') list.sort((a: any, b: any) => b.success_rate - a.success_rate);
      setEntries(list);
    } catch { setEntries([]); }
    setLoading(false);
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
      <div className="font-display text-[17px] font-extrabold flex items-center gap-2">🏆 Classement</div>
      <div className="flex gap-1 mb-2">
        {['xp', 'streak', 'rate'].map((s) => (
          <button key={s} onClick={() => setSort(s)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all
              ${sort === s ? 'bg-ma1-teal/10 text-ma1-sky border-ma1-teal/20' : 'border-white/[0.08] text-white/30 hover:text-white/50'}`}>
            {s === 'xp' ? 'XP' : s === 'streak' ? 'Streak 🔥' : 'Réussite %'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-10 text-white/40 text-sm">Chargement...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-white/30 text-sm">Aucun classement disponible.</div>
      ) : (
        entries.map((e, i) => {
          const isMe = e.user_id === userId;
          return (
            <div key={e.user_id}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all
                ${isMe ? 'border-ma1-teal/20 bg-ma1-teal/10' : 'border-white/[0.08] bg-[rgba(15,40,70,0.35)]'}`}>
              <div className={`font-display text-base font-extrabold w-7 text-center
                ${i === 0 ? 'text-ma1-gold' : i === 1 ? 'text-ma1-sky-bright' : i === 2 ? 'text-ma1-orange' : 'text-white/30'}`}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[13px]">{e.name}{isMe ? ' (vous)' : ''}</div>
                <div className="text-[10px] text-white/30">{e.level} · {e.success_rate}%</div>
              </div>
              <div className="font-display text-sm font-extrabold text-ma1-purple">{e.xp} XP</div>
              {e.streak > 0 && <div className="text-[11px] text-ma1-orange">🔥{e.streak}j</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
