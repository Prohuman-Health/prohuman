import app from "./app";
import { pool } from "./config/db";
import { env } from "./config/env";
import { whatsappAuth } from "./utils/whatsappAuth";
import net from "net";

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

  // Auto-reconnect WhatsApp if saved credentials exist
  whatsappAuth.connect().catch((err) =>
    console.warn("⚠️  WhatsApp auto-connect failed (will reconnect when QR is requested):", err instanceof Error ? err.message : err)
  );

  const bindPort = (retries = 3, delay = 1500): Promise<ReturnType<typeof app.listen>> =>
    new Promise((resolve, reject) => {
      const server = app.listen(env.PORT, () => {
        console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
        console.log(`   API: http://localhost:${env.PORT}/api/v1`);
        resolve(server);
      });
      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE" && retries > 0) {
          console.log(`⚠️  Port ${env.PORT} in use, retrying in ${delay}ms… (${retries} attempts left)`);
          server.close();
          setTimeout(() => bindPort(retries - 1, delay).then(resolve).catch(reject), delay);
        } else {
          reject(err);
        }
      });
    });

  const server = await bindPort();

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
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });
}

start();
