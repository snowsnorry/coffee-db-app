import { useState } from "react";
import {
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import type { Kind, Stats } from "../api/catalog";
import { number } from "./format";
import { filtersFor } from "./state";
export function SearchBar({
  kind,
  query,
  onSearch,
  stats,
}: {
  kind: Kind;
  query: string;
  onSearch: (value: string) => void;
  stats?: Stats | undefined;
}) {
  const [value, setValue] = useState(query);
  const coffee = kind === "coffees";
  const placeholder = coffee
    ? "Search coffee, roasters, descriptions"
    : "Search roasters, cities, websites";
  return (
    <div className="search-row">
      <form
        className="catalog-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(value.trim());
        }}
      >
        <MagnifyingGlassIcon size={29} weight="regular" aria-hidden="true" />
        <input
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      <div className="catalog-stats" aria-label="Catalogue statistics">
        {stats ? (
          <>
            <div>
              <strong>{number(coffee ? stats.coffees : stats.roasters)}</strong>{" "}
              {kind}
            </div>
            <p>
              {number(coffee ? stats.roasters : stats.roastersWithCoffee)}{" "}
              {coffee ? "roasters" : "with coffee"} · {number(stats.countries)}{" "}
              countries
            </p>
          </>
        ) : (
          <span>Discover coffee worldwide</span>
        )}
      </div>
    </div>
  );
}
export function ResultsToolbar({
  kind,
  params,
  total,
  onChange,
  onOpenFilters,
}: {
  kind: Kind;
  params: URLSearchParams;
  total?: number | undefined;
  onChange: (params: URLSearchParams) => void;
  onOpenFilters: () => void;
}) {
  const count = filtersFor(kind).reduce(
    (sum, key) => sum + params.getAll(key).length,
    0,
  );
  const sort =
    params.get("sort") ??
    (params.get("q") && kind === "coffees" ? "relevance" : "nameAsc");
  return (
    <div className="results-toolbar">
      <h1 aria-live="polite">
        {total === undefined ? "Discover" : number(total)} {kind}
      </h1>
      <div className="results-controls">
        <button className="mobile-filters" onClick={onOpenFilters}>
          <SlidersHorizontalIcon size={19} />
          Filters{count > 0 && <span>{count}</span>}
        </button>
        <label className="sort-control">
          <span>Sort by</span>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              next.set("sort", event.target.value);
              next.delete("page");
              onChange(next);
            }}
          >
            {kind === "coffees" &&
              (params.get("q") || sort === "relevance") && (
                <option value="relevance">Relevance</option>
              )}
            <option value="nameAsc">Name A–Z</option>
            <option value="nameDesc">Name Z–A</option>
            {kind === "roasters" && (
              <option value="coffeeCount">Most coffees</option>
            )}
          </select>
        </label>
      </div>
    </div>
  );
}
