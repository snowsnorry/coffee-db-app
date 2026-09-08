import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useResource } from "./useResource";
import { fetchJson } from "../api/catalog";
afterEach(() => vi.unstubAllGlobals());
describe("catalogue requests", () => {
  it("keeps facet options usable when a preserved refetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ["US"] })
        .mockResolvedValueOnce({ ok: false, status: 503 }),
    );
    const { result, rerender } = renderHook(
      ({ url }) => useResource<string[]>(url, true),
      { initialProps: { url: "/facets" } },
    );
    await waitFor(() => expect(result.current.data).toEqual(["US"]));
    rerender({ url: "/facets?country=US" });
    await waitFor(() => expect(result.current.error).toContain("unavailable"));
    expect(result.current.data).toEqual(["US"]);
    expect(result.current.loading).toBe(false);
  });

  it("does not let a stale response replace the latest request", async () => {
    let resolveFirst!: (value: unknown) => void;
    const old = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce({ ok: true, json: async () => "new" });
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(
      ({ url }) => useResource<string>(url),
      { initialProps: { url: "/old" } },
    );
    rerender({ url: "/new" });
    await waitFor(() => expect(result.current.data).toBe("new"));
    await act(async () => {
      resolveFirst({ ok: true, json: async () => "old" });
    });
    expect(result.current.data).toBe("new");
    expect(fetchMock.mock.calls[0]?.[1].signal.aborted).toBe(true);
  });
  it("can retry failures and handles non-Error rejections", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce("offline")
        .mockResolvedValueOnce({ ok: true, json: async () => [] }),
    );
    const { result } = renderHook(() => useResource<unknown[]>("/api/coffees"));
    await waitFor(() =>
      expect(result.current.error).toBe("Unable to load the catalogue."),
    );
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
  it("provides distinct messages for malformed parameters and outages", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 400 })
        .mockResolvedValueOnce({ ok: false, status: 503 }),
    );
    const signal = new AbortController().signal;
    await expect(fetchJson("/api/coffees", signal)).rejects.toThrow(
      "filters could not be read",
    );
    await expect(fetchJson("/api/coffees", signal)).rejects.toThrow(
      "unavailable",
    );
  });
});
