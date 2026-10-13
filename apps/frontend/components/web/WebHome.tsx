import Link from 'next/link';
import { MessageSquare, ListChecks, CalendarDays, Trophy, Building2 } from 'lucide-react';
import { HomeArt } from './art';
import { FeatureStrip, PageShell } from './ui';

// Maquette 01 — Accueil
export function WebHome() {
  return (
    <PageShell>
      <section className="web-card relative overflow-hidden p-3">
        <HomeArt />
        <div className="absolute inset-x-0 bottom-9 flex justify-center gap-4">
          <Link href="/connexion?mode=register" className="web-btn-primary !px-10 !py-4 !text-[15px]">Commencer gratuitement</Link>
          <Link href="/abonnement" className="web-btn-outline !border !border-slate-200 !px-9 !py-4 !text-[15px]">Voir les offres</Link>
        </div>
      </section>
      <h1 className="sr-only">MA1 — Ton assistant IA du Code de la Route</h1>
      <FeatureStrip items={[
        { icon: MessageSquare, label: 'Chat IA', href: '/chat' },
        { icon: ListChecks, label: 'QCM', href: '/qcm' },
        { icon: CalendarDays, label: 'Plan 30j', href: '/plan30' },
        { icon: Trophy, label: 'Classement', href: '/leaderboard' },
        { icon: Building2, label: 'Auto-écoles', href: '/auto-ecole' },
      ]} />
    </PageShell>
  );
}
