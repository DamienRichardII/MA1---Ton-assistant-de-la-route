import { test, expect, type Page } from "@playwright/test";

// Parcours d'abonnement SumUp — backend simulé (aucun paiement réel).
const API = "http://localhost:8000";
const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });

async function mockApi(page: Page, opts: { enabled: boolean; sub?: unknown; me401?: boolean; subscribe401?: boolean; model?: "one_time" | "recurring" }) {
  await page.route(`${API}/**`, async (route) => {
    const u = new URL(route.request().url());
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    if (u.pathname === "/auth/me") return route.fulfill(opts.me401 ? json({ detail: "Token invalide" }, 401) : json({ user_id: "u_1", email: "a@b.fr", name: "Ana", plan: "free" }));
    if (u.pathname === "/payment/subscribe" && opts.subscribe401) return route.fulfill(json({ detail: "Token invalide ou expiré" }, 401));
    if (u.pathname === "/payment/config") return route.fulfill(json({ enabled: opts.enabled, model: opts.model, plans: { premium: { trial_days: opts.model === "one_time" ? 0 : 7 } } }));
    if (u.pathname === "/payment/subscription") return route.fulfill(json({ subscription: opts.sub ?? null }));
    if (u.pathname === "/payment/subscribe")
      return route.fulfill(json({ checkout_url: "https://checkout.sumup.test/pay/co_1", plan: "annual", trial_days: 0 }));
    if (u.pathname === "/payment/cancel")
      return route.fulfill(json({ subscription: { ...(opts.sub as object), cancel_at_period_end: true } }));
    return route.fulfill(json({}));
  });
}

async function logIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("ma1_ob", "1"); localStorage.setItem("ma1_rgpd", "accept"); localStorage.setItem("ma1_token", "tok");
    localStorage.setItem("ma1-store-v8", JSON.stringify({ state: { userId: "u_1", token: "tok", userName: "Ana", plan: "free", isLoggedIn: true }, version: 0 }));
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("ma1_ob", "1"); localStorage.setItem("ma1_rgpd", "accept"); });
});

test("paiement non configuré : boutons désactivés, aucune souscription possible", async ({ page }) => {
  await mockApi(page, { enabled: false });
  await page.goto("/abonnement");
  await expect(page.getByText("Le paiement en ligne ouvre bientôt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bientôt disponible" }).first()).toBeDisabled();
});

test("visiteur non connecté : renvoyé vers l'inscription avec retour sur le plan choisi", async ({ page }) => {
  await mockApi(page, { enabled: true });
  await page.goto("/abonnement");
  await page.getByRole("button", { name: "Choisir" }).first().click();
  await expect(page).toHaveURL(/\/connexion\?mode=register&next=%2Fabonnement%3Fplan%3Dpremium/);
});

test("utilisateur connecté : confirmation obligatoire puis redirection vers le paiement SumUp", async ({ page }) => {
  await logIn(page);
  await mockApi(page, { enabled: true });
  await page.route("https://checkout.sumup.test/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<h1>SumUp checkout</h1>" }));
  await page.goto("/abonnement");
  await page.getByRole("tab", { name: /Annuel/ }).click();
  await page.getByRole("button", { name: "Choisir" }).first().click();
  const pay = page.getByRole("button", { name: "Commander avec obligation de paiement" });
  await expect(page.getByRole("dialog")).toContainText("79 € / an");
  await expect(pay).toBeDisabled();                                   // CGV non acceptées
  await page.getByRole("checkbox").check();
  await pay.click();
  await expect(page).toHaveURL("https://checkout.sumup.test/pay/co_1");
});

test("abonné : état de l'abonnement et résiliation en ligne en deux étapes", async ({ page }) => {
  await logIn(page);
  await mockApi(page, { enabled: true, sub: { plan: "annual", plan_name: "Premium Annuel", status: "active", amount_cents: 7900, interval_months: 12, trial_end: null,
    current_period_end: "2027-10-14T00:00:00Z", next_charge_at: "2027-10-14T00:00:00Z", cancel_at_period_end: false, card_last4: "4242", card_brand: "VISA" } });
  await page.goto("/abonnement");
  const panel = page.getByLabel("Votre abonnement");
  await expect(panel).toContainText("Premium Annuel");
  await expect(panel).toContainText("•••• 4242");
  await expect(page.getByRole("button", { name: "Abonnement actif" }).first()).toBeDisabled();   // pas de double abonnement
  await page.getByRole("button", { name: "Résilier mon abonnement" }).click();
  await page.getByRole("button", { name: "Oui, résilier" }).click();
  await expect(panel).toContainText("Résiliation enregistrée");
});

