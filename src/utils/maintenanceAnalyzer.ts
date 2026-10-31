import { AccountingTransaction } from "./accountingParser";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "./accountingInitialData";

export type MaintenanceOrExpenseSubType =
  | "pneu"
  | "vidange"
  | "mecanique"
  | "lavage"
  | "salaires"
  | "loyer"
  | "yango"
  | "assurances"
  | "telecom"
  | "taxes"
  | "divers";

export interface AnalyzedExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD (vérifiée et corrigée, jamais dans le futur)
  displayDate: string; // JJ/MM/AAAA
  monthKey: string; // YYYY-MM
  monthLabel: string; // ex: "Octobre 2026"
  weekKey: string; // YYYY-Www
  weekLabel: string; // ex: "Semaine 42 (12/10 - 18/10/2026)"
  truckKey: "AMARA" | "BRAHIMA" | "SORO" | "FLOTTE";
  vehicle: string; // ex: "AMARA TRUCK 76"
  domain: "maintenance" | "expense";
  subType: MaintenanceOrExpenseSubType;
  subTypeLabel: string;
  title: string; // Libellé clair en français
  rawComment: string; // Commentaire original de la feuille Spreadsheet (Col M / N)
  quantityNote?: string; // ex: "2 pneus", "24 pneus", "205L huile"
  baseCost: number; // Prix de base (ex: Prix des pneus / pièces / prestation)
  mountingCost: number; // Frais de montage / Main d'œuvre mécanique
  deliveryCost: number; // Frais de livraison / Transport / Yango associé
  totalCost: number; // Total = baseCost + mountingCost + deliveryCost
  driveLink?: string | null;
  sourceRow?: number;
}

export interface BreakdownAggregateGroup {
  key: string;
  label: string;
  subLabel?: string;
  count: number;
  baseCost: number;
  mountingCost: number;
  deliveryCost: number;
  totalCost: number;
  items: AnalyzedExpenseItem[];
}

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Corrige toute date erronée issue d'un ancien parsing qui avait forcé l'année 2026
 * sur des lignes d'octobre, novembre ou décembre 2025 (ex: "2026-12-31" -> "2025-12-31").
 */
export function sanitizeSpreadsheetDate(dateStr: string): string {
  if (!dateStr) return "2026-01-01";
  const trimmed = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Aujourd'hui est le 21 octobre 2026 : toute date > 2026-10-21 issue du Spreadsheet
  // correspond en réalité à une écriture de fin 2025 (octobre, novembre ou décembre 2025).
  if (trimmed > "2026-10-21" && trimmed.startsWith("2026-")) {
    return `2025-${trimmed.slice(5)}`;
  }
  return trimmed;
}

