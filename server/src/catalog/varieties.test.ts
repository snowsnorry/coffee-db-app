import { expect, it, vi } from "vitest";
import { loadVarieties, resolveVariety, varietyKey } from "./varieties.js";
import { mapCoffeeDetail } from "./mapping.js";
import type { QueryDatabase } from "./repository.js";

it("resolves each product against its own version and fetches newly published versions", async () => {
  const db = {
    query: vi.fn().mockResolvedValue({
      rows: [
        {
          dictionary_version: "v1",
          id: "same-id",
          label: "Old label",
          kind: "group_label",
        },
        {
          dictionary_version: "v2",
          id: "same-id",
          label: "New label",
          kind: "variety_label",
        },
      ],
    }),
  };
  const dictionary = await loadVarieties(db as unknown as QueryDatabase, [
    "v1:same-id",
    "v2:same-id",
  ]);
  expect(db.query.mock.calls[0]?.[1]).toEqual([["v1", "v2"]]);
  for (const [version, label] of [
    ["v1", "Old label"],
    ["v2", "New label"],
  ]) {
    expect(
      mapCoffeeDetail(
        {
          variety_dictionary_version: version,
          variety_ids: ["same-id"],
          variety_unresolved: ["Unidentified"],
        },
        dictionary,
      ),
    ).toMatchObject({
      varietyDictionaryVersion: version,
      varietyUnresolved: ["Unidentified"],
      varieties: [{ id: "same-id", label }],
    });
  }
  db.query.mockResolvedValue({
    rows: [
      {
        dictionary_version: "v3",
        id: "same-id",
        label: "Later label",
        kind: "species_label",
      },
    ],
  });
  expect(
    resolveVariety(
      await loadVarieties(db as unknown as QueryDatabase, ["v3:same-id"]),
      "v3:same-id",
    ).label,
  ).toBe("Later label");
  expect(resolveVariety(dictionary, "v1:same-id").label).toBe("Old label");
});

it("logs absent versions and IDs without substituting another version", async () => {
  const warn = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const dictionary = new Map([
    ["v2:id", { id: "id", label: "Other", kind: "variety_label" }],
  ]);
  for (const key of ["v1:id", "v2:missing", varietyKey(null, "id")]) {
    expect(resolveVariety(dictionary, key)).toMatchObject({
      label: "Name unavailable",
      kind: null,
    });
    expect(warn).toHaveBeenCalledWith(
      `Missing variety dictionary entry ${JSON.stringify({ key })}\n`,
    );
  }
  const db = { query: vi.fn() };
  expect((await loadVarieties(db as unknown as QueryDatabase, [])).size).toBe(
    0,
  );
  expect(db.query).not.toHaveBeenCalled();
});
