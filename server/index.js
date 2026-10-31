import fs from "fs";
try {
  const envConfig = fs.readFileSync(".env", "utf8");
  
  envConfig.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match != null) {
      const key = match[1];
      let value = match[2] || "";
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length-1) === '"') {
        value = value.replace(/\\n/gm, "\n");
      }
      value = value.replace(/(^["'])|(["']$)/g, "");
      if (key !== "GOOGLE_SERVICE_ACCOUNT_JSON") {
          process.env[key] = value;
      }
    }
  });

  const jsonMatch = envConfig.match(/GOOGLE_SERVICE_ACCOUNT_JSON\s*=\s*(\{[\s\S]*?\})/);
  if (jsonMatch) {
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON = jsonMatch[1];
  }
} catch(e) {}
import cors from "cors";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { google } from "googleapis";
import {
  INVOICE_TYPES,
  UPLOADS_ROOT,
  deleteWhatsAppInboxItem,
  handleMetaWhatsAppWebhook,
  loadWhatsAppConfig,
  loadWhatsAppInbox,
  markWhatsAppItemsSynced,
  processIncomingWhatsAppDocument,
  saveWhatsAppConfig,
  syncPendingFilesToDrive,
  updateWhatsAppInboxItem,
} from "./whatsappDriveBot.js";
import {
  getWhatsAppQrStatus,
  logoutWhatsAppQrClient,
  startWhatsAppQrClient,
} from "./whatsappQrClient.js";

const app = express();
app.use(cors({ origin: true })); console.log("SA:", process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? process.env.GOOGLE_SERVICE_ACCOUNT_JSON.substring(0, 50) : "UNDEFINED");
const port = process.env.PORT || 8787;

// GOOGLE SHEETS API CONFIG
const spreadsheetId = process.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";

async function getGoogleAuth() {
  try {
    const envConfig = fs.readFileSync(".env", "utf8");
    const jsonMatch = envConfig.match(/GOOGLE_SERVICE_ACCOUNT_JSON\s*=\s*(\{[\s\S]*?\})/);
    if (!jsonMatch) {
      console.log("No JSON match in .env");
      return null;
    }
    const credentials = JSON.parse(jsonMatch[1]);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
  } catch (e) {
    console.error("Erreur parsing direct GOOGLE_SERVICE_ACCOUNT_JSON", e);
    return null;
  }
}

app.get("/api/gsheets", async (req, res) => {
  try {
    const auth = await getGoogleAuth(); console.log("AUTH IS:", auth ? "OBJECT" : "NULL");
    if (!auth) {
      return res.status(503).json({ error: "Service Account non configuré sur le serveur." });
    }

    const sheets = google.sheets({ version: "v4", auth });

    // On récupère tout en une fois
    // Note: Pour les liens hypertexte (maintenance), on utilise get avec fields
    const ranges = [
      "'AMARA TRUCK 76'!A2:Z", 
      "'BRAHIMA TRUCK 45'!A2:Z", 
      "'SORO TRUCK 52'!A2:Z",
      "'Spreedsheet'!A2:Z"
    ];

    // On fait deux appels : un batchGet pour les données simples, et un get pour les métadonnées (liens) de la feuille maintenance
    const [tripsData, maintenanceData] = await Promise.all([
      sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: ranges.slice(0, 3) }),
      sheets.spreadsheets.get({ 
        spreadsheetId, 
        ranges: [ranges[3]], 
        fields: "sheets(data(rowData(values(formattedValue,hyperlink))))" 
      })
    ]);

    res.json({
      trips: tripsData.data.valueRanges,
      maintenance: maintenanceData.data.sheets[0].data[0].rowData || []
    });
  } catch (error) {
    console.error("Erreur GSheets API:", error);
    res.status(500).json({ error: error.message });
  }
});

const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const maxUploadBytes = 12 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadBytes,
  },
});


app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const systemPrompt = `
Tu es un extracteur comptable strict.
Ta mission: analyser une facture, un recu ou un bon de transport et retourner UNIQUEMENT un JSON valide, sans markdown.
Champs obligatoires:
- compagnie: string (nom du client/facture)
- reference: string (designation + numeros de reference)
- quantite: number
- prix_unitaire: number
- montant_total_lu: number
Rappels:
- Ne renvoie aucun texte hors JSON.
- Si une valeur est introuvable, renvoie une chaine vide pour string ou 0 pour number.
- Normalise les nombres en valeur numerique brute (ex: 12 947 680 -> 12947680).
`;

