'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Lock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { TOPICS, PREMIUM_TOPICS } from '@/lib/constants';
import { showXPToast } from '@/components/gamification/XPToast';
import { AppPage, QuestionCard, Spinner } from './AppPage';

interface Q { id: string; question: string; choices: string[]; answer_index: number; explanation?: string; ref?: string; image_url?: string }
interface ThemeStat { topic: string; total_answers: number; success_rate: number }

const ALL = [...TOPICS, ...PREMIUM_TOPICS] as ReadonlyArray<{ id: string; label: string; icon: string }>;
const DIFFS = [['auto', 'Toutes'], ['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile']] as const;
const BAR = ['bg-[#1fa86a]', 'bg-[#e0424d]', 'bg-[#2f7bff]', 'bg-[#e89a2d]', 'bg-[#8b5cf6]', 'bg-[#0ea5b7]'];

function Ring({ pct, size = 150 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Taux de réussite ${pct} %`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(120,170,255,0.14)" strokeWidth="12" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2fb4ff" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-[34px] font-extrabold">{pct}%</div>
    </div>
  );
}

// Maquette 11 — QCM : hub des thèmes (progression réelle) + session de questions.
export function WebQCM() {
  const { userId, topic, setTopic, plan, isLoggedIn, profile, qcmTotal, qcmCorrect } = useStore();
  const [view, setView] = useState<'hub' | 'session'>('hub');
  const [diff, setDiff] = useState<string>('auto');
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState<ThemeStat[]>([]);
  const [overall, setOverall] = useState<{ rate: number; total: number } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    api.getUserThemeStats().then((d: any) => setStats(d?.themes || [])).catch(() => {});
    api.getUserStats().then((s: any) => s && setOverall({ rate: Math.round(s.success_rate || 0), total: s.score_total || 0 })).catch(() => {});
  }, [isLoggedIn, view]);

  const byTopic = useMemo(() => {
    const m: Record<string, { total: number; rate: number }> = {};
    Object.entries(profile.theme_scores || {}).forEach(([k, v]) => { if (v.total) m[k] = { total: v.total, rate: Math.round((v.correct / v.total) * 100) }; });
    stats.forEach(s => { m[s.topic] = { total: s.total_answers, rate: Math.round(s.success_rate) }; });
    return m;
  }, [stats, profile.theme_scores]);

  const total = overall?.total ?? qcmTotal;
  const rate = overall?.rate ?? (qcmTotal ? Math.round((qcmCorrect / qcmTotal) * 100) : 0);
  const open = (id: string) => { setTopic(id); setView('session'); };
  const list = ALL.filter(t => filter === 'all' || t.id === filter);

  if (view === 'session') return <QcmSession diff={diff} setDiff={setDiff} onBack={() => setView('hub')} />;

  return (
    <AppPage title="QCM" subtitle="Entraînez-vous avec des milliers de questions."
      actions={<span className="app-card px-4 py-2 text-xs font-semibold text-slate-300">Plan {plan === 'free' ? 'Gratuit' : 'Premium'}</span>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="app-card p-6">
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-400">Thème
              <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-ma1-app-line bg-ma1-app-bg px-3 py-2 text-xs text-white outline-none">
                <option value="all">Tous les thèmes</option>{ALL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select></label>
            <div className="flex items-center gap-2 text-xs text-slate-400">Difficulté
              <div className="flex gap-1">{DIFFS.map(([v, l]) => (
                <button key={v} onClick={() => setDiff(v)} aria-pressed={diff === v} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${diff === v ? 'bg-ma1-blue text-white' : 'border border-ma1-app-line text-slate-400 hover:text-white'}`}>{l}</button>))}</div></div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {list.map((t, i) => {
              const premium = (PREMIUM_TOPICS as ReadonlyArray<{ id: string }>).some(p => p.id === t.id);
              const locked = premium && plan === 'free';
              const st = byTopic[t.id];
              return (
                <li key={t.id}>
                  <button onClick={() => !locked && open(t.id)} disabled={locked}
                    className="flex w-full items-center gap-4 rounded-2xl border border-ma1-app-line bg-white/[0.03] px-4 py-3.5 text-left transition-all hover:border-ma1-blue/50 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg text-white ${BAR[i % BAR.length]}`}>{t.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{t.label}</span>
                      <span className="block text-[11px] text-slate-400">{st ? `${st.total} réponses` : 'Pas encore commencé'}</span>
                    </span>
                    <span className="h-1.5 w-[28%] overflow-hidden rounded-full bg-white/10"><span className={`block h-full rounded-full ${BAR[i % BAR.length]}`} style={{ width: `${st?.rate ?? 0}%` }} /></span>
                    <span className="w-10 text-right text-xs font-bold text-slate-300">{locked ? <Lock size={14} className="ml-auto text-ma1-gold" /> : st ? `${st.rate}%` : '—'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <div className="app-card flex flex-col items-center p-6 text-center">
            <h2 className="mb-4 self-start font-display text-sm font-bold">Ma progression</h2>
            <Ring pct={rate} />
            <p className="mt-4 text-xs text-slate-400">{total} {total > 1 ? 'questions répondues' : 'question répondue'}</p>
            <button onClick={() => open(topic)} className="web-btn-primary mt-5 w-full">Continuer mes révisions</button>
          </div>
        </div>
      </div>
    </AppPage>
  );
}

function QcmSession({ diff, setDiff, onBack }: { diff: string; setDiff: (d: string) => void; onBack: () => void }) {
  const { userId, topic, recordAnswer, addXP } = useStore();
  const [qs, setQs] = useState<Q[]>([]);
  const [cur, setCur] = useState(0);
  const [load, setLoad] = useState(false);
  const [ans, setAns] = useState<number | null>(null);
  const [ok, setOk] = useState(0);
  const [ko, setKo] = useState(0);
  const label = ALL.find(t => t.id === topic)?.label || topic;

  const gen = useCallback(async () => {
    setLoad(true); setAns(null);
    try {
      const d = await api.generateQCM(topic, 8, userId, diff);
      setQs(d.questions || []); setCur(0);
      try { const c = JSON.parse(localStorage.getItem('ma1_qcm_cache') || '{}'); c[topic] = d.questions; localStorage.setItem('ma1_qcm_cache', JSON.stringify(c)); } catch {}
    } catch {
      try { const c = JSON.parse(localStorage.getItem('ma1_qcm_cache') || '{}'); if (c[topic]) { setQs(c[topic]); setCur(0); } } catch {}
    }
    setLoad(false);
  }, [topic, userId, diff]);

  useEffect(() => { gen(); }, [gen]);
  const q = qs[cur];

  const answer = async (i: number) => {
    if (ans !== null || !q) return;
    setAns(i);
    const correct = i === q.answer_index;
    recordAnswer(correct);
    if (correct) { setOk(v => v + 1); addXP(10); showXPToast('+10 XP · Bonne réponse'); } else setKo(v => v + 1);
    try { await api.submitQCMResult(userId, topic, correct); } catch {}
  };
  const next = () => { setAns(null); if (cur + 1 >= qs.length) gen(); else setCur(c => c + 1); };

  return (
    <AppPage title={label} subtitle="Répondez, puis lisez l'explication avant de passer à la suite."
      actions={
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-ma1-green/30 bg-ma1-green/10 px-3 py-1.5 text-xs font-bold text-ma1-green">✓ {ok}</span>
          <span className="rounded-full border border-ma1-red/30 bg-ma1-red/10 px-3 py-1.5 text-xs font-bold text-ma1-red">✕ {ko}</span>
          <select value={diff} onChange={e => setDiff(e.target.value)} aria-label="Difficulté" className="rounded-xl border border-ma1-app-line bg-ma1-app-card px-3 py-2 text-xs text-white outline-none">
            <option value="auto">Adaptatif</option><option value="facile">Facile</option><option value="moyen">Moyen</option><option value="difficile">Difficile</option></select>
          <button onClick={gen} className="web-btn-dark !px-4 !py-2 !text-xs"><RefreshCw size={14} />Nouvelles</button>
        </div>
      }>
      {load ? <Spinner label="Génération des questions…" /> : q ? (
        <>
          <QuestionCard index={cur} total={qs.length} refLabel={q.ref || 'Code de la Route'} question={q.question} imageUrl={q.image_url}
            choices={q.choices} selected={ans} correctIndex={q.answer_index} onPick={answer} disabled={ans !== null} />
          {ans !== null && q.explanation && <div className="mt-5 rounded-2xl border-l-2 border-ma1-blue bg-ma1-blue/10 p-5 text-sm leading-relaxed text-slate-300">{q.explanation}</div>}
          <div className="mt-6 flex items-center justify-between">
            <button onClick={onBack} className="web-btn-dark !px-8"><ArrowLeft size={16} />Tous les thèmes</button>
            {ans !== null && <button onClick={next} className="web-btn-primary !px-8">Question suivante<ArrowRight size={16} /></button>}
          </div>
        </>
      ) : (
        <div className="app-card flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-slate-400">Impossible de charger les questions.</p>
          <div className="flex gap-3"><button onClick={gen} className="web-btn-primary">Réessayer</button><button onClick={onBack} className="web-btn-dark">Retour</button></div>
        </div>
      )}
    </AppPage>
  );
}
