"""Tests des abonnements SumUp — contre un faux serveur SumUp (httpx.MockTransport). Aucun appel réseau réel."""
import os, sys, json, uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-key")
os.environ["APP_ENV"] = "test"

import httpx
import pytest
import billing as B
from billing_store import MemoryStore
from sumup_client import SumUpClient


class FakeSumUp:
    """Simule les routes SumUp utilisées. `fail_charges` force le refus des prélèvements par jeton."""
    def __init__(self):
        self.checkouts, self.customers, self.instruments = {}, set(), {}
        self.fail_charges = False
        self.calls = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        path, method = request.url.path, request.method
        body = json.loads(request.content) if request.content else {}
        self.calls.append((method, path, body))
        assert request.headers["authorization"] == "Bearer sk-test"
        if method == "POST" and path == "/v0.1/customers":
            if body["customer_id"] in self.customers:
                return httpx.Response(409, json={"message": "exists"})
            self.customers.add(body["customer_id"]); return httpx.Response(201, json=body)
        if method == "POST" and path == "/v0.1/checkouts":
            if any(c["checkout_reference"] == body["checkout_reference"] for c in self.checkouts.values()):
                return httpx.Response(409, json={"message": "duplicate reference"})
            cid = "co_" + uuid.uuid4().hex[:8]
            co = {**body, "id": cid, "status": "PENDING"}
            if body.get("hosted_checkout"):
                co["hosted_checkout_url"] = f"https://checkout.sumup.com/pay/{cid}"
            self.checkouts[cid] = co
            return httpx.Response(201, json=co)
        if path.startswith("/v0.1/checkouts/"):
            cid = path.rsplit("/", 1)[1]
            co = self.checkouts.get(cid)
            if not co: return httpx.Response(404, json={})
            if method == "GET": return httpx.Response(200, json=co)
            if method == "PUT":
                if self.fail_charges:
                    co["status"] = "FAILED"; return httpx.Response(200, json=co)
                assert body["token"] in self.instruments.get(body["customer_id"], {}), "jeton inconnu"
                co["status"] = "PAID"; return httpx.Response(200, json=co)
        if path.endswith("/payment-instruments"):
            cust = path.split("/")[3]
            return httpx.Response(200, json=list(self.instruments.get(cust, {}).values()))
        if method == "DELETE" and "/payment-instruments/" in path:
            cust, tok = path.split("/")[3], path.rsplit("/", 1)[1]
            self.instruments.get(cust, {}).pop(tok, None); return httpx.Response(204)
        return httpx.Response(404, json={"path": path})

    # helpers de scénario
    def customer_pays(self, checkout_id, user_id, token="tok_1"):
        self.checkouts[checkout_id]["status"] = "PAID"
        self.instruments.setdefault(user_id, {})[token] = {"token": token, "active": True, "type": "card",
                                                           "card": {"last_4_digits": "4242", "type": "VISA"}}


class RecordingHooks(B.Hooks):
    def __init__(self): self.plans, self.events = [], []
    async def apply_plan(self, user_id, plan): self.plans.append((user_id, plan))
    async def notify(self, kind, user_id, sub, **extra): self.events.append(kind)


@pytest.fixture
def env():
    sumup, store, hooks = FakeSumUp(), MemoryStore(), RecordingHooks()
    client = SumUpClient("sk-test", "MCODE", transport=httpx.MockTransport(sumup.handler))
    svc = B.BillingService(client, store, hooks, webhook_url="https://api.test/payment/webhook/sumup?t=s", redirect_url="https://ma1.test/abonnement/merci")
    return svc, sumup, store, hooks


async def subscribe_and_pay(svc, sumup, uid="u1", plan="annual"):
    r = await svc.start_subscription(uid, "a@b.fr", "Ana", plan)
    cid = [c for c in sumup.checkouts][-1]
    sumup.customer_pays(cid, uid)
    return r, cid, await svc.handle_checkout_event(cid)


