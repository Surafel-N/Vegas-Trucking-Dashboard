import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../data");
const UPLOADS_ROOT = path.join(DATA_DIR, "whatsapp_uploads");
const INBOX_JSON_PATH = path.join(DATA_DIR, "whatsapp_inbox.json");
const CONFIG_JSON_PATH = path.join(DATA_DIR, "whatsapp_config.json");

// Assurer l'existence des dossiers de stockage
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

/**
 * Définition officielle des types de factures SDV et de leurs sous-dossiers Google Drive
 */
export const INVOICE_TYPES = {
  CARBURANT: {
    code: "CARBURANT",
    label: "Carburant (Gasoil)",
    driveFolderName: "01_Carburant_Gasoil",
    accountingCategory: "Carburant (Gasoil)",
    targetModule: "accounting_fuel",
  },
  MAINTENANCE: {
    code: "MAINTENANCE",
    label: "Maintenance & Pièces",
    driveFolderName: "02_Maintenance_Pieces",
    accountingCategory: "Maintenance & Pneumatiques",
    targetModule: "maintenance",
  },
  PEAGE_ROUTE: {
    code: "PEAGE_ROUTE",
    label: "Péage & Frais de Route",
    driveFolderName: "03_Peages_Frais_Route",
    accountingCategory: "Frais de Route & Péages",
    targetModule: "accounting_expense",
  },
  FACTURE_CLIENT: {
    code: "FACTURE_CLIENT",
    label: "Facture Client & Pesée",
    driveFolderName: "04_Factures_Clients_Tonnage",
    accountingCategory: "Recettes Transport (Facturation)",
    targetModule: "client_invoice",
  },
  ASSURANCE_DOC: {
    code: "ASSURANCE_DOC",
    label: "Assurance & Documents",
    driveFolderName: "05_Assurances_Documents",
    accountingCategory: "Cartes de Transport & Régularisations",
    targetModule: "accounting_expense",
  },
  AUTRE: {
    code: "AUTRE",
    label: "Autres Factures & Reçus",
    driveFolderName: "06_Autres_Factures",
    accountingCategory: "Charges Générales & Divers",
    targetModule: "accounting_expense",
  },
};

export function loadWhatsAppConfig() {
  const defaultConfig = {
    driveRootFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    driveRootFolderName: "SDV_Factures_WhatsApp",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "sdv_whatsapp_verify_2026",
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    autoSyncToApp: true,
    organizeBy: "DATE_AND_TYPE", // Structure: /YYYY-MM-DD (Date d'ajout)/Type_De_Facture/
  };
  try {
    if (fs.existsSync(CONFIG_JSON_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_JSON_PATH, "utf8"));
      return { ...defaultConfig, ...saved };
    }
  } catch (e) {
    console.error("Erreur lecture whatsapp_config.json:", e);
  }
  return defaultConfig;
}

