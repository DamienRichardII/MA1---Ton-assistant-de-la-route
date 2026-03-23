'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

interface Q { question: string; choices: string[]; answer_index: number; ref?: string; explanation?: string; }
const L = ['A', 'B', 'C', 'D'];
const TOPICS = ['vitesse', 'signalisation', 'priorite', 'alcool', 'permis', 'autoroute', 'stationnement', 'securite', 'premiers_secours'];

export function ExamPanel() {
  const store = useStore();
  const { userId, plan, addXP, recordAnswer, incrementExamUsed, examUsedToday, examLastDate } = store;
  const [phase, setPhase] = useState<'start' | 'run' | 'done'>('start');
  const [qs, setQs] = useState<Q[]>([]);
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState<(number | null)[]>([]);
  const [sec, setSec] = useState(1800);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<NodeJS.Timeout | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const usedToday = examLastDate === todayStr ? examUsedToday : 0;
  const FREE_LIMIT = 2;
  const remaining = plan === 'free' ? Math.max(0, FREE_LIMIT - usedToday) : 999;
  const blocked = plan === 'free' && remaining <= 0;

  const canUse = () => {
    if (plan !== 'free') return true;
    const today = new Date().toISOString().slice(0, 10);
    if (examLastDate !== today) return true;
    return examUsedToday < FREE_LIMIT;
  };

  const start = async () => {
    if (!canUse()) return;
    setError(''); setLoading(true); setPhase('run');
    const all: Q[] = [];
    const tops = [...TOPICS].sort(() => Math.random() - 0.5).slice(0, 5);
    for (const t of tops) {
      try { const d = await api.generateQCM(t, 8, userId, 'auto'); all.push(...(d.questions || [])); } catch {}
    }
    if (all.length < 10) {
      setPhase('start'); setLoading(false);
      setError('Impossible de charger les questions. Vérifiez votre connexion.');
      return;
    }
    const exam = all.sort(() => Math.random() - 0.5).slice(0, 40);
    setQs(exam); setAns(new Array(exam.length).fill(null));
    setCur(0); setSec(1800); setPicked(null); setLoading(false);
    incrementExamUsed();
    timer.current = setInterval(() => setSec(s => { if (s <= 1) { clearInterval(timer.current!); return 0; } return s - 1; }), 1000);
  };

  useEffect(() => { if (sec === 0 && phase === 'run') finish(); }, [sec]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setAns(p => { const n = [...p]; n[cur] = i; return n; });
    setTimeout(() => { setPicked(null); if (cur + 1 >= qs.length) finish(); else setCur(c => c + 1); }, 700);
  };

  const finish = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase('done');
    const ok = qs.reduce((a, q, i) => a + (ans[i] === q.answer_index ? 1 : 0), 0);
    qs.forEach((_, i) => recordAnswer(ans[i] === qs[i].answer_index));
    addXP(ok >= 32 ? 50 : 20);
    showXPToast(ok >= 32 ? '+50 XP · Examen réussi' : '+20 XP');
    try { api.submitExamResult(userId, ok, qs.length, 1800 - sec); } catch {}
  };

  const ok = qs.reduce((a, q, i) => a + (ans[i] === q.answer_index ? 1 : 0), 0);
  const pct = qs.length ? Math.round(ok / qs.length * 100) : 0;
  const q = qs[cur] ?? null;
  const m = Math.floor(sec / 60), s = sec % 60;

  if (phase === 'start') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="text-5xl">📝</div>
      <h2 className="font-display text-2xl font-extrabold text-ma1-ice">Examen Blanc</h2>
      <p className="text-white/50 text-sm max-w-md">40 questions · 30 minutes · Seuil : 80% (32/40)</p>
      {plan === 'free' && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-semibold ${blocked ? 'bg-ma1-red/8 border-ma1-red/20 text-ma1-red' : 'bg-ma1-teal/8 border-ma1-teal/20 text-ma1-sky'}`}>
          {blocked ? '🔒 Limite atteinte : 2 examens gratuits/jour' : `🎟️ Examens restants aujourd'hui : ${remaining}/${FREE_LIMIT}`}
        </div>
      )}
      {blocked ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/40 text-xs">Reviens demain ou passe Premium pour des examens illimités.</p>
          <button className="btn-primary !px-10 !py-3">✨ Passer Premium — Illimité</button>
        </div>
      ) : (
        <button onClick={start} className="btn-primary !px-10 !py-3.5 !text-base" disabled={loading}>
          {loading ? 'Génération…' : "Commencer l'examen"}
        </button>
      )}
      {error && <p className="text-ma1-red text-sm">{error}</p>}
    </div>
  );

  if (phase === 'done') return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center text-center gap-4 py-8 animate-msg-in">
      <div className="text-5xl">{pct >= 80 ? '🎉' : '💪'}</div>
      <h2 className="font-display text-2xl font-extrabold">{pct >= 80 ? 'Félicitations !' : 'Continuez !'}</h2>
      <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center ${pct >= 80 ? 'bg-ma1-green/8 border-[3px] border-ma1-green/35' : 'bg-ma1-red/6 border-[3px] border-ma1-red/25'}`}>
        <div className={`font-display text-3xl font-black ${pct >= 80 ? 'text-ma1-green' : 'text-ma1-red'}`}>{ok}/{qs.length}</div>
        <div className="text-[10px] text-white/40">{pct}%</div>
      </div>

      {/* Résultats complets */}
      <div className="glass rounded-2xl p-4 w-full max-w-sm grid grid-cols-3 gap-3 text-center">
        <div><div className="font-display text-xl font-extrabold text-ma1-green">{ok}</div><div className="text-[10px] text-white/30">Correctes</div></div>
        <div><div className="font-display text-xl font-extrabold text-ma1-red">{qs.length - ok}</div><div className="text-[10px] text-white/30">Erreurs</div></div>
        <div><div className="font-display text-xl font-extrabold">{Math.floor((1800 - sec) / 60)}min</div><div className="text-[10px] text-white/30">Temps</div></div>
      </div>

      <div className={`px-5 py-2.5 rounded-full text-sm font-bold border ${pct >= 80 ? 'bg-ma1-green/10 text-ma1-green border-ma1-green/25' : 'bg-ma1-red/10 text-ma1-red border-ma1-red/20'}`}>
        {pct >= 80 ? '✅ Réussi — Prêt pour le permis !' : `❌ Insuffisant — Seuil requis : 80% (32/40)`}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={() => { setPhase('start'); setQs([]); setAns([]); setReview(false); }} className="btn-primary !px-8">
          {(plan !== 'free' || remaining > 0) ? 'Réessayer' : 'Retour'}
        </button>
        <button onClick={() => setReview(!review)} className="btn-ghost">📋 {review ? 'Masquer' : 'Voir le détail'}</button>
      </div>

      {review && (
        <div className="w-full max-w-lg flex flex-col gap-2 mt-2 text-left">
          {qs.map((q, i) => {
            const c = ans[i] === q.answer_index;
            return (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed border ${c ? 'bg-ma1-green/[0.03] border-ma1-green/12' : 'bg-ma1-red/[0.03] border-ma1-red/12'}`}>
                <span className="text-base shrink-0">{c ? '✅' : '❌'}</span>
                <div>
                  <strong>Q{i + 1}:</strong> {q.question}<br />
                  <span className="text-white/30">Réponse: {L[ans[i] as number] || '?'}{!c && ` | Bonne: ${L[q.answer_index]}`}</span>
                  {q.explanation && <div className="text-white/25 text-[10.5px] italic mt-1">{q.explanation}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!q) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-ma1-teal animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
      <div className="glass rounded-3xl px-5 py-3 flex items-center justify-between">
        <div>
          <div className={`font-display text-xl font-extrabold ${sec <= 300 ? 'text-ma1-red animate-pulse' : ''}`}>{m}:{s.toString().padStart(2, '0')}</div>
          <div className="text-[9px] text-white/30 mt-0.5">Examen Blanc</div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-44 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-ma1-teal to-ma1-sky rounded-full transition-all" style={{ width: `${(cur / qs.length) * 100}%` }} />
          </div>
          <span className="text-[11px] text-white/40 font-semibold">{cur + 1}/{qs.length}</span>
        </div>
        <button onClick={() => { if (confirm("Abandonner l'examen ?")) { if (timer.current) clearInterval(timer.current); setPhase('start'); } }}
          className="px-3 py-1.5 rounded-full border border-ma1-red/20 text-ma1-red text-[11px] font-semibold">Abandonner</button>
      </div>

      <div className="glass rounded-3xl p-6 animate-msg-in relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-ma1-teal/10 border border-ma1-teal/20 text-ma1-sky">{q.ref || 'Examen'}</span>
          <span className="text-[11px] text-white/30">Q{cur + 1}/{qs.length}</span>
        </div>
        <div className="font-display text-base font-bold leading-relaxed mb-5">{q.question}</div>
        <div className="flex flex-col gap-2">
          {q.choices.map((c, i) => {
            let cls = 'border-white/[0.08] bg-white/[0.02] hover:bg-ma1-teal/8 cursor-pointer';
            if (picked !== null) {
              if (i === q.answer_index) cls = 'border-ma1-green/35 bg-ma1-green/10 text-ma1-green';
              else if (i === picked) cls = 'border-ma1-red/25 bg-ma1-red/8 text-ma1-red';
              else cls = 'border-white/[0.05] opacity-40';
            }
            return (
              <button key={i} onClick={() => pick(i)} disabled={picked !== null}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm text-left transition-all ${cls}`}>
                <span className="w-6 h-6 rounded-lg bg-ma1-teal/8 flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">{L[i]}</span>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
