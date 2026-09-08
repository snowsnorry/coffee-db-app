import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../appFactory.js";
import type { CatalogRepository } from "./types.js";
const createRepository = (): CatalogRepository => ({
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
