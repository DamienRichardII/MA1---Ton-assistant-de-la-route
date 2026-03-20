import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test("shows onboarding on first visit", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Bienvenue sur MA1")).toBeVisible({ timeout: 5000 });
  });

  test("CTA navigates to positioning test", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Commencer gratuitement");
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
