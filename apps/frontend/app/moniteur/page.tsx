import type { Metadata } from 'next';
import { LayoutDashboard, Users, CalendarDays, BarChart3, ListChecks, ClipboardList } from 'lucide-react';
import { MoniteurArt } from '@/components/web/art';
import { FeatureStrip, PageShell, SpaceHero } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'Espace moniteur — MA1',
  description: 'Des outils puissants pour un meilleur suivi de vos élèves : suivi en temps réel, statistiques détaillées, séries personnalisées.',
  alternates: { canonical: 'https://ma1.app/moniteur' },
};

// Maquette 02 — Espace moniteur
export default function MoniteurPage() {
  return (
    <PageShell>
      <SpaceHero
        icon={ClipboardList}
        title="Espace Moniteur"
        subtitle="Des outils puissants pour un meilleur suivi de vos élèves."
        items={['Suivi des élèves en temps réel', 'Outils pédagogiques', 'Statistiques détaillées', 'Création de séries personnalisées', 'Préparation aux examens']}
        primary={{ label: 'Se connecter', href: '/connexion' }}
        secondary={{ label: 'Créer un compte', href: '/connexion?mode=register' }}
        art={<MoniteurArt />}
      />
      <FeatureStrip items={[
        { icon: LayoutDashboard, label: 'Tableau de bord', href: '/dashboard' },
        { icon: Users, label: 'Suivi des élèves', href: '/dashboard' },
        { icon: CalendarDays, label: 'Planification' },
        { icon: BarChart3, label: 'Statistiques' },
        { icon: ListChecks, label: 'Séries personnalisées' },
      ]} />
    </PageShell>
  );
}
