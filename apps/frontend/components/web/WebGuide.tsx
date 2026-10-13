'use client';
import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, LayoutGrid, Footprints, Sparkles, Lightbulb } from 'lucide-react';
import { DashboardMock } from './art';

const STEPS = [
  { icon: UserPlus, title: 'Création de compte', heading: '1. Création de compte', text: "Inscrivez-vous en quelques secondes avec votre email. Aucune carte bancaire n'est demandée pour le plan gratuit.", cta: { label: 'Créer mon compte', href: '/connexion?mode=register' }, mock: 'chat' as const },
  { icon: LayoutGrid, title: "Choix de l'espace", heading: "2. Choix de l'espace", text: 'Apprenti, moniteur ou auto-école : chaque espace propose les outils adaptés à votre usage.', cta: { label: 'Voir les espaces', href: '/apprenti' }, mock: 'table' as const },
  { icon: Footprints, title: 'Premiers pas', heading: '3. Premiers pas', text: 'Posez une question au chat IA, faites un premier QCM ou lancez votre plan de révision sur 30 jours.', cta: { label: 'Ouvrir le chat IA', href: '/chat' }, mock: 'chat' as const },
  { icon: Sparkles, title: 'Fonctionnalités', heading: '4. Fonctionnalités', text: "QCM adaptatifs, examens blancs de 40 questions en 30 minutes, analyse de panneaux par photo, classement et suivi de progression.", cta: { label: 'Découvrir le QCM', href: '/qcm' }, mock: 'stats' as const },
  { icon: Lightbulb, title: "Conseils d'utilisation", heading: "5. Conseils d'utilisation", text: "Révisez un peu chaque jour, refaites vos erreurs et vérifiez toujours les réponses sur Légifrance : MA1 est un outil pédagogique.", cta: { label: 'Nous contacter', href: '/contact' }, mock: 'stats' as const },
];

// Maquette 16 — Utilisation
export function WebGuide() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <section className="web-card grid overflow-hidden lg:grid-cols-[320px_1fr_1fr]">
      <div className="p-8 lg:p-10">
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">Comment utiliser MA1 ?</h1>
        <p className="mt-3 text-sm text-slate-600">Un guide simple pour bien démarrer.</p>
        <ol className="mt-8 space-y-1.5">
          {STEPS.map(({ icon: Icon, title }, k) => (
            <li key={title}>
              <button onClick={() => setI(k)} aria-current={k === i} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] font-semibold transition-colors ${k === i ? 'bg-ma1-blue-soft text-ma1-blue' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${k === i ? 'bg-ma1-blue text-white' : 'bg-slate-100 text-slate-500'}`}>{k + 1}</span>
                <Icon size={16} />{title}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col justify-center p-8 lg:p-10">
        <h2 className="font-display text-xl font-bold">{s.heading}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
        <Link href={s.cta.href} className="web-btn-primary mt-8 self-start">{s.cta.label}</Link>
      </div>
      <div className="hidden items-center justify-center bg-gradient-to-br from-[#e6efff] to-[#d4e2fb] p-8 lg:flex">
        <div className="w-full rounded-2xl bg-[#0a1426] p-2 shadow-[0_24px_60px_rgba(11,26,51,0.35)]"><DashboardMock variant={s.mock} /></div>
      </div>
    </section>
  );
}
