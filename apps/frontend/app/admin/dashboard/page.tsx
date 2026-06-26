'use client';
// [Sprint Admin/Emails/Support] Dashboard admin — données réelles via API backend.
// Aucune donnée factice, aucun placeholder. États vides propres si vide.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Kpis {
  total_users: number;
  online_now: number;
  active_today: number;
  active_week: number;
  users_with_qcm: number;
  users_with_exam: number;
  support_total: number;
  support_unread_admin: number;
}
interface LeaderRow {
  user_id: string; name: string; email: string;
  xp: number; level: string; qcm_total: number; success_rate: number; last_seen_at?: string;
}
interface ThemeRow {
  topic: string; label: string;
  total_answers: number; unique_users: number;
  success_rate: number|null; fail_rate: number|null;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

async function authFetch(path: string): Promise<any> {
  const tok = localStorage.getItem('ma1_admin_token');
  if (!tok) throw new Error('NO_TOKEN');
  const r = await fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${tok}` } });
  if (r.status === 401 || r.status === 403) throw new Error('UNAUTHORIZED');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpis|null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const [k, lb, ts, ws] = await Promise.all([
        authFetch('/admin/kpis'),
        authFetch('/admin/leaderboard?limit=20'),
        authFetch('/admin/theme-stats'),
        authFetch('/admin/weekly-summary'),
      ]);
      setKpis(k); setLeaders(lb.leaderboard || []); setThemes(ts.themes || []); setWeekly(ws);
    } catch (e: any) {
      if (e?.message === 'NO_TOKEN' || e?.message === 'UNAUTHORIZED') {
        localStorage.removeItem('ma1_admin_token');
        router.replace('/admin/login'); return;
      }
      setErr(e?.message || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const logout = () => {
    localStorage.removeItem('ma1_admin_token');
    localStorage.removeItem('ma1_admin_email');
    router.replace('/admin/login');
  };

  const copyWeekly = async () => {
    if (!weekly?.summary_text) return;
    try { await navigator.clipboard.writeText(weekly.summary_text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  };

  const exportCsv = () => {
    if (!leaders.length && !themes.length) return;
    const rows: string[] = [];
    rows.push('# Leaderboard');
    rows.push('Rang,Nom,Email,XP,Niveau,QCM total,Taux réussite,Dernière activité');
    leaders.forEach((l, i) => rows.push(`${i+1},${l.name},${l.email},${l.xp},${l.level},${l.qcm_total},${l.success_rate}%,${fmtDate(l.last_seen_at)}`));
    rows.push('');
    rows.push('# Stats par thème');
    rows.push('Thème,Réponses,Utilisateurs,Taux réussite,Taux échec');
    themes.forEach(t => rows.push(`${t.label},${t.total_answers},${t.unique_users},${t.success_rate ?? '—'}%,${t.fail_rate ?? '—'}%`));
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = u; a.download = `MA1_admin_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(u);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-[#3a9db0] animate-spin"/>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">🛡️ MA1 — Admin</h1>
          <p className="text-[11px] text-white/35">Données réelles · {kpis ? fmtDate(new Date().toISOString()) : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/messages" className="btn-ghost !text-[11px]">
            💬 Support {kpis && kpis.support_unread_admin > 0 ? `(${kpis.support_unread_admin})` : ''}
          </Link>
          <button onClick={load} className="btn-ghost !text-[11px]">🔄 Rafraîchir</button>
          <button onClick={logout} className="btn-ghost !text-[11px]">Déconnexion</button>
        </div>
      </div>

      {err && (
        <div className="glass rounded-xl p-3 text-[12px] text-ma1-red border border-ma1-red/20">
          {err} — réessayez ou vérifiez la connexion au backend.
        </div>
      )}

      {/* KPI */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { v: kpis.total_users, l: 'Comptes créés' },
            { v: kpis.online_now, l: 'En ligne maintenant' },
            { v: kpis.active_today, l: 'Actifs aujourd\'hui' },
            { v: kpis.active_week, l: 'Actifs 7 jours' },
            { v: kpis.users_with_qcm, l: 'Ont fait ≥1 QCM' },
            { v: kpis.users_with_exam, l: 'Ont fait ≥1 examen' },
            { v: kpis.support_total, l: 'Messages support' },
            { v: kpis.support_unread_admin, l: 'Support non lus' },
          ].map((k, i) => (
            <div key={i} className="glass rounded-xl p-4 text-center">
              <div className="font-display text-2xl font-black bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] bg-clip-text text-transparent">{k.v}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide mt-1">{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Reporting hebdo */}
      {weekly && (
        <div className="glass rounded-xl p-4 border border-ma1-teal/15">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h3 className="font-display text-sm font-bold text-ma1-sky">📣 Résumé hebdomadaire — Story Instagram</h3>
            <div className="flex gap-2">
              <button onClick={copyWeekly} className="btn-ghost !text-[10px]">
                {copied ? '✓ Copié' : '📋 Copier le résumé'}
              </button>
              <button onClick={exportCsv} className="btn-ghost !text-[10px]">📊 Exporter CSV</button>
            </div>
          </div>
          {weekly.summary_text ? (
            <pre className="text-[12px] text-white/65 leading-relaxed whitespace-pre-wrap font-body">{weekly.summary_text}</pre>
          ) : (
            <p className="text-[11px] text-white/35">Les statistiques apparaîtront dès que les utilisateurs commenceront à utiliser MA1.</p>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-display text-sm font-bold mb-3">🏆 Classement utilisateurs (top 20)</h3>
        {leaders.length === 0 ? (
          <p className="text-[12px] text-white/30 py-2">Aucun utilisateur classé pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-white/40">
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Utilisateur</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-right py-2 px-2">XP</th>
                  <th className="text-left py-2 px-2">Niveau</th>
                  <th className="text-right py-2 px-2">QCM</th>
                  <th className="text-right py-2 px-2">Réussite</th>
                  <th className="text-left py-2 px-2">Activité</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l, i) => (
                  <tr key={l.user_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 px-2 font-display font-bold text-ma1-sky">{i+1}</td>
                    <td className="py-2 px-2">{l.name || '(anonyme)'}</td>
                    <td className="py-2 px-2 text-white/40">{l.email || '—'}</td>
                    <td className="py-2 px-2 text-right font-display font-bold">{l.xp}</td>
                    <td className="py-2 px-2 text-white/50">{l.level}</td>
                    <td className="py-2 px-2 text-right">{l.qcm_total}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={l.success_rate >= 75 ? 'text-[#2ed573]' : l.success_rate >= 50 ? 'text-[#e8b84d]' : 'text-[#ff4757]'}>{l.success_rate}%</span>
                    </td>
                    <td className="py-2 px-2 text-white/35 text-[11px]">{fmtDate(l.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats par thème */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-display text-sm font-bold mb-3">📊 Statistiques par thème</h3>
        {themes.every(t => t.total_answers === 0) ? (
          <p className="text-[12px] text-white/30 py-2">Aucune donnée QCM disponible pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-white/40">
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-2 px-2">Thème</th>
                  <th className="text-right py-2 px-2">Réponses</th>
                  <th className="text-right py-2 px-2">Users</th>
                  <th className="text-right py-2 px-2">Réussite</th>
                  <th className="text-right py-2 px-2">Échec</th>
                </tr>
              </thead>
              <tbody>
                {themes.map(t => (
                  <tr key={t.topic} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-white/80">{t.label}</td>
                    <td className="py-2 px-2 text-right">{t.total_answers || '—'}</td>
                    <td className="py-2 px-2 text-right">{t.unique_users || '—'}</td>
                    <td className="py-2 px-2 text-right">
                      {t.success_rate !== null ? (
                        <span className={t.success_rate >= 75 ? 'text-[#2ed573]' : t.success_rate >= 50 ? 'text-[#e8b84d]' : 'text-[#ff4757]'}>{t.success_rate}%</span>
                      ) : <span className="text-white/25">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-white/50">
                      {t.fail_rate !== null ? `${t.fail_rate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-white/25 mt-2">Données calculées en temps réel depuis Supabase (qcm_attempts).</p>
      </div>
    </div>
  );
}
