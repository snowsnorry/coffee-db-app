import { describe, expect, it } from "vitest";
import {
  integerParameter,
  InvalidQuery,
  parseFacet,
  parseQuery,
  textParameter,
} from "./validation.js";
describe("catalogue query contract", () => {
  it("defaults page sizes and relevance only for coffee search", () => {
    expect(parseQuery(new URLSearchParams(), "coffees")).toMatchObject({
      page: 1,
      pageSize: 24,
      sort: "nameAsc",
    });
    expect(parseQuery(new URLSearchParams("q=flower"), "coffees").sort).toBe(
      "relevance",
    );
    expect(parseQuery(new URLSearchParams(), "roasters").pageSize).toBe(20);
  });
  it("keeps OR selections unique and preserves large identifiers", () => {
    const query = parseQuery(
      new URLSearchParams(
        "country=US&country=CA&country=US&roaster=9007199254740993",
      ),
      "coffees",
    );
    expect(query.filters.country).toEqual(["US", "CA"]);
    expect(query.filters.roaster).toEqual(["9007199254740993"]);
  });
  it.each([
    "page=-1",
    "page=0",
    "page=1.5",
    "page=abc",
    "page=1000001",
    "page=1&page=2",
    "pageSize=101",
    "sort=price",
    "roaster=9223372036854775808",
    "country=usa",
    "state=California",
    "model=BOGUS",
    "hasCoffee=maybe",
    "city=oops",
    "city=%5B%22US%22%5D",
    "q=" + "a".repeat(201),
  ])("rejects malformed query %s", (raw) => {
    expect(() => parseQuery(new URLSearchParams(raw), "coffees")).toThrow(
      InvalidQuery,
    );
  });
  it("validates catalogue-specific filters and composite cities", () => {
    expect(() =>
      parseQuery(new URLSearchParams("model=IN_HOUSE"), "coffees"),
    ).toThrow();
    expect(() =>
      parseQuery(new URLSearchParams("roaster=1"), "roasters"),
    ).toThrow();
    expect(
      parseQuery(
        new URLSearchParams({
          city: JSON.stringify(["US", "OR", "Portland"]),
          model: "HYBRID",
          hasCoffee: "no",
        }),
        "roasters",
      ).filters.city,
    ).toHaveLength(1);
    expect(() =>
      parseQuery(
        new URLSearchParams(
          Array.from({ length: 51 }, (_, i) => ["roaster", String(i + 1)]),
        ),
        "coffees",
      ),
    ).toThrow();
    expect(() =>
      parseQuery(new URLSearchParams({ city: "x".repeat(301) }), "coffees"),
    ).toThrow();
  });
  it("validates facet pagination and keys", () => {
    expect(integerParameter(new URLSearchParams(), "offset", 0, 100, 0)).toBe(
      0,
    );
    expect(
      integerParameter(new URLSearchParams("offset=20"), "offset", 0, 100, 0),
    ).toBe(20);
    expect(parseFacet(new URLSearchParams("facet=model"), "roasters")).toBe(
      "model",
    );
    expect(() =>
      parseFacet(new URLSearchParams("facet=model"), "coffees"),
    ).toThrow();
    expect(textParameter(new URLSearchParams("q=++hello++"), "q")).toBe(
      "hello",
    );
  });
});
