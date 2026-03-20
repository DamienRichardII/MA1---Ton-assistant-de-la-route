import { test, expect } from "@playwright/test";

test.describe("QCM", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("ma1_ob", "1");
      localStorage.setItem("ma1_pos_done", "1");
      localStorage.setItem("ma1_rgpd", "accept");
    });
  });

  test("QCM page loads", async ({ page }) => {
    await page.goto("/qcm");
    await expect(page.locator("text=Adaptatif").or(page.locator("text=Génération"))).toBeVisible({ timeout: 10000 });
  });

  test("difficulty selector exists", async ({ page }) => {
    await page.goto("/qcm");
    const select = page.locator("select");
    await expect(select).toBeVisible({ timeout: 5000 });
  });
});
