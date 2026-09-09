import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
const roaster = {
  id: "1",
  name: "Alpha Roasters",
  countryCode: "US",
  stateCode: "OR",
  city: "Portland",
  domain: "alpha.test",
  websiteUrl: "https://alpha.test",
  roastingModel: "IN_HOUSE",
  coffeeCount: 30,
};
const coffee = {
  id: "1",
  name: "Floral",
  imageUrl: "https://alpha.test/coffee.jpg",
  priceAmount: "16.80",
  priceCurrency: "EUR",
  sourceUrl: "https://alpha.test/floral",
  roaster,
};
function response(url: string) {
  const parsed = new URL(url, "http://localhost");
  if (parsed.pathname.endsWith("stats"))
    return { coffees: 30, roasters: 1, countries: 1, roastersWithCoffee: 1 };
  if (parsed.pathname.endsWith("facets")) {
    const facet = parsed.searchParams.get("facet");
    const values: Record<
      string,
      { value: string; label: string; count: number }[]
    > = {
      country: [{ value: "US", label: "US", count: 30 }],
      roaster: [{ value: "1", label: "Alpha Roasters", count: 30 }],
      state: [{ value: "OR", label: "OR", count: 30 }],
      city: [
        {
          value: '["US","OR","Portland"]',
          label: "Portland, OR, US",
          count: 30,
        },
      ],
      model: [{ value: "IN_HOUSE", label: "IN_HOUSE", count: 1 }],
      hasCoffee: [{ value: "yes", label: "yes", count: 1 }],
    };
    return { items: values[facet ?? ""] ?? [], hasMore: false };
  }
  const empty = parsed.searchParams.get("q") === "absent";
  return {
    items: empty ? [] : [parsed.pathname === "/api/coffees" ? coffee : roaster],
    total: empty ? 0 : 30,
    page: Number(parsed.searchParams.get("page") ?? 1),
    pageSize: 24,
    totalPages: empty ? 0 : 2,
  };
}
beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/coffee");
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => response(url),
    })),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("catalogue UI", () => {
  it("loads database cards, source links, failed images and numbered pages", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Floral" }),
    ).toBeVisible();
    expect(screen.getByText("€16.80")).toBeVisible();
    expect(screen.getByRole("link", { name: /View source/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    fireEvent.error(screen.getByRole("img", { name: "Floral" }));
    expect(screen.getByText("Image unavailable")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => expect(window.location.search).toContain("page=2"));
  });
  it("searches on submit, resets page, sorts and clears empty results", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Floral" });
    const search = screen.getByRole("searchbox");
    await user.type(search, "absent");
    expect(window.location.search).toBe("");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(
      await screen.findByRole("heading", { name: "No coffees found" }),
    ).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox"), "nameDesc");
    expect(window.location.search).toContain("sort=nameDesc");
    await user.click(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );
    await screen.findByRole("heading", { name: "Floral" });
    expect(window.location.search).toBe("");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(window.location.search).toBe("?sort=nameAsc");
  });
  it("applies desktop filters and navigates between catalogues", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("checkbox", { name: /United States/ }),
    );
    expect(window.location.search).toContain("country=US");
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(window.location.search).toBe("");
    await user.click(screen.getByRole("link", { name: "Roasters" }));
    expect(await screen.findByRole("table")).toBeVisible();
    expect(
      within(screen.getByRole("table")).getByText("In-house"),
    ).toBeVisible();
    await user.click(screen.getByRole("link", { name: "View 30 coffees" }));
    await screen.findByRole("heading", { name: "Floral" });
    expect(window.location.search).toBe("?roaster=1");
    await user.click(screen.getByRole("link", { name: "Coffee DB" }));
    expect(window.location.search).toBe("?roaster=1");
    await user.click(screen.getByRole("link", { name: "Coffee" }));
  });
  it("restores separate catalogue parameters across navigation and reloads", async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.type(await screen.findByRole("searchbox"), "floral");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(
      await screen.findByRole("checkbox", { name: /United States/ }),
    );
    await user.selectOptions(screen.getByRole("combobox"), "nameDesc");
    await user.click(screen.getByRole("link", { name: "Roasters" }));
    await user.type(await screen.findByRole("searchbox"), "alpha");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(
      await screen.findByRole("checkbox", { name: /With coffee/ }),
    );
    await user.selectOptions(screen.getByRole("combobox"), "coffeeCount");

    await user.click(screen.getByRole("link", { name: "Coffee" }));
    await waitFor(() =>
      expect(window.location.search).toBe("?country=US&q=floral&sort=nameDesc"),
    );
    expect(screen.getByRole("searchbox")).toHaveValue("floral");
    expect(screen.getByRole("combobox")).toHaveValue("nameDesc");
    expect(
      await screen.findByRole("checkbox", { name: /United States/ }),
    ).toBeChecked();

    await user.click(screen.getByRole("link", { name: "Roasters" }));
    await waitFor(() =>
      expect(window.location.search).toBe(
        "?hasCoffee=yes&q=alpha&sort=coffeeCount",
      ),
    );
    expect(screen.getByRole("searchbox")).toHaveValue("alpha");
    expect(screen.getByRole("combobox")).toHaveValue("coffeeCount");
    expect(
      await screen.findByRole("checkbox", { name: /With coffee/ }),
    ).toBeChecked();

    view.unmount();
    window.history.replaceState(null, "", "/coffee");
    render(<App />);
    await waitFor(() =>
      expect(window.location.search).toBe("?country=US&q=floral&sort=nameDesc"),
    );
    expect(screen.getByRole("searchbox")).toHaveValue("floral");
    expect(screen.getByRole("combobox")).toHaveValue("nameDesc");
    expect(
      await screen.findByRole("checkbox", { name: /United States/ }),
    ).toBeChecked();
  });
  it("keeps the website but offers no coffee navigation for an empty roaster", async () => {
    window.history.replaceState(null, "", "/roasters");
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      const data = response(url);
      return {
        ok: true,
        json: async () =>
          url.startsWith("/api/roasters?")
            ? { ...data, items: [{ ...roaster, coffeeCount: 0 }] }
            : data,
      } as Response;
    });
    render(<App />);
    expect(await screen.findByText("No coffees listed")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /View.*coffees/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /alpha.test/ })).toHaveAttribute(
      "href",
      "https://alpha.test/",
    );
  });
  it("keeps mobile drafts until Apply and discards them on close", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Floral" });
    await user.click(screen.getByRole("button", { name: "Filters" }));
    let dialog = within(screen.getByRole("dialog"));
    await user.click(
      await dialog.findByRole("checkbox", { name: /United States/ }),
    );
    expect(window.location.search).toBe("");
    await user.click(dialog.getByRole("button", { name: "Close filters" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    dialog = within(screen.getByRole("dialog"));
    expect(
      await dialog.findByRole("checkbox", { name: /United States/ }),
    ).not.toBeChecked();
    await user.click(dialog.getByRole("checkbox", { name: /United States/ }));
    await user.click(dialog.getByRole("button", { name: "Apply filters" }));
    expect(window.location.search).toBe("?country=US");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /Filters\s*1/ }));
    dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Clear all filters" }));
    await user.click(dialog.getByRole("button", { name: "Apply filters" }));
    expect(window.location.search).toBe("");
  });
  it("shows an accessible outage and retries", async () => {
    vi.mocked(fetch).mockImplementation(
      async (input) =>
        ({
          ok: !String(input).startsWith("/api/coffees?"),
          status: 503,
          json: async () => response(String(input)),
        }) as Response,
    );
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t load",
    );
    vi.mocked(fetch).mockImplementation(
      async (input) =>
        ({ ok: true, json: async () => response(String(input)) }) as Response,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Floral" }),
    ).toBeVisible();
  });
});
