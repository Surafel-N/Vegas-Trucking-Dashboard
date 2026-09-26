import { AccountingTransaction } from "./accountingParser";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "./accountingInitialData";

export interface FuelAdvance {
  id: string;
  date: string; // ISO: YYYY-MM-DD
  rawDate?: string;
  amount: number; // Montant de l'avance en CFA (ex: 4 000 000)
  station: string; // Ex: "Shell San Pedro"
  paymentMethod?: string; // Virement, Chèque, Espèces, etc.
  notes?: string;
  sourceRow?: number;
  source?: "spreadsheet" | "manual";
  status?: "active" | "exhausted" | "overdrawn";
}

export interface FuelDailyConsumptionLog {
  id: string;
  date: string;
  rawDate?: string;
  sourceRow?: number;
  amount: number; // Montant carburant du jour
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
  fuelConsumed: number;
  remainingCredit: number; // > 0 si solde positif disponible en station
  amountDue: number; // > 0 si consommation > avance (dette / reste à régler)
  percentUsed: number;
  status: "active" | "exhausted" | "overdrawn";
  dailyLogs: FuelDailyConsumptionLog[];
}

export interface FuelCashSummary {
  // Avances & Dépôts
  totalAdvancesDeposited: number;
  totalFuelConsumedAgainstAdvances: number;
  currentDepositBalance: number; // Solde crédit restant disponible chez les stations
  totalAmountDue: number; // Reste à régler / dépassement envers les stations
  hasDepositCredit: boolean;
  hasOverdraft: boolean;

  // Réconciliation Trésorerie / Cash Balance
  grossCashBalance: number; // Solde brut en compte (ex: 4 000 000 CFA)
  fuelDepositCommitted: number; // Part immobilisée / en dépôt carburant (ex: 2 000 000 CFA)
  netAvailableCash: number; // Cash liquide réellement disponible (ex: 2 000 000 CFA)

  // Indicateurs opérationnels
  burnRatePerDay: number; // Consommation moyenne par jour d'activité
  estimatedDaysCoverage: number; // Jours de carburant restants avec le solde dépôt
  activeStation: string;
  
  // Détails
  recentAdvances: FuelAdvance[];
  reconciliations: FuelAdvanceReconciliation[];
  dailyDrawdownLedger: FuelDailyConsumptionLog[];
}

/**
 * Extraction automatique certifiée des paiements d'avance carburant
 * depuis les commentaires et transactions de la feuille Spreedsheet
 */
export function extractFuelAdvancesFromTransactions(transactions: AccountingTransaction[]): FuelAdvance[] {
  if (!transactions || !Array.isArray(transactions)) return [];

  const advances: FuelAdvance[] = [];
  const seenRows = new Set<number>();

  transactions.forEach((t) => {
    const c = (t.comment || "").trim();
    if (!c) return;

    // Filtre préalable sur les mots-clés carburant & paiement d'avance
    if (!/san pedro|shell|station|gas sation|fuel to|carburant/i.test(c)) return;
    if (!/payed|paid|transfer|transfert|transferder|deposit|avance|acompte|versé/i.test(c)) return;
    if (/front tires|helpers foods|porte acces/i.test(c)) return;
    if (t.sourceRow && seenRows.has(t.sourceRow)) return;

    let amount = 0;

    // 1. Détection des montants en Millions (ex: "5M for the fuel")
    const mMatch = c.match(/(\d+(?:[.,]\d+)?)\s*M\s*(?:for\s*(?:the\s*)?fuel|to\s*san\s*pedro)/i);
    if (mMatch) {
      amount = parseFloat(mMatch[1].replace(",", ".")) * 1000000;
    }

    // 2. Détection après mot-clé de versement (ex: "payed to san pedro shell", "transfer of 5 670 000CFA")
    if (!amount) {
      const numMatches = c.matchAll(/(?:payed|paid|transfer|transfert|transferder|deposit|avance|acompte)\s*(?:of|this\s*day)?\s*[:\s]*([0-9\s]{6,12})\s*(?:cfa|f)?/gi);
      for (const m of numMatches) {
        const val = parseFloat(m[1].replace(/\s/g, ""));
        if (val >= 500000) {
          amount = val;
          break;
        }
      }
    }

    // 3. Détection avant mot-clé de versement (ex: "4000000 payed to san pedro Shell", "2500000 payed to san pedro shell")
    if (!amount) {
      const numMatches2 = c.matchAll(/([0-9\s]{6,12})\s*(?:cfa|f)?\s*(?:payed|paid|transfer|transfert|transferder|deposit|avance)/gi);
      for (const m of numMatches2) {
        const val = parseFloat(m[1].replace(/\s/g, ""));
        if (val >= 500000) {
          amount = val;
          break;
        }
      }
    }

    // 4. Cas spécifique relevé 105 ("Deposit For Oct 1 to 7 to the fuel station for 21 Trip 2835000")
    if (!amount && /deposit for oct/i.test(c)) {
      const m = c.match(/2835000/);
      if (m) amount = 2835000;
    }

    if (amount >= 500000) {
      if (t.sourceRow) seenRows.add(t.sourceRow);

      let station = "Shell San Pedro";
      if (/shell/i.test(c) || /san pedro/i.test(c)) station = "Shell San Pedro";
      else if (/total/i.test(c)) station = "Total";
      else if (/petroci/i.test(c)) station = "Petroci";

      advances.push({
        id: `adv-auto-${t.sourceRow || t.id}`,
        date: t.date,
        rawDate: t.rawDate,
        amount,
        station,
        notes: c,
        paymentMethod: /transfer/i.test(c) ? "Virement Bancaire" : "Règlement Station",
        sourceRow: t.sourceRow,
        source: "spreadsheet",
        status: "active"
      });
    }
  });

  // Trier par date décroissante
  advances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return advances;
}

