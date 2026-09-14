import { MagnifyingGlassIcon, CaretDownIcon } from "@phosphor-icons/react";
import type { FacetOption, FilterKey, Kind } from "../api/catalog";
import { facetLabel, number } from "./format";
import { clearFilters, filtersFor, toggleFilter } from "./state";
import { useFacet } from "./useFacet";

const labels: Record<FilterKey, string> = {
  origin: "Origin",
  variety: "Variety",
  roastFor: "Roast for",
  decaf: "Decaf",
  roaster: "Roaster",
  country: "Country",
  state: "State",
  city: "City",
  model: "Roasting model",
  hasCoffee: "Has coffee",
};
const placeholders: Record<FilterKey, string> = {
  origin: "Search origins",
  variety: "Search varieties",
  roastFor: "Search roast purpose",
  decaf: "Search decaf",
  roaster: "Search roasters",
  country: "Search countries",
  state: "Search states",
  city: "Search cities",
  model: "Search models",
  hasCoffee: "Search availability",
};
type Props = {
  kind: Kind;
  params: URLSearchParams;
  onChange: (params: URLSearchParams) => void;
};
function FilterOptions({
  items,
  facet,
  selected,
  onToggle,
}: {
  items: FacetOption[];
  facet: FilterKey;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (facet === "origin")
    return (
      <div className="origin-options">
        {[
          { title: "", prefix: "__empty__" },
          { title: "Continents", prefix: "continent:" },
          { title: "Countries", prefix: "country:" },
        ].map((group) => {
          const options = items.filter((item) =>
            item.value.startsWith(group.prefix),
          );
          return options.length ? (
            <div key={group.prefix}>
              {group.title && <h4>{group.title}</h4>}
              <FilterOptions
                items={options}
                facet="variety"
                selected={selected}
                onToggle={onToggle}
              />
            </div>
          ) : null;
        })}
      </div>
    );
  return (
    <div className="filter-options">
      {items.map((option) => (
        <label className="filter-option" key={option.value}>
          <input
            type="checkbox"
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
          />
          <span
            className={
              option.value === "__empty__" ? "unspecified-option" : undefined
            }
          >
            {facetLabel(facet, option)}
          </span>
          <span className="facet-count">{number(option.count)}</span>
        </label>
      ))}
    </div>
  );
}
function FacetGroup({
  kind,
  params,
  onChange,
  facet,
}: Props & { facet: FilterKey }) {
  const { search, setSearch, resource, matching, visible, selected, loadMore } =
    useFacet(kind, params, facet);
  return (
    <section className="filter-group" aria-label={labels[facet]}>
      <h3>{labels[facet]}</h3>
      {!["model", "hasCoffee", "decaf", "roastFor"].includes(facet) && (
        <label className="facet-search">
          <MagnifyingGlassIcon size={17} aria-hidden="true" />
          <input
            aria-label={placeholders[facet]}
            placeholder={placeholders[facet]}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </label>
      )}
      <FilterOptions
        items={visible}
        facet={facet}
        selected={selected}
        onToggle={(value) => onChange(toggleFilter(params, facet, value))}
      />
      {resource.loading && (
        <p className="facet-status" role="status">
          Loading options…
        </p>
      )}
      {resource.error && (
        <button className="text-button" onClick={resource.retry}>
          Retry options
        </button>
      )}
      {!resource.loading && !resource.error && matching.length === 0 && (
        <p className="facet-status">No matching options</p>
      )}
      {(matching.length > visible.length || resource.data?.hasMore) && (
        <button
          className="show-more"
          onClick={loadMore}
          disabled={resource.loading}
        >
          Show more <CaretDownIcon size={15} />
        </button>
      )}
    </section>
  );
}
function withoutFacet(params: URLSearchParams, facet: FilterKey) {
  const result = new URLSearchParams(params);
  result.delete(facet);
  return result.toString();
}
export function Filters({ kind, params, onChange }: Props) {
  const base = new URLSearchParams(params);
  base.delete("page");
  base.delete("sort");
  return (
    <div className="filters-content">
      <div className="filters-heading">
        <h2>Filters</h2>
        <button
          className="clear-button"
          onClick={() => onChange(clearFilters(params, kind))}
        >
          Clear all
        </button>
      </div>
      {kind === "roasters" && (
        <p className="filter-hint">Location of the roaster</p>
      )}
      {filtersFor(kind).map((facet) => (
        <div key={facet}>
          {kind === "coffees" && facet === "roaster" && (
            <h2 className="filter-section-title">Roaster location</h2>
          )}
          {facet === "origin" && (
            <p className="filter-hint">
              Countries or continents of the coffee. A continent includes its
              countries.
            </p>
          )}
          <FacetGroup
            key={`${facet}:${withoutFacet(base, facet)}`}
            facet={facet}
            kind={kind}
            params={params}
            onChange={onChange}
          />
        </div>
      ))}
    </div>
  );
}
