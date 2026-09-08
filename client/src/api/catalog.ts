export type Kind = "coffees" | "roasters";
export type FilterKey =
  "roaster" | "country" | "state" | "city" | "model" | "hasCoffee";
export type RoasterSummary = {
  id: string;
  name: string;
  countryCode: string;
  stateCode: string | null;
  city: string | null;
};
export type Coffee = {
  id: string;
  name: string;
  imageUrl: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  sourceUrl: string | null;
  roaster: RoasterSummary;
};
export type Roaster = RoasterSummary & {
  domain: string;
  websiteUrl: string | null;
  roastingModel: string;
  coffeeCount: number;
};
export type CatalogPage = {
  items: (Coffee | Roaster)[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type FacetOption = { value: string; label: string; count: number };
export type FacetPage = { items: FacetOption[]; hasMore: boolean };
export type Stats = {
  coffees: number;
  roasters: number;
  countries: number;
  roastersWithCoffee: number;
};
export async function fetchJson<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok)
    throw new Error(
      response.status === 400
        ? "These filters could not be read. Clear them and try again."
        : "The catalogue is unavailable right now. Please try again.",
    );
  return response.json() as Promise<T>;
}
