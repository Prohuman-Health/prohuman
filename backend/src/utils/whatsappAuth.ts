import fs from "fs/promises";
import path from "path";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";

export type WhatsAppAuthStatus = {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  reconnect_attempt: number;
  qr_available: boolean;
  qr_data_url: string | null;
  qr_expires_at: string | null;
  connected_jid: string | null;
  connected_whatsapp_number: string | null;
  last_error: string | null;
  updated_at: string;
};

const QR_TTL_MS = 60 * 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 15000;

class WhatsAppAuthManager {
  private socket: WASocket | null = null;
  private connecting = false;
  private connected = false;
  private reconnecting = false;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private qrDataUrl: string | null = null;
  private qrExpiresAtMs: number | null = null;
  private connectedJid: string | null = null;
  private connectedWhatsappNumber: string | null = null;
  private lastError: string | null = null;
  private updatedAt = new Date();

  constructor(private readonly authDir: string) {}

  private touch() {
    this.updatedAt = new Date();
  }

  private clearQr() {
    this.qrDataUrl = null;
    this.qrExpiresAtMs = null;
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetReconnectState() {
    this.reconnecting = false;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
  }

  private extractPhoneNumberFromJid(jid: string | null): string | null {
    if (!jid) return null;
    const userPart = jid.split("@")[0]?.split(":")[0] ?? "";
    const digits = userPart.replace(/\D/g, "");
    if (!digits) return null;
    return `+${digits}`;
  }

  private async ensureAuthDir() {
    await fs.mkdir(this.authDir, { recursive: true });
  }

  private async initSocket() {
    if (this.socket || this.connecting) return;

    this.connecting = true;
    this.connected = false;
    this.reconnecting = this.reconnectAttempt > 0;
    this.lastError = null;
    this.touch();

    await this.ensureAuthDir();
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      browser: ["ProHuman", "Chrome", "1.0.0"],
    });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async (update) => {
      if (update.qr) {
        this.qrDataUrl = await QRCode.toDataURL(update.qr, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 300,
        });
        this.qrExpiresAtMs = Date.now() + QR_TTL_MS;
        this.connected = false;
        this.connecting = true;
        this.reconnecting = false;
        this.lastError = null;
        this.touch();
      }

      if (update.connection === "open") {
        this.clearReconnectTimer();
        this.resetReconnectState();
        this.connected = true;
        this.connecting = false;
        this.clearQr();
        this.connectedJid = socket.user?.id ?? null;
        this.connectedWhatsappNumber = this.extractPhoneNumberFromJid(this.connectedJid);
        this.lastError = null;
        this.touch();
      }

      if (update.connection === "close") {
        this.connected = false;
        this.connecting = false;
        this.connectedJid = null;
        this.connectedWhatsappNumber = null;

        const statusCode =
          (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode ??
          DisconnectReason.connectionClosed;

        if (statusCode === DisconnectReason.loggedOut) {
          this.resetReconnectState();
          this.lastError = "WhatsApp session logged out. Generate a new QR to reconnect.";
          await this.resetAuthState();
        } else {
          this.socket = null;
          if (this.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempt += 1;
            this.reconnecting = true;
            const delayMs = Math.min(
              RECONNECT_BASE_DELAY_MS * this.reconnectAttempt,
              RECONNECT_MAX_DELAY_MS
            );
            this.lastError = `WhatsApp disconnected. Reconnect attempt ${this.reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS} in ${Math.floor(delayMs / 1000)}s.`;
            this.clearReconnectTimer();
            this.reconnectTimer = setTimeout(() => {
              this.initSocket().catch((err) => {
                this.lastError = `Reconnect failed: ${err instanceof Error ? err.message : "unknown error"}`;
                this.touch();
              });
            }, delayMs);
          } else {
            this.reconnecting = false;
            this.lastError = "WhatsApp disconnected. Auto-reconnect exhausted, generate a new QR to reconnect.";
          }
        }

        this.touch();
      }
    });

    this.socket = socket;
  }

  private qrIsFresh() {
    return !!this.qrDataUrl && !!this.qrExpiresAtMs && this.qrExpiresAtMs > Date.now();
  }

  private async waitForQr(timeoutMs = 15000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (this.qrIsFresh() || this.connected) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  getStatus(): WhatsAppAuthStatus {
    if (this.qrExpiresAtMs && this.qrExpiresAtMs <= Date.now()) {
      this.clearQr();
      this.touch();
    }

    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnecting: this.reconnecting,
      reconnect_attempt: this.reconnectAttempt,
      qr_available: this.qrIsFresh(),
      qr_data_url: this.qrIsFresh() ? this.qrDataUrl : null,
      qr_expires_at: this.qrIsFresh() && this.qrExpiresAtMs ? new Date(this.qrExpiresAtMs).toISOString() : null,
      connected_jid: this.connectedJid,
      connected_whatsapp_number: this.connectedWhatsappNumber,
      last_error: this.lastError,
      updated_at: this.updatedAt.toISOString(),
    };
  }

  async generateQr(): Promise<WhatsAppAuthStatus> {
    await this.initSocket();

    if (!this.qrIsFresh() && !this.connected) {
      await this.waitForQr();
    }

    return this.getStatus();
  }

  async logout(): Promise<void> {
    try {
      await this.socket?.logout();
    } catch {
      // noop
    }

    this.socket?.end(new Error("WhatsApp logout by admin"));
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.connectedJid = null;
    this.connectedWhatsappNumber = null;
    this.resetReconnectState();
    this.clearQr();
    this.lastError = null;
    await this.resetAuthState();
    this.touch();
  }

  private async resetAuthState() {
    await fs.rm(this.authDir, { recursive: true, force: true });
  }
}

const defaultAuthDir = path.join(process.cwd(), ".wa-auth");
export const whatsappAuth = new WhatsAppAuthManager(defaultAuthDir);
