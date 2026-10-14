'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, X, CreditCard } from 'lucide-react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

// Tarifs canoniques : backend/src/billing.py PLANS = CLAUDE.md §5 (10 €/mois, 79 €/an, 200 €/mois).
type PlanId = 'premium' | 'annual' | 'autoecole';
const PLAN_INFO: Record<PlanId, { name: string; price: string; per: string; label: string }> = {
  premium: { name: 'Premium', price: '10€', per: '/mois', label: '10 € / mois' },
  annual: { name: 'Premium Annuel', price: '79€', per: '/an', label: '79 € / an' },
  autoecole: { name: 'Auto-École', price: '200€', per: '/mois', label: '200 € / mois' },
};
const FREE = ['10 questions / jour', 'Accès de base', 'QCM adaptatifs', '1 examen blanc / mois', 'Analyse de panneaux'];
const PREMIUM = ['Questions illimitées', 'Tous les thèmes', 'Examens blancs illimités', 'Plan de révision personnalisé', 'Statistiques avancées', 'Chat IA'];
const SCHOOL = ['Tout Premium', 'Dashboard moniteur', 'Suivi de 30 élèves', 'Export PDF progression', 'White-label personnalisable'];
const SALES = 'mailto:contact@ma1.app?subject=Demande%20Auto-%C3%A9cole%20MA1';

interface Sub {
  plan: PlanId; plan_name: string; status: 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'failed';
  amount_cents: number; interval_months: number; trial_end: string | null; current_period_end: string | null;
  next_charge_at: string | null; cancel_at_period_end: boolean; card_last4: string | null; card_brand: string | null;
  auto_renew?: boolean;
}
const LIVE = ['trialing', 'active', 'past_due'];
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function statusLine(s: Sub): string {
  // Accès prépayé (paiement unique) : aucune échéance de prélèvement, seulement une date de fin.
  if (s.auto_renew === false) return `Accès actif jusqu'au ${fmtDate(s.current_period_end)}. Pas de renouvellement automatique : vous recevrez un email avant la fin, et pouvez prolonger à tout moment.`;
  if (s.cancel_at_period_end) return `Résiliation enregistrée : accès conservé jusqu'au ${fmtDate(s.current_period_end || s.next_charge_at)}. Aucun nouveau prélèvement.`;
  if (s.status === 'trialing') return `Essai gratuit jusqu'au ${fmtDate(s.trial_end)}, puis ${(s.amount_cents / 100).toFixed(0)} € ${s.interval_months === 12 ? 'par an' : 'par mois'}.`;
  if (s.status === 'past_due') return `Le dernier paiement a échoué. Nouvelle tentative le ${fmtDate(s.next_charge_at)}.`;
  return `Prochain prélèvement le ${fmtDate(s.next_charge_at)} (${(s.amount_cents / 100).toFixed(0)} € ${s.interval_months === 12 ? 'par an' : 'par mois'}).`;
}

