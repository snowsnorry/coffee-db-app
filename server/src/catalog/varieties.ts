import type { Pool } from "pg";
export const MISSING_VARIETY = "Name unavailable";
export type Variety = { id: string; label: string; kind: string | null };
export const varietyKey = (version: string | null, id: string) =>
  `${version ?? ""}:${id}`;
export async function loadVarieties(db: Pick<Pool, "query">, keys: string[]) {
  const dictionary = new Map<string, Variety>();
  if (!keys.length) return dictionary;
  const versions = [
    ...new Set(keys.map((key) => key.split(":")[0]).filter(Boolean)),
  ];
  const result = await db.query(
    `SELECT dictionary_version, id, label, kind FROM coffee_varieties WHERE dictionary_version = ANY($1::text[])`,
    [versions],
  );
  for (const row of result.rows)
    dictionary.set(varietyKey(row.dictionary_version, row.id), {
      id: row.id,
      label: row.label,
      kind: row.kind,
    });
  return dictionary;
}
export function resolveVariety(
  dictionary: Map<string, Variety>,
  key: string,
): Variety {
  const found = dictionary.get(key);
  if (found) return found;
  process.stderr.write(
    `Missing variety dictionary entry ${JSON.stringify({ key })}\n`,
  );
  return {
    id: key.slice(key.indexOf(":") + 1),
    label: MISSING_VARIETY,
    kind: null,
  };
}
