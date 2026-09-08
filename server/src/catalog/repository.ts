import type { Pool } from "pg";
import { mapCoffee, mapRoaster, type Row } from "./mapping.js";
import {
  buildWhere,
  COFFEE_COUNT,
  facetSql,
  fromSql,
  orderSql,
} from "./sql.js";
import type {
  CatalogKind,
  CatalogPage,
  CatalogQuery,
  CatalogRepository,
  FacetOption,
  FilterKey,
} from "./types.js";

export type QueryDatabase = Pick<Pool, "query">;
const ROASTER_COLUMNS = "r.display_name, r.country_code, r.state_code, r.city";
const COLUMNS = {
  coffees: `p.id::text, p.name, p.image_url, p.price_amount::text, p.price_currency, p.canonical_url, r.id::text AS roaster_id, ${ROASTER_COLUMNS}`,
  roasters: `r.id::text, ${ROASTER_COLUMNS}, r.canonical_domain, r.website_url, r.roasting_model, ${COFFEE_COUNT} AS coffee_count`,
};
async function list<T>(
  db: QueryDatabase,
  kind: CatalogKind,
  query: CatalogQuery,
  map: (row: Row) => T,
): Promise<CatalogPage<T>> {
  const sql = buildWhere(kind, query);
  const base = `${fromSql(kind)} ${sql.where}`;
  const counts = await db.query(
    `SELECT count(*)::int AS total ${base}`,
    sql.values,
  );
  const total = Number(counts.rows[0].total);
  const totalPages = Math.ceil(total / query.pageSize);
  const page = Math.min(query.page, Math.max(1, totalPages));
  const limit = sql.bind(query.pageSize);
  const offset = sql.bind((page - 1) * query.pageSize);
  const result = await db.query(
    `SELECT ${COLUMNS[kind]} ${base} ORDER BY ${orderSql(kind, query, sql.rank)} LIMIT ${limit} OFFSET ${offset}`,
    sql.values,
  );
  return {
    items: result.rows.map(map),
    total,
    page,
    pageSize: query.pageSize,
    totalPages,
  };
}
const facetOption = (row: Row, key: FilterKey): FacetOption => ({
  value:
    key === "city"
      ? JSON.stringify(JSON.parse(String(row.value)))
      : String(row.value),
  label: String(row.label),
  count: Number(row.count),
});
async function facet(
  db: QueryDatabase,
  kind: CatalogKind,
  query: CatalogQuery,
  key: FilterKey,
  options: { search: string; offset: number },
) {
  const { search, offset } = options;
  const sql = buildWhere(kind, query, key);
  const { value, label } = facetSql(key);
  const base = `SELECT ${value} AS value, ${label} AS label, count(*)::int AS count ${fromSql(kind)} ${sql.where} GROUP BY 1, 2`;
  // Search is literal: user percent and underscore characters do not become wildcards.
  const searchParam = sql.bind(`%${search.replace(/[\\%_]/g, "\\$&")}%`);
  const offsetParam = sql.bind(offset);
  const batchSize = key === "country" || key === "state" ? 100 : 20;
  const result = await db.query(
    `WITH options AS (${base}) SELECT * FROM options WHERE value IS NOT NULL AND label ILIKE ${searchParam} ORDER BY count DESC, label ASC, value ASC LIMIT ${batchSize + 1} OFFSET ${offsetParam}`,
    sql.values,
  );
  const items = result.rows
    .slice(0, batchSize)
    .map((row) => facetOption(row, key));
  if (offset === 0 && query.filters[key].length) {
    const selectedSql = buildWhere(kind, query, key);
    const selectedBase = `SELECT ${value} AS value, ${label} AS label, count(*)::int AS count ${fromSql(kind)} ${selectedSql.where} GROUP BY 1, 2`;
    const selected = selectedSql.bind(query.filters[key]);
    const comparison =
      key === "city"
        ? `(${value})::jsonb = ANY(${selected}::jsonb[])`
        : `${value} = ANY(${selected}::text[])`;
    const rows = await db.query(
      `WITH counts AS (${selectedBase}), selected AS (SELECT DISTINCT ${value} AS value, ${label} AS label FROM roasters r WHERE ${comparison}) SELECT s.value, s.label, coalesce(c.count, 0) AS count FROM selected s LEFT JOIN counts c ON c.value = s.value`,
      selectedSql.values,
    );
    for (const row of rows.rows) {
      const option = facetOption(row, key);
      if (!items.some((item) => item.value === option.value))
        items.unshift(option);
    }
  }
  return { items, hasMore: result.rows.length > batchSize };
}
export function createCatalogRepository(db: QueryDatabase): CatalogRepository {
  return {
    coffees: (query) => list(db, "coffees", query, mapCoffee),
    roasters: (query) => list(db, "roasters", query, mapRoaster),
    facet: (kind, query, key, search, offset) =>
      facet(db, kind, query, key, { search, offset }),
    async stats() {
      const result = await db.query(
        `SELECT (SELECT count(*)::int FROM coffee_products) AS coffees, count(*)::int AS roasters, count(DISTINCT country_code)::int AS countries, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM coffee_products p WHERE p.roaster_id = r.id))::int AS "roastersWithCoffee" FROM roasters r`,
      );
      return result.rows[0];
    },
  };
}
