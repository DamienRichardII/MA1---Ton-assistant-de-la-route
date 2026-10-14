'use client';
import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { showXPToast } from '@/components/gamification/XPToast';

// Maquette 05 — Connexion / Inscription. Logique identique à AuthModal (mêmes endpoints, mêmes règles).
function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser, isLoggedIn } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Redirection après connexion : chemin interne uniquement (anti open-redirect).
  const rawNext = params.get('next') || '';
  const after = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\') ? rawNext : '/chat';
  useEffect(() => { if (isLoggedIn) router.replace(after); }, [isLoggedIn, router, after]);

  const yr = new Date().getFullYear();
  const years = Array.from({ length: 70 }, (_, i) => yr - 14 - i);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        if (!email || !pw || pw.length < 6) { setErr('Min. 6 caractères'); setBusy(false); return; }
        if (birth && yr - parseInt(birth) < 15) { setErr('Vous devez avoir au moins 15 ans'); setBusy(false); return; }
        const d = await api.register(email, pw, name, birth ? parseInt(birth) : undefined);
        setUser({ userId: d.user_id, token: d.token, name: name || email.split('@')[0], plan: d.plan });
        localStorage.setItem('ma1_token', d.token);
        showXPToast('+20 XP · Inscription');
      } else {
        const d = await api.login(email, pw);
        setUser({ userId: d.user_id, token: d.token, name: d.name || email.split('@')[0], plan: d.plan });
        localStorage.setItem('ma1_token', d.token);
      }
      router.push(after);
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    setBusy(false);
  };

  const tab = (m: 'login' | 'register', label: string) => (
    <button type="button" onClick={() => { setMode(m); setErr(''); }}
      className={`flex-1 border-b-2 pb-3 text-sm font-bold transition-colors ${mode === m ? 'border-ma1-blue text-ma1-blue' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{label}</button>
  );

  return (
    <form onSubmit={submit} className="w-full max-w-[420px]">
      <div className="mb-8 flex">{tab('login', 'Connexion')}{tab('register', 'Inscription')}</div>

      <div className="mb-5 flex flex-col gap-3">
        {['Google', 'Apple'].map(p => (
          <button key={p} type="button" disabled title="Bientôt disponible"
            className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-400">
            Continuer avec {p}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">Bientôt</span>
          </button>
        ))}
      </div>
      <div className="mb-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou<span className="h-px flex-1 bg-slate-200" /></div>

      {mode === 'register' && (
        <label className="mb-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Prénom</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom" className="web-input" autoComplete="given-name" /></label>
      )}
      <label className="mb-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Email</span>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className="web-input" autoComplete="email" required /></label>
      <label className="mb-2 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Mot de passe</span>
        <span className="relative block">
          <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Votre mot de passe" className="web-input pr-11" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </span></label>
      {mode === 'login' && (
        <div className="mb-5 text-right"><a href="mailto:contact@ma1.app?subject=Mot%20de%20passe%20oubli%C3%A9" className="text-xs font-semibold text-ma1-blue hover:underline">Mot de passe oublié ?</a></div>
      )}
      {mode === 'register' && (
        <label className="mb-5 mt-4 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Année de naissance</span>
          <select value={birth} onChange={e => setBirth(e.target.value)} className="web-input"><option value="">Sélectionnez…</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
      )}

      <button type="submit" disabled={busy} className="web-btn-primary w-full !py-3.5 disabled:opacity-60">{busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</button>
      {err && <p role="alert" className="mt-3 text-center text-xs font-semibold text-ma1-red">{err}</p>}
      <p className="mt-6 text-center text-xs text-slate-500">
        {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="font-bold text-ma1-blue hover:underline">{mode === 'login' ? "S'inscrire" : 'Se connecter'}</button>
      </p>
    </form>
  );
}

export function WebAuth() {
  return (
    <div className="text-ma1-ink max-lg:h-full max-lg:overflow-y-auto lg:grid lg:min-h-screen lg:grid-cols-[minmax(380px,0.9fr)_1.1fr] lg:bg-white">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1d3d] via-[#0a1628] to-[#06101f] p-10 lg:flex">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-ma1-blue/30 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-ma1-teal/25 blur-3xl" />
        <Link href="/landing" className="absolute left-8 top-8 flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white"><ArrowLeft size={15} />Retour au site</Link>
        <Image src="/ma1-logo.jpeg" alt="MA1 — Ton assistant de la route" width={300} height={300} priority className="relative rounded-[48px] shadow-[0_0_80px_rgba(21,83,224,0.45)]" />
        <p className="relative mt-8 max-w-xs text-center text-sm leading-relaxed text-white/60">L&apos;IA qui t&apos;accompagne vers la réussite du Code de la Route.</p>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12 max-lg:min-h-full lg:px-12">
        <div className="w-full max-w-[420px]">
          <Link href="/landing" className="mb-8 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-600 lg:hidden"><ArrowLeft size={15} />Retour</Link>
          <Suspense fallback={null}><AuthForm /></Suspense>
          <p className="mt-8 text-center text-[11px] text-slate-400">
            En continuant, vous acceptez les <a href="/legal/cgu.html" className="underline">CGU</a> et la <a href="/legal/confidentialite.html" className="underline">politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