export function saveWhatsAppConfig(newConfig) {
  const current = loadWhatsAppConfig();
  const merged = { ...current, ...newConfig, updatedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

export function loadWhatsAppInbox() {
  try {
    if (fs.existsSync(INBOX_JSON_PATH)) {
      const raw = fs.readFileSync(INBOX_JSON_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture whatsapp_inbox.json:", e);
  }
  return [];
}

export function saveWhatsAppInbox(items) {
  fs.writeFileSync(INBOX_JSON_PATH, JSON.stringify(items, null, 2), "utf8");
  return items;
}

function sanitizeFileName(name) {
  return String(name || "document")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeTruckLabel(rawTruck, textContext = "") {
  const combined = `${rawTruck || ""} ${textContext || ""}`.toUpperCase();
  if (combined.includes("AMARA") || combined.includes("76") || combined.includes("672")) {
    return "AMARA TRUCK 76";
  }
  if (combined.includes("BRAHIMA") || combined.includes("45") || combined.includes("736")) {
    return "BRAHIMA TRUCK 45";
  }
  if (combined.includes("SORO") || combined.includes("SORRO") || combined.includes("52") || combined.includes("579")) {
    return "SORO TRUCK 52";
  }
  return "FLOTTE";
}

function normalizeInvoiceType(rawType, textContext = "") {
  const upper = String(rawType || "").toUpperCase();
  if (INVOICE_TYPES[upper]) return upper;

  const ctx = `${rawType || ""} ${textContext || ""}`.toLowerCase();
  if (
    ctx.includes("carburant") ||
    ctx.includes("gasoil") ||
    ctx.includes("gazole") ||
    ctx.includes("shell") ||
    ctx.includes("total") ||
    ctx.includes("station") ||
    ctx.includes("litre") ||
    ctx.includes("fuel")
  ) {
    return "CARBURANT";
  }
  if (
    ctx.includes("maintenance") ||
    ctx.includes("garage") ||
    ctx.includes("mecanique") ||
    ctx.includes("mécanique") ||
    ctx.includes("pneu") ||
    ctx.includes("vidange") ||
    ctx.includes("piece") ||
    ctx.includes("pièce") ||
    ctx.includes("reparation") ||
    ctx.includes("réparation") ||
    ctx.includes("huile")
  ) {
    return "MAINTENANCE";
  }
  if (
    ctx.includes("peage") ||
    ctx.includes("péage") ||
    ctx.includes("route") ||
    ctx.includes("police") ||
    ctx.includes("pesage") ||
    ctx.includes("pont bascule")
  ) {
    return "PEAGE_ROUTE";
  }
  if (
    ctx.includes("client") ||
    ctx.includes("cml") ||
    ctx.includes("cimaf") ||
    ctx.includes("sgs") ||
    ctx.includes("tonnage") ||
    ctx.includes("livraison") ||
    ctx.includes("facture transport")
  ) {
    return "FACTURE_CLIENT";
  }
  if (
    ctx.includes("assurance") ||
    ctx.includes("carte de transport") ||
    ctx.includes("visite technique") ||
    ctx.includes("patente") ||
    ctx.includes("document")
  ) {
    return "ASSURANCE_DOC";
  }
  return "AUTRE";
}

/**
 * Analyse intelligente d'une image ou d'un PDF de facture via Gemini Flash ou OpenAI Vision
 */
export async function analyzeDocumentWithAI({
  buffer,
  mimeType,
  originalName = "",
  caption = "",
  addedDate,
}) {
  const base64Data = buffer.toString("base64");
  const safeMime = mimeType === "image/jpg" ? "image/jpeg" : mimeType || "image/jpeg";

  const extractionPrompt = `
Tu es l'assistant IA comptable et logistique de SDV (flotte de 3 camions : AMARA TRUCK 76, BRAHIMA TRUCK 45, SORO TRUCK 52).
Analyse cette image ou facture (ainsi que la note WhatsApp éventuelle : "${caption}") et retourne UNIQUEMENT un objet JSON valide avec les champs suivants :
{
  "invoiceType": "CARBURANT" | "MAINTENANCE" | "PEAGE_ROUTE" | "FACTURE_CLIENT" | "ASSURANCE_DOC" | "AUTRE",
  "invoiceDate": "YYYY-MM-DD",
  "amount": 0,
  "vendorOrClient": "Nom du fournisseur, station-service, garage ou client",
  "reference": "Numéro de facture, reçu ou ticket",
  "truck": "AMARA TRUCK 76" | "BRAHIMA TRUCK 45" | "SORO TRUCK 52" | "FLOTTE",
  "corridor": "SAN_PEDRO" | "ABIDJAN",
  "tonnage": 0,
  "unitPrice": 0,
  "description": "Résumé court et précis de la facture ou dépense"
}

Règles :
1. Choisis "invoiceType" parmi :
   - "CARBURANT" : reçu de station-service (Shell, Total, gasoil, plein carburant)
   - "MAINTENANCE" : facture mécanique, pièces détachées, pneus, vidange, réparation
   - "PEAGE_ROUTE" : ticket de péage, frais de route, pesage routier
   - "FACTURE_CLIENT" : facture de transport client (CML, CIMAF, SGS), bon de livraison ou ticket de pesée avec tonnage
   - "ASSURANCE_DOC" : carte de transport, assurance, visite technique, document administratif
   - "AUTRE" : toute autre dépense ou facture (Yango, Wave, divers)
2. Normalise "amount" en entier CFA sans espace (ex: 145000).
3. Si la date de la facture est illisible, utilise "${addedDate}".
4. Si un camion (Amara/76, Brahima/45, Soro/52) est mentionné sur le document ou dans la note "${caption}", indique-le dans "truck", sinon "FLOTTE".
5. Si "Abidjan" est mentionné, mets "corridor": "ABIDJAN", sinon "SAN_PEDRO".
`;

  let parsed = null;

  // 1. Tentative avec Gemini Flash (si disponible)
  const geminiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey && (safeMime.startsWith("image/") || safeMime === "application/pdf")) {
    try {
      const modelsRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      );
      const modelsData = await modelsRes.json();
      const flashModel =
        modelsData.models?.find((m) => m.name.includes("flash"))?.name ||
        "models/gemini-1.5-flash";

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${flashModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: extractionPrompt },
                  {
                    inlineData: {
                      mimeType: safeMime,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (aiRes.ok) {
        const data = await aiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        }
      }
    } catch (err) {
      console.warn("Avertissement analyse Gemini WhatsApp:", err.message);
    }
  }

  // 2. Fallback OpenAI Vision (si disponible et Gemini n'a pas répondu)
  if (!parsed && process.env.OPENAI_API_KEY && safeMime.startsWith("image/")) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              {
                type: "image_url",
                image_url: { url: `data:${safeMime};base64,${base64Data}` },
              },
            ],
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      });
      const content = response.choices?.[0]?.message?.content || "";
      parsed = JSON.parse(content);
    } catch (err) {
      console.warn("Avertissement analyse OpenAI WhatsApp:", err.message);
    }
  }

  // 3. Normalisation et fallback intelligent depuis la légende WhatsApp / nom de fichier
  const contextText = `${caption || ""} ${originalName || ""}`;
  const amountFromCaption = (() => {
    const kMatch = contextText.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
    if (kMatch) return Math.round(parseFloat(kMatch[1].replace(",", ".")) * 1000);
    const numMatch = contextText.replace(/\s+/g, "").match(/(\d{4,9})\s*(?:cfa|fcfa|f)?/i);
    return numMatch ? parseInt(numMatch[1], 10) : 0;
  })();

  const invoiceType = normalizeInvoiceType(parsed?.invoiceType, contextText);
  const typeMeta = INVOICE_TYPES[invoiceType] || INVOICE_TYPES.AUTRE;
  const amount = Math.round(Number(parsed?.amount) || amountFromCaption || 0);
  const truck = normalizeTruckLabel(parsed?.truck, contextText);
  const invoiceDate =
    parsed?.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.invoiceDate))
      ? String(parsed.invoiceDate)
      : addedDate;
  const corridor =
    String(parsed?.corridor || contextText)
      .toLowerCase()
      .includes("abidjan")
      ? "ABIDJAN"
      : "SAN_PEDRO";

  return {
    invoiceType,
    invoiceTypeLabel: typeMeta.label,
    driveFolderName: typeMeta.driveFolderName,
    accountingCategory: typeMeta.accountingCategory,
    targetModule: typeMeta.targetModule,
    invoiceDate,
    addedDate,
    amount,
    vendorOrClient:
      parsed?.vendorOrClient ||
      (invoiceType === "CARBURANT"
        ? corridor === "ABIDJAN"
          ? "Station Abidjan"
          : "Shell San Pedro"
        : invoiceType === "FACTURE_CLIENT"
        ? "Client Transport CML"
        : "Fournisseur SDV"),
    reference: parsed?.reference || "",
    truck,
    corridor,
    tonnage: Number(parsed?.tonnage) || 0,
    unitPrice: Number(parsed?.unitPrice) || 0,
    description:
      parsed?.description ||
      caption ||
      `${typeMeta.label} (${truck}) - ${originalName || "Reçu WhatsApp"}`,
  };
}

