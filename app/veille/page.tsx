'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function VeillePage() {
  const [data, setData] = useState<{ date?: string; synthese?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVeille().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const fmt = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      <div className="glass rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <h3 className="font-display text-base font-extrabold mb-3 flex items-center gap-2.5">
          📡 Veille réglementaire
          {data?.date && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[rgba(46,213,115,0.1)] border border-[rgba(46,213,115,0.2)] text-[#2ed573]">{data.date}</span>}
        </h3>
        {loading ? (
          <div className="flex items-center gap-2.5 text-white/40 text-sm py-6 justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/[0.06] border-t-[#3a9db0] animate-spin" />
            Chargement…
          </div>
        ) : data?.synthese ? (
          <div className="text-sm leading-[1.8] text-white/50" dangerouslySetInnerHTML={{ __html: fmt(data.synthese) }} />
        ) : (
          <p className="text-white/40 text-sm">Veille indisponible — lancez le serveur backend.</p>
        )}
      </div>
    </div>
  );
}
