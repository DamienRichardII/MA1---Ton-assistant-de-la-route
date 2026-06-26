'use client';
// [Sprint Admin/Emails/Support] Page support utilisateur — envoyer un message + voir historique.
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CATEGORIES = [
  { id: 'bug', label: '🐛 Bug technique' },
  { id: 'question', label: '❓ Question d\'utilisation' },
  { id: 'paiement', label: '💳 Paiement / abonnement' },
  { id: 'compte', label: '👤 Mon compte' },
  { id: 'suggestion', label: '💡 Suggestion' },
  { id: 'erreur_qcm_ia', label: '⚠️ Erreur dans un QCM / IA' },
  { id: 'autre', label: '✉️ Autre' },
];

interface Thread {
  id: string; subject: string; category: string; status: string;
  last_message_at: string; unread_for_user: boolean; created_at: string;
}
interface Message {
  id: string; thread_id: string; sender_id: string;
  sender_role: 'user'|'admin'; message: string; created_at: string;
}

async function userFetch(path: string, init?: RequestInit): Promise<any> {
  const tok = typeof window !== 'undefined' ? localStorage.getItem('ma1_token') : null;
  if (!tok) throw new Error('NOT_AUTHENTICATED');
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (r.status === 401 || r.status === 403) throw new Error('NOT_AUTHENTICATED');
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail || `HTTP ${r.status}`);
  }
  return r.json();
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
}

export default function SupportPage() {
  const { isLoggedIn } = useStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [detail, setDetail] = useState<{thread: Thread, messages: Message[]}|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [mode, setMode] = useState<'list'|'new'>('list');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('question');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentOk, setSentOk] = useState(false);

  const loadList = async () => {
    setLoading(true); setErr(null);
    try {
      const d = await userFetch('/support/threads');
      setThreads(d.threads || []);
    } catch (e: any) {
      setErr(e?.message === 'NOT_AUTHENTICATED' ? 'Connectez-vous pour accéder au support.' : (e?.message || 'Erreur'));
    } finally { setLoading(false); }
  };

  const loadDetail = async (id: string) => {
    setSelectedId(id); setDetail(null);
    try {
      const d = await userFetch(`/support/threads/${id}`);
      setDetail(d);
    } catch (e: any) { setErr(e?.message || 'Erreur'); }
  };

  const sendNew = async () => {
    if (!subject.trim() || !message.trim()) return;
    setBusy(true); setErr(null);
    try {
      await userFetch('/support/threads', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() }),
      });
      setSentOk(true);
      setSubject(''); setMessage(''); setCategory('question');
      await loadList();
      setTimeout(() => { setMode('list'); setSentOk(false); }, 2500);
    } catch (e: any) {
      setErr(e?.message || 'Erreur lors de l\'envoi');
    } finally { setBusy(false); }
  };

  useEffect(() => { loadList(); }, []);

  if (!isLoggedIn) return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-md text-center">
        <div className="text-3xl mb-2">🔒</div>
        <h2 className="font-display text-lg font-bold mb-2">Connexion requise</h2>
        <p className="text-sm text-white/50 mb-4">Connectez-vous pour contacter le support MA1.</p>
        <Link href="/" className="btn-primary inline-block">Retour à l&apos;accueil</Link>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-xl font-extrabold">💬 Support MA1</h1>
        {mode === 'list' ? (
          <button onClick={() => { setMode('new'); setErr(null); }} className="btn-primary !text-xs !px-4 !py-2">+ Nouveau message</button>
        ) : (
          <button onClick={() => { setMode('list'); setErr(null); }} className="btn-ghost !text-[11px]">← Retour</button>
        )}
      </div>

      {err && <div className="glass rounded-xl p-3 text-[12px] text-ma1-red">{err}</div>}

      {mode === 'new' && (
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          {sentOk ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-sm text-white/70">Message envoyé. Nous vous répondrons sous 24 à 48 heures ouvrables. Une confirmation vient d&apos;arriver dans votre boîte mail.</p>
            </div>
          ) : (
            <>
              <label className="text-[11px] text-white/50 font-semibold">Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>

              <label className="text-[11px] text-white/50 font-semibold mt-1">Sujet</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                maxLength={200}
                placeholder="Résumé en une phrase…"
                className="px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"/>

              <label className="text-[11px] text-white/50 font-semibold mt-1">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={6} maxLength={5000}
                placeholder="Décrivez votre demande…"
                className="px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none resize-none focus:border-ma1-teal/40"/>

              <div className="flex justify-end gap-2">
                <button onClick={() => setMode('list')} className="btn-ghost !text-[11px]">Annuler</button>
                <button onClick={sendNew} disabled={busy || !subject.trim() || !message.trim()}
                  className="btn-primary !text-xs !px-5 !py-2">
                  {busy ? '…' : '📤 Envoyer'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'list' && (
        <>
          {loading && <div className="text-center text-[11px] text-white/40 py-4">Chargement…</div>}
          {!loading && threads.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <div className="text-2xl mb-2">✉️</div>
              <p className="text-sm text-white/50">Vous n&apos;avez pas encore envoyé de message.</p>
              <button onClick={() => setMode('new')} className="btn-primary !text-xs !px-5 !py-2 mt-4">+ Nouveau message</button>
            </div>
          )}
          {threads.map(t => (
            <div key={t.id} className="glass rounded-xl">
              <button onClick={() => selectedId === t.id ? setSelectedId(null) : loadDetail(t.id)}
                className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{t.subject}</span>
                    {t.unread_for_user && <span className="text-[9px] bg-[#e8b84d]/15 text-[#e8b84d] px-1.5 py-0.5 rounded">Nouveau</span>}
                  </div>
                  <div className="text-[11px] text-white/40">
                    <span className="capitalize">{t.category}</span> · {fmt(t.last_message_at)}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  t.status === 'closed' ? 'bg-white/[0.05] text-white/40' :
                  t.status === 'answered' ? 'bg-[rgba(46,213,115,0.08)] text-[#2ed573]' :
                  'bg-[rgba(232,184,77,0.08)] text-[#e8b84d]'
                }`}>{t.status}</span>
              </button>

              {selectedId === t.id && detail && (
                <div className="border-t border-white/[0.08] p-4 flex flex-col gap-2 animate-msg-in">
                  {detail.messages.map(m => (
                    <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap ${m.sender_role === 'admin' ? 'self-start bg-ma1-teal/15 border border-ma1-teal/25' : 'self-end bg-white/[0.04] border border-white/[0.06]'}`}>
                      <div className="text-[9.5px] text-white/40 mb-1">{m.sender_role === 'admin' ? 'Support MA1' : 'Vous'} · {fmt(m.created_at)}</div>
                      {m.message}
                    </div>
                  ))}
                  {t.status === 'closed' && (
                    <p className="text-center text-[11px] text-white/30 py-1">Conversation fermée.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
