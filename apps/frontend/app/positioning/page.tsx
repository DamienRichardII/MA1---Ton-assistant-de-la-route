'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { POSITIONING_QUESTIONS } from '@/lib/constants';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function PositioningPage() {
  const router = useRouter();
  const { userId, addXP, setProfile } = useStore();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ topic: string; correct: boolean; picked: number }>>([]);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const q = POSITIONING_QUESTIONS[idx];
  const pct = Math.round((idx / POSITIONING_QUESTIONS.length) * 100);

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    setTimeout(() => next(i), 1100);
  };

  const next = (i: number) => {
    setPicked(null);
    const correct = i === q.answer;
    const newAnswers = [...answers, { topic: q.topic, correct, picked: i }];
    setAnswers(newAnswers);

    if (idx + 1 >= POSITIONING_QUESTIONS.length) {
      // Finish
      api.track(userId, 'positioning_complete', { answers: newAnswers.length });
      const rate = newAnswers.filter(a => a.correct).length / newAnswers.length;
      const level = rate >= 0.75 ? 'avance' : rate >= 0.45 ? 'intermediaire' : 'debutant';
      const weakTopics = [...new Set(newAnswers.filter(a => !a.correct).map(a => a.topic))];
      setProfile({ level, weak_topics: weakTopics });
      addXP(15);
      showXPToast('+15 XP · Test terminé');
      localStorage.setItem('ma1_pos_done', '1');
      setDone(true);
    } else {
      setIdx(idx + 1);
    }
  };

  const skip = () => { localStorage.setItem('ma1_pos_done', '1'); router.push('/'); };

  if (done) {
    const ok = answers.filter(a => a.correct).length;
    const total = answers.length;
    const rate = Math.round((ok / total) * 100);
    const passed = rate >= 60;
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-xl flex flex-col items-center text-center gap-4" data-testid="positioning-results">
          <div className="text-4xl">{passed ? '🎉' : '💪'}</div>
          <h2 className="font-display text-xl font-extrabold text-[#d0eaf2]">{passed ? 'Bien joué !' : 'Courage !'}</h2>
          <div className="font-display text-4xl font-extrabold" style={{ color: passed ? '#2ed573' : '#ff4757' }}>{ok}/{total} · {rate}%</div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3"><div className="font-display text-xl font-extrabold text-[#2ed573]">{ok}</div><div className="text-[10px] text-white/40">BONNES RÉPONSES</div></div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3"><div className="font-display text-xl font-extrabold text-[#ff4757]">{total - ok}</div><div className="text-[10px] text-white/40">ERREURS</div></div>
          </div>

          <h3 className="font-display text-sm font-bold text-white/70 mt-2 self-start">Correction détaillée</h3>
          <div className="flex flex-col gap-3 w-full text-left">
            {POSITIONING_QUESTIONS.map((qq, n) => {
              const a = answers[n];
              return (
                <div key={n} className={`rounded-2xl border p-4 ${a.correct ? 'border-[rgba(46,213,115,0.25)] bg-[rgba(46,213,115,0.05)]' : 'border-[rgba(255,71,87,0.3)] bg-[rgba(255,71,87,0.05)]'}`}>
                  <div className="text-sm font-bold mb-2">{a.correct ? '✅' : '❌'} {n + 1}. {qq.q}</div>
                  {!a.correct && (
                    <div className="text-xs text-[#ff4757] mb-1">Votre réponse : {LETTERS[a.picked]}. {qq.choices[a.picked]}</div>
                  )}
                  <div className="text-xs text-[#2ed573] mb-2">Bonne réponse : {LETTERS[qq.answer]}. {qq.choices[qq.answer]}</div>
                  <div className="text-xs text-white/60 leading-relaxed">💡 {qq.exp}</div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-white/30">Outil pédagogique — vérifiez sur Légifrance.</p>
          <button onClick={() => router.push('/plan30')}
            className="mt-2 px-8 py-3 rounded-full border-none bg-gradient-to-r from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-sm cursor-pointer">
            Voir mon plan de révision →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-5">
      <div className="text-3xl">🧪</div>
      <h2 className="font-display text-xl font-extrabold text-[#d0eaf2]">Test de positionnement</h2>
      <p className="text-white/50 text-sm max-w-md">10 questions rapides pour adapter votre plan de révision.</p>

      <div className="w-full max-w-md h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#3a9db0] to-[#7ec8e3] rounded-full transition-all" style={{ width: pct + '%' }} />
      </div>

      <div className="font-display text-lg font-bold max-w-lg leading-relaxed">{q.q}</div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {q.choices.map((c, i) => {
          const locked = picked !== null;
          const isRight = locked && i === q.answer;
          const isWrong = locked && i === picked && i !== q.answer;
          const tone = isRight
            ? 'border-[#2ed573] bg-[rgba(46,213,115,0.15)] text-[#2ed573]'
            : isWrong
              ? 'border-[#ff4757] bg-[rgba(255,71,87,0.15)] text-[#ff4757]'
              : 'border-white/[0.08] bg-white/[0.03] ' + (locked ? 'opacity-50' : 'hover:bg-[rgba(58,157,176,0.08)] hover:border-[rgba(58,157,176,0.2)] hover:translate-x-1');
          return (
            <button key={i} onClick={() => answer(i)} disabled={locked} data-state={isRight ? 'correct' : isWrong ? 'wrong' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-sm text-left transition-all ${locked ? 'cursor-default' : 'cursor-pointer'} ${tone}`}>
              <span className="w-6 h-6 rounded-lg bg-[rgba(58,157,176,0.08)] flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">{LETTERS[i]}</span>
              {c}
              {isRight && <span className="ml-auto">✓</span>}
              {isWrong && <span className="ml-auto">✗</span>}
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
