import app from "./app";
import { pool } from "./config/db";
import { env } from "./config/env";

async function start() {
  // Verify DB connection
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`   API: http://localhost:${env.PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      console.log("Database pool closed. Bye.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });
}

start();
