import { expect, test } from "@playwright/test";

test("renders the placeholder and reconnects to the API", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  await expect(page).toHaveTitle("Coffee DB");
  await expect(page.getByRole("heading", { name: "Coffee DB" })).toBeVisible();
  await expect(page.getByText("UI and API are ready.")).toBeVisible();

  await page.getByRole("button", { name: "Check API again" }).click();
  await expect(page.getByText("UI and API are ready.")).toBeVisible();

  const response = await page.request.get("/health");
  await expect(response).toBeOK();
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "coffee-db-server",
  });
  expect(consoleErrors).toEqual([]);
});
