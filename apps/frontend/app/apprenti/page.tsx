import type { Metadata } from 'next';
import { ListChecks, FileText, CalendarDays, BarChart3, Trophy, GraduationCap } from 'lucide-react';
import { ApprentiArt } from '@/components/web/art';
import { FeatureStrip, PageShell, SpaceHero } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'Espace apprenti — MA1',
  description: "Révisez, progressez et réussissez votre permis avec l'IA : QCM, examens blancs, plan de révision, chat IA 24/7.",
  alternates: { canonical: 'https://ma1.app/apprenti' },
};

// Maquette 03 — Espace apprenti
export default function ApprentiPage() {
  return (
    <PageShell>
      <SpaceHero
        icon={GraduationCap}
        title="Espace Apprenti"
        subtitle="Révisez, progressez et réussissez votre permis avec l'IA."
        items={['QCM et examens blancs', 'Plan de révision personnalisé', 'Suivi de votre progression', 'Chat IA disponible 24/7', 'Classements et défis']}
        primary={{ label: 'Commencer gratuitement', href: '/connexion?mode=register' }}
        secondary={{ label: 'Se connecter', href: '/connexion' }}
        art={<ApprentiArt />}
      />
      <FeatureStrip items={[
        { icon: ListChecks, label: 'QCM', href: '/qcm' },
        { icon: FileText, label: 'Examen blanc', href: '/exam' },
        { icon: CalendarDays, label: 'Plan 30 jours', href: '/plan30' },
        { icon: BarChart3, label: 'Statistiques', href: '/me' },
        { icon: Trophy, label: 'Classement', href: '/leaderboard' },
      ]} />
    </PageShell>
  );
}
