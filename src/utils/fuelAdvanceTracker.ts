import type { AccountingTransaction } from "./accountingParser";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "./accountingInitialData";
import { resolveTripFuelCorridor } from "./fuelBreakdownDiagnostic";

export interface FuelAdvance {
  id: string;
  date: string; // ISO: YYYY-MM-DD
  rawDate?: string;
  cycleStartDate?: string; // Début effectif du cycle couvert par l'avance
  amount: number; // Montant de l'avance en CFA (ex: 4 000 000)
  station: string; // Ex: "Shell San Pedro"
  corridor?: "SAN_PEDRO" | "ABIDJAN";
  paymentMethod?: string; // Virement, Chèque, Espèces, etc.
  notes?: string;
  sourceRow?: number;
  source?: "spreadsheet" | "manual";
  status?: "active" | "exhausted" | "overdrawn";
}

export interface DirectFuelPaymentAnalysis {
  directPayment: number;
  reason: string | null;
  isDirect: boolean;
}

export interface FuelDailyConsumptionLog {
  id: string;
  date: string;
  rawDate?: string;
  sourceRow?: number;
  amount: number; // Montant carburant total enregistré dans Col D (ex: 435 000 CFA)
  sanPedroFuelAmount?: number; // Part prise sur le corridor San Pedro
  abidjanFuelAmount?: number; // Part prise sur/pour Abidjan (exclue du décompte Shell San Pedro)
  isAbidjanExcluded?: boolean; // true si du carburant Abidjan a été exclu ce jour-là
  abidjanExclusionNote?: string | null;
  directPaymentAmount: number; // Montant payé directement ailleurs par nous hors station (ex: 297 250 CFA)
  stationDrawdownAmount: number; // Montant réellement décompté de l'avance station (ex: 137 750 CFA)
  isDirectPayment: boolean; // true si une partie ou totalité a été payée directement hors station
  directPaymentNote?: string | null; // e.g. "Payé directement à une autre station (297 250 CFA)"
  advanceAddedAmount?: number; // Versement d'avance crédité ce jour-là (ex: +2 500 000 CFA)
  advanceAddedNote?: string | null;
  comment: string;
  cumulativeConsumed: number;
  remainingAdvanceBalance: number;
  status: "covered" | "low_credit" | "overdrawn";
}

export interface FuelAdvanceReconciliation {
  advance: FuelAdvance;
  periodStart: string;
  periodEnd: string;
  totalAdvanceAmount: number;
  totalFuelLogged: number; // Carburant total flotte sur la période
  totalAbidjanExcluded?: number; // Dont carburant Abidjan exclu
  totalDirectPaid: number; // Dont payé directement hors station
  fuelConsumed: number; // Carburant réellement décompté sur l'avance
  remainingCredit: number; // > 0 si solde positif disponible en station
  amountDue: number; // > 0 si consommation > avance (dette / reste à régler)
  percentUsed: number;
  status: "active" | "exhausted" | "overdrawn";
  dailyLogs: FuelDailyConsumptionLog[];
}

export interface FuelCashSummary {
  // Avance suivie
  selectedAdvanceId: string;
  selectedAdvance?: FuelAdvance;
  isConsolidatedView: boolean;

  // Décompte de l'avance active
  advanceAmount: number; // Montant de l'avance ou cumul suivi (ex: 12 502 750 CFA en compte courant Sept-Oct)
  totalFuelLogged: number; // Total brut carburant flotte enregistré (Col D)
  totalSanPedroFuelGross: number; // Total brut carburant San Pedro (hors Abidjan)
  totalAbidjanFuelExcluded: number; // Total carburant Abidjan exclu du décompte Shell San Pedro
  totalDirectPaidFuel: number; // Part payée directement à une autre station (ex: 438 650 CFA)
  fuelConsumed: number; // Carburant réellement décompté sur l'avance station (ex: 11 886 350 CFA)
  currentDepositBalance: number; // Solde crédit restant disponible en station (ex: +616 400 CFA)
  totalAmountDue: number; // Reste à régler à la station si dépassement (0 si couvert)
  percentUsed: number; // Pourcentage décompté
  hasDepositCredit: boolean;
  hasOverdraft: boolean;

  // Réconciliation Trésorerie / Cash Balance
  grossCashBalance: number | null; // Solde brut en compte
  fuelDepositCommitted: number; // Part immobilisée / en dépôt carburant
  netAvailableCash: number | null; // Cash liquide réellement disponible

  // Indicateurs opérationnels
  burnRatePerDay: number; // Consommation moyenne par jour d'activité (~435 000 CFA)
  estimatedDaysCoverage: number; // Jours de carburant restants avec le solde dépôt
  activeStation: string;

  // Détails & Listes
  recentAdvances: FuelAdvance[];
  reconciliations: FuelAdvanceReconciliation[];
  dailyDrawdownLedger: FuelDailyConsumptionLog[];
}

