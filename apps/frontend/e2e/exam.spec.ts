import { test, expect } from "@playwright/test";

test.describe("Exam Blanc", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("ma1_ob", "1");
      localStorage.setItem("ma1_pos_done", "1");
      localStorage.setItem("ma1_rgpd", "accept");
    });
  });

  test("shows start screen", async ({ page }) => {
    await page.goto("/exam");
    await expect(page.locator("text=Examen Blanc")).toBeVisible();
    await expect(page.locator("text=40 questions")).toBeVisible();
    await expect(page.locator("text=Commencer")).toBeVisible();
  });
});
