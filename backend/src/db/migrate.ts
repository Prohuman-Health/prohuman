import fs from "fs";
import path from "path";
import { pool } from "../config/db";
import dotenv from "dotenv";
dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query<{ filename: string }>(
      "SELECT filename FROM _migrations ORDER BY id"
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO _migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`  ↑ ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${file}:`, err);
        process.exit(1);
      }
    }
    console.log("Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
