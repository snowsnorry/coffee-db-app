import { expect, test } from "@playwright/test";
test("catalogue navigation, search, sorting and numbered pagination", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/coffee");
  await expect(page).toHaveTitle("Coffee DB");
  await expect(page.getByRole("heading", { name: "60 coffees" })).toBeVisible();
  await expect(page.locator(".coffee-card")).toHaveCount(24);
  await page.getByRole("button", { name: "Go to last page" }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(page.locator(".coffee-card")).toHaveCount(12);
  await page.getByRole("searchbox").fill("Floral");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "30 coffees" })).toBeVisible();
  await expect(page).not.toHaveURL(/page=3/);
  await page.getByRole("combobox").selectOption("nameDesc");
  await expect(page.locator(".coffee-card h2").first()).toHaveText("Floral 59");
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("Floral");
  await page.getByRole("link", { name: "Roasters", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "25 roasters" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /View (30 )?coffees/, exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/roaster=1/);
  await expect(page.getByRole("heading", { name: "30 coffees" })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "25 roasters" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect((await page.request.get("/health")).status()).toBe(200);
  expect((await page.request.get("/api/not-found")).status()).toBe(404);
});
test("filters, empty results and retry", async ({ page, isMobile }) => {
  await page.goto("/coffee");
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = isMobile
    ? page.getByRole("dialog")
    : page.getByRole("complementary");
  await filters.getByRole("checkbox", { name: /United States/ }).check();
  if (isMobile) {
    await expect(page).not.toHaveURL(/country=US/);
    await filters.getByRole("button", { name: "Apply filters" }).click();
  }
  await expect(page).toHaveURL(/country=US/);
  if (!isMobile)
    await expect(
      filters.getByRole("checkbox", { name: /United States/ }),
    ).toBeFocused();
  await expect(page.getByRole("heading", { name: "30 coffees" })).toBeVisible();
  await page.getByRole("searchbox").fill("absent");
  await page.getByRole("searchbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "No coffees found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search and filters" }).click();
  await expect(page.getByRole("heading", { name: "60 coffees" })).toBeVisible();
  await page.route("**/api/coffees?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"catalog_unavailable"}',
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/coffees?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "60 coffees" })).toBeVisible();
});
test("mobile filter dialog applies, cancels, clears and restores focus", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile interaction");
  await page.goto("/coffee");
  const open = page.getByRole("button", { name: "Filters", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: /United States/ }).check();
  await dialog.getByRole("button", { name: "Close filters" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await expect(
    dialog.getByRole("checkbox", { name: /United States/ }),
  ).not.toBeChecked();
  await dialog.getByRole("checkbox", { name: /United States/ }).check();
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: /Filters\s*1/ }).click();
  await dialog.getByRole("button", { name: "Clear all filters" }).click();
  await dialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).not.toHaveURL(/country=/);
});
test("responsive catalogues have no horizontal overflow", async ({ page }) => {
  for (const width of [1920, 1487, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1058 });
    for (const route of ["/coffee", "/roasters"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        route === "/coffee" ? "60" : "25",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("selected filters remain usable after a facet update fails", async ({
  page,
  isMobile,
}) => {
  await page.goto("/coffee");
  if (isMobile)
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = isMobile
    ? page.getByRole("dialog")
    : page.getByRole("complementary");
  const country = filters.getByRole("region", { name: "Country", exact: true });
  const checkbox = country.getByRole("checkbox", { name: /United States/ });
  await expect(checkbox).toBeVisible();
  await page.route("**/api/coffees/facets?*", (route) => {
    if (new URL(route.request().url()).searchParams.get("facet") === "country")
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"catalog_unavailable"}',
      });
    return route.continue();
  });
  await checkbox.check();
  await expect(
    country.getByRole("button", { name: "Retry options" }),
  ).toBeVisible();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeFocused();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  if (isMobile)
    await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { name: "60 coffees" })).toBeVisible();
});

test("roaster cards show counts in mobile actions and an empty state", async ({
  page,
  isMobile,
}) => {
  await page.goto("/roasters");
  const rows = page.locator(".roaster-list tbody tr");
  await expect(rows).toHaveCount(20);
  const populated = rows.first();
  const empty = rows.nth(2);
  await expect(empty.getByText("No coffees listed")).toBeVisible();
  await expect(empty.getByRole("link", { name: /View.*coffees/ })).toHaveCount(
    0,
  );
  await expect(empty.locator(".website-link")).toBeVisible();
  if (isMobile) {
    await expect(
      populated.getByRole("link", { name: "View 30 coffees" }),
    ).toBeVisible();
    await expect(populated.locator('[data-label="Coffees"]')).toBeHidden();
    await expect(rows.nth(1).locator("th")).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await expect(populated).toHaveCSS("border-radius", "12px");
  } else {
    await expect(populated.locator('[data-label="Coffees"]')).toBeVisible();
    await expect(
      populated.getByRole("link", { name: "View coffees", exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: `/tmp/coffee-roasters-${isMobile ? "mobile" : "desktop"}.png`,
  });
});

test("mobile coffee catalogue uses an even square-edged three-column grid", async ({
  page,
}) => {
  for (const width of [320, 390, 599]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/coffee");
    const cards = page.locator(".coffee-card");
    await expect(cards).toHaveCount(24);
    const boxes = await cards.evaluateAll((items) =>
      items.slice(0, 4).map((item) => {
        const { x, y, width, right } = item.getBoundingClientRect();
        return { x, y, width, right };
      }),
    );
    expect(boxes[0]!.y).toBe(boxes[1]!.y);
    expect(boxes[1]!.y).toBe(boxes[2]!.y);
    expect(boxes[3]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(Math.abs(boxes[0]!.width - boxes[2]!.width)).toBeLessThan(1);
    const grid = await page.locator(".coffee-grid").boundingBox();
    expect(grid!.x).toBe(0);
    expect(grid!.width).toBe(width);
    await expect(cards.first().locator(".product-image")).toHaveCSS(
      "border-radius",
      "0px",
    );
    await expect(cards.first()).toHaveCSS("border-right-width", "1px");
    await expect(cards.first()).toHaveCSS("border-bottom-width", "1px");
    expect(
      await page
        .locator(".catalog-results")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({ path: "/tmp/coffee-three-column-mobile.png" });
  }
});
