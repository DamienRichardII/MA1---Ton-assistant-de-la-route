'use client';
// [Sprint Admin/Emails/Support] Page de réinitialisation du mot de passe admin.
// Atterrissage depuis l'email Resend (?token=...).
// [Fix Vercel build Next.js 15] useSearchParams() doit être dans un <Suspense> boundary
// pour permettre le static prerendering. Sans ça, Next refuse de builder la page.
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setErr('Lien invalide : token manquant.');
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pw1.length < 8) { setErr('Mot de passe trop court (8 caractères minimum).'); return; }
    if (pw1 !== pw2) { setErr('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: pw1 }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || 'Token invalide ou expiré.');
      }
      setDone(true);
      setTimeout(() => router.replace('/admin/login'), 2500);
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally { setBusy(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-8 max-w-sm w-full">
        <h2 className="font-display text-xl font-extrabold text-ma1-ice text-center mb-4">
          Nouveau mot de passe admin
        </h2>

        {done ? (
          <div className="text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-white/70">Mot de passe mis à jour. Redirection…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="text-[11px] text-white/50 font-semibold">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pw1}
                onChange={e => setPw1(e.target.value)}
                placeholder="Min. 8 caractères"
                className="w-full px-3 py-2.5 pr-12 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"
                required
              />
              <button type="button" onClick={() => setShow(s => !s)}
                aria-label={show ? 'Masquer' : 'Afficher'}
                className="absolute top-1/2 right-2 -translate-y-1/2 px-2 py-1 text-[11px] text-white/50 hover:text-ma1-sky bg-transparent border-none cursor-pointer">
                {show ? '🙈' : '👁'}
              </button>
            </div>

            <label className="text-[11px] text-white/50 font-semibold mt-1">Confirmer</label>
            <input
              type={show ? 'text' : 'password'}
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.03] text-ma1-ice text-sm outline-none focus:border-ma1-teal/40"
              required
            />

            {err && <p className="text-[11px] text-ma1-red text-center">{err}</p>}

            <button type="submit" disabled={busy || !token} className="btn-primary w-full !py-3 mt-2">
              {busy ? '…' : 'Mettre à jour'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  // [Fix Vercel build] Suspense obligatoire autour de useSearchParams() en Next.js 15.
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-white/40 text-sm">Chargement…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
