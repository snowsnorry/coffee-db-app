import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../appFactory.js";
import type { CatalogRepository } from "./types.js";
const createRepository = (): CatalogRepository => ({
  coffee: vi.fn().mockResolvedValue(null),
  coffees: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 24,
    totalPages: 0,
  }),
  roasters: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  facet: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
  stats: vi.fn().mockResolvedValue({ coffees: 1 }),
});
describe("catalogue HTTP API", () => {
  it("requires a repository only for catalogue endpoints", async () => {
    expect((await request(createApp()).get("/api/coffees")).status).toBe(503);
    expect((await request(createApp()).get("/api/health")).status).toBe(200);
    expect((await request(createApp()).get("/api/missing")).status).toBe(404);
  });
  it("serves both lists, facets and statistics", async () => {
    const catalog = createRepository();
    const app = createApp({ catalog });
    for (const url of [
      "/api/coffees",
      "/api/roasters",
      "/api/catalog/stats",
      "/api/coffees/facets?facet=country&offset=20",
      "/api/roasters/facets?facet=model",
    ])
      expect((await request(app).get(url)).status).toBe(200);
    expect(catalog.facet).toHaveBeenCalledWith(
      "coffees",
      expect.anything(),
      "country",
      "",
      20,
    );
  });
  it("serves details and validates bigint IDs", async () => {
    const catalog = createRepository();
    const app = createApp({ catalog });
    expect((await request(app).get("/api/coffees/1")).status).toBe(404);
    expect((await request(app).get("/api/coffees/0")).status).toBe(400);
    expect(
      (await request(app).get("/api/coffees/9223372036854775808")).status,
    ).toBe(400);
    vi.mocked(catalog.coffee).mockResolvedValue({
      id: "9007199254740993",
      description: "Text",
    } as Awaited<ReturnType<CatalogRepository["coffee"]>>);
    expect(
      (await request(app).get("/api/coffees/9007199254740993")).body,
    ).toMatchObject({ description: "Text" });
    expect(
      (await request(app).get("/api/coffees/facets?facet=origin")).status,
    ).toBe(200);
    vi.mocked(catalog.coffee).mockRejectedValue(new Error("secret"));
    expect((await request(app).get("/api/coffees/1")).body).toEqual({
      error: "catalog_unavailable",
    });
  });
  it("returns safe JSON errors", async () => {
    const catalog = createRepository();
    const app = createApp({ catalog });
    expect((await request(app).get("/api/coffees?pageSize=999")).body).toEqual({
      error: "invalid_query",
    });
    vi.mocked(catalog.coffees).mockRejectedValue(new Error("postgres secret"));
    const result = await request(app).get("/api/coffees");
    expect(result.status).toBe(503);
    expect(result.body).toEqual({ error: "catalog_unavailable" });
  });
});
