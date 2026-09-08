import { useState } from "react";
import type { FacetOption, FacetPage, FilterKey, Kind } from "../api/catalog";
import { facetLabel } from "./format";
import { useResource } from "./useResource";
export function useFacet(
  kind: Kind,
  params: URLSearchParams,
  facet: FilterKey,
) {
  const [search, updateSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [previous, setPrevious] = useState<FacetOption[]>([]);
  const request = new URLSearchParams(params);
  request.delete("page");
  request.delete("sort");
  request.set("facet", facet);
  request.set("offset", String(offset));
  // Country/state labels are localized on the client; fetch and filter their small dictionaries locally.
  const localSearch = facet === "country" || facet === "state";
  if (!localSearch) request.set("search", search);
  const resource = useResource<FacetPage>(
    `/api/${kind}/facets?${request}`,
    true,
  );
  const selected = params.getAll(facet);
  const options = [
    ...new Map(
      [...previous, ...(resource.data?.items ?? [])].map((item) => [
        item.value,
        item,
      ]),
    ).values(),
  ];
  const matching = options.filter(
    (item) =>
      selected.includes(item.value) ||
      facetLabel(facet, item).toLowerCase().includes(search.toLowerCase()),
  );
  const visible =
    expanded || search
      ? matching
      : matching.filter(
          (item, i) =>
            i < (facet === "roaster" ? 8 : 5) || selected.includes(item.value),
        );
  const loadMore = () => {
    setExpanded(true);
    if (expanded && resource.data?.hasMore) {
      setPrevious(options);
      setOffset((value) => value + 20);
    }
  };
  const setSearch = (value: string) => {
    updateSearch(value);
    setOffset(0);
    setPrevious([]);
    setExpanded(true);
  };
  return { search, setSearch, resource, matching, visible, selected, loadMore };
}
