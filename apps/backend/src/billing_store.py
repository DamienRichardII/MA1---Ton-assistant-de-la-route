"""Persistance des abonnements : Supabase en production, mémoire pour les tests / le dev sans base."""
from __future__ import annotations
import copy
import uuid
from datetime import datetime, timezone
from typing import Optional

LIVE = ("trialing", "active", "past_due")
# Valeurs par défaut identiques à scripts/016_create_subscriptions.sql (Supabase les applique côté base).
SUB_DEFAULTS = {"trial_days": 0, "periods_paid": 0, "cancel_at_period_end": False, "attempts": 0, "currency": "EUR",
                "payment_token": None, "card_last4": None, "card_brand": None, "anchor_at": None, "trial_end": None,
                "current_period_end": None, "next_charge_at": None, "last_error": None, "canceled_at": None,
                "auto_renew": True, "reminder_sent_at": None}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryStore:
    def __init__(self):
        self.subs: dict[str, dict] = {}
        self.pays: dict[str, dict] = {}

    def insert_subscription(self, row: dict) -> dict:
        row = {**SUB_DEFAULTS, **row, "id": row.get("id") or str(uuid.uuid4()), "created_at": _now_iso(), "updated_at": _now_iso()}
        self.subs[row["id"]] = row
        return copy.deepcopy(row)

    def update_subscription(self, sub_id: str, patch: dict) -> dict:
        self.subs[sub_id].update(patch, updated_at=_now_iso())
        return copy.deepcopy(self.subs[sub_id])

    def claim(self, sub_id: str, where: dict, patch: dict) -> Optional[dict]:
        """Mise à jour atomique conditionnelle (anti double traitement). None si la condition n'est plus vraie."""
        cur = self.subs.get(sub_id)
        if not cur or any(cur.get(k) != v for k, v in where.items()):
            return None
        return self.update_subscription(sub_id, patch)

    def get_by_checkout(self, checkout_id: str) -> Optional[dict]:
        return next((copy.deepcopy(s) for s in self.subs.values() if s.get("setup_checkout_id") == checkout_id), None)

    def list_user(self, user_id: str) -> list[dict]:
        rows = [copy.deepcopy(s) for s in self.subs.values() if s["user_id"] == user_id]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)

    def pending(self) -> list[dict]:
        return [copy.deepcopy(s) for s in self.subs.values() if s["status"] == "pending"]

    def live(self) -> list[dict]:
        return [copy.deepcopy(s) for s in self.subs.values() if s["status"] in LIVE]

    def due(self, now_iso: str) -> list[dict]:
        return [copy.deepcopy(s) for s in self.subs.values()
                if s["status"] in LIVE and s.get("next_charge_at") and s["next_charge_at"] <= now_iso]

    def insert_payment(self, row: dict) -> bool:
        if row["checkout_id"] in self.pays:
            return False
        self.pays[row["checkout_id"]] = {**row, "created_at": _now_iso()}
        return True

    def delete_user(self, user_id: str) -> None:
        """Supprime les abonnements. Les paiements sont conservés (obligation comptable, RGPD art. 17-3-b)."""
        self.subs = {k: v for k, v in self.subs.items() if v["user_id"] != user_id}


class SupabaseStore:
    """Tables `subscriptions` et `payments` (scripts/016_create_subscriptions.sql). Clé service_role requise."""

    def __init__(self, sb):
        self.sb = sb

    def insert_subscription(self, row: dict) -> dict:
        return self.sb.table("subscriptions").insert(row).execute().data[0]

    def update_subscription(self, sub_id: str, patch: dict) -> dict:
        return self.sb.table("subscriptions").update({**patch, "updated_at": _now_iso()}).eq("id", sub_id).execute().data[0]

    def claim(self, sub_id: str, where: dict, patch: dict) -> Optional[dict]:
        q = self.sb.table("subscriptions").update({**patch, "updated_at": _now_iso()}).eq("id", sub_id)
        for k, v in where.items():
            q = q.eq(k, v)
        data = q.execute().data
        return data[0] if data else None

    def get_by_checkout(self, checkout_id: str) -> Optional[dict]:
        d = self.sb.table("subscriptions").select("*").eq("setup_checkout_id", checkout_id).limit(1).execute().data
        return d[0] if d else None

    def list_user(self, user_id: str) -> list[dict]:
        return self.sb.table("subscriptions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute().data or []

    def pending(self) -> list[dict]:
        return self.sb.table("subscriptions").select("*").eq("status", "pending").execute().data or []

    def live(self) -> list[dict]:
        return self.sb.table("subscriptions").select("*").in_("status", list(LIVE)).execute().data or []

    def due(self, now_iso: str) -> list[dict]:
        return (self.sb.table("subscriptions").select("*").in_("status", list(LIVE))
                .lte("next_charge_at", now_iso).execute().data or [])

    def insert_payment(self, row: dict) -> bool:
        try:
            self.sb.table("payments").insert(row).execute()
            return True
        except Exception as e:  # contrainte d'unicité checkout_id → déjà enregistré
            if "duplicate" in str(e).lower() or "23505" in str(e):
                return False
            raise

    def delete_user(self, user_id: str) -> None:
        """Supprime les abonnements (jeton de carte inclus). Les paiements sont conservés (obligation comptable)."""
        # Paiements conservés (obligation comptable) ; payments.subscription_id passe à NULL (ON DELETE SET NULL).
        self.sb.table("subscriptions").delete().eq("user_id", user_id).execute()
