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

  test("positioning test colours the chosen answer green or red", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ma1_ob", "1")); // onboarding déjà vu : il masquerait le test
    await page.goto("/positioning");
    // Q1 : bonne réponse = B (130 km/h)
    await page.getByRole("button", { name: /B\s*130 km\/h/ }).click();
    await expect(page.locator("button[data-state=correct]")).toHaveCount(1);
    await page.waitForTimeout(1300);
    // Q2 : on choisit A (mauvaise) → A rouge, B vert
    await page.getByRole("button", { name: /^A/ }).first().click();
    await expect(page.locator("button[data-state=wrong]")).toHaveCount(1);
    await expect(page.locator("button[data-state=correct]")).toHaveCount(1);
  });

  test("positioning test shows score and corrections at the end", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ma1_ob", "1")); // onboarding déjà vu : il masquerait le test
    await page.goto("/positioning");
    const res = page.getByTestId("positioning-results");
    for (let i = 0; i < 10; i++) {
      const prog = await page.locator("main .font-display.text-lg").textContent(); // énoncé courant
      await page.getByRole("button", { name: /^A / }).click();
      if (i < 9) await expect(page.locator("main .font-display.text-lg")).not.toHaveText(prog ?? "", { timeout: 4000 });
    }
    await expect(res).toBeVisible();
    await expect(res.getByText("Correction détaillée")).toBeVisible();
    await expect(res.getByText("Bonne réponse :").first()).toBeVisible();
    await expect(res.getByRole("button", { name: /plan de révision/ })).toBeVisible();
  });

  test("positioning test works", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("ma1_ob", "1")); // onboarding déjà vu : il masquerait le test
    await page.goto("/positioning");
    await expect(page.locator("text=Test de positionnement")).toBeVisible();
    // Answer 3 questions
    for (let i = 0; i < 3; i++) {
      await page.locator("button >> text=A").first().click();
      await page.waitForTimeout(1300);
    }
  });
});
