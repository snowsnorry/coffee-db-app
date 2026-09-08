import type { CatalogKind, CatalogQuery, FilterKey } from "./types.js";

const ROASTER_SEARCH =
  "to_tsvector('simple', r.display_name || ' ' || coalesce(r.city, '') || ' ' || r.canonical_domain)";
const COFFEE_SEARCH = "to_tsvector('simple', p.name || ' ' || p.description)";
const CITY_VALUE =
  "json_build_array(r.country_code::text, coalesce(r.state_code::text, ''), r.city)::text";
export const COFFEE_COUNT =
  "(SELECT count(*)::int FROM coffee_products cp WHERE cp.roaster_id = r.id)";
const COLUMNS: Record<FilterKey, string> = {
  roaster: "r.id::text",
  country: "r.country_code",
  state: "r.state_code",
  city: CITY_VALUE,
  model: "r.roasting_model",
  hasCoffee: `CASE WHEN EXISTS (SELECT 1 FROM coffee_products cp WHERE cp.roaster_id = r.id) THEN 'yes' ELSE 'no' END`,
};
export function buildWhere(
  kind: CatalogKind,
  query: CatalogQuery,
  excluded?: FilterKey,
) {
  const values: unknown[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const terms: string[] = [];
  let rank = "0";
  if (query.q) {
    const search = `websearch_to_tsquery('simple', ${bind(query.q)})`;
    const roasterMatch = `${ROASTER_SEARCH} @@ ${search}`;
    terms.push(
      kind === "coffees"
        ? `p.id IN (SELECT p.id FROM coffee_products p WHERE ${COFFEE_SEARCH} @@ ${search} UNION SELECT p.id FROM coffee_products p JOIN roasters r ON r.id = p.roaster_id WHERE ${roasterMatch})`
        : roasterMatch,
    );
    rank =
      kind === "coffees"
        ? `(4 * ts_rank(to_tsvector('simple', p.name), ${search}) + ts_rank(${ROASTER_SEARCH}, ${search}))`
        : `ts_rank(${ROASTER_SEARCH}, ${search})`;
  }
  for (const [key, selected] of Object.entries(query.filters)) {
    if (key === excluded || !selected.length) continue;
    // PostgreSQL JSON spacing is normalized before comparing composite city identities.
    const column =
      key === "city" ? `(${CITY_VALUE})::jsonb` : COLUMNS[key as FilterKey];
    const cast = key === "city" ? "jsonb[]" : "text[]";
    terms.push(`${column} = ANY(${bind(selected)}::${cast})`);
  }
  return {
    values,
    bind,
    rank,
    where: terms.length ? `WHERE ${terms.join(" AND ")}` : "",
  };
}
export const fromSql = (kind: CatalogKind) =>
  kind === "coffees"
    ? "FROM coffee_products p JOIN roasters r ON r.id = p.roaster_id"
    : "FROM roasters r";
export function orderSql(kind: CatalogKind, query: CatalogQuery, rank: string) {
  const id = kind === "coffees" ? "p.id" : "r.id";
  const name = kind === "coffees" ? "lower(p.name)" : "r.normalized_name";
  if (query.sort === "coffeeCount") return `${COFFEE_COUNT} DESC, ${id} ASC`;
  if (query.sort === "relevance" && query.q) return `${rank} DESC, ${id} ASC`;
  return `${name} ${query.sort === "nameDesc" ? "DESC" : "ASC"}, ${id} ASC`;
}
export function facetSql(key: FilterKey) {
  const value = COLUMNS[key];
  if (key === "roaster") return { value, label: "r.display_name" };
  if (key === "city")
    return {
      value,
      label: "r.city || ', ' || concat_ws(', ', r.state_code, r.country_code)",
    };
  return { value, label: value };
}
