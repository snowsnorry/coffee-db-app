import { describe, expect, it } from "vitest";
import { buildWhere, facetSql, fromSql, orderSql } from "./sql.js";
import { parseQuery } from "./validation.js";
describe("parameterized catalogue SQL", () => {
  it("never interpolates search or selected values", () => {
    const q = parseQuery(
      new URLSearchParams({ q: "' DROP TABLE roasters; --", country: "US" }),
      "coffees",
    );
    const sql = buildWhere("coffees", q);
    expect(sql.where).not.toContain("DROP");
    expect(sql.values).toEqual([q.q, ["US"]]);
    expect(sql.where).toContain("websearch_to_tsquery('simple', $1)");
    expect(sql.where).toContain("ANY($2::text[])");
    expect(sql.rank).toContain("ts_rank");
  });
  it("excludes only the current facet and compares composite cities as jsonb", () => {
    const q = parseQuery(
      new URLSearchParams({ country: "US", city: '["US","OR","Portland"]' }),
      "coffees",
    );
    const sql = buildWhere("coffees", q, "country");
    expect(sql.values).toEqual([[q.filters.city[0]]]);
    expect(sql.where).toContain("jsonb[]");
    expect(
      buildWhere("roasters", parseQuery(new URLSearchParams(), "roasters"))
        .where,
    ).toBe("");
  });
  it("provides stable ordering for every supported sort", () => {
    const q = parseQuery(new URLSearchParams("q=coffee"), "coffees");
    expect(orderSql("coffees", q, "rank")).toBe("rank DESC, p.id ASC");
    expect(orderSql("coffees", { ...q, q: "" }, "rank")).toBe(
      "lower(p.name) ASC, p.id ASC",
    );
    expect(orderSql("coffees", { ...q, sort: "nameDesc" }, "rank")).toContain(
      "DESC, p.id ASC",
    );
    expect(
      orderSql("roasters", { ...q, sort: "coffeeCount" }, "rank"),
    ).toContain("DESC, r.id ASC");
    expect(orderSql("roasters", { ...q, sort: "nameAsc" }, "rank")).toBe(
      "r.normalized_name ASC, r.id ASC",
    );
    expect(buildWhere("roasters", q).where).not.toContain("p.description");
    expect(fromSql("coffees")).toContain("JOIN");
    expect(fromSql("roasters")).toBe("FROM roasters r");
    expect(facetSql("roaster").label).toBe("r.display_name");
    expect(facetSql("city").label).toContain("r.city");
    expect(facetSql("hasCoffee").value).toContain("EXISTS");
  });
});
