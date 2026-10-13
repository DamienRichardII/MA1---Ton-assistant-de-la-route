import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } }); // shell mobile historique (le desktop a son propre jeu de tests : web.spec.ts)

test.describe("Exam Blanc", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ma1_ob", "1");
      localStorage.setItem("ma1_pos_done", "1");
      localStorage.setItem("ma1_rgpd", "accept");
    });
  });

  test("shows start screen", async ({ page }) => {
    await page.goto("/exam");
    await expect(page.getByRole("heading", { name: "Examen Blanc" })).toBeVisible();
    await expect(page.locator("text=40 questions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Commencer" })).toBeVisible();
  });
});