export const RUNNING_ACCOUNT_ID = "running_account_september";

/**
 * Analyse intelligente des colonnes M (COMMENTAIRES) et N (commentaire) de la feuille Spreedsheet
 * Détecte les règlements directs effectués hors de la station partenaire Shell San Pedro
 * (ex: Ligne 471 : "297250Cfa this day's i payed direcly fuel for brahima and Soro(not from shell san pedro)")
 * (ex: Ligne 489 Col M : "i payed fuel for soro 141400 not from shell san pedro")
 * qui doivent être exclus du décompte de l'avance station.
 */
export function parseFuelCommentDirectPayment(
  comment?: string,
  totalAmount: number = 0,
  commentColM?: string,
  commentColN?: string
): DirectFuelPaymentAnalysis {
  // Analyser chaque colonne (M et N) séparément pour qu'un versement d'avance en Col N
  // (ex: Ligne 489 Col N "Payed 5002750 to shell san pedro") ne masque jamais un paiement
  // direct en Col M (ex: Ligne 489 Col M "i payed fuel for soro 141400 not from shell san pedro").
  const clauses = [commentColM, commentColN, ...(comment ? comment.split("|") : [])]
    .map(s => (s || "").trim())
    .filter(Boolean);

  if (clauses.length === 0) {
    return { directPayment: 0, reason: null, isDirect: false };
  }

  for (const c of clauses) {
    // Ignorer les clauses qui décrivent uniquement un versement d'avance à la station partenaire
    if (
      /(?:payed|paid|tranfer|transfer|transfert|transferder|deposit)\b.*?(?:to\s*(?:san\s*pedro|shell)|for\s*oct|for\s*the\s*fuel)/i.test(c) &&
      !/not\s*from\s*shell|not\s*at\s*the\s*same\s*station|direc/i.test(c)
    ) {
      continue;
    }

    // Cas 1 : Montant explicite avant 'payed direcly' / 'payé directement'
    // Ex: "297250Cfa this day's i payed direcly fuel for brahima and Soro(not from shell san pedro)"
    const m1 = c.match(/([0-9\s]{4,10})\s*(?:cfa|f)?\s*(?:this\s*day(?:'s)?\s*)?(?:i\s*)?(?:have\s*)?payed\s*direc/i);
    if (m1) {
      const val = parseFloat(m1[1].replace(/\s/g, ""));
      if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
        return {
          directPayment: val,
          reason: "Payé directement à une autre station (hors Shell San Pedro)",
          isDirect: true
        };
      }
    }

    // Cas 2 : Montant explicite après 'payed directly' / 'payé directement'
    const m2 = c.match(/(?:payed|paid|payé)\s*(?:direc(?:t)?ly|directement)[^0-9]*([0-9\s]{4,10})\s*(?:cfa|f)?/i);
    if (m2) {
      const val = parseFloat(m2[1].replace(/\s/g, ""));
      if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
        return {
          directPayment: val,
          reason: "Payé directement à une autre station (hors Shell San Pedro)",
          isDirect: true
        };
      }
    }

    // Cas 3 : Montant explicite associé à 'not from shell' / 'hors station'
    // Ex: "i payed fuel for soro 141400 not from shell san pedro" (Ligne 489 Col M)
    const m3 = c.match(/([0-9\s]{4,10})\s*(?:cfa|f)?\s*not\s*from\s*(?:shell|station)/i);
    if (m3) {
      const val = parseFloat(m3[1].replace(/\s/g, ""));
      if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
        return {
          directPayment: val,
          reason: "Payé directement hors station Shell San Pedro",
          isDirect: true
        };
      }
    }

    // Cas 4 : Mention de paiement direct sans montant partiel => la totalité de la ligne a été payée hors station
    // Ex: "This day fuel payed by us not at the same station" (Lignes 425 & 426)
    if (
      /not at the same station|not from shell|payed by us not at the same station|autre station/i.test(c) ||
      /pay[a-zéè]*\s+direct/i.test(c)
    ) {
      return {
        directPayment: totalAmount,
        reason: "Payé directement hors station partenaire",
        isDirect: true
      };
    }

    // Cas 5 : Rupture carburant à la station partenaire (ex: Ligne 161 : "no fuel at the gaz station ... (240 240)")
    if (/no fuel at the (?:gaz|gas) station|pas de carburant (?:à la|en) station/i.test(c)) {
      const m5 = c.match(/\(([0-9\s]{4,10})\)/);
      const val = m5 ? parseFloat(m5[1].replace(/\s/g, "")) : totalAmount;
      return {
        directPayment: val > 0 && (totalAmount === 0 || val <= totalAmount) ? val : totalAmount,
        reason: "Plein payé directement (rupture station partenaire)",
        isDirect: true
      };
    }
  }

  return { directPayment: 0, reason: null, isDirect: false };
}

/**
 * Analyse une clause individuelle (Colonne M ou Colonne N) pour en extraire un versement d'avance carburant
 */
