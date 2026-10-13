import type { Metadata } from 'next';
import { Users, Receipt, CalendarRange, FileBarChart, UserCog, School } from 'lucide-react';
import { AutoEcoleArt } from '@/components/web/art';
import { FeatureStrip, PageShell, SpaceHero } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'Espace auto-école — MA1',
  description: 'Une solution complète pour gérer votre établissement : multi-élèves, tableau de bord, statistiques et outils pour moniteurs.',
  alternates: { canonical: 'https://ma1.app/auto-ecole' },
};

const SALES_MAIL = 'mailto:contact@ma1.app?subject=Demande%20de%20d%C3%A9mo%20Auto-%C3%A9cole%20MA1';

// Maquette 04 — Espace auto-école
export default function AutoEcolePage() {
  return (
    <PageShell>
      <SpaceHero
        icon={School}
        title="Espace Auto-école"
        subtitle="Une solution complète pour gérer votre établissement."
        items={['Gestion multi-élèves', 'Tableau de bord complet', 'Suivi des paiements', 'Statistiques et rapports', 'Outils pour moniteurs']}
        primary={{ label: 'Demander une démo', href: SALES_MAIL }}
        secondary={{ label: 'Créer un compte', href: '/connexion?mode=register' }}
        art={<AutoEcoleArt />}
      />
      <FeatureStrip items={[
        { icon: Users, label: 'Gestion des élèves', href: '/dashboard' },
        { icon: Receipt, label: 'Facturation' },
        { icon: CalendarRange, label: 'Planning' },
        { icon: FileBarChart, label: 'Rapports' },
        { icon: UserCog, label: 'Multi-moniteurs' },
      ]} />
    </PageShell>
  );
}