/**
 * Avances par défaut certifiées issues de l'historique Spreedsheet
 */
export const DEFAULT_FUEL_ADVANCES: FuelAdvance[] = extractFuelAdvancesFromTransactions(INITIAL_ACCOUNTING_TRANSACTIONS);

/**
 * Moteur principal de réconciliation : Décompte du carburant consommé
 * face aux avances versées et calcul d'impact sur la balance cash
 */
export function computeFuelReconciliation(
  advances: FuelAdvance[],
  transactions: AccountingTransaction[],
  rawCashBalance?: number
): FuelCashSummary {
  const safeAdvances = Array.isArray(advances) && advances.length > 0 
    ? [...advances] 
    : [...DEFAULT_FUEL_ADVANCES];

  // Tri chronologique croissant des avances pour le décompte séquentiel
  safeAdvances.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Extraction et tri chronologique croissant des consommations journalières de carburant
  const fuelTxs = (transactions || [])
    .filter(t => t.category === "Carburant (Gasoil)" && t.amount > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Détermination du solde de trésorerie de référence
  let grossCashBalance = typeof rawCashBalance === "number" ? rawCashBalance : 0;
  if (!grossCashBalance && transactions && transactions.length > 0) {
    const latestWithBalance = transactions.find(t => t.balance !== undefined && t.balance !== null && t.balance !== 0);
    grossCashBalance = latestWithBalance?.balance || 0;
  }

  // Calcul du taux moyen journalier de consommation (sur les 30 derniers ravitaillements)
  const recentFuelTxs = fuelTxs.slice(-30);
  const burnRatePerDay = recentFuelTxs.length > 0
    ? Math.round(recentFuelTxs.reduce((s, t) => s + t.amount, 0) / recentFuelTxs.length)
    : 435000; // ~435 000 CFA/jour de référence pour les 3 camions

  // Reconstruction des cycles de réconciliation
  const reconciliations: FuelAdvanceReconciliation[] = [];
  const allDailyLogs: FuelDailyConsumptionLog[] = [];

  // Suivi en continu du solde cumulé des avances et consommations
  let cumulativeAdvances = 0;
  let cumulativeFuel = 0;

  // On traite les avances de manière chronologique
  safeAdvances.forEach((adv, advIdx) => {
    cumulativeAdvances += adv.amount;
    const nextAdv = safeAdvances[advIdx + 1];

    // Les ravitaillements imputés à cette avance sont ceux entre la date de cette avance
    // et la date de l'avance suivante (ou jusqu'à aujourd'hui)
    const cycleTxs = fuelTxs.filter(t => {
      const isAfterOrEqual = t.date >= adv.date;
      const isBeforeNext = nextAdv ? t.date < nextAdv.date : true;
      return isAfterOrEqual && isBeforeNext;
    });

    let cycleFuelConsumed = 0;
    const cycleDailyLogs: FuelDailyConsumptionLog[] = [];

    cycleTxs.forEach(t => {
      cycleFuelConsumed += t.amount;
      cumulativeFuel += t.amount;
      const remainingBalance = adv.amount - cycleFuelConsumed;

      const log: FuelDailyConsumptionLog = {
        id: `drawdown-${t.id}`,
        date: t.date,
        rawDate: t.rawDate,
        sourceRow: t.sourceRow,
        amount: t.amount,
        comment: t.comment || "Ravitaillement Carburant Flotte",
        cumulativeConsumed: cycleFuelConsumed,
        remainingAdvanceBalance: remainingBalance,
        status: remainingBalance > 500000 ? "covered" : remainingBalance >= 0 ? "low_credit" : "overdrawn"
      };

      cycleDailyLogs.push(log);
      allDailyLogs.push(log);
    });

    const remainingCredit = Math.max(0, adv.amount - cycleFuelConsumed);
    const amountDue = Math.max(0, cycleFuelConsumed - adv.amount);
    const percentUsed = adv.amount > 0 ? Math.min(200, (cycleFuelConsumed / adv.amount) * 100) : 100;

    let status: "active" | "exhausted" | "overdrawn" = "active";
    if (amountDue > 0) status = "overdrawn";
    else if (remainingCredit === 0 || nextAdv) status = "exhausted";

    reconciliations.push({
      advance: adv,
      periodStart: adv.date,
      periodEnd: nextAdv ? nextAdv.date : (cycleTxs[cycleTxs.length - 1]?.date || adv.date),
      totalAdvanceAmount: adv.amount,
      fuelConsumed: cycleFuelConsumed,
      remainingCredit,
      amountDue,
      percentUsed,
      status,
      dailyLogs: cycleDailyLogs
    });
  });

  // Calcul du solde actuel du dernier cycle (cycle actif)
  const latestRecon = reconciliations[reconciliations.length - 1];
  const currentDepositBalance = latestRecon ? latestRecon.remainingCredit : 0;
  const totalAmountDue = latestRecon ? latestRecon.amountDue : 0;

  // Calcul de la Trésorerie Réelle / Net Free Cash
  // Exemple formulé par l'utilisateur :
  // "4 000 000 sur le compte dont 2 000 000 en dépôt pour le carburant => réellement que 2 000 000 disponibles"
  // S'il y a un solde créditeur en station :
  // netAvailableCash = grossCashBalance - currentDepositBalance
  // S'il y a un dépassement (reste à payer à la station) :
  // netAvailableCash = grossCashBalance - totalAmountDue
  let netAvailableCash = grossCashBalance;
  let fuelDepositCommitted = 0;

  if (currentDepositBalance > 0) {
    fuelDepositCommitted = currentDepositBalance;
    netAvailableCash = Math.max(0, grossCashBalance - fuelDepositCommitted);
  } else if (totalAmountDue > 0) {
    netAvailableCash = grossCashBalance - totalAmountDue;
  }

  // Autonomie restante estimée en jours
  const estimatedDaysCoverage = burnRatePerDay > 0
    ? Math.max(0, Math.floor(currentDepositBalance / burnRatePerDay))
    : 0;

  // Tri des avances récentes par date décroissante pour l'affichage
  const recentAdvances = [...safeAdvances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Tri du grand livre de décompte journalier par date décroissante
  allDailyLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalAdvancesDeposited: safeAdvances.reduce((s, a) => s + a.amount, 0),
    totalFuelConsumedAgainstAdvances: cumulativeFuel,
    currentDepositBalance,
    totalAmountDue,
    hasDepositCredit: currentDepositBalance > 0,
    hasOverdraft: totalAmountDue > 0,
    grossCashBalance,
    fuelDepositCommitted,
    netAvailableCash,
    burnRatePerDay,
    estimatedDaysCoverage,
    activeStation: latestRecon?.advance.station || "Shell San Pedro",
    recentAdvances,
    reconciliations: reconciliations.reverse(),
    dailyDrawdownLedger: allDailyLogs
  };
}
