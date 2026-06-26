'use client';
// [Sprint Admin/Emails/Support] Page admin messagerie support — liste threads + détail + réponse.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Thread {
  id: string; user_id: string; user_email: string;
  subject: string; category: string; status: string;
  last_message_at: string; unread_for_admin: boolean; created_at: string;
}
interface Message {
  id: string; thread_id: string; sender_id: string;
  sender_role: 'user'|'admin'; message: string; created_at: string;
}

async function authFetch(path: string, init?: RequestInit): Promise<any> {
  const tok = localStorage.getItem('ma1_admin_token');
  if (!tok) throw new Error('NO_TOKEN');
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (r.status === 401 || r.status === 403) throw new Error('UNAUTHORIZED');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
}

export default function AdminMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [filter, setFilter] = useState<'all'|'open'|'pending'|'answered'|'closed'>('all');
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [detail, setDetail] = useState<{thread: Thread, messages: Message[]}|null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  const loadList = async () => {
    setLoading(true); setErr(null);
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const d = await authFetch(`/admin/messages${qs}`);
      setThreads(d.threads || []);
      setCounts(d.counts || {});
    } catch (e: any) {
      if (e?.message === 'NO_TOKEN' || e?.message === 'UNAUTHORIZED') {
        localStorage.removeItem('ma1_admin_token'); router.replace('/admin/login'); return;
      }
      setErr(e?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const loadDetail = async (id: string) => {
    setSelectedId(id); setDetail(null); setReply('');
    try {
      const d = await authFetch(`/admin/messages/${id}`);
      setDetail(d);
    } catch (e: any) { setErr(e?.message || 'Erreur'); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedId) return;
    setBusy(true); setErr(null);
    try {
      await authFetch(`/admin/messages/${selectedId}/reply`, {
        method: 'POST', body: JSON.stringify({ message: reply.trim() }),
      });
      setReply('');
      await loadDetail(selectedId);
      await loadList();
    } catch (e: any) { setErr(e?.message || 'Erreur envoi'); }
    finally { setBusy(false); }
  };

  const closeThread = async () => {
    if (!selectedId) return;
    if (!confirm('Fermer cette conversation ?')) return;
    try {
      await authFetch(`/admin/messages/${selectedId}/close`, { method: 'POST' });
      await loadList();
      await loadDetail(selectedId);
    } catch (e: any) { setErr(e?.message || 'Erreur'); }
  };

  useEffect(() => { loadList(); }, [filter]);

  return (
    <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-xl font-extrabold">💬 Support — Messagerie</h1>
        <div className="flex gap-2">
          <Link href="/admin/dashboard" className="btn-ghost !text-[11px]">← Dashboard</Link>
          <button onClick={loadList} className="btn-ghost !text-[11px]">🔄</button>
        </div>
      </div>

      {/* Compteurs + filtres */}
      <div className="glass rounded-xl p-3">
        <div className="flex gap-2 flex-wrap items-center">
          {(['all','open','pending','answered','closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${filter === f ? 'bg-[rgba(58,157,176,0.12)] border-[rgba(58,157,176,0.3)] text-[#7ec8e3]' : 'border-white/[0.08] text-white/40 hover:border-white/[0.2]'}`}>
              {f === 'all' ? `Tout (${counts.total || 0})` :
               f === 'open' ? `Ouverts (${counts.open || 0})` :
               f === 'pending' ? `En attente (${counts.pending || 0})` :
               f === 'answered' ? `Répondus (${counts.answered || 0})` :
               `Fermés (${counts.closed || 0})`}
            </button>
          ))}
          {counts.unread_admin > 0 && (
            <span className="ml-auto text-[11px] text-[#e8b84d] font-semibold">
              ⚠️ {counts.unread_admin} non lu(s)
            </span>
          )}
        </div>
      </div>

      {err && <div className="text-[11px] text-ma1-red">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 flex-1 overflow-hidden">
        {/* Liste threads */}
        <div className="glass rounded-xl p-2 overflow-y-auto">
          {loading && <div className="text-center text-[11px] text-white/40 py-4">Chargement…</div>}
          {!loading && threads.length === 0 && (
            <div className="text-center text-[11px] text-white/30 py-8 px-3">
              Aucun message pour ce filtre.
            </div>
          )}
          {threads.map(t => (
            <button key={t.id} onClick={() => loadDetail(t.id)}
              className={`w-full text-left p-3 rounded-lg mb-1 transition-all border ${selectedId === t.id ? 'bg-[rgba(58,157,176,0.08)] border-[rgba(58,157,176,0.2)]' : 'border-transparent hover:bg-white/[0.03]'}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-[11px] text-white/40 truncate flex-1">{t.user_email || t.user_id}</div>
                {t.unread_for_admin && <span className="text-[9px] bg-[#e8b84d]/15 text-[#e8b84d] px-1.5 py-0.5 rounded">NEW</span>}
              </div>
              <div className="text-sm font-semibold text-ma1-ice truncate">{t.subject || '(sans sujet)'}</div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[9.5px] text-ma1-sky/70 capitalize">{t.category}</span>
                <span className="text-[9.5px] text-white/30">{fmt(t.last_message_at)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Détail thread */}
        <div className="glass rounded-xl p-4 overflow-y-auto flex flex-col">
          {!selectedId && (
            <div className="flex-1 flex items-center justify-center text-[12px] text-white/30">
              Sélectionnez un message à gauche.
            </div>
          )}
          {selectedId && !detail && (
            <div className="flex-1 flex items-center justify-center text-[12px] text-white/40">Chargement…</div>
          )}
          {detail && (
            <>
              <div className="border-b border-white/[0.08] pb-3 mb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-display text-base font-bold">{detail.thread.subject}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${detail.thread.status === 'closed' ? 'bg-white/[0.05] text-white/40' : 'bg-[rgba(46,213,115,0.08)] text-[#2ed573]'}`}>{detail.thread.status}</span>
                </div>
                <div className="text-[11px] text-white/40">
                  {detail.thread.user_email || detail.thread.user_id} · catégorie : <span className="capitalize">{detail.thread.category}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-3">
                {detail.messages.map(m => (
                  <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap ${m.sender_role === 'admin' ? 'self-end bg-ma1-teal/15 border border-ma1-teal/25' : 'self-start bg-white/[0.04] border border-white/[0.06]'}`}>
                    <div className="text-[9.5px] text-white/40 mb-1">{m.sender_role === 'admin' ? 'Admin' : 'Utilisateur'} · {fmt(m.created_at)}</div>
                    {m.message}
                  </div>
                ))}
              </div>
              {detail.thread.status !== 'closed' ? (
                <div className="flex flex-col gap-2">
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Votre réponse…" rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) sendReply(); }}/>
                  <div className="flex justify-between items-center">
                    <button onClick={closeThread} className="btn-ghost !text-[10px] !text-ma1-red">Fermer la conversation</button>
                    <button onClick={sendReply} disabled={busy || !reply.trim()} className="btn-primary !px-5 !py-2 !text-xs">
                      {busy ? '…' : '📤 Envoyer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[11px] text-white/30 py-2">Conversation fermée.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