const userPrompt = `
Extrait strictement les 5 elements suivants:
1) Nom de la compagnie (Client)
2) Reference / Designation
3) Quantite transportee
4) Prix unitaire
5) Montant total TTC

Reponds uniquement en JSON avec ces cles:
{
  "compagnie": "",
  "reference": "",
  "quantite": 0,
  "prix_unitaire": 0,
  "montant_total_lu": 0
}
`;

function roundFcfa(value) {
  return Math.round(Number(value) || 0);
}

function parseFlexibleNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const compact = String(value).replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
  if (!compact) return 0;

  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");
  let normalized = compact;

  if (hasComma && hasDot) {
    normalized =
      compact.lastIndexOf(",") > compact.lastIndexOf(".")
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, "");
  } else if (hasComma) {
    normalized = compact.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractJsonPayload(rawOutput) {
  const rawText = String(rawOutput || "").trim();
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch { }

  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch { }
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(rawText.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function toDataUrl(file) {
  const mimeType = file.mimetype === "image/jpg" ? "image/jpeg" : file.mimetype;
  const base64 = file.buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function normalizeResponseFields(payload) {
  const compagnie = typeof payload?.compagnie === "string" ? payload.compagnie.trim() : "";
  const reference = typeof payload?.reference === "string" ? payload.reference.trim() : "";
  const quantite = parseFlexibleNumber(payload?.quantite);
  const prixUnitaire = parseFlexibleNumber(payload?.prix_unitaire);
  const montantTotalLu = parseFlexibleNumber(payload?.montant_total_lu);
  const calculVerification = roundFcfa(quantite * prixUnitaire);
  const statutCalcul =
    Math.abs(calculVerification - roundFcfa(montantTotalLu)) <= 1
      ? "Correct"
      : "Erreur de calcul sur la facture";

  return {
    compagnie,
    reference,
    quantite,
    prix_unitaire: prixUnitaire,
    montant_total_lu: roundFcfa(montantTotalLu),
    calcul_verification: calculVerification,
    statut_calcul: statutCalcul,
  };
}

app.get("/api/health", (_, res) => {
  res.json({
    ok: true,
    model,
  });
});

app.post("/api/analyze-invoice", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY manquant." });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Fichier manquant." });
      return;
    }

    const dataUrl = toDataUrl(file);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const outputText = response.choices[0]?.message?.content;
    const parsed = extractJsonPayload(outputText);
    if (!parsed) {
      res.status(502).json({ error: "Reponse IA non exploitable.", raw: outputText || "" });
      return;
    }

    res.json(normalizeResponseFields(parsed));
  } catch (error) {
    res.status(500).json({ error: "Echec analyse IA.", details: error.message });
  }
});