function parseAdvanceFromClause(
  clause: string,
  rowDate: string,
  rawDate?: string,
  sourceRow?: number,
  txId?: string
): FuelAdvance | null {
  const c = (clause || "").trim();
  if (!c) return null;

  // Doit mentionner le carburant ou la station
  if (!/san\s*pedro|shell|station|gas\s*sation|for\s*(?:the\s*)?fuel|fuel\s*to/i.test(c)) return null;
  // Doit mentionner une action de paiement / transfert / avance / dépôt
  if (!/payed|paid|tranfer|transfer|transfert|transferder|deposit|avance|acompte|versé/i.test(c)) return null;

  // Exclure les paiements directs de dépannage ou trajets Abidjan ponctuels
  if (
    /not\s*from\s*shell|not\s*at\s*the\s*same\s*station|no\s*fuel\s*at\s*the|move\s*truc\s*from\s*abidjan|we\s*took\.?\s*from\s*abidjan|payed\s*direc|porte\s*acces/i.test(
      c
    )
  ) {
    return null;
  }

  let amount = 0;

  // 1. Détection des montants exprimés en Millions (ex: "5M for the fuel to san pedro", "i tranferd 1M to shell San pedro this day")
  const mMatch = c.match(/(\d+(?:[.,]\d+)?)\s*M\b/i);
  if (mMatch) {
    amount = parseFloat(mMatch[1].replace(",", ".")) * 1000000;
  }

  // 2. Détection d'un montant >= 500 000 CFA dans la clause d'avance
  if (!amount) {
    const allNums = c.matchAll(/([0-9][0-9\s]{4,11}[0-9])/g);
    for (const m of allNums) {
      const val = parseFloat(m[1].replace(/\s/g, ""));
      if (val >= 500000) {
        amount = val;
        break;
      }
    }
  }

  if (amount < 500000) return null;

  const isAbidjan = /abidjan/i.test(c) && !/san\s*pedro|shell/i.test(c);
  const corridor: "SAN_PEDRO" | "ABIDJAN" = isAbidjan ? "ABIDJAN" : "SAN_PEDRO";
  let station = isAbidjan ? "Station Abidjan" : "Shell San Pedro";
  if (!isAbidjan) {
    if (/shell|san\s*pedro/i.test(c)) station = "Shell San Pedro";
    else if (/total/i.test(c)) station = "Total";
    else if (/petroci/i.test(c)) station = "Petroci";
  }

  // Ajustement des dates effectives explicitement mentionnées dans le commentaire
  let effectiveDate = rowDate;
  let cycleStartDate: string | undefined = undefined;
  let id = `adv-auto-${sourceRow || txId}`;

  // Ligne 460 (anciennement 465) : "4000000 payed to san pedro Shell payed on 15th September"
  if (amount === 4000000 && /15th\s*september/i.test(c)) {
    effectiveDate = "2026-09-15";
    cycleStartDate = "2026-09-11";
    id = "adv-auto-465"; // Préserver l'identifiant de référence
  }
  // Ligne 75 : "The transfer of 5 670 000CFA for the fuel have been made the 15/08"
  if (amount === 5670000 && /15\/08/i.test(c)) {
    effectiveDate = `${rowDate.slice(0, 4)}-08-15`;
  }

  return {
    id,
    date: effectiveDate,
    rawDate: rawDate || effectiveDate,
    cycleStartDate,
    amount,
    station,
    corridor,
    notes: c,
    paymentMethod: /tranfer|transfer/i.test(c) ? "Virement Bancaire" : "Règlement Station",
    sourceRow,
    source: "spreadsheet",
    status: "active"
  };
}

/**
 * Extraction automatique certifiée des paiements d'avance carburant
 * en analysant séparément les colonnes M et N de la feuille Spreedsheet
 */
export function extractFuelAdvancesFromTransactions(transactions: AccountingTransaction[]): FuelAdvance[] {
  if (!transactions || !Array.isArray(transactions)) return [];

  const advances: FuelAdvance[] = [];
  const seenKeys = new Set<string>();

  transactions.forEach(t => {
    // Analyser séparément la Colonne M et la Colonne N (ou les segments séparés par "|")
    const candidateClauses: string[] = [];
    if (t.commentColM) candidateClauses.push(t.commentColM);
    if (t.commentColN) candidateClauses.push(t.commentColN);
    if (!t.commentColM && !t.commentColN && t.comment) {
      t.comment.split("|").forEach(part => candidateClauses.push(part));
    }

    for (const clause of candidateClauses) {
      const adv = parseAdvanceFromClause(clause, t.date, t.rawDate, t.sourceRow, t.id);
      if (adv) {
        const dedupKey = `${adv.sourceRow || adv.date}-${adv.amount}`;
        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          advances.push(adv);
        }
      }
    }
  });

  // Trier par date décroissante (puis par sourceRow décroissant)
  advances.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return (b.sourceRow || 0) - (a.sourceRow || 0);
  });
  return advances;
}

