export interface AccountingTransaction {
  id: string;
  date: string; // ISO format: YYYY-MM-DD
  rawDate?: string;
  type: "in" | "out";
  category: AccountingCategory;
  amount: number;
  isCredit: boolean;
  comment: string;
  driveLink?: string | null;
  balance?: number;
  sourceRow: number;
  month: number;
  year: number;
}

export type AccountingCategory =
  // Entrées (Inflows)
  | "Paiements Clients & Factures"
  | "Remboursement Retenue (20%)"
  | "Apports & Avances Associés"
  | "Régularisation / Rejet Chèque"
  // Dépenses (Outflows)
  | "Carburant (Gasoil)"
  | "Frais de Route & Péages"
  | "Salaires & Rémunérations"
  | "Pneus & Train Roulant"
  | "Maintenance & Vidanges"
  | "Mécanique & Pièces de Rechange"
  | "Loyer & Logement Flotte"
  | "Assurances Flotte"
  | "Cartes de Transport & Régularisations"
  | "Impôts & Taxes d’État"
  | "Transport Urbain (Yango)"
  | "Frais Bancaires & Wave"
  | "GPS, Télécoms & Énergie"
  | "Lavage & Entretien Flotte"
  | "Dépenses Personnelles"
  | "Charges Générales & Divers";

export interface AccountingSummary {
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  currentBalance: number;
  transactionCount: number;
  byCategory: Record<string, { count: number; total: number; type: "in" | "out" }>;
  driveReceiptsCount: number;
}

/**
 * Nettoie et extrait un montant numérique CFA / devise depuis une chaîne
 */
export function parseCfaNum(v: any): number {
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/\s/g, "");
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.substring(1);
  }
  const match = s.match(/[\d,.]+/);
  if (!match) return 0;
  let numStr = match[0];
  if (numStr.includes(".") && !numStr.includes(",")) {
    if (numStr.split(".").pop()?.length === 3 || numStr.length > 5) {
      numStr = numStr.replace(/\./g, "");
    }
  }
  return sign * (parseFloat(numStr.replace(/,/g, ".").replace(/[^0-9.-]/g, "")) || 0);
}

/**
 * Normalise les dates textuelles françaises vers YYYY-MM-DD
 * Ex: "vendredi 27 juin 25" -> "2025-06-27", "mercredi 21 janvier 26" -> "2026-01-21"
 */
export function parseFrenchDate(dateStr: string, lastSeenYear = "2026"): string | null {
  if (!dateStr) return null;
  const clean = dateStr.toLowerCase().replace(/^[a-z]+[\.\s]+/i, "").trim();
  
  // Format déjà ISO ou numérique DD/MM/YYYY
  if (clean.includes("/") || clean.includes("-")) {
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let [d, m, y] = parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
      if (y.length === 2) y = "20" + y;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }

  const monthsFr: Record<string, string> = {
    "janv": "01", "janvier": "01", "févr": "02", "fevr": "02", "février": "02", "fevrier": "02",
    "mars": "03", "avr": "04", "avril": "04", "mai": "05", "juin": "06",
    "juil": "07", "juillet": "07", "août": "08", "aout": "08", "sept": "09", "septembre": "09",
    "oct": "10", "octobre": "10", "nov": "11", "novembre": "11", "déc": "12", "dec": "12", "décembre": "12", "decembre": "12"
  };

  const parts = clean.split(/[\s\/\-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, "0");
    let month = "01";
    for (const [k, v] of Object.entries(monthsFr)) {
      if (parts[1].startsWith(k)) {
        month = v;
        break;
      }
    }
    let yr = parts[2] || lastSeenYear;
    if (yr.length === 2) yr = "20" + yr;
    return `${yr}-${month}-${day}`;
  }

  return null;
}

/**
 * Analyse sémantique avancée des commentaires et colonnes
 */
