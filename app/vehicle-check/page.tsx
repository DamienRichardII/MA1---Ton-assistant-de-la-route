'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import Link from 'next/link';

const CHECKS = [
  {
    id: 'niveaux', label: 'Niveaux', icon: '🔧', questions: [
      { q: 'Quel liquide vérifiez-vous pour le circuit de freinage ?', choices: ['Liquide de frein (DOT)', 'Huile moteur', 'Liquide de refroidissement', 'Liquide de direction assistée'], answer: 0, exp: 'Le liquide de frein (DOT 4 ou DOT 5.1) doit être vérifié régulièrement. Un niveau bas peut indiquer une fuite ou une usure des plaquettes.' },
      { q: 'À quelle fréquence faut-il vérifier le niveau d\'huile moteur ?', choices: ['Tous les ans', 'Avant chaque long trajet', 'Uniquement au contrôle technique', 'Quand le voyant s\'allume'], answer: 1, exp: 'Il est recommandé de vérifier le niveau d\'huile avant tout long trajet et au moins une fois par mois.' },
      { q: 'Le liquide de refroidissement sert à :', choices: ['Lubrifier le moteur', 'Maintenir la température du moteur', 'Alimenter le système de freinage', 'Protéger les vitres'], answer: 1, exp: 'Le liquide de refroidissement régule la température du moteur. Un manque peut entraîner une surchauffe.' },
    ]
  },
  {
    id: 'pneus', label: 'Pneus', icon: '🛞', questions: [
      { q: 'Quelle est la profondeur minimale légale des rainures de pneu en France ?', choices: ['1 mm', '1,6 mm', '2 mm', '3 mm'], answer: 1, exp: 'La profondeur minimale légale est de 1,6 mm. En dessous, le pneu doit être remplacé sous peine d\'amende.' },
      { q: 'Comment vérifier la pression des pneus ?', choices: ['À vue d\'œil', 'Avec un manomètre à froid', 'En appuyant dessus', 'Uniquement au garage'], answer: 1, exp: 'La pression doit être contrôlée avec un manomètre, de préférence à froid (avant de rouler ou après 2 km max).' },
      { q: 'Une crevaison lente est détectable quand :', choices: ['La voiture vibre fortement', 'Le pneu est complètement dégonflé', 'La pression baisse régulièrement sans cause visible', 'Le voyant s\'allume uniquement'], answer: 2, exp: 'Une crevaison lente se manifeste par une pression qui baisse progressivement. Vérifiez régulièrement la pression.' },
    ]
  },
  {
    id: 'eclairage', label: 'Éclairage', icon: '💡', questions: [
      { q: 'Quels feux sont obligatoires de nuit en agglomération ?', choices: ['Feux de route uniquement', 'Feux de position (veilleuses)', 'Feux de croisement (codes)', 'Feux antibrouillard'], answer: 2, exp: 'Les feux de croisement (codes) sont obligatoires la nuit, même en agglomération.' },
      { q: 'Quand peut-on utiliser les feux de route (pleins phares) ?', choices: ['Toujours la nuit', 'Hors agglomération quand on ne croise personne', 'En cas de brouillard', 'Uniquement sur autoroute'], answer: 1, exp: 'Les feux de route sont utilisés hors agglomération, mais doivent être éteints (basculer en codes) dès qu\'on croise ou suit un véhicule.' },
      { q: 'Les feux de brouillard avant s\'utilisent :', choices: ['Par mauvais temps réduisant la visibilité à moins de 50 m', 'Toujours la nuit', 'Par pluie légère', 'Sur autoroute'], answer: 0, exp: 'Les feux de brouillard avant ne sont autorisés qu\'en cas de brouillard, de neige ou de pluie intense réduisant la visibilité à moins de 50 m.' },
    ]
  },
  {
    id: 'freinage', label: 'Freinage', icon: '🛑', questions: [
      { q: 'Comment vérifier l\'usure des plaquettes de frein simplement ?', choices: ['En appuyant très fort sur le frein', 'Par le bruit (grincement) et la distance de freinage', 'Uniquement au contrôle technique', 'En inspectant les pneus'], answer: 1, exp: 'Un grincement au freinage, une distance de freinage allongée ou des vibrations indiquent généralement une usure des plaquettes.' },
      { q: 'Le frein à main doit :', choices: ['Immobiliser le véhicule en pente', 'Accélérer l\'usure des freins', 'Remplacer le frein de service', 'N\'être utilisé qu\'en urgence'], answer: 0, exp: 'Le frein de stationnement (à main) doit maintenir le véhicule immobile, notamment en pente. Il ne remplace pas le frein de service.' },
    ]
  },
];

type Phase = 'menu' | 'quiz' | 'result';

