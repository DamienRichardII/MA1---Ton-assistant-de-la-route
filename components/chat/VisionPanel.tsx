'use client';
import { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

export function VisionPanel() {
  const { userId, addXP } = useStore();
  const [preview, setPreview] = useState<string|null>(null);
  const [result, setResult] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const process = async (file: File) => {
    const r = new FileReader(); r.onload = e => setPreview(e.target?.result as string); r.readAsDataURL(file);
    setLoading(true); setResult(null);
    try { const d = await api.analyzeImage(file, userId); setResult(d.analysis); addXP(15); showXPToast('+15 XP · Panneau analysé'); }
    catch { setResult('Erreur. Vérifiez que le serveur est lancé.'); }
    setLoading(false);
  };

  const fmt = (t: string) => t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>');
  const reset = () => { setPreview(null); setResult(null); if(fileRef.current) fileRef.current.value=''; };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {!preview ? (
        <div className={`glass rounded-3xl p-10 text-center cursor-pointer transition-all ${drag?'border-ma1-teal/40 bg-ma1-teal/8':''}`}
          onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f?.type.startsWith('image/'))process(f);}}
          onClick={()=>fileRef.current?.click()}>
          <div className="text-[42px] mb-2.5">📸</div>
          <h3 className="font-display text-base font-bold mb-1.5">Analyser un panneau routier</h3>
          <p className="text-white/50 text-xs leading-relaxed">Glissez une photo ou cliquez pour choisir une image.</p>
          <button className="mt-3.5 px-5 py-2 rounded-full bg-ma1-teal text-white font-display font-bold text-xs shadow-md">Choisir une image</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)process(f);}}/>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-msg-in">
          <img src={preview} alt="panneau" className="max-h-60 rounded-2xl object-contain border border-white/[0.08] bg-white/[0.03]"/>
          <div className="glass rounded-3xl p-5">
            {loading ? <div className="flex flex-col items-center gap-3 py-4"><div className="w-7 h-7 rounded-full border-2 border-white/[0.06] border-t-ma1-teal animate-spin"/><span className="text-white/40 text-sm">Analyse par IA…</span></div>
            : result ? <>
              <h4 className="font-display text-sm font-bold text-ma1-sky mb-2">✅ Analyse du panneau</h4>
              <div className="text-sm leading-relaxed text-white/70" dangerouslySetInnerHTML={{__html:fmt(result)}}/>
              <div className="mt-2 p-1.5 rounded-lg bg-ma1-gold/[0.04] border border-ma1-gold/10 text-[9.5px] text-ma1-gold/50 italic">⚠️ Outil pédagogique. Vérifiez sur Légifrance.</div>
              <button onClick={reset} className="mt-3 btn-ghost">Analyser une autre image</button>
            </> : null}
          </div>
        </div>
      )}
    </div>
  );
}
