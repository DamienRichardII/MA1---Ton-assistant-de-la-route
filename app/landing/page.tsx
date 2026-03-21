import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Code de la Route Gratuit avec IA — MA1 | Révisez avec l\'Intelligence Artificielle',
  description: 'Révisez le Code de la Route gratuitement avec MA1, l&apos;assistant IA. QCM adaptatifs, analyse de panneaux par photo, examens blancs chronométrés. 10 questions gratuites par jour.',
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
  twitter: { card: 'summary_large_image', title: 'MA1 — Code de la Route avec IA', description: 'Réussir son code du premier coup grâce à l&apos;IA.' },
  alternates: { canonical: 'https://ma1.app/landing' },
  robots: { index: true, follow: true },
};

const FEATURES = [
  { icon: '💬', title: 'Chat IA Expert', desc: 'Posez n&apos;importe quelle question sur le Code de la Route. L\'IA vous répond avec les articles officiels Légifrance.' },
  { icon: '📋', title: 'QCM Adaptatifs', desc: 'Des questions générées par IA qui s\'adaptent à votre niveau. 9 thèmes gratuits, difficulté progressive.' },
  { icon: '📸', title: 'Analyse de Panneaux', desc: 'Prenez un panneau en photo, l&apos;IA l\'identifie et vous explique sa signification et les règles associées.' },
  { icon: '📝', title: 'Examens Blancs', desc: '40 questions, 30 minutes, conditions réelles. Seuil de réussite à 80% comme le vrai examen.' },
  { icon: '📅', title: 'Plan 30 Jours', desc: 'Un programme de révision structuré jour par jour. Plus besoin de chercher par où commencer.' },
  { icon: '🎯', title: 'Indicateur de Readiness', desc: 'MA1 vous dit quand vous êtes prêt pour l\'examen. Fini le stress de ne pas savoir.' },
];

const STATS = [
  { value: '10', label: 'questions IA gratuites par jour' },
  { value: '9', label: 'thèmes de révision' },
  { value: '30', label: 'jours de plan structuré' },
  { value: '40', label: 'questions par examen blanc' },
];

const PRICING = [
  { name: 'Gratuit', price: '0€', period: '', features: ['10 questions IA / jour', 'QCM adaptatifs', '1 examen blanc / mois', 'Analyse de panneaux', 'Plan 30 jours'], cta: 'Commencer gratuitement', href: '/', featured: false },
  { name: 'Premium', price: '10€', period: '/mois', features: ['Questions illimitées', 'Tous les thèmes', 'Examens blancs illimités', 'Streaming temps réel', '7 jours d&apos;essai gratuit'], cta: '7 jours gratuits', href: '/?upgrade=premium', featured: true },
  { name: 'Premium Annuel', price: '79€', period: '/an', features: ['Tout Premium', '2 mois offerts', '6,58€/mois au lieu de 10€', 'Économisez 41€', 'Accès garanti 12 mois'], cta: 'Économiser 41€', href: '/?upgrade=annual', featured: false },
  { name: 'Auto-École', price: '200€', period: '/mois', features: ['Tout Premium', 'Dashboard moniteur', 'Suivi de 30 élèves', 'Export PDF progression', 'White-label personnalisable'], cta: 'Contacter les ventes', href: '/dashboard', featured: false },
];