export default function VehicleCheckPage() {
  const { plan } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<typeof CHECKS[0] | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  if (plan === 'free') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="text-5xl">🔧</div>
      <h2 className="font-display text-2xl font-extrabold text-ma1-ice">Vérifications Techniques</h2>
      <p className="text-white/50 text-sm max-w-md">Ce module entraîne aux questions de vérification technique du permis de conduire.</p>
      <div className="glass rounded-2xl p-5 max-w-sm w-full border border-ma1-gold/20">
        <div className="text-2xl mb-2">🔒</div>
        <div className="font-display font-extrabold text-ma1-gold mb-1">Fonctionnalité Premium</div>
        <p className="text-white/40 text-xs">Les questions de vérification technique sont disponibles dans le plan Premium.</p>
      </div>
      <Link href="/" className="btn-primary !px-8">✨ Passer Premium</Link>
    </div>
  );

  if (phase === 'menu') return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <div className="text-center py-4">
        <div className="text-4xl mb-2">🔧</div>
        <h1 className="font-display text-xl font-extrabold text-ma1-ice">Vérifications Techniques</h1>
        <p className="text-white/40 text-sm mt-1">Entraînement aux questions de vérification technique du permis B</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {CHECKS.map(cat => (
          <button key={cat.id} onClick={() => { setSelectedCategory(cat); setPhase('quiz'); setIdx(0); setAnswers([]); setPicked(null); }}
            className="glass rounded-2xl p-5 text-center hover:bg-ma1-teal/5 transition-all border-2 border-transparent hover:border-ma1-teal/20">
            <div className="text-3xl mb-2">{cat.icon}</div>
            <div className="font-display text-sm font-extrabold text-ma1-ice">{cat.label}</div>
            <div className="text-[10px] text-white/30 mt-1">{cat.questions.length} questions</div>
          </button>
        ))}
      </div>
    </div>
  );

  if (!selectedCategory) return null;
  const qs = selectedCategory.questions;
  const q = qs[idx];

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const newAns = [...answers];
    newAns[idx] = i;
    setAnswers(newAns);
    setTimeout(() => {
      if (idx + 1 >= qs.length) setPhase('result');
      else { setIdx(idx + 1); setPicked(null); }
    }, 900);
  };

  if (phase === 'result') {
    const ok = qs.reduce((a, _, i) => a + (answers[i] === qs[i].answer ? 1 : 0), 0);
    const pct = Math.round(ok / qs.length * 100);
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 py-8 text-center max-w-xl mx-auto w-full animate-msg-in">
        <div className="text-4xl">{pct >= 70 ? '🎉' : '💪'}</div>
        <h2 className="font-display text-xl font-extrabold">{selectedCategory.label} — Résultats</h2>
        <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center ${pct >= 70 ? 'bg-ma1-green/8 border-[3px] border-ma1-green/35' : 'bg-ma1-red/6 border-[3px] border-ma1-red/25'}`}>
          <div className={`font-display text-2xl font-black ${pct >= 70 ? 'text-ma1-green' : 'text-ma1-red'}`}>{ok}/{qs.length}</div>
          <div className="text-[10px] text-white/40">{pct}%</div>
        </div>
        <div className="flex flex-col gap-2 w-full text-left">
          {qs.map((q, i) => {
            const c = answers[i] === q.answer;
            return (
              <div key={i} className={`p-3.5 rounded-xl border text-xs ${c ? 'bg-ma1-green/[0.03] border-ma1-green/15' : 'bg-ma1-red/[0.03] border-ma1-red/12'}`}>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="shrink-0">{c ? '✅' : '❌'}</span>
                  <strong>{q.q}</strong>
                </div>
                {!c && <div className="text-white/40 ml-5">✓ {q.choices[q.answer]}</div>}
                <div className="text-white/30 ml-5 mt-1 italic">{q.exp}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setPhase('menu'); setSelectedCategory(null); }} className="btn-primary !px-8">Autre catégorie</button>
          <button onClick={() => { setPhase('quiz'); setIdx(0); setAnswers([]); setPicked(null); }} className="btn-ghost">Rejouer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 max-w-xl mx-auto w-full">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{selectedCategory.icon}</span>
          <span className="font-display text-sm font-extrabold">{selectedCategory.label}</span>
        </div>
        <span className="text-[11px] text-white/30">{idx + 1}/{qs.length}</span>
        <button onClick={() => { setPhase('menu'); setSelectedCategory(null); }} className="text-[10px] text-white/30 hover:text-white/60">✕ Quitter</button>
      </div>
      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-ma1-teal to-ma1-sky rounded-full transition-all" style={{ width: `${(idx / qs.length) * 100}%` }} />
      </div>
      <div className="glass rounded-3xl p-5">
        <div className="font-display text-base font-bold leading-relaxed mb-4">{q.q}</div>
        <div className="flex flex-col gap-2">
          {q.choices.map((c, i) => {
            let cls = 'border-white/[0.08] bg-white/[0.02] hover:bg-ma1-teal/8 cursor-pointer';
            if (picked !== null) {
              if (i === q.answer) cls = 'border-ma1-green/35 bg-ma1-green/10 text-ma1-green';
              else if (i === picked && i !== q.answer) cls = 'border-ma1-red/25 bg-ma1-red/8 text-ma1-red';
              else cls = 'border-white/[0.05] opacity-40';
            }
            return (
              <button key={i} onClick={() => answer(i)} disabled={picked !== null}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm text-left transition-all ${cls}`}>
                <span className="w-6 h-6 rounded-lg bg-ma1-teal/8 flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">
                  {['A','B','C','D'][i]}
                </span>
                {c}
              </button>
            );
          })}
        </div>
        {picked !== null && q.exp && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/40 italic">
            💡 {q.exp}
          </div>
        )}
      </div>
    </div>
  );
}
