const EXPENSE_HINTS = [
  "carburant",
  "station",
  "peage",
  "reparation",
  "entretien",
  "lavage",
  "assurance",
  "parking",
  "frais",
  "ticket",
];

const INCOME_HINTS = [
  "client",
  "paiement",
  "facture",
  "recette",
  "versement",
  "transport",
  "encaisse",
  "virement",
];

const CATEGORY_KEYWORDS = {
  carburant: "Carburant",
  peage: "Peage",
  reparation: "Reparation",
  entretien: "Entretien vehicule",
  lavage: "Lavage",
  assurance: "Assurance",
  stationnement: "Stationnement",
  client: "Paiement client entreprise",
  remboursement: "Remboursement",
};

function parseNumber(candidate) {
  const cleaned = candidate.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectAmount(text) {
  const matches = [...text.matchAll(/(\d[\d\s.,]{2,})\s*(?:fcfa|cfa|xof)?/gi)];
  const values = matches.map((match) => parseNumber(match[1])).filter((value) => value !== null);
  if (!values.length) return null;
  return Math.max(...values);
}

export function detectDate(text) {
  const match = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function detectReference(text) {
  const refs = [
    /(?:facture|ref|reference|ticket|bon)\s*[:#-]?\s*([a-z0-9\-\/]+)/i,
    /\b([A-Z]{2,}\-?\d{3,})\b/,
  ];
  for (const pattern of refs) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return "";
}

export function detectType(text) {
  const normalized = text.toLowerCase();
  const expenseScore = EXPENSE_HINTS.reduce((score, word) => (normalized.includes(word) ? score + 1 : score), 0);
  const incomeScore = INCOME_HINTS.reduce((score, word) => (normalized.includes(word) ? score + 1 : score), 0);
  if (incomeScore > expenseScore) return "encaissement";
  return "depense";
}

export function detectCategory(text, fallbackType) {
  const normalized = text.toLowerCase();
  for (const [word, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (normalized.includes(word)) return category;
  }
  return fallbackType === "encaissement" ? "Recette trajet" : "Autres charges";
}

export function detectDriver(text, drivers) {
  const normalized = text.toLowerCase();
  return drivers.find((driver) => normalized.includes(driver.name.toLowerCase())) || null;
}

export function detectPaymentStatus(text) {
  const normalized = text.toLowerCase();
  const unpaidHints = [
    "a payer",
    "a régler",
    "a regler",
    "reste a payer",
    "reste dû",
    "reste du",
    "impaye",
    "non paye",
    "non regle",
  ];
  const paidHints = [
    "paye",
    "regle",
    "acquite",
    "acquitte",
    "virement",
    "mode de paiement",
    "recu",
    "encaisse",
  ];

  if (unpaidHints.some((hint) => normalized.includes(hint))) return "unpaid";
  if (paidHints.some((hint) => normalized.includes(hint))) return "paid";
  return "unpaid";
}

export function detectClient(text) {
  const patterns = [
    /(?:client|nom)\s*[:\-]\s*([^\n\r]+)/i,
    /compagnie\s+([^\n\r]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 120);
  }

  return "";
}

export function parseFinancialDocument(text, drivers) {
  const amount = detectAmount(text);
  const date = detectDate(text);
  const type = detectType(text);
  const category = detectCategory(text, type);
  const reference = detectReference(text);
  const driver = detectDriver(text, drivers);
  const paymentStatus = detectPaymentStatus(text);
  const client = detectClient(text);

  return {
    amount: amount || 0,
    date,
    type,
    category,
    reference,
    driverId: driver?.id || "",
    paymentStatus,
    client,
    confidence: amount && date ? "high" : "medium",
  };
}