// Session « fantôme » : état connecté mémorisé, mais jeton absent ou refusé (ex. après un redéploiement du backend).
const STALE_STORE = { state: { userId: "u_1", token: "x", userName: "Ana", plan: "free", isLoggedIn: true }, version: 0 };

test("connecté mémorisé mais sans jeton : déconnexion propre, le choix d'un plan mène à la connexion", async ({ page }) => {
  await page.addInitScript((st) => { localStorage.setItem("ma1-store-v8", JSON.stringify(st)); localStorage.removeItem("ma1_token"); }, STALE_STORE);
  await mockApi(page, { enabled: true });
  await page.goto("/abonnement");
  await expect(page.getByRole("link", { name: "Connexion" }).first()).toBeVisible();        // plus de faux « connecté »
  await page.getByRole("button", { name: "Choisir" }).first().click();
  await expect(page).toHaveURL(/\/connexion\?mode=register&next=/);
});

test("jeton refusé (401) à la restauration de session : déconnexion", async ({ page }) => {
  await page.addInitScript((st) => { localStorage.setItem("ma1-store-v8", JSON.stringify(st)); localStorage.setItem("ma1_token", "vieux"); }, STALE_STORE);
  await mockApi(page, { enabled: true, me401: true });
  await page.goto("/abonnement");
  await expect(page.getByRole("link", { name: "Connexion" }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ma1_token"))).toBeNull();
});

test("session expirée au moment de payer : retour à la connexion avec reprise sur le plan", async ({ page }) => {
  await logIn(page);
  await mockApi(page, { enabled: true, subscribe401: true });
  await page.goto("/abonnement");
  await page.getByRole("button", { name: "Choisir" }).first().click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Commander avec obligation de paiement" }).click();
  await expect(page).toHaveURL(/\/connexion\?next=%2Fabonnement%3Fplan%3Dpremium/);
});


// ── Accès prépayé (PAYMENT_MODEL=one_time) : aucune promesse de renouvellement automatique ──
test("paiement unique : textes honnêtes (pas d'essai, pas de renouvellement automatique)", async ({ page }) => {
  await logIn(page);
  await mockApi(page, { enabled: true, model: "one_time" });
  await page.goto("/abonnement");
  await expect(page.getByText(/sans renouvellement automatique/).first()).toBeVisible();
  await expect(page.getByText("jours gratuits")).toHaveCount(0);
  await page.getByRole("button", { name: "Acheter" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("10 € pour 1 mois");
  await expect(dialog).toContainText("sans renouvellement automatique");
  await expect(dialog).not.toContainText("Résiliable");
  await expect(dialog).not.toContainText("Rien n'est débité aujourd'hui");
});

test("accès prépayé en cours : date de fin, prolongation possible, aucune résiliation proposée", async ({ page }) => {
  await logIn(page);
  await mockApi(page, { enabled: true, model: "one_time", sub: { plan: "premium", plan_name: "Premium", status: "active", amount_cents: 1000, interval_months: 1,
    trial_end: null, current_period_end: "2026-11-14T00:00:00Z", next_charge_at: "2026-11-14T00:00:00Z", cancel_at_period_end: true,
    card_last4: null, card_brand: null, auto_renew: false } });
  await page.goto("/abonnement");
  const panel = page.getByLabel("Votre abonnement");
  await expect(panel).toContainText("Votre accès : Premium");
  await expect(panel).toContainText("Pas de renouvellement automatique");
  await expect(page.getByRole("button", { name: "Résilier mon abonnement" })).toHaveCount(0);
  await panel.getByRole("button", { name: "Prolonger mon accès" }).click();
  await expect(page.getByRole("dialog")).toContainText("s'ajoute à la fin de votre accès actuel");
});
