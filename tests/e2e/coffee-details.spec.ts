import { test, expect } from "@playwright/test";
test("origin filters combine countries and continents, and survive reload", async ({
  page,
  isMobile,
}) => {
  await page.goto("/coffee");
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = isMobile
    ? page.getByRole("dialog")
    : page.getByRole("complementary");
  const origin = filters.getByRole("region", { name: "Origin", exact: true });
  await origin.getByRole("checkbox", { name: /Africa/ }).check();
  await origin.getByRole("checkbox", { name: /Brazil/ }).check();
  const variety = filters.getByRole("region", { name: "Variety", exact: true });
  await variety.getByRole("checkbox", { name: /Bourbon/ }).check();
  if (isMobile)
    await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/origin=continent%3Aafrica/);
  await expect(page).toHaveURL(/origin=country%3ABR/);
  await expect(page).toHaveURL(/variety=bourbon/);
  await expect(
    page.getByRole("heading", { name: "20 coffees", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "20 coffees", exact: true }),
  ).toBeVisible();
});
test("coffee dialog keeps catalogue state and supports keyboard dismissal", async ({
  page,
  isMobile,
}) => {
  await page.goto("/coffee?origin=continent:africa&page=2");
  const trigger = page
    .getByRole("button", { name: /View details for/ })
    .first();
  await expect(trigger).toBeVisible();
  await expect(page.getByRole("link", { name: /View source/ })).toHaveCount(0);
  const before = page.url();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Description", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /View source/ }),
  ).toHaveAttribute("target", "_blank");
  await expect(dialog.getByText(/Jasmine and peach/)).toBeVisible();
  await expect(page.locator(".MuiDialog-container")).toHaveCSS("opacity", "1");
  await page.screenshot({
    path: `/tmp/coffee-details-${isMobile ? "mobile" : "desktop"}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(page.url()).toBe(before);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 740 });
    await trigger.click();
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await expect(page.locator(".MuiDialog-container")).toHaveCSS(
      "opacity",
      "1",
    );
    await page.screenshot({ path: "/tmp/coffee-details-320.png" });
    await dialog.getByRole("button", { name: "Close coffee details" }).click();
  }
});
test("empty and not-decaf filters can be applied and cancelled on mobile", async ({
  page,
  isMobile,
}) => {
  await page.goto("/coffee");
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = isMobile
    ? page.getByRole("dialog")
    : page.getByRole("complementary");
  await filters
    .getByRole("region", { name: "Origin", exact: true })
    .getByRole("checkbox", { name: /Not specified/ })
    .check();
  await filters
    .getByRole("region", { name: "Decaf", exact: true })
    .getByRole("checkbox", { name: /Not decaf/ })
    .check();
  if (isMobile) {
    await filters.getByRole("button", { name: "Close filters" }).click();
    await expect(page).not.toHaveURL(/__empty__/);
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("region", { name: "Origin", exact: true })
        .getByRole("checkbox", { name: /Not specified/ }),
    ).not.toBeChecked();
  } else
    await expect(
      page.getByRole("heading", { name: "20 coffees", exact: true }),
    ).toBeVisible();
});
