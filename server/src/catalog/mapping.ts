import { varietyNames } from "./varieties.js";
import type { CoffeeDetail, Coffee, Roaster, RoasterSummary } from "./types.js";
export type Row = Record<string, unknown>;
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
const nullable = (value: unknown) => (value == null ? null : String(value));
function roasterSummary(row: Row): RoasterSummary {
  return {
    id: String(row.roaster_id ?? row.id),
    name: String(row.display_name),
    countryCode: String(row.country_code),
    stateCode: nullable(row.state_code),
    city: nullable(row.city),
  };
}
export function mapCoffee(row: Row): Coffee {
  return {
    id: String(row.id),
    name: String(row.name),
    imageUrl: safeUrl(row.image_url),
    priceAmount: nullable(row.price_amount),
    priceCurrency: nullable(row.price_currency),
    sourceUrl: safeUrl(row.canonical_url),
    roaster: roasterSummary(row),
  };
}
export function mapRoaster(row: Row): Roaster {
  return {
    ...roasterSummary(row),
    domain: String(row.canonical_domain),
    websiteUrl: safeUrl(row.website_url),
    roastingModel: String(row.roasting_model),
    coffeeCount: Number(row.coffee_count),
  };
}

export function mapCoffeeDetail(row: Row): CoffeeDetail {
  const array = (value: unknown): string[] | null =>
    Array.isArray(value)
      ? [...new Set(value.filter((v): v is string => typeof v === "string"))]
      : null;
  const varietyIds = array(row.variety_ids);
  return {
    ...mapCoffee(row),
    description: String(row.description ?? ""),
    originCountryCodes: array(row.origin_country_codes),
    originContinents: array(row.origin_continents),
    varietyIds,
    varieties: (varietyIds ?? []).map((id) => ({
      id,
      label: varietyNames[id] ?? id,
    })),
    roastFor: array(row.roast_for),
    decaf: row.decaf === true,
  };
}
