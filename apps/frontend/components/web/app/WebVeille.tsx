'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { AppPage, Spinner } from './AppPage';

const ARTICLES = [
  { slug: 'vitesse-autoroute', title: 'Limitations de vitesse sur autoroute en 2026', desc: 'Temps sec, pluie, brouillard, jeune conducteur…', tag: 'Réglementation' },
  { slug: 'alcool-permis-probatoire', title: 'Alcool et permis probatoire', desc: 'Taux autorisé, sanctions, stupéfiants.', tag: 'Sécurité' },
  { slug: 'priorite-a-droite', title: 'La priorité à droite', desc: "Quand l'appliquer, exceptions, pièges de l'examen.", tag: 'Conseils' },
];
const TABS = ['Toutes', 'Actualités', 'Réglementation', 'Conseils', 'Sécurité'] as const;

// Même mise en forme sûre que app/veille/page.tsx, sans innerHTML : gras `**x**` et sauts de ligne uniquement.
function Synthese({ text }: { text: string }) {
  return (
    <div className="text-sm leading-[1.9] text-slate-300">
      {text.split('\n').map((line, i) => (
        <p key={i} className={line.trim() ? '' : 'h-3'}>
          {line.split(/(\*\*.+?\*\*)/g).map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-white">{part.slice(2, -2)}</strong> : part)}
        </p>
      ))}
    </div>
  );
}

// Maquette 14 — Veille technologique. Synthèse réelle (API /veille) + guides du blog MA1.
export function WebVeille() {
  const [data, setData] = useState<{ date?: string; synthese?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Toutes');

  useEffect(() => { api.getVeille().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const showSynth = tab === 'Toutes' || tab === 'Actualités' || tab === 'Réglementation';
  const arts = ARTICLES.filter(a => tab === 'Toutes' || a.tag === tab);

  return (
    <AppPage title="Veille technologique" subtitle="Restez informé des dernières actualités du code de la route.">
      <div role="tablist" aria-label="Catégories" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${tab === t ? 'bg-ma1-blue text-white' : 'border border-ma1-app-line text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {showSynth && (
        <div className="app-card mb-6 p-7">
          <h2 className="mb-4 flex items-center gap-3 font-display text-base font-extrabold"><Radio size={18} className="text-ma1-sky" />Synthèse réglementaire
            {data?.date && <span className="rounded-full border border-ma1-green/25 bg-ma1-green/10 px-2.5 py-0.5 text-[10px] font-bold text-ma1-green">{data.date}</span>}</h2>
          {loading ? <Spinner label="Chargement…" /> : data?.synthese ? <Synthese text={data.synthese} /> : <p className="text-sm text-slate-400">Veille momentanément indisponible. Réessayez dans quelques instants.</p>}
        </div>
      )}

      {arts.length > 0 && (
        <div className="grid grid-cols-3 gap-5">
          {arts.map(a => (
            <Link key={a.slug} href={`/blog/${a.slug}`} className="app-card group flex flex-col gap-3 p-6 transition-all hover:-translate-y-1 hover:border-ma1-blue/60">
              <span className="self-start rounded-full bg-ma1-blue/15 px-3 py-1 text-[11px] font-bold text-ma1-sky">{a.tag}</span>
              <h3 className="font-display text-base font-bold leading-snug">{a.title}</h3>
              <p className="flex-1 text-xs leading-relaxed text-slate-400">{a.desc}</p>
              <span className="flex items-center gap-1 text-xs font-bold text-ma1-sky">Lire l&apos;article<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
            </Link>
          ))}
        </div>
      )}
      {!showSynth && arts.length === 0 && <div className="app-card py-16 text-center text-sm text-slate-400">Aucun contenu dans cette catégorie pour le moment.</div>}
    </AppPage>
  );
}
