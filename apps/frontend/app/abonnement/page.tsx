import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PageShell } from '@/components/web/ui';
import { WebPricing } from '@/components/web/WebPricing';

export const metadata: Metadata = {
  title: 'Abonnement et tarifs — MA1',
  description: 'Gratuit, Premium 10€/mois, Premium Annuel 79€/an ou Auto-École 200€/mois : choisissez la formule MA1 qui vous convient.',
  alternates: { canonical: 'https://ma1.app/abonnement' },
};

export default function AbonnementPage() {
  return <PageShell><Suspense fallback={null}><WebPricing /></Suspense></PageShell>;
}
