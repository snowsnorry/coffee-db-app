import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { createCatalogRepository } from "../../server/src/catalog/repository.js";
import { parseQuery } from "../../server/src/catalog/validation.js";
import { ensureDatabaseSchema } from "../../server/src/database.js";

test("catalogue SQL against an isolated PostgreSQL fixture schema", async () => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Set TEST_DATABASE_URL to an isolated development database",
  );
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const client = await pool.connect();
  const schema = `catalog_test_${process.pid}_${Date.now()}`;
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    const schemaDatabase = {
      connect: async () => ({
        query: (sql: string, values?: unknown[]) => client.query(sql, values),
        release: () => undefined,
      }),
    };
    await ensureDatabaseSchema(schemaDatabase);
    await ensureDatabaseSchema(schemaDatabase);
    await client.query(`
      INSERT INTO roasters (id, canonical_domain, display_name, normalized_name, country_code, state_code, city, website_url, roasting_model, verified_at, created_at, updated_at)
      OVERRIDING SYSTEM VALUE
      VALUES
        (1, 'alpha.test', 'Alpha Roasters', 'alpha roasters', 'US', 'OR', 'Portland', 'https://alpha.test', 'IN_HOUSE', now(), now(), now()),
        (2, 'beta.test', 'Beta Roasters', 'beta roasters', 'US', 'ME', 'Portland', 'https://beta.test', 'SHARED_FACILITY', now(), now(), now()),
        (3, 'gamma.test', 'Gamma', 'gamma', 'CZ', NULL, NULL, 'https://gamma.test', 'UNKNOWN', now(), now(), now());
      INSERT INTO coffee_products (id, product_key, roaster_id, name, description, image_url, price_amount, price_currency, canonical_url)
      OVERRIDING SYSTEM VALUE
      VALUES
        (9007199254740993, repeat('a', 64), 1, 'Floral', 'Jasmine and peach', NULL, 16.80, 'EUR', 'https://alpha.test/floral'),
        (2, repeat('b', 64), 1, 'Floral', 'Chocolate', NULL, NULL, NULL, 'https://alpha.test/other'),
        (3, repeat('c', 64), 2, 'Bright', 'Floral orange', NULL, 20, 'USD', 'https://beta.test/bright');
    `);
    const indexes = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname LIKE '%_catalog_%' ORDER BY indexname`,
    );
    assert.equal(indexes.rows.length, 8);
    const repo = createCatalogRepository(
      client as unknown as Pick<pg.Pool, "query">,
    );
    const query = (raw: string, kind: "coffees" | "roasters" = "coffees") =>
      parseQuery(new URLSearchParams(raw), kind);
    const first = await repo.coffees(query("pageSize=1"));
    const second = await repo.coffees(query("pageSize=1&page=2"));
    assert.notEqual(first.items[0]?.id, second.items[0]?.id);
    assert.equal(
      (await repo.coffees(query("pageSize=1&page=3"))).items[0]?.id,
      "9007199254740993",
    );
    assert.equal(
      (await repo.coffees(query("q=jasmine"))).items[0]?.priceAmount,
      "16.80",
    );
    assert.equal((await repo.coffees(query("q=alpha"))).total, 2);
    assert.deepEqual(
      (await repo.coffees(query("q=floral"))).items.map((item) => item.id),
      ["2", "9007199254740993", "3"],
    );
    assert.equal((await repo.coffees(query("q=absent"))).total, 0);
    assert.equal(
      (await repo.coffees(query("country=US&state=OR&roaster=1"))).total,
      2,
    );
    assert.equal((await repo.coffees(query("state=OR&state=ME"))).total, 3);
    assert.equal(
      (await repo.roasters(query("hasCoffee=no", "roasters"))).items[0]?.name,
      "Gamma",
    );
    assert.equal(
      (await repo.roasters(query("sort=coffeeCount", "roasters"))).items[0]
        ?.coffeeCount,
      2,
    );
    const cities = await repo.facet(
      "coffees",
      query(""),
      "city",
      "Portland",
      0,
    );
    assert.equal(cities.items.length, 2);
    assert.notEqual(cities.items[0]?.value, cities.items[1]?.value);
    const selectedCity = cities.items[0]!.value;
    const cityQuery = parseQuery(
      new URLSearchParams({ city: selectedCity }),
      "coffees",
    );
    assert.equal((await repo.coffees(cityQuery)).total, cities.items[0]?.count);
    assert.equal(
      (await repo.facet("coffees", cityQuery, "city", "", 0)).items.length,
      2,
    );
    const zeroFacet = await repo.facet(
      "coffees",
      query("q=absent&roaster=1"),
      "roaster",
      "",
      0,
    );
    assert.deepEqual(zeroFacet.items, [
      { value: "1", label: "Alpha Roasters", count: 0 },
    ]);
    assert.equal(
      (await repo.facet("coffees", query(""), "roaster", "%", 0)).items.length,
      0,
    );
    assert.deepEqual(await repo.stats(), {
      coffees: 3,
      roasters: 3,
      countries: 2,
      roastersWithCoffee: 2,
    });
  } finally {
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    client.release();
    await pool.end();
  }
});