/**
 * Crée ou récupère un sous-dossier dans Google Drive
 */
async function getOrCreateDriveFolder(drive, folderName, parentId = null) {
  const escapedName = folderName.replace(/'/g, "\\'");
  let q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const listRes = await drive.files.list({
    q,
    fields: "files(id, name, webViewLink)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0];
  }

  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId ? { parents: [parentId] } : {}),
  };

  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return createRes.data;
}

/**
 * Transfère le fichier dans Google Drive selon l'arborescence :
 * 📁 [Dossier Racine Drive] / 📁 [Date d'ajout YYYY-MM-DD] / 📁 [Type de Facture] / 📄 Fichier
 */
export async function uploadToGoogleDriveByDateAndType({
  buffer,
  mimeType,
  fileName,
  addedDate,
  driveFolderName,
  rootFolderId,
  oauthAccessToken,
  serviceAccountJson,
}) {
  let authClient = null;

  if (oauthAccessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: oauthAccessToken });
    authClient = oauth2Client;
  } else if (serviceAccountJson) {
    const credentials =
      typeof serviceAccountJson === "string"
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;
    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }

  if (!authClient) {
    return {
      uploaded: false,
      reason: "Aucune authentification Google Drive disponible.",
    };
  }

  try {
    const drive = google.drive({ version: "v3", auth: authClient });
    const config = loadWhatsAppConfig();
    let effectiveRootId = rootFolderId || config.driveRootFolderId || null;

    // Si aucun ID de dossier racine n'est fourni, créer/utiliser "SDV_Factures_WhatsApp"
    if (!effectiveRootId) {
      const rootFolder = await getOrCreateDriveFolder(
        drive,
        config.driveRootFolderName || "SDV_Factures_WhatsApp",
        null
      );
      effectiveRootId = rootFolder.id;
    }

    // Niveau 1 : Dossier par Date d'ajout (ex: "2026-10-30")
    const dateFolder = await getOrCreateDriveFolder(drive, addedDate, effectiveRootId);

    // Niveau 2 : Sous-dossier par Type de facture (ex: "01_Carburant_Gasoil")
    const typeFolder = await getOrCreateDriveFolder(drive, driveFolderName, dateFolder.id);

    // Niveau 3 : Upload du fichier dans le sous-dossier
    const { Readable } = await import("stream");
    const mediaStream = Readable.from(buffer);

    const fileRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [typeFolder.id],
      },
      media: {
        mimeType: mimeType || "image/jpeg",
        body: mediaStream,
      },
      fields: "id, name, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const driveFileId = fileRes.data.id;
    const webViewLink =
      fileRes.data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

    return {
      uploaded: true,
      driveFileId,
      driveLink: webViewLink,
      dateFolderId: dateFolder.id,
      dateFolderLink:
        dateFolder.webViewLink || `https://drive.google.com/drive/folders/${dateFolder.id}`,
      typeFolderId: typeFolder.id,
      typeFolderLink:
        typeFolder.webViewLink || `https://drive.google.com/drive/folders/${typeFolder.id}`,
      drivePath: `${addedDate} / ${driveFolderName} / ${fileName}`,
    };
  } catch (err) {
    console.warn("Avertissement Upload Google Drive:", err.message);
    return {
      uploaded: false,
      reason: err.message,
      drivePath: `${addedDate} / ${driveFolderName} / ${fileName}`,
    };
  }
}

