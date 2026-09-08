import type { FacetOption, FilterKey, RoasterSummary } from "../api/catalog";
const countries = new Intl.DisplayNames(["en"], { type: "region" });
export const countryName = (code: string) => countries.of(code) ?? code;
export const number = (value: number) => value.toLocaleString("en-US");
export const modelNames: Record<string, string> = {
  IN_HOUSE: "In-house",
  SHARED_FACILITY: "Shared facility",
  CONTRACT: "Contract",
  HYBRID: "Hybrid",
  UNKNOWN: "Unknown",
};
const states: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};
export function facetLabel(key: FilterKey, option: FacetOption) {
  if (key === "country") return countryName(option.value);
  if (key === "state") return states[option.value] ?? option.label;
  if (key === "model") return modelNames[option.value] ?? option.label;
  if (key === "hasCoffee")
    return option.value === "yes" ? "With coffee" : "Without coffee";
  return option.label;
}
export function location(roaster: RoasterSummary) {
  return [
    roaster.city,
    roaster.countryCode === "US" ? roaster.stateCode : null,
    countryName(roaster.countryCode),
  ]
    .filter(Boolean)
    .join(", ");
}
export function safeUrl(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function price(amount: string | null, currency: string | null) {
  if (amount === null || currency === null) return "Price unavailable";
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(numeric);
  } catch {
    return `${amount} ${currency}`;
  }
}
