"""Abonnements récurrents MA1 (SumUp, carte enregistrée) — logique métier.

Cycle de vie :  pending ──(paiement validé)──> trialing | active ──(échéance)──> active
                                                     │                 └─(échec)──> past_due ──(échecs répétés)──> canceled
                 active/trialing ──(résiliation)──> cancel_at_period_end ──(fin de période)──> canceled

Principes de sécurité :
- Le callback SumUp n'est JAMAIS cru sur parole : on relit le checkout via l'API (statut, référence,
  montant, devise) avant d'activer quoi que ce soit.
- Activation et prélèvements idempotents (claim atomique, références de checkout déterministes,
  contrainte d'unicité sur payments.checkout_id).
- Le jeton de carte ne sort jamais du backend.
Dépend de sumup_client.py (appels HTTP) et d'un store (billing_store.py).
"""
from __future__ import annotations
import calendar
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from sumup_client import SumUpClient, SumUpError
from billing_store import LIVE

log = logging.getLogger("ma1.billing")

# Source canonique des prix : CLAUDE.md §5 / PLAN_LIMITS (api.py). Vérifié par tests/test_billing.py.
PLANS: dict[str, dict] = {
    "premium":   {"name": "Premium",        "amount_cents": 1000,  "interval_months": 1,  "trial_days": 7},
    "annual":    {"name": "Premium Annuel", "amount_cents": 7900,  "interval_months": 12, "trial_days": 0},
    "autoecole": {"name": "Auto-École",     "amount_cents": 20000, "interval_months": 1,  "trial_days": 0},
}
CURRENCY = "EUR"
# Relances après un échec de prélèvement (jours après l'échec précédent). Au-delà : résiliation.
RETRY_DELAYS_DAYS = (1, 3, 5)
LEASE_MINUTES = 30  # verrou « en cours de traitement » posé avant un prélèvement


class BillingError(Exception):
    def __init__(self, code: str, message: str, http_status: int = 400):
        self.code, self.message, self.http_status = code, message, http_status
        super().__init__(message)


class Hooks:
    """Points d'intégration avec api.py (plan applicatif, emails). Par défaut : no-op."""
    async def apply_plan(self, user_id: str, plan: str) -> None: ...
    async def notify(self, kind: str, user_id: str, sub: dict, **extra: Any) -> None: ...


def trial_days_for(plan: str) -> int:
    """Durée d'essai (jours). Surchargeable : SUMUP_TRIAL_DAYS_PREMIUM=0 désactive l'essai."""
    default = PLANS[plan]["trial_days"]
    if plan == "premium":
        try:
            return max(0, int(os.getenv("SUMUP_TRIAL_DAYS_PREMIUM", default)))
        except ValueError:
            return default
    return default


def add_months(dt: datetime, months: int) -> datetime:
    y, m = divmod(dt.month - 1 + months, 12)
    y, m = dt.year + y, m + 1
    return dt.replace(year=y, month=m, day=min(dt.day, calendar.monthrange(y, m)[1]))


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _checkout_summary(co: dict) -> str:
    """Résumé court et non sensible d'un checkout non payé (statut + transactions), pour diagnostiquer un refus."""
    import json
    try:
        tx = co.get("transactions") or []
        extra = {k: co[k] for k in ("status", "failure_reason", "decline_reason", "message") if k in co}
        return json.dumps({**extra, "transactions": tx}, ensure_ascii=False, default=str)[:450]
    except Exception:
        return str(co.get("status"))


_CHECKOUT_DIAG_KEYS = ("status", "amount", "currency", "merchant_code", "purpose", "date", "valid_until",
                       "checkout_reference", "failure_reason", "decline_reason", "message", "error", "transactions")


def _checkout_state(co: dict) -> str:
    """État d'un checkout pour diagnostic. Liste blanche de champs : jamais return_url/redirect_url
    (le callback contient un secret) ni l'adresse de la page de paiement."""
    import json
    keep = {k: co[k] for k in _CHECKOUT_DIAG_KEYS if k in co}
    keep["_champs_recus"] = sorted(co.keys())
    return json.dumps(keep, ensure_ascii=False, default=str)[:480]


def _same_amount(sumup_amount: Any, cents: int) -> bool:
    try:
        return Decimal(str(sumup_amount)).quantize(Decimal("0.01")) == (Decimal(cents) / 100).quantize(Decimal("0.01"))
    except Exception:
        return False


