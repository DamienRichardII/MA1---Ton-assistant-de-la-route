"""Client minimal de l'API SumUp (paiements en ligne) — TOUT ce qui parle à SumUp est ici.

⚠️ À VALIDER EN SANDBOX avant ouverture : ce client suit l'API publique SumUp telle que connue
(Checkouts v0.1, Customers + payment-instruments, `purpose=SETUP_RECURRING_PAYMENT`,
Hosted Checkout). La documentation officielle n'était pas accessible lors de l'écriture.
Les chemins, noms de champs et formes de réponse sont donc centralisés dans ce fichier : un
écart constaté en sandbox se corrige ici, sans toucher à la logique d'abonnement (billing.py).
Doc : https://developer.sumup.com/online-payments/
"""
from __future__ import annotations
from typing import Any, Optional
import httpx


class SumUpError(Exception):
    def __init__(self, status: int, body: Any, where: str = ""):
        self.status, self.body, self.where = status, body, where
        super().__init__(f"SumUp {where} -> HTTP {status}: {str(body)[:300]}")


class SumUpClient:
    def __init__(self, api_key: str, merchant_code: str, base_url: str = "https://api.sumup.com",
                 transport: Optional[httpx.AsyncBaseTransport] = None, timeout: float = 20.0):
        self.api_key, self.merchant_code = api_key, merchant_code
        self.base_url = base_url.rstrip("/")
        self._transport, self._timeout = transport, timeout

    async def _req(self, method: str, path: str, json: Any = None, ok: tuple = (200, 201, 202, 204)) -> Any:
        async with httpx.AsyncClient(base_url=self.base_url, transport=self._transport, timeout=self._timeout) as c:
            r = await c.request(method, path, json=json, headers={
                "Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"})
        try:
            data = r.json() if r.content else {}
        except ValueError:
            data = {"raw": r.text[:300]}
        if r.status_code not in ok:
            raise SumUpError(r.status_code, data, f"{method} {path}")
        return data

    # ── Clients ───────────────────────────────────────────────
    async def ensure_customer(self, customer_id: str, email: str = "", name: str = "") -> None:
        """Crée le client SumUp (customer_id = user_id MA1). Déjà existant (409) = OK."""
        body: dict = {"customer_id": customer_id}
        pd = {k: v for k, v in {"email": email, "first_name": name}.items() if v}
        if pd:
            body["personal_details"] = pd
        try:
            await self._req("POST", "/v0.1/customers", body)
        except SumUpError as e:
            if e.status != 409:
                raise

    async def list_payment_instruments(self, customer_id: str) -> list[dict]:
        data = await self._req("GET", f"/v0.1/customers/{customer_id}/payment-instruments")
        return data if isinstance(data, list) else data.get("items", data.get("payment_instruments", []))

    async def deactivate_instrument(self, customer_id: str, token: str) -> None:
        await self._req("DELETE", f"/v0.1/customers/{customer_id}/payment-instruments/{token}")

    # ── Checkouts ─────────────────────────────────────────────
    async def create_checkout(self, *, reference: str, amount_cents: int, currency: str, description: str,
                              customer_id: Optional[str] = None, purpose: Optional[str] = "CHECKOUT",
                              return_url: Optional[str] = None, redirect_url: Optional[str] = None,
                              hosted: bool = False) -> dict:
        body: dict = {
            "checkout_reference": reference,
            "amount": round(amount_cents / 100, 2),
            "currency": currency,
            "merchant_code": self.merchant_code,
            "description": description,
        }
        if customer_id:
            body["customer_id"] = customer_id
        if purpose:
            body["purpose"] = purpose
        if return_url:
            body["return_url"] = return_url          # callback serveur à chaque changement de statut
        if redirect_url:
            body["redirect_url"] = redirect_url      # retour navigateur après paiement (3DS / hosted)
        if hosted:
            body["hosted_checkout"] = {"enabled": True}
        return await self._req("POST", "/v0.1/checkouts", body)

    async def get_checkout(self, checkout_id: str) -> dict:
        return await self._req("GET", f"/v0.1/checkouts/{checkout_id}")

    async def pay_with_token(self, checkout_id: str, token: str, customer_id: str) -> dict:
        """Débite une carte enregistrée (prélèvement à l'initiative du marchand)."""
        return await self._req("PUT", f"/v0.1/checkouts/{checkout_id}",
                               {"payment_type": "card", "token": token, "customer_id": customer_id})
