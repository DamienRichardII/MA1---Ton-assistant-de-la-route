'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setUser, setUserRole } = useStore();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const yr = new Date().getFullYear();
  const years = Array.from({length:70},(_,i)=>yr-14-i);

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (!email||!pw||pw.length<6) { setErr('Min. 6 caractères'); setBusy(false); return; }
        if (birth && yr-parseInt(birth)<15) { setErr('Vous devez avoir au moins 15 ans'); setBusy(false); return; }
        const d = await api.register(email, pw, name, birth?parseInt(birth):undefined);
        setUser({userId:d.user_id, token:d.token, name:name||email.split('@')[0], plan:d.plan, role:'apprenti'}); setUserRole('apprenti');
        localStorage.setItem('ma1_token', d.token);
        showXPToast('+20 XP · Inscription');
      } else {
        const d = await api.login(email, pw);
        setUser({userId:d.user_id, token:d.token, name:d.name||email.split('@')[0], plan:d.plan, role:d.role||'apprenti'}); setUserRole(d.role==='moniteur'?'moniteur':'apprenti');
        localStorage.setItem('ma1_token', d.token);
      }
      onClose();
    } catch (e: any) { setErr(e.message||'Erreur'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-2xl flex items-center justify-center p-5" onClick={onClose}>
      <div className="bg-[rgba(12,24,45,0.95)] border border-white/[0.12] rounded-[36px] p-8 max-w-sm w-full animate-msg-in relative" onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 flex items-center justify-center text-sm hover:text-white/70 transition-colors">✕</button>
        <h2 className="font-display text-xl font-extrabold text-center text-ma1-ice mb-5">{mode==='login'?'Connexion':'Créer un compte'}</h2>
        {mode==='register' && <div className="mb-3"><label className="block text-[11px] text-white/50 font-semibold mb-1">Prénom</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre prénom" className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors"/></div>}
        <div className="mb-3"><label className="block text-[11px] text-white/50 font-semibold mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30"/></div>
        <div className="mb-3"><label className="block text-[11px] text-white/50 font-semibold mb-1">Mot de passe</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Min. 6 caractères" className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30" onKeyDown={e=>{if(e.key==='Enter')submit();}}/></div>
        {mode==='register' && <div className="mb-4"><label className="block text-[11px] text-white/50 font-semibold mb-1">Année de naissance</label><select value={birth} onChange={e=>setBirth(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none"><option value="">Sélectionnez…</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>}
        <button onClick={submit} disabled={busy} className="btn-primary w-full !py-3 mt-1">{busy?'…':mode==='login'?'Se connecter':'Créer mon compte'}</button>
        <p className="text-center mt-3 text-xs text-white/40">{mode==='login'?'Pas de compte ? ':'Déjà inscrit ? '}<button onClick={()=>{setMode(mode==='login'?'register':'login');setErr('');}} className="text-ma1-sky underline cursor-pointer bg-transparent border-none">{mode==='login'?'Créer un compte':'Se connecter'}</button></p>
        {err && <p className="text-center mt-2 text-[11px] text-ma1-red">{err}</p>}
      </div>
    </div>
  );
}
