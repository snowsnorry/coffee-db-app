import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "./health";

describe("fetchHealth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the health payload", async () => {
    const payload = { status: "ok", service: "coffee-db-server" } as const;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    );

    await expect(fetchHealth()).resolves.toEqual(payload);
  });

  it("rejects non-successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    await expect(fetchHealth()).rejects.toThrow("status 503");
  });
});
