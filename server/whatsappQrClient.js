import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { processIncomingWhatsAppDocument } from "./whatsappDriveBot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, "../data/whatsapp_auth_session");

let sockInstance = null;
let connectionState = "disconnected"; // "disconnected" | "connecting" | "qr_ready" | "connected"
let currentQrDataUrl = null;
let connectedUserInfo = null;
let lastConnectionError = null;
let sessionProcessedCount = 0;
let isStarting = false;
let reconnectTimer = null;

// Cache anti-doublon des IDs de messages WhatsApp déjà traités
const processedMessageIds = new Set();

function cleanPhoneFromJid(jid = "") {
  const base = String(jid).split("@")[0].split(":")[0];
  return base ? `+${base}` : "WhatsApp";
}

/**
 * Vérifie strictement que le message a été envoyé par l'utilisateur à LUI-MÊME
 * (discussion "Vous-même" / "Message yourself").
 * Ignore 100% des messages reçus d'autres personnes, des groupes et des messages envoyés à des tiers.
 */
function isStrictlySelfMessage(msg, sock) {
  if (!msg?.key?.fromMe) return false;

  const remoteJid = String(msg?.key?.remoteJid || "");
  if (!remoteJid) return false;

  // Exclure groupes, statuts, listes de diffusion et chaînes
  if (
    remoteJid.endsWith("@g.us") ||
    remoteJid === "status@broadcast" ||
    remoteJid.endsWith("@broadcast") ||
    remoteJid.endsWith("@newsletter")
  ) {
    return false;
  }

  const myPhone = String(sock?.user?.id || "").split(":")[0].split("@")[0];
  const myLid = String(sock?.user?.lid || "").split(":")[0].split("@")[0];
  const remoteBare = remoteJid.split(":")[0].split("@")[0];

  if (!remoteBare) return false;

  const matchesMyPhone = Boolean(myPhone && remoteBare === myPhone);
  const matchesMyLid = Boolean(myLid && remoteBare === myLid);

  return matchesMyPhone || matchesMyLid;
}

export function getWhatsAppQrStatus() {
  const hasSavedSession =
    fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).some((f) => f.endsWith(".json"));
  return {
    state: connectionState,
    qrDataUrl: currentQrDataUrl,
    connectedUser: connectedUserInfo,
    lastError: lastConnectionError,
    processedCount: sessionProcessedCount,
    hasSavedSession,
  };
}

export async function logoutWhatsAppQrClient() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try {
    if (sockInstance) {
      sockInstance.ev?.removeAllListeners?.();
      await sockInstance.logout().catch(() => {});
      sockInstance.end?.();
      sockInstance = null;
    }
  } catch {}
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch {}
  connectionState = "disconnected";
  currentQrDataUrl = null;
  connectedUserInfo = null;
  lastConnectionError = null;
  return getWhatsAppQrStatus();
}

