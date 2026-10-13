'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, LifeBuoy } from 'lucide-react';
import { useStore } from '@/lib/store';

const SUBJECTS = ['Question générale', 'Espace moniteur', 'Auto-école / démo', 'Paiement / abonnement', 'Bug technique', 'Autre'];

// Maquette 07 — Contact. Pas d'API publique de contact : l'envoi ouvre le client mail (mailto).
export function WebContact() {
  const { isLoggedIn } = useStore();
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `${f.message}\n\n— ${f.name} (${f.email})`;
    window.location.href = `mailto:contact@ma1.app?subject=${encodeURIComponent(f.subject || 'Contact MA1')}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="web-card grid overflow-hidden lg:grid-cols-[1fr_1.15fr]">
      <div className="p-8 lg:p-14">
        <h1 className="font-display text-[34px] font-extrabold tracking-tight">Contactez-nous</h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-600">Une question ? Une suggestion ? Notre équipe est là pour vous aider.</p>
        <div className="mt-10 space-y-7">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ma1-blue-soft"><Mail size={20} className="text-ma1-blue" /></span>
            <div><div className="text-sm font-bold">Email</div><a href="mailto:contact@ma1.app" className="text-sm text-ma1-blue hover:underline">contact@ma1.app</a></div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ma1-blue-soft"><LifeBuoy size={20} className="text-ma1-blue" /></span>
            <div><div className="text-sm font-bold">Support</div>
              <Link href="/support" className="text-sm text-ma1-blue hover:underline">{isLoggedIn ? 'Ouvrir mes conversations' : 'Se connecter pour contacter le support'}</Link></div>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5 border-slate-100 bg-[#f7faff] p-8 lg:border-l lg:p-14">
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Nom</span><input value={f.name} onChange={set('name')} className="web-input" required autoComplete="name" /></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Email</span><input type="email" value={f.email} onChange={set('email')} className="web-input" required autoComplete="email" /></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Sujet</span>
          <select value={f.subject} onChange={set('subject')} className="web-input" required><option value="">Choisir un sujet</option>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Message</span><textarea value={f.message} onChange={set('message')} rows={6} placeholder="Votre message…" className="web-input resize-none" required /></label>
        <button type="submit" className="web-btn-primary w-full !py-3.5">Envoyer le message</button>
        <p className="text-center text-[11px] text-slate-400">Le message s&apos;ouvre dans votre application mail.</p>
      </form>
    </section>
  );
}