const FAQ = [
  { q: 'MA1 est-il vraiment gratuit ?', a: 'Oui. Le plan gratuit offre 10 questions IA par jour, des QCM adaptatifs sur 9 thèmes, et 1 examen blanc par mois. Aucune carte bancaire requise.' },
  { q: 'Comment fonctionne l&apos;IA ?', a: 'MA1 utilise une intelligence artificielle de dernière génération entraînée sur les textes officiels du Code de la Route français (Légifrance). Elle génère des QCM adaptés à votre niveau et répond à vos questions avec les articles de loi.' },
  { q: 'MA1 remplace-t-il une auto-école ?', a: 'Non. MA1 est un complément pédagogique pour réviser le Code de la Route. Il ne remplace pas la formation obligatoire en auto-école. Nous recommandons de l&apos;utiliser en parallèle de vos cours.' },
  { q: 'Mes données sont-elles protégées ?', a: 'Oui. MA1 est conforme au RGPD. Vos données restent sur votre appareil (localStorage). Vous pouvez exporter ou supprimer vos données à tout moment depuis les paramètres.' },
  { q: 'Puis-je utiliser MA1 hors connexion ?', a: 'Partiellement. Les QCM déjà chargés sont disponibles hors ligne. Le chat IA nécessite une connexion internet.' },
  { q: 'Comment fonctionne l\'essai gratuit Premium ?', a: '7 jours d\'accès complet sans engagement. Un email de rappel est envoyé 48h avant la fin. Vous pouvez annuler à tout moment.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] text-[#d0eaf2] overflow-x-hidden">
      {/* Hero */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(58,157,176,0.08)] to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Image src="/ma1-logo.jpeg" alt="MA1 Code de la Route" width={100} height={100} className="mx-auto rounded-3xl mb-8" style={{ filter: 'drop-shadow(0 0 40px rgba(58,157,176,0.4))' }} priority />
          <h1 className="font-display text-4xl md:text-5xl font-black mb-4 leading-tight">
            Révisez le <span className="bg-gradient-to-r from-[#3a9db0] to-[#7ec8e3] bg-clip-text text-transparent">Code de la Route</span> avec l&apos;IA
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-8 leading-relaxed">
            MA1 est l&apos;assistant IA qui vous accompagne vers la réussite du Code de la Route. QCM adaptatifs, analyse de panneaux, examens blancs — 10 questions gratuites par jour.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-8 py-4 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-base shadow-[0_4px_24px_rgba(58,157,176,0.4)] hover:-translate-y-0.5 transition-all">
              Commencer gratuitement
            </Link>
            <Link href="#pricing" className="px-8 py-4 rounded-full border border-white/[0.12] text-white/60 font-display font-semibold text-base hover:bg-white/[0.04] transition-all">
              Voir les plans
            </Link>
          </div>
          <p className="text-xs text-white/25 mt-4">Aucune carte bancaire requise · 10 questions gratuites par jour</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="font-display text-3xl font-black bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] bg-clip-text text-transparent">{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold text-center mb-12">Tout ce qu&apos;il faut pour <span className="text-[#7ec8e3]">réussir</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-all">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-6 bg-gradient-to-b from-transparent to-[rgba(58,157,176,0.04)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold text-center mb-3">Tarifs <span className="text-[#7ec8e3]">simples</span></h2>
          <p className="text-center text-white/40 text-sm mb-10">Moins cher qu&apos;une seule heure d&apos;auto-école</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING.map((p, i) => (
              <div key={i} className={`p-6 rounded-2xl border transition-all ${p.featured ? 'bg-[rgba(58,157,176,0.08)] border-[rgba(58,157,176,0.25)] shadow-[0_8px_40px_rgba(58,157,176,0.15)] scale-[1.02]' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                {p.featured && <div className="text-[10px] font-bold text-[#e8b84d] uppercase tracking-wider mb-2">Le plus populaire</div>}
                <h3 className="font-display text-lg font-bold">{p.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="font-display text-3xl font-black">{p.price}</span>
                  <span className="text-sm text-white/40">{p.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="text-[#2ed573] text-xs">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} className={`block text-center py-2.5 rounded-full font-display font-bold text-sm transition-all ${p.featured ? 'bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white shadow-md hover:-translate-y-0.5' : 'border border-white/[0.12] text-white/60 hover:bg-white/[0.04]'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-extrabold text-center mb-10">Questions fréquentes</h2>
          {FAQ.map((f, i) => (
            <details key={i} className="mb-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden group">
              <summary className="p-5 cursor-pointer font-display font-bold text-sm list-none flex items-center justify-between">
                {f.q}
                <span className="text-white/30 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-white/40 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-6 text-center">
        <h2 className="font-display text-2xl font-extrabold mb-4">Prêt à réussir votre Code ?</h2>
        <p className="text-white/40 text-sm mb-6">Rejoignez MA1 gratuitement — aucune carte bancaire requise.</p>
        <Link href="/" className="inline-block px-10 py-4 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-base shadow-[0_4px_24px_rgba(58,157,176,0.4)] hover:-translate-y-0.5 transition-all">
          Commencer mes révisions
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.08] text-center text-xs text-white/20">
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          <a href="/legal/cgu.html" className="hover:text-white/40">CGU</a>
          <a href="/legal/cgv.html" className="hover:text-white/40">CGV</a>
          <a href="/legal/confidentialite.html" className="hover:text-white/40">Confidentialité</a>
          <a href="/legal/mentions-legales.html" className="hover:text-white/40">Mentions légales</a>
        </div>
        <p>© {new Date().getFullYear()} DamCompany — MA1, Ton Assistant de la Route</p>
      </footer>

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
    </div>
  );
}