app.post("/api/analyze-maintenance", async (req, res) => {
  try {
    const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "Clé Gemini manquante côté serveur." });
    }

    const { files, prompt } = req.body;
    if (!files || !files.length) {
      return res.status(400).json({ error: "Aucun fichier fourni." });
    }

    // Récupérer le modèle flash
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const modelsData = await modelsRes.json();
    const flashModel = modelsData.models?.find(m => m.name.includes('flash'))?.name || 'models/gemini-1.5-flash';

    const parts = files.map(f => ({
      inlineData: {
        mimeType: f.mime,
        data: f.b64
      }
    }));
    parts.unshift({ text: prompt });

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${flashModel}:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`Erreur API Gemini: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Réponse vide de l'IA.");
    }
    
    // Essayer de parser le JSON si possible
    let parsed = null;
    try {
       const jsonMatch = text.match(/```json\s*(\{.*?\})\s*```/s) || text.match(/(\{.*\})/s);
       if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
    } catch(e) {}

    res.json({ text, parsed });
  } catch (error) {
    console.error("Erreur Gemini:", error);
    res.status(500).json({ error: "Echec analyse Gemini", details: error.message });
  }
});





app.get("/api/gsheets", async (req, res) => {
  const spreadsheetId = process.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    return res.status(503).json({ error: "Service Account non configure." });
  }

  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    const ranges = [
      "'AMARA TRUCK 76'!A2:Z", 
      "'BRAHIMA TRUCK 45'!A2:Z", 
      "'SORO TRUCK 52'!A2:Z",
      "'Spreedsheet'!A2:Z"
    ];

    const [tripsData, maintenanceData] = await Promise.all([
      sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges: ranges.slice(0, 3) }),
      sheets.spreadsheets.get({ 
        spreadsheetId, 
        ranges: [ranges[3]], 
        fields: "sheets(data(rowData(values(formattedValue,hyperlink))))" 
      })
    ]);

    return res.status(200).json({
      trips: tripsData.data.valueRanges,
      maintenance: maintenanceData.data.sheets[0].data[0].rowData || []
    });
  } catch (error) {
    console.error("Erreur GSheets API:", error);
    return res.status(500).json({ error: error.message });
  }
});


app.post("/api/login", (req, res) => {
  const { code } = req.body;
  const ADMIN_CODE = process.env.ADMIN_CODE || "SDVADMIN";
  const VIEWER_CODE = process.env.VIEWER_CODE || "SDV2026";
  
  if (code === ADMIN_CODE) {
    return res.json({ username: "Direction SDV", role: "admin" });
  } else if (code === VIEWER_CODE) {
    return res.json({ username: "Visiteur", role: "viewer" });
  }
  
  res.status(401).json({ error: "Code d'accès invalide" });
});

// ============================================================================
// MODULE BOT WHATSAPP & CLASSEMENT GOOGLE DRIVE (PAR DATE D'AJOUT & TYPE)
// ============================================================================
app.use("/api/whatsapp/files", express.static(UPLOADS_ROOT));

app.get("/api/whatsapp/config", (_, res) => {
  const cfg = loadWhatsAppConfig();
  res.json({
    ...cfg,
    invoiceTypes: Object.values(INVOICE_TYPES),
    hasServiceAccount: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    hasGeminiKey: Boolean(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/whatsapp/config", (req, res) => {
  try {
    const updated = saveWhatsAppConfig(req.body || {});
    res.json({ ok: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/whatsapp/inbox", (_, res) => {
  const items = loadWhatsAppInbox();
  res.json({
    items,
    invoiceTypes: Object.values(INVOICE_TYPES),
  });
});

// Réception directe / Simulateur WhatsApp / Bridge WhatsApp Web (multi-fichiers ou Base64)
app.post("/api/whatsapp/ingest", upload.array("files", 10), async (req, res) => {
  try {
    const uploadedFiles = req.files || [];
    const {
      senderPhone = "+225 07 00 00 00",
      senderName = "WhatsApp SDV",
      caption = "",
      addedDate = "",
      invoiceType = "",
      driveFolderId = "",
      oauthAccessToken = "",
      sourceChannel = "Bot WhatsApp",
      fileBase64 = "",
      fileName = "facture_whatsapp.jpg",
      mimeType = "image/jpeg",
    } = req.body || {};

    const results = [];

    if (uploadedFiles.length > 0) {
      for (const f of uploadedFiles) {
        const record = await processIncomingWhatsAppDocument({
          buffer: f.buffer,
          mimeType: f.mimetype,
          originalName: f.originalname,
          senderPhone,
          senderName,
          caption,
          addedDateOverride: addedDate,
          invoiceTypeOverride: invoiceType,
          driveFolderId,
          oauthAccessToken,
          sourceChannel,
        });
        results.push(record);
      }
    } else if (fileBase64) {
      const cleanB64 = String(fileBase64).replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");
      const record = await processIncomingWhatsAppDocument({
        buffer,
        mimeType,
        originalName: fileName,
        senderPhone,
        senderName,
        caption,
        addedDateOverride: addedDate,
        invoiceTypeOverride: invoiceType,
        driveFolderId,
        oauthAccessToken,
        sourceChannel,
      });
      results.push(record);
    } else {
      return res.status(400).json({ error: "Aucun fichier ou image fourni." });
    }

    res.json({
      ok: true,
      count: results.length,
      records: results,
    });
  } catch (err) {
    console.error("Erreur /api/whatsapp/ingest:", err);
    res.status(500).json({ error: err.message });
  }
});

// Synchronisation / Transfert vers Google Drive des pièces en attente
app.post("/api/whatsapp/sync-drive", async (req, res) => {
  try {
    const { oauthAccessToken = "", driveFolderId = "" } = req.body || {};
    if (driveFolderId) {
      saveWhatsAppConfig({ driveRootFolderId: driveFolderId });
    }
    const result = await syncPendingFilesToDrive({
      oauthAccessToken,
      driveFolderId,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marquer les factures WhatsApp comme intégrées à l'application
app.post("/api/whatsapp/mark-synced", (req, res) => {
  try {
    const { ids = [] } = req.body || {};
    const result = markWhatsAppItemsSynced(Array.isArray(ids) ? ids : []);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/whatsapp/inbox/:id", (req, res) => {
  const updated = updateWhatsAppInboxItem(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Document introuvable." });
  res.json({ ok: true, item: updated });
});

app.delete("/api/whatsapp/inbox/:id", (req, res) => {
  const items = deleteWhatsAppInboxItem(req.params.id);
  res.json({ ok: true, items });
});

// Webhook Officiel Meta WhatsApp Cloud API (Vérification GET + Réception POST)
app.get("/api/whatsapp/webhook", (req, res) => {
  const cfg = loadWhatsAppConfig();
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === cfg.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    const records = await handleMetaWhatsAppWebhook(req.body);
    res.status(200).json({ status: "EVENT_RECEIVED", processed: records.length });
  } catch (err) {
    console.error("Erreur Webhook Meta WhatsApp:", err);
    res.status(200).json({ status: "ERROR_LOGGED" });
  }
});

// Webhook Twilio WhatsApp
app.post("/api/whatsapp/twilio", async (req, res) => {
  try {
    const numMedia = parseInt(req.body?.NumMedia || "0", 10);
    const fromPhone = String(req.body?.From || "").replace("whatsapp:", "");
    const senderName = req.body?.ProfileName || `WhatsApp (${fromPhone})`;
    const caption = req.body?.Body || "";
    const processed = [];

    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = req.body?.[`MediaUrl${i}`];
      const mediaType = req.body?.[`MediaContentType${i}`] || "image/jpeg";
      if (!mediaUrl) continue;

      const mediaRes = await fetch(mediaUrl);
      if (!mediaRes.ok) continue;
      const buf = Buffer.from(await mediaRes.arrayBuffer());
      const ext = mediaType.includes("pdf") ? ".pdf" : ".jpg";

      const rec = await processIncomingWhatsAppDocument({
        buffer: buf,
        mimeType: mediaType,
        originalName: `twilio_whatsapp_${Date.now()}_${i}${ext}`,
        senderPhone: fromPhone,
        senderName,
        caption,
        sourceChannel: "Twilio WhatsApp",
      });
      processed.push(rec);
    }

    const replyMsg =
      processed.length > 0
        ? `SDV Bot: ${processed.length} facture(s) classée(s) dans Drive (${processed
            .map((r) => `${r.addedDate}/${r.invoiceTypeLabel}: ${r.amount.toLocaleString("fr-FR")} CFA`)
            .join(", ")}).`
        : "SDV Bot: Envoyez une photo ou un PDF de facture pour l'archiver dans Google Drive et le synchroniser.";

    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMsg}</Message></Response>`);
  } catch (err) {
    console.error("Erreur Webhook Twilio WhatsApp:", err);
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

// ============================================================================
// CONNEXION WHATSAPP DIRECTE PAR QR CODE (MÉTHODE 1 — SANS COMPTE META)
// ============================================================================
app.get("/api/whatsapp/qr/status", (_, res) => {
  res.json(getWhatsAppQrStatus());
});

app.post("/api/whatsapp/qr/start", async (req, res) => {
  try {
    const forceNewQr = Boolean(req.body?.forceNewQr);
    const status = await startWhatsAppQrClient({ forceNewQr });
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/whatsapp/qr/logout", async (_, res) => {
  try {
    const status = await logoutWhatsAppQrClient();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reconnexion automatique au démarrage si une session WhatsApp QR existe déjà
if (getWhatsAppQrStatus().hasSavedSession) {
  startWhatsAppQrClient({ forceNewQr: false }).catch(() => {});
}

// SERVIR LE FRONTEND (PRODUCTION)
const distPath = path.join(__dirname, "../dist");
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use(express.static(distPath, { etag: false, maxAge: 0 }));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  } else {
    next();
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Serveur actif sur http://localhost:${port}`);
});
