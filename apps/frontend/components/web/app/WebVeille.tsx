'use client';
import { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { AppPage, Spinner } from './AppPage';

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

// Maquette 14 — Veille technologique. Synthèse réelle (API /veille).
export function WebVeille() {
  const [data, setData] = useState<{ date?: string; synthese?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getVeille().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  return (
    <AppPage title="Veille technologique" subtitle="Restez informé des dernières actualités du code de la route.">
      <div className="app-card p-7">
          <h2 className="mb-4 flex items-center gap-3 font-display text-base font-extrabold"><Radio size={18} className="text-ma1-sky" />Synthèse réglementaire
            {data?.date && <span className="rounded-full border border-ma1-green/25 bg-ma1-green/10 px-2.5 py-0.5 text-[10px] font-bold text-ma1-green">{data.date}</span>}</h2>
          {loading ? <Spinner label="Chargement…" /> : data?.synthese ? <Synthese text={data.synthese} /> : <p className="text-sm text-slate-400">Veille momentanément indisponible. Réessayez dans quelques instants.</p>}
      </div>
    </AppPage>
  );
}
