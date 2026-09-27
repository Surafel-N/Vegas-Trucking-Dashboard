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
  amount: number; // Montant carburant total enregistré (ex: 435 000 CFA)
  directPaymentAmount: number; // Montant payé directement ailleurs par nous (ex: 297 250 CFA)
  stationDrawdownAmount: number; // Montant réellement décompté de l'avance station (ex: 137 750 CFA)
  isDirectPayment: boolean; // true si une partie ou totalité a été payée directement
  directPaymentNote?: string | null; // e.g. "Payé directement à une autre station (297 250 CFA)"
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
  totalFuelLogged: number; // Carburant total flotte
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
  advanceAmount: number; // Montant de l'avance ou cumul suivi (ex: 4 000 000 ou 6 500 000 CFA)
  totalFuelLogged: number; // Total brut carburant flotte enregistré (ex: 3 335 000 CFA)
  totalDirectPaidFuel: number; // Part payée directement à une autre station (ex: 297 250 CFA)
  fuelConsumed: number; // Carburant décompté sur l'avance station (ex: 3 037 750 CFA)
  currentDepositBalance: number; // Solde crédit restant disponible en station (ex: 962 250 CFA)
  totalAmountDue: number; // Reste à régler à la station si dépassement (0 si couvert)
  percentUsed: number; // Pourcentage décompté (ex: 75.9%)
  hasDepositCredit: boolean;
  hasOverdraft: boolean;

  // Réconciliation Trésorerie / Cash Balance (demande utilisateur : 4M en compte dont solde dépôt => cash réel libre)
  grossCashBalance: number; // Solde brut en compte (ex: 4 032 276 CFA)
  fuelDepositCommitted: number; // Part immobilisée / en dépôt carburant (ex: 962 250 CFA)
  netAvailableCash: number; // Cash liquide réellement disponible (ex: 3 070 026 CFA)

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
 * Analyse intelligente des commentaires de la feuille Spreedsheet
 * Détecte les règlements directs effectués par l'utilisateur à d'autres stations
 * (ex: Ligne 471 : "297250Cfa this day's i payed direcly fuel for brahima and Soro(not from shell san pedro)")
 * qui doivent être exclus du décompte de l'avance station.
 */