export function formatFrDate(isoDate: string): string {
  const clean = sanitizeSpreadsheetDate(isoDate);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getMonthMeta(isoDate: string, lang: "FR" | "EN" = "FR") {
  const clean = sanitizeSpreadsheetDate(isoDate);
  const [y, m] = clean.split("-");
  const mIdx = Math.max(0, Math.min(11, (parseInt(m, 10) || 1) - 1));
  const mName = lang === "EN" ? MONTHS_EN[mIdx] : MONTHS_FR[mIdx];
  return {
    monthKey: `${y}-${m}`,
    monthLabel: `${mName} ${y}`,
  };
}

export function getIsoWeekMeta(isoDate: string, lang: "FR" | "EN" = "FR") {
  const clean = sanitizeSpreadsheetDate(isoDate);
  const d = new Date(`${clean}T00:00:00Z`);
  if (isNaN(d.getTime())) {
    return { weekKey: clean, weekLabel: clean };
  }
  const dayNr = (d.getUTCDay() + 6) % 7; // Lundi = 0
  const target = new Date(d.valueOf());
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const isoYear = target.getUTCFullYear();

  const monday = new Date(d.valueOf());
  monday.setUTCDate(d.getUTCDate() - dayNr);
  const sunday = new Date(monday.valueOf());
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmtShort = (dt: Date) =>
    `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;

  const weekKey = `${isoYear}-W${String(week).padStart(2, "0")}`;
  const weekLabel =
    lang === "EN"
      ? `Week ${week} (${fmtShort(monday)} - ${fmtShort(sunday)}/${sunday.getUTCFullYear()})`
      : `Semaine ${week} (${fmtShort(monday)} au ${fmtShort(sunday)}/${sunday.getUTCFullYear()})`;

  return { weekKey, weekLabel };
}

export function getSubTypeLabel(subType: MaintenanceOrExpenseSubType, lang: "FR" | "EN" = "FR"): string {
  const isEn = lang === "EN";
  switch (subType) {
    case "pneu":
      return isEn ? "Tires & Wheels" : "Pneus & Train Roulant";
    case "vidange":
      return isEn ? "Oil & Filters" : "Vidanges, Huiles & Filtres";
    case "mecanique":
      return isEn ? "Mechanics & Parts" : "Mécanique, Freins & Pièces";
    case "lavage":
      return isEn ? "Washing & Greasing" : "Lavage & Graissage";
    case "salaires":
      return isEn ? "Salaries & Crew" : "Salaires & Rémunérations";
    case "loyer":
      return isEn ? "Rent & Housing" : "Loyer & Logement Flotte";
    case "yango":
      return isEn ? "Urban Transport (Yango)" : "Transport Urbain (Yango)";
    case "assurances":
      return isEn ? "Insurance & Permits" : "Assurances & Cartes Transport";
    case "telecom":
      return isEn ? "GPS, Internet & Power" : "GPS, Internet & Électricité";
    case "taxes":
      return isEn ? "Taxes & Accounting" : "Impôts, Taxes & Comptabilité";
    default:
      return isEn ? "General Expenses" : "Charges Générales & Divers";
  }
}

function detectTruckFromText(text: string): {
  truckKey: "AMARA" | "BRAHIMA" | "SORO" | "FLOTTE";
  vehicle: string;
} {
  const lower = String(text || "").toLowerCase();
  const hasAmara = /amara|amra|\b76\b/.test(lower);
  const hasBrahima = /brahima|\b45\b/.test(lower);
  const hasSoro = /soro|sorro|\b52\b/.test(lower);

  const count = (hasAmara ? 1 : 0) + (hasBrahima ? 1 : 0) + (hasSoro ? 1 : 0);
  if (count > 1 || count === 0) {
    return { truckKey: "FLOTTE", vehicle: "FLOTTE (3 CAMIONS)" };
  }
  if (hasAmara) return { truckKey: "AMARA", vehicle: "AMARA TRUCK 76" };
  if (hasBrahima) return { truckKey: "BRAHIMA", vehicle: "BRAHIMA TRUCK 45" };
  return { truckKey: "SORO", vehicle: "SORO TRUCK 52" };
}

function createItem(
  partial: {
    id: string;
    date: string;
    truckKey: "AMARA" | "BRAHIMA" | "SORO" | "FLOTTE";
    vehicle: string;
    domain: "maintenance" | "expense";
    subType: MaintenanceOrExpenseSubType;
    title: string;
    rawComment: string;
    quantityNote?: string;
    baseCost: number;
    mountingCost: number;
    deliveryCost: number;
    driveLink?: string | null;
    sourceRow?: number;
  },
  lang: "FR" | "EN" = "FR"
): AnalyzedExpenseItem {
  const cleanDate = sanitizeSpreadsheetDate(partial.date);
  const { monthKey, monthLabel } = getMonthMeta(cleanDate, lang);
  const { weekKey, weekLabel } = getIsoWeekMeta(cleanDate, lang);
  const baseCost = Math.round(partial.baseCost || 0);
  const mountingCost = Math.round(partial.mountingCost || 0);
  const deliveryCost = Math.round(partial.deliveryCost || 0);
  const totalCost = baseCost + mountingCost + deliveryCost;

  return {
    id: partial.id,
    date: cleanDate,
    displayDate: formatFrDate(cleanDate),
    monthKey,
    monthLabel,
    weekKey,
    weekLabel,
    truckKey: partial.truckKey,
    vehicle: partial.vehicle,
    domain: partial.domain,
    subType: partial.subType,
    subTypeLabel: getSubTypeLabel(partial.subType, lang),
    title: partial.title,
    rawComment: partial.rawComment,
    quantityNote: partial.quantityNote,
    baseCost,
    mountingCost,
    deliveryCost,
    totalCost,
    driveLink: partial.driveLink || null,
    sourceRow: partial.sourceRow,
  };
}

/**
 * Analyse générique d'un commentaire pour extraire automatiquement :
 * - Frais de livraison / transport (delivery, transport, yango)
 * - Frais de montage / main d'œuvre (labor, labour, mecanic work, montage, change)
 * - Prix de base (achat pneu / pièce / huile / prestation)
 */
function parseGenericBreakdown(totalAmount: number, comment: string): {
  baseCost: number;
  mountingCost: number;
  deliveryCost: number;
} {
  if (!comment || totalAmount <= 0) {
    return { baseCost: totalAmount, mountingCost: 0, deliveryCost: 0 };
  }

  let deliveryCost = 0;
  let mountingCost = 0;

  const parseTokenAmount = (numStr: string, hasK: boolean) => {
    const cleaned = numStr.replace(/\s/g, "").replace(/,/g, ".");
    const val = parseFloat(cleaned) || 0;
    if (hasK || (val > 0 && val < 1000)) return Math.round(val * 1000);
    return Math.round(val);
  };

  // Extraction livraison / transport explicite dans le commentaire
  const deliveryMatches = [
    ...comment.matchAll(/(\d[\d\s.,]*)\s*(k|cfa|f)?\s*(?:for\s+)?(?:delivery|livraison|transport|trasport|yango)/gi),
    ...comment.matchAll(/(?:delivery|livraison|transport|trasport)\s*[:=]?\s*(\d[\d\s.,]*)\s*(k|cfa|f)?/gi),
  ];
  for (const m of deliveryMatches) {
    const val = parseTokenAmount(m[1], String(m[2] || "").toLowerCase() === "k");
    if (val > 0 && val < totalAmount) {
      deliveryCost += val;
      break;
    }
  }

  // Extraction montage / main d'œuvre explicite dans le commentaire
  const laborMatches = [
    ...comment.matchAll(/(\d[\d\s.,]*)\s*(k|cfa|f)?\s*(?:for\s+)?(?:labor|labour|mecanic'?s?\s*(?:work|labor|labour|payment)|main\s*d'oeuvre|montage)/gi),
  ];
  for (const m of laborMatches) {
    const val = parseTokenAmount(m[1], String(m[2] || "").toLowerCase() === "k");
    if (val > 0 && val < totalAmount - deliveryCost) {
      mountingCost += val;
      break;
    }
  }

  // Si le commentaire est uniquement de la main d'œuvre (ex: "mechanic labor", "labour mecanic's")
  if (
    mountingCost === 0 &&
    deliveryCost === 0 &&
    /^\s*(?:mecanic|mechanic|mecanique)s?\s*labou?r/i.test(comment.trim())
  ) {
    return { baseCost: 0, mountingCost: totalAmount, deliveryCost: 0 };
  }

  const baseCost = Math.max(0, totalAmount - mountingCost - deliveryCost);
  return { baseCost, mountingCost, deliveryCost };
}

export function translateCategoryName(cat: string, lang: "FR" | "EN" = "FR"): string {
  if (lang !== "EN") return cat;
  switch (cat) {
    case "Carburant (Gasoil)": return "Diesel Fuel";
    case "Frais de Route & Péages": return "Road Fees & Tolls";
    case "Pneus & Train Roulant": return "Tires & Wheels";
    case "Maintenance & Vidanges": return "Oil Service & Maintenance";
    case "Mécanique & Pièces de Rechange": return "Mechanics & Spare Parts";
    case "Lavage & Entretien Flotte": return "Washing & Fleet Care";
    case "Salaires & Rémunérations": return "Salaries & Payroll";
    case "Loyer & Logement Flotte": return "Housing & Rent";
    case "Transport Urbain (Yango)": return "Urban Transport (Yango)";
    case "Assurances Flotte": return "Fleet Insurance";
    case "Cartes de Transport & Régularisations": return "Transport Cards & Permits";
    case "GPS, Télécoms & Énergie": return "GPS, Telecom & Energy";
    case "Impôts & Taxes d’État": return "State Taxes";
    case "Charges Générales & Divers": return "General & Misc Expenses";
    case "Dépenses Personnelles": return "Personal Expenses";
    default: return cat;
  }
}

/**
 * Moteur principal d'analyse et de décomposition des maintenances et de toutes les dépenses
 * à partir des transactions du Spreadsheet (Col M & Col N) et des saisies manuelles.
 */
export function analyzeAllMaintenanceAndExpenses(
  transactions?: AccountingTransaction[],
  manualMaintenanceRecords?: any[],
  lang: "FR" | "EN" = "FR"
): AnalyzedExpenseItem[] {
  const isEn = lang === "EN";
  const tT = (fr: string, en: string) => (isEn ? en : fr);

  const txSource =
    transactions && transactions.length > 0 ? transactions : INITIAL_ACCOUNTING_TRANSACTIONS;

  const items: AnalyzedExpenseItem[] = [];

  // Regrouper les transactions de sortie (hors carburant col D et frais de route col F) par (date, sourceRow)
  // afin d'associer automatiquement les frais de livraison/Yango de la même ligne aux achats de pneus/pièces !
  const byRow = new Map<string, AccountingTransaction[]>();

  txSource.forEach((tx) => {
    if (tx.type !== "out" || tx.amount <= 0) return;
    if (tx.category === "Carburant (Gasoil)" || tx.category === "Frais de Route & Péages") return;
    const cleanDate = sanitizeSpreadsheetDate(tx.date);
    const key = `${cleanDate}-r${tx.sourceRow || tx.id}`;
    if (!byRow.has(key)) byRow.set(key, []);
    byRow.get(key)!.push({ ...tx, date: cleanDate });
  });

  for (const [rowKey, rowTxs] of byRow.entries()) {
    const primary = rowTxs[0];
    const date = primary.date;
    const commentM = primary.commentColM || "";
    const commentN = primary.commentColN || "";
    const rawComment = [commentM, commentN].filter(Boolean).join(" | ") || primary.comment || "";
    const lowerComment = rawComment.toLowerCase();

    const companyTx = rowTxs.find(
      (t) => t.category !== "Transport Urbain (Yango)" && t.category !== "Dépenses Personnelles"
    );
    const yangoTx = rowTxs.find((t) => t.category === "Transport Urbain (Yango)");
    const personalTx = rowTxs.find((t) => t.category === "Dépenses Personnelles");

    const companyAmt = companyTx ? companyTx.amount : 0;
    const yangoAmt = yangoTx ? yangoTx.amount : 0;
    const personalAmt = personalTx ? personalTx.amount : 0;
    const driveLink = primary.driveLink || null;
    const sourceRow = primary.sourceRow;

    // ========================================================================
    // CAS SPÉCIFIQUES MULTI-COMPOSANTES DOCUMENTÉS DANS LE SPREADSHEET (COL M/N)
    // ========================================================================

    // 1. 2026-10-15 : "1 tire for Amara + 1 for Brahima; 100K for Amara truck repairs" (382 800 + 5 050 Yango)
    if (date === "2026-10-15" && /1 tire for amara/i.test(lowerComment)) {
      const tireTotal = Math.max(0, companyAmt - 100000); // 282 800 CFA pour 2 pneus
      const eachTire = Math.round(tireTotal / 2); // 141 400 CFA par pneu
      const eachDelivery = Math.round(yangoAmt / 2); // 2 525 CFA par pneu
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-amara`,
            date,
            truckKey: "AMARA",
            vehicle: "AMARA TRUCK 76",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat 1 Pneu Neuf (AMARA 76)", "Purchase 1 New Tire (AMARA 76)"),
            rawComment: commentM || rawComment,
            quantityNote: tT("1 pneu", "1 tire"),
            baseCost: eachTire,
            mountingCost: 0,
            deliveryCost: eachDelivery,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-pneu-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat 1 Pneu Neuf (BRAHIMA 45)", "Purchase 1 New Tire (BRAHIMA 45)"),
            rawComment: commentM || rawComment,
            quantityNote: tT("1 pneu", "1 tire"),
            baseCost: tireTotal - eachTire,
            mountingCost: 0,
            deliveryCost: yangoAmt - eachDelivery,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-mec-amara`,
            date,
            truckKey: "AMARA",
            vehicle: "AMARA TRUCK 76",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Réparation mécanique camion AMARA (100K)", "Mechanical repairs AMARA truck (100K)"),
            rawComment: commentM || rawComment,
            baseCost: 100000,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 2. 2026-10-14 : "Tire for Amara's truck // 7070 delivery" (143 420 + 7 070 livraison)
    if (date === "2026-10-14" && /tire for amara/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-amara`,
            date,
            truckKey: "AMARA",
            vehicle: "AMARA TRUCK 76",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat 1 Pneu (AMARA 76) + Livraison", "Purchase 1 Tire (AMARA 76) + Delivery"),
            rawComment: commentM || rawComment,
            quantityNote: tT("1 pneu", "1 tire"),
            baseCost: companyAmt,
            mountingCost: 0,
            deliveryCost: yangoAmt || 7070,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 3. 2026-10-13 : "151500 soro truck bearing and hub change // 400K OIl Tank for 205L // 85850 new baterie for soro trucks // 50500 labor for oil change and maintenance // 6060 transport"
    if (date === "2026-10-13" && /bearing and hub/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-vidange-flotte`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Fût d'huile moteur 205L (400K) + Main d'œuvre vidange", "205L Engine Oil Drum (400K) + Oil Service Labor"),
            rawComment: commentM || rawComment,
            quantityNote: tT("205L Huile", "205L Oil"),
            baseCost: 400000,
            mountingCost: 25250,
            deliveryCost: yangoAmt,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-mec-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Roulement & moyeu (151 500) + Batterie neuve (85 850) — SORO 52", "Bearing & hub (151,500) + New battery (85,850) — SORO 52"),
            rawComment: commentM || rawComment,
            quantityNote: tT("Roulement + Batterie", "Bearing + Battery"),
            baseCost: 151500 + 85850,
            mountingCost: 25250,
            deliveryCost: 6060,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 4. 2026-10-09 : "brahima truck bearing and hub change 121200 +40K labor and transport"
    if (date === "2026-10-09" && /bearing and hub/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Changement roulement & moyeu (BRAHIMA 45)", "Bearing & hub replacement (BRAHIMA 45)"),
            rawComment: commentM || rawComment,
            baseCost: 121200,
            mountingCost: 30000,
            deliveryCost: 10400,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 5. 2026-09-24 : "66700 Hydrolique cable + 92250 60L hydrolique oil +15K labour"
    if (date === "2026-09-24" && /hydrolique/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-hydrol`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Câble hydraulique (66 700) + Montage", "Hydraulic cable (66,700) + Labor"),
            rawComment,
            baseCost: 66700,
            mountingCost: 15375,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-vid-hydrol`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Bidon 60L Huile Hydraulique", "60L Hydraulic Oil Drum"),
            rawComment,
            quantityNote: tT("60L Huile hydraulique", "60L Hydraulic Oil"),
            baseCost: 92250,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 6. 2026-09-23 : "soro's truc electric's probleme 25625 + 5375labor"
    if (date === "2026-09-23" && /electric/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Réparation électrique (SORO 52)", "Electrical repair (SORO 52)"),
            rawComment,
            baseCost: 25625,
            mountingCost: 5375,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 7. 2026-09-10 : "3 tieres + transport and transaction fee" (451 000 CFA)
    if (date === "2026-09-10" && /tieres|tires/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-3`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat de 3 Pneus + Livraison / Transport", "Purchase 3 Tires + Delivery / Transport"),
            rawComment: commentM || rawComment,
            quantityNote: tT("3 pneus", "3 tires"),
            baseCost: 424200,
            mountingCost: 0,
            deliveryCost: 26800,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 8. 2026-08-27 : "1 Tire's (it's a global bill withe the one on the 10th september" (161 500 CFA)
    if (date === "2026-08-27" && /tire/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-1`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat 1 Pneu Neuf (Facture groupée)", "Purchase 1 New Tire (Grouped invoice)"),
            rawComment: commentM || rawComment,
            quantityNote: tT("1 pneu", "1 tire"),
            baseCost: companyAmt,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 9. 2026-08-04 : "salary Driver's helepers ... // 42925Cfa Broken soro's rear wheel Change"
    if (date === "2026-08-04" && /rear wheel change/i.test(lowerComment)) {
      if (companyAmt > 0) {
        items.push(
          createItem(
            {
              id: `${rowKey}-salaires`,
              date,
              truckKey: "FLOTTE",
              vehicle: "FLOTTE (3 CAMIONS)",
              domain: "expense",
              subType: "salaires",
              title: tT("Salaires Chauffeurs, Apprentis & Direction", "Salaries: Drivers, Apprentices & Management"),
              rawComment,
              baseCost: companyAmt,
              mountingCost: 0,
              deliveryCost: 0,
              driveLink,
              sourceRow,
            },
            lang
          )
        );
      }
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Remplacement & montage roue arrière cassée (SORO 52)", "Replacement & mounting broken rear wheel (SORO 52)"),
            rawComment: "42925Cfa Broken soro's rear wheel Change",
            quantityNote: tT("1 roue arrière", "1 rear wheel"),
            baseCost: 0,
            mountingCost: yangoAmt || 42925,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 10. 2026-07-29 : "25K Drum Break change Soro, 8K labor, 15k Fuel for Jean ... 15K drivers Transport 5k tires repartion"
    if (date === "2026-07-29" && /drum break change soro/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Réparation & montage pneu (SORO 52)", "Tire repair & mounting (SORO 52)"),
            rawComment,
            quantityNote: tT("Réparation pneu", "Tire repair"),
            baseCost: 0,
            mountingCost: 5000,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-mec-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Tambour de frein Soro (25K) + Main d'œuvre (8K) + Transport (15K)", "Soro Brake Drum (25K) + Labor (8K) + Transport (15K)"),
            rawComment,
            baseCost: 25000,
            mountingCost: 8000,
            deliveryCost: 15000,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-div`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "expense",
            subType: "divers",
            title: tT("Carburant & déplacement démarche contrat (Jean)", "Fuel & travel for contract arrangements (Jean)"),
            rawComment,
            baseCost: Math.max(0, (yangoAmt || 70700) - 53000),
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 11. 2026-04-21 : "4 Front Tires 560K 3 spare 130K and transport" (980 000 CFA)
    if (date === "2026-04-21" && /front tires/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-7`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("4 Pneus Avant (560 000) + 3 Pneus Secours (390 000) + Livraison", "4 Front Tires (560,000) + 3 Spare Tires (390,000) + Delivery"),
            rawComment,
            quantityNote: tT("7 pneus (4 avant + 3 secours)", "7 tires (4 front + 3 spare)"),
            baseCost: 950000,
            mountingCost: 0,
            deliveryCost: 30000,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 12. 2026-04-16 : "Oil change for Amara and Brahima. Air systeme change for Amara. bill 180Kand 75k for Labor for the 2 trucks" (255 000 CFA)
    if (date === "2026-04-16" && /oil change for amara and brahima/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-vid-amara`,
            date,
            truckKey: "AMARA",
            vehicle: "AMARA TRUCK 76",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Vidange & système d'air (AMARA 76)", "Oil service & air system (AMARA 76)"),
            rawComment,
            baseCost: 90000,
            mountingCost: 37500,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-vid-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Vidange complète (BRAHIMA 45)", "Complete oil service (BRAHIMA 45)"),
            rawComment,
            baseCost: 90000,
            mountingCost: 37500,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 13. 2026-04-03 : "282800 2 Front Tires 20200 Transport abidjan San Pedro" (300 400 CFA)
    if (date === "2026-04-03" && /front tires/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-2`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("2 Pneus Avant + Livraison Abidjan → San Pedro", "2 Front Tires + Delivery Abidjan → San Pedro"),
            rawComment,
            quantityNote: tT("2 pneus avant", "2 front tires"),
            baseCost: 280200,
            mountingCost: 0,
            deliveryCost: 20200,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 14. 2026-02-24 : "40400F Mecanic laboR 245430 Materiel sorro Trucks" (285 830 CFA)
    if (date === "2026-02-24" && /245430/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-soro`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Pièces mécaniques (245 430) + Main d'œuvre (40 400) — SORO 52", "Mechanical parts (245,430) + Labor (40,400) — SORO 52"),
            rawComment,
            baseCost: 245430,
            mountingCost: 40400,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 15. 2026-02-07 : "Drum Break change pompes 5770 delivery" (75 750 CFA)
    if (date === "2026-02-07" && /5770 delivery/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-drum`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Tambour de frein & pompes + Livraison (5 770)", "Brake drum & pumps + Delivery (5,770)"),
            rawComment,
            baseCost: 69980,
            mountingCost: 0,
            deliveryCost: 5770,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 16. 2026-01-11 : "Oil and Air filter +5K trasport" (217 150 CFA)
    if (date === "2026-01-11" && /oil and air filter/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-vid-filter`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Filtres à huile et à air + Livraison (5 000)", "Oil and air filters + Delivery (5,000)"),
            rawComment,
            baseCost: 212150,
            mountingCost: 0,
            deliveryCost: 5000,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 17. 2026-01-07 : "We change all Tire from the dump this day 12 new's tire each" (4 650 000 + 24 800 transport)
    if (date === "2026-01-07" && /change all tire/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-36`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Remplacement complet Pneus Bennes (12 pneus neufs / camion)", "Complete Tipper Tires Replacement (12 new tires / truck)"),
            rawComment,
            quantityNote: tT("36 pneus bennes (12 × 3)", "36 tipper tires (12 × 3)"),
            baseCost: companyAmt,
            mountingCost: 0,
            deliveryCost: yangoAmt,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 18. 2026-01-01 : "55K Brahima Hydrolic Tube 5K Mecanic Labor 2K mecanick transport 100K for 4 times 25L hydrolic oil 1M120 Surafel Salary"
    if (date === "2026-01-01" && /hydrolic tube/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Flexible hydraulique Brahima (55K) + Montage (5K) + Transport (2K)", "Brahima hydraulic hose (55K) + Mounting (5K) + Transport (2K)"),
            rawComment,
            baseCost: 55000,
            mountingCost: 5000,
            deliveryCost: 2000,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-vid-hydrol`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("4 Bidons de 25L d'Huile Hydraulique (100L)", "4 Drums of 25L Hydraulic Oil (100L)"),
            rawComment,
            quantityNote: tT("100L Huile hydraulique", "100L Hydraulic Oil"),
            baseCost: 100000,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-salaires`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "expense",
            subType: "salaires",
            title: tT("Rémunération Direction (Surafel)", "Management Compensation (Surafel)"),
            rawComment,
            baseCost: Math.max(0, companyAmt - 162000),
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 19. 2025-12-31 : "843600CFA Payment driver's and helpers ... 120K mecanic stuff for Brahima And SOro Truck 5K delivery 25250CFA Mecanics Labor"
    if (date === "2025-12-31" && /120k mecanic stuff/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-brahima-soro`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Pièces mécaniques Brahima & Soro (120K) + Montage (25 250) + Livraison (5K)", "Brahima & Soro mechanical parts (120K) + Mounting (25,250) + Delivery (5K)"),
            rawComment,
            baseCost: 120000,
            mountingCost: 25250,
            deliveryCost: 5000,
            driveLink,
            sourceRow,
          },
          lang
        ),
        createItem(
          {
            id: `${rowKey}-salaires`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "expense",
            subType: "salaires",
            title: tT("Salaires Chauffeurs & Apprentis (Décembre 2025)", "Salaries: Drivers & Apprentices (December 2025)"),
            rawComment,
            baseCost: 843600,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 20. 2025-12-15 : "I sent 2 tires to san pedro this day 32K for Yango and 20K for driver till san pedro" (52 230 CFA)
    if (date === "2025-12-15" && /sent 2 tires to san pedro/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-livraison`,
            date,
            truckKey: "SORO",
            vehicle: "SORO TRUCK 52",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Livraison & Expédition de 2 Pneus vers San Pedro (Yango 32K + Transport 20K)", "Delivery & Shipping of 2 Tires to San Pedro (Yango 32K + Transport 20K)"),
            rawComment,
            quantityNote: tT("Livraison 2 pneus", "2 tires delivery"),
            baseCost: 0,
            mountingCost: 0,
            deliveryCost: yangoAmt || 52230,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 21. 2025-11-07 : "62620 Cfa Payment for 24 Tires Change // 24240Cfa drivers food + transport" (86 860 CFA)
    if (date === "2025-11-07" && /24\s*tires change/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-montage-24`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Frais de Montage de 24 Pneus (62 620) + Transport/Déplacement (24 240)", "Mounting Fees for 24 Tires (62,620) + Transport/Travel (24,240)"),
            rawComment,
            quantityNote: tT("Montage 24 pneus", "24 tires mounting"),
            baseCost: 0,
            mountingCost: 62620,
            deliveryCost: 24240,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 22. 2025-11-03 : "Payment for 24Tires" (3 305 500 CFA)
    if (date === "2025-11-03" && /24\s*tires/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-achat-24`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Achat de 24 Pneus Neufs", "Purchase of 24 New Tires"),
            rawComment,
            quantityNote: tT("24 pneus neufs", "24 new tires"),
            baseCost: companyAmt,
            mountingCost: 0,
            deliveryCost: 0,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 23. 2025-10-31 : "158 720Cfa Oil Filter // 4554cfa delivery // /// 78780Cfa mecanique payment for all the reparation"
    if (date === "2025-10-31" && /oil filter/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-vid-oct31`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Filtres à huile (158 720) + Livraison (4 545)", "Oil filters (158,720) + Delivery (4,545)"),
            rawComment,
            baseCost: 158720,
            mountingCost: 0,
            deliveryCost: 4545,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 24. 2025-09-08 : "Brahima Tire Brake 151K materiel 30K mecanics work" (181 800 + 5 600 Yango)
    if (date === "2025-09-08" && /brahima tire brake/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Pneus & Freins Brahima (151K matériel + 30.8K montage + 5.6K livraison)", "Brahima Tires & Brakes (151K parts + 30.8K mounting + 5.6K delivery)"),
            rawComment,
            baseCost: 151000,
            mountingCost: 30800,
            deliveryCost: yangoAmt || 5600,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 25. 2025-09-04 : "Tires Probelem Brahima 15K material 15K mecanics" (30 300 + 6 500 Yango)
    if (date === "2025-09-04" && /tires probelem brahima/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-pneu-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "pneu",
            title: tT("Réparation Pneus Brahima (15K matériel + 15.3K montage + 6.5K livraison)", "Brahima Tire Repair (15K parts + 15.3K mounting + 6.5K delivery)"),
            rawComment,
            baseCost: 15000,
            mountingCost: 15300,
            deliveryCost: yangoAmt || 6500,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 26. 2025-07-20 : "378 750CFA for 205L Oil / 333 805CFA filter for the 3 Trucks// 10K Tranport // 45K Mecanic" (767 555 CFA)
    if (date === "2025-07-20" && /205l oil/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-vid-juil20`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "vidange",
            title: tT("Huile 205L (378 750) + Filtres 3 Camions (333 805) + Montage (45K) + Livraison (10K)", "205L Oil (378,750) + Filters for 3 Trucks (333,805) + Mounting (45K) + Delivery (10K)"),
            rawComment,
            quantityNote: tT("205L Huile + Filtres", "205L Oil + Filters"),
            baseCost: 378750 + 333805,
            mountingCost: 45000,
            deliveryCost: 10000,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 27. 2025-07-21 : "pump mecanique probleme on Brahima Trucks 24K the new pump 8K new pipe + 15k mecanicienn 4K his transport 7KYango"
    if (date === "2025-07-21" && /pump mecanique/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-brahima`,
            date,
            truckKey: "BRAHIMA",
            vehicle: "BRAHIMA TRUCK 45",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Pompe neuve (24K) + Tuyau (8K) + Montage mécanicien (15K) + Transport/Yango", "New pump (24K) + Hose (8K) + Mechanic mounting (15K) + Transport/Yango"),
            rawComment,
            baseCost: 44000,
            mountingCost: 15000,
            deliveryCost: 4000 + personalAmt,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // 28. 2025-08-13 : "38380F (mecanic 24240F Pompe + 14140 transport & mecanics works)"
    if (date === "2025-08-13" && /24240f pompe/i.test(lowerComment)) {
      items.push(
        createItem(
          {
            id: `${rowKey}-mec-pompe`,
            date,
            truckKey: "FLOTTE",
            vehicle: "FLOTTE (3 CAMIONS)",
            domain: "maintenance",
            subType: "mecanique",
            title: tT("Pompe mécanique (24 240) + Montage & Transport (14 140)", "Mechanical pump (24,240) + Mounting & Transport (14,140)"),
            rawComment,
            baseCost: 24240,
            mountingCost: 10000,
            deliveryCost: 4140,
            driveLink,
            sourceRow,
          },
          lang
        )
      );
      continue;
    }

    // ========================================================================
    // TRAITEMENT STANDARD DE TOUTES LES AUTRES LIGNES DU SPREADSHEET
    // ========================================================================
    rowTxs.forEach((tx) => {
      const { truckKey, vehicle } = detectTruckFromText(rawComment);
      let domain: "maintenance" | "expense" = "expense";
      let subType: MaintenanceOrExpenseSubType = "divers";

      if (tx.category === "Pneus & Train Roulant" || /tire|pneu|tieres/i.test(lowerComment)) {
        if (tx.category === "Pneus & Train Roulant" || (tx.category === "Transport Urbain (Yango)" && /tire|pneu/i.test(lowerComment) && companyAmt === 0)) {
          domain = "maintenance";
          subType = "pneu";
        }
      }

      if (domain !== "maintenance") {
        switch (tx.category) {
          case "Maintenance & Vidanges":
            domain = "maintenance";
            subType = "vidange";
            break;
          case "Mécanique & Pièces de Rechange":
            domain = "maintenance";
            subType = "mecanique";
            break;
          case "Lavage & Entretien Flotte":
            domain = "maintenance";
            subType = "lavage";
            break;
          case "Salaires & Rémunérations":
            domain = "expense";
            subType = "salaires";
            break;
          case "Loyer & Logement Flotte":
            domain = "expense";
            subType = "loyer";
            break;
          case "Transport Urbain (Yango)":
            if (/broken.*cable|tire probleme|grease/i.test(lowerComment) && companyAmt === 0) {
              domain = "maintenance";
              subType = /tire/i.test(lowerComment)
                ? "pneu"
                : /grease/i.test(lowerComment)
                ? "lavage"
                : "mecanique";
            } else {
              domain = "expense";
              subType = "yango";
            }
            break;
          case "Assurances Flotte":
          case "Cartes de Transport & Régularisations":
            domain = "expense";
            subType = "assurances";
            break;
          case "GPS, Télécoms & Énergie":
            domain = "expense";
            subType = "telecom";
            break;
          case "Impôts & Taxes d’État":
            domain = "expense";
            subType = "taxes";
            break;
          default:
            if (/47200k?\s*oil/i.test(lowerComment)) {
              domain = "maintenance";
              subType = "vidange";
            } else if (/whashing|washing/i.test(lowerComment)) {
              domain = "maintenance";
              subType = "lavage";
            } else if (/salry|salary/i.test(lowerComment)) {
              domain = "expense";
              subType = "salaires";
            } else {
              domain = "expense";
              subType = "divers";
            }
            break;
        }
      }

      const breakdown =
        subType === "yango"
          ? { baseCost: 0, mountingCost: 0, deliveryCost: tx.amount }
          : parseGenericBreakdown(tx.amount, rawComment);

      const catTranslated = translateCategoryName(tx.category, lang);
      items.push(
        createItem(
          {
            id: tx.id,
            date: tx.date,
            truckKey,
            vehicle,
            domain,
            subType,
            title: rawComment || catTranslated,
            rawComment: rawComment || tx.category,
            baseCost: breakdown.baseCost,
            mountingCost: breakdown.mountingCost,
            deliveryCost: breakdown.deliveryCost,
            driveLink: tx.driveLink,
            sourceRow: tx.sourceRow,
          },
          lang
        )
      );
    });
  }

  // Ajouter les éventuelles maintenances saisies manuellement par l'utilisateur (hors doublons Google Sheets)
  if (Array.isArray(manualMaintenanceRecords)) {
    manualMaintenanceRecords.forEach((m, idx) => {
      if (!m) return;
      const isGs =
        m.source === "Google Sheets" ||
        String(m.id || "").startsWith("gs-") ||
        String(m.id || "").startsWith("tx-");
      if (isGs) return;

      const cost = Number(m.cost || m.amount || 0);
      if (cost <= 0) return;
      const desc = String(m.description || "").trim();
      const { truckKey, vehicle } = detectTruckFromText(`${m.vehicle || ""} ${desc}`);
      const lower = desc.toLowerCase();
      let subType: MaintenanceOrExpenseSubType = "mecanique";
      if (/pneu|tire|roue/i.test(lower)) subType = "pneu";
      else if (/vidange|oil|huile|filtre|filter/i.test(lower)) subType = "vidange";
      else if (/lavage|washing|graissage|grease/i.test(lower)) subType = "lavage";

      const breakdown = parseGenericBreakdown(cost, desc);
      items.push(
        createItem(
          {
            id: m.id || `manual-maint-${idx}`,
            date: sanitizeSpreadsheetDate(m.date),
            truckKey,
            vehicle: m.vehicle || vehicle,
            domain: "maintenance",
            subType,
            title: desc || (isEn ? "Manual intervention" : "Intervention manuelle"),
            rawComment: desc,
            baseCost: breakdown.baseCost,
            mountingCost: breakdown.mountingCost,
            deliveryCost: breakdown.deliveryCost,
            driveLink: m.driveLink || m.imageUrl || null,
          },
          lang
        )
      );
    });
  }

  // Tri chronologique décroissant (plus récent en haut)
  return items.sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return (b.sourceRow || 0) - (a.sourceRow || 0);
  });
}

/**
 * Agrège une liste d'éléments analysés selon l'axe choisi :
 * - "day" : Par Jour (Date par date)
 * - "week" : Par Semaine
 * - "month" : Par Mois
 * - "truck" : Par Chauffeur / Camion
 */
export function aggregateAnalyzedItems(
  items: AnalyzedExpenseItem[],
  groupBy: "day" | "week" | "month" | "truck",
  lang: "FR" | "EN" = "FR"
): BreakdownAggregateGroup[] {
  const isEn = lang === "EN";
  const map = new Map<string, BreakdownAggregateGroup>();

  items.forEach((item) => {
    let key = "";
    let label = "";
    let subLabel = "";

    if (groupBy === "day") {
      key = item.date;
      label = item.displayDate;
      subLabel = item.monthLabel;
    } else if (groupBy === "week") {
      key = item.weekKey;
      label = item.weekLabel;
      subLabel = item.monthLabel;
    } else if (groupBy === "month") {
      key = item.monthKey;
      label = item.monthLabel;
      subLabel = `${item.monthKey}`;
    } else {
      key = item.truckKey;
      label = item.vehicle;
      subLabel =
        item.truckKey === "FLOTTE"
          ? isEn
            ? "Shared expense across all 3 trucks"
            : "Dépense mutualisée sur les 3 camions"
          : isEn
          ? `Dedicated unit ${item.truckKey}`
          : `Unité dédiée ${item.truckKey}`;
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        subLabel,
        count: 0,
        baseCost: 0,
        mountingCost: 0,
        deliveryCost: 0,
        totalCost: 0,
        items: [],
      });
    }

    const grp = map.get(key)!;
    grp.count += 1;
    grp.baseCost += item.baseCost;
    grp.mountingCost += item.mountingCost;
    grp.deliveryCost += item.deliveryCost;
    grp.totalCost += item.totalCost;
    grp.items.push(item);
  });

  const groups = Array.from(map.values());
  if (groupBy === "truck") {
    const order = ["AMARA", "BRAHIMA", "SORO", "FLOTTE"];
    return groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }
  return groups.sort((a, b) => b.key.localeCompare(a.key));
}

