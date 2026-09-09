import { useEffect, useSyncExternalStore } from "react";
import type { FilterKey, Kind } from "../api/catalog";
const storageKey = (kind: Kind) => `coffee-db:filters:${kind}`;
function persistedParams(kind: Kind, params: URLSearchParams) {
  const persisted = new URLSearchParams();
  for (const key of filtersFor(kind)) {
    for (const value of params.getAll(key)) persisted.append(key, value);
  }
  const query = params.get("q");
  if (query) persisted.set("q", query);
  const sort = params.get("sort");
  if (sort) persisted.set("sort", sort);
  return persisted;
}
export function storedFilters(kind: Kind) {
  try {
    return persistedParams(
      kind,
      new URLSearchParams(window.localStorage.getItem(storageKey(kind)) ?? ""),
    );
  } catch {
    return new URLSearchParams();
  }
}
export function persistFilters(kind: Kind, params: URLSearchParams) {
  try {
    window.localStorage.setItem(
      storageKey(kind),
      persistedParams(kind, params).toString(),
    );
  } catch {
    // The catalogue remains usable when browser storage is unavailable.
  }
}
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
  const urlParams = new URLSearchParams(href.split("?")[1]);
  const restored = urlParams.size === 0;
  const params = restored ? storedFilters(kind) : urlParams;
  const query = params.toString();
  useEffect(() => {
    persistFilters(kind, params);
    if (!restored || !query) return;
    window.history.replaceState(null, "", catalogUrl(kind, params));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [kind, params, query, restored]);
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
