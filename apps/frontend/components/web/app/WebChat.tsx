'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Send } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';
import { SafeMarkdown } from '@/components/chat/ChatPanel';

interface Msg { role: 'user' | 'bot'; text: string; sources?: any[] }

const CHIPS = ['Vitesse max sur autoroute ?', 'Alcool permis probatoire ?', 'Quand céder la priorité à droite ?', 'Distance de sécurité obligatoire ?'];

// Maquette 00 — Chat IA. Mêmes endpoints / mêmes règles de quota que ChatPanel (mobile).
export function WebChat() {
  const { userId, qUsed, qMax, plan, addXP, incrementQuestion } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState<Array<{ role: string; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quotaReached = plan === 'free' && qUsed >= qMax;

  const scroll = useCallback(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, []);
  useEffect(() => { scroll(); }, [msgs, scroll]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading || quotaReached) return;
    setInput('');
    setMsgs(p => [...p, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await api.chatStream(msg, userId, hist);
      if (!res.ok) throw new Error();
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let botText = '';
      let sources: any[] = [];
      setMsgs(p => [...p, { role: 'bot', text: '', sources: [] }]);
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.type === 'token') { botText += d.text; setMsgs(p => { const c = [...p]; c[c.length - 1] = { role: 'bot', text: botText, sources }; return c; }); }
            else if (d.type === 'sources') { sources = d.sources || []; }
            else if (d.type === 'done') { incrementQuestion(); addXP(5); showXPToast('+5 XP'); }
          } catch {}
        }
      }
      setHist(p => [...p, { role: 'user', content: msg }, { role: 'assistant', content: botText }].slice(-40));
    } catch {
      try {
        const d = await api.chat(msg, userId, hist);
        setMsgs(p => [...p.filter(m => !(m.role === 'bot' && m.text === '')), { role: 'bot', text: d.answer, sources: d.sources }]);
        setHist(p => [...p, { role: 'user', content: msg }, { role: 'assistant', content: d.answer }].slice(-40));
        incrementQuestion(); addXP(5); showXPToast('+5 XP');
      } catch { setMsgs(p => [...p.filter(m => !(m.role === 'bot' && m.text === '')), { role: 'bot', text: 'Erreur. Vérifiez que le serveur est lancé.' }]); }
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto flex h-screen w-full max-w-[1000px] flex-col px-10 py-9 text-white">
      <header className="mb-6">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Chat IA</h1>
        <p className="mt-1.5 text-sm text-slate-400">Posez toutes vos questions sur le code de la route.</p>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-5 overflow-y-auto pb-4 pr-2">
        {msgs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Image src="/ma1-logo.jpeg" alt="MA1" width={84} height={84} className="rounded-3xl shadow-[0_0_40px_rgba(21,83,224,0.45)]" />
            <h2 className="font-display text-xl font-extrabold">Bonjour, je suis MA1</h2>
            <p className="max-w-md text-sm text-slate-400">Votre assistant IA spécialisé Code de la Route.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2.5">
              {CHIPS.map(c => <button key={c} onClick={() => send(c)} className="rounded-full border border-ma1-app-line bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:-translate-y-0.5 hover:border-ma1-blue/60 hover:text-white">{c}</button>)}
            </div>
          </div>
        ) : msgs.map((m, i) => m.role === 'user' ? (
          <div key={i} className="flex justify-end animate-msg-in">
            <div className="max-w-[70%] rounded-[22px] rounded-br-md bg-[#1f6bff] px-6 py-3.5 text-sm font-medium shadow-[0_8px_24px_rgba(31,107,255,0.35)]">{m.text}</div>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-4 animate-msg-in">
            <Image src="/ma1-logo.jpeg" alt="MA1" width={40} height={40} className="shrink-0 rounded-xl" />
            <div className="app-card max-w-[78%] px-6 py-5 text-sm leading-relaxed text-slate-200">
              {m.sources && m.sources.length > 0 && <div className="mb-2 inline-flex rounded-full border border-ma1-sky/20 bg-ma1-sky/10 px-2.5 py-0.5 text-[10px] font-semibold text-ma1-sky">Sources Légifrance</div>}
              <div><SafeMarkdown text={m.text} /></div>
              {m.text && <div className="mt-3 rounded-lg border border-ma1-gold/10 bg-ma1-gold/[0.05] p-2 text-[10.5px] italic text-ma1-gold/70">MA1 est un outil pédagogique, vérifier sur Légifrance. Ces informations ne constituent pas un conseil juridique.</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-4"><Image src="/ma1-logo.jpeg" alt="" width={40} height={40} className="rounded-xl" />
            <div className="app-card flex gap-1.5 px-6 py-5" role="status" aria-label="MA1 écrit">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ma1-sky" style={{ animationDelay: `${i * 200}ms` }} />)}</div></div>
        )}
      </div>

      {quotaReached && <p className="mb-3 rounded-xl border border-ma1-gold/20 bg-ma1-gold/10 px-4 py-2.5 text-xs text-ma1-gold">Quota quotidien atteint (10 questions IA). <a href="/abonnement" className="font-bold underline">Passer Premium</a></p>}
      <div className="app-card flex items-end gap-3 px-5 py-3 focus-within:border-ma1-blue/60">
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={1} aria-label="Votre message"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrivez votre message…" className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-slate-500" />
        <button onClick={() => send()} disabled={loading || quotaReached} aria-label="Envoyer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ma1-blue text-white transition-all hover:scale-105 disabled:opacity-50"><Send size={16} /></button>
      </div>
      <p className="mt-2 text-center text-[10.5px] text-slate-500">MA1 est un outil pédagogique — vérifier sur Légifrance.</p>
    </div>
  );
}
