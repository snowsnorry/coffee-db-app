import { useSyncExternalStore } from "react";
import type { FilterKey, Kind } from "../api/catalog";
const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
export function navigate(url: string) {
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function useCatalogLocation() {
  const href = useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.search,
  );
  const kind: Kind = href.startsWith("/roasters") ? "roasters" : "coffees";
  const params = new URLSearchParams(href.split("?")[1]);
  return { kind, params };
}
export function catalogUrl(kind: Kind, params = new URLSearchParams()) {
  const query = params.toString();
  return `${kind === "coffees" ? "/coffee" : "/roasters"}${query ? `?${query}` : ""}`;
}
export const filtersFor = (kind: Kind): FilterKey[] =>
  kind === "coffees"
    ? ["roaster", "country", "state", "city"]
    : ["country", "state", "city", "model", "hasCoffee"];
export function toggleFilter(
  params: URLSearchParams,
  key: FilterKey,
  value: string,
) {
  const next = new URLSearchParams(params);
  const values = next.getAll(key);
  next.delete(key);
  for (const item of values.filter((item) => item !== value))
    next.append(key, item);
  if (!values.includes(value)) next.append(key, value);
  next.delete("page");
  return next;
}
export function clearFilters(params: URLSearchParams, kind: Kind) {
  const next = new URLSearchParams(params);
  for (const key of filtersFor(kind)) next.delete(key);
  next.delete("page");
  return next;
}
