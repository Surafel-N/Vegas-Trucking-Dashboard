export const DEFAULT_MAX_INACTIVITY_DAYS = 21;

export const ALERT_MESSAGE_FR =
  "Incohérence : Départ de San Pedro après inactivité (Retour Abidjan manquant)";
export const ALERT_MESSAGE_EN =
  "Inconsistency: Departure from San Pedro after inactivity (Missing Abidjan return)";

export const STATUS_OK_FR = "OK";
export const STATUS_OK_EN = "OK";

export interface DiagnosticTripRecord {
  id: string;
  sheetRow?: number;
  date: string;
  displayDate: string; // JJ/MM/AAAA
  monthKey: string;
  truckKey: "AMARA" | "BRAHIMA" | "SORO";
  truckLabel: string;
  shortTruckLabel: string; // ex: "AMARA (76)"
  start: string;
  destination: string;
  corridor: "SAN_PEDRO" | "ABIDJAN";
  corridorLabel: string;
  fuelCostCfa: number;
  tonnage: number;
  roadFeesCfa: number;
  totalExpenseCfa: number;
  totalGrossCfa: number;
  inactivityDays: number;
  previousActiveDate: string | null;
  previousRoute: string | null;
  hasAnomaly: boolean;
  alertStatus: string;
  inactivityDetail: string;
}

export interface MonthlyFuelStat {
  monthKey: string; // YYYY-MM
  monthLabel: string; // ex: "Mois de janvier 2026"
  monthTitle: string; // alias de monthLabel
  totalFuelCfa: number;
  sanPedroFuelCfa: number;
  abidjanFuelCfa: number;
  refuelCount: number; // "total prise"
  maxRefuelCfa: number; // "montant supérieur prise"
  minRefuelCfa: number; // "montant inférieur"
  anomalyCount: number;
  formattedSummaryLine: string;
  records: DiagnosticTripRecord[];
}

export interface FuelBreakdownDiagnosticResult {
  records: DiagnosticTripRecord[];
  anomalies: DiagnosticTripRecord[];
  byKey: Map<string, DiagnosticTripRecord>;
}

