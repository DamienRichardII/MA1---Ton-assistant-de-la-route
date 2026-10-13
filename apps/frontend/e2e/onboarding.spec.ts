import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } }); // shell mobile historique (le desktop a son propre jeu de tests : web.spec.ts)

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { if (!sessionStorage.getItem("e2e_init")) { localStorage.clear(); sessionStorage.setItem("e2e_init", "1"); } });
  });

  test("shows onboarding on first visit", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.locator("text=Bienvenue sur MA1")).toBeVisible({ timeout: 5000 });
  });

  test("CTA navigates to positioning test", async ({ page }) => {
    await page.goto("/landing");
    await page.getByRole("button", { name: "Commencer gratuitement" }).click();
    await expect(page).toHaveURL(/positioning/);
  });

  test("positioning test works", async ({ page }) => {
    await page.goto("/positioning");
    await expect(page.locator("text=Test de positionnement")).toBeVisible();
    // Answer 3 questions
    for (let i = 0; i < 3; i++) {
      await page.locator("button >> text=A").first().click();
      await page.waitForTimeout(300);
    }
  });
});
