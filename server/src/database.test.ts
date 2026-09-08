import { describe, expect, it, vi } from "vitest";
const on = vi.fn();
vi.mock("pg", () => ({
  Pool: class {
    on = on;
  },
}));
import { createDatabase, ensureDatabaseSchema } from "./database.js";
import { DATABASE_INDEXES, DATABASE_TABLES_SQL } from "./databaseSchema.js";
describe("database pool", () => {
  it("registers a safe idle error handler", () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    expect(createDatabase("postgresql://localhost/test")).toBeDefined();
    expect(on).toHaveBeenCalledWith("error", expect.any(Function));
    on.mock.calls[0]?.[1](new Error("secret"));
    expect(write).toHaveBeenCalledWith(
      "Database pool connection unavailable\n",
    );
    write.mockRestore();
  });

  it("creates tables and concurrent indexes before releasing the client", async () => {
    const query = vi.fn().mockImplementation((sql: string) =>
      Promise.resolve({
        rows: sql.startsWith("SELECT pg_try_advisory_lock")
          ? [{ acquired: true }]
          : [],
      }),
    );
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    };

    await ensureDatabaseSchema(pool);

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(query).toHaveBeenCalledWith(DATABASE_TABLES_SQL);
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(query).toHaveBeenCalledWith(DATABASE_INDEXES[0].sql);
    expect(query).toHaveBeenCalledWith(
      "SELECT pg_advisory_unlock($1, $2)",
      expect.any(Array),
    );
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the client when schema creation fails", async () => {
    const error = new Error("database detail");
    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.startsWith("SELECT pg_try_advisory_lock")) {
        return Promise.resolve({ rows: [{ acquired: true }] });
      }
      if (sql === DATABASE_TABLES_SQL) return Promise.reject(error);
      return Promise.resolve({ rows: [] });
    });
    const release = vi.fn();

    await expect(
      ensureDatabaseSchema({
        connect: vi.fn().mockResolvedValue({ query, release }),
      }),
    ).rejects.toBe(error);

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rebuilds an invalid concurrent index and keeps valid indexes", async () => {
    const invalid = DATABASE_INDEXES[0];
    const valid = DATABASE_INDEXES[1];
    const query = vi
      .fn()
      .mockImplementation((sql: string, values?: unknown[]) => {
        if (sql.startsWith("SELECT pg_try_advisory_lock")) {
          return Promise.resolve({ rows: [{ acquired: true }] });
        }
        if (sql.includes("FROM pg_class")) {
          return Promise.resolve({
            rows: [{ valid: values?.[0] !== invalid.name }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

    await ensureDatabaseSchema({
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    });

    expect(query).toHaveBeenCalledWith(
      `DROP INDEX CONCURRENTLY ${invalid.name}`,
    );
    expect(query).toHaveBeenCalledWith(invalid.sql);
    expect(query).not.toHaveBeenCalledWith(valid.sql);
  });

  it("bounds the wait for another schema initializer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const query = vi.fn().mockResolvedValue({ rows: [{ acquired: false }] });
    const release = vi.fn();
    const initialization = ensureDatabaseSchema({
      connect: vi.fn().mockResolvedValue({ query, release }),
    });
    const rejection = expect(initialization).rejects.toThrow(
      "Timed out waiting for database schema initialization lock",
    );

    await vi.advanceTimersByTimeAsync(30_000);

    await rejection;
    expect(release).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
