import { test, expect } from "@playwright/test";

test.describe("Landing Page SEO", () => {
  test("loads and has correct title", async ({ page }) => {
    await page.goto("/landing");
    await expect(page).toHaveTitle(/Code de la Route/i);
  });

  test("has H1 with keywords", async ({ page }) => {
    await page.goto("/landing");
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Code de la Route");
  });

  test("has pricing section", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.locator("text=10€")).toBeVisible();
    await expect(page.locator("text=79€")).toBeVisible();
    await expect(page.locator("text=200€")).toBeVisible();
  });

  test("CTA links to app", async ({ page }) => {
    await page.goto("/landing");
    const cta = page.locator("text=Commencer gratuitement").first();
    await expect(cta).toHaveAttribute("href", "/");
  });

  test("has JSON-LD schema", async ({ page }) => {
    await page.goto("/landing");
    const schema = page.locator('script[type="application/ld+json"]');
    await expect(schema).toBeAttached();
  });
});
