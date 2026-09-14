import type { Pool } from "pg";
import type { CatalogQuery, FilterKey } from "./types.js";
import { attributeLabel, attributeValuesSql, EMPTY } from "./attributes.js";
import { buildWhere, fromSql } from "./sql.js";
export async function attributeFacet(
  db: Pick<Pool, "query">,
  query: CatalogQuery,
  key: FilterKey,
  { search, offset }: { search: string; offset: number },
) {
  const sql = buildWhere("coffees", query, key);
  const options = attributeValuesSql(key, sql.bind);
  const result = await db.query(
    `SELECT a.value, count(*)::int AS count ${fromSql("coffees")} CROSS JOIN LATERAL (${options}) a ${sql.where} GROUP BY a.value`,
    sql.values,
  );
  const items = result.rows.map((row) => ({
    value: String(row.value),
    label: attributeLabel(key, String(row.value)),
    count: Number(row.count),
  }));
  // Label lookup/search precedes pagination; dictionary counts never replace live counts.
  for (const value of [
    ...query.filters[key],
    ...(key === "decaf" ? ["yes", "no"] : [EMPTY]),
  ]) {
    if (!items.some((item) => item.value === value))
      items.push({ value, label: attributeLabel(key, value), count: 0 });
  }
  items.sort(
    (a, b) =>
      b.count - a.count ||
      a.label.localeCompare(b.label, "en") ||
      a.value.localeCompare(b.value),
  );
  const matching = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );
  const batchSize = key === "origin" ? 300 : 20;
  const page = matching.slice(offset, offset + batchSize);
  if (offset === 0)
    for (const item of items) {
      if (
        (query.filters[key].includes(item.value) ||
          (item.value === EMPTY && !search)) &&
        !page.some((option) => option.value === item.value)
      )
        page.unshift(item);
    }
  return { items: page, hasMore: matching.length > offset + batchSize };
}
