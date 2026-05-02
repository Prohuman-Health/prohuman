/**
 * Standalone Baileys runner — no DB / Express needed.
 * Usage:  npx tsx scripts/wa-standalone.ts
 *
 * Commands (type in terminal after QR is scanned):
 *   status          — show connection status
 *   send <phone> <message>  — send a WhatsApp message
 *                             phone must be E.164, e.g. +919876543210
 *   quit            — exit
 */

import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";

const AUTH_DIR = path.resolve(process.cwd(), ".wa-auth");

let connected = false;
let socket: ReturnType<typeof makeWASocket> | null = null;

async function start() {
  await fs.mkdir(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  socket = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: ["ProHuman", "Chrome", "1.0.0"],
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    if (update.qr) {
      console.log("\n--- Scan the QR code below with WhatsApp ---\n");
      const text = await QRCode.toString(update.qr, { type: "terminal", small: true });
      console.log(text);
      console.log("\n(QR expires in ~60s — if it expires, type 'quit' and re-run)\n");
    }

    if (update.connection === "open") {
      connected = true;
      console.log("\n✅  WhatsApp connected:", socket?.user?.id);
      console.log('Type  send <phone> <message>  to send a message, or  status  to check.\n');
    }

    if (update.connection === "close") {
      connected = false;
      const code = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("\n❌  Logged out. Delete .wa-auth/ and re-run to generate a new QR.\n");
        process.exit(0);
      } else {
        console.log("\n⚠️  Disconnected (code", code, "). Reconnecting...\n");
        setTimeout(() => start(), 3000);
      }
    }
  });
}

start().catch(console.error);

// ── CLI ──────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.setPrompt("> ");
rl.prompt();

rl.on("line", async (line) => {
  const parts = line.trim().split(/\s+/);
  const cmd = parts[0];

  if (cmd === "quit" || cmd === "exit") {
    console.log("Bye.");
    process.exit(0);
  }

  if (cmd === "status") {
    console.log("connected:", connected, socket?.user?.id ?? "(none)");
  } else if (cmd === "send") {
    if (!connected || !socket) {
      console.log("Not connected yet — scan the QR first.");
    } else if (parts.length < 3) {
      console.log("Usage: send <phone_e164> <message text...>");
    } else {
      const phone = parts[1].replace(/[^\d]/g, "");
      const text = parts.slice(2).join(" ");
      const jid = `${phone}@s.whatsapp.net`;
      try {
        await socket.sendMessage(jid, { text });
        console.log(`✅  Sent to ${jid}: "${text}"`);
      } catch (err) {
        console.error("Send failed:", err);
      }
    }
  } else if (cmd) {
    console.log("Commands: status | send <phone> <message> | quit");
  }

  rl.prompt();
});
