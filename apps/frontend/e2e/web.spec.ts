import { test, expect } from "@playwright/test";

// Site web desktop (≥ 1024 px) — maquette v2.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ma1_ob", "1");
    localStorage.setItem("ma1_rgpd", "accept");
  });
});

const PUBLIC_PAGES: Array<[string, RegExp]> = [
  ["/moniteur", /Espace Moniteur/],
  ["/apprenti", /Espace Apprenti/],
  ["/auto-ecole", /Espace Auto-école/],
  ["/a-propos", /À propos de MA1/],
  ["/contact", /Contactez-nous/],
  ["/mentions-legales", /Mentions légales/],
  ["/abonnement", /Nos offres/],
  ["/utilisation", /Comment utiliser MA1/],
];

test.describe("Pages publiques", () => {
  for (const [path, title] of PUBLIC_PAGES) {
    test(`${path} s'affiche avec header et footer`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("abonnement : prix canoniques et bascule annuelle", async ({ page }) => {
    await page.goto("/abonnement");
    await expect(page.getByText("10€", { exact: true })).toBeVisible();
    await expect(page.getByText("200€", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: /Annuel/ }).click();
    await expect(page.getByText("79€", { exact: true })).toBeVisible();
  });

  test("connexion : bascule inscription", async ({ page }) => {
    await page.goto("/connexion?mode=register");
    await expect(page.getByPlaceholder("Votre prénom")).toBeVisible();
    await page.getByRole("button", { name: "Connexion" }).click();
    await expect(page.getByPlaceholder("Votre prénom")).toHaveCount(0);
  });
});

test.describe("Pages application", () => {
  for (const [path, title] of [["/chat", "Chat IA"], ["/qcm", "QCM"], ["/exam", "Examen Blanc"], ["/plan30", "Plan 30 jours"], ["/leaderboard", "Classement"], ["/veille", "Veille technologique"]]) {
    test(`${path} s'affiche dans la coque sombre`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Application" })).toBeVisible();
    });
  }

  test("examen blanc : écran de démarrage", async ({ page }) => {
    await page.goto("/exam");
    await expect(page.getByText("40 questions · 30 minutes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();
  });
});

test.describe("Mobile inchangé", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("pas de chrome web sous 1024 px", async ({ page }) => {
    await page.goto("/qcm");
    await expect(page.getByRole("navigation", { name: "Application" })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
  });
});
