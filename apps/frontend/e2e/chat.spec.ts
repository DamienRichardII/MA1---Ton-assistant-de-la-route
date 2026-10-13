import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } }); // shell mobile historique (le desktop a son propre jeu de tests : web.spec.ts)

test.describe("Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ma1_ob", "1");
      localStorage.setItem("ma1_pos_done", "1");
      localStorage.setItem("ma1_rgpd", "accept");
    });
  });

  test("shows welcome screen with chips", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.locator("text=Bonjour, je suis MA1")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Vitesse max sur autoroute")).toBeVisible();
  });

  test("input field accepts text", async ({ page }) => {
    await page.goto("/chat");
    const input = page.locator("textarea");
    await input.fill("Test question");
    await expect(input).toHaveValue("Test question");
  });
});
