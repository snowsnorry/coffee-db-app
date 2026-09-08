export const DATABASE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS roasters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  canonical_domain TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  state_code CHAR(2),
  website_url TEXT NOT NULL,
  city TEXT,
  address TEXT,
  roasting_model TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT roasters_state_code_format CHECK (
    state_code IS NULL OR state_code ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT roasters_state_code_country CHECK (
    country_code = 'US' OR state_code IS NULL
  )
);

CREATE TABLE IF NOT EXISTS coffee_products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_key CHAR(64) NOT NULL UNIQUE,
  roaster_id BIGINT NOT NULL REFERENCES roasters(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  language_code TEXT,
  image_url TEXT,
  price_amount NUMERIC,
  price_currency CHAR(3),
  canonical_url TEXT NOT NULL UNIQUE,
  alternate_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  platform_product_id TEXT,
  identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coffee_products_price_complete CHECK (
    (price_amount IS NULL AND price_currency IS NULL)
    OR (price_amount IS NOT NULL AND price_currency IS NOT NULL)
  )
);
`;

export const DATABASE_INDEXES = [
  {
    name: "coffee_products_roaster_id_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS coffee_products_roaster_id_idx ON coffee_products (roaster_id)",
  },
  {
    name: "roasters_catalog_search_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_search_idx ON roasters USING gin
      (to_tsvector('simple', display_name || ' ' || coalesce(city, '') || ' ' || canonical_domain))`,
  },
  {
    name: "coffee_products_catalog_search_idx",
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS coffee_products_catalog_search_idx ON coffee_products USING gin
      (to_tsvector('simple', name || ' ' || description))`,
  },
  {
    name: "roasters_catalog_geography_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_geography_idx ON roasters (country_code, state_code, city, id)",
  },
  {
    name: "roasters_catalog_state_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_state_idx ON roasters (state_code, id)",
  },
  {
    name: "roasters_catalog_city_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_city_idx ON roasters (city, id)",
  },
  {
    name: "roasters_catalog_model_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_model_idx ON roasters (roasting_model, id)",
  },
  {
    name: "roasters_catalog_name_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS roasters_catalog_name_idx ON roasters (normalized_name, id)",
  },
  {
    name: "coffee_products_catalog_name_idx",
    sql: "CREATE INDEX CONCURRENTLY IF NOT EXISTS coffee_products_catalog_name_idx ON coffee_products (lower(name), id)",
  },
] as const;
