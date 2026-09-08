import { Pool } from "pg";
import { DATABASE_INDEXES, DATABASE_TABLES_SQL } from "./databaseSchema.js";

type SchemaQueryResult = { rows: Array<Record<string, unknown>> };
type SchemaDatabase = {
  connect(): Promise<{
    query(sql: string, values?: unknown[]): Promise<SchemaQueryResult>;
    release(): void;
  }>;
};

const LOCK_KEY_1 = 1668247139;
const LOCK_KEY_2 = 1;
const LOCK_WAIT_MS = 30_000;
const LOCK_RETRY_MS = 250;
const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const ignoreError = () => undefined;

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => {
    process.stderr.write("Database pool connection unavailable\n");
  });
  return pool;
}

async function acquireSchemaLock(
  client: Awaited<ReturnType<SchemaDatabase["connect"]>>,
) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  do {
    const result = await client.query(
      "SELECT pg_try_advisory_lock($1, $2) AS acquired",
      [LOCK_KEY_1, LOCK_KEY_2],
    );
    if (result.rows[0]?.acquired === true) return;
    await wait(LOCK_RETRY_MS);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting for database schema initialization lock");
}

export async function ensureDatabaseSchema(pool: SchemaDatabase) {
  const client = await pool.connect();
  let lockAcquired = false;
  let transactionOpen = false;
  try {
    await acquireSchemaLock(client);
    lockAcquired = true;

    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SET LOCAL statement_timeout = 0");
    await client.query(DATABASE_TABLES_SQL);
    await client.query("COMMIT");
    transactionOpen = false;

    await client.query("SET lock_timeout = '30s'");
    await client.query("SET statement_timeout = 0");
    for (const index of DATABASE_INDEXES) {
      const existing = await client.query(
        `SELECT i.indisvalid AS valid
         FROM pg_class c
         JOIN pg_index i ON i.indexrelid = c.oid
         WHERE c.relnamespace = current_schema()::regnamespace AND c.relname = $1`,
        [index.name],
      );
      if (existing.rows[0]?.valid === true) continue;
      if (existing.rows.length) {
        await client.query(`DROP INDEX CONCURRENTLY ${index.name}`);
      }
      await client.query(index.sql);
    }
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(ignoreError);
    }
    throw error;
  } finally {
    await client.query("RESET lock_timeout").catch(ignoreError);
    await client.query("RESET statement_timeout").catch(ignoreError);
    if (lockAcquired) {
      await client
        .query("SELECT pg_advisory_unlock($1, $2)", [LOCK_KEY_1, LOCK_KEY_2])
        .catch(ignoreError);
    }
    client.release();
  }
}