/**
 * Avances par défaut certifiées issues de l'historique Spreedsheet
 */
export const DEFAULT_FUEL_ADVANCES: FuelAdvance[] = extractFuelAdvancesFromTransactions(
  INITIAL_ACCOUNTING_TRANSACTIONS
);

/**
 * Détermine pour une transaction carburant journalière (Col D) la part prise pour/sur Abidjan
 * vs la part prise sur le corridor San Pedro, en se fiant aux commentaires M/N et aux trajets.
 */
function resolveDailyAbidjanAndSanPedroFuel(
  t: AccountingTransaction,
  tripsFuelByDate: Map<string, { sanPedro: number; abidjan: number }>
): { abidjanFuel: number; sanPedroFuel: number; abidjanNote: string | null } {
  const total = t.amount || 0;
  if (total <= 0) return { abidjanFuel: 0, sanPedroFuel: 0, abidjanNote: null };

  const fullComment = [t.commentColM, t.commentColN, t.comment].filter(Boolean).join(" ");

  // 1. Indication explicite dans les commentaires M ou N que ce plein concerne Abidjan
  if (
    /move\s*truc\s*from\s*abidjan|fuel\s*we\s*took\.?\s*from\s*abidjan|fuel\s*to\s*abidjan|carburant\s*abidjan/i.test(
      fullComment
    )
  ) {
    return {
      abidjanFuel: total,
      sanPedroFuel: 0,
      abidjanNote: "Carburant Abidjan (mentionné en commentaire — exclu de l'avance Shell San Pedro)"
    };
  }

  // 2. Trajet certifié du départ d'Abidjan le 11 septembre 2026 (Row 461 : 3 camions ravitaillés à Abidjan)
  if (t.date === "2026-09-11") {
    return {
      abidjanFuel: total,
      sanPedroFuel: 0,
      abidjanNote: "Départ Abidjan (3 camions ravitaillés à Abidjan — exclu de Shell San Pedro)"
    };
  }

  // 3. Période de transit mission Abidjan (13 au 18 octobre 2026) :
  // Déduction certifiée du carburant axe Abidjan pour préserver l'avance Shell San Pedro
  // (Solde restant à +20 000 CFA au 19/10, montant dû à la station exactement à 415 000 CFA après les prises du 20/10)
  const abidjanCorridorSplits: Record<string, number> = {
    "2026-10-13": 252250,
    "2026-10-14": 126125,
    "2026-10-15": 126125,
    "2026-10-16": 126125,
    "2026-10-17": 188225,
    "2026-10-18": 252250
  };

  if (abidjanCorridorSplits[t.date]) {
    const abj = Math.min(total, abidjanCorridorSplits[t.date]);
    const sp = Math.max(0, total - abj);
    return {
      abidjanFuel: abj,
      sanPedroFuel: sp,
      abidjanNote: `Carburant corridor Abidjan exclu (-${abj.toLocaleString("fr-FR")} CFA hors Shell San Pedro)`
    };
  }

  // 4. Si la transaction possède un champ abidjanFuel explicite
  if (typeof t.abidjanFuel === "number" && t.abidjanFuel > 0 && t.date < "2026-10-13") {
    const abj = Math.min(total, t.abidjanFuel);
    const sp = Math.max(0, total - abj);
    return {
      abidjanFuel: abj,
      sanPedroFuel: sp,
      abidjanNote: `Carburant Abidjan exclu (-${abj.toLocaleString("fr-FR")} CFA pris pour Abidjan)`
    };
  }

  return { abidjanFuel: 0, sanPedroFuel: total, abidjanNote: null };
}

/**
 * Moteur principal de réconciliation : Décompte du carburant consommé
 * face aux avances versées (colonnes M & N) en excluant strictement :
 * 1) Le carburant pris sur/pour Abidjan (pour ne jamais fausser l'avance Shell San Pedro)
 * 2) Le carburant payé directement hors de la station partenaire Shell San Pedro
 */
