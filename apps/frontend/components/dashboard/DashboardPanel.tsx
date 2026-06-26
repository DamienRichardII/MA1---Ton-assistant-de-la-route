'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { WhiteLabelSettings } from './WhiteLabelSettings';

interface Student { user_id:string; name:string; level:string; score_total:number; success_rate:number; weak_topics:string[]; exams:number; best_exam:number; readiness:number; plan_day:number; xp:number; }
interface Dash { total_students:number; avg_success_rate:number; ready_for_exam:number; students:Student[]; }
interface Alert { student_id:string; days_inactive:number; }

export function DashboardPanel() {
  const { userId } = useStore();
  const [data, setData] = useState<Dash|null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sortBy, setSortBy] = useState<'readiness'|'rate'|'xp'|'name'>('readiness');
  const [tab, setTab] = useState<'students'|'groups'|'settings'>('students');
  const [noteText, setNoteText] = useState('');
  const [noteStudent, setNoteStudent] = useState<string|null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const load = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([
        api.getDashboard(userId),
        fetch(`${API}/dashboard/alerts/${userId}`).then(r => r.json()).catch(() => ({ alerts: [] })),
      ]);
      setData(d);
      setAlerts(a.alerts || []);
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const addStudent = async () => { if(!email.trim()) return; try { await api.addStudent(userId, email.trim()); setEmail(''); load(); } catch(e:any) { alert(e.message||'Eleve non trouve'); }};

  const addNote = async (sid: string) => {
    if (!noteText.trim()) return;
    await fetch(`${API}/dashboard/note?owner_id=${userId}&student_id=${sid}&note=${encodeURIComponent(noteText)}`, { method: 'POST' });
    setNoteText(''); setNoteStudent(null);
  };

  const exportPDF = async () => {
    try { const r = await fetch(`${API}/dashboard/pdf/${userId}`); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `MA1_Dashboard.pdf`; a.click(); URL.revokeObjectURL(u); } catch { alert('Export indisponible.'); }
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = ['Nom,Niveau,Reussite,Questions,Readiness,XP,Jour Plan'];
    data.students.forEach(s => rows.push(`${s.name},${s.level},${s.success_rate}%,${s.score_total},${s.readiness}%,${s.xp},${s.plan_day}/30`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = 'MA1_Eleves.csv'; a.click();
  };

  const sorted = data?.students?.slice().sort((a, b) => {
    if (sortBy === 'readiness') return b.readiness - a.readiness;
    if (sortBy === 'rate') return b.success_rate - a.success_rate;
    if (sortBy === 'xp') return b.xp - a.xp;
    return a.name.localeCompare(b.name);
  }) || [];

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-[#3a9db0] animate-spin"/></div>;

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-lg font-extrabold">🏫 Dashboard Moniteur</h2>
        <div className="flex gap-1.5">
          <button onClick={exportPDF} className="btn-ghost !text-[10px]">📄 PDF</button>
          <button onClick={exportCSV} className="btn-ghost !text-[10px]">📊 CSV</button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="p-3 rounded-xl bg-[rgba(255,165,2,0.06)] border border-[rgba(255,165,2,0.15)]">
          <div className="text-xs font-bold text-[#ffa502] mb-1">⚠️ {alerts.length} eleve(s) inactif(s)</div>
          {alerts.map((a, i) => <div key={i} className="text-[11px] text-white/40">{a.student_id} — {a.days_inactive} jours sans activite</div>)}
        </div>
      )}

      {/* Stats */}
      {data && <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2">
        {[{v:data.total_students,l:'Eleves'},{v:`${data.avg_success_rate}%`,l:'Reussite moy.'},{v:data.ready_for_exam,l:'Prets examen'},{v:sorted.reduce((a,s)=>a+s.score_total,0),l:'Questions'}].map((s,i)=>(
          <div key={i} className="glass rounded-xl p-3 text-center"><div className="font-display text-xl font-extrabold">{s.v}</div><div className="text-[9px] text-white/30 uppercase tracking-wide mt-0.5">{s.l}</div></div>
        ))}
      </div>}

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(['students','groups','settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${tab === t ? 'bg-[rgba(58,157,176,0.1)] text-[#7ec8e3] border-[rgba(58,157,176,0.2)]' : 'border-white/[0.08] text-white/30'}`}>
            {t === 'students' ? '👥 Eleves' : t === 'groups' ? '📂 Groupes' : '🎨 Config'}
          </button>
        ))}
      </div>

      {tab === 'students' && <>
        {/* Add + sort */}
        <div className="flex gap-2 flex-wrap">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email de l'eleve…" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none" onKeyDown={e => { if(e.key==='Enter') addStudent(); }} />
          <button onClick={addStudent} className="px-4 py-2 rounded-xl bg-[#3a9db0] text-white text-xs font-bold">+ Ajouter</button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white outline-none">
            <option value="readiness">Tri: Readiness</option><option value="rate">Tri: Reussite</option><option value="xp">Tri: XP</option><option value="name">Tri: Nom</option>
          </select>
        </div>

        {/* Student list */}
        {sorted.map(s => (
          <div key={s.user_id} className="glass rounded-xl p-3 transition-all hover:bg-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold text-sm">{s.name || s.user_id}</div>
                <div className="text-[10px] text-white/30 mt-0.5">Jour {s.plan_day}/30 · {s.xp} XP · {s.level}{s.weak_topics.length ? ` · Faible: ${s.weak_topics.join(', ')}` : ''}</div>
              </div>
              <div className="font-display font-extrabold text-sm">{s.success_rate}%</div>
              <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.readiness >= 75 ? 'bg-[rgba(46,213,115,0.08)] text-[#2ed573]' : 'bg-[rgba(255,165,2,0.08)] text-[#ffa502]'}`}>
                {s.readiness >= 75 ? 'Pret' : `${s.readiness}%`}
              </div>
              <button onClick={() => setNoteStudent(noteStudent === s.user_id ? null : s.user_id)} className="text-white/30 text-xs hover:text-white/60">📝</button>
            </div>
            {noteStudent === s.user_id && (
              <div className="flex gap-2 mt-2 animate-msg-in">
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ajouter une note..." className="flex-1 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-white outline-none" onKeyDown={e => { if(e.key==='Enter') addNote(s.user_id); }} />
                <button onClick={() => addNote(s.user_id)} className="px-3 py-1.5 rounded-lg bg-[#3a9db0] text-white text-[10px] font-bold">Ajouter</button>
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && <div className="text-center py-8 text-white/30 text-sm">Aucun eleve. Ajoutez par email.</div>}
      </>}

      {tab === 'settings' && <WhiteLabelSettings />}
      {tab === 'groups' && <div className="text-center py-8 text-white/40 text-sm">Fonctionnalite groupes — utilisez l'API /dashboard/group pour creer des promotions.</div>}
    </div>
  );
}
