import type { Metadata } from 'next';
import { PageShell } from '@/components/web/ui';
import { WebGuide } from '@/components/web/WebGuide';

export const metadata: Metadata = {
  title: 'Comment utiliser MA1 ? — Guide de démarrage',
  description: 'Création de compte, choix de l\'espace, premiers pas, fonctionnalités et conseils : le guide pour bien démarrer avec MA1.',
  alternates: { canonical: 'https://ma1.app/utilisation' },
};

export default function UtilisationPage() { return <PageShell><WebGuide /></PageShell>; }
