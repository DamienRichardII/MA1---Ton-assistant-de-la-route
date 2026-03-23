'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { POSITIONING_QUESTIONS } from '@/lib/constants';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

const LETTERS = ['A', 'B', 'C', 'D'];

interface AnswerRecord { topic: string; correct: boolean; question: string; chosen: number; correct_index: number; choices: string[]; }

export default function PositioningPage() {
  const router = useRouter();
  const { userId, addXP, setProfile } = useStore();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [phase, setPhase] = useState<'quiz' | 'results'>('quiz');
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<{ level: string; rate: number; weak: string[]; strong: string[] } | null>(null);

  const q = POSITIONING_QUESTIONS[idx];
  const pct = Math.round((idx / POSITIONING_QUESTIONS.length) * 100);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);

    const correct = i === q.answer;
    const record: AnswerRecord = { topic: q.topic, correct, question: q.q, chosen: i, correct_index: q.answer, choices: q.choices };
    const newAnswers = [...answers, record];

    setTimeout(() => {
      if (idx + 1 >= POSITIONING_QUESTIONS.length) {
        // Compute results
        api.track(userId, 'positioning_complete', { answers: newAnswers.length });
        const rate = newAnswers.filter(a => a.correct).length / newAnswers.length;
        const level = rate >= 0.75 ? 'avance' : rate >= 0.45 ? 'intermediaire' : 'debutant';
        const weakTopics = [...new Set(newAnswers.filter(a => !a.correct).map(a => a.topic))];
        const strongTopics = [...new Set(newAnswers.filter(a => a.correct).map(a => a.topic))];
        setProfile({ level, weak_topics: weakTopics });
        addXP(15);
        showXPToast('+15 XP · Test terminé');
        localStorage.setItem('ma1_pos_done', '1');
        setResults({ level, rate, weak: weakTopics, strong: strongTopics });
        setAnswers(newAnswers);
        setPhase('results');
      } else {
        setAnswers(newAnswers);
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 600);
  };

  const skip = () => { localStorage.setItem('ma1_pos_done', '1'); router.push('/'); };

  const LEVEL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    debutant: { label: 'Débutant', icon: '🌱', color: 'text-ma1-gold' },
    intermediaire: { label: 'Intermédiaire', icon: '⚡', color: 'text-ma1-sky' },
    avance: { label: 'Avancé', icon: '🏆', color: 'text-ma1-green' },
  };

  /* ── RESULTS SCREEN ── */
  if (phase === 'results' && results) {
    const lvl = LEVEL_LABELS[results.level] || LEVEL_LABELS.debutant;
    const correctCount = answers.filter(a => a.correct).length;
    return (
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-5 p-6 text-center py-8">
        <div className="text-4xl">🧪</div>
        <h2 className="font-display text-2xl font-extrabold text-ma1-ice">Résultats du test</h2>

        {/* Score principal */}
        <div className="glass rounded-3xl p-6 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl">{lvl.icon}</span>
            <div>
              <div className={`font-display text-xl font-extrabold ${lvl.color}`}>{lvl.label}</div>
              <div className="text-[11px] text-white/40">Niveau estimé</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center glass-subtle rounded-2xl p-3">
              <div className="font-display text-xl font-extrabold text-ma1-green">{correctCount}</div>
              <div className="text-[10px] text-white/30">Correctes</div>
            </div>
            <div className="text-center glass-subtle rounded-2xl p-3">
              <div className="font-display text-xl font-extrabold text-ma1-red">{answers.length - correctCount}</div>
              <div className="text-[10px] text-white/30">Erreurs</div>
            </div>
            <div className="text-center glass-subtle rounded-2xl p-3">
              <div className="font-display text-xl font-extrabold text-ma1-sky">{Math.round(results.rate * 100)}%</div>
              <div className="text-[10px] text-white/30">Score</div>
            </div>
          </div>
          {/* Score bar */}
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-ma1-teal to-ma1-sky transition-all duration-700" style={{ width: `${Math.round(results.rate * 100)}%` }} />
          </div>
        </div>

        {/* Points forts / faibles */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {results.strong.length > 0 && (
            <div className="glass rounded-2xl p-3 text-left">
              <div className="text-[10px] font-bold text-ma1-green mb-2">✅ Points forts</div>
              {results.strong.slice(0, 3).map(t => (
                <div key={t} className="text-[11px] text-white/50 truncate capitalize">{t.replace(/_/g, ' ')}</div>
              ))}
            </div>
          )}
          {results.weak.length > 0 && (
            <div className="glass rounded-2xl p-3 text-left">
              <div className="text-[10px] font-bold text-ma1-red mb-2">❌ À travailler</div>
              {results.weak.slice(0, 3).map(t => (
                <div key={t} className="text-[11px] text-white/50 truncate capitalize">{t.replace(/_/g, ' ')}</div>
              ))}
            </div>
          )}
        </div>

        {/* Détail question par question */}
        <details className="w-full max-w-md text-left">
          <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60 py-2 select-none">📋 Voir le détail des réponses</summary>
          <div className="flex flex-col gap-2 mt-2">
            {answers.map((a, i) => (
              <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed border ${a.correct ? 'bg-ma1-green/[0.03] border-ma1-green/12' : 'bg-ma1-red/[0.03] border-ma1-red/12'}`}>
                <span className="text-sm shrink-0">{a.correct ? '✅' : '❌'}</span>
                <div>
                  <strong>Q{i + 1}:</strong> {a.question}<br />
                  <span className="text-white/30">
                    Ta réponse : {LETTERS[a.chosen]}
                    {!a.correct && ` | Bonne réponse : ${LETTERS[a.correct_index]} — ${a.choices[a.correct_index]}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>

        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={() => router.push('/plan30')} className="btn-primary !px-8">Voir mon Plan 30j</button>
          <button onClick={() => router.push('/')} className="btn-ghost">Retour au chat</button>
        </div>
      </div>
    );
  }

  /* ── QUIZ SCREEN ── */
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-5">
      <div className="text-3xl">🧪</div>
      <h2 className="font-display text-xl font-extrabold text-[#d0eaf2]">Test de positionnement</h2>
      <p className="text-white/50 text-sm max-w-md">10 questions rapides pour adapter votre plan de révision.</p>

      <div className="w-full max-w-md h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#3a9db0] to-[#7ec8e3] rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
      </div>
      <div className="text-[11px] text-white/30">{idx + 1} / {POSITIONING_QUESTIONS.length}</div>

      <div className="font-display text-lg font-bold max-w-lg leading-relaxed">{q.q}</div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {q.choices.map((c, i) => {
          let mobileClass = "positioning-choice"; let cls = "border-white/[0.08] bg-white/[0.03] hover:bg-[rgba(58,157,176,0.08)] hover:border-[rgba(58,157,176,0.2)] hover:translate-x-1 cursor-pointer';
          if (picked !== null) {
            if (i === q.answer) cls = 'border-ma1-green/35 bg-ma1-green/10 text-ma1-green cursor-default';
            else if (i === picked) cls = 'border-ma1-red/25 bg-ma1-red/8 text-ma1-red cursor-default opacity-80';
            else cls = 'border-white/[0.05] opacity-40 cursor-default';
          }
          return (
            <button key={i} onClick={() => answer(i)} disabled={picked !== null}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm text-left transition-all positioning-choice ${picked !== null && i === q.answer ? 'correct' : picked !== null && i === picked && i !== q.answer ? 'wrong' : ''} ${cls}`}>
              <span className="w-6 h-6 rounded-lg bg-[rgba(58,157,176,0.08)] flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">{LETTERS[i]}</span>
              {c}
            </button>
          );
        })}
      </div>

      <button onClick={skip} className="text-white/30 text-xs mt-2 hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer">
        Passer le test →
      </button>
    </div>
  );
}
