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
  const [answers, setAnswers] = useState<Array<{ topic: string; correct: boolean }>>([]);

  const q = POSITIONING_QUESTIONS[idx];
  const pct = Math.round((idx / POSITIONING_QUESTIONS.length) * 100);

  const answer = (i: number) => {
    const correct = i === q.answer;
    const newAnswers = [...answers, { topic: q.topic, correct }];
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
      router.push('/plan30');
    } else {
      setIdx(idx + 1);
    }
  };

  const skip = () => { localStorage.setItem('ma1_pos_done', '1'); router.push('/'); };

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
        {q.choices.map((c, i) => (
          <button key={i} onClick={() => answer(i)}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-sm text-left hover:bg-[rgba(58,157,176,0.08)] hover:border-[rgba(58,157,176,0.2)] hover:translate-x-1 transition-all cursor-pointer">
            <span className="w-6 h-6 rounded-lg bg-[rgba(58,157,176,0.08)] flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">{LETTERS[i]}</span>
            {c}
          </button>
        ))}
      </div>

      <button onClick={skip} className="text-white/30 text-xs mt-2 hover:text-white/50 transition-colors bg-transparent border-none cursor-pointer">
        Passer le test →
      </button>
    </div>
  );
}
