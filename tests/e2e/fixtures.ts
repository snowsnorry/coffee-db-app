import type {
  CatalogKind,
  CatalogQuery,
  CatalogRepository,
  Coffee,
  FilterKey,
  Roaster,
} from "../../server/src/catalog/types.js";
const roasters: Roaster[] = Array.from({ length: 25 }, (_, i) => ({
  id: String(i + 1),
  name:
    i === 0
      ? "Alpha Roasters"
      : i === 1
        ? "Beta Roasters"
        : `Roaster ${String(i + 1).padStart(2, "0")}`,
  countryCode: i % 2 ? "CZ" : "US",
  stateCode: i % 2 ? null : "OR",
  city: i % 2 ? "Prague" : "Portland",
  domain: `roaster${i + 1}.example`,
  websiteUrl: `https://roaster${i + 1}.example`,
  roastingModel: i % 2 ? "UNKNOWN" : "IN_HOUSE",
  coffeeCount: i < 2 ? 30 : 0,
}));
const coffees: Coffee[] = Array.from({ length: 60 }, (_, i) => ({
  id: String(i + 1),
  name: `${i % 2 ? "Chocolate" : "Floral"} ${String(i + 1).padStart(2, "0")}`,
  imageUrl: null,
  priceAmount: i % 3 ? "16.80" : null,
  priceCurrency: i % 3 ? "EUR" : null,
  sourceUrl: `https://roaster${(i % 2) + 1}.example/coffee/${i + 1}`,
  roaster: roasters[i % 2]!,
}));
const owner = (item: Coffee | Roaster) =>
  "roaster" in item ? (item.roaster as Roaster) : item;
function value(item: Coffee | Roaster, key: FilterKey): string {
  const r = owner(item);
  const values = {
    roaster: r.id,
    country: r.countryCode,
    state: r.stateCode ?? "",
    city: JSON.stringify([r.countryCode, r.stateCode ?? "", r.city]),
    model: r.roastingModel,
    hasCoffee: r.coffeeCount > 0 ? "yes" : "no",
  };
  return values[key];
}
function matches(
  item: Coffee | Roaster,
  query: CatalogQuery,
  excluded?: FilterKey,
) {
  const text =
    `${item.name} ${owner(item).name} ${owner(item).city} ${owner(item).domain}`.toLowerCase();
  return (
    text.includes(query.q.toLowerCase()) &&
    Object.entries(query.filters).every(
      ([key, selected]) =>
        key === excluded ||
        !selected.length ||
        selected.includes(value(item, key as FilterKey)),
    )
  );
}
function list<T extends Coffee | Roaster>(items: T[], query: CatalogQuery) {
  const filtered = items
    .filter((item) => matches(item, query))
    .sort((a, b) => {
      if (query.sort === "coffeeCount")
        return (
          owner(b).coffeeCount - owner(a).coffeeCount ||
          Number(a.id) - Number(b.id)
        );
      return (
        a.name.localeCompare(b.name) * (query.sort === "nameDesc" ? -1 : 1) ||
        Number(a.id) - Number(b.id)
      );
    });
  const totalPages = Math.ceil(filtered.length / query.pageSize);
  const page = Math.min(query.page, Math.max(totalPages, 1));
  return {
    items: filtered.slice((page - 1) * query.pageSize, page * query.pageSize),
    total: filtered.length,
    page,
    pageSize: query.pageSize,
    totalPages,
  };
}
function label(item: Coffee | Roaster, key: FilterKey) {
  if (key === "roaster") return owner(item).name;
  if (key === "city") return `${owner(item).city}, ${owner(item).countryCode}`;
  return value(item, key);
}
function facet(
  kind: CatalogKind,
  query: CatalogQuery,
  key: FilterKey,
  search: string,
  offset: number,
) {
  const items = kind === "coffees" ? coffees : roasters;
  const options = new Map<
    string,
    { value: string; label: string; count: number }
  >();
  for (const item of items) {
    const id = value(item, key);
    if (!id) continue;
    if (!matches(item, query, key) && !query.filters[key].includes(id))
      continue;
    const option = options.get(id) ?? {
      value: id,
      label: label(item, key),
      count: 0,
    };
    if (matches(item, query, key)) option.count++;
    options.set(id, option);
  }
  const filtered = [...options.values()]
    .filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        query.filters[key].includes(item.value),
    )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return {
    items: filtered.slice(offset, offset + 20),
    hasMore: filtered.length > offset + 20,
  };
}
export const fixtureRepository: CatalogRepository = {
  coffees: async (query) => list(coffees, query),
  roasters: async (query) => list(roasters, query),
  facet: async (...args) => facet(...args),
  stats: async () => ({
    coffees: 60,
    roasters: 25,
    countries: 2,
    roastersWithCoffee: 2,
  }),
};
