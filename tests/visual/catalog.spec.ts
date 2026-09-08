import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const directory = "/private/tmp/coffee-db-qa";
test("capture actual catalogue at reference, desktop and mobile sizes", async ({
  page,
}) => {
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1487, 1920, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1058 });
    for (const route of ["coffee", "roasters"]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        route === "coffee" ? "130,616" : "8,451",
        { timeout: 20000 },
      );
      await expect(page.getByText("Loading options…").first()).not.toBeVisible({
        timeout: 20000,
      });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      if (route === "coffee") {
        await page.locator(".product-image").first().waitFor();
        await expect
          .poll(
            () =>
              page
                .locator(".product-image img")
                .first()
                .evaluate((img: HTMLImageElement) => img.complete)
                .catch(() => true),
            { timeout: 10000 },
          )
          .toBe(true);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: `${directory}/${route}-${width}.png` });
    }
  }
  await page.goto("/coffee");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("checkbox").first(),
  ).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: `${directory}/filters-320.png` });
  expect(errors).toEqual([]);
});
