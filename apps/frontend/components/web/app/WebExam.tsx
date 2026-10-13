'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Timer, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';
import { AppPage, QuestionCard } from './AppPage';

interface Q { question: string; choices: string[]; answer_index: number; ref?: string; explanation?: string; image_url?: string }
const TOPICS = ['vitesse', 'signalisation', 'priorite', 'alcool', 'permis', 'autoroute', 'stationnement', 'securite', 'premiers_secours'];
const L = ['A', 'B', 'C', 'D'];
const DURATION = 1800;

const clock = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Maquette 09 — Examen blanc. Mêmes règles que ExamPanel : 40 questions, 30 min, seuil 80 % (32/40).
export function WebExam() {
  const { userId, addXP, recordAnswer } = useStore();
  const [phase, setPhase] = useState<'start' | 'run' | 'done'>('start');
  const [qs, setQs] = useState<Q[]>([]);
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState<(number | null)[]>([]);
  const [sec, setSec] = useState(DURATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs : `finish` est aussi appelée depuis le timer, il lui faut les valeurs courantes.
  const qsRef = useRef<Q[]>([]); const ansRef = useRef<(number | null)[]>([]); const secRef = useRef(DURATION);
  qsRef.current = qs; ansRef.current = ans; secRef.current = sec;

  const stop = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  useEffect(() => stop, []);

  const finish = useCallback(() => {
    stop();
    const Q = qsRef.current, A = ansRef.current;
    const ok = Q.reduce((a, q, i) => a + (A[i] === q.answer_index ? 1 : 0), 0);
    Q.forEach((q, i) => recordAnswer(A[i] === q.answer_index));
    addXP(ok >= 32 ? 50 : 20); showXPToast(ok >= 32 ? '+50 XP · Examen réussi' : '+20 XP');
    api.submitExamResult(userId, ok, Q.length, DURATION - secRef.current).catch(() => {});
    setPhase('done');
  }, [addXP, recordAnswer, userId]);

  useEffect(() => { if (sec === 0 && phase === 'run') finish(); }, [sec, phase, finish]);

  const start = async () => {
    setLoading(true); setError('');
    const all: Q[] = [];
    const tops = [...TOPICS].sort(() => Math.random() - 0.5).slice(0, 5);
    for (const t of tops) { try { const d = await api.generateQCM(t, 8, userId, 'auto'); all.push(...(d.questions || [])); } catch {} }
    setLoading(false);
    if (all.length < 10) { setError("Impossible de générer l'examen pour le moment. Vérifiez la connexion au serveur et réessayez."); return; }
    const exam = all.sort(() => Math.random() - 0.5).slice(0, 40);
    setQs(exam); setAns(new Array(exam.length).fill(null)); setCur(0); setSec(DURATION); setReview(false); setPhase('run');
    timer.current = setInterval(() => setSec(s => (s <= 1 ? 0 : s - 1)), 1000);
  };

  const quit = () => { if (confirm("Quitter l'examen ? Votre progression sera perdue.")) { stop(); setPhase('start'); setQs([]); } };
  const pick = (i: number) => setAns(p => { const n = [...p]; n[cur] = i; return n; });

  const ok = qs.reduce((a, q, i) => a + (ans[i] === q.answer_index ? 1 : 0), 0);
  const pct = qs.length ? Math.round((ok / qs.length) * 100) : 0;
  const q = qs[cur];
  const answered = ans.filter(a => a !== null).length;

  if (phase === 'start') return (
    <AppPage title="Examen Blanc" subtitle="Conditions réelles pour vous entraîner comme le jour J.">
      <div className="app-card flex flex-col items-center gap-5 px-8 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ma1-blue/20"><FileText size={30} className="text-ma1-sky" /></span>
        <p className="text-sm text-slate-300">40 questions · 30 minutes · Seuil de réussite : 80 % (32/40)</p>
        <button onClick={start} disabled={loading} className="web-btn-primary !px-12 !py-4 !text-base disabled:opacity-60">{loading ? 'Génération de l’examen…' : 'Commencer'}</button>
        {error && <p role="alert" className="text-xs font-semibold text-ma1-red">{error}</p>}
      </div>
    </AppPage>
  );

  if (phase === 'done') return (
    <AppPage title={pct >= 80 ? 'Félicitations !' : 'Continuez !'} subtitle="Résultat de votre examen blanc.">
      <div className="app-card flex flex-col items-center gap-6 px-8 py-12 text-center">
        <div className={`flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 ${pct >= 80 ? 'border-ma1-green/50 bg-ma1-green/10' : 'border-ma1-red/40 bg-ma1-red/10'}`}>
          <div className={`font-display text-4xl font-black ${pct >= 80 ? 'text-ma1-green' : 'text-ma1-red'}`}>{ok}/{qs.length}</div>
          <div className="text-xs text-slate-400">{pct} %</div>
        </div>
        <div className="flex gap-10 text-center">
          <div><div className="font-display text-xl font-extrabold text-ma1-green">{ok}</div><div className="text-[11px] text-slate-400">Correctes</div></div>
          <div><div className="font-display text-xl font-extrabold text-ma1-red">{qs.length - ok}</div><div className="text-[11px] text-slate-400">Erreurs</div></div>
          <div><div className="font-display text-xl font-extrabold">{Math.floor((DURATION - sec) / 60)} min</div><div className="text-[11px] text-slate-400">Temps</div></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPhase('start'); setQs([]); setAns([]); }} className="web-btn-primary">Réessayer</button>
          <button onClick={() => setReview(r => !r)} className="web-btn-dark">{review ? 'Masquer le détail' : 'Voir le détail'}</button>
        </div>
        {review && (
          <div className="mt-2 flex w-full max-w-2xl flex-col gap-2.5 text-left">
            {qs.map((x, i) => { const c = ans[i] === x.answer_index; return (
              <div key={i} className={`rounded-xl border p-4 text-xs leading-relaxed ${c ? 'border-ma1-green/20 bg-ma1-green/[0.05]' : 'border-ma1-red/20 bg-ma1-red/[0.05]'}`}>
                <strong>Q{i + 1} · {c ? 'Correct' : 'Erreur'} :</strong> {x.question}<br />
                <span className="text-slate-400">Votre réponse : {ans[i] !== null ? L[ans[i]!] : '—'}{!c && ` · Bonne réponse : ${L[x.answer_index]}`}</span>
                {x.explanation && <div className="mt-1 italic text-slate-500">{x.explanation}</div>}
              </div>
            ); })}
          </div>
        )}
      </div>
    </AppPage>
  );

  return (
    <AppPage title="Examen Blanc" subtitle="Conditions réelles pour vous entraîner comme le jour J."
      actions={
        <div className="flex items-center gap-3">
          <div className={`app-card flex items-center gap-2.5 px-5 py-2.5 font-display text-sm font-bold ${sec <= 300 ? 'text-ma1-red' : 'text-ma1-sky'}`} role="timer" aria-label="Temps restant"><Timer size={17} />{clock(sec)}</div>
          <button onClick={quit} className="rounded-2xl border border-ma1-red/40 bg-ma1-red/10 px-6 py-2.5 text-sm font-bold text-ma1-red hover:bg-ma1-red/20">Quitter</button>
        </div>
      }>
      {q && <QuestionCard index={cur} total={qs.length} refLabel={q.ref} question={q.question} imageUrl={q.image_url} choices={q.choices} selected={ans[cur]} onPick={pick} />}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} className="web-btn-dark !px-8 disabled:opacity-40"><ArrowLeft size={16} />Question précédente</button>
        <span className="text-xs text-slate-500">{answered}/{qs.length} réponses</span>
        {cur + 1 >= qs.length
          ? <button onClick={finish} className="web-btn-primary !px-8">Terminer l&apos;examen</button>
          : <button onClick={() => setCur(c => c + 1)} className="web-btn-primary !px-8">Question suivante<ArrowRight size={16} /></button>}
      </div>
    </AppPage>
  );
}
