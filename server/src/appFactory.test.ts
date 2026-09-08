import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, HEALTH_PAYLOAD } from "./appFactory.js";

describe("createApp", () => {
  it.each(["/health", "/api/health"])(
    "returns the health contract from %s",
    async (route) => {
      const response = await request(createApp()).get(route);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(HEALTH_PAYLOAD);
    },
  );

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await request(createApp()).get("/api/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "not_found" });
  });
});

describe("production client serving", () => {
  let clientDistPath: string;

  beforeAll(() => {
    clientDistPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "coffee-db-client-"),
    );
    fs.writeFileSync(
      path.join(clientDistPath, "index.html"),
      "<!doctype html><title>Coffee DB test</title>",
    );
    fs.writeFileSync(path.join(clientDistPath, "app.js"), "export {};");
  });

  afterAll(() => {
    fs.rmSync(clientDistPath, { recursive: true, force: true });
  });

  it("serves the SPA entrypoint for application routes", async () => {
    const app = createApp({ clientDistPath, serveClient: true });
    const response = await request(app).get("/roasters/example");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Coffee DB test");
  });

  it.each([
    ["/", 200],
    ["/coffee", 200],
    ["/app.js", 200],
    ["/health", 200],
    ["/api/health", 200],
    ["/api/missing", 404],
    ["/api/coffees", 503],
  ])("sets security headers on %s", async (route, status) => {
    const response = await request(
      createApp({ clientDistPath, serveClient: true }),
    ).get(route);
    expect(response.status).toBe(status);
    expectSecurityHeaders(response.headers);
  });

  it("sets headers before JSON parsing, including malformed request errors", async () => {
    const response = await request(createApp())
      .post("/api/coffees")
      .set("Content-Type", "application/json")
      .send("{");
    expect(response.status).toBe(400);
    expectSecurityHeaders(response.headers, true);
  });
});

function expectSecurityHeaders(headers: Record<string, string>, error = false) {
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-frame-options"]).toBe("DENY");
  // Express finalhandler applies its stricter CSP to its own error documents.
  expect(headers["content-security-policy"]).toBe(
    error ? "default-src 'none'" : "frame-ancestors 'none'",
  );
  const policy = headers["content-security-policy-report-only"];
  expect(policy).toContain("script-src 'self';");
  expect(policy).toContain("style-src 'self' 'unsafe-inline';");
  expect(policy).toContain("img-src 'self' http: https:;");
  expect(policy).toContain("object-src 'none';");
  expect(policy).toContain("base-uri 'none';");
  expect(policy).not.toContain("unsafe-eval");
}
