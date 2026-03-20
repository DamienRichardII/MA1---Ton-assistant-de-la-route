import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog MA1 — Guides Code de la Route',
  description: 'Articles, guides et conseils pour réussir le Code de la Route. Vitesse, alcool, priorités, signalisation.',
};

const ARTICLES = [
  { slug: 'vitesse-autoroute', title: 'Limitations de vitesse sur autoroute en 2026', desc: 'Temps sec, pluie, brouillard, jeune conducteur...', icon: '🛣️' },
  { slug: 'alcool-permis-probatoire', title: 'Alcool et permis probatoire', desc: 'Taux autorisé, sanctions, stupéfiants.', icon: '🍺' },
  { slug: 'priorite-a-droite', title: 'La priorité à droite', desc: 'Quand l\'appliquer, exceptions, pièges de l\'examen.', icon: '⚠️' },
];

export default function BlogIndex() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-extrabold mb-2">📚 Blog MA1</h1>
      <p className="text-white/40 text-sm mb-8">Guides et articles pour réussir le Code de la Route.</p>
      <div className="flex flex-col gap-4">
        {ARTICLES.map(a => (
          <Link key={a.slug} href={`/blog/${a.slug}`}
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:translate-x-1 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{a.icon}</span>
              <h2 className="font-display text-base font-bold">{a.title}</h2>
            </div>
            <p className="text-sm text-white/40">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
