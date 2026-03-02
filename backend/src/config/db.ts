import { Pool, QueryResultRow } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
  process.exit(1);
});

/** Run a single query on a pool client */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  if (env.NODE_ENV === "development") {
    console.log(`[SQL] ${text.slice(0, 80)} — ${Date.now() - start}ms`);
  }
  return result;
}

/** Run multiple queries in a single transaction */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
