'use client';
// [Sprint Admin/Emails/Support] Login admin — toggle eye, forgot password, pas de mot de passe en dur côté client.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [mode, setMode] = useState<'login'|'forgot'>('login');
  const [forgotOk, setForgotOk] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pw }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Identifiants incorrects.');
      }
      const d = await r.json();
      localStorage.setItem('ma1_admin_token', d.token);
      localStorage.setItem('ma1_admin_email', d.admin?.email || email);
      router.replace('/admin/dashboard');
    } catch (e: any) {
      setErr(e?.message || 'Erreur de connexion');
    } finally { setBusy(false); }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${API}/admin/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Réponse identique succès ou pas (anti-énumération)
      if (!r.ok) throw new Error('Erreur serveur');
      setForgotOk(true);
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-sm w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="font-display text-2xl font-extrabold text-ma1-ice">MA1 · Admin</div>
          <p className="text-[11px] text-white/40 mt-1">Espace administration MA1.fr</p>
        </div>

        {mode === 'login' && (
          <form onSubmit={submitLogin} className="flex flex-col gap-3">
            <label className="text-[11px] text-white/50 font-semibold">Email admin</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contact@ma1.fr"
              className="px-3 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"
            />

            <label className="text-[11px] text-white/50 font-semibold mt-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={pw}
                onChange={e => setPw(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-12 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"
              />
              <button
                type="button"
                aria-label={showPw ? 'Masquer' : 'Afficher'}
                onClick={() => setShowPw(s => !s)}
                className="absolute top-1/2 right-2 -translate-y-1/2 px-2 py-1 text-[11px] text-white/50 hover:text-ma1-sky bg-transparent border-none cursor-pointer"
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>

            {err && <p className="text-[11px] text-ma1-red text-center mt-1">{err}</p>}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full !py-3 mt-2"
            >
              {busy ? '…' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('forgot'); setErr(null); }}
              className="text-[11px] text-ma1-sky underline self-center mt-1 bg-transparent border-none cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
            <Link href="/" className="text-[10px] text-white/30 text-center hover:text-white/50 mt-3">
              ← Retour à MA1
            </Link>
          </form>
        )}

        {mode === 'forgot' && !forgotOk && (
          <form onSubmit={submitForgot} className="flex flex-col gap-3">
            <p className="text-xs text-white/55 leading-relaxed">
              Saisissez l&apos;email admin. Si cet email correspond à un compte administrateur, un lien
              de réinitialisation vous sera envoyé.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contact@ma1.fr"
              className="px-3 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"
            />
            {err && <p className="text-[11px] text-ma1-red text-center">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
              {busy ? '…' : 'Envoyer le lien'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setErr(null); }}
              className="text-[11px] text-white/40 underline self-center mt-1 bg-transparent border-none cursor-pointer"
            >
              Retour à la connexion
            </button>
          </form>
        )}

        {mode === 'forgot' && forgotOk && (
          <div className="text-center">
            <div className="text-3xl mb-2">✉️</div>
            <p className="text-sm text-white/70 leading-relaxed">
              Si l&apos;email est valide, un message a été envoyé. Vérifiez votre boîte
              (et les spams).
            </p>
            <p className="text-[11px] text-white/35 mt-3">Le lien expire dans 30 minutes.</p>
            <button
              onClick={() => { setMode('login'); setForgotOk(false); }}
              className="mt-4 btn-ghost"
            >
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
