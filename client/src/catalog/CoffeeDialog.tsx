import Dialog from "@mui/material/Dialog";
import useMediaQuery from "@mui/material/useMediaQuery";
import { XIcon } from "@phosphor-icons/react";
import type { Coffee, CoffeeDetail } from "../api/catalog";
import { ExternalLink, ProductImage } from "./Cards";
import { countryName, location, price } from "./format";
import { useResource } from "./useResource";
const continents: Record<string, string> = {
  africa: "Africa",
  asia: "Asia",
  europe: "Europe",
  north_america: "North America",
  south_america: "South America",
  americas: "Americas",
  oceania: "Oceania",
  antarctica: "Antarctica",
};
const roastNames: Record<string, string> = {
  espresso: "Espresso",
  filter: "Filter",
  omni: "Omni",
};
function Details({ coffee }: { coffee: CoffeeDetail }) {
  const attributes = [
    [
      "Origin",
      [
        ...(coffee.originCountryCodes?.map(countryName) ?? []),
        ...(coffee.originContinents?.map(
          (value) => continents[value] ?? value,
        ) ?? []),
      ].join(", "),
    ],
    ["Variety", coffee.varieties.map((item) => item.label).join(", ")],
    ...(coffee.varietyUnresolved?.length
      ? [["Unresolved variety", coffee.varietyUnresolved.join(", ")]]
      : []),
    [
      "Roast for",
      coffee.roastFor?.map((value) => roastNames[value] ?? value).join(", "),
    ],
  ];
  return (
    <>
      <dl className="coffee-attributes">
        {attributes.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "Not specified"}</dd>
          </div>
        ))}
      </dl>
      <section
        className="coffee-description"
        aria-labelledby="coffee-description-title"
      >
        <h3 id="coffee-description-title">Description</h3>
        <p dir="auto">
          {coffee.description.trim() || "Description unavailable"}
        </p>
      </section>
    </>
  );
}
export function CoffeeDialog({
  coffee,
  onClose,
}: {
  coffee: Coffee;
  onClose: () => void;
}) {
  const resource = useResource<CoffeeDetail>(`/api/coffees/${coffee.id}`);
  const fullScreen = useMediaQuery("(max-width: 899px)");
  const current = resource.data ?? coffee;
  return (
    <Dialog
      open
      fullScreen={fullScreen}
      maxWidth={false}
      scroll="paper"
      onClose={onClose}
      aria-labelledby="coffee-detail-title"
      className="coffee-dialog"
    >
      <div className="coffee-dialog-heading">
        <span>Coffee details</span>
        <button
          autoFocus
          className="icon-button"
          aria-label="Close coffee details"
          onClick={onClose}
        >
          <XIcon size={25} />
        </button>
      </div>
      <div className="coffee-dialog-body">
        <div className="coffee-detail-summary">
          <ProductImage key={current.imageUrl} coffee={current} />
          <div className="coffee-detail-title">
            <h2 id="coffee-detail-title" dir="auto">
              {current.name}{" "}
              {resource.data?.decaf && (
                <span className="decaf-tag" dir="ltr">
                  decaf
                </span>
              )}
            </h2>
            <p>{current.roaster.name}</p>
            <p className="muted">{location(current.roaster)}</p>
            <p className="price">
              {price(current.priceAmount, current.priceCurrency)}
            </p>
            <ExternalLink url={current.sourceUrl}>View source</ExternalLink>
          </div>
        </div>
        {resource.loading && (
          <p className="detail-status" role="status">
            Loading coffee details…
          </p>
        )}
        {resource.error && (
          <div className="detail-status" role="alert">
            <p>{resource.error}</p>
            <button className="text-button" onClick={resource.retry}>
              Try again
            </button>
          </div>
        )}
        {!resource.loading && !resource.error && resource.data && (
          <Details coffee={resource.data} />
        )}
      </div>
    </Dialog>
  );
}
