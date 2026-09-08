import { describe, expect, it } from "vitest";
import { countryName, facetLabel, location, price, safeUrl } from "./format";
import { catalogUrl, clearFilters, filtersFor, toggleFilter } from "./state";
describe("catalogue presentation and URL state", () => {
  it("renders incomplete prices and untrusted links safely", () => {
    expect(price("16.80", "EUR")).toBe("€16.80");
    expect(price(null, null)).toBe("Price unavailable");
    expect(price("NaN", "USD")).toBe("Price unavailable");
    expect(price("12", "INVALID")).toBe("12 INVALID");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl(null)).toBeUndefined();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("formats geography without phantom separators and names filter values", () => {
    expect(
      location({
        id: "1",
        name: "A",
        city: null,
        stateCode: null,
        countryCode: "CZ",
      }),
    ).toBe("Czechia");
    expect(
      location({
        id: "1",
        name: "A",
        city: "Portland",
        stateCode: "OR",
        countryCode: "US",
      }),
    ).toBe("Portland, OR, United States");
    expect(countryName("ZZ")).toBeTruthy();
    const option = { value: "US", label: "Fallback", count: 0 };
    expect(facetLabel("country", option)).toBe("United States");
    expect(facetLabel("state", { ...option, value: "OR" })).toBe("Oregon");
    expect(facetLabel("state", option)).toBe("Fallback");
    expect(facetLabel("model", { ...option, value: "IN_HOUSE" })).toBe(
      "In-house",
    );
    expect(facetLabel("model", option)).toBe("Fallback");
    expect(facetLabel("hasCoffee", { ...option, value: "yes" })).toBe(
      "With coffee",
    );
    expect(facetLabel("hasCoffee", { ...option, value: "no" })).toBe(
      "Without coffee",
    );
    expect(facetLabel("city", option)).toBe("Fallback");
  });
  it("round trips filters, clears only filters and resets pages", () => {
    const initial = new URLSearchParams(
      "q=coffee&country=US&page=3&sort=nameDesc",
    );
    const both = toggleFilter(initial, "country", "CA");
    expect(both.getAll("country")).toEqual(["US", "CA"]);
    expect(both.has("page")).toBe(false);
    expect(toggleFilter(both, "country", "US").getAll("country")).toEqual([
      "CA",
    ]);
    expect(clearFilters(initial, "coffees").toString()).toBe(
      "q=coffee&sort=nameDesc",
    );
    expect(catalogUrl("coffees")).toBe("/coffee");
    expect(catalogUrl("roasters", initial)).toContain("/roasters?q=coffee");
    expect(filtersFor("roasters")).toContain("hasCoffee");
  });
});
