import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, it, expect, vi } from "vitest";
import App from "../App";
import { CoffeeDialog } from "./CoffeeDialog";
import type { CoffeeDetail } from "../api/catalog";
const coffee: CoffeeDetail = {
  id: "1",
  name: "Floral",
  imageUrl: null,
  priceAmount: "16",
  priceCurrency: "EUR",
  sourceUrl: "https://example.com/coffee",
  roaster: {
    id: "2",
    name: "Roaster",
    countryCode: "US",
    city: null,
    stateCode: null,
  },
  description: "Peach\n<script>alert(1)</script>",
  originCountryCodes: ["ET"],
  originContinents: ["africa"],
  varietyDictionaryVersion: "coffee_variety_dictionary_v6",
  varietyUnresolved: null,
  varietyIds: ["bourbon-127296f3"],
  varieties: [
    { id: "bourbon-127296f3", label: "Bourbon", kind: "variety_label" },
  ],
  roastFor: ["filter"],
  decaf: false,
};
afterEach(() => vi.unstubAllGlobals());
it("opens the full card by keyboard, preserves location and restores focus", async () => {
  window.localStorage.clear();
  window.history.replaceState(
    null,
    "",
    "/coffee?origin=continent:africa&page=2",
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("facets")
          ? { items: [], hasMore: false }
          : url.includes("stats")
            ? { coffees: 30, roasters: 1, countries: 1, roastersWithCoffee: 1 }
            : url.includes("/coffees/1")
              ? coffee
              : {
                  items: [coffee],
                  total: 30,
                  page: 2,
                  pageSize: 24,
                  totalPages: 2,
                },
    })),
  );
  const user = userEvent.setup();
  render(<App />);
  const trigger = await screen.findByRole("button", {
    name: "View details for Floral",
  });
  expect(
    screen.queryByRole("link", { name: /View source/ }),
  ).not.toBeInTheDocument();
  trigger.focus();
  await user.keyboard(" ");
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("Bourbon")).toBeVisible();
  expect(within(dialog).getByText("Origin", { exact: true })).toBeVisible();
  expect(within(dialog).getByText("Ethiopia, Africa")).toBeVisible();
  expect(within(dialog).queryByText("Not decaf")).not.toBeInTheDocument();
  expect(
    within(dialog).queryByText("decaf", { exact: true }),
  ).not.toBeInTheDocument();
  expect(within(dialog).getByText(/<script>/)).toBeVisible();
  expect(dialog.querySelector("script")).toBeNull();
  expect(
    within(dialog).getByRole("link", { name: /View source/ }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveFocus();
  expect(window.location.search).toBe("?origin=continent:africa&page=2");
});
it("retries unavailable details and displays empty fields without inventing data", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 404 })
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        ...coffee,
        description: " ",
        originCountryCodes: null,
        originContinents: null,
        varieties: [],
        roastFor: null,
        decaf: true,
      }),
    });
  vi.stubGlobal("fetch", fetch);
  const close = vi.fn();
  const user = userEvent.setup();
  render(<CoffeeDialog coffee={coffee} onClose={close} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "no longer available",
  );
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Description unavailable")).toBeVisible();
  expect(screen.getAllByText("Not specified")).toHaveLength(3);
  expect(
    within(screen.getByRole("heading", { name: "Floral decaf" })).getByText(
      "decaf",
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Close coffee details" }),
  );
  expect(close).toHaveBeenCalledOnce();
});
it("aborts a pending details request on unmount", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    }),
  );
  const view = render(<CoffeeDialog coffee={coffee} onClose={() => {}} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading coffee details",
  );
  view.unmount();
  expect(signal?.aborted).toBe(true);
});

it("shows unresolved source names separately from missing canonical labels", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...coffee,
        varietyUnresolved: ["Local selection"],
        varieties: [{ id: "missing", label: "Name unavailable", kind: null }],
      }),
    }),
  );
  render(<CoffeeDialog coffee={coffee} onClose={() => {}} />);
  expect(await screen.findByText("Name unavailable")).toBeVisible();
  expect(screen.getByText("Unresolved variety")).toBeVisible();
  expect(screen.getByText("Local selection")).toBeVisible();
});
