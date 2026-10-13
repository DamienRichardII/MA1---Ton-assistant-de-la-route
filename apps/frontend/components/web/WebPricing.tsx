'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

// Tarifs canoniques : backend/src/api.py PLAN_LIMITS (voir CLAUDE.md §5).
const FREE = ['10 questions / jour', 'Accès de base', 'QCM adaptatifs', '1 examen blanc / mois', 'Analyse de panneaux'];
const PREMIUM = ['Questions illimitées', 'Tous les thèmes', 'Examens blancs illimités', 'Plan de révision personnalisé', 'Statistiques avancées', 'Chat IA'];
const SCHOOL = ['Tout Premium', 'Dashboard moniteur', 'Suivi de 30 élèves', 'Export PDF progression', 'White-label personnalisable'];
const SALES = 'mailto:contact@ma1.app?subject=Demande%20Auto-%C3%A9cole%20MA1';

// Maquette 15 — Abonnement
export function WebPricing() {
  const [annual, setAnnual] = useState(false);
  const Card = ({ name, price, per, badge, items, cta, href, featured }: { name: string; price: string; per?: string; badge?: string; items: string[]; cta: string; href: string; featured?: boolean }) => (
    <div className={`relative flex flex-col rounded-[22px] border p-8 ${featured ? 'border-ma1-blue bg-white shadow-[0_20px_60px_rgba(21,83,224,0.18)]' : 'border-slate-200 bg-white shadow-web-card'}`}>
      {badge && <span className="absolute right-5 top-5 rounded-full bg-ma1-blue px-3 py-1 text-[11px] font-bold text-white">{badge}</span>}
      <h3 className="font-display text-sm font-bold text-slate-500">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1"><span className="font-display text-[40px] font-extrabold text-ma1-blue">{price}</span>{per && <span className="text-sm text-slate-400">{per}</span>}</div>
      <ul className="my-6 flex-1 space-y-3">
        {items.map(t => <li key={t} className="flex items-center gap-2.5 text-[13px] text-slate-600"><Check size={15} strokeWidth={3} className="shrink-0 text-ma1-blue" />{t}</li>)}
      </ul>
      {href.startsWith('mailto:')
        ? <a href={href} className={featured ? 'web-btn-primary' : 'web-btn-outline'}>{cta}</a>
        : <Link href={href} className={featured ? 'web-btn-primary' : 'web-btn-outline'}>{cta}</Link>}
    </div>
  );

  return (
    <section className="web-card p-8 lg:p-14">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[34px] font-extrabold tracking-tight">Nos offres</h1>
          <p className="mt-3 text-[15px] text-slate-600">Choisissez la formule qui vous convient.</p>
        </div>
        <div role="tablist" aria-label="Période de facturation" className="flex rounded-full border border-slate-200 bg-white p-1">
          <button role="tab" aria-selected={!annual} onClick={() => setAnnual(false)} className={`rounded-full px-6 py-2 text-xs font-bold transition-colors ${!annual ? 'bg-ma1-blue text-white' : 'text-slate-500'}`}>Mensuel</button>
          <button role="tab" aria-selected={annual} onClick={() => setAnnual(true)} className={`rounded-full px-6 py-2 text-xs font-bold transition-colors ${annual ? 'bg-ma1-blue text-white' : 'text-slate-500'}`}>Annuel −34 %</button>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card name="Gratuit" price="0€" items={FREE} cta="Commencer" href="/connexion?mode=register" />
        {annual
          ? <Card featured name="Premium Annuel" price="79€" per="/an" badge="−34 %" items={['Tout Premium', '6,58€/mois au lieu de 10€', 'Économisez 41€', 'Accès garanti 12 mois', ...PREMIUM.slice(0, 2)]} cta="Choisir" href="/connexion?mode=register" />
          : <Card featured name="Premium" price="10€" per="/mois" badge="7 jours gratuits" items={PREMIUM} cta="Choisir" href="/connexion?mode=register" />}
        <Card name="Auto-École" price="200€" per="/mois" items={SCHOOL} cta="Contacter les ventes" href={SALES} />
      </div>
      <p className="mt-8 text-center text-xs text-slate-400">Prix TTC. Sans engagement, annulable à tout moment. MA1 est un outil pédagogique, il ne remplace pas une formation en auto-école.</p>
    </section>
  );
}
