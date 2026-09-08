export type CatalogKind = "coffees" | "roasters";
export const FILTERS = [
  "roaster",
  "country",
  "state",
  "city",
  "model",
  "hasCoffee",
] as const;
export type FilterKey = (typeof FILTERS)[number];
export type CatalogQuery = {
  q: string;
  sort: "nameAsc" | "nameDesc" | "relevance" | "coffeeCount";
  page: number;
  pageSize: number;
  filters: Record<FilterKey, string[]>;
};
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
export type CatalogPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export type FacetOption = { value: string; label: string; count: number };
type FacetPage = { items: FacetOption[]; hasMore: boolean };
type Stats = {
  coffees: number;
  roasters: number;
  countries: number;
  roastersWithCoffee: number;
};
export interface CatalogRepository {
  coffees(query: CatalogQuery): Promise<CatalogPage<Coffee>>;
  roasters(query: CatalogQuery): Promise<CatalogPage<Roaster>>;
  facet(
    kind: CatalogKind,
    query: CatalogQuery,
    facet: FilterKey,
    search: string,
    offset: number,
  ): Promise<FacetPage>;
  stats(): Promise<Stats>;
}