class BillingService:
    def __init__(self, client: SumUpClient, store, hooks: Optional[Hooks] = None, *,
                 webhook_url: str, redirect_url: str):
        self.client, self.store, self.hooks = client, store, hooks or Hooks()
        self.webhook_url, self.redirect_url = webhook_url, redirect_url

    # ───────────────────────── Souscription ─────────────────────────
    async def start_subscription(self, user_id: str, email: str, name: str, plan: str) -> dict:
        if plan not in PLANS:
            raise BillingError("invalid_plan", "Plan invalide.", 400)
        history = self.store.list_user(user_id)
        if any(s["status"] in LIVE for s in history):
            raise BillingError("already_subscribed", "Vous avez déjà un abonnement actif.", 409)
        spec = PLANS[plan]
        # Essai : une seule fois par utilisateur (aucun abonnement déjà activé par le passé).
        had_one = any(s["status"] in LIVE + ("canceled",) for s in history)
        trial_days = 0 if had_one else trial_days_for(plan)
        setup_cents = 0 if trial_days else spec["amount_cents"]

        try:
            await self.client.ensure_customer(user_id, email, name)
            ref = f"ma1-{user_id}-{int(datetime.now(timezone.utc).timestamp())}-{uuid.uuid4().hex[:6]}"
            co = await self.client.create_checkout(
                reference=ref, amount_cents=setup_cents, currency=CURRENCY,
                description=f"MA1 {spec['name']}" + (f" — essai {trial_days} jours" if trial_days else ""),
                customer_id=user_id, purpose="SETUP_RECURRING_PAYMENT",
                return_url=self.webhook_url, redirect_url=self.redirect_url, hosted=True)
        except SumUpError as e:
            log.error("subscribe: SumUp error %s", e)
            raise BillingError("provider_error", "Le paiement est momentanément indisponible. Réessayez plus tard.", 502)

        url = co.get("hosted_checkout_url")
        if not url or not co.get("id"):
            log.error("subscribe: réponse SumUp sans hosted_checkout_url/id: %s", str(co)[:300])
            raise BillingError("provider_error", "Le paiement est momentanément indisponible.", 502)

        # Les tentatives précédentes jamais finalisées sont marquées échouées (une seule en attente à la fois).
        for s in history:
            if s["status"] == "pending":
                self.store.update_subscription(s["id"], {"status": "failed", "last_error": "superseded"})
        self.store.insert_subscription({
            "user_id": user_id, "plan": plan, "status": "pending", "amount_cents": spec["amount_cents"],
            "currency": CURRENCY, "interval_months": spec["interval_months"], "trial_days": trial_days,
            "sumup_customer_id": user_id, "setup_checkout_id": co["id"], "setup_reference": ref,
        })
        return {"checkout_url": url, "plan": plan, "trial_days": trial_days, "amount_cents": spec["amount_cents"],
                "charged_now_cents": setup_cents}

    # ───────────────────── Callback SumUp (webhook) ─────────────────────
    async def handle_checkout_event(self, checkout_id: str) -> dict:
        sub = self.store.get_by_checkout(checkout_id)
        if not sub:
            return {"result": "ignored"}          # checkout inconnu (ex. renouvellement) : 200 pour stopper les relances
        if sub["status"] != "pending":
            return {"result": "already_processed", "status": sub["status"]}

        try:
            co = await self.client.get_checkout(checkout_id)
        except SumUpError as e:
            log.error("webhook: get_checkout %s: %s", checkout_id, e)
            raise BillingError("provider_error", "Vérification impossible.", 502)   # SumUp réessaiera

        expected = 0 if sub["trial_days"] else sub["amount_cents"]
        if (co.get("checkout_reference") != sub["setup_reference"] or co.get("currency") != sub["currency"]
                or not _same_amount(co.get("amount"), expected)):
            log.error("webhook: incohérence checkout %s (ref/montant/devise) — rejeté", checkout_id)
            self.store.claim(sub["id"], {"status": "pending"}, {"status": "failed", "last_error": "checkout_mismatch"})
            return {"result": "rejected"}

        status = (co.get("status") or "").upper()
        if status == "PENDING":
            # SumUp laisse le checkout « PENDING » après un refus de carte (le client peut réessayer) :
            # on conserve le motif des tentatives (transactions) pour le diagnostic, sans clore l'abonnement.
            if co.get("transactions"):
                detail = _checkout_summary(co)
                log.warning("checkout %s en attente avec tentatives : %s", checkout_id, detail)
                self.store.update_subscription(sub["id"], {"last_error": f"pending_with_attempts: {detail}"[:500]})
            else:
                detail = _checkout_state(co)
                log.warning("checkout %s en attente, aucune transaction visible : %s", checkout_id, detail)
                self.store.update_subscription(sub["id"], {"last_error": f"pending_no_transactions: {detail}"[:500]})
            return {"result": "pending"}
        if status != "PAID":
            detail = _checkout_summary(co)
            log.warning("webhook: checkout %s non payé (%s) : %s", checkout_id, status or "?", detail)
            self.store.claim(sub["id"], {"status": "pending"},
                             {"status": "failed", "last_error": f"checkout_{status.lower() or 'unknown'}: {detail}"[:500]})
            return {"result": "failed"}

        # Carte enregistrée par le paiement de configuration.
        try:
            instruments = await self.client.list_payment_instruments(sub["sumup_customer_id"])
        except SumUpError as e:
            log.error("webhook: payment-instruments %s: %s", sub["sumup_customer_id"], e)
            raise BillingError("provider_error", "Vérification impossible.", 502)
        usable = [i for i in instruments if i.get("active", True) and i.get("token")]
        if not usable:
            self.store.claim(sub["id"], {"status": "pending"}, {"status": "failed", "last_error": "no_payment_instrument"})
            log.error("webhook: aucun moyen de paiement enregistré pour %s", sub["user_id"])
            return {"result": "failed"}
        inst = usable[-1]
        card = inst.get("card") or {}

        now = datetime.now(timezone.utc)
        if sub["trial_days"]:
            anchor, paid, status_new = now + timedelta(days=sub["trial_days"]), 0, "trialing"
        else:
            anchor, paid, status_new = now, 1, "active"
        next_charge = add_months(anchor, sub["interval_months"] * paid)
        patch = {
            "status": status_new, "payment_token": inst["token"],
            "card_last4": card.get("last_4_digits"), "card_brand": card.get("type"),
            "anchor_at": _iso(anchor), "periods_paid": paid,
            "trial_end": _iso(anchor) if sub["trial_days"] else None,
            "current_period_end": _iso(next_charge if not sub["trial_days"] else anchor),
            "next_charge_at": _iso(next_charge), "attempts": 0, "last_error": None,
        }
        claimed = self.store.claim(sub["id"], {"status": "pending"}, patch)
        if not claimed:
            return {"result": "already_processed"}   # un autre traitement a gagné la course
        if expected > 0:
            self.store.insert_payment({
                "subscription_id": sub["id"], "user_id": sub["user_id"], "checkout_id": checkout_id,
                "checkout_reference": sub["setup_reference"], "kind": "setup", "amount_cents": expected,
                "currency": sub["currency"], "status": "paid"})
        await self.hooks.apply_plan(sub["user_id"], sub["plan"])
        await self.hooks.notify("started", sub["user_id"], claimed)
        return {"result": "activated", "status": status_new}

    async def reconcile_pending(self, now: Optional[datetime] = None, min_age_minutes: int = 3,
                                max_age_hours: int = 48) -> dict:
        """Filet de sécurité : relit chez SumUp les souscriptions restées « pending » (callback perdu ou refus de
        carte). Active celles qui sont payées, consigne le motif des refus, abandonne celles de plus de 48 h."""
        now = now or datetime.now(timezone.utc)
        stats = {"checked": 0, "activated": 0, "declined": 0, "expired": 0, "skipped": 0}
        for sub in self.store.pending():
            created = _dt(sub.get("created_at"))
            if created is None:
                stats["skipped"] += 1; continue
            age = now - created
            if age < timedelta(minutes=min_age_minutes):
                stats["skipped"] += 1; continue
            if age > timedelta(hours=max_age_hours):
                self.store.claim(sub["id"], {"status": "pending"}, {"status": "failed", "last_error": f"expired_unpaid | {sub.get('last_error') or ''}"[:500]})
                stats["expired"] += 1; continue
            stats["checked"] += 1
            try:
                res = await self.handle_checkout_event(sub["setup_checkout_id"])
            except BillingError:
                stats["skipped"] += 1; continue
            if res.get("result") == "activated": stats["activated"] += 1
            elif res.get("result") in ("failed", "rejected"): stats["declined"] += 1
        return stats

    # ───────────────────────── Diagnostic (protégé) ─────────────────────────
    async def diagnostic_checkout(self, variant: str, amount_cents: int = 100) -> dict:
        """Crée un petit paiement de test sur le compte réel (1 à 5 €, sans abonnement associé, sans callback) pour
        comparer un paiement ordinaire ('plain'), avec identifiant client seul ('customer') et avec enregistrement de carte ('recurring')."""
        if variant not in ("plain", "customer", "recurring"):
            raise BillingError("invalid_variant", "variant doit valoir 'plain', 'customer' ou 'recurring'.", 400)
        cents = max(100, min(int(amount_cents), 500))
        ref = f"ma1-diag-{variant}-{int(datetime.now(timezone.utc).timestamp())}-{uuid.uuid4().hex[:6]}"
        try:
            if variant in ("customer", "recurring"):
                await self.client.ensure_customer("ma1-diag", "", "diagnostic")
            co = await self.client.create_checkout(
                reference=ref, amount_cents=cents, currency=CURRENCY, description=f"MA1 test diagnostic ({variant})",
                customer_id="ma1-diag" if variant in ("customer", "recurring") else None,
                purpose="SETUP_RECURRING_PAYMENT" if variant == "recurring" else None, hosted=True)
        except SumUpError as e:
            raise BillingError("provider_error", f"SumUp a refusé la création : HTTP {e.status} {str(e.body)[:300]}", 502)
        return {"variant": variant, "checkout_id": co.get("id"), "url": co.get("hosted_checkout_url"), "amount_cents": cents}

    async def diagnostic_status(self, checkout_id: str) -> dict:
        import json
        try:
            co = await self.client.get_checkout(checkout_id)
        except SumUpError as e:
            raise BillingError("provider_error", f"SumUp : HTTP {e.status} {str(e.body)[:300]}", 502)
        return json.loads(_checkout_state(co))

    # ───────────────────────── Renouvellements ─────────────────────────
    async def run_renewals(self, now: Optional[datetime] = None) -> dict:
        now = now or datetime.now(timezone.utc)
        stats = {"checked": 0, "renewed": 0, "failed": 0, "canceled": 0, "skipped": 0}
        for sub in self.store.due(_iso(now)):
            stats["checked"] += 1
            try:
                r = await self._renew_one(sub, now)
            except Exception:
                log.exception("renewals: erreur inattendue sur %s", sub.get("id"))
                r = "skipped"
            stats[r] += 1
        return stats

    async def _finalize_cancel(self, sub: dict, reason: str) -> None:
        token = sub.get("payment_token")
        self.store.update_subscription(sub["id"], {
            "status": "canceled", "canceled_at": _iso(datetime.now(timezone.utc)), "payment_token": None,
            "next_charge_at": None, "cancel_at_period_end": False, "last_error": reason})
        if token:
            try:
                await self.client.deactivate_instrument(sub["sumup_customer_id"], token)
            except SumUpError as e:
                log.warning("cancel: désactivation du jeton impossible (%s)", e)
        await self.hooks.apply_plan(sub["user_id"], "free")
        await self.hooks.notify("ended", sub["user_id"], sub, reason=reason)

    async def _renew_one(self, sub: dict, now: datetime) -> str:
        if sub.get("cancel_at_period_end"):
            await self._finalize_cancel(sub, "canceled_by_user")
            return "canceled"
        if not sub.get("payment_token"):
            await self._finalize_cancel(sub, "no_payment_token")
            return "canceled"

        # Verrou : repousse l'échéance de LEASE_MINUTES ; si deux exécutions se chevauchent, une seule passe.
        lease = _iso(now + timedelta(minutes=LEASE_MINUTES))
        if not self.store.claim(sub["id"], {"next_charge_at": sub["next_charge_at"], "status": sub["status"]}, {"next_charge_at": lease}):
            return "skipped"

        ref = f"ma1-ren-{sub['id']}-{sub['periods_paid']}-{sub['attempts']}"
        ok, err, checkout_id = False, "", None
        try:
            co = await self.client.create_checkout(
                reference=ref, amount_cents=sub["amount_cents"], currency=sub["currency"],
                description=f"MA1 {PLANS[sub['plan']]['name']} — renouvellement", customer_id=sub["sumup_customer_id"])
            checkout_id = co["id"]
            await self.client.pay_with_token(checkout_id, sub["payment_token"], sub["sumup_customer_id"])
            # On ne se fie pas à la réponse du PUT : relecture du statut + montant.
            final = await self.client.get_checkout(checkout_id)
            ok = (str(final.get("status", "")).upper() == "PAID" and final.get("checkout_reference") == ref
                  and _same_amount(final.get("amount"), sub["amount_cents"]))
            if not ok:
                err = f"charge_{str(final.get('status', 'unknown')).lower()}"
        except SumUpError as e:
            if e.status == 409 and checkout_id is None:
                # Référence déjà utilisée : prélèvement peut-être déjà tenté (crash précédent). On ne re-débite PAS.
                log.error("renewals: référence %s déjà existante — revue manuelle requise", ref)
                self.store.update_subscription(sub["id"], {"last_error": "duplicate_reference_manual_review"})
                return "skipped"
            err = f"provider_{e.status}"
            log.warning("renewals: échec prélèvement %s: %s", sub["id"], e)

        if ok:
            anchor = _dt(sub["anchor_at"]) or now
            paid = sub["periods_paid"] + 1
            nxt = add_months(anchor, sub["interval_months"] * paid)
            if nxt <= now:  # cron resté arrêté longtemps : on ne facture pas les périodes manquées en rafale
                anchor, paid = now, 1
                nxt = add_months(now, sub["interval_months"])
            self.store.insert_payment({
                "subscription_id": sub["id"], "user_id": sub["user_id"], "checkout_id": checkout_id,
                "checkout_reference": ref, "kind": "renewal", "amount_cents": sub["amount_cents"],
                "currency": sub["currency"], "status": "paid"})
            upd = self.store.update_subscription(sub["id"], {
                "status": "active", "anchor_at": _iso(anchor), "periods_paid": paid, "attempts": 0,
                "trial_end": sub.get("trial_end"), "current_period_end": _iso(nxt), "next_charge_at": _iso(nxt),
                "last_error": None})
            await self.hooks.apply_plan(sub["user_id"], sub["plan"])
            await self.hooks.notify("renewed", sub["user_id"], upd)
            return "renewed"

        attempts = sub["attempts"] + 1
        if attempts > len(RETRY_DELAYS_DAYS):
            await self._finalize_cancel({**sub, "attempts": attempts}, "payment_failed")
            return "canceled"
        retry_at = now + timedelta(days=RETRY_DELAYS_DAYS[attempts - 1])
        upd = self.store.update_subscription(sub["id"], {
            "status": "past_due", "attempts": attempts, "next_charge_at": _iso(retry_at), "last_error": err})
        await self.hooks.notify("payment_failed", sub["user_id"], upd, retry_at=retry_at)
        return "failed"

    # ───────────────────────── Résiliation / lecture ─────────────────────────
    def _live(self, user_id: str) -> Optional[dict]:
        return next((s for s in self.store.list_user(user_id) if s["status"] in LIVE), None)

    async def cancel(self, user_id: str) -> dict:
        sub = self._live(user_id)
        if not sub:
            raise BillingError("no_subscription", "Aucun abonnement actif.", 404)
        if not sub["cancel_at_period_end"]:
            sub = self.store.update_subscription(sub["id"], {"cancel_at_period_end": True})
            await self.hooks.notify("cancel_scheduled", user_id, sub)
        return self.public(sub)

    async def resume(self, user_id: str) -> dict:
        sub = self._live(user_id)
        if not sub:
            raise BillingError("no_subscription", "Aucun abonnement actif.", 404)
        if sub["cancel_at_period_end"]:
            sub = self.store.update_subscription(sub["id"], {"cancel_at_period_end": False})
        return self.public(sub)

    def get_status(self, user_id: str) -> Optional[dict]:
        rows = self.store.list_user(user_id)
        sub = next((s for s in rows if s["status"] in LIVE), None) or next(iter(rows), None)
        return self.public(sub) if sub else None

    def effective_plan(self, user_id: str) -> Optional[str]:
        """Plan applicatif déduit des abonnements. None = aucune info (ne pas toucher au plan, ex. attribution admin)."""
        rows = self.store.list_user(user_id)
        if not rows or all(s["status"] in ("pending", "failed") for s in rows):
            return None
        live = next((s for s in rows if s["status"] in LIVE), None)
        return live["plan"] if live else "free"

    async def delete_user_data(self, user_id: str) -> None:
        """RGPD : jeton de carte désactivé chez SumUp, abonnements supprimés (journal des paiements conservé : obligation comptable)."""
        for s in self.store.list_user(user_id):
            if s.get("payment_token"):
                try:
                    await self.client.deactivate_instrument(s["sumup_customer_id"], s["payment_token"])
                except SumUpError as e:
                    log.warning("rgpd: désactivation du jeton impossible (%s)", e)
        self.store.delete_user(user_id)

    @staticmethod
    def public(sub: dict) -> dict:
        """Vue exposée au front : jamais le jeton de carte."""
        keys = ("plan", "status", "amount_cents", "currency", "interval_months", "trial_days", "trial_end",
                "current_period_end", "next_charge_at", "cancel_at_period_end", "card_last4", "card_brand")
        out = {k: sub.get(k) for k in keys}
        out["plan_name"] = PLANS.get(sub["plan"], {}).get("name", sub["plan"])
        return out
