import {
  FILTERS,
  type CatalogKind,
  type CatalogQuery,
  type FilterKey,
} from "./types.js";

export class InvalidQuery extends Error {}
const fail = (): never => {
  throw new InvalidQuery("Invalid catalogue parameters");
};
const MODELS = ["IN_HOUSE", "SHARED_FACILITY", "CONTRACT", "HYBRID", "UNKNOWN"];
const applicableFilters = (kind: CatalogKind): FilterKey[] =>
  kind === "coffees"
    ? ["roaster", "country", "state", "city"]
    : ["country", "state", "city", "model", "hasCoffee"];
export function textParameter(params: URLSearchParams, key: string, max = 200) {
  const values = params.getAll(key);
  if (values.length > 1 || (values[0]?.length ?? 0) > max) return fail();
  return (values[0] ?? "").trim();
}
export function integerParameter(
  params: URLSearchParams,
  key: string,
  fallback: number,
  max: number,
  min = 1,
) {
  const raw = textParameter(params, key, 10);
  if (!raw) return fallback;
  const number = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  )
    return fail();
  return number;
}
function validFilter(key: FilterKey, value: string) {
  if (key === "roaster")
    return (
      /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n
    );
  if (key === "country" || key === "state") return /^[A-Z]{2}$/.test(value);
  if (key === "model") return MODELS.includes(value);
  if (key === "hasCoffee") return ["yes", "no"].includes(value);
  return validCity(value);
}
function validCity(value: string) {
  try {
    const parts: unknown = JSON.parse(value);
    return (
      Array.isArray(parts) &&
      parts.length === 3 &&
      parts.every((x) => typeof x === "string") &&
      /^[A-Z]{2}$/.test(parts[0] ?? "") &&
      /^(?:[A-Z]{2})?$/.test(parts[1] ?? "") &&
      (parts[2]?.length ?? 0) > 0
    );
  } catch {
    return false;
  }
}
export function parseQuery(
  params: URLSearchParams,
  kind: CatalogKind,
): CatalogQuery {
  const allowed = applicableFilters(kind);
  const filters = Object.fromEntries(
    FILTERS.map((key) => {
      const values = [...new Set(params.getAll(key))];
      if (
        values.length > 50 ||
        values.some((v) => v.length > 300 || !validFilter(key, v))
      )
        fail();
      if (values.length && !allowed.includes(key)) fail();
      return [key, values];
    }),
  ) as CatalogQuery["filters"];
  const q = textParameter(params, "q");
  const sort =
    textParameter(params, "sort") ||
    (q && kind === "coffees" ? "relevance" : "nameAsc");
  const sorts =
    kind === "coffees"
      ? ["nameAsc", "nameDesc", "relevance"]
      : ["nameAsc", "nameDesc", "coffeeCount"];
  if (!sorts.includes(sort)) fail();
  return {
    q,
    sort: sort as CatalogQuery["sort"],
    filters,
    page: integerParameter(params, "page", 1, 1000000),
    pageSize: integerParameter(
      params,
      "pageSize",
      kind === "coffees" ? 24 : 20,
      100,
    ),
  };
}
export function parseFacet(
  params: URLSearchParams,
  kind: CatalogKind,
): FilterKey {
  const facet = textParameter(params, "facet") as FilterKey;
  if (!applicableFilters(kind).includes(facet)) fail();
  return facet;
}