# ── Souscription ──
@pytest.mark.asyncio
async def test_prices_match_api_pricing():
    import api
    for plan, spec in B.PLANS.items():
        assert spec["amount_cents"] == api.PRICING[plan]["price_eur"] * 100, plan


@pytest.mark.asyncio
async def test_subscribe_creates_hosted_recurring_checkout(env, monkeypatch):
    svc, sumup, store, _ = env
    monkeypatch.setenv("SUMUP_TRIAL_DAYS_PREMIUM", "0")
    r = await svc.start_subscription("u1", "a@b.fr", "Ana", "premium")
    co = next(iter(sumup.checkouts.values()))
    assert co["purpose"] == "SETUP_RECURRING_PAYMENT" and co["customer_id"] == "u1"
    assert co["amount"] == 10.0 and co["currency"] == "EUR" and co["merchant_code"] == "MCODE"
    assert co["hosted_checkout"] == {"enabled": True} and co["return_url"].startswith("https://api.test/payment/webhook")
    assert r["checkout_url"].startswith("https://checkout.sumup.com/") and r["charged_now_cents"] == 1000
    assert store.list_user("u1")[0]["status"] == "pending"


@pytest.mark.asyncio
async def test_premium_trial_is_free_setup_and_only_once(env, monkeypatch):
    svc, sumup, store, _ = env
    monkeypatch.setenv("SUMUP_TRIAL_DAYS_PREMIUM", "7")
    r = await svc.start_subscription("u1", "a@b.fr", "Ana", "premium")
    assert r["trial_days"] == 7 and r["charged_now_cents"] == 0
    assert next(iter(sumup.checkouts.values()))["amount"] == 0.0
    cid = next(iter(sumup.checkouts)); sumup.customer_pays(cid, "u1")
    assert (await svc.handle_checkout_event(cid))["status"] == "trialing"
    sub = store.list_user("u1")[0]
    await svc._finalize_cancel(sub, "test")  # abonnement terminé puis nouvelle souscription
    r2 = await svc.start_subscription("u1", "a@b.fr", "Ana", "premium")
    assert r2["trial_days"] == 0 and r2["charged_now_cents"] == 1000   # pas de 2e essai


@pytest.mark.asyncio
async def test_invalid_plan_and_double_subscription(env):
    svc, sumup, *_ = env
    with pytest.raises(B.BillingError) as e: await svc.start_subscription("u1", "a@b.fr", "A", "gold")
    assert e.value.http_status == 400
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    with pytest.raises(B.BillingError) as e: await svc.start_subscription("u1", "a@b.fr", "A", "premium")
    assert e.value.http_status == 409


# ── Webhook ──
@pytest.mark.asyncio
async def test_webhook_activates_and_is_idempotent(env):
    svc, sumup, store, hooks = env
    _, cid, res = await subscribe_and_pay(svc, sumup, "u1", "annual")
    assert res == {"result": "activated", "status": "active"}
    sub = store.list_user("u1")[0]
    assert sub["payment_token"] == "tok_1" and sub["card_last4"] == "4242" and sub["periods_paid"] == 1
    assert sub["next_charge_at"] > datetime.now(timezone.utc).isoformat()
    assert hooks.plans == [("u1", "annual")] and hooks.events == ["started"]
    assert len(store.pays) == 1 and store.pays[cid]["amount_cents"] == 7900
    again = await svc.handle_checkout_event(cid)                   # SumUp relance le callback
    assert again["result"] == "already_processed" and len(store.pays) == 1 and hooks.plans == [("u1", "annual")]


@pytest.mark.asyncio
async def test_webhook_unknown_checkout_ignored_and_pending_waits(env):
    svc, sumup, store, _ = env
    assert (await svc.handle_checkout_event("nope"))["result"] == "ignored"
    await svc.start_subscription("u1", "a@b.fr", "A", "annual")
    cid = next(iter(sumup.checkouts))
    assert (await svc.handle_checkout_event(cid))["result"] == "pending"      # pas encore payé : on n'active pas
    sub = store.list_user("u1")[0]
    assert sub["status"] == "pending"
    # l'état du checkout est conservé pour le diagnostic, sans fuite du secret du callback ni de l'URL de paiement
    assert sub["last_error"].startswith("pending_no_transactions") and "PENDING" in sub["last_error"]
    assert "https://" not in sub["last_error"] and "?t=" not in sub["last_error"]      # aucune URL (le callback contient un secret)


