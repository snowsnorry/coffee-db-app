import { expect, test } from "@playwright/test";

for (const enforce of [false, true]) {
  test(`CSP compatibility (${enforce ? "enforced candidate" : "report-only"})`, async ({
    page,
    isMobile,
  }) => {
    const violations: string[] = [];
    const errors: string[] = [];
    await page.exposeFunction("recordViolation", (directive: string) => {
      violations.push(directive);
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        void (
          window as unknown as {
            recordViolation: (directive: string) => Promise<void>;
          }
        ).recordViolation(event.effectiveDirective);
      });
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    // Exercise the current production candidate under enforcement only in tests.
    if (enforce) {
      await page.route("**/*", async (route) => {
        if (!route.request().isNavigationRequest()) return route.continue();
        const response = await route.fetch();
        const headers = response.headers();
        headers["content-security-policy"] =
          headers["content-security-policy-report-only"]!;
        delete headers["content-security-policy-report-only"];
        await route.fulfill({ response, headers });
      });
    }
    await page.route("https://images.example/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="brown"/></svg>',
      }),
    );
    await page.route("**/api/coffees?*", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.items[0].imageUrl = "https://images.example/coffee.svg";
      await route.fulfill({ response, json: body });
    });
    const response = await page.goto("/coffee");
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    await expect(
      page.getByRole("heading", { name: "60 coffees" }),
    ).toBeVisible();
    const image = page.locator(".coffee-card img").first();
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBe(10);
    await page.evaluate(() => document.fonts.ready);
    if (isMobile) {
      await page.getByRole("button", { name: "Filters", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close filters" }).click();
    }
    await page.getByRole("searchbox").fill("Floral");
    await page.getByRole("searchbox").press("Enter");
    await expect(
      page.getByRole("heading", { name: "30 coffees" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Roasters", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "25 roasters" }),
    ).toBeVisible();
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);

    // The same inline-script trigger reports in observation mode and is blocked
    // by the candidate policy. Browser evaluation itself is not a CSP test.
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent =
        "document.documentElement.dataset.cspProbe = 'executed'";
      document.head.append(script);
    });
    await expect.poll(() => violations).toContain("script-src-elem");
    expect(await page.locator("html").getAttribute("data-csp-probe")).toBe(
      enforce ? null : "executed",
    );
  });
}
