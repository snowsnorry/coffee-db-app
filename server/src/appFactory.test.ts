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
});
