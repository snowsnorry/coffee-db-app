import { createDatabase, ensureDatabaseSchema } from "./database.js";
import { createCatalogRepository } from "./catalog/repository.js";
import { createApp } from "./appFactory.js";

const DEFAULT_PORT = 3000;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const pool = process.env.DATABASE_URL
  ? createDatabase(process.env.DATABASE_URL)
  : undefined;
const schemaPool =
  pool && process.env.DATABASE_SCHEMA_URL
    ? createDatabase(process.env.DATABASE_SCHEMA_URL)
    : pool;
const app = createApp(pool ? { catalog: createCatalogRepository(pool) } : {});

async function start() {
  if (schemaPool) await ensureDatabaseSchema(schemaPool);
  if (schemaPool && schemaPool !== pool) await schemaPool.end();

  const server = app.listen(port, () => {
    process.stdout.write(
      `Coffee DB server listening on http://localhost:${port}\n`,
    );
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      server.close(() => {
        void pool?.end();
      });
    });
  }
}

void start().catch(async () => {
  process.stderr.write("Application startup failed\n");
  await Promise.allSettled([
    pool?.end(),
    schemaPool && schemaPool !== pool ? schemaPool.end() : undefined,
  ]);
  process.exitCode = 1;
});
