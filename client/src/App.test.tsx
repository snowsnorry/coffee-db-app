import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function mockHealthResponse(ok: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      json: async () => ({ status: "ok", service: "coffee-db-server" }),
    }),
  );
}

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the placeholder and reports a healthy API", async () => {
    mockHealthResponse(true);
    render(<App />);

    expect(screen.getByRole("heading", { name: "Coffee DB" })).toBeVisible();
    expect(await screen.findByText("UI and API are ready.")).toBeVisible();
  });

  it("shows an accessible error when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);

    expect(
      await screen.findByText("The UI is running, but the API is unavailable."),
    ).toBeVisible();
  });

  it("checks the API again on request", async () => {
    mockHealthResponse(true);
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("UI and API are ready.");
    await user.click(screen.getByRole("button", { name: "Check API again" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
