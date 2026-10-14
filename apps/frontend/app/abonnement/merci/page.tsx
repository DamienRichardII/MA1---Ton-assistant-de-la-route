'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { PageShell } from '@/components/web/ui';

// Retour du paiement SumUp. Le plan n'est activé que par le serveur (callback vérifié) :
// cette page interroge l'état réel de l'abonnement, elle ne "croit" pas l'URL de retour.
export default function MerciPage() {
  const { isLoggedIn } = useStore();
  const [state, setState] = useState<'wait' | 'ok' | 'late' | 'error'>('wait');

  useEffect(() => {
    let stop = false, tries = 0;
    const poll = async () => {
      if (stop) return;
      try {
        const d = await api.getSubscription();
        const st = d.subscription?.status;
        if (st === 'active' || st === 'trialing') { setState('ok'); return; }
        if (st === 'failed') { setState('error'); return; }
      } catch { /* session pas encore restaurée ou réseau : on réessaie */ }
      if (++tries >= 15) { setState('late'); return; }
      setTimeout(poll, 2000);
    };
    const t = setTimeout(poll, 600);
    return () => { stop = true; clearTimeout(t); };
  }, [isLoggedIn]);

  return (
    <PageShell>
      <section className="web-card mx-auto max-w-xl p-10 text-center" aria-live="polite">
        {state === 'wait' && <><Loader2 size={44} className="mx-auto animate-spin text-ma1-blue" /><h1 className="mt-5 font-display text-2xl font-extrabold">Validation du paiement…</h1><p className="mt-2 text-sm text-slate-600">Quelques secondes, ne fermez pas cette page.</p></>}
        {state === 'ok' && <><CheckCircle2 size={48} className="mx-auto text-ma1-green" /><h1 className="mt-5 font-display text-2xl font-extrabold">Abonnement activé</h1><p className="mt-2 text-sm text-slate-600">Merci ! Un email de confirmation vous a été envoyé. Vous pouvez gérer ou résilier votre abonnement à tout moment.</p>
          <div className="mt-8 flex justify-center gap-3"><Link href="/chat" className="web-btn-primary">Commencer à réviser</Link><Link href="/abonnement" className="web-btn-outline">Mon abonnement</Link></div></>}
        {state === 'late' && <><Loader2 size={44} className="mx-auto text-ma1-blue" /><h1 className="mt-5 font-display text-2xl font-extrabold">Paiement en cours de validation</h1><p className="mt-2 text-sm text-slate-600">La confirmation prend plus de temps que prévu. Votre accès sera activé automatiquement et vous recevrez un email. Vérifiez votre abonnement dans quelques minutes.</p>
          <div className="mt-8 flex justify-center gap-3"><Link href="/abonnement" className="web-btn-primary">Voir mon abonnement</Link><Link href="/contact" className="web-btn-outline">Contacter le support</Link></div></>}
        {state === 'error' && <><AlertCircle size={48} className="mx-auto text-ma1-red" /><h1 className="mt-5 font-display text-2xl font-extrabold">Paiement non abouti</h1><p className="mt-2 text-sm text-slate-600">Le paiement n&apos;a pas pu être validé. Aucun montant n&apos;a été débité. Vous pouvez réessayer.</p>
          <div className="mt-8 flex justify-center"><Link href="/abonnement" className="web-btn-primary">Réessayer</Link></div></>}
      </section>
    </PageShell>
  );
}
