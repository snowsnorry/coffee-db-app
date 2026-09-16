import { originCountries } from "./originCountries.js";
import { MISSING_VARIETY } from "./varieties.js";
import type { FilterKey } from "./types.js";
export const EMPTY = "__empty__";
export const attributeKeys = ["origin", "variety", "roastFor", "decaf"];
const continentNames: Record<string, string> = {
  africa: "Africa",
  asia: "Asia",
  europe: "Europe",
  north_america: "North America",
  south_america: "South America",
  americas: "Americas",
  oceania: "Oceania",
  antarctica: "Antarctica",
};
const countries = new Intl.DisplayNames(["en"], { type: "region" });
export function attributeLabel(key: FilterKey, value: string) {
  if (value === EMPTY) return "Not specified";
  if (key === "origin")
    return value.startsWith("country:")
      ? (countries.of(value.slice(8)) ?? value.slice(8))
      : (continentNames[value.slice(10)] ?? value.slice(10));
  if (key === "variety") return MISSING_VARIETY;
  if (key === "decaf") return value === "yes" ? "Decaf" : "Not decaf";
  return (
    (
      { espresso: "Espresso", filter: "Filter", omni: "Omni" } as Record<
        string,
        string
      >
    )[value] ?? value
  );
}
const arrayColumn = (key: FilterKey) =>
  key === "variety" ? "p.variety_ids" : "p.roast_for";
const emptyArray = (column: string) =>
  `(${column} IS NULL OR ${column} = '[]'::jsonb OR ${column} = 'null'::jsonb)`;
export function attributePredicate(
  key: FilterKey,
  selected: string[],
  bind: (value: unknown) => string,
) {
  const values = selected.filter((v) => v !== EMPTY);
  const terms: string[] = [];
  if (key === "decaf") {
    if (values.includes("yes")) terms.push("p.decaf IS TRUE");
    if (values.includes("no")) terms.push("p.decaf IS NOT TRUE");
  } else if (key === "origin") {
    terms.push(...originTerms(selected, values, bind));
  } else {
    if (key === "variety") {
      for (const value of values) {
        const [version, id] = value.split(":");
        terms.push(
          `(coalesce(p.variety_dictionary_version, '') = ${bind(version)} AND p.variety_ids ? ${bind(id)})`,
        );
      }
    } else if (values.length)
      terms.push(`${arrayColumn(key)} ?| ${bind(values)}::text[]`);
    if (selected.includes(EMPTY)) terms.push(emptyArray(arrayColumn(key)));
  }
  return `(${terms.join(" OR ")})`;
}
// Every row is one product/option pair. DISTINCT removes repeated array entries and
// country/continent overlap before counts are calculated.
export function attributeValuesSql(
  key: FilterKey,
  bind: (value: unknown) => string,
) {
  if (key === "decaf")
    return "SELECT CASE WHEN p.decaf IS TRUE THEN 'yes' ELSE 'no' END AS value";
  if (key === "variety")
    return `SELECT DISTINCT CASE WHEN v.value = '${EMPTY}' THEN '${EMPTY}' ELSE coalesce(p.variety_dictionary_version, '') || ':' || v.value END AS value FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p.variety_ids) = 'array' AND p.variety_ids <> '[]'::jsonb THEN p.variety_ids ELSE '["__empty__"]'::jsonb END) v WHERE v.value IS NOT NULL`;
  if (key !== "origin")
    return `SELECT DISTINCT jsonb_array_elements_text(CASE WHEN jsonb_typeof(${arrayColumn(key)}) = 'array' AND ${arrayColumn(key)} <> '[]'::jsonb THEN ${arrayColumn(key)} ELSE '["__empty__"]'::jsonb END) AS value`;
  const mapping: Record<string, string[]> = {};
  for (const [continent, codes] of Object.entries(originCountries)) {
    for (const country of codes) (mapping[country] ??= []).push(continent);
  }
  return `SELECT DISTINCT value FROM (
    SELECT 'country:' || c.value AS value FROM jsonb_array_elements_text(coalesce(nullif(p.origin_country_codes, 'null'::jsonb), '[]'::jsonb)) c
    UNION ALL
    SELECT 'continent:' || m.value FROM jsonb_array_elements_text(coalesce(nullif(p.origin_country_codes, 'null'::jsonb), '[]'::jsonb)) c CROSS JOIN LATERAL jsonb_array_elements_text(${bind(JSON.stringify(mapping))}::jsonb -> c.value) m
    UNION ALL
    SELECT 'continent:' || c.value FROM jsonb_array_elements_text(coalesce(nullif(p.origin_continents, 'null'::jsonb), '[]'::jsonb)) c
    UNION ALL
    SELECT 'continent:americas' WHERE p.origin_continents ?| ARRAY['north_america','south_america']
    UNION ALL
    SELECT '${EMPTY}' WHERE ${emptyArray("p.origin_country_codes")} AND ${emptyArray("p.origin_continents")}
  ) origins`;
}

function originTerms(
  selected: string[],
  values: string[],
  bind: (value: unknown) => string,
) {
  const terms: string[] = [];
  const codes = new Set(
    values.filter((v) => v.startsWith("country:")).map((v) => v.slice(8)),
  );
  const continents = new Set(
    values.filter((v) => v.startsWith("continent:")).map((v) => v.slice(10)),
  );
  if (continents.has("americas")) {
    continents.add("north_america");
    continents.add("south_america");
  }
  for (const continent of continents)
    for (const country of originCountries[continent] ?? []) codes.add(country);
  if (codes.size)
    terms.push(`p.origin_country_codes ?| ${bind([...codes])}::text[]`);
  if (continents.size)
    terms.push(`p.origin_continents ?| ${bind([...continents])}::text[]`);
  if (selected.includes(EMPTY))
    terms.push(
      `(${emptyArray("p.origin_country_codes")} AND ${emptyArray("p.origin_continents")})`,
    );
  return terms;
}