export function categorizeAccountingEntry(
  type: "in" | "out",
  colName: string,
  amount: number,
  comment: string,
  fullRowText: string
): AccountingCategory {
  const c = `${comment} ${fullRowText}`.toLowerCase();

  if (type === "in") {
    if (
      c.includes("20% held") ||
      c.includes("withheld") ||
      c.includes("recovered the 20%") ||
      c.includes("retenue") ||
      c.includes("retention")
    ) {
      return "Remboursement Retenue (20%)";
    }
    if (
      c.includes("from mohamed") ||
      c.includes("from eyob") ||
      c.includes("from jean") ||
      c.includes("from temesgen") ||
      c.includes("temesgen") ||
      c.includes("apport") ||
      c.includes("avance associe")
    ) {
      return "Apports & Avances Associés";
    }
    if (amount < 0 || c.includes("unpaid check") || c.includes("deducted") || c.includes("rejet")) {
      return "Régularisation / Rejet Chèque";
    }
    return "Paiements Clients & Factures";
  }

  // Dépenses (type === "out")
  if (
    colName === "fuel" ||
    c.includes("fuel") ||
    c.includes("gasoil") ||
    c.includes("carburant") ||
    c.includes("shell") ||
    c.includes("station")
  ) {
    return "Carburant (Gasoil)";
  }

  if (
    colName === "road" ||
    c.includes("peage") ||
    c.includes("péage") ||
    c.includes("police") ||
    c.includes("road fee") ||
    c.includes("frais de route")
  ) {
    return "Frais de Route & Péages";
  }

  if (
    c.includes("salary") ||
    c.includes("salaires") ||
    c.includes("salaire") ||
    c.includes("surafel salary") ||
    c.includes("drivers payment") ||
    c.includes("helpers") ||
    c.includes("helper's") ||
    c.includes("driver's")
  ) {
    return "Salaires & Rémunérations";
  }

  if (
    c.includes("tire") ||
    c.includes("pneu") ||
    c.includes("tieres") ||
    c.includes("front tires") ||
    c.includes("spare")
  ) {
    return "Pneus & Train Roulant";
  }

  if (
    c.includes("oil change") ||
    c.includes("vidange") ||
    c.includes("205l oil") ||
    c.includes("filter") ||
    c.includes("filtre") ||
    c.includes("huile")
  ) {
    return "Maintenance & Vidanges";
  }

  if (
    c.includes("reparation") ||
    c.includes("repair") ||
    c.includes("mecanic") ||
    c.includes("brake") ||
    c.includes("frein") ||
    c.includes("pump") ||
    c.includes("pompe") ||
    c.includes("cable") ||
    c.includes("drum") ||
    c.includes("labor") ||
    c.includes("tie rod") ||
    c.includes("drag link") ||
    c.includes("hose") ||
    c.includes("wheel") ||
    c.includes("accelerator")
  ) {
    return "Mécanique & Pièces de Rechange";
  }

  if (
    c.includes("rent") ||
    c.includes("loyer") ||
    c.includes("appartement") ||
    c.includes("house stuff") ||
    c.includes("furnitures")
  ) {
    return "Loyer & Logement Flotte";
  }

  if (c.includes("inssurance") || c.includes("assurance")) {
    return "Assurances Flotte";
  }

  if (
    c.includes("controle technique") ||
    c.includes("transporter card") ||
    c.includes("carte") ||
    c.includes("autorisation") ||
    c.includes("license plate")
  ) {
    return "Cartes de Transport & Régularisations";
  }

  if (c.includes("taxe") || c.includes("impot") || c.includes("governement")) {
    return "Impôts & Taxes d’État";
  }

  if (colName === "yango" || c.includes("yango")) {
    return "Transport Urbain (Yango)";
  }

  if (
    c.includes("wave") ||
    c.includes("bank fee") ||
    c.includes("transfert take") ||
    c.includes("banque")
  ) {
    return "Frais Bancaires & Wave";
  }

  if (
    c.includes("internet") ||
    c.includes("gps") ||
    c.includes("electricity") ||
    c.includes("credit charge")
  ) {
    return "GPS, Télécoms & Énergie";
  }

  if (
    c.includes("washing") ||
    c.includes("lavage") ||
    c.includes("grease") ||
    c.includes("graissage")
  ) {
    return "Lavage & Entretien Flotte";
  }

  if (colName === "personal" || c.includes("personal")) {
    return "Dépenses Personnelles";
  }

  return "Charges Générales & Divers";
}

/**
 * Moteur principal de parsing de la feuille 'Spreedsheet'
 */
