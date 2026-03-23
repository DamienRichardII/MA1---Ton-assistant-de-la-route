'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

type Role = 'apprenti' | 'moniteur';
type Mode = 'choose' | 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setProfile, setUserRole } = useStore();
  const [role, setRole] = useState<Role>('apprenti');
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [siret, setSiret] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const yr = new Date().getFullYear();
  const years = Array.from({ length: 70 }, (_, i) => yr - 14 - i);

  const selectRole = (r: Role, m: 'login' | 'register') => { setRole(r); setMode(m); setErr(''); };

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (!email || !pw || pw.length < 6) { setErr('Email et mot de passe requis (min. 6 car.)'); setBusy(false); return; }
        const d = await api.register(email, pw, name, birth ? parseInt(birth) : undefined);
        setUser({ userId: d.user_id, token: d.token, name: name || email.split('@')[0], plan: d.plan, role });
        setUserRole(role);
        localStorage.setItem('ma1_token', d.token);
        showXPToast('+20 XP · Inscription');
        router.push(role === 'moniteur' ? '/dashboard' : '/positioning');
      } else {
        const d = await api.login(email, pw);
        setUser({ userId: d.user_id, token: d.token, name: d.name || email.split('@')[0], plan: d.plan, role: d.role || role });
        setUserRole(d.role === 'moniteur' ? 'moniteur' : role);
        if (d.profile) setProfile(d.profile);
        localStorage.setItem('ma1_token', d.token);
        router.push(role === 'moniteur' ? '/dashboard' : '/');
      }
    } catch (e: any) { setErr(e.message || 'Erreur de connexion'); }
    setBusy(false);
  };

  /* ── ROLE SELECTION ── */
  if (mode === 'choose') return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <div className="text-4xl mb-3">👤</div>
        <h1 className="font-display text-2xl font-extrabold text-ma1-ice">Bienvenue sur MA1</h1>
        <p className="text-white/40 text-sm mt-2">Choisissez votre profil pour continuer</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {/* Apprenti conducteur */}
        <div className="glass rounded-3xl p-6 flex flex-col items-center gap-4 text-center border-2 border-transparent hover:border-ma1-teal/30 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-ma1-teal/10 flex items-center justify-center text-3xl">🚗</div>
          <div>
            <div className="font-display text-lg font-extrabold text-ma1-ice">Apprenti conducteur</div>
            <div className="text-[12px] text-white/40 mt-1">Je prépare mon code de la route</div>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={() => selectRole('apprenti', 'login')} className="btn-primary w-full !py-2.5 !text-sm">Se connecter</button>
            <button onClick={() => selectRole('apprenti', 'register')} className="btn-ghost w-full !py-2.5">Créer un compte</button>
          </div>
        </div>

        {/* Moniteur */}
        <div className="glass rounded-3xl p-6 flex flex-col items-center gap-4 text-center border-2 border-transparent hover:border-ma1-gold/30 transition-all">
          <div className="w-16 h-16 rounded-2xl bg-ma1-gold/10 flex items-center justify-center text-3xl">🎓</div>
          <div>
            <div className="font-display text-lg font-extrabold text-ma1-ice">Moniteur d'auto-école</div>
            <div className="text-[12px] text-white/40 mt-1">Je suis un professionnel de la conduite</div>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={() => selectRole('moniteur', 'login')} className="w-full py-2.5 rounded-full font-display font-bold text-sm bg-gradient-to-br from-[rgba(232,184,77,0.2)] to-[rgba(255,165,2,0.15)] border border-[rgba(232,184,77,0.3)] text-[#e8b84d] hover:from-[rgba(232,184,77,0.3)] transition-all">Se connecter</button>
            <button onClick={() => selectRole('moniteur', 'register')} className="btn-ghost w-full !py-2.5 !border-[rgba(232,184,77,0.15)] !text-[#e8b84d]/70">Créer un compte</button>
          </div>
        </div>
      </div>
    </div>
  );

  const isMoniteur = role === 'moniteur';
  const accentColor = isMoniteur ? 'text-[#e8b84d]' : 'text-ma1-sky';

  /* ── LOGIN / REGISTER FORM ── */
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-[36px] p-8 max-w-md w-full animate-msg-in">
        <button onClick={() => setMode('choose')} className="text-white/30 text-xs hover:text-white/60 transition-colors mb-6 flex items-center gap-1">← Retour</button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isMoniteur ? 'bg-ma1-gold/10' : 'bg-ma1-teal/10'}`}>
            {isMoniteur ? '🎓' : '🚗'}
          </div>
          <div>
            <h2 className="font-display text-xl font-extrabold text-ma1-ice">
              {mode === 'login' ? 'Connexion' : 'Inscription'}
            </h2>
            <div className={`text-[11px] font-semibold ${accentColor}`}>
              {isMoniteur ? 'Moniteur d\'auto-école' : 'Apprenti conducteur'}
            </div>
          </div>
        </div>

        {mode === 'register' && (
          <div className="mb-3">
            <label className="block text-[11px] text-white/50 font-semibold mb-1">Prénom *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors" />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-[11px] text-white/50 font-semibold mb-1">Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors" />
        </div>

        <div className="mb-4">
          <label className="block text-[11px] text-white/50 font-semibold mb-1">Mot de passe *</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Min. 6 caractères"
            className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors"
            onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        </div>

        {mode === 'register' && !isMoniteur && (
          <div className="mb-4">
            <label className="block text-[11px] text-white/50 font-semibold mb-1">Année de naissance</label>
            <select value={birth} onChange={e => setBirth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none">
              <option value="">Sélectionnez…</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {mode === 'register' && isMoniteur && (
          <>
            <div className="mb-3">
              <label className="block text-[11px] text-white/50 font-semibold mb-1">Nom de l'auto-école</label>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Auto-école Dupont"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors" />
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-white/50 font-semibold mb-1">SIRET (optionnel)</label>
              <input value={siret} onChange={e => setSiret(e.target.value)} placeholder="000 000 000 00000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/30 transition-colors" />
            </div>
          </>
        )}

        <button onClick={submit} disabled={busy}
          className={`w-full py-3 rounded-full font-display font-bold text-sm transition-all ${isMoniteur
            ? 'bg-gradient-to-br from-[rgba(232,184,77,0.8)] to-[rgba(255,165,2,0.8)] text-[#1a0e00] hover:opacity-90'
            : 'btn-primary'} mt-1`}>
          {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>

        <p className="text-center mt-3 text-xs text-white/40">
          {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
            className={`underline cursor-pointer bg-transparent border-none ${accentColor}`}>
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>

        {err && <p className="text-center mt-2 text-[11px] text-ma1-red">{err}</p>}
      </div>
    </div>
  );
}