const MONTHS_FR_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const MONTHS_EN_NAMES = [
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

export function formatDisplayDate(isoDate: string): string {
  const parts = String(isoDate || "").split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatMonthTitle(monthKey: string, language: "FR" | "EN" = "FR"): string {
  const [yearStr, monthStr] = String(monthKey || "").split("-");
  const mIdx = (parseInt(monthStr, 10) || 1) - 1;
  if (language === "EN") {
    const mName = MONTHS_EN_NAMES[mIdx] || monthStr;
    return `Month of ${mName} ${yearStr}`;
  }
  const mName = MONTHS_FR_NAMES[mIdx] || monthStr;
  const startsWithVowel = /^[aeéèêiîoôuûy]/i.test(mName);
  return startsWithVowel ? `Mois d'${mName} ${yearStr}` : `Mois de ${mName} ${yearStr}`;
}

export function computeMonthlyFuelBreakdownStats(
  rows: DiagnosticTripRecord[],
  language: "FR" | "EN" = "FR"
): MonthlyFuelStat[] {
  const isEn = language === "EN";
  const fmtNum = (n: number) => Math.round(n || 0).toLocaleString("fr-FR");

  const map = new Map<string, DiagnosticTripRecord[]>();
  (rows || []).forEach((r) => {
    const mk = r.monthKey || String(r.date || "").slice(0, 7);
    if (!mk) return;
    if (!map.has(mk)) map.set(mk, []);
    map.get(mk)!.push(r);
  });

  const sortedMonthKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedMonthKeys.map((monthKey) => {
    const monthRows = map.get(monthKey) || [];
    const fuelPositiveRows = monthRows.filter((r) => r.fuelCostCfa > 0);
    const totalFuelCfa = fuelPositiveRows.reduce((s, r) => s + r.fuelCostCfa, 0);
    const sanPedroFuelCfa = fuelPositiveRows
      .filter((r) => r.corridor === "SAN_PEDRO")
      .reduce((s, r) => s + r.fuelCostCfa, 0);
    const abidjanFuelCfa = fuelPositiveRows
      .filter((r) => r.corridor === "ABIDJAN")
      .reduce((s, r) => s + r.fuelCostCfa, 0);

    const refuelCount = fuelPositiveRows.length;
    const maxRefuelCfa =
      refuelCount > 0 ? Math.max(...fuelPositiveRows.map((r) => r.fuelCostCfa)) : 0;
    const minRefuelCfa =
      refuelCount > 0 ? Math.min(...fuelPositiveRows.map((r) => r.fuelCostCfa)) : 0;
    const anomalyCount = monthRows.filter((r) => r.hasAnomaly).length;

    const monthLabel = formatMonthTitle(monthKey, language);

    const formattedSummaryLine = isEn
      ? `${monthLabel}   •   Total: ${fmtNum(totalFuelCfa)} CFA   •   Total refuels: ${refuelCount}   •   Highest: ${fmtNum(maxRefuelCfa)} CFA   •   Lowest: ${fmtNum(minRefuelCfa)} CFA`
      : `${monthLabel}   •   Total : ${fmtNum(totalFuelCfa)} CFA   •   Total prise : ${refuelCount}   •   Montant supérieur prise : ${fmtNum(maxRefuelCfa)} CFA   •   Montant inférieur : ${fmtNum(minRefuelCfa)} CFA`;

    return {
      monthKey,
      monthLabel,
      monthTitle: monthLabel,
      totalFuelCfa,
      sanPedroFuelCfa,
      abidjanFuelCfa,
      refuelCount,
      maxRefuelCfa,
      minRefuelCfa,
      anomalyCount,
      formattedSummaryLine,
      records: monthRows,
    };
  });
}

function getTruckIdentity(raw: any): {
  key: "AMARA" | "BRAHIMA" | "SORO";
  label: string;
  shortLabel: string;
} {
  const text = `${raw?.driverLabel || ""} ${raw?.chauffeur || ""} ${raw?.sdv || ""}`.toUpperCase();
  if (text.includes("BRAHIMA") || text.includes("45")) {
    return { key: "BRAHIMA", label: "BRAHIMA TRUCK 45", shortLabel: "BRAHIMA (45)" };
  }
  if (text.includes("SORO") || text.includes("SORRO") || text.includes("52")) {
    return { key: "SORO", label: "SORO TRUCK 52", shortLabel: "SORO (52)" };
  }
  return { key: "AMARA", label: "AMARA TRUCK 76", shortLabel: "AMARA (76)" };
}

export function buildTripLookupKey(r: any): string {
  if (r?.id) return String(r.id);
  const { key } = getTruckIdentity(r);
  return `${key}-${r?.date || ""}-${Number(r?.fuel_cost_cfa) || 0}-${Number(r?.tonnage) || 0}`;
}

/**
 * Corrige uniquement l'erreur de copier-coller du 03/01/2026 sur SORO (r305, 240 220 CFA)
 * où "San Pedro" avait été recopié de fin décembre 2025 alors que les 3 camions opèrent
 * à 100% sur le corridor Lauzoua <-> Abidjan tout au long du mois de janvier 2026.
 * Toutes les autres cellules Départ / Destination restent strictement en lecture seule
 * afin de préserver l'intégrité du diagnostic d'inactivité (> 21j).
 */
export function normalizeTripCorridorFields<T extends Record<string, any>>(r: T): T {
  if (!r || typeof r !== "object") return r;
  const date = String(r.date || "");
  const id = String(r.id || "");
  const { key: truckKey } = getTruckIdentity(r);
  const start = String(r.start || "").trim();
  const destination = String(r.destination || "").trim();

  if (
    id === "gs-SORO-2026-01-03-r305" ||
    (date === "2026-01-03" && truckKey === "SORO" && destination.toLowerCase().includes("pedro"))
  ) {
    return {
      ...r,
      start: start || "Lauzoua",
      destination: "ABIDJAN",
    };
  }

  return r;
}

/**
 * Détermine de manière certifiée le corridor carburant ("SAN_PEDRO" ou "ABIDJAN") d'un trajet.
 * Règle métier :
 * - Les mois sans aucune rotation vers San Pedro (Avril 2025, Mai 2025, Août 2025, Janvier 2026,
 *   Juin 2026 [Yamoussoukro-Lakota], Juillet 2026 [Abidjan / Bassam-Adzopé]) sont 100% rattachés
 *   au corridor Abidjan (0 CFA San Pedro).
 * - Pour les autres mois, tout trajet mentionnant "Abidjan" (départ, destination ou commentaire)
 *   relève du corridor Abidjan, et les rotations San Pedro relèvent du corridor San Pedro.
 */
export function resolveTripFuelCorridor(raw: any): "SAN_PEDRO" | "ABIDJAN" {
  const r = normalizeTripCorridorFields(raw || {});
  const date = String(r.date || "");
  const monthKey = date.slice(0, 7);
  const startLower = String(r.start || "").trim().toLowerCase();
  const destLower = String(r.destination || "").trim().toLowerCase();
  const commentLower = String(r.comments || r.comment || "").trim().toLowerCase();

  // Mois exclusivement sur le corridor Abidjan / Hors San Pedro (0 CFA San Pedro)
  if (
    monthKey === "2025-04" ||
    monthKey === "2025-05" ||
    monthKey === "2025-08" ||
    monthKey === "2026-01" ||
    monthKey === "2026-06" ||
    monthKey === "2026-07"
  ) {
    return "ABIDJAN";
  }

  const hasAbidjan =
    startLower.includes("abidjan") ||
    destLower.includes("abidjan") ||
    commentLower.includes("abidjan");

  return hasAbidjan ? "ABIDJAN" : "SAN_PEDRO";
}

/**
 * Algorithme de détection automatique d'incohérences sur les séquences de trajets (Lecture Seule)
 */
export function analyzeFuelBreakdownSequence(
  allTrips: any[],
  maxInactivityDays: number = DEFAULT_MAX_INACTIVITY_DAYS,
  language: "FR" | "EN" = "FR"
): FuelBreakdownDiagnosticResult {
  const isEn = language === "EN";
  const threshold =
    Number.isFinite(maxInactivityDays) && maxInactivityDays >= 1
      ? maxInactivityDays
      : DEFAULT_MAX_INACTIVITY_DAYS;

  const activeRaw = (allTrips || [])
    .filter((r) => {
      if (!r || !r.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) return false;
      const fuel = Number(r.fuel_cost_cfa) || 0;
      const tonnage = Number(r.tonnage) || 0;
      return fuel > 0 || tonnage > 0;
    })
    .map((r) => normalizeTripCorridorFields(r));

  const grouped: Record<"AMARA" | "BRAHIMA" | "SORO", any[]> = {
    AMARA: [],
    BRAHIMA: [],
    SORO: [],
  };

  activeRaw.forEach((r) => {
    const { key } = getTruckIdentity(r);
    grouped[key].push(r);
  });

  const allEnriched: DiagnosticTripRecord[] = [];
  const byKey = new Map<string, DiagnosticTripRecord>();

  (["AMARA", "BRAHIMA", "SORO"] as const).forEach((truckKey) => {
    const truckTrips = grouped[truckKey].sort((a, b) => {
      const cmp = String(a.date).localeCompare(String(b.date));
      if (cmp !== 0) return cmp;
      return (Number(a.sheetRow) || 0) - (Number(b.sheetRow) || 0);
    });

    for (let i = 0; i < truckTrips.length; i++) {
      const curr = truckTrips[i];
      const prev = i > 0 ? truckTrips[i - 1] : null;

      const { label: truckLabel, shortLabel: shortTruckLabel } = getTruckIdentity(curr);
      const startRaw = String(curr.start || "").trim();
      const destRaw = String(curr.destination || "").trim();
      const commentRaw = String(curr.comments || curr.comment || "").trim();

      const startLower = startRaw.toLowerCase();
      const corridor = resolveTripFuelCorridor(curr);
      const isAbidjanCorridor = corridor === "ABIDJAN";

      let inactivityDays = 0;
      let previousActiveDate: string | null = null;
      let previousRoute: string | null = null;

      if (prev) {
        const currTime = new Date(`${curr.date}T00:00:00Z`).getTime();
        const prevTime = new Date(`${prev.date}T00:00:00Z`).getTime();
        const diff = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
        inactivityDays = Math.max(0, diff);
        previousActiveDate = String(prev.date);
        previousRoute = `${prev.start || "—"} → ${prev.destination || "—"}`;
      }

      const departedFromAbidjan = startLower.includes("abidjan");
      const hasAnomaly = prev !== null && inactivityDays > threshold && !departedFromAbidjan;

      const alertStatus = hasAnomaly
        ? isEn
          ? ALERT_MESSAGE_EN
          : ALERT_MESSAGE_FR
        : isEn
        ? STATUS_OK_EN
        : STATUS_OK_FR;

      const inactivityDetail =
        inactivityDays > 1 && previousActiveDate
          ? isEn
            ? `${inactivityDays}d (${formatDisplayDate(previousActiveDate)})`
            : `${inactivityDays} j (${formatDisplayDate(previousActiveDate)})`
          : "—";

      const dateStr = String(curr.date);
      const record: DiagnosticTripRecord = {
        id: buildTripLookupKey(curr),
        sheetRow: curr.sheetRow ? Number(curr.sheetRow) : undefined,
        date: dateStr,
        displayDate: formatDisplayDate(dateStr),
        monthKey: dateStr.slice(0, 7),
        truckKey,
        truckLabel,
        shortTruckLabel,
        start: startRaw || "—",
        destination: destRaw || "—",
        corridor,
        corridorLabel: isAbidjanCorridor ? "Abidjan" : "San Pedro",
        fuelCostCfa: Number(curr.fuel_cost_cfa) || 0,
        tonnage: Number(curr.tonnage) || 0,
        roadFeesCfa: Number(curr.road_fees_cfa) || 0,
        totalExpenseCfa: Number(curr.total_expense_cfa) || 0,
        totalGrossCfa: Number(curr.total_gross_cfa) || 0,
        inactivityDays,
        previousActiveDate,
        previousRoute,
        hasAnomaly,
        alertStatus,
        inactivityDetail,
      };

      allEnriched.push(record);
      byKey.set(record.id, record);
    }
  });

  const sortedRecords = [...allEnriched].sort((a, b) => {
    const cmp = b.date.localeCompare(a.date);
    if (cmp !== 0) return cmp;
    return a.truckLabel.localeCompare(b.truckLabel);
  });

  const anomalies = sortedRecords.filter((r) => r.hasAnomaly);

  return {
    records: sortedRecords,
    anomalies,
    byKey,
  };
}

// ============================================================================
// UTILITAIRE INTERNE : COLORATION & MISE EN FORME NATIVE DU FICHIER EXCEL (.XLSX)
// Permet d'appliquer des codes couleurs distincts par colonne, des en-têtes colorés,
// des lignes de synthèse mensuelle fusionnées et des hauteurs de lignes aérées.
// ============================================================================
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32Uint8(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readU16LE(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function readU32LE(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function writeU16LE(b: Uint8Array, o: number, v: number) {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
}

function writeU32LE(b: Uint8Array, o: number, v: number) {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
  b[o + 3] = (v >>> 24) & 0xff;
}

function unpackStoredZip(zipBytes: Uint8Array): Array<{ name: string; data: Uint8Array }> {
  const entries: Array<{ name: string; data: Uint8Array }> = [];
  const decoder = new TextDecoder("utf-8");
  let offset = 0;
  while (offset + 30 <= zipBytes.length) {
    const sig = readU32LE(zipBytes, offset);
    if (sig !== 0x04034b50) break;
    const compSize = readU32LE(zipBytes, offset + 18);
    const nameLen = readU16LE(zipBytes, offset + 26);
    const extraLen = readU16LE(zipBytes, offset + 28);
    const name = decoder.decode(zipBytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = zipBytes.slice(dataStart, dataStart + compSize);
    entries.push({ name, data });
    offset = dataStart + compSize;
  }
  return entries;
}

function packStoredZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32Uint8(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeU32LE(localHeader, 0, 0x04034b50);
    writeU16LE(localHeader, 4, 20);
    writeU16LE(localHeader, 6, 0x0800); // UTF-8
    writeU16LE(localHeader, 8, 0); // STORE
    writeU16LE(localHeader, 10, 0);
    writeU16LE(localHeader, 12, 0x21);
    writeU32LE(localHeader, 14, crc);
    writeU32LE(localHeader, 18, dataBytes.length);
    writeU32LE(localHeader, 22, dataBytes.length);
    writeU16LE(localHeader, 26, nameBytes.length);
    writeU16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeU32LE(centralHeader, 0, 0x02014b50);
    writeU16LE(centralHeader, 4, 20);
    writeU16LE(centralHeader, 6, 20);
    writeU16LE(centralHeader, 8, 0x0800);
    writeU16LE(centralHeader, 10, 0);
    writeU16LE(centralHeader, 12, 0);
    writeU16LE(centralHeader, 14, 0x21);
    writeU32LE(centralHeader, 16, crc);
    writeU32LE(centralHeader, 20, dataBytes.length);
    writeU32LE(centralHeader, 24, dataBytes.length);
    writeU16LE(centralHeader, 28, nameBytes.length);
    writeU16LE(centralHeader, 30, 0);
    writeU16LE(centralHeader, 32, 0);
    writeU16LE(centralHeader, 34, 0);
    writeU16LE(centralHeader, 36, 0);
    writeU32LE(centralHeader, 38, 0);
    writeU32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  writeU32LE(eocd, 0, 0x06054b50);
  writeU16LE(eocd, 4, 0);
  writeU16LE(eocd, 6, 0);
  writeU16LE(eocd, 8, entries.length);
  writeU16LE(eocd, 10, entries.length);
  writeU32LE(eocd, 12, centralSize);
  writeU32LE(eocd, 16, offset);
  writeU16LE(eocd, 20, 0);

  const totalSize = offset + centralSize + eocd.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const p of localParts) {
    result.set(p, pos);
    pos += p.length;
  }
  for (const p of centralParts) {
    result.set(p, pos);
    pos += p.length;
  }
  result.set(eocd, pos);
  return result;
}

/**
 * Feuille de styles OpenXML (xl/styles.xml) définissant les codes couleurs par colonne :
 * Index cellXfs (s="...") :
 *  0 : Normal
 *  1 : En-tête Bleu Indigo (Mois / Date)
 *  2 : En-tête Ambre Or (Total Carburant / Montant CFA)
 *  3 : En-tête Violet (Total Prise / Inactivité)
 *  4 : En-tête Émeraude Vert (Montant Supérieur Prise)
 *  5 : En-tête Bleu Ciel Cyan (Montant Inférieur / Tonnage)
 *  6 : En-tête Turquoise (Corridor San Pedro)
 *  7 : En-tête Orange (Corridor Abidjan)
 *  8 : En-tête Ardoise Foncé (Camion / Ligne / Départ / Destination / Statut)
 *  9 : Cellule Colonne Mois / Date (Fond Bleu pâle #EFF6FF, Texte #1E3A8A gras, centré)
 * 10 : Cellule Colonne Total / Carburant CFA (Fond Or pâle #FFFBEB, Texte #92400E gras, droite)
 * 11 : Cellule Colonne Total Prise (Fond Violet pâle #F5F3FF, Texte #5B21B6 gras, centré)
 * 12 : Cellule Colonne Montant Supérieur (Fond Vert pâle #ECFDF5, Texte #065F46 gras, droite)
 * 13 : Cellule Colonne Montant Inférieur / Tonnage (Fond Cyan pâle #F0F9FF, Texte #075985 gras, droite)
 * 14 : Cellule Colonne San Pedro (Fond Turquoise pâle #F0FDFA, Texte #0F766E gras, droite/centré)
 * 15 : Cellule Colonne Abidjan (Fond Orange pâle #FFF7ED, Texte #C2410C gras, droite/centré)
 * 16 : Cellule Statut OK (Fond Vert doux #DCFCE7, Texte #166534 gras, centré)
 * 17 : Cellule / Ligne ANOMALIE (Fond Rouge #FEE2E2, Texte #991B1B gras)
 * 18 : Bandeau Mensuel Fusionné (Fond Bleu Nuit #0F172A, Texte Blanc #FFFFFF gras 11pt)
 * 19 : Cellule Neutre Aérée (Fond Blanc #FFFFFF, Texte #1E293B, bordure fine)
 * 20 : Cellule Ligne Sheet (Fond Gris Ardoise #F8FAFC, Texte #475569, centré)
 */
const CUSTOM_XLSX_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="13">
    <font><sz val="11"/><color rgb="FF1E293B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF92400E"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF5B21B6"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF065F46"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF075985"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F766E"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFC2410C"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF166534"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF991B1B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>
  </fonts>
  <fills count="21">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFB45309"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF6D28D9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF047857"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0369A1"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC2410C"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF334155"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0F9FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDFA"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7ED"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="21">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="10" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="11" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="12" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="13" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="14" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="15" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="8" fillId="16" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="9" fillId="17" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="10" fillId="18" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="11" fillId="19" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="12" fillId="20" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

function styleWorksheetXml(
  xml: string,
  getStyleForCell: (rowNum: number, colLetter: string) => number,
  getRowHeight: (rowNum: number) => number
): string {
  // Ajouter la hauteur de ligne pour aérer la lecture
  let out = xml.replace(/<row r="(\d+)"([^>]*)>/g, (_m, rStr, rest) => {
    const rNum = parseInt(rStr, 10);
    const ht = getRowHeight(rNum);
    const cleaned = rest.replace(/\s*(ht|customHeight)="[^"]*"/g, "");
    return `<row r="${rNum}" ht="${ht}" customHeight="1"${cleaned}>`;
  });

  // Ajouter l'attribut s="..." sur chaque cellule <c r="A1" ...>
  out = out.replace(/<c r="([A-Z]+)(\d+)"([^>]*)>/g, (_m, col, rStr, rest) => {
    const rNum = parseInt(rStr, 10);
    const styleIdx = getStyleForCell(rNum, col);
    const cleaned = rest.replace(/\s*s="\d+"/g, "");
    return `<c r="${col}${rNum}" s="${styleIdx}"${cleaned}>`;
  });

  return out;
}

/**
 * Exportation Excel (.xlsx) claire, aérée, sans répétition et avec codes couleurs par colonne :
 * - Feuille 1 : Synthèse Mensuelle (chaque colonne a sa propre couleur : Mois Bleu, Total Or, Prises Violet, Supérieur Vert, Inférieur Bleu Ciel, San Pedro Turquoise, Abidjan Orange)
 * - Feuille 2 : Détail par Mois (bandeau mensuel fusionné Bleu Nuit + colonnes colorées + anomalies en Rouge)
 * - Feuille 3 : Anomalies à corriger (si présentes)
 */
export async function exportFuelBreakdownToExcel(
  rows: DiagnosticTripRecord[],
  maxInactivityDays: number,
  language: "FR" | "EN" = "FR"
) {
  const XLSX = await import("xlsx");
  const isEn = language === "EN";
  const fmtCfa = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR")} CFA`;

  const monthlyStats = computeMonthlyFuelBreakdownStats(rows, language);
  const workbook = XLSX.utils.book_new();

  // -------------------------------------------------------------------------
  // FEUILLE 1 : SYNTHÈSE MENSUELLE (Sans répétition, 1 information = 1 colonne)
  // -------------------------------------------------------------------------
  const summaryAoA: any[][] = [
    isEn
      ? [
          "Month",
          "Total Fuel",
          "Total Refuels",
          "Highest Refuel",
          "Lowest Refuel",
          "San Pedro Fuel",
          "Abidjan Fuel",
          "Status",
        ]
      : [
          "Mois",
          "Total Carburant",
          "Total Prise",
          "Montant supérieur prise",
          "Montant inférieur",
          "Carburant San Pedro",
          "Carburant Abidjan",
          "Statut",
        ],
  ];

  const summaryAnomalyRows = new Set<number>();
  monthlyStats.forEach((m, idx) => {
    const excelRow = idx + 2;
    if (m.anomalyCount > 0) summaryAnomalyRows.add(excelRow);
    summaryAoA.push([
      m.monthLabel,
      fmtCfa(m.totalFuelCfa),
      m.refuelCount,
      fmtCfa(m.maxRefuelCfa),
      fmtCfa(m.minRefuelCfa),
      fmtCfa(m.sanPedroFuelCfa),
      fmtCfa(m.abidjanFuelCfa),
      m.anomalyCount > 0
        ? isEn
          ? `⚠ ${m.anomalyCount} anomaly(ies)`
          : `⚠ ${m.anomalyCount} anomalie(s)`
        : "✓ OK",
    ]);
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoA);
  summarySheet["!cols"] = [
    { wch: 26 }, // A: Mois
    { wch: 22 }, // B: Total Carburant
    { wch: 16 }, // C: Total Prise
    { wch: 26 }, // D: Montant supérieur prise
    { wch: 22 }, // E: Montant inférieur
    { wch: 22 }, // F: Carburant San Pedro
    { wch: 22 }, // G: Carburant Abidjan
    { wch: 18 }, // H: Statut
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    isEn ? "Monthly_Summary" : "Synthese_Mensuelle"
  );

  // -------------------------------------------------------------------------
  // FEUILLE 2 : DÉTAIL PAR MOIS (Bandeaux mensuels fusionnés + codes couleurs)
  // -------------------------------------------------------------------------
  const detailAoA: any[][] = [
    isEn
      ? [
          "Sheet Row",
          "Date",
          "Truck",
          "Start (Departure)",
          "Destination",
          "Corridor",
          "Fuel (CFA)",
          "Tonnage",
          "Prior Inactivity",
          "Alert / Status",
        ]
      : [
          "Ligne Sheet",
          "Date",
          "Camion",
          "Départ (Start)",
          "Destination",
          "Corridor",
          "Carburant (CFA)",
          "Tonnage",
          "Inactivité",
          "Alerte / Statut",
        ],
  ];

  const detailBannerRows = new Set<number>();
  const detailAnomalyRows = new Set<number>();
  const detailAbidjanRows = new Set<number>();
  const merges: any[] = [];

  monthlyStats.forEach((m) => {
    const bannerRowIdx0 = detailAoA.length; // 0-based
    const bannerExcelRow = bannerRowIdx0 + 1; // 1-based
    detailBannerRows.add(bannerExcelRow);

    detailAoA.push([
      `📅 ${m.formattedSummaryLine}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    merges.push({
      s: { r: bannerRowIdx0, c: 0 },
      e: { r: bannerRowIdx0, c: 9 },
    });

    m.records.forEach((r) => {
      const excelRow = detailAoA.length + 1;
      if (r.hasAnomaly) detailAnomalyRows.add(excelRow);
      if (r.corridor === "ABIDJAN") detailAbidjanRows.add(excelRow);

      detailAoA.push([
        r.sheetRow ? `#${r.sheetRow}` : "—",
        r.displayDate,
        r.shortTruckLabel,
        r.start,
        r.destination,
        r.corridorLabel,
        r.fuelCostCfa > 0 ? fmtCfa(r.fuelCostCfa) : "—",
        r.tonnage > 0 ? `${r.tonnage} T` : "—",
        r.inactivityDays > 1 ? `${r.inactivityDays} j` : "—",
        r.hasAnomaly ? `⚠ ${r.alertStatus}` : "✓ OK",
      ]);
    });
  });

  const detailSheet = XLSX.utils.aoa_to_sheet(detailAoA);
  detailSheet["!merges"] = merges;
  detailSheet["!cols"] = [
    { wch: 13 }, // A: Ligne Sheet
    { wch: 14 }, // B: Date
    { wch: 18 }, // C: Camion
    { wch: 20 }, // D: Départ
    { wch: 20 }, // E: Destination
    { wch: 15 }, // F: Corridor
    { wch: 20 }, // G: Carburant (CFA)
    { wch: 13 }, // H: Tonnage
    { wch: 14 }, // I: Inactivité
    { wch: 68 }, // J: Alerte / Statut
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    detailSheet,
    isEn ? `Detail_By_Month_${maxInactivityDays}d` : `Detail_Par_Mois_${maxInactivityDays}j`
  );

  // -------------------------------------------------------------------------
  // FEUILLE 3 : ANOMALIES À CORRIGER (si présentes)
  // -------------------------------------------------------------------------
  const anomaliesOnly = rows.filter((r) => r.hasAnomaly);
  if (anomaliesOnly.length > 0) {
    const anomAoA: any[][] = [
      detailAoA[0],
      ...anomaliesOnly.map((r) => [
        r.sheetRow ? `#${r.sheetRow}` : "—",
        r.displayDate,
        r.shortTruckLabel,
        r.start,
        r.destination,
        r.corridorLabel,
        r.fuelCostCfa > 0 ? fmtCfa(r.fuelCostCfa) : "—",
        r.tonnage > 0 ? `${r.tonnage} T` : "—",
        `${r.inactivityDays} j`,
        `⚠ ${r.alertStatus}`,
      ]),
    ];
    const anomalySheet = XLSX.utils.aoa_to_sheet(anomAoA);
    anomalySheet["!cols"] = detailSheet["!cols"];
    XLSX.utils.book_append_sheet(
      workbook,
      anomalySheet,
      isEn ? "Anomalies_To_Fix" : "Anomalies_A_Corriger"
    );
  }

  // Générer le binaire XLSX non compressé et injecter les codes couleurs par colonne
  const rawBuffer = new Uint8Array(
    XLSX.write(workbook, { type: "array", bookType: "xlsx", compression: false })
  );
  const zipEntries = unpackStoredZip(rawBuffer);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8");

  for (const entry of zipEntries) {
    if (entry.name === "xl/styles.xml") {
      entry.data = encoder.encode(CUSTOM_XLSX_STYLES_XML);
    } else if (entry.name === "xl/worksheets/sheet1.xml") {
      // Coloration par colonne de la Feuille 1 (Synthèse Mensuelle)
      const xml = decoder.decode(entry.data);
      const styled = styleWorksheetXml(
        xml,
        (rowNum, col) => {
          if (rowNum === 1) {
            const headerMap: Record<string, number> = {
              A: 1, // Bleu Indigo
              B: 2, // Ambre Or
              C: 3, // Violet
              D: 4, // Émeraude Vert
              E: 5, // Bleu Ciel Cyan
              F: 6, // Turquoise
              G: 7, // Orange
              H: 8, // Ardoise
            };
            return headerMap[col] || 8;
          }
          const colStyleMap: Record<string, number> = {
            A: 9, // Mois -> Bleu pâle
            B: 10, // Total -> Or pâle
            C: 11, // Total Prise -> Violet pâle
            D: 12, // Montant supérieur -> Vert pâle
            E: 13, // Montant inférieur -> Cyan pâle
            F: 14, // San Pedro -> Turquoise pâle
            G: 15, // Abidjan -> Orange pâle
            H: summaryAnomalyRows.has(rowNum) ? 17 : 16, // Statut -> Rouge ou Vert
          };
          return colStyleMap[col] || 19;
        },
        (rowNum) => (rowNum === 1 ? 30 : 25)
      );
      entry.data = encoder.encode(styled);
    } else if (entry.name === "xl/worksheets/sheet2.xml") {
      // Coloration par colonne de la Feuille 2 (Détail par Mois)
      const xml = decoder.decode(entry.data);
      const styled = styleWorksheetXml(
        xml,
        (rowNum, col) => {
          if (rowNum === 1) {
            const headerMap: Record<string, number> = {
              A: 8, // Ligne Sheet
              B: 1, // Date (Bleu)
              C: 8, // Camion
              D: 8, // Départ
              E: 8, // Destination
              F: 6, // Corridor (Turquoise)
              G: 2, // Carburant CFA (Ambre Or)
              H: 5, // Tonnage (Cyan)
              I: 3, // Inactivité (Violet)
              J: 8, // Statut
            };
            return headerMap[col] || 8;
          }
          if (detailBannerRows.has(rowNum)) return 18; // Bandeau mensuel Bleu Nuit
          if (detailAnomalyRows.has(rowNum)) return 17; // Ligne en anomalie Rouge

          const colStyleMap: Record<string, number> = {
            A: 20, // Ligne Sheet -> Gris ardoise
            B: 9, // Date -> Bleu pâle
            C: 19, // Camion -> Blanc net
            D: 19, // Départ -> Blanc net
            E: 19, // Destination -> Blanc net
            F: detailAbidjanRows.has(rowNum) ? 15 : 14, // Corridor -> Orange (Abidjan) ou Turquoise (San Pedro)
            G: 10, // Carburant -> Or pâle
            H: 13, // Tonnage -> Cyan pâle
            I: 11, // Inactivité -> Violet pâle
            J: 16, // Statut OK -> Vert doux
          };
          return colStyleMap[col] || 19;
        },
        (rowNum) => (rowNum === 1 ? 28 : detailBannerRows.has(rowNum) ? 28 : 22)
      );
      entry.data = encoder.encode(styled);
    } else if (entry.name === "xl/worksheets/sheet3.xml") {
      // Coloration de la Feuille 3 (Anomalies à corriger)
      const xml = decoder.decode(entry.data);
      const styled = styleWorksheetXml(
        xml,
        (rowNum) => (rowNum === 1 ? 8 : 17),
        (rowNum) => (rowNum === 1 ? 28 : 24)
      );
      entry.data = encoder.encode(styled);
    }
  }

  const finalZipBytes = packStoredZip(zipEntries);
  const blob = new Blob([finalZipBytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `Fuel_Breakdown_SanPedro_vs_Abidjan_${maxInactivityDays}j_${dateStamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Exportation CSV (.csv) épurée et sans répétition
 */
export function exportFuelBreakdownToCSV(
  rows: DiagnosticTripRecord[],
  maxInactivityDays: number,
  language: "FR" | "EN" = "FR"
) {
  const isEn = language === "EN";
  const fmtCfa = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR")} CFA`;
  const monthlyStats = computeMonthlyFuelBreakdownStats(rows, language);

  const lines: string[] = [];

  // 1. Tableau de Synthèse Mensuelle (sans colonne dupliquée)
  lines.push(
    (isEn
      ? [
          "Month",
          "Total Fuel",
          "Total Refuels",
          "Highest Refuel",
          "Lowest Refuel",
          "San Pedro Fuel",
          "Abidjan Fuel",
          "Status",
        ]
      : [
          "Mois",
          "Total Carburant",
          "Total Prise",
          "Montant supérieur prise",
          "Montant inférieur",
          "Carburant San Pedro",
          "Carburant Abidjan",
          "Statut",
        ]
    ).join(";")
  );

  monthlyStats.forEach((m) => {
    lines.push(
      [
        `"${m.monthLabel}"`,
        `"${fmtCfa(m.totalFuelCfa)}"`,
        m.refuelCount,
        `"${fmtCfa(m.maxRefuelCfa)}"`,
        `"${fmtCfa(m.minRefuelCfa)}"`,
        `"${fmtCfa(m.sanPedroFuelCfa)}"`,
        `"${fmtCfa(m.abidjanFuelCfa)}"`,
        `"${m.anomalyCount > 0 ? `${m.anomalyCount} anomalie(s)` : "OK"}"`,
      ].join(";")
    );
  });

  lines.push("");

  // 2. Détail des trajets (colonnes alignées, sans répétition)
  const detailHeaders = isEn
    ? [
        "Sheet Row",
        "Date",
        "Truck",
        "Start (Departure)",
        "Destination",
        "Corridor",
        "Fuel (CFA)",
        "Tonnage",
        "Prior Inactivity",
        "Alert / Status",
      ]
    : [
        "Ligne Sheet",
        "Date",
        "Camion",
        "Départ (Start)",
        "Destination",
        "Corridor",
        "Carburant (CFA)",
        "Tonnage",
        "Inactivité",
        "Alerte / Statut",
      ];

  lines.push(detailHeaders.join(";"));

  monthlyStats.forEach((m) => {
    lines.push(`"=== ${m.formattedSummaryLine.replace(/"/g, '""')} ===";;;;;;;;;`);
    m.records.forEach((r) => {
      lines.push(
        [
          `"${r.sheetRow ? `#${r.sheetRow}` : "—"}"`,
          `"${r.displayDate}"`,
          `"${r.shortTruckLabel}"`,
          `"${(r.start || "").replace(/"/g, '""')}"`,
          `"${(r.destination || "").replace(/"/g, '""')}"`,
          `"${r.corridorLabel}"`,
          `"${r.fuelCostCfa > 0 ? fmtCfa(r.fuelCostCfa) : "—"}"`,
          `"${r.tonnage > 0 ? `${r.tonnage} T` : "—"}"`,
          `"${r.inactivityDays > 1 ? `${r.inactivityDays} j` : "—"}"`,
          `"${r.hasAnomaly ? r.alertStatus.replace(/"/g, '""') : "OK"}"`,
        ].join(";")
      );
    });
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + lines.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `Fuel_Breakdown_SanPedro_vs_Abidjan_${maxInactivityDays}j_${dateStamp}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exportation PDF (.pdf) ultra-lisible, aérée, sans répétition, avec codes couleurs par colonne :
 * - Tableau 1 : Synthèse Mensuelle Carburant (chaque colonne a sa propre couleur d'en-tête et de fond)
 * - Tableau 2 : Détail par Mois avec bandeaux mensuels Bleu Nuit et colonnes colorées
 */
export async function exportFuelBreakdownToPDF(
  rows: DiagnosticTripRecord[],
  maxInactivityDays: number,
  stats: {
    sanPedroFuel: number;
    abidjanFuel: number;
    totalFuel: number;
    anomalyCount: number;
  },
  language: "FR" | "EN" = "FR"
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const isEn = language === "EN";
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const exportDate = new Date().toLocaleDateString("fr-FR");
  const fmt = (n: number) => Math.round(n || 0).toLocaleString("fr-FR") + " CFA";
  const monthlyStats = computeMonthlyFuelBreakdownStats(rows, language);

  // Bandeau de titre épuré
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(28, 20, 786, 46, 6, 6, "F");

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isEn
      ? "FUEL BREAKDOWN : SAN PEDRO vs ABIDJAN — MONTHLY SUMMARY & DIAGNOSTIC"
      : "SYNTHÈSE CARBURANT SAN PEDRO vs ABIDJAN & DIAGNOSTIC DES TRAJETS",
    42,
    40
  );

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    isEn
      ? `Exported: ${exportDate}   •   Max. Inactivity Threshold: ${maxInactivityDays} days   •   Anomalies: ${stats.anomalyCount}   •   San Pedro Total: ${fmt(stats.sanPedroFuel)}   •   Abidjan Total: ${fmt(stats.abidjanFuel)}`
      : `Exporté le ${exportDate}   •   Seuil d'inactivité max. : ${maxInactivityDays} jours   •   Anomalies détectées : ${stats.anomalyCount}   •   Total San Pedro : ${fmt(stats.sanPedroFuel)}   •   Total Abidjan : ${fmt(stats.abidjanFuel)}`,
    42,
    56
  );

  // =========================================================================
  // TABLEAU 1 : SYNTHÈSE MENSUELLE (Codes couleurs par colonne, zéro répétition)
  // =========================================================================
  const summaryHeadColors: Array<[number, number, number]> = [
    [30, 58, 138], // Col 0 (Mois) : Bleu Indigo
    [180, 83, 9], // Col 1 (Total) : Ambre / Or
    [109, 40, 217], // Col 2 (Total prise) : Violet
    [4, 120, 87], // Col 3 (Montant supérieur prise) : Émeraude / Vert
    [3, 105, 161], // Col 4 (Montant inférieur) : Bleu Ciel / Cyan
    [15, 118, 110], // Col 5 (San Pedro) : Turquoise
    [194, 65, 12], // Col 6 (Abidjan) : Orange
    [51, 65, 85], // Col 7 (Statut) : Ardoise
  ];

  const summaryBodyFillColors: Array<[number, number, number]> = [
    [239, 246, 255], // Col 0 : Bleu très doux
    [255, 251, 235], // Col 1 : Or très doux
    [245, 243, 255], // Col 2 : Violet très doux
    [236, 253, 245], // Col 3 : Vert très doux
    [240, 249, 255], // Col 4 : Cyan très doux
    [240, 253, 250], // Col 5 : Turquoise très doux
    [255, 247, 237], // Col 6 : Orange très doux
    [240, 253, 244], // Col 7 : Statut OK Vert
  ];

  const summaryBodyTextColors: Array<[number, number, number]> = [
    [30, 58, 138],
    [146, 64, 14],
    [91, 33, 182],
    [6, 95, 70],
    [7, 89, 133],
    [15, 118, 110],
    [154, 52, 18],
    [22, 101, 52],
  ];

  autoTable(doc, {
    startY: 78,
    margin: { left: 28, right: 28 },
    head: [
      isEn
        ? [
            "Month",
            "Total Fuel",
            "Total Refuels",
            "Highest Refuel",
            "Lowest Refuel",
            "San Pedro Fuel",
            "Abidjan Fuel",
            "Status",
          ]
        : [
            "Mois",
            "Total Carburant",
            "Total Prise",
            "Montant Supérieur Prise",
            "Montant Inférieur",
            "Carburant San Pedro",
            "Carburant Abidjan",
            "Statut",
          ],
    ],
    body: monthlyStats.map((m) => [
      m.monthLabel,
      fmt(m.totalFuelCfa),
      `${m.refuelCount} ${isEn ? "refuels" : "prises"}`,
      fmt(m.maxRefuelCfa),
      fmt(m.minRefuelCfa),
      fmt(m.sanPedroFuelCfa),
      fmt(m.abidjanFuelCfa),
      m.anomalyCount > 0
        ? isEn
          ? `${m.anomalyCount} anomaly(ies)`
          : `${m.anomalyCount} anomalie(s)`
        : "OK",
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 6.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
      valign: "middle",
    },
    headStyles: {
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      cellPadding: 7,
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: "bold", halign: "left" },
      1: { cellWidth: 102, fontStyle: "bold", halign: "right" },
      2: { cellWidth: 74, fontStyle: "bold", halign: "center" },
      3: { cellWidth: 112, fontStyle: "bold", halign: "right" },
      4: { cellWidth: 98, fontStyle: "bold", halign: "right" },
      5: { cellWidth: 96, fontStyle: "bold", halign: "right" },
      6: { cellWidth: 92, fontStyle: "bold", halign: "right" },
      7: { cellWidth: "auto", fontStyle: "bold", halign: "center" },
    },
    didParseCell(data) {
      const colIdx = data.column.index;
      if (data.section === "head") {
        data.cell.styles.fillColor = summaryHeadColors[colIdx] || [51, 65, 85];
      } else if (data.section === "body") {
        const mStat = monthlyStats[data.row.index];
        if (colIdx === 7 && mStat && mStat.anomalyCount > 0) {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
        } else {
          data.cell.styles.fillColor = summaryBodyFillColors[colIdx] || [255, 255, 255];
          data.cell.styles.textColor = summaryBodyTextColors[colIdx] || [30, 41, 59];
        }
      }
    },
  });

  const afterSummaryY = ((doc as any).lastAutoTable?.finalY || 160) + 18;

  // =========================================================================
  // TABLEAU 2 : DÉTAIL PAR MOIS (Bandeaux mensuels + Codes couleurs par colonne)
  // =========================================================================
  const detailHeadColors: Array<[number, number, number]> = [
    [71, 85, 105], // Col 0 : Ligne Sheet (Ardoise)
    [30, 64, 175], // Col 1 : Date (Bleu)
    [51, 65, 85], // Col 2 : Camion (Ardoise foncé)
    [30, 41, 59], // Col 3 : Départ
    [30, 41, 59], // Col 4 : Destination
    [15, 118, 110], // Col 5 : Corridor (Turquoise)
    [180, 83, 9], // Col 6 : Carburant CFA (Ambre Or)
    [3, 105, 161], // Col 7 : Tonnage (Bleu Ciel)
    [109, 40, 217], // Col 8 : Inactivité (Violet)
    [22, 101, 52], // Col 9 : Statut (Vert)
  ];

  const head = [
    isEn
      ? [
          "Row",
          "Date",
          "Truck",
          "Departure",
          "Destination",
          "Corridor",
          "Fuel (CFA)",
          "Tonnage",
          "Inactivity",
          "Status / Alert",
        ]
      : [
          "Ligne",
          "Date",
          "Camion",
          "Départ",
          "Destination",
          "Corridor",
          "Carburant (CFA)",
          "Tonnage",
          "Inactivité",
          "Statut / Alerte",
        ],
  ];

  const body: any[] = [];
  const rowMeta: Array<{
    isMonthHeader: boolean;
    record?: DiagnosticTripRecord;
  }> = [];

  monthlyStats.forEach((m) => {
    body.push([
      {
        content: m.formattedSummaryLine,
        colSpan: 10,
      },
    ]);
    rowMeta.push({ isMonthHeader: true });

    m.records.forEach((r) => {
      body.push([
        r.sheetRow ? `#${r.sheetRow}` : "—",
        r.displayDate,
        r.shortTruckLabel,
        r.start,
        r.destination,
        r.corridorLabel,
        r.fuelCostCfa > 0 ? fmt(r.fuelCostCfa) : "—",
        r.tonnage > 0 ? `${r.tonnage} T` : "—",
        r.inactivityDays > 1 ? `${r.inactivityDays} j` : "—",
        r.hasAnomaly ? r.alertStatus : "OK",
      ]);
      rowMeta.push({ isMonthHeader: false, record: r });
    });
  });

  autoTable(doc, {
    startY: afterSummaryY,
    margin: { left: 28, right: 28 },
    head,
    body,
    styles: {
      fontSize: 8.5,
      cellPadding: 5.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      valign: "middle",
    },
    headStyles: {
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      cellPadding: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 44, halign: "center" },
      1: { cellWidth: 62, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 78, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 78, halign: "left" },
      4: { cellWidth: 78, halign: "left" },
      5: { cellWidth: 64, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 82, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 50, halign: "right" },
      8: { cellWidth: 52, halign: "center" },
      9: { cellWidth: "auto", halign: "left", fontStyle: "bold" },
    },
    didParseCell(data) {
      const colIdx = data.column.index;
      if (data.section === "head") {
        data.cell.styles.fillColor = detailHeadColors[colIdx] || [51, 65, 85];
        return;
      }
      if (data.section === "body") {
        const meta = rowMeta[data.row.index];
        if (!meta) return;

        // Bandeau de séparation du mois : Bleu Nuit / Blanc très lisible
        if (meta.isMonthHeader) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 9.5;
          data.cell.styles.cellPadding = 7;
          return;
        }

        const rec = meta.record!;
        // Ligne en anomalie : surbrillance Rouge immédiate
        if (rec.hasAnomaly) {
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = "bold";
          return;
        }

        // Codes couleurs par colonne pour une lecture sans effort
        switch (colIdx) {
          case 0: // Ligne Sheet (Gris Ardoise)
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.textColor = [100, 116, 139];
            break;
          case 1: // Date (Bleu)
            data.cell.styles.fillColor = [239, 246, 255];
            data.cell.styles.textColor = [30, 58, 138];
            break;
          case 2: // Camion (Couleur dédiée par camion)
            if (rec.truckKey === "AMARA") {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [29, 78, 216];
            } else if (rec.truckKey === "BRAHIMA") {
              data.cell.styles.fillColor = [243, 232, 255];
              data.cell.styles.textColor = [107, 33, 168];
            } else {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
            }
            break;
          case 3: // Départ
          case 4: // Destination
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [30, 41, 59];
            break;
          case 5: // Corridor (Turquoise pour San Pedro / Orange pour Abidjan)
            if (rec.corridor === "ABIDJAN") {
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.textColor = [194, 65, 12];
            } else {
              data.cell.styles.fillColor = [204, 251, 241];
              data.cell.styles.textColor = [15, 118, 110];
            }
            break;
          case 6: // Carburant CFA (Ambre / Or)
            data.cell.styles.fillColor = [255, 251, 235];
            data.cell.styles.textColor =
              rec.fuelCostCfa > 0 ? [146, 64, 14] : [148, 163, 184];
            break;
          case 7: // Tonnage (Cyan)
            data.cell.styles.fillColor = [240, 249, 255];
            data.cell.styles.textColor =
              rec.tonnage > 0 ? [3, 105, 161] : [148, 163, 184];
            break;
          case 8: // Inactivité (Violet doux)
            data.cell.styles.fillColor = [250, 245, 255];
            data.cell.styles.textColor =
              rec.inactivityDays > 1 ? [109, 40, 217] : [148, 163, 184];
            break;
          case 9: // Statut OK (Vert doux)
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
            data.cell.styles.halign = "center";
            break;
        }
      }
    },
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`Fuel_Breakdown_SanPedro_vs_Abidjan_${maxInactivityDays}j_${dateStamp}.pdf`);
}