export function parseSpreadsheetAccounting(rowData: any[]): {
  transactions: AccountingTransaction[];
  summary: AccountingSummary;
} {
  if (!rowData || !Array.isArray(rowData)) {
    return {
      transactions: [],
      summary: {
        totalIn: 0,
        totalOut: 0,
        netCashFlow: 0,
        currentBalance: 0,
        transactionCount: 0,
        byCategory: {},
        driveReceiptsCount: 0
      }
    };
  }

  const transactions: AccountingTransaction[] = [];
  let lastSeenDate = "2025-06-27";
  let lastSeenYear = "2025";
  let lastValidBalance = 0;

  rowData.forEach((row, idx) => {
    if (idx === 0) return; // En-têtes

    const values = row.values || [];
    if (values.length === 0) return;

    const rowTexts = values.map((v: any) => (v?.formattedValue ? String(v.formattedValue) : ""));
    const dateRaw = rowTexts[0]?.trim() || "";

    let isoDate = parseFrenchDate(dateRaw, lastSeenYear);
    if (isoDate) {
      lastSeenDate = isoDate;
      lastSeenYear = isoDate.slice(0, 4);
    } else {
      isoDate = lastSeenDate;
    }

    const moneyIn = parseCfaNum(rowTexts[1]);
    const fuel = parseCfaNum(rowTexts[3]);
    const road = parseCfaNum(rowTexts[5]);
    const personal = parseCfaNum(rowTexts[7]);
    const company = parseCfaNum(rowTexts[8]);
    const yango = parseCfaNum(rowTexts[9]);
    const balance = parseCfaNum(rowTexts[11]);
    if (balance !== 0) lastValidBalance = balance;

    const commentColM = rowTexts[12]?.trim() || "";
    const commentColN = rowTexts[13]?.trim() || "";
    const comment = `${commentColM} ${commentColN}`.trim();

    // Recherche de lien Google Drive sur toutes les cellules de la ligne
    let driveLink: string | null = null;
    for (const cell of values) {
      if (cell?.hyperlink && /drive\.google|docs\.google/i.test(cell.hyperlink)) {
        driveLink = cell.hyperlink;
        break;
      }
    }
    if (!driveLink) {
      const fullText = rowTexts.join(" ");
      const match = fullText.match(/(https?:\/\/(?:drive|docs)\.google\.com\/[^\s]+)/i);
      if (match) driveLink = match[0];
    }

    const fullRowText = rowTexts.join(" ");
    const hasAnyAmount = moneyIn !== 0 || fuel > 0 || road > 0 || personal > 0 || company > 0 || yango > 0;
    if (!hasAnyAmount && !comment) return;

    const dateObj = new Date(isoDate);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    // 1. Entrées d'Argent (Money Received)
    if (moneyIn !== 0) {
      const isCredit = moneyIn > 0;
      const cat = categorizeAccountingEntry("in", "moneyIn", moneyIn, comment, fullRowText);
      transactions.push({
        id: `tx-in-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: isCredit ? "in" : "out",
        category: cat,
        amount: Math.abs(moneyIn),
        isCredit,
        comment: comment || (isCredit ? "Encaissement Client (Spreedsheet)" : "Rejet / Débit bancaire"),
        driveLink: driveLink,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }

    // 2. Carburant (Fuel Cost)
    if (fuel > 0) {
      transactions.push({
        id: `tx-fuel-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: "out",
        category: "Carburant (Gasoil)",
        amount: fuel,
        isCredit: false,
        comment:
          comment && /fuel|gasoil|station|shell/i.test(comment)
            ? comment
            : "Ravitaillement Carburant Flotte",
        driveLink: /fuel/i.test(comment) ? driveLink : null,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }

    // 3. Frais de Route (Road Fees)
    if (road > 0) {
      transactions.push({
        id: `tx-road-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: "out",
        category: "Frais de Route & Péages",
        amount: road,
        isCredit: false,
        comment:
          comment && /road|police|food|peage|péage/i.test(comment)
            ? comment
            : "Frais de route, péages & contrôles",
        driveLink: null,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }

    // 4. Dépenses d'Entreprise (Company Expenses)
    if (company > 0) {
      const cat = categorizeAccountingEntry("out", "company", company, comment, fullRowText);
      transactions.push({
        id: `tx-comp-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: "out",
        category: cat,
        amount: company,
        isCredit: false,
        comment: comment || "Charges Opérationnelles Entreprise",
        driveLink: driveLink,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }

    // 5. Dépenses Personnelles (Personal Expense)
    if (personal > 0) {
      transactions.push({
        id: `tx-pers-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: "out",
        category: "Dépenses Personnelles",
        amount: personal,
        isCredit: false,
        comment: comment || "Dépense Personnelle",
        driveLink: null,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }

    // 6. Transport Urbain (Yango)
    if (yango > 0) {
      transactions.push({
        id: `tx-yango-${idx}`,
        date: isoDate,
        rawDate: dateRaw || isoDate,
        type: "out",
        category: "Transport Urbain (Yango)",
        amount: yango,
        isCredit: false,
        comment: comment || "Courses urbaines logistiques Yango",
        driveLink: null,
        balance: balance || lastValidBalance,
        sourceRow: idx + 1,
        month,
        year
      });
    }
  });

  // Calcul du résumé global
  let totalIn = 0;
  let totalOut = 0;
  const byCategory: Record<string, { count: number; total: number; type: "in" | "out" }> = {};
  let driveReceiptsCount = 0;

  transactions.forEach(t => {
    if (t.type === "in") {
      totalIn += t.amount;
    } else {
      totalOut += t.amount;
    }

    if (!byCategory[t.category]) {
      byCategory[t.category] = { count: 0, total: 0, type: t.type };
    }
    byCategory[t.category].count += 1;
    byCategory[t.category].total += t.amount;

    if (t.driveLink) driveReceiptsCount += 1;
  });

  // Trier par date décroissante (plus récent d'abord)
  transactions.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return b.sourceRow - a.sourceRow;
  });

  return {
    transactions,
    summary: {
      totalIn,
      totalOut,
      netCashFlow: totalIn - totalOut,
      currentBalance: lastValidBalance,
      transactionCount: transactions.length,
      byCategory,
      driveReceiptsCount
    }
  };
}