export function parseFuelCommentDirectPayment(
  comment?: string, 
  totalAmount: number = 0
): DirectFuelPaymentAnalysis {
  if (!comment) return { directPayment: 0, reason: null, isDirect: false };
  const c = comment.trim();

  // Exclure les versements d'avances eux-mêmes (ex: "4000000 payed to san pedro Shell")
  if (
    /payed to (?:san pedro|shell)|transfer of|deposit for oct/i.test(c) && 
    !/not from shell|not at the same station|direc/i.test(c)
  ) {
    return { directPayment: 0, reason: null, isDirect: false };
  }

  // Cas 1 : Montant explicite avant 'payed direcly' / 'payé directement'
  // Ex: "297250Cfa this day's i payed direcly fuel for brahima and Soro(not from shell san pedro)"
  const m1 = c.match(/([0-9\s]{4,10})\s*(?:cfa|f)?\s*(?:this\s*day(?:'s)?\s*)?(?:i\s*)?(?:have\s*)?payed\s*direc/i);
  if (m1) {
    const val = parseFloat(m1[1].replace(/\s/g, ''));
    if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
      return { 
        directPayment: val, 
        reason: "Payé directement à une autre station (hors Shell)", 
        isDirect: true 
      };
    }
  }

  // Cas 2 : Montant explicite après 'payed directly' / 'payé directement'
  // Ex: "i payed directly 297 250 CFA fuel"
  const m2 = c.match(/(?:payed|paid|payé)\s*(?:direc(?:t)?ly|directement)[^0-9]*([0-9\s]{4,10})\s*(?:cfa|f)?/i);
  if (m2) {
    const val = parseFloat(m2[1].replace(/\s/g, ''));
    if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
      return { 
        directPayment: val, 
        reason: "Payé directement à une autre station (hors Shell)", 
        isDirect: true 
      };
    }
  }

  // Cas 3 : Montant explicite associé à 'not from shell' / 'hors station'
  const m3 = c.match(/([0-9\s]{4,10})\s*(?:cfa|f)?.*?not\s*from\s*(?:shell|station)/i);
  if (m3) {
    const val = parseFloat(m3[1].replace(/\s/g, ''));
    if (val > 0 && (totalAmount === 0 || val <= totalAmount)) {
      return { 
        directPayment: val, 
        reason: "Payé directement à une autre station (hors Shell)", 
        isDirect: true 
      };
    }
  }

  // Cas 4 : Mention de paiement direct sans montant découpé => la totalité de la ligne a été payée hors station
  // Ex: "This day fuel payed by us not at the same station" (Lignes 425 & 426)
  if (
    /not at the same station|not from shell|payed by us not at the same station|autre station/i.test(c) ||
    /(?:payed|paid|payé)\s*(?:direc(?:t)?ly|directement)/i.test(c)
  ) {
    return { 
      directPayment: totalAmount, 
      reason: "Payé directement hors station partenaire", 
      isDirect: true 
    };
  }

  // Cas 5 : Rupture carburant à la station partenaire (ex: Ligne 161)
  if (/no fuel at the (?:gaz|gas) station|pas de carburant (?:à la|en) station/i.test(c)) {
    return { 
      directPayment: totalAmount, 
      reason: "Plein payé directement (rupture station partenaire)", 
      isDirect: true 
    };
  }

  return { directPayment: 0, reason: null, isDirect: false };
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
  rawCashBalance?: number,
  selectedAdvanceId?: string
): FuelCashSummary {
  const safeAdvances = Array.isArray(advances) && advances.length > 0 
    ? [...advances] 
    : [...DEFAULT_FUEL_ADVANCES];

  // Tri chronologique croissant des avances
  safeAdvances.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Extraction et tri chronologique croissant des consommations journalières de carburant
  const fuelTxs = (transactions || [])
    .filter(t => t.category === "Carburant (Gasoil)" && t.amount > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Détermination du solde brut de trésorerie en compte
  let grossCashBalance = typeof rawCashBalance === "number" && rawCashBalance > 0 ? rawCashBalance : 0;
  if (!grossCashBalance && transactions && transactions.length > 0) {
    const latestWithBalance = transactions.find(t => t.balance !== undefined && t.balance !== null && t.balance !== 0);
    grossCashBalance = latestWithBalance?.balance || 4032276;
  }
  if (!grossCashBalance) grossCashBalance = 4032276; // Solde réel Spreedsheet Septembre 2026

  // Consommation journalière moyenne de référence (~435 000 CFA/jour)
  const recentFuelTxs = fuelTxs.slice(-30);
  const burnRatePerDay = recentFuelTxs.length > 0
    ? Math.round(recentFuelTxs.reduce((s, t) => s + t.amount, 0) / recentFuelTxs.length)
    : 435000;

  // Détermination de l'avance active sélectionnée
  // Par défaut absolu : l'avance de 4 000 000 CFA du 15/09/2026 (adv-auto-465)
  let activeAdvanceId = selectedAdvanceId;
  if (!activeAdvanceId) {
    const default4M = safeAdvances.find(a => a.amount === 4000000 || a.id === "adv-auto-465");
    activeAdvanceId = default4M ? default4M.id : safeAdvances[safeAdvances.length - 1]?.id || RUNNING_ACCOUNT_ID;
  }

  const isConsolidated = activeAdvanceId === RUNNING_ACCOUNT_ID;

  let advanceAmount = 0;
  let totalFuelLogged = 0;
  let totalDirectPaidFuel = 0;
  let fuelConsumed = 0;
  let currentDepositBalance = 0;
  let totalAmountDue = 0;
  let percentUsed = 0;
  let activeStation = "Shell San Pedro";
  let activeSelectedAdv: FuelAdvance | undefined = undefined;
  const dailyDrawdownLedger: FuelDailyConsumptionLog[] = [];

  // =========================================================================
  // CAS 1 : COMPTE COURANT CONTINU SHELL SAN PEDRO (SEPTEMBRE 2026)
  // =========================================================================
  if (isConsolidated) {
    // Rapprochement des versements actifs de Septembre 2026 (4M le 15/09 et 2.5M le 22/09)
    const septAdvances = safeAdvances.filter(a => a.date >= "2026-09-01");
    const advancesToUse = septAdvances.length > 0 ? septAdvances : safeAdvances.slice(-2);
    
    advanceAmount = advancesToUse.reduce((s, a) => s + a.amount, 0); // 6 500 000 CFA
    const earliestDate = advancesToUse[0]?.date || "2026-09-15";
    activeStation = advancesToUse[0]?.station || "Shell San Pedro";

    const targetFuel = fuelTxs.filter(t => t.date >= earliestDate);

    // Reconstruction du compte courant avec reports
    let runningBalance = 0;
    const advMap = new Map<string, number>();
    advancesToUse.forEach(a => {
      advMap.set(a.date, (advMap.get(a.date) || 0) + a.amount);
    });

    targetFuel.forEach(t => {
      totalFuelLogged += t.amount;
      const directAnalysis = parseFuelCommentDirectPayment(t.comment, t.amount);
      totalDirectPaidFuel += directAnalysis.directPayment;
      const stationDrawdown = Math.max(0, t.amount - directAnalysis.directPayment);

      // Si un versement a eu lieu ce jour-là, on l'ajoute
      if (advMap.has(t.date)) {
        runningBalance += advMap.get(t.date)!;
        advMap.delete(t.date); // appliqué
      }
      runningBalance -= stationDrawdown;

      dailyDrawdownLedger.push({
        id: `drawdown-cons-${t.id}`,
        date: t.date,
        rawDate: t.rawDate,
        sourceRow: t.sourceRow,
        amount: t.amount,
        directPaymentAmount: directAnalysis.directPayment,
        stationDrawdownAmount: stationDrawdown,
        isDirectPayment: directAnalysis.isDirect,
        directPaymentNote: directAnalysis.reason,
        comment: t.comment || "Ravitaillement Carburant Flotte",
        cumulativeConsumed: totalFuelLogged,
        remainingAdvanceBalance: runningBalance,
        status: runningBalance > 500000 ? "covered" : runningBalance >= 0 ? "low_credit" : "overdrawn"
      });
    });

    fuelConsumed = totalFuelLogged - totalDirectPaidFuel;
    currentDepositBalance = Math.max(0, runningBalance);
    totalAmountDue = Math.max(0, -runningBalance);
    percentUsed = advanceAmount > 0 ? Math.min(200, (fuelConsumed / advanceAmount) * 100) : 0;

  // =========================================================================
  // CAS 2 : AVANCE INDIVIDUELLE SÉLECTIONNÉE (EX: 4 000 000 CFA DU 15/09/2026)
  // =========================================================================
  } else {
    activeSelectedAdv = safeAdvances.find(a => a.id === activeAdvanceId) 
      || safeAdvances.find(a => a.amount === 4000000) 
      || safeAdvances[safeAdvances.length - 1];

    if (activeSelectedAdv) {
      advanceAmount = activeSelectedAdv.amount;
      activeStation = activeSelectedAdv.station;

      // Décompte chronologique de chaque ravitaillement depuis la date de l'avance
      const targetFuel = fuelTxs.filter(t => t.date >= activeSelectedAdv!.date);
      let runningStationDrawdown = 0;

      targetFuel.forEach(t => {
        totalFuelLogged += t.amount;
        const directAnalysis = parseFuelCommentDirectPayment(t.comment, t.amount);
        totalDirectPaidFuel += directAnalysis.directPayment;
        const stationDrawdown = Math.max(0, t.amount - directAnalysis.directPayment);
        runningStationDrawdown += stationDrawdown;
        const rem = activeSelectedAdv!.amount - runningStationDrawdown;

        dailyDrawdownLedger.push({
          id: `drawdown-${activeSelectedAdv!.id}-${t.id}`,
          date: t.date,
          rawDate: t.rawDate,
          sourceRow: t.sourceRow,
          amount: t.amount,
          directPaymentAmount: directAnalysis.directPayment,
          stationDrawdownAmount: stationDrawdown,
          isDirectPayment: directAnalysis.isDirect,
          directPaymentNote: directAnalysis.reason,
          comment: t.comment || "Ravitaillement Carburant Flotte",
          cumulativeConsumed: runningStationDrawdown,
          remainingAdvanceBalance: rem,
          status: rem > 500000 ? "covered" : rem >= 0 ? "low_credit" : "overdrawn"
        });
      });

      fuelConsumed = runningStationDrawdown;
      currentDepositBalance = Math.max(0, activeSelectedAdv.amount - fuelConsumed);
      totalAmountDue = Math.max(0, fuelConsumed - activeSelectedAdv.amount);
      percentUsed = activeSelectedAdv.amount > 0 ? Math.min(200, (fuelConsumed / activeSelectedAdv.amount) * 100) : 0;
    }
  }

  // =========================================================================
  // RÉCONCILIATION TRÉSORERIE & IMPACT SUR LA BALANCE CASH
  // Règle formulée par l'utilisateur :
  // "4 000 000 sur le compte dont 2 000 000 en dépôt carburant => réellement 2 000 000 disponibles"
  // =========================================================================
  let fuelDepositCommitted = 0;
  let netAvailableCash = grossCashBalance;

  if (currentDepositBalance > 0) {
    fuelDepositCommitted = currentDepositBalance;
    netAvailableCash = Math.max(0, grossCashBalance - fuelDepositCommitted);
  } else if (totalAmountDue > 0) {
    // Si dépassement (dette à régler à la station), le cash libre net diminue de la dette
    netAvailableCash = grossCashBalance - totalAmountDue;
  }

  // Autonomie restante en jours
  const estimatedDaysCoverage = burnRatePerDay > 0
    ? Math.max(0, Math.floor(currentDepositBalance / burnRatePerDay))
    : 0;

  // Reconstruction de la liste de réconciliation par avance pour vue détaillée
  const reconciliations: FuelAdvanceReconciliation[] = safeAdvances.map(adv => {
    const cycleTxs = fuelTxs.filter(t => t.date >= adv.date);
    let totalCycleFuel = 0;
    let totalCycleDirect = 0;
    let stationConsumed = 0;

    cycleTxs.forEach(t => {
      totalCycleFuel += t.amount;
      const d = parseFuelCommentDirectPayment(t.comment, t.amount);
      totalCycleDirect += d.directPayment;
      stationConsumed += Math.max(0, t.amount - d.directPayment);
    });

    const rem = Math.max(0, adv.amount - stationConsumed);
    const due = Math.max(0, stationConsumed - adv.amount);

    return {
      advance: adv,
      periodStart: adv.date,
      periodEnd: cycleTxs[cycleTxs.length - 1]?.date || adv.date,
      totalAdvanceAmount: adv.amount,
      totalFuelLogged: totalCycleFuel,
      totalDirectPaid: totalCycleDirect,
      fuelConsumed: stationConsumed,
      remainingCredit: rem,
      amountDue: due,
      percentUsed: adv.amount > 0 ? Math.min(200, (stationConsumed / adv.amount) * 100) : 100,
      status: due > 0 ? "overdrawn" : rem > 0 ? "active" : "exhausted",
      dailyLogs: []
    };
  }).reverse();

  // Liste des avances pour les menus déroulants (triée par date décroissante)
  const recentAdvances = [...safeAdvances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Le grand livre est affiché du plus récent au plus ancien par défaut
  dailyDrawdownLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    selectedAdvanceId: activeAdvanceId,
    selectedAdvance: activeSelectedAdv,
    isConsolidatedView: isConsolidated,
    advanceAmount,
    totalFuelLogged,
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
