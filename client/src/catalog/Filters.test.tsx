import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Filters } from "./Filters";
afterEach(() => vi.unstubAllGlobals());
describe("facet browsing", () => {
  it("expands, paginates, searches remote options and retains selected options", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const params = new URL(input, "http://localhost").searchParams;
        const facet = params.get("facet");
        const offset = Number(params.get("offset"));
        const search = params.get("search");
        const items =
          facet === "roaster" && !search
            ? Array.from({ length: 20 }, (_, i) => ({
                value: String(offset + i + 1),
                label: `Roaster ${offset + i + 1}`,
                count: 3,
              }))
            : [];
        return {
          ok: true,
          json: async () => ({
            items,
            hasMore: facet === "roaster" && !search && offset === 0,
          }),
        };
      }),
    );
    const user = userEvent.setup();
    render(
      <Filters
        kind="coffees"
        params={new URLSearchParams()}
        onChange={vi.fn()}
      />,
    );
    const group = within(screen.getByRole("region", { name: "Roaster" }));
    await group.findByRole("checkbox", { name: /^Roaster 1\s*3$/ });
    expect(group.getAllByRole("checkbox")).toHaveLength(8);
    await user.click(group.getByRole("button", { name: "Show more" }));
    expect(group.getAllByRole("checkbox")).toHaveLength(20);
    await user.click(group.getByRole("button", { name: "Show more" }));
    await group.findByRole("checkbox", { name: /^Roaster 40\s*3$/ });
    await user.type(group.getByRole("textbox"), "absent");
    await waitFor(() =>
      expect(group.queryAllByRole("checkbox")).toHaveLength(0),
    );
    expect(await group.findByText("No matching options")).toBeVisible();
  });
  it("retries failed facets and searches translated country labels", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(
      <Filters
        kind="coffees"
        params={new URLSearchParams()}
        onChange={vi.fn()}
      />,
    );
    const group = within(screen.getByRole("region", { name: "Country" }));
    await group.findByRole("button", { name: "Retry options" });
    fetcher.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { value: "US", label: "US", count: 1 },
          { value: "CZ", label: "CZ", count: 1 },
        ],
        hasMore: false,
      }),
    });
    await user.click(group.getByRole("button", { name: "Retry options" }));
    await group.findByRole("checkbox", { name: /United States/ });
    await user.type(group.getByRole("textbox"), "Czech");
    expect(group.getAllByRole("checkbox")).toHaveLength(1);
    expect(group.getByRole("checkbox", { name: /Czechia/ })).toBeVisible();
  });
});
