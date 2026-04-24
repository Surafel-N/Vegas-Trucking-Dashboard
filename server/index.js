import cors from "cors";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8787);
const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const maxUploadBytes = 12 * 1024 * 1024;

const acceptedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadBytes,
  },
});

app.use(
  cors({
    origin: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

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

// SERVIR LE FRONTEND (PRODUCTION)
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Serveur actif sur http://localhost:${port}`);
});
