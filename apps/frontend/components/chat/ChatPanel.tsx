'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';
import Image from 'next/image';

interface Msg { role: 'user' | 'bot'; text: string; sources?: any[]; }

const CHIPS = [
  { icon: '🛣️', text: 'Vitesse max sur autoroute ?' },
  { icon: '🍺', text: 'Alcool permis probatoire ?' },
  { icon: '⚠️', text: 'Quand céder la priorité à droite ?' },
  { icon: '📏', text: 'Distance de sécurité obligatoire ?' },
];

// [Sprint Étape 2] Sanitisation XSS — remplace l'ancien `fmt` + dangerouslySetInnerHTML.
// Échappe TOUT HTML reçu de l'IA, puis n'autorise QUE le markdown léger **gras** et *italique*.
// Aucune balise tierce n'est jamais injectée brute.
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Token =
  | { kind: 'br' }
  | { kind: 'text'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string };

function parseSafe(raw: string): Token[][] {
  const safe = escapeHtml(raw);
  const lines = safe.split(/\n/);
  return lines.map((line) => {
    const tokens: Token[] = [];
    let rest = line;
    while (rest.length > 0) {
      const bold = rest.match(/\*\*(.+?)\*\*/);
      const italic = rest.match(/\*(.+?)\*/);
      let first: { kind: 'strong' | 'em'; value: string; idx: number; len: number } | null = null;
      if (bold && bold.index !== undefined) {
        first = { kind: 'strong', value: bold[1], idx: bold.index, len: bold[0].length };
      }
      if (italic && italic.index !== undefined) {
        if (!first || italic.index < first.idx) {
          first = { kind: 'em', value: italic[1], idx: italic.index, len: italic[0].length };
        }
      }
      if (!first) {
        tokens.push({ kind: 'text', value: rest });
        break;
      }
      if (first.idx > 0) tokens.push({ kind: 'text', value: rest.slice(0, first.idx) });
      tokens.push({ kind: first.kind, value: first.value });
      rest = rest.slice(first.idx + first.len);
    }
    return tokens;
  });
}

function SafeMarkdown({ text }: { text: string }) {
  const lines = parseSafe(text);
  return (
    <>
      {lines.map((tokens, li) => (
        <span key={li}>
          {tokens.map((t, ti) => {
            // [Fix Vercel build] Switch exhaustif — chaque variant du type Token est géré.
            // TypeScript narrowing garantit que `t.value` n'est accédé QUE sur les variants
            // qui le possèdent. Le `default: return null` couvre les futurs ajouts au type.
            switch (t.kind) {
              case 'br':
                return <br key={ti} />;
              case 'strong':
                return <strong key={ti}>{t.value}</strong>;
              case 'em':
                return <em key={ti}>{t.value}</em>;
              case 'text':
                return <span key={ti}>{t.value}</span>;
              default:
                return null;
            }
          })}
          {li < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </>
  );
}

export function ChatPanel() {
  const { userId, qUsed, qMax, plan, addXP, incrementQuestion } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState<Array<{ role: string; content: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, []);
  useEffect(() => { scroll(); }, [msgs, scroll]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (plan === 'free' && qUsed >= qMax) return;
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
        setMsgs(p => [...p, { role: 'bot', text: d.answer, sources: d.sources }]);
        setHist(p => [...p, { role: 'user', content: msg }, { role: 'assistant', content: d.answer }].slice(-40));
        incrementQuestion(); addXP(5); showXPToast('+5 XP');
      } catch { setMsgs(p => [...p, { role: 'bot', text: 'Erreur. Vérifiez que le serveur est lancé.' }]); }
    } finally { setLoading(false); }
  };

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {msgs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-10">
            <Image src="/ma1-logo.jpeg" alt="MA1" width={80} height={80} className="rounded-3xl animate-breathe" style={{ filter: 'drop-shadow(0 0 30px rgba(58,157,176,0.35))' }} />
            <h2 className="font-display text-xl font-extrabold text-ma1-ice">Bonjour, je suis MA1</h2>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">Votre assistant IA spécialisé Code de la Route.</p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {CHIPS.map(c => (<button key={c.text} onClick={() => send(c.text)} className="px-3 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/50 text-xs font-medium hover:text-white/80 hover:-translate-y-0.5 transition-all">{c.icon} {c.text}</button>))}
            </div>
          </div>
        ) : msgs.map((m, i) => (
          <div key={i} className={`flex gap-2.5 animate-msg-in ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${m.role === 'bot' ? 'bg-gradient-to-br from-ma1-teal to-ma1-sky' : 'bg-white/[0.08] border border-white/[0.08]'}`}>{m.role === 'bot' ? '🤖' : '👤'}</div>
            <div className={`max-w-[70%] max-sm:max-w-[85%] px-4 py-3 text-sm leading-relaxed ${m.role === 'bot' ? 'glass rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl' : 'bg-gradient-to-br from-ma1-teal/70 to-ma1-node/55 border border-ma1-teal/35 rounded-tl-2xl rounded-tr-sm rounded-br-2xl rounded-bl-2xl'}`}>
              {m.sources && m.sources.length > 0 && <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ma1-sky/8 border border-ma1-sky/15 text-[10px] text-ma1-sky font-semibold mb-1.5">🔗 Sources Légifrance</div>}
              <div><SafeMarkdown text={m.text} /></div>
              {m.role === 'bot' && m.text && <div className="mt-2 p-1.5 rounded-lg bg-ma1-gold/[0.04] border border-ma1-gold/10 text-[9.5px] text-ma1-gold/50 italic">⚠️ MA1 est un outil pédagogique. Ces informations ne constituent pas un conseil juridique.</div>}
            </div>
          </div>
        ))}
        {loading && <div className="flex gap-2.5 animate-msg-in"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ma1-teal to-ma1-sky flex items-center justify-center text-sm">🤖</div><div className="glass rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-5 py-3.5 flex gap-1">{[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 rounded-full bg-ma1-teal animate-bounce" style={{animationDelay:`${i*200}ms`}}/>)}</div></div>}
      </div>
      <div className="p-3 border-t border-white/[0.08] bg-ma1-navy/50 backdrop-blur-2xl">
        <div className="flex gap-2 items-end glass rounded-3xl px-4 py-2 transition-all focus-within:shadow-[0_0_20px_rgba(58,157,176,0.08)]">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}} placeholder="Posez votre question sur le Code de la Route…" rows={1} className="flex-1 bg-transparent border-none outline-none text-ma1-ice font-body text-sm resize-none max-h-28 leading-relaxed placeholder:text-white/25" />
          <button onClick={() => send()} className="w-8 h-8 rounded-full bg-gradient-to-br from-ma1-teal to-ma1-sky text-white flex items-center justify-center shrink-0 hover:scale-105 transition-all shadow-md"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </div>
        <div className="text-[9.5px] text-white/15 mt-1.5 px-1"><a href="/legal/cgu.html" target="_blank" className="hover:text-white/25">CGU</a> · <a href="/legal/confidentialite.html" target="_blank" className="hover:text-white/25">Confidentialité</a> · <a href="/legal/mentions-legales.html" target="_blank" className="hover:text-white/25">Mentions légales</a></div>
      </div>
    </>
  );
}