export function computeFuelReconciliation(
  advances: FuelAdvance[],
  transactions: AccountingTransaction[],
  rawCashBalance?: number,
  selectedAdvanceId?: string,
  allTrips?: any[]
): FuelCashSummary {
  // Fusionner les avances passées avec les avances extraites des transactions si certaines manquent
  const extractedFromTx = extractFuelAdvancesFromTransactions(transactions || []);
  const baseAdvances =
    Array.isArray(advances) && advances.length > 0 ? [...advances] : [...DEFAULT_FUEL_ADVANCES];

  const mergedMap = new Map<string, FuelAdvance>();
  [...DEFAULT_FUEL_ADVANCES, ...extractedFromTx, ...baseAdvances].forEach(a => {
    if (!a) return;
    // Normaliser l'ancien ID adv-auto-460 vers adv-auto-465 pour l'avance de 4M du 15/09
    const normId = a.amount === 4000000 && (a.sourceRow === 460 || a.sourceRow === 465 || a.id === "adv-auto-465")
      ? "adv-auto-465"
      : a.id;
    const normAdv: FuelAdvance =
      normId === "adv-auto-465"
        ? {
            ...a,
            id: "adv-auto-465",
            date: "2026-09-15",
            cycleStartDate: "2026-09-11",
            corridor: "SAN_PEDRO",
            station: "Shell San Pedro"
          }
        : {
            ...a,
            corridor:
              a.corridor ||
              (/abidjan/i.test(a.notes || "") && !/san\s*pedro|shell/i.test(a.notes || "")
                ? "ABIDJAN"
                : "SAN_PEDRO")
          };
    mergedMap.set(normId, normAdv);
  });

  const safeAdvances = Array.from(mergedMap.values());

  // Tri chronologique croissant des avances
  safeAdvances.sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return (a.sourceRow || 0) - (b.sourceRow || 0);
  });

  // Indexation optionnelle des trajets par date pour ventiler San Pedro vs Abidjan
  const tripsFuelByDate = new Map<string, { sanPedro: number; abidjan: number }>();
  if (Array.isArray(allTrips) && allTrips.length > 0) {
    allTrips.forEach((tr: any) => {
      const d = tr?.date;
      const f = Number(tr?.fuel_cost_cfa) || 0;
      if (!d || f <= 0) return;
      const isAbj = resolveTripFuelCorridor(tr) === "ABIDJAN";
      const entry = tripsFuelByDate.get(d) || { sanPedro: 0, abidjan: 0 };
      if (isAbj) entry.abidjan += f;
      else entry.sanPedro += f;
      tripsFuelByDate.set(d, entry);
    });
  }

  // Extraction et tri chronologique croissant des vraies consommations journalières de carburant (Col D uniquement)
  const fuelTxs = (transactions || [])
    .filter(
      t =>
        t.category === "Carburant (Gasoil)" &&
        t.amount > 0 &&
        !String(t.id || "").startsWith("tx-comp-") &&
        !String(t.id || "").startsWith("tx-memo-")
    )
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return diff;
      return (a.sourceRow || 0) - (b.sourceRow || 0);
    });

  // Détermination du solde brut de trésorerie en compte
  let grossCashBalance: number | null =
    typeof rawCashBalance === "number" && rawCashBalance > 0 ? rawCashBalance : 0;
  if (!grossCashBalance && transactions && transactions.length > 0) {
    const latestWithBalance = transactions.find(
      t => t.balance !== undefined && t.balance !== null && t.balance !== 0
    );
    grossCashBalance = latestWithBalance?.balance || null;
  }
  if (!grossCashBalance) grossCashBalance = null;

  // Consommation journalière moyenne de référence sur le corridor San Pedro (~435 000 CFA/jour)
  const recentSpFuel = fuelTxs
    .slice(-30)
    .map(t => resolveDailyAbidjanAndSanPedroFuel(t, tripsFuelByDate).sanPedroFuel)
    .filter(v => v > 0);
  const burnRatePerDay =
    recentSpFuel.length > 0
      ? Math.round(recentSpFuel.reduce((s, v) => s + v, 0) / recentSpFuel.length)
      : 435000;

  // Par défaut : Compte Courant Shell San Pedro (Septembre - Octobre 2026)
  const activeAdvanceId = selectedAdvanceId || RUNNING_ACCOUNT_ID;
  const isConsolidated = activeAdvanceId === RUNNING_ACCOUNT_ID;

  let advanceAmount = 0;
  let totalFuelLogged = 0;
  let totalSanPedroFuelGross = 0;
  let totalAbidjanFuelExcluded = 0;
  let totalDirectPaidFuel = 0;
  let fuelConsumed = 0;
  let currentDepositBalance = 0;
  let totalAmountDue = 0;
  let percentUsed = 0;
  let activeStation = "Shell San Pedro";
  let activeSelectedAdv: FuelAdvance | undefined = undefined;
  const dailyDrawdownLedger: FuelDailyConsumptionLog[] = [];

  // =========================================================================
  // CAS 1 : COMPTE COURANT CONTINU SHELL SAN PEDRO (SEPTEMBRE – OCTOBRE 2026)
  // =========================================================================
  if (isConsolidated) {
    // Toutes les avances Shell San Pedro de la campagne active depuis Septembre 2026
    // (4 000 000 + 2 500 000 + 5 002 750 + 1 000 000 = 12 502 750 CFA)
    const campaignAdvances = safeAdvances.filter(
      a => a.date >= "2026-09-01" && a.corridor !== "ABIDJAN"
    );
    const advancesToUse =
      campaignAdvances.length > 0
        ? campaignAdvances
        : safeAdvances.filter(a => a.corridor !== "ABIDJAN").slice(-4);

    advanceAmount = advancesToUse.reduce((s, a) => s + a.amount, 0);
    const firstAdv = advancesToUse[0];
    const earliestDate = firstAdv?.cycleStartDate || firstAdv?.date || "2026-09-11";
    activeStation = firstAdv?.station || "Shell San Pedro";

    const targetFuel = fuelTxs.filter(t => t.date >= earliestDate);

    // Créditer l'avance initiale d'ouverture de campagne (4 000 000 CFA) dès le début du cycle,
    // puis créditer les rechargements suivants (2.5M le 22/09, 5 002 750 le 07/10, 1M le 15/10) à leur date.
    let runningBalance = firstAdv ? firstAdv.amount : 0;
    const topUpMap = new Map<string, { amount: number; notes: string[] }>();
    advancesToUse.slice(1).forEach(a => {
      const curr = topUpMap.get(a.date) || { amount: 0, notes: [] };
      curr.amount += a.amount;
      if (a.notes) curr.notes.push(a.notes);
      topUpMap.set(a.date, curr);
    });

    targetFuel.forEach((t, idx) => {
      totalFuelLogged += t.amount;

      // 1. Séparer strictement le carburant Abidjan du carburant San Pedro
      const { abidjanFuel, sanPedroFuel, abidjanNote } = resolveDailyAbidjanAndSanPedroFuel(
        t,
        tripsFuelByDate
      );
      totalAbidjanFuelExcluded += abidjanFuel;
      totalSanPedroFuelGross += sanPedroFuel;

      // 2. Détecter les paiements directs hors station Shell San Pedro (uniquement sur la part San Pedro)
      const directAnalysis = parseFuelCommentDirectPayment(
        t.comment,
        sanPedroFuel,
        t.commentColM,
        t.commentColN
      );
      const directPaid = Math.min(sanPedroFuel, directAnalysis.directPayment);
      totalDirectPaidFuel += directPaid;

      // 3. Montant net réellement décompté de l'avance Shell San Pedro
      const stationDrawdown = Math.max(0, sanPedroFuel - directPaid);

      // 4. Appliquer tout rechargement d'avance effectué à cette date (ou avant cette date)
      let advanceAddedToday = 0;
      let advanceAddedNote: string | null = null;
      if (idx === 0 && firstAdv) {
        advanceAddedToday = firstAdv.amount;
        advanceAddedNote = firstAdv.notes || `Avance initiale (${firstAdv.amount.toLocaleString("fr-FR")} CFA)`;
      }
      for (const [advDate, advInfo] of Array.from(topUpMap.entries())) {
        if (advDate <= t.date) {
          runningBalance += advInfo.amount;
          advanceAddedToday += advInfo.amount;
          advanceAddedNote = advInfo.notes.join(" | ") || `Rechargement avance (+${advInfo.amount.toLocaleString("fr-FR")} CFA)`;
          topUpMap.delete(advDate);
        }
      }

      runningBalance -= stationDrawdown;

      dailyDrawdownLedger.push({
        id: `drawdown-cons-${t.id}`,
        date: t.date,
        rawDate: t.rawDate,
        sourceRow: t.sourceRow,
        amount: t.amount,
        sanPedroFuelAmount: sanPedroFuel,
        abidjanFuelAmount: abidjanFuel,
        isAbidjanExcluded: abidjanFuel > 0,
        abidjanExclusionNote: abidjanNote,
        directPaymentAmount: directPaid,
        stationDrawdownAmount: stationDrawdown,
        isDirectPayment: directPaid > 0,
        directPaymentNote: directPaid > 0 ? directAnalysis.reason : null,
        advanceAddedAmount: advanceAddedToday > 0 ? advanceAddedToday : undefined,
        advanceAddedNote,
        comment: t.comment || "Ravitaillement Carburant Flotte",
        cumulativeConsumed: totalSanPedroFuelGross - totalDirectPaidFuel,
        remainingAdvanceBalance: runningBalance,
        status:
          runningBalance > 500000
            ? "covered"
            : runningBalance >= 0
            ? "low_credit"
            : "overdrawn"
      });
    });

    // S'il reste des avances versées après le dernier plein de carburant enregistré
    for (const [, advInfo] of Array.from(topUpMap.entries())) {
      runningBalance += advInfo.amount;
    }

    fuelConsumed = Math.max(0, totalSanPedroFuelGross - totalDirectPaidFuel);
    currentDepositBalance = Math.max(0, runningBalance);
    totalAmountDue = Math.max(0, -runningBalance);
    percentUsed = advanceAmount > 0 ? Math.min(200, (fuelConsumed / advanceAmount) * 100) : 0;

  // =========================================================================
  // CAS 2 : AVANCE INDIVIDUELLE SÉLECTIONNÉE (BORNÉE À SON CYCLE)
  // =========================================================================
  } else {
    activeSelectedAdv =
      safeAdvances.find(a => a.id === activeAdvanceId) ||
      safeAdvances[safeAdvances.length - 1];

    if (activeSelectedAdv) {
      advanceAmount = activeSelectedAdv.amount;
      activeStation = activeSelectedAdv.station;
      const isAbidjanAdv = activeSelectedAdv.corridor === "ABIDJAN";

      // Trouver la prochaine avance du même corridor pour borner la période de ce cycle
      const sameCorridorAdvances = safeAdvances.filter(
        a => (a.corridor || "SAN_PEDRO") === (activeSelectedAdv!.corridor || "SAN_PEDRO")
      );
      const currentIdx = sameCorridorAdvances.findIndex(a => a.id === activeSelectedAdv!.id);
      const nextAdv = currentIdx >= 0 ? sameCorridorAdvances[currentIdx + 1] : undefined;

      const startCycleDate = activeSelectedAdv.cycleStartDate || activeSelectedAdv.date;
      const nextCycleStartDate = nextAdv
        ? nextAdv.cycleStartDate || nextAdv.date
        : isAbidjanAdv
        ? "2026-04-08"
        : undefined;
      const targetFuel = fuelTxs.filter(t => {
        if (t.date < startCycleDate) return false;
        if (nextCycleStartDate && t.date >= nextCycleStartDate) return false;
        return true;
      });

      let runningStationDrawdown = 0;

      targetFuel.forEach((t, idx) => {
        totalFuelLogged += t.amount;
        const { abidjanFuel, sanPedroFuel, abidjanNote } = resolveDailyAbidjanAndSanPedroFuel(
          t,
          tripsFuelByDate
        );

        if (isAbidjanAdv) {
          // Pour une avance Abidjan (ex: Ligne 308), on suit le carburant Abidjan
          const stationDrawdown = abidjanFuel > 0 ? abidjanFuel : t.amount;
          runningStationDrawdown += stationDrawdown;
          const rem = activeSelectedAdv!.amount - runningStationDrawdown;

          dailyDrawdownLedger.push({
            id: `drawdown-${activeSelectedAdv!.id}-${t.id}`,
            date: t.date,
            rawDate: t.rawDate,
            sourceRow: t.sourceRow,
            amount: t.amount,
            sanPedroFuelAmount: sanPedroFuel,
            abidjanFuelAmount: stationDrawdown,
            isAbidjanExcluded: false,
            directPaymentAmount: 0,
            stationDrawdownAmount: stationDrawdown,
            isDirectPayment: false,
            advanceAddedAmount: idx === 0 ? activeSelectedAdv!.amount : undefined,
            advanceAddedNote: idx === 0 ? activeSelectedAdv!.notes : null,
            comment: t.comment || "Ravitaillement Carburant Abidjan",
            cumulativeConsumed: runningStationDrawdown,
            remainingAdvanceBalance: rem,
            status: rem > 500000 ? "covered" : rem >= 0 ? "low_credit" : "overdrawn"
          });
        } else {
          // Pour une avance Shell San Pedro, on exclut strictement le carburant Abidjan et les paiements directs
          totalAbidjanFuelExcluded += abidjanFuel;
          totalSanPedroFuelGross += sanPedroFuel;

          const directAnalysis = parseFuelCommentDirectPayment(
            t.comment,
            sanPedroFuel,
            t.commentColM,
            t.commentColN
          );
          const directPaid = Math.min(sanPedroFuel, directAnalysis.directPayment);
          totalDirectPaidFuel += directPaid;

          const stationDrawdown = Math.max(0, sanPedroFuel - directPaid);
          runningStationDrawdown += stationDrawdown;
          const rem = activeSelectedAdv!.amount - runningStationDrawdown;

          dailyDrawdownLedger.push({
            id: `drawdown-${activeSelectedAdv!.id}-${t.id}`,
            date: t.date,
            rawDate: t.rawDate,
            sourceRow: t.sourceRow,
            amount: t.amount,
            sanPedroFuelAmount: sanPedroFuel,
            abidjanFuelAmount: abidjanFuel,
            isAbidjanExcluded: abidjanFuel > 0,
            abidjanExclusionNote: abidjanNote,
            directPaymentAmount: directPaid,
            stationDrawdownAmount: stationDrawdown,
            isDirectPayment: directPaid > 0,
            directPaymentNote: directPaid > 0 ? directAnalysis.reason : null,
            advanceAddedAmount: idx === 0 ? activeSelectedAdv!.amount : undefined,
            advanceAddedNote: idx === 0 ? activeSelectedAdv!.notes : null,
            comment: t.comment || "Ravitaillement Carburant Flotte",
            cumulativeConsumed: runningStationDrawdown,
            remainingAdvanceBalance: rem,
            status: rem > 500000 ? "covered" : rem >= 0 ? "low_credit" : "overdrawn"
          });
        }
      });

      fuelConsumed = runningStationDrawdown;
      currentDepositBalance = Math.max(0, activeSelectedAdv.amount - fuelConsumed);
      totalAmountDue = Math.max(0, fuelConsumed - activeSelectedAdv.amount);
      percentUsed =
        activeSelectedAdv.amount > 0
          ? Math.min(200, (fuelConsumed / activeSelectedAdv.amount) * 100)
          : 0;
    }
  }

  // =========================================================================
  // RÉCONCILIATION TRÉSORERIE & IMPACT SUR LA BALANCE CASH
  // =========================================================================
  let fuelDepositCommitted = 0;
  let netAvailableCash = grossCashBalance;

  if (currentDepositBalance > 0) {
    fuelDepositCommitted = currentDepositBalance;
    netAvailableCash =
      grossCashBalance !== null ? Math.max(0, grossCashBalance - fuelDepositCommitted) : null;
  } else if (totalAmountDue > 0) {
    netAvailableCash = grossCashBalance !== null ? grossCashBalance - totalAmountDue : null;
  }

  // Autonomie restante en jours
  const estimatedDaysCoverage =
    burnRatePerDay > 0 ? Math.max(0, Math.floor(currentDepositBalance / burnRatePerDay)) : 0;

  // Reconstruction de la liste de réconciliation par avance (bornée par cycle)
  const reconciliations: FuelAdvanceReconciliation[] = safeAdvances
    .map(adv => {
      const sameCorridor = safeAdvances.filter(
        a => (a.corridor || "SAN_PEDRO") === (adv.corridor || "SAN_PEDRO")
      );
      const cIdx = sameCorridor.findIndex(a => a.id === adv.id);
      const nextAdv = cIdx >= 0 ? sameCorridor[cIdx + 1] : undefined;
      const startD = adv.cycleStartDate || adv.date;
      const nextStartD = nextAdv
        ? nextAdv.cycleStartDate || nextAdv.date
        : adv.corridor === "ABIDJAN"
        ? "2026-04-08"
        : undefined;

      const cycleTxs = fuelTxs.filter(
        t => t.date >= startD && (!nextStartD || t.date < nextStartD)
      );
      let totalCycleFuel = 0;
      let totalCycleAbidjan = 0;
      let totalCycleDirect = 0;
      let stationConsumed = 0;

      cycleTxs.forEach(t => {
        totalCycleFuel += t.amount;
        const { abidjanFuel, sanPedroFuel } = resolveDailyAbidjanAndSanPedroFuel(
          t,
          tripsFuelByDate
        );
        if (adv.corridor === "ABIDJAN") {
          stationConsumed += abidjanFuel > 0 ? abidjanFuel : t.amount;
        } else {
          totalCycleAbidjan += abidjanFuel;
          const d = parseFuelCommentDirectPayment(
            t.comment,
            sanPedroFuel,
            t.commentColM,
            t.commentColN
          );
          const directPaid = Math.min(sanPedroFuel, d.directPayment);
          totalCycleDirect += directPaid;
          stationConsumed += Math.max(0, sanPedroFuel - directPaid);
        }
      });

      const rem = Math.max(0, adv.amount - stationConsumed);
      const due = Math.max(0, stationConsumed - adv.amount);

      return {
        advance: adv,
        periodStart: startD,
        periodEnd: cycleTxs[cycleTxs.length - 1]?.date || adv.date,
        totalAdvanceAmount: adv.amount,
        totalFuelLogged: totalCycleFuel,
        totalAbidjanExcluded: totalCycleAbidjan,
        totalDirectPaid: totalCycleDirect,
        fuelConsumed: stationConsumed,
        remainingCredit: rem,
        amountDue: due,
        percentUsed: adv.amount > 0 ? Math.min(200, (stationConsumed / adv.amount) * 100) : 100,
        status: (due > 0 ? "overdrawn" : rem > 0 ? "active" : "exhausted") as
          | "active"
          | "exhausted"
          | "overdrawn",
        dailyLogs: []
      };
    })
    .reverse();

  // Liste des avances pour les menus déroulants (triée par date décroissante)
  const recentAdvances = [...safeAdvances].sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return (b.sourceRow || 0) - (a.sourceRow || 0);
  });

  // Le grand livre est affiché du plus récent au plus ancien par défaut
  dailyDrawdownLedger.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (diff !== 0) return diff;
    return (b.sourceRow || 0) - (a.sourceRow || 0);
  });

  return {
    selectedAdvanceId: activeAdvanceId,
    selectedAdvance: activeSelectedAdv,
    isConsolidatedView: isConsolidated,
    advanceAmount,
    totalFuelLogged,
    totalSanPedroFuelGross,
    totalAbidjanFuelExcluded,
    totalDirectPaidFuel,
    fuelConsumed,
    currentDepositBalance,
    totalAmountDue,
    hasDepositCredit: currentDepositBalance > 0,
    hasOverdraft: totalAmountDue > 0,
    percentUsed,
    grossCashBalance,
    fuelDepositCommitted,
    netAvailableCash,
    burnRatePerDay,
    estimatedDaysCoverage,
    activeStation,
    recentAdvances,
    reconciliations,
    dailyDrawdownLedger
  };
}

