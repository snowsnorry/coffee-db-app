import { describe, expect, it, vi } from "vitest";
import { createCatalogRepository, type QueryDatabase } from "./repository.js";
import { parseQuery } from "./validation.js";
import { mapCoffee, mapRoaster, safeUrl } from "./mapping.js";
const row = {
  id: "9007199254740993",
  name: "Floral",
  display_name: "Roaster",
  country_code: "US",
  state_code: null,
  city: null,
  roaster_id: "1",
  price_amount: "16.80",
  price_currency: "EUR",
  image_url: "javascript:alert(1)",
  canonical_url: "https://example.com/coffee",
};
const query = parseQuery(new URLSearchParams(), "coffees");
describe("repository", () => {
  it("counts, clamps oversized pages and maps external data", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [row] }),
    };
    const repo = createCatalogRepository(db as unknown as QueryDatabase);
    expect(await repo.coffees({ ...query, page: 999 })).toMatchObject({
      total: 1,
      page: 1,
      totalPages: 1,
      items: [
        {
          id: row.id,
          priceAmount: "16.80",
          imageUrl: null,
          roaster: { id: "1", city: null },
        },
      ],
    });
    expect(db.query.mock.calls[1]?.[1]).toEqual([24, 0]);
  });
  it("returns empty lists and roasters without products", async () => {
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    expect(
      await createCatalogRepository(db as unknown as QueryDatabase).roasters(
        query,
      ),
    ).toMatchObject({ items: [], total: 0, page: 1, totalPages: 0 });
    expect(
      mapRoaster({
        ...row,
        canonical_domain: "example.com",
        website_url: "https://example.com",
        roasting_model: "UNKNOWN",
        coffee_count: 0,
      }),
    ).toMatchObject({ coffeeCount: 0, websiteUrl: "https://example.com/" });
  });
  it("returns facets with selected zero-count options and a next batch", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      value: String(i + 1),
      label: `Roaster ${i}`,
      count: 2,
    }));
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows })
        .mockResolvedValueOnce({
          rows: [{ value: "99", label: "Selected", count: 0 }, rows[0]],
        }),
    };
    const q = { ...query, filters: { ...query.filters, roaster: ["99"] } };
    const facet = await createCatalogRepository(
      db as unknown as QueryDatabase,
    ).facet("coffees", q, "roaster", "%", 0);
    expect(facet).toMatchObject({ hasMore: true });
    expect(facet.items).toHaveLength(21);
    expect(facet.items[0]).toEqual({
      value: "99",
      label: "Selected",
      count: 0,
    });
    expect(db.query.mock.calls[0]?.[1]).toContain("%\\%%");
  });
  it("normalizes city keys, serves geographic dictionaries and statistics", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { value: '["US", "OR", "Portland"]', label: "Portland", count: 1 },
        ],
      }),
    };
    const repo = createCatalogRepository(db as unknown as QueryDatabase);
    const q = {
      ...query,
      filters: { ...query.filters, city: ['["US","OR","Portland"]'] },
    };
    expect(
      (await repo.facet("coffees", q, "city", "", 0)).items[0]?.value,
    ).toBe('["US","OR","Portland"]');
    await repo.facet("coffees", query, "country", "", 20);
    expect(db.query.mock.lastCall?.[0]).toContain("LIMIT 101");
    await repo.facet("roasters", query, "state", "", 0);
    db.query.mockResolvedValueOnce({ rows: [{ coffees: 130616 }] });
    expect(await repo.stats()).toEqual({ coffees: 130616 });
  });
  it("preserves null prices and rejects malformed or unsafe links", () => {
    expect(
      mapCoffee({
        ...row,
        price_amount: null,
        price_currency: null,
        image_url: undefined,
      }).priceAmount,
    ).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
  });
});
