import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import Pagination from "@mui/material/Pagination";
import { InfoIcon, XIcon, CoffeeBeanIcon } from "@phosphor-icons/react";
import type { CatalogPage, Coffee, Kind, Roaster, Stats } from "../api/catalog";
import { CoffeeCards, RoasterTable } from "./Cards";
import { Filters } from "./Filters";
import { number } from "./format";
import {
  catalogUrl,
  clearFilters,
  navigate,
  useCatalogLocation,
} from "./state";
import { ResultsToolbar, SearchBar } from "./Toolbar";
import { useResource } from "./useResource";
function Header({ kind }: { kind: Kind }) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="/coffee"
        onClick={(event) => {
          event.preventDefault();
          navigate("/coffee");
        }}
      >
        <CoffeeBeanIcon size={37} weight="fill" aria-hidden="true" />
        Coffee DB
      </a>
      <nav aria-label="Main navigation">
        {(["coffees", "roasters"] as const).map((tab) => (
          <a
            key={tab}
            aria-current={kind === tab ? "page" : undefined}
            href={catalogUrl(tab)}
            onClick={(event) => {
              event.preventDefault();
              navigate(catalogUrl(tab));
            }}
          >
            {tab === "coffees" ? "Coffee" : "Roasters"}
          </a>
        ))}
      </nav>
    </header>
  );
}
function Results({
  kind,
  resource,
  onClear,
}: {
  kind: Kind;
  resource: ReturnType<typeof useResource<CatalogPage>>;
  onClear: () => void;
}) {
  if (resource.loading)
    return (
      <div className="loading-results" role="status">
        <div className="loading-bar" />
        Loading {kind}…
      </div>
    );
  if (resource.error)
    return (
      <div className="result-message" role="alert">
        <h2>We couldn’t load the catalogue</h2>
        <p>{resource.error}</p>
        <button className="primary-button" onClick={resource.retry}>
          Try again
        </button>
        <button className="text-button" onClick={onClear}>
          Clear search and filters
        </button>
      </div>
    );
  const data = resource.data;
  if (!data?.items.length)
    return (
      <div className="result-message">
        <CoffeeBeanIcon size={42} weight="light" />
        <h2>No {kind} found</h2>
        <p>Try another search or clear your filters.</p>
        <button className="primary-button" onClick={onClear}>
          Clear search and filters
        </button>
      </div>
    );
  return kind === "coffees" ? (
    <CoffeeCards items={data.items as Coffee[]} />
  ) : (
    <RoasterTable items={data.items as Roaster[]} onNavigate={navigate} />
  );
}
function CatalogFooter({
  kind,
  data,
  onPage,
}: {
  kind: Kind;
  data?: CatalogPage | undefined;
  onPage: (page: number) => void;
}) {
  const total = data?.total ?? 0;
  const start = data && total ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? Math.min(data.page * data.pageSize, total) : 0;
  return (
    <footer className="catalog-footer">
      {kind === "coffees" && (
        <p className="price-note">
          <InfoIcon size={20} />
          Prices are snapshots from roaster websites.
        </p>
      )}
      {data && (
        <div className="pagination-row">
          <p>
            Showing {number(start)}–{number(end)} of {number(total)} {kind}
          </p>
          {data.totalPages > 1 && (
            <Pagination
              count={data.totalPages}
              page={data.page}
              onChange={(_event, page) => onPage(page)}
              showFirstButton
              showLastButton
              siblingCount={0}
              boundaryCount={1}
              shape="rounded"
              size="small"
            />
          )}
        </div>
      )}
    </footer>
  );
}
function MobileFilters({
  kind,
  params,
  onApply,
  onClose,
}: {
  kind: Kind;
  params: URLSearchParams;
  onApply: (params: URLSearchParams) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => new URLSearchParams(params));
  return (
    <Dialog
      open
      fullScreen
      onClose={onClose}
      aria-labelledby="mobile-filter-title"
      className="filter-dialog"
    >
      <div className="dialog-heading">
        <h2 id="mobile-filter-title">Refine your search</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close filters"
        >
          <XIcon size={25} />
        </button>
      </div>
      <div className="dialog-body">
        <Filters kind={kind} params={draft} onChange={setDraft} />
      </div>
      <div className="dialog-actions">
        <button
          className="clear-button"
          onClick={() => setDraft(clearFilters(draft, kind))}
        >
          Clear all filters
        </button>
        <button className="primary-button" onClick={() => onApply(draft)}>
          Apply filters
        </button>
      </div>
    </Dialog>
  );
}
export default function Catalog() {
  const { kind, params } = useCatalogLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resource = useResource<CatalogPage>(`/api/${kind}?${params}`);
  const stats = useResource<Stats>("/api/catalog/stats");
  const change = (next: URLSearchParams) => navigate(catalogUrl(kind, next));
  const search = (q: string) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (q) next.set("q", q);
    else next.delete("q");
    if (kind === "coffees") next.set("sort", q ? "relevance" : "nameAsc");
    change(next);
  };
  const page = (value: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    change(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <>
      <Header kind={kind} />
      <div className="catalog-layout">
        <aside className="desktop-sidebar" aria-label="Catalogue filters">
          <Filters kind={kind} params={params} onChange={change} />
        </aside>
        <main className="catalog-main" id="main-content">
          <SearchBar
            key={`${kind}:${params.get("q")}`}
            kind={kind}
            query={params.get("q") ?? ""}
            onSearch={search}
            stats={stats.data}
          />
          <ResultsToolbar
            kind={kind}
            params={params}
            total={resource.data?.total}
            onChange={change}
            onOpenFilters={() => setFiltersOpen(true)}
          />
          <Results
            kind={kind}
            resource={resource}
            onClear={() => change(new URLSearchParams())}
          />
          <CatalogFooter kind={kind} data={resource.data} onPage={page} />
        </main>
      </div>
      {filtersOpen && (
        <MobileFilters
          key={kind}
          kind={kind}
          params={params}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            next.delete("page");
            change(next);
            setFiltersOpen(false);
          }}
        />
      )}
    </>
  );
}
