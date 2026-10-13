import { test, expect } from "@playwright/test";

// Accueil (référence PJ1) : même page de la tablette au grand écran.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ma1_ob", "1");
    localStorage.setItem("ma1_rgpd", "accept");
  });
});

test.describe("Landing — desktop", () => {
  test("title, H1 and JSON-LD", async ({ page }) => {
    await page.goto("/landing");
    await expect(page).toHaveTitle(/Code de la Route/i);
    await expect(page.locator("h1")).toContainText("Code de la Route");
    await expect(page.locator('script[type="application/ld+json"]')).toBeAttached();
  });

  test("hero, espaces, tarifs et réassurance sont visibles dans le premier écran", async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 1024 });
    await page.goto("/landing");
    for (const name of ["Espace Apprenti", "Espace Moniteur", "Espace Auto-école", "Intelligence Artificielle"]) {
      await expect(page.getByRole("heading", { name })).toBeInViewport();
    }
    await expect(page.getByText("10€", { exact: true })).toBeInViewport();
    await expect(page.getByText("79€", { exact: true })).toBeInViewport();
    await expect(page.getByText("200€", { exact: true })).toBeInViewport();
    await expect(page.getByText("Paiement 100 % sécurisé")).toBeInViewport();
  });

  test("CTA du hero", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByRole("link", { name: "Commencer gratuitement" }).first()).toHaveAttribute("href", "/connexion?mode=register");
    await expect(page.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/abonnement");
  });

  test("thème sombre", async ({ page }) => {
    await page.goto("/landing");
    await page.getByRole("button", { name: /thème sombre/i }).click();
    await expect(page.locator("[data-theme=dark]")).toBeAttached();
  });
});

test.describe("Landing — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("pas de débordement horizontal, cartes empilées, menu burger", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByRole("link", { name: "Commencer gratuitement" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Espace Apprenti" })).toBeAttached();
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.getByRole("navigation", { name: "Menu mobile" }).getByRole("link", { name: "Tarifs" })).toBeVisible();
    const overflow = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(".home-scope")!;
      return el.scrollWidth > el.clientWidth + 1;
    });
    expect(overflow).toBe(false);
  });
});