// Maquette 15 — Abonnement (+ souscription SumUp, gestion et résiliation en ligne).
export function WebPricing() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoggedIn, logout } = useStore();
  const [annual, setAnnual] = useState(params.get('plan') === 'annual');
  const [cfg, setCfg] = useState<{ enabled: boolean; model?: 'one_time' | 'recurring'; plans: Record<string, { trial_days: number }> } | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [confirm, setConfirm] = useState<PlanId | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [askCancel, setAskCancel] = useState(false);

  useEffect(() => { api.paymentConfig().then(setCfg).catch(() => setCfg({ enabled: false, plans: {} })); }, []);
  const refresh = () => api.getSubscription().then(d => setSub(d.subscription)).catch(() => setSub(null));
  useEffect(() => { if (isLoggedIn && cfg?.enabled) refresh(); }, [isLoggedIn, cfg?.enabled]);

  // Retour de l'inscription/connexion avec ?plan= : ouvre directement la confirmation.
  const wanted = params.get('plan') as PlanId | null;
  const live = !!sub && LIVE.includes(sub.status);
  const oneTime = cfg?.model === 'one_time';
  const prepaid = live && sub?.auto_renew === false;       // accès prépayé en cours : on peut le prolonger
  const blocked = live && !prepaid;                        // abonnement automatique en cours : un seul à la fois
  useEffect(() => {
    if (wanted && wanted in PLAN_INFO && isLoggedIn && cfg?.enabled && !blocked) setConfirm(wanted);
  }, [wanted, isLoggedIn, cfg?.enabled, blocked]);

  const choose = (plan: PlanId) => {
    setErr('');
    if (!isLoggedIn) { router.push(`/connexion?mode=register&next=${encodeURIComponent(`/abonnement?plan=${plan}`)}`); return; }
    setAccepted(false); setConfirm(plan);
  };

  const pay = async () => {
    if (!confirm || !accepted) return;
    setBusy(true); setErr('');
    try {
      const r = await api.subscribe(confirm);
      const url = new URL(r.checkout_url);
      if (url.protocol !== 'https:') throw new Error('Lien de paiement invalide.');
      window.location.href = url.toString();
    } catch (e: any) {
      if (e?.status === 401) {   // session expirée : on repart sur la connexion, puis retour sur ce plan
        localStorage.removeItem('ma1_token'); logout();
        router.push(`/connexion?next=${encodeURIComponent(`/abonnement?plan=${confirm}`)}`);
        return;
      }
      setErr(e.message || 'Paiement indisponible.'); setBusy(false);
    }
  };

  const doCancel = async (resume = false) => {
    setBusy(true); setErr('');
    try { const r = resume ? await api.resumeSubscription() : await api.cancelSubscription(); setSub(r.subscription); setAskCancel(false); }
    catch (e: any) { setErr(e.message || 'Action impossible.'); }
    setBusy(false);
  };

  const disabled = !cfg?.enabled;
  const trialDays = cfg?.plans?.premium?.trial_days || 0;
  const paidCta = (plan: PlanId, label: string) => disabled ? 'Bientôt disponible' : blocked ? 'Abonnement actif' : prepaid ? 'Prolonger' : oneTime ? 'Acheter' : label;
  const perLabel = (plan: PlanId) => oneTime ? (plan === 'annual' ? 'pour 12 mois' : 'pour 1 mois') : PLAN_INFO[plan].per;
  const priceLabel = (plan: PlanId) => oneTime ? `${PLAN_INFO[plan].price.replace('€', ' €')} ${perLabel(plan)}` : PLAN_INFO[plan].label;

  const Card = ({ name, price, per, badge, items, cta, onClick, href, featured, off }: { name: string; price: string; per?: string; badge?: string; items: string[]; cta: string; onClick?: () => void; href?: string; featured?: boolean; off?: boolean }) => {
    const cls = `${featured ? 'web-btn-primary' : 'web-btn-outline'} ${off ? 'pointer-events-none opacity-50' : ''}`;
    return (
      <div className={`relative flex flex-col rounded-[22px] border p-8 ${featured ? 'border-ma1-blue bg-white shadow-[0_20px_60px_rgba(21,83,224,0.18)]' : 'border-slate-200 bg-white shadow-web-card'}`}>
        {badge && <span className="absolute right-5 top-5 rounded-full bg-ma1-blue px-3 py-1 text-[11px] font-bold text-white">{badge}</span>}
        <h3 className="font-display text-sm font-bold text-slate-500">{name}</h3>
        <div className="mt-3 flex items-baseline gap-1"><span className="font-display text-[40px] font-extrabold text-ma1-blue">{price}</span>{per && <span className="text-sm text-slate-400">{per}</span>}</div>
        <ul className="my-6 flex-1 space-y-3">
          {items.map(t => <li key={t} className="flex items-center gap-2.5 text-[13px] text-slate-600"><Check size={15} strokeWidth={3} className="shrink-0 text-ma1-blue" />{t}</li>)}
        </ul>
        {href ? <Link href={href} className={cls}>{cta}</Link> : <button onClick={onClick} disabled={off} className={cls}>{cta}</button>}
      </div>
    );
  };

  const cur = annual ? 'annual' : 'premium';
  return (
    <section className="web-card p-8 lg:p-14">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[34px] font-extrabold tracking-tight">Nos offres</h1>
          <p className="mt-3 text-[15px] text-slate-600">Choisissez la formule qui vous convient.</p>
        </div>
        <div role="tablist" aria-label="Période de facturation" className="flex rounded-full border border-slate-200 bg-white p-1">
          <button role="tab" aria-selected={!annual} onClick={() => setAnnual(false)} className={`rounded-full px-6 py-2 text-xs font-bold transition-colors ${!annual ? 'bg-ma1-blue text-white' : 'text-slate-500'}`}>Mensuel</button>
          <button role="tab" aria-selected={annual} onClick={() => setAnnual(true)} className={`rounded-full px-6 py-2 text-xs font-bold transition-colors ${annual ? 'bg-ma1-blue text-white' : 'text-slate-500'}`}>Annuel −34 %</button>
        </div>
      </div>

      {cfg && !cfg.enabled && <p role="status" className="mt-6 rounded-xl bg-ma1-blue-soft px-4 py-3 text-sm text-ma1-blue">Le paiement en ligne ouvre bientôt. Vous pouvez déjà commencer gratuitement.</p>}

      {sub && live && (
        <div className="mt-8 rounded-2xl border border-ma1-blue/30 bg-ma1-blue-soft/60 p-6" aria-label="Votre abonnement">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-display text-base font-bold text-ma1-ink">{sub.auto_renew === false ? 'Votre accès' : 'Votre abonnement'} : {sub.plan_name}</div>
              <p className="mt-1 text-sm text-slate-600">{statusLine(sub)}</p>
              {sub.auto_renew !== false && sub.card_last4 && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><CreditCard size={13} />{sub.card_brand || 'Carte'} •••• {sub.card_last4}</p>}
            </div>
            {sub.auto_renew === false
              ? <button onClick={() => choose(sub.plan)} disabled={busy} className="web-btn-primary !py-2.5 !text-xs">Prolonger mon accès</button>
              : sub.cancel_at_period_end
              ? <button onClick={() => doCancel(true)} disabled={busy} className="web-btn-primary !py-2.5 !text-xs">Réactiver l&apos;abonnement</button>
              : askCancel
                ? <div className="flex items-center gap-2"><span className="text-xs text-slate-600">Confirmer la résiliation ?</span>
                    <button onClick={() => doCancel()} disabled={busy} className="web-btn !bg-ma1-red !py-2 !text-xs text-white">Oui, résilier</button>
                    <button onClick={() => setAskCancel(false)} className="web-btn-outline !py-2 !text-xs">Non</button></div>
                : <button onClick={() => setAskCancel(true)} className="web-btn-outline !py-2.5 !text-xs">Résilier mon abonnement</button>}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card name="Gratuit" price="0€" items={FREE} cta="Commencer" href={isLoggedIn ? '/chat' : '/connexion?mode=register'} />
        <Card featured name={PLAN_INFO[cur].name} price={PLAN_INFO[cur].price} per={perLabel(cur)}
          badge={annual ? '−34 %' : trialDays ? `${trialDays} jours gratuits` : undefined}
          items={annual ? ['Tout Premium', '6,58€/mois au lieu de 10€', 'Économisez 41€', 'Accès garanti 12 mois', ...PREMIUM.slice(0, 2)] : PREMIUM}
          cta={paidCta(cur, 'Choisir')} onClick={() => choose(cur)} off={disabled || blocked} />
        <Card name="Auto-École" price="200€" per={perLabel('autoecole')} items={SCHOOL} cta={paidCta('autoecole', 'Choisir')} onClick={() => choose('autoecole')} off={disabled || blocked} />
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">Auto-école, plusieurs moniteurs ou besoin d&apos;un devis ? <a href={SALES} className="font-semibold text-ma1-blue hover:underline">Contactez-nous</a>.</p>
      <p className="mt-3 text-center text-xs text-slate-400">{oneTime ? 'Prix TTC. Paiement unique pour la durée choisie, sans renouvellement automatique : vous ne serez jamais prélevé sans nouvelle commande.' : 'Prix TTC. Abonnement à renouvellement automatique, résiliable à tout moment en ligne.'} MA1 est un outil pédagogique, il ne remplace pas une formation en auto-école.</p>
      {err && !confirm && <p role="alert" className="mt-4 text-center text-sm font-semibold text-ma1-red">{err}</p>}

      {confirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ma1-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={() => !busy && setConfirm(null)}>
          <div className="relative w-full max-w-md rounded-[24px] bg-white p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setConfirm(null)} disabled={busy} aria-label="Fermer" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h2 id="confirm-title" className="font-display text-xl font-extrabold">Confirmer votre abonnement</h2>
            <div className="mt-5 rounded-2xl bg-ma1-blue-soft p-5">
              <div className="flex items-baseline justify-between"><span className="font-bold text-ma1-ink">{PLAN_INFO[confirm].name}</span><span className="font-display text-xl font-extrabold text-ma1-blue">{priceLabel(confirm)}</span></div>
              {confirm === 'premium' && trialDays > 0 && <p className="mt-2 text-sm text-slate-600">{trialDays} jours gratuits (une seule fois par compte), puis 10 € par mois. Rien n&apos;est débité aujourd&apos;hui.</p>}
              {oneTime
                ? <p className="mt-2 text-xs text-slate-500">Paiement unique par carte bancaire : {confirm === 'annual' ? '12 mois' : '1 mois'} d&apos;accès, <strong>sans renouvellement automatique</strong>. Vous ne serez pas prélevé à nouveau ; un email vous prévient avant la fin.{prepaid ? ' Cette période s\'ajoute à la fin de votre accès actuel.' : ''} Paiement sécurisé par SumUp.</p>
                : <p className="mt-2 text-xs text-slate-500">Renouvellement automatique {confirm === 'annual' ? 'chaque année' : 'chaque mois'} par carte bancaire. Résiliable à tout moment en ligne, l&apos;accès reste actif jusqu&apos;à la fin de la période payée. Paiement sécurisé par SumUp.</p>}
            </div>
            <label className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-slate-600">
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ma1-blue" />
              <span>J&apos;ai lu et j&apos;accepte les <a href="/legal/cgv.html" target="_blank" rel="noopener noreferrer" className="font-semibold text-ma1-blue underline">CGV</a> et la <a href="/legal/confidentialite.html" target="_blank" rel="noopener noreferrer" className="font-semibold text-ma1-blue underline">politique de confidentialité</a>. Je demande l&apos;accès immédiat au service.</span>
            </label>
            {err && <p role="alert" className="mt-4 text-sm font-semibold text-ma1-red">{err}</p>}
            <button onClick={pay} disabled={!accepted || busy} className="web-btn-primary mt-6 w-full !py-3.5 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Redirection vers le paiement…' : 'Commander avec obligation de paiement'}</button>
          </div>
        </div>
      )}
    </section>
  );
}