export async function startWhatsAppQrClient({ forceNewQr = false } = {}) {
  if (isStarting) return getWhatsAppQrStatus();
  if (forceNewQr) {
    await logoutWhatsAppQrClient();
  }
  // Si une instance est déjà active ou en cours de connexion, ne jamais créer un second socket
  if (sockInstance && connectionState !== "disconnected") {
    return getWhatsAppQrStatus();
  }

  isStarting = true;
  connectionState = "connecting";
  lastConnectionError = null;

  try {
    const baileys = await import("@whiskeysockets/baileys");
    const QRCode = (await import("qrcode")).default;
    const pino = (await import("pino")).default;

    const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
    const {
      useMultiFileAuthState,
      DisconnectReason,
      downloadMediaMessage,
      fetchLatestBaileysVersion,
    } = baileys;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const logger = pino({ level: "silent" });

    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest?.version) version = latest.version;
    } catch {}

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ["SDV Logistics Dashboard", "Chrome", "120.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sockInstance = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          });
          connectionState = "qr_ready";
          lastConnectionError = null;
        } catch (err) {
          lastConnectionError = err.message;
        }
      }

      if (connection === "open") {
        connectionState = "connected";
        currentQrDataUrl = null;
        lastConnectionError = null;
        const userJid = sock.user?.id || "";
        connectedUserInfo = {
          jid: userJid,
          lid: sock.user?.lid || "",
          phone: cleanPhoneFromJid(userJid),
          name: sock.user?.name || "Compte WhatsApp SDV",
          connectedAt: new Date().toISOString(),
        };
        console.log(
          "✅ Bot WhatsApp connecté (Mode strict : uniquement messages envoyés à soi-même) :",
          connectedUserInfo.phone
        );
      }

      if (connection === "close") {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.data?.statusCode;
        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut && statusCode !== 440;

        currentQrDataUrl = null;
        sockInstance = null;

        if (statusCode === DisconnectReason.loggedOut) {
          connectionState = "disconnected";
          connectedUserInfo = null;
          try {
            if (fs.existsSync(AUTH_DIR)) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            }
          } catch {}
        } else if (shouldReconnect) {
          connectionState = "connecting";
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            startWhatsAppQrClient({ forceNewQr: false }).catch(() => {});
          }, 4000);
        } else {
          connectionState = "disconnected";
        }
      }
    });

    // Écoute UNIQUEMENT des messages en temps réel envoyés par l'utilisateur à LUI-MÊME
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Ignorer l'historique ("append") : ne traiter que les nouveaux messages en direct ("notify")
      if (type !== "notify") return;

      for (const msg of messages || []) {
        try {
          const msgId = msg.key?.id;
          if (!msgId || processedMessageIds.has(msgId)) continue;

          // FILTRE STRICT : uniquement les messages que vous vous envoyez à vous-même ("Vous-même")
          if (!isStrictlySelfMessage(msg, sock)) {
            continue;
          }

          // Déplier le message (ephemeral / viewOnce / documentWithCaption)
          const m =
            msg.message?.ephemeralMessage?.message ||
            msg.message?.viewOnceMessage?.message ||
            msg.message?.viewOnceMessageV2?.message ||
            msg.message?.documentWithCaptionMessage?.message ||
            msg.message;

          if (!m) continue;

          const imageMsg = m.imageMessage;
          const docMsg = m.documentMessage;

          if (!imageMsg && !docMsg) continue;

          const mimeType = imageMsg?.mimetype || docMsg?.mimetype || "image/jpeg";
          const isSupportedDoc =
            mimeType.startsWith("image/") || mimeType === "application/pdf";
          if (!isSupportedDoc) continue;

          const caption = imageMsg?.caption || docMsg?.caption || docMsg?.title || "";
          // Ignorer nos propres messages de réponse automatique
          if (caption.includes("SDV Bot — Facture Reçue")) continue;

          processedMessageIds.add(msgId);

          const myPhoneFormatted = connectedUserInfo?.phone || cleanPhoneFromJid(sock.user?.id || "");
          const senderName = `${connectedUserInfo?.name || "Moi"} (Vous-même)`;

          const ext = mimeType.includes("pdf")
            ? ".pdf"
            : mimeType.includes("png")
            ? ".png"
            : ".jpg";
          const originalName =
            docMsg?.fileName ||
            `whatsapp_${new Date().toISOString().slice(0, 10)}_${msgId.slice(-5)}${ext}`;

          // Téléchargement du binaire depuis WhatsApp
          const buffer = await downloadMediaMessage(
            msg,
            "buffer",
            {},
            {
              logger,
              reuploadRequest: sock.updateMediaMessage,
            }
          );

          if (!buffer || buffer.length === 0) continue;

          // Analyse IA + Classement par Date d'ajout / Type de facture + Transfert Google Drive
          const record = await processIncomingWhatsAppDocument({
            buffer: Buffer.from(buffer),
            mimeType,
            originalName,
            senderPhone: myPhoneFormatted,
            senderName,
            caption,
            sourceChannel: "WhatsApp (Vous-même)",
          });

          sessionProcessedCount++;

          // Répondre uniquement dans votre discussion "Vous-même"
          const replyText =
            `✅ *SDV Bot — Facture Reçue & Classée*\n` +
            `• *Type :* ${record.invoiceTypeLabel}\n` +
            `• *Date d'ajout :* ${record.addedDate}\n` +
            `• *Camion :* ${record.truck}\n` +
            `• *Montant :* ${(Number(record.amount) || 0).toLocaleString("fr-FR")} CFA\n` +
            `• *Dossier Drive :* ${record.addedDate} / ${record.driveFolderName}` +
            (record.driveLink ? `\n• *Lien Drive :* ${record.driveLink}` : "");

          await sock
            .sendMessage(msg.key.remoteJid, { text: replyText }, { quoted: msg })
            .catch(() => {});
        } catch (err) {
          console.error("Erreur traitement message WhatsApp (Vous-même):", err.message);
        }
      }
    });
  } catch (err) {
    connectionState = "disconnected";
    lastConnectionError = err.message;
    console.error("Erreur démarrage client WhatsApp QR:", err);
  } finally {
    isStarting = false;
  }

  return getWhatsAppQrStatus();
}
