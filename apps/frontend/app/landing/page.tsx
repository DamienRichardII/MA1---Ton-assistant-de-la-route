import type { Metadata } from 'next';
import { WebHome } from '@/components/web/WebHome';

export const metadata: Metadata = {
  title: 'Code de la Route Gratuit avec IA — MA1 | Révisez avec l\'Intelligence Artificielle',
  description: 'Révisez le Code de la Route gratuitement avec MA1, l\'assistant IA. QCM adaptatifs, analyse de panneaux par photo, examens blancs chronométrés. 10 questions gratuites par jour.',
  keywords: 'code de la route, QCM code de la route, réviser le code, code de la route gratuit, examen code de la route, IA code de la route, permis de conduire',
  openGraph: {
    title: 'MA1 — Code de la Route avec IA',
    description: 'L\'IA qui t\'aide à réussir ton Code de la Route du premier coup.',
    type: 'website',
    locale: 'fr_FR',
    url: 'https://ma1.app',
    siteName: 'MA1',
    images: [{ url: '/ma1-logo.jpeg', width: 512, height: 512, alt: 'MA1 Logo' }],
  },
  twitter: { card: 'summary_large_image', title: 'MA1 — Code de la Route avec IA', description: 'Réussir son code du premier coup grâce à l\'IA.' },
  alternates: { canonical: 'https://ma1.app/landing' },
  robots: { index: true, follow: true },
};

// Accueil : composition web (PJ1), responsive de la tablette au grand écran.
// L'ancienne landing mobile est archivée dans _archive/landing-mobile-legacy.tsx.
export default function LandingPage() {
  return (
    <>
      <WebHome />
      {/* JSON-LD Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "MA1 — Code de la Route",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Web",
        "offers": [
          { "@type": "Offer", "price": "0", "priceCurrency": "EUR", "name": "Gratuit" },
          { "@type": "Offer", "price": "10", "priceCurrency": "EUR", "name": "Premium", "billingPeriod": "P1M" },
          { "@type": "Offer", "price": "79", "priceCurrency": "EUR", "name": "Premium Annuel", "billingPeriod": "P1Y" },
        ],
        "description": "Assistant IA pour réviser le Code de la Route français. QCM adaptatifs, analyse de panneaux, examens blancs.",
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "150" }
      })}} />
    </>
  );
}
