import { test, expect } from "@playwright/test";

// Desktop (viewport Playwright par défaut 1280×720) : accueil du site multipage (maquette 01).
test.describe("Landing — desktop", () => {
  test("loads and has correct title", async ({ page }) => {
    await page.goto("/landing");
    await expect(page).toHaveTitle(/Code de la Route/i);
  });

  test("has H1 with keywords", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("h1:visible")).toContainText("Code de la Route");
  });

  test("CTA leads to registration", async ({ page }) => {
    await page.goto("/landing");
    const cta = page.getByRole("link", { name: "Commencer gratuitement" }).last();
    await expect(cta).toHaveAttribute("href", "/connexion?mode=register");
  });

  test("has JSON-LD schema", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator('script[type="application/ld+json"]')).toBeAttached();
  });
});

// Mobile (< lg) : landing historique inchangée.
test.describe("Landing — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ma1_ob", "1"));
  });

  test("keeps the legacy landing with pricing", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("h1:visible")).toContainText("Code de la Route");
    await expect(page.locator("#pricing")).toBeAttached();
    await expect(page.locator("text=10€").first()).toBeAttached();
    await expect(page.locator("text=79€").first()).toBeAttached();
    await expect(page.locator("text=200€").first()).toBeAttached();
  });

  test("CTA links to the standalone app", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("a:visible", { hasText: "Commencer gratuitement" }).first()).toHaveAttribute("href", "/index-standalone.html");
  });
});