@pytest.mark.asyncio
async def test_webhook_rejects_tampered_amount_or_failed(env):
    svc, sumup, store, hooks = env
    await svc.start_subscription("u1", "a@b.fr", "A", "annual")
    cid = next(iter(sumup.checkouts)); sumup.customer_pays(cid, "u1")
    sumup.checkouts[cid]["amount"] = 1.0                                       # montant ≠ attendu
    assert (await svc.handle_checkout_event(cid))["result"] == "rejected"
    assert store.list_user("u1")[0]["status"] == "failed" and not hooks.plans
    await svc.start_subscription("u2", "c@d.fr", "B", "annual")
    cid2 = list(sumup.checkouts)[-1]; sumup.checkouts[cid2]["status"] = "FAILED"
    sumup.checkouts[cid2]["transactions"] = [{"status": "FAILED", "payment_type": "ECOM", "decline": "do_not_honor"}]
    assert (await svc.handle_checkout_event(cid2))["result"] == "failed" and not hooks.plans
    err = store.list_user("u2")[0]["last_error"]                                  # le motif SumUp est conservé pour le diagnostic
    assert err.startswith("checkout_failed") and "do_not_honor" in err


# ── Renouvellements ──
def make_due(store, uid, minutes=5):
    sub = store.list_user(uid)[0]
    store.update_subscription(sub["id"], {"next_charge_at": (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()})


@pytest.mark.asyncio
async def test_renewal_charges_once_and_advances(env):
    svc, sumup, store, hooks = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    make_due(store, "u1")
    assert (await svc.run_renewals())["renewed"] == 1
    sub = store.list_user("u1")[0]
    assert sub["periods_paid"] == 2 and sub["status"] == "active" and sub["attempts"] == 0
    assert datetime.fromisoformat(sub["next_charge_at"]) > datetime.now(timezone.utc) + timedelta(days=300)
    charges = [c for c in sumup.calls if c[0] == "PUT"]
    assert len(charges) == 1 and charges[0][2]["token"] == "tok_1"
    assert (await svc.run_renewals())["checked"] == 0                           # rien à refaire
    assert hooks.events[-1] == "renewed" and len(store.pays) == 2


@pytest.mark.asyncio
async def test_overlapping_runs_do_not_double_charge(env):
    svc, sumup, store, _ = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    make_due(store, "u1")
    stale = store.due(datetime.now(timezone.utc).isoformat())                   # 2 exécutions voient la même échéance
    now = datetime.now(timezone.utc)
    assert await svc._renew_one(stale[0], now) == "renewed"
    assert await svc._renew_one(stale[0], now) == "skipped"                     # verrou : la 2e ne débite pas
    assert len([c for c in sumup.calls if c[0] == "PUT"]) == 1


@pytest.mark.asyncio
async def test_failed_charges_retry_then_cancel(env):
    svc, sumup, store, hooks = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    sumup.fail_charges = True
    for expected_attempts, delay in enumerate(B.RETRY_DELAYS_DAYS, start=1):
        make_due(store, "u1")
        assert (await svc.run_renewals())["failed"] == 1
        sub = store.list_user("u1")[0]
        assert sub["status"] == "past_due" and sub["attempts"] == expected_attempts
        assert sub["next_charge_at"] > datetime.now(timezone.utc).isoformat()
    assert hooks.plans == [("u1", "annual")]                                    # accès conservé pendant les relances
    make_due(store, "u1")
    assert (await svc.run_renewals())["canceled"] == 1
    sub = store.list_user("u1")[0]
    assert sub["status"] == "canceled" and sub["payment_token"] is None
    assert hooks.plans[-1] == ("u1", "free") and hooks.events[-1] == "ended"
    assert "tok_1" not in sumup.instruments["u1"]                               # jeton désactivé chez SumUp


@pytest.mark.asyncio
async def test_recovery_after_failed_attempt(env):
    svc, sumup, store, _ = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    sumup.fail_charges = True; make_due(store, "u1"); await svc.run_renewals()
    sumup.fail_charges = False; make_due(store, "u1")
    assert (await svc.run_renewals())["renewed"] == 1
    sub = store.list_user("u1")[0]
    assert sub["status"] == "active" and sub["attempts"] == 0


@pytest.mark.asyncio
async def test_trial_first_charge_at_trial_end(env, monkeypatch):
    svc, sumup, store, _ = env
    monkeypatch.setenv("SUMUP_TRIAL_DAYS_PREMIUM", "7")
    _, _, res = await subscribe_and_pay(svc, sumup, "u1", "premium")
    sub = store.list_user("u1")[0]
    assert res["status"] == "trialing" and sub["periods_paid"] == 0 and len(store.pays) == 0
    assert 6 <= (datetime.fromisoformat(sub["next_charge_at"]) - datetime.now(timezone.utc)).days <= 7
    make_due(store, "u1")
    assert (await svc.run_renewals())["renewed"] == 1
    sub = store.list_user("u1")[0]
    assert sub["status"] == "active" and sub["periods_paid"] == 1 and store.pays
    assert [c for c in sumup.calls if c[0] == "PUT"][0][2]["token"] == "tok_1"


# ── Résiliation ──
@pytest.mark.asyncio
async def test_cancel_keeps_access_then_ends_without_charge(env):
    svc, sumup, store, hooks = env
    await subscribe_and_pay(svc, sumup, "u1", "premium")
    out = await svc.cancel("u1")
    assert out["cancel_at_period_end"] is True and "payment_token" not in out and hooks.events[-1] == "cancel_scheduled"
    assert svc.effective_plan("u1") == "premium"                                # accès jusqu'à la fin de période
    make_due(store, "u1")
    assert (await svc.run_renewals())["canceled"] == 1
    assert not [c for c in sumup.calls if c[0] == "PUT"]                        # aucun débit après résiliation
    assert svc.effective_plan("u1") == "free"


@pytest.mark.asyncio
async def test_resume_and_status_hide_token(env):
    svc, sumup, store, _ = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    await svc.cancel("u1")
    assert (await svc.resume("u1"))["cancel_at_period_end"] is False
    st = svc.get_status("u1")
    assert st["plan"] == "annual" and st["card_last4"] == "4242" and "payment_token" not in st
    with pytest.raises(B.BillingError): await svc.cancel("nobody")


def test_effective_plan_none_without_subscription(env):
    svc, *_ = env
    assert svc.effective_plan("ghost") is None                                  # ne touche pas aux plans attribués par un admin


@pytest.mark.asyncio
async def test_rgpd_deletes_subscription_and_deactivates_card_but_keeps_payments(env):
    svc, sumup, store, _ = env
    await subscribe_and_pay(svc, sumup, "u1", "annual")
    await svc.delete_user_data("u1")
    assert store.list_user("u1") == [] and sumup.instruments["u1"] == {} and len(store.pays) == 1


def test_add_months_edges():
    d = datetime(2026, 1, 31, tzinfo=timezone.utc)
    assert B.add_months(d, 1).date().isoformat() == "2026-02-28"
    assert B.add_months(d, 13).date().isoformat() == "2027-02-28"
    assert B.add_months(datetime(2028, 2, 29, tzinfo=timezone.utc), 12).date().isoformat() == "2029-02-28"
    assert B.add_months(datetime(2026, 11, 30, tzinfo=timezone.utc), 3).date().isoformat() == "2027-02-28"


# ── Routes HTTP ──
def test_http_routes(monkeypatch, env):
    from fastapi.testclient import TestClient
    import api
    svc, sumup, store, hooks = env
    c = TestClient(api.app)
    monkeypatch.setenv("SUMUP_WEBHOOK_SECRET", "s3cret")
    # désactivé par défaut : 503, rien n'est débité
    assert c.get("/payment/config").json()["enabled"] is False
    assert c.post("/payment/webhook/sumup?t=s3cret", json={"id": "x"}).status_code == 503
    monkeypatch.setattr(api, "get_billing", lambda: svc)
    monkeypatch.setattr(api, "billing_enabled", lambda: True)
    assert c.post("/payment/subscribe", json={"plan": "annual"}).status_code == 401      # auth requise
    assert c.post("/payment/webhook/sumup?t=bad", json={"id": "x"}).status_code == 401   # secret requis
    assert c.post("/payment/webhook/sumup?t=s3cret", json={}).status_code == 400
    # parcours complet via l'API
    uid = c.post("/auth/register", json={"email": "pay@test.com", "password": "pass123", "name": "Pay"}).json()
    h = {"Authorization": f"Bearer {uid['token']}"}
    r = c.post("/payment/subscribe", json={"plan": "annual"}, headers=h)
    assert r.status_code == 200 and r.json()["checkout_url"].startswith("https://checkout.sumup.com/")
    cid = next(iter(sumup.checkouts)); sumup.customer_pays(cid, uid["user_id"])
    assert c.post("/payment/webhook/sumup?t=s3cret", json={"id": cid}).json()["result"] == "activated"
    assert c.post("/payment/webhook/sumup?t=s3cret", json={"id": cid}).json()["result"] == "already_processed"
    sub = c.get("/payment/subscription", headers=h).json()["subscription"]
    assert sub["status"] == "active" and "payment_token" not in sub
    assert c.get(f"/auth/me?token={uid['token']}").json()["plan"] == "annual"
    assert c.post("/payment/subscribe", json={"plan": "premium"}, headers=h).status_code == 409
    assert c.post("/payment/cancel", headers=h).json()["subscription"]["cancel_at_period_end"] is True
    assert c.post("/cron/billing").status_code in (401, 403)                              # cron protégé
    monkeypatch.setenv("CRON_SECRET", "cr0n")
    out = c.post("/cron/billing", headers={"X-Cron-Secret": "cr0n"}).json()
    assert out["results"]["checked"] == 0 and "reconcile" in out


# ── Comptes : survie à un redéploiement (cache mémoire vidé) ──
class FakeSupabaseUsers:
    """Simule juste table('users').select().eq().limit()/.range().execute().data."""
    def __init__(self, rows): self.rows, self._f, self._rng = rows, None, None
    def table(self, name): assert name == "users"; self._f, self._rng = None, None; return self
    def select(self, *_): return self
    def eq(self, col, val): self._f = (col, val); return self
    def limit(self, n): return self
    def range(self, a, b): self._rng = (a, b); return self
    def execute(self):
        rows = [r for r in self.rows if not self._f or r.get(self._f[0]) == self._f[1]]
        if self._rng: rows = rows[self._rng[0]:self._rng[1] + 1]
        class R: pass
        r = R(); r.data = rows; return r


def test_accounts_survive_backend_restart(monkeypatch):
    from fastapi.testclient import TestClient
    import api
    c = TestClient(api.app)
    email = f"restart-{uuid.uuid4().hex[:6]}@test.com"
    reg = c.post("/auth/register", json={"email": email, "password": "pass123", "name": "Re"}).json()
    row = {"user_id": reg["user_id"], "email": email, "name": "Re", "password_hash": api._users[email]["pw_hash"],
           "plan": "premium", "birth_date": "2000-01-01", "created_at": "2026-10-01T00:00:00+00:00"}
    api._users.pop(email)                                                     # ← redéploiement : le cache est vide
    monkeypatch.setattr(api, "get_supabase", lambda: FakeSupabaseUsers([row]))
    # le jeton émis avant le redémarrage reste valide et /auth/me retrouve le compte
    me = c.get(f"/auth/me?token={reg['token']}")
    assert me.status_code == 200 and me.json()["email"] == email and me.json()["plan"] == "premium"
    # reconnexion possible avec le mot de passe, même cache vidé
    api._users.pop(email)
    assert c.post("/auth/login", json={"email": email, "password": "pass123"}).status_code == 200
    # on ne peut pas recréer un compte déjà en base
    api._users.pop(email)
    assert c.post("/auth/register", json={"email": email, "password": "x12345", "name": "Bis"}).status_code == 400
    # mauvais mot de passe toujours refusé
    api._users.pop(email)
    assert c.post("/auth/login", json={"email": email, "password": "mauvais"}).status_code == 401


def test_startup_hydration_loads_all_accounts(monkeypatch):
    import api
    rows = [{"user_id": f"u{i}", "email": f"h{i}@t.fr", "name": "", "password_hash": "x", "plan": "free"} for i in range(3)]
    rows.append({"user_id": "u9", "email": "", "password_hash": "x"})         # ligne incomplète ignorée
    for r in rows: api._users.pop(r["email"], None)
    monkeypatch.setattr(api, "get_supabase", lambda: FakeSupabaseUsers(rows))
    import asyncio; asyncio.run(api._hydrate_users_on_startup())
    assert all(f"h{i}@t.fr" in api._users for i in range(3)) and "" not in api._users


@pytest.mark.asyncio
async def test_every_plan_checkout_title_carries_the_MA1_brand(env, monkeypatch):
    """Le client doit voir « MA1 … » sur chaque paiement (page SumUp, reçu), quel que soit le plan."""
    svc, sumup, store, _ = env
    monkeypatch.setenv("SUMUP_TRIAL_DAYS_PREMIUM", "7")
    for i, plan in enumerate(B.PLANS):
        uid = f"brand{i}"
        await subscribe_and_pay(svc, sumup, uid, plan)
        make_due(store, uid)
    await svc.run_renewals()
    descriptions = [c["description"] for c in sumup.checkouts.values()]
    assert len(descriptions) == 2 * len(B.PLANS)                       # souscription + renouvellement par plan
    assert all(d.startswith("MA1 ") for d in descriptions), descriptions
    assert {"MA1 Premium — essai 7 jours", "MA1 Premium Annuel", "MA1 Auto-École"} <= set(descriptions)


# ── Réconciliation des souscriptions restées « pending » ──
def backdate(store, uid, minutes):
    sub = store.list_user(uid)[0]
    store.update_subscription(sub["id"], {"created_at": (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()})


@pytest.mark.asyncio
async def test_reconcile_records_decline_reason_and_keeps_pending(env):
    svc, sumup, store, _ = env
    await svc.start_subscription("u1", "a@b.fr", "A", "annual")
    cid = next(iter(sumup.checkouts))
    sumup.checkouts[cid]["transactions"] = [{"status": "FAILED", "payment_type": "ECOM", "reason": "card_declined"}]
    assert (await svc.reconcile_pending())["skipped"] == 1                      # trop récent : on laisse le client réessayer
    backdate(store, "u1", 10)
    r = await svc.reconcile_pending()
    sub = store.list_user("u1")[0]
    assert r["checked"] == 1 and sub["status"] == "pending"                     # pas clos : le client peut encore payer
    assert sub["last_error"].startswith("pending_with_attempts") and "card_declined" in sub["last_error"]


@pytest.mark.asyncio
async def test_reconcile_activates_paid_checkout_when_callback_was_lost(env):
    svc, sumup, store, hooks = env
    await svc.start_subscription("u1", "a@b.fr", "A", "annual")
    cid = next(iter(sumup.checkouts)); sumup.customer_pays(cid, "u1")          # payé, mais aucun callback reçu
    backdate(store, "u1", 10)
    assert (await svc.reconcile_pending())["activated"] == 1
    assert store.list_user("u1")[0]["status"] == "active" and hooks.plans == [("u1", "annual")]


@pytest.mark.asyncio
async def test_reconcile_expires_abandoned_checkouts(env):
    svc, sumup, store, hooks = env
    await svc.start_subscription("u1", "a@b.fr", "A", "annual")
    backdate(store, "u1", 60 * 49)
    assert (await svc.reconcile_pending())["expired"] == 1
    sub = store.list_user("u1")[0]
    assert sub["status"] == "failed" and sub["last_error"].startswith("expired_unpaid") and not hooks.plans


def test_secrets_tolerate_quotes_and_whitespace_from_hosting_ui(monkeypatch):
    """Railway garde parfois les guillemets/espaces collés dans une variable : le secret doit rester valide."""
    from fastapi.testclient import TestClient
    import api
    monkeypatch.setenv("CRON_SECRET", ' "cr0n-secret"\n')
    assert api._env_clean("CRON_SECRET") == "cr0n-secret"
    monkeypatch.setattr(api, "get_billing", lambda: type("S", (), {
        "reconcile_pending": staticmethod(lambda: _async({"checked": 0})),
        "run_renewals": staticmethod(lambda: _async({"checked": 0}))})())
    c = TestClient(api.app)
    assert c.post("/cron/billing", headers={"X-Cron-Secret": "cr0n-secret "}).status_code == 200
    assert c.post("/cron/billing", headers={"X-Cron-Secret": "autre"}).status_code in (401, 403)
    monkeypatch.setenv("CRON_SECRET", "")                                          # non défini : jamais accepté
    assert c.post("/cron/billing", headers={"X-Cron-Secret": ""}).status_code in (401, 403)


async def _async(v): return v


def test_cron_refusal_is_diagnosed_without_leaking_the_secret(monkeypatch, capsys):
    from fastapi.testclient import TestClient
    import api
    monkeypatch.setenv("CRON_SECRET", "s3cret-value-xyz")
    c = TestClient(api.app)
    assert c.post("/cron/billing", headers={"X-Cron-Secret": "faux"}).status_code in (401, 403)
    assert c.post("/cron/billing").status_code in (401, 403)
    out = capsys.readouterr().out
    assert "reçu (longueur 4)" in out and "ABSENT de la requête" in out and "défini (longueur 16)" in out
    assert "s3cret-value-xyz" not in out and "faux" not in out


@pytest.mark.asyncio
async def test_diagnostic_checkouts_plain_vs_recurring(env):
    svc, sumup, store, _ = env
    plain = await svc.diagnostic_checkout("plain", 100)
    co = sumup.checkouts[plain["checkout_id"]]
    assert "purpose" not in co and "customer_id" not in co and co["amount"] == 1.0   # paiement ordinaire, sans option
    assert plain["url"].startswith("https://checkout.sumup.com/") and not store.subs  # aucun abonnement créé
    cust = await svc.diagnostic_checkout("customer", 100)
    co = sumup.checkouts[cust["checkout_id"]]
    assert co["customer_id"] == "ma1-diag" and "purpose" not in co                 # identifiant client sans enregistrement de carte
    rec = await svc.diagnostic_checkout("recurring", 100)
    co = sumup.checkouts[rec["checkout_id"]]
    assert co["purpose"] == "SETUP_RECURRING_PAYMENT" and co["customer_id"] == "ma1-diag"
    big = await svc.diagnostic_checkout("plain", 999999)
    assert big["amount_cents"] == 500                                                # plafonné à 5 €
    with pytest.raises(B.BillingError): await svc.diagnostic_checkout("autre")
    st = await svc.diagnostic_status(plain["checkout_id"])
    assert st["status"] == "PENDING" and "hosted_checkout_url" not in st and "https://" not in str(st)


def test_diagnostic_routes_are_protected(monkeypatch, env):
    from fastapi.testclient import TestClient
    import api
    svc, *_ = env
    monkeypatch.setattr(api, "get_billing", lambda: svc)
    monkeypatch.setenv("CRON_SECRET", "cr0n")
    c = TestClient(api.app)
    assert c.post("/payment/diagnostic/checkout").status_code in (401, 403)
    assert c.get("/payment/diagnostic/checkout/x").status_code in (401, 403)
    r = c.post("/payment/diagnostic/checkout?variant=plain", headers={"X-Cron-Secret": "cr0n"})
    assert r.status_code == 200 and r.json()["url"].startswith("https://checkout.sumup.com/")
