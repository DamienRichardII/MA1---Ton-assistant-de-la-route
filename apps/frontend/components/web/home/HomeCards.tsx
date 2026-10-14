import Link from 'next/link';
import { Check, ArrowRight, GraduationCap, UserRound, Building2, Sparkles, type LucideIcon } from 'lucide-react';

const SPACES: Array<{ icon: LucideIcon; title: string; items: string[]; href: string }> = [
  { icon: GraduationCap, title: 'Espace Apprenti', items: ['Révisions personnalisées', 'QCM & examens blancs', 'Suivi de progression'], href: '/apprenti' },
  { icon: UserRound, title: 'Espace Moniteur', items: ['Suivi des élèves', 'Outils pédagogiques', 'Statistiques détaillées'], href: '/moniteur' },
  { icon: Building2, title: 'Espace Auto-école', items: ['Gestion des élèves', 'Tableau de bord complet', 'Facturation & rapports'], href: '/auto-ecole' },
  { icon: Sparkles, title: 'Intelligence Artificielle', items: ['Réponses instantanées', 'Explications claires', 'Adapté à ton niveau'], href: '/chat' },
];

// Tarifs : source canonique CLAUDE.md §5 / PLAN_LIMITS (10 €/mois, 79 €/an, 200 €/mois). Destination : /abonnement (confirmation + paiement SumUp).
const PLANS = [
  { name: 'Gratuit', price: '0€', per: '', items: ['10 questions / jour', 'Accès de base', 'QCM adaptatifs'], cta: 'Commencer', href: '/connexion?mode=register' },
  { name: 'Premium', price: '10€', per: '/mois', items: ['Accès illimité', 'Révision personnalisée', 'Statistiques avancées'], cta: 'Choisir', href: '/abonnement?plan=premium' },
  { name: 'Premium Annuel', price: '79€', per: '/an', badge: '−34 %', items: ['Toutes les fonctions', 'Économisez 41€', 'Accès garanti 12 mois'], cta: 'Choisir', href: '/abonnement?plan=annual' },
  { name: 'Auto-école', price: '200€', per: '/mois', items: ['Suivi de 30 élèves', 'Dashboard moniteur', 'Export PDF élèves'], cta: 'Choisir', href: '/abonnement?plan=autoecole' },
];

const card = 'rounded-[14px] border border-[var(--h-card-line)] bg-[var(--h-card)] shadow-[var(--h-card-shadow)] backdrop-blur-md';
const Tick = () => <Check size={9} strokeWidth={3.2} className="shrink-0 text-[var(--h-accent)]" />;

/** Rangée compacte : 4 espaces (gauche) + 4 tarifs (droite). */
export function HomeCards() {
  return (
    <section className="mx-auto grid w-full max-w-[1500px] gap-3 px-6 md:px-10 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]" aria-label="Espaces et tarifs">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SPACES.map(({ icon: Icon, title, items, href }) => (
          <Link key={title} href={href} className={`${card} group relative flex min-h-[124px] flex-col p-3 transition-all hover:-translate-y-0.5`}>
            <div className="flex items-center gap-2"><Icon size={19} className="text-[var(--h-accent)]" /><h3 className="font-display text-[12px] font-bold text-[var(--h-text)]">{title}</h3></div>
            <ul className="mt-2 space-y-1 pr-6">{items.map(t => <li key={t} className="flex items-center gap-1.5 text-[10.5px] text-[var(--h-muted)]"><Tick />{t}</li>)}</ul>
            <span className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--h-accent-soft)] text-[var(--h-accent)] transition-transform group-hover:translate-x-0.5"><ArrowRight size={12} /></span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map(p => (
          <div key={p.name} className={`${card} relative flex min-h-[124px] flex-col p-2.5`}>
            <div className="flex items-center justify-between gap-1 whitespace-nowrap text-[10.5px] font-bold text-[var(--h-text)]">{p.name}{p.badge && <span className="rounded-[5px] bg-[var(--h-accent)] px-1.5 py-[1px] text-[8.5px] font-bold text-white">{p.badge}</span>}</div>
            <div className="flex items-baseline gap-0.5"><span className="font-display text-[19px] font-extrabold leading-tight text-[var(--h-accent)]">{p.price}</span><span className="text-[9.5px] text-[var(--h-muted)]">{p.per}</span></div>
            <ul className="mt-1 flex-1 space-y-[3px]">{p.items.map(t => <li key={t} className="flex items-start gap-1 text-[9px] leading-tight text-[var(--h-muted)]"><span className="mt-[1px]"><Tick /></span>{t}</li>)}</ul>
            {p.href.startsWith('mailto:')
              ? <a href={p.href} className="mt-2 block rounded-[7px] bg-[var(--h-accent)] py-1.5 text-center text-[10px] font-bold text-white hover:opacity-90">{p.cta}</a>
              : <Link href={p.href} className={`mt-2 block rounded-[7px] py-1.5 text-center text-[10px] font-bold hover:opacity-90 ${p.name === 'Gratuit' ? 'border border-[var(--h-accent)] text-[var(--h-accent)]' : 'bg-[var(--h-accent)] text-white'}`}>{p.cta}</Link>}
          </div>
        ))}
      </div>
    </section>
  );
}
