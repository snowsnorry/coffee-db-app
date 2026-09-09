import { useState } from "react";
import {
  ArrowSquareOutIcon,
  CaretRightIcon,
  ImageBrokenIcon,
} from "@phosphor-icons/react";
import type { Coffee, Roaster } from "../api/catalog";
import { catalogUrl } from "./state";
import { location, modelNames, number, price, safeUrl } from "./format";
function ExternalLink({
  url,
  children,
  className,
}: {
  url: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const href = safeUrl(url);
  return href ? (
    <a
      className={className ?? "source-link"}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowSquareOutIcon size={18} aria-label="opens in a new tab" />
    </a>
  ) : (
    <span className="muted">Link unavailable</span>
  );
}
function ProductImage({ coffee }: { coffee: Coffee }) {
  const [failed, setFailed] = useState(false);
  const url = safeUrl(coffee.imageUrl);
  return (
    <div className="product-image">
      {url && !failed ? (
        <img
          src={url}
          alt={coffee.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="image-unavailable">
          <ImageBrokenIcon size={36} weight="light" />
          <span>Image unavailable</span>
        </div>
      )}
    </div>
  );
}
export function CoffeeCards({ items }: { items: Coffee[] }) {
  return (
    <div className="coffee-grid">
      {items.map((coffee) => (
        <article className="coffee-card" key={coffee.id}>
          <ProductImage coffee={coffee} />
          <h2>{coffee.name}</h2>
          <p>{coffee.roaster.name}</p>
          <p className="coffee-location">{location(coffee.roaster)}</p>
          <p
            className={`price ${coffee.priceAmount === null ? "missing-price" : ""}`}
          >
            {price(coffee.priceAmount, coffee.priceCurrency)}
          </p>
          <ExternalLink url={coffee.sourceUrl}>View source</ExternalLink>
        </article>
      ))}
    </div>
  );
}
export function RoasterTable({
  items,
  onNavigate,
}: {
  items: Roaster[];
  onNavigate: (url: string) => void;
}) {
  return (
    <div className="roaster-list">
      <table>
        <thead>
          <tr>
            {[
              "Roaster",
              "Location",
              "Roasting model",
              "Coffees",
              "Website",
              "",
            ].map((heading, index) => (
              <th scope="col" key={index}>
                {heading || <span className="sr-only">Browse</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((roaster) => (
            <tr key={roaster.id}>
              <th scope="row">{roaster.name}</th>
              <td data-label="Location">{location(roaster)}</td>
              <td data-label="Roasting model">
                {modelNames[roaster.roastingModel] ?? "Unknown"}
              </td>
              <td data-label="Coffees">
                {number(roaster.coffeeCount)} coffees
              </td>
              <td data-label="Website">
                <ExternalLink className="website-link" url={roaster.websiteUrl}>
                  {roaster.domain}
                </ExternalLink>
              </td>
              <td>
                {roaster.coffeeCount > 0 ? (
                  <a
                    className="view-coffees"
                    href={catalogUrl(
                      "coffees",
                      new URLSearchParams({ roaster: roaster.id }),
                    )}
                    onClick={(event) => {
                      if (
                        !event.ctrlKey &&
                        !event.metaKey &&
                        !event.shiftKey &&
                        !event.altKey
                      ) {
                        event.preventDefault();
                        onNavigate(event.currentTarget.href);
                      }
                    }}
                  >
                    <span>
                      View{" "}
                      <span className="mobile-coffee-count">
                        {number(roaster.coffeeCount)}
                      </span>{" "}
                      coffees
                    </span>
                    <CaretRightIcon
                      className="mobile-coffee-arrow"
                      size={18}
                      aria-hidden="true"
                    />
                  </a>
                ) : (
                  <span className="no-coffees">No coffees listed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
