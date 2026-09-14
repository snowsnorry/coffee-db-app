import { describe, it, expect, vi } from "vitest";
import {
  attributeLabel,
  attributePredicate,
  attributeValuesSql,
} from "./attributes.js";
import { attributeFacet } from "./attributeFacet.js";
import { parseQuery } from "./validation.js";
import { mapCoffeeDetail } from "./mapping.js";
import { createCatalogRepository, type QueryDatabase } from "./repository.js";
import { originCountries } from "./originCountries.js";
import { varietyNames } from "./varieties.js";
const query = (s = "") => parseQuery(new URLSearchParams(s), "coffees");
describe("coffee attributes", () => {
  it("validates repeated filters, empty values and catalogue boundaries", () => {
    const q = query(
      "origin=continent:africa&origin=country:BR&origin=__empty__&variety=bourbon-127296f3&roastFor=omni&decaf=no",
    );
    expect(q.filters.origin).toHaveLength(3);
    for (const raw of [
      "origin=continent:moon",
      "variety=bad id",
      "roastFor=dark",
      "decaf=__empty__",
    ])
      expect(() => query(raw)).toThrow();
    expect(() =>
      parseQuery(new URLSearchParams("origin=country:BR"), "roasters"),
    ).toThrow();
  });
  it("expands geography without claiming a country for broad Americas", () => {
    const binds: unknown[] = [];
    const bind = (v: unknown) => {
      binds.push(v);
      return `$${binds.length}`;
    };
    expect(
      attributePredicate(
        "origin",
        ["country:BR", "continent:africa", "__empty__"],
        bind,
      ),
    ).toContain(" OR ");
    expect(binds[0]).toEqual(expect.arrayContaining(["BR", "ET"]));
    binds.length = 0;
    attributePredicate("origin", ["continent:north_america"], bind);
    expect(binds[1]).not.toContain("americas");
    expect(binds[0]).toEqual(expect.arrayContaining(["MX", "PA", "JM"]));
    binds.length = 0;
    attributePredicate("origin", ["continent:americas"], bind);
    expect(binds[1]).toEqual(
      expect.arrayContaining(["americas", "north_america", "south_america"]),
    );
    expect(originCountries.africa).toContain("ET");
    expect(originCountries.south_america).toContain("BR");
  });
  it("keeps null/false together and handles empty arrays", () => {
    const bind = () => "$1";
    expect(attributePredicate("decaf", ["yes", "no"], bind)).toBe(
      "(p.decaf IS TRUE OR p.decaf IS NOT TRUE)",
    );
    expect(
      attributePredicate("variety", ["__empty__", "bourbon-127296f3"], bind),
    ).toContain("p.variety_ids ?| $1::text[] OR");
    expect(attributePredicate("roastFor", ["filter"], bind)).toContain(
      "p.roast_for",
    );
    for (const key of ["origin", "variety", "roastFor", "decaf"] as const)
      expect(attributeValuesSql(key, bind)).toContain("SELECT");
  });
  it("uses canonical names and preserves future IDs", () => {
    expect(Object.keys(varietyNames)).toHaveLength(900);
    expect(attributeLabel("origin", "country:ET")).toBe("Ethiopia");
    expect(attributeLabel("origin", "continent:africa")).toBe("Africa");
    expect(attributeLabel("origin", "continent:future")).toBe("future");
    expect(attributeLabel("variety", "bourbon-127296f3")).toBe("Bourbon");
    expect(attributeLabel("variety", "future-12345678")).toBe(
      "future-12345678",
    );
    expect(attributeLabel("roastFor", "omni")).toBe("Omni");
    expect(attributeLabel("roastFor", "future")).toBe("future");
    expect(attributeLabel("decaf", "yes")).toBe("Decaf");
    expect(attributeLabel("decaf", "no")).toBe("Not decaf");
  });
  it("searches mapped labels before pagination and retains selected zero counts", async () => {
    const db = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { value: "bourbon-127296f3", count: 3 },
          ...Array.from({ length: 25 }, (_, i) => ({
            value: `future-${i}`,
            count: 1,
          })),
        ],
      }),
    } as unknown as QueryDatabase;
    const result = await attributeFacet(
      db,
      query("variety=unknown-12345678"),
      "variety",
      { search: "Bourbon", offset: 0 },
    );
    expect(result.items).toEqual(
      expect.arrayContaining([
        { value: "bourbon-127296f3", label: "Bourbon", count: 3 },
        { value: "unknown-12345678", label: "unknown-12345678", count: 0 },
      ]),
    );
    expect(result.hasMore).toBe(false);
    expect(
      (await attributeFacet(db, query(), "variety", { search: "", offset: 0 }))
        .hasMore,
    ).toBe(true);
    expect(
      (await attributeFacet(db, query(), "origin", { search: "", offset: 300 }))
        .items,
    ).toEqual([]);
    await createCatalogRepository(db).facet("coffees", query(), "decaf", "", 0);
  });
  it("loads details by bigint string and preserves absent attributes", async () => {
    const row = {
      id: "9007199254740993",
      name: "Floral",
      display_name: "R",
      country_code: "US",
      variety_ids: ["bourbon-127296f3", "future-12345678", null],
      origin_country_codes: ["ET", "ET"],
      roast_for: [],
      decaf: true,
    };
    const db = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValue({ rows: [] }),
    };
    const repo = createCatalogRepository(db as unknown as QueryDatabase);
    expect(await repo.coffee(row.id)).toMatchObject({
      decaf: true,
      originCountryCodes: ["ET"],
      originContinents: null,
      varieties: [
        { id: "bourbon-127296f3", label: "Bourbon" },
        { id: "future-12345678", label: "future-12345678" },
      ],
    });
    expect(db.query.mock.calls[0]?.[1]).toEqual([row.id]);
    expect(await repo.coffee("2")).toBeNull();
    expect(
      mapCoffeeDetail({
        ...row,
        variety_ids: null,
        decaf: null,
        description: "text",
      }),
    ).toMatchObject({ varieties: [], description: "text", decaf: false });
  });
});
