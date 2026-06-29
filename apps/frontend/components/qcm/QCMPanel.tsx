'use client';
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

interface Q { id: string; question: string; choices: string[]; answer_index: number; explanation?: string; ref?: string; image_url?: string; }
const L = ['A','B','C','D'];
const LABELS: Record<string,string> = { vitesse:'Limitations de vitesse', signalisation:'Signalisation', priorite:'Priorités', alcool:'Alcool & drogues', permis:'Permis probatoire', autoroute:'Autoroute', stationnement:'Stationnement', securite:'Sécurité passive', premiers_secours:'Premiers secours', eco:'Éco-conduite', moto:'Moto', nuit:'Conduite de nuit' };

export function QCMPanel() {
  const { userId, topic, recordAnswer, addXP } = useStore();
  const [qs, setQs] = useState<Q[]>([]);
  const [cur, setCur] = useState(0);
  const [diff, setDiff] = useState('auto');
  const [load, setLoad] = useState(false);
  const [ans, setAns] = useState<number|null>(null);
  const [ok, setOk] = useState(0);
  const [ko, setKo] = useState(0);

  const gen = useCallback(async () => {
    setLoad(true); setAns(null);
    try {
      const d = await api.generateQCM(topic, 8, userId, diff);
      setQs(d.questions||[]); setCur(0);
      try { const c=JSON.parse(localStorage.getItem('ma1_qcm_cache')||'{}'); c[topic]=d.questions; localStorage.setItem('ma1_qcm_cache',JSON.stringify(c)); } catch{}
    } catch {
      try { const c=JSON.parse(localStorage.getItem('ma1_qcm_cache')||'{}'); if(c[topic]){setQs(c[topic]);setCur(0);} } catch{}
    }
    setLoad(false);
  }, [topic, userId, diff]);

  useEffect(() => { gen(); }, [topic]);
  const q = qs[cur];

  const answer = async (i: number) => {
    if (ans !== null) return;
    setAns(i);
    const correct = i === q.answer_index;
    recordAnswer(correct);
    if (correct) { setOk(v=>v+1); addXP(10); showXPToast('+10 XP · Bonne réponse'); } else setKo(v=>v+1);
    try { await api.submitQCMResult(userId, topic, correct); } catch{}
  };

  const next = () => { setAns(null); if (cur+1 >= qs.length) gen(); else setCur(c=>c+1); };

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <h2 className="font-display text-base font-extrabold tracking-tight">📋 {LABELS[topic]||topic}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={diff} onChange={e=>setDiff(e.target.value)} className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white text-xs font-medium outline-none">
            <option value="auto">🎯 Adaptatif</option><option value="facile">🟢 Facile</option><option value="moyen">🟡 Moyen</option><option value="difficile">🔴 Difficile</option>
          </select>
          <button onClick={gen} className="px-3 py-1.5 rounded-full border border-ma1-teal/20 bg-ma1-teal/8 text-ma1-sky text-xs font-semibold hover:bg-ma1-teal/16 transition-all">↻ Nouvelles</button>
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-ma1-green/10 border border-ma1-green/20 text-ma1-green">✓ {ok}</span>
          <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-ma1-red/8 border border-ma1-red/20 text-ma1-red">✕ {ko}</span>
        </div>
      </div>

      {load ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
          <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-ma1-teal animate-spin"/>
          <span className="text-white/40 text-sm">Génération…</span>
        </div>
      ) : q ? (
        <div className="glass rounded-3xl p-6 animate-msg-in relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"/>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-ma1-teal/10 border border-ma1-teal/20 text-ma1-sky">{q.ref||'Code de la Route'}</span>
            <span className="text-[11px] text-white/30">Q{cur+1}/{qs.length}</span>
          </div>
          {q.image_url && <img src={q.image_url} alt="Situation" className="max-w-full max-h-48 rounded-xl border border-white/[0.08] object-contain mb-3.5" onError={e=>(e.target as HTMLImageElement).style.display='none'}/>}
          <div className="font-display text-base font-bold leading-relaxed mb-5">{q.question}</div>
          <div className="flex flex-col gap-2">
            {q.choices.map((c,i) => {
              let cls = 'border-white/[0.08] bg-white/[0.02] hover:bg-ma1-teal/8 hover:border-ma1-teal/20 hover:translate-x-1 cursor-pointer';
              if (ans !== null) {
                if (i===q.answer_index) cls='border-ma1-green/35 bg-ma1-green/10 text-ma1-green';
                else if (i===ans) cls='border-ma1-red/25 bg-ma1-red/8 text-ma1-red';
                else cls='border-white/[0.05] opacity-40';
              }
              return <button key={i} onClick={()=>answer(i)} disabled={ans!==null} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm text-left transition-all backdrop-blur-sm ${cls} ${ans!==null?'cursor-default':''}`}><span className="w-6 h-6 rounded-lg bg-ma1-teal/8 flex items-center justify-center font-display font-extrabold text-[11px] shrink-0">{L[i]}</span>{c}</button>;
            })}
          </div>
          {ans !== null && q.explanation && <div className="mt-3 p-3.5 rounded-2xl bg-ma1-teal/[0.04] border-l-2 border-ma1-teal text-xs text-white/50 leading-relaxed animate-msg-in">{q.explanation}</div>}
          {ans !== null && <button onClick={next} className="mt-3 self-end btn-primary !px-6 !py-2.5 !text-xs animate-msg-in">Suivante →</button>}
        </div>
      ) : <div className="flex-1 flex items-center justify-center"><button onClick={gen} className="btn-ghost">Charger des questions</button></div>}
    </div>
  );
}