/**
 * Pipeline complet de réception d'une image ou facture WhatsApp :
 * 1. Analyse IA (Type de facture, Montant, Camion, Date, Fournisseur/Client)
 * 2. Classement local par Date d'ajout / Type de facture (`data/whatsapp_uploads/YYYY-MM-DD/<Type>/`)
 * 3. Transfert dans Google Drive par Date d'ajout / Type de facture
 * 4. Enregistrement dans `whatsapp_inbox.json` pour synchronisation avec l'application
 */
export async function processIncomingWhatsAppDocument({
  buffer,
  mimeType = "image/jpeg",
  originalName = "facture_whatsapp.jpg",
  senderPhone = "+225 07 00 00 00",
  senderName = "Chauffeur / Gestionnaire WhatsApp",
  caption = "",
  addedDateOverride = "",
  invoiceTypeOverride = "",
  driveFolderId = "",
  oauthAccessToken = "",
  serviceAccountJson = "",
  sourceChannel = "WhatsApp Bot",
}) {
  const addedDate =
    addedDateOverride && /^\d{4}-\d{2}-\d{2}$/.test(addedDateOverride)
      ? addedDateOverride
      : new Date().toISOString().slice(0, 10);

  // 1. Analyse IA du document
  const aiMeta = await analyzeDocumentWithAI({
    buffer,
    mimeType,
    originalName,
    caption,
    addedDate,
  });

  if (invoiceTypeOverride && INVOICE_TYPES[invoiceTypeOverride]) {
    const overrideMeta = INVOICE_TYPES[invoiceTypeOverride];
    aiMeta.invoiceType = overrideMeta.code;
    aiMeta.invoiceTypeLabel = overrideMeta.label;
    aiMeta.driveFolderName = overrideMeta.driveFolderName;
    aiMeta.accountingCategory = overrideMeta.accountingCategory;
    aiMeta.targetModule = overrideMeta.targetModule;
  }

  // 2. Nommage standardisé : [DateAjout]_[Type]_[Camion]_[Montant]CFA_[Nom]
  const ext =
    path.extname(originalName) ||
    (mimeType.includes("pdf") ? ".pdf" : mimeType.includes("png") ? ".png" : ".jpg");
  const baseClean = sanitizeFileName(path.basename(originalName, ext));
  const truckSlug = sanitizeFileName(aiMeta.truck);
  const amountSlug = aiMeta.amount > 0 ? `${aiMeta.amount}CFA` : " Montant";
  const finalFileName = `${addedDate}_${aiMeta.invoiceType}_${truckSlug}_${amountSlug}_${Date.now().toString().slice(-4)}_${baseClean}${ext}`;

  // 3. Sauvegarde structurée locale : /data/whatsapp_uploads/YYYY-MM-DD/01_Carburant_Gasoil/
  const localDir = path.join(UPLOADS_ROOT, addedDate, aiMeta.driveFolderName);
  fs.mkdirSync(localDir, { recursive: true });
  const localFilePath = path.join(localDir, finalFileName);
  fs.writeFileSync(localFilePath, buffer);

  const relativeUrl = `/api/whatsapp/files/${encodeURIComponent(addedDate)}/${encodeURIComponent(
    aiMeta.driveFolderName
  )}/${encodeURIComponent(finalFileName)}`;

  // 4. Transfert vers Google Drive dans /YYYY-MM-DD (Date d'ajout)/Type_De_Facture/
  const driveResult = await uploadToGoogleDriveByDateAndType({
    buffer,
    mimeType,
    fileName: finalFileName,
    addedDate,
    driveFolderName: aiMeta.driveFolderName,
    rootFolderId: driveFolderId,
    oauthAccessToken,
    serviceAccountJson: serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  });

  const record = {
    id: `wa-doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    receivedAt: new Date().toISOString(),
    addedDate, // Date d'ajout (clé de classement niveau 1)
    invoiceDate: aiMeta.invoiceDate, // Date de la pièce
    invoiceType: aiMeta.invoiceType, // Clé de classement niveau 2
    invoiceTypeLabel: aiMeta.invoiceTypeLabel,
    driveFolderName: aiMeta.driveFolderName,
    accountingCategory: aiMeta.accountingCategory,
    targetModule: aiMeta.targetModule,
    amount: aiMeta.amount,
    vendorOrClient: aiMeta.vendorOrClient,
    reference: aiMeta.reference,
    truck: aiMeta.truck,
    corridor: aiMeta.corridor,
    tonnage: aiMeta.tonnage,
    unitPrice: aiMeta.unitPrice,
    description: aiMeta.description,
    caption,
    senderPhone,
    senderName,
    sourceChannel,
    fileName: finalFileName,
    mimeType,
    localPreviewUrl: relativeUrl,
    driveUploaded: Boolean(driveResult.uploaded),
    driveFileId: driveResult.driveFileId || null,
    driveLink: driveResult.driveLink || null,
    driveDateFolderLink: driveResult.dateFolderLink || null,
    driveTypeFolderLink: driveResult.typeFolderLink || null,
    drivePath: driveResult.drivePath || `${addedDate} / ${aiMeta.driveFolderName} / ${finalFileName}`,
    driveStatusReason: driveResult.reason || null,
    syncedToApp: false,
    syncedAt: null,
  };

  const inbox = loadWhatsAppInbox();
  inbox.unshift(record);
  saveWhatsAppInbox(inbox);

  return record;
}

/**
 * Re-transfère vers Google Drive les fichiers locaux qui n'ont pas encore été envoyés sur Drive
 * (par exemple après connexion Google OAuth ou configuration de l'ID de dossier Drive)
 */
export async function syncPendingFilesToDrive({
  oauthAccessToken = "",
  driveFolderId = "",
  serviceAccountJson = "",
}) {
  const inbox = loadWhatsAppInbox();
  let uploadedCount = 0;
  const errors = [];

  for (const item of inbox) {
    if (item.driveUploaded && item.driveLink) continue;

    const localPath = path.join(UPLOADS_ROOT, item.addedDate, item.driveFolderName, item.fileName);
    if (!fs.existsSync(localPath)) continue;

    const buffer = fs.readFileSync(localPath);
    const res = await uploadToGoogleDriveByDateAndType({
      buffer,
      mimeType: item.mimeType || "image/jpeg",
      fileName: item.fileName,
      addedDate: item.addedDate,
      driveFolderName: item.driveFolderName,
      rootFolderId: driveFolderId,
      oauthAccessToken,
      serviceAccountJson: serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    });

    if (res.uploaded) {
      item.driveUploaded = true;
      item.driveFileId = res.driveFileId;
      item.driveLink = res.driveLink;
      item.driveDateFolderLink = res.dateFolderLink;
      item.driveTypeFolderLink = res.typeFolderLink;
      item.drivePath = res.drivePath;
      item.driveStatusReason = null;
      uploadedCount++;
    } else if (res.reason) {
      item.driveStatusReason = res.reason;
      errors.push(res.reason);
    }
  }

  saveWhatsAppInbox(inbox);
  return {
    uploadedCount,
    totalCount: inbox.length,
    errors: Array.from(new Set(errors)),
    items: inbox,
  };
}

export function updateWhatsAppInboxItem(id, patch) {
  const inbox = loadWhatsAppInbox();
  const idx = inbox.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  if (patch.invoiceType && INVOICE_TYPES[patch.invoiceType]) {
    const meta = INVOICE_TYPES[patch.invoiceType];
    patch.invoiceTypeLabel = meta.label;
    patch.driveFolderName = meta.driveFolderName;
    patch.accountingCategory = meta.accountingCategory;
    patch.targetModule = meta.targetModule;
  }

  inbox[idx] = { ...inbox[idx], ...patch };
  saveWhatsAppInbox(inbox);
  return inbox[idx];
}

export function markWhatsAppItemsSynced(ids = []) {
  const inbox = loadWhatsAppInbox();
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  let count = 0;

  inbox.forEach((item) => {
    if (ids.length === 0 || idSet.has(item.id)) {
      if (!item.syncedToApp) {
        item.syncedToApp = true;
        item.syncedAt = now;
        count++;
      }
    }
  });

  saveWhatsAppInbox(inbox);
  return { syncedCount: count, items: inbox };
}

export function deleteWhatsAppInboxItem(id) {
  const inbox = loadWhatsAppInbox();
  const target = inbox.find((i) => i.id === id);
  const filtered = inbox.filter((i) => i.id !== id);
  if (target) {
    try {
      const localPath = path.join(
        UPLOADS_ROOT,
        target.addedDate,
        target.driveFolderName,
        target.fileName
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch (e) {}
  }
  saveWhatsAppInbox(filtered);
  return filtered;
}

/**
 * Gestionnaire Webhook Officiel Meta WhatsApp Cloud API
 */
export async function handleMetaWhatsAppWebhook(payload) {
  const config = loadWhatsAppConfig();
  const accessToken = config.whatsappAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = config.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const processedRecords = [];

  const entries = payload?.entry || [];
  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const val = change?.value;
      const messages = val?.messages || [];
      const contacts = val?.contacts || [];

      for (const msg of messages) {
        const fromPhone = msg.from || "WhatsApp";
        const senderName =
          contacts.find((c) => c.wa_id === fromPhone)?.profile?.name ||
          `WhatsApp (${fromPhone})`;

        const mediaObj = msg.image || msg.document;
        if (!mediaObj || !mediaObj.id) continue;

        const caption = mediaObj.caption || msg.text?.body || "";
        const mimeType = mediaObj.mime_type || "image/jpeg";
        const fileName = mediaObj.filename || `whatsapp_${mediaObj.id}.jpg`;

        if (!accessToken) continue;

        // 1. Récupérer l'URL du média auprès de Meta Graph API
        const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaObj.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!metaRes.ok) continue;
        const metaData = await metaRes.json();
        if (!metaData?.url) continue;

        // 2. Télécharger le binaire de l'image ou du PDF
        const mediaBinRes = await fetch(metaData.url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mediaBinRes.ok) continue;
        const arrayBuf = await mediaBinRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        // 3. Traiter, classer par Date d'ajout / Type de facture et transférer sur Google Drive
        const record = await processIncomingWhatsAppDocument({
          buffer,
          mimeType,
          originalName: fileName,
          senderPhone: fromPhone,
          senderName,
          caption,
          sourceChannel: "WhatsApp Cloud API",
        });

        processedRecords.push(record);

        // 4. Envoyer un accusé de réception automatique sur WhatsApp
        if (phoneId && accessToken) {
          const replyText =
            `✅ *SDV Bot — Facture Reçue & Classée*\n` +
            `• *Type :* ${record.invoiceTypeLabel}\n` +
            `• *Date d'ajout :* ${record.addedDate}\n` +
            `• *Camion :* ${record.truck}\n` +
            `• *Montant détecté :* ${record.amount.toLocaleString("fr-FR")} CFA\n` +
            `• *Dossier Drive :* ${record.addedDate} / ${record.driveFolderName}\n` +
            (record.driveLink ? `• *Lien Drive :* ${record.driveLink}` : "");

          await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: fromPhone,
              type: "text",
              text: { body: replyText },
            }),
          }).catch(() => {});
        }
      }
    }
  }

  return processedRecords;
}

export { UPLOADS_ROOT };
