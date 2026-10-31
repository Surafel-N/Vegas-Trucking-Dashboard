import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Clock, 
  X,
  ShieldCheck,
  Download,
  Info,
  Layers,
  ArrowDownRight,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Search
} from 'lucide-react';
import { WalletIcon } from './WalletIcon';
import { 
  FuelAdvance, 
  FuelCashSummary, 
  computeFuelReconciliation,
  RUNNING_ACCOUNT_ID
} from '../utils/fuelAdvanceTracker';
import { AccountingTransaction } from '../utils/accountingParser';
import { Language } from '../utils/i18n';
import {
  DEFAULT_MAX_INACTIVITY_DAYS,
  analyzeFuelBreakdownSequence,
  buildTripLookupKey,
  computeMonthlyFuelBreakdownStats,
  exportFuelBreakdownToExcel,
  exportFuelBreakdownToCSV,
  exportFuelBreakdownToPDF,
  resolveTripFuelCorridor,
  DiagnosticTripRecord
} from '../utils/fuelBreakdownDiagnostic';
import { INITIAL_TRIPS } from '../utils/tripsInitialData';

interface FuelAdvanceDashboardWidgetProps {
  advances: FuelAdvance[];
  transactions: AccountingTransaction[];
  trips?: any[];
  allTrips?: any[];
  rawCashBalance?: number;
  onAddAdvance?: (advance: FuelAdvance) => void;
  onSyncTrips?: () => void;
  isSyncingTrips?: boolean;
  formatCurrency?: (val: number, curr?: string) => string;
  currency?: string;
  t?: any;
  language?: Language;
  canEdit?: boolean;
}

export function FuelAdvanceDashboardWidget({
  advances,
  transactions,
  trips = [],
  allTrips = [],
  rawCashBalance,
  onAddAdvance,
  onSyncTrips,
  isSyncingTrips = false,
  formatCurrency,
  currency = "CFA",
  t,
  language = "FR",
  canEdit = true
}: FuelAdvanceDashboardWidgetProps) {
  const isEn = language === "EN";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedCorridor, setSelectedCorridor] = useState<"ALL" | "SAN_PEDRO" | "ABIDJAN">("ALL");

  // --- PARAMÉTRAGE DYNAMIQUE DE L'INACTIVITÉ & DIAGNOSTIC LECTURE SEULE ---
  const [maxInactivityDays, setMaxInactivityDays] = useState<number>(DEFAULT_MAX_INACTIVITY_DAYS);
  const [selectedDiagTruck, setSelectedDiagTruck] = useState<"ALL" | "AMARA" | "BRAHIMA" | "SORO">("ALL");
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);
  const [diagSearch, setDiagSearch] = useState<string>("");
  const [isDiagTableOpen, setIsDiagTableOpen] = useState<boolean>(true);

  // Sélection de l'avance suivie : par défaut le Compte Courant continu Shell San Pedro (Sept. – Oct. 2026)
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>(RUNNING_ACCOUNT_ID);

  // Formulaire d'ajout rapide d'avance
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState("4000000");
  const [formStation, setFormStation] = useState("Shell San Pedro");
  const [formNotes, setFormNotes] = useState("Paiement avance carburant station");

  // Formatage monétaire
  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "Non disponible";
    if (formatCurrency) return formatCurrency(val, currency);
    return `${Math.round(val).toLocaleString()} ${currency}`;
  };

  // Source globale des trajets (avec fallback initial certifié si localStorage vide avant 1er sync)
  const effectiveAllTrips = useMemo(() => {
    if (allTrips && allTrips.length > 0) return allTrips;
    if (trips && trips.length > 0) return trips;
    return INITIAL_TRIPS;
  }, [allTrips, trips]);

  const effectiveFilteredTrips = useMemo(() => {
    if (trips && trips.length > 0) return trips;
    return effectiveAllTrips;
  }, [trips, effectiveAllTrips]);

  // Calcul du résumé du décompte en fonction de l'avance sélectionnée (en séparant Abidjan et San Pedro)
  const summary: FuelCashSummary = useMemo(() => {
    return computeFuelReconciliation(advances, transactions, rawCashBalance, selectedAdvanceId, effectiveAllTrips);
  }, [advances, transactions, rawCashBalance, selectedAdvanceId, effectiveAllTrips]);

  // Calcul de la répartition du carburant pris à San Pedro vs pris pour Abidjan
  const corridorStats = useMemo(() => {
    const source = effectiveFilteredTrips;
    let sanPedroFuel = 0;
    let abidjanFuel = 0;
    let sanPedroTrips = 0;
    let abidjanTrips = 0;

    const byTruck = {
      AMARA: { sanPedro: 0, abidjan: 0, spCount: 0, abjCount: 0 },
      BRAHIMA: { sanPedro: 0, abidjan: 0, spCount: 0, abjCount: 0 },
      SORO: { sanPedro: 0, abidjan: 0, spCount: 0, abjCount: 0 }
    };

    (source || []).forEach((r: any) => {
      const fuelVal = Number(r.fuel_cost_cfa) || 0;
      if (fuelVal <= 0 && Number(r.tonnage || 0) <= 0) return;

      const isAbidjan = resolveTripFuelCorridor(r) === "ABIDJAN";

      const lbl = String(r.driverLabel || r.chauffeur || "").toUpperCase();
      let truckKey: "AMARA" | "BRAHIMA" | "SORO" | null = null;
      if (lbl.includes("AMARA") || lbl.includes("76")) truckKey = "AMARA";
      else if (lbl.includes("BRAHIMA") || lbl.includes("45")) truckKey = "BRAHIMA";
      else if (lbl.includes("SORO") || lbl.includes("SORRO") || lbl.includes("52")) truckKey = "SORO";

      if (isAbidjan) {
        abidjanFuel += fuelVal;
        if (fuelVal > 0) abidjanTrips += 1;
        if (truckKey) {
          byTruck[truckKey].abidjan += fuelVal;
          if (fuelVal > 0) byTruck[truckKey].abjCount += 1;
        }
      } else {
        sanPedroFuel += fuelVal;
        if (fuelVal > 0) sanPedroTrips += 1;
        if (truckKey) {
          byTruck[truckKey].sanPedro += fuelVal;
          if (fuelVal > 0) byTruck[truckKey].spCount += 1;
        }
      }
    });

    const totalFuel = sanPedroFuel + abidjanFuel;
    const spPercent = totalFuel > 0 ? Math.round((sanPedroFuel / totalFuel) * 100) : 0;
    const abjPercent = totalFuel > 0 ? Math.round((abidjanFuel / totalFuel) * 100) : 0;

    return {
      sanPedroFuel,
      abidjanFuel,
      totalFuel,
      sanPedroTrips,
      abidjanTrips,
      spPercent,
      abjPercent,
      byTruck
    };
  }, [effectiveFilteredTrips]);

  // --- ALGORITHME DE DÉTECTION DES ANOMALIES DE SÉQUENCE (LECTURE SEULE) ---
  // L'analyse chronologique est calculée sur l'historique complet de chaque camion,
  // puis filtrée selon la vue active de l'utilisateur.
  const diagnosticResult = useMemo(() => {
    return analyzeFuelBreakdownSequence(effectiveAllTrips, maxInactivityDays, isEn ? "EN" : "FR");
  }, [effectiveAllTrips, maxInactivityDays, isEn]);

  const displayedDiagnosticRows: DiagnosticTripRecord[] = useMemo(() => {
    const activeIds = new Set((effectiveFilteredTrips || []).map((r) => buildTripLookupKey(r)));
    const activeDateTruckSet = new Set(
      (effectiveFilteredTrips || []).map(
        (r) => `${r.date}-${String(r.driverLabel || r.chauffeur || "").toUpperCase().slice(0, 5)}`
      )
    );

    return diagnosticResult.records.filter((rec) => {
      // Respecter le filtre global du Dashboard (dates/mois/années/chauffeur)
      const matchesFilteredSet =
        activeIds.has(rec.id) ||
        activeDateTruckSet.has(`${rec.date}-${rec.truckKey.slice(0, 5)}`);
      if (!matchesFilteredSet) return false;

      // Filtre Corridor (Tous / San Pedro / Abidjan)
      if (selectedCorridor !== "ALL" && rec.corridor !== selectedCorridor) return false;

      // Filtre Camion local
      if (selectedDiagTruck !== "ALL" && rec.truckKey !== selectedDiagTruck) return false;

      // Filtre Anomalies uniquement
      if (onlyAnomalies && !rec.hasAnomaly) return false;

      // Recherche textuelle
      if (diagSearch.trim()) {
        const q = diagSearch.toLowerCase().trim();
        const hay = `${rec.truckLabel} ${rec.date} ${rec.start} ${rec.destination} ${rec.corridorLabel} ${rec.alertStatus} ${rec.sheetRow || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    diagnosticResult.records,
    effectiveFilteredTrips,
    selectedCorridor,
    selectedDiagTruck,
    onlyAnomalies,
    diagSearch
  ]);

  const totalAnomaliesInScope = useMemo(() => {
    const activeIds = new Set((effectiveFilteredTrips || []).map((r) => buildTripLookupKey(r)));
    const activeDateTruckSet = new Set(
      (effectiveFilteredTrips || []).map(
        (r) => `${r.date}-${String(r.driverLabel || r.chauffeur || "").toUpperCase().slice(0, 5)}`
      )
    );
    return diagnosticResult.anomalies.filter(
      (rec) =>
        (activeIds.has(rec.id) ||
          activeDateTruckSet.has(`${rec.date}-${rec.truckKey.slice(0, 5)}`)) &&
        (selectedCorridor === "ALL" || rec.corridor === selectedCorridor) &&
        (selectedDiagTruck === "ALL" || rec.truckKey === selectedDiagTruck)
    );
  }, [diagnosticResult.anomalies, effectiveFilteredTrips, selectedCorridor, selectedDiagTruck]);

  const monthlyBreakdownStats = useMemo(() => {
    return computeMonthlyFuelBreakdownStats(displayedDiagnosticRows, isEn ? "EN" : "FR");
  }, [displayedDiagnosticRows, isEn]);

  const isOverdrawn = summary.totalAmountDue > 0;

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAdvance) return;

    const amt = parseFloat(formAmount.replace(/\s/g, '')) || 0;
    if (amt <= 0) return;

    const newAdvId = `adv-manual-${Date.now()}`;
    const newAdv: FuelAdvance = {
      id: newAdvId,
      date: formDate,
      amount: amt,
      station: formStation.trim() || "Shell San Pedro",
      paymentMethod: "Virement Bancaire",
      notes: formNotes.trim(),
      source: "manual",
      status: "active"
    };

    onAddAdvance(newAdv);
    setSelectedAdvanceId(newAdvId);
    setIsAddFormOpen(false);
    setFormNotes("Paiement avance carburant station");
  };

  const handleExportCSV = () => {
    const headers = [
      isEn ? "Date" : "Date",
      isEn ? "Truck Refuel / Comment" : "Ravitaillement / Commentaire",
      isEn ? "Daily Fuel (CFA)" : "Gasoil du Jour (CFA)",
      isEn ? "Advance Balance (CFA)" : "Solde de l'Avance (CFA)",
      isEn ? "Status" : "Statut"
    ];

    const rows = summary.dailyDrawdownLedger.map(log => [
      `"${log.date}"`,
      `"${(log.comment || '').replace(/"/g, '""')}"`,
      log.amount,
      log.remainingAdvanceBalance,
      `"${log.status === 'covered' ? 'Couvert' : log.status === 'low_credit' ? 'Crédit Faible' : 'Dépassement / Reste à payer'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `decompte_${summary.selectedAdvanceId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl relative overflow-hidden group">
      {/* Halo d'ambiance d'arrière-plan */}
      <div className={`absolute top-0 right-0 w-80 h-80 ${isOverdrawn ? 'bg-red-500/5' : 'bg-amber-500/5'} rounded-full blur-3xl pointer-events-none transition-all`} />

      {/* EN-TÊTE DU WIDGET */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Fuel className="size-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                {t?.fuelAdvanceTitle || (isEn ? "Fuel Advances & Station Prepayments" : "Avances & Dépôts Carburant Station")}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                {summary.activeStation}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {t?.fuelAdvanceSubtitle || (isEn 
                ? "Live day-by-day drawdown of truck fuel against prepaid station advances"
                : "Décompte au jour le jour du carburant consommé face aux acomptes versés")}
            </p>
          </div>
        </div>

        {/* SÉLECTEUR D'AVANCE & ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur déroulant de l'avance à décompter */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-xs shadow-inner">
            <Layers className="size-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/50 whitespace-nowrap">
              {t?.selectAdvanceToTrack || (isEn ? "Advance:" : "Suivi :")}
            </span>
            <select
              value={summary.selectedAdvanceId}
              onChange={(e) => setSelectedAdvanceId(e.target.value)}
              className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value={RUNNING_ACCOUNT_ID} className="bg-[#1c1c1e] text-white">
                🔄 {isEn ? "Shell San Pedro Running Account (Sept.–Oct. 2026 — 12,502,750 CFA)" : "Compte Courant Shell San Pedro (Sept.–Oct. 2026 — 12 502 750 CFA)"}
              </option>
              {summary.recentAdvances.map(a => (
                <option key={a.id} value={a.id} className="bg-[#1c1c1e] text-white">
                  {a.amount.toLocaleString()} CFA — {a.station} ({a.date})
                </option>
              ))}
            </select>
          </div>

          {canEdit && onAddAdvance && (
            <button
              onClick={() => { setIsAddFormOpen(true); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>{isEn ? "+ New Advance" : "+ Nouvelle Avance"}</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <span>{t?.viewDetailedDrawdown || (isEn ? "View Drawdown" : "Voir Décompte")}</span>
            <ChevronRight className="size-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {/* GRILLE PRINCIPALE DU WIDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* CARTE 1 (GAUCHE) : SOLDE RESTANT DU DÉPÔT / AVANCE & AUTONOMIE */}
        <div className="lg:col-span-5 rounded-2xl bg-white/3 border border-white/5 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isOverdrawn 
                  ? (t?.amountDueStation || (isEn ? "Amount Due to Station" : "Reste à Régler à la Station"))
                  : (t?.fuelDepositBalance || (isEn ? "Remaining Fuel Deposit" : "Solde Dépôt Carburant Restant"))}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOverdrawn
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isOverdrawn 
                  ? (isEn ? "Overdrawn / Due" : "Dépassement / À régler")
                  : (isEn ? "Prepaid Credit Active" : "Crédit Disponible en Station")}
              </span>
            </div>

            <div className="mt-3">
              <p className={`text-2xl sm:text-3xl font-black tracking-tight ${isOverdrawn ? 'text-red-400' : 'text-emerald-400'}`}>
                {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : `+${formatMoney(summary.currentDepositBalance)}`}
              </p>
            </div>

            {/* BARRE DE PROGRESSION DU DÉCOMPTE */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>
                  {t?.drawdownProgress || (isEn ? "Station drawdown:" : "Décompte station :")}{" "}
                  <strong className="text-white">{formatMoney(summary.fuelConsumed)}</strong> / {formatMoney(summary.advanceAmount)}
                </span>
                <span className="font-bold text-white">{Math.round(summary.percentUsed)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    summary.percentUsed >= 100 ? 'bg-red-500' : summary.percentUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
                />
              </div>
              {summary.totalAbidjanFuelExcluded > 0 && (
                <div className="flex items-center justify-between text-[10px] text-orange-400/95 pt-0.5">
                  <span className="flex items-center gap-1">
                    <span>🚫</span> {isEn ? "Abidjan fuel (excluded from Shell):" : "Carburant Abidjan (non déduit Shell) :"}
                  </span>
                  <span className="font-bold">-{formatMoney(summary.totalAbidjanFuelExcluded)} (exclu)</span>
                </div>
              )}
              {summary.totalDirectPaidFuel > 0 && (
                <div className="flex items-center justify-between text-[10px] text-emerald-400/90 pt-0.5">
                  <span className="flex items-center gap-1">
                    <span>⛽</span> {isEn ? "Direct payments outside station:" : "Payé directement hors station :"}
                  </span>
                  <span className="font-bold">-{formatMoney(summary.totalDirectPaidFuel)} (exclu)</span>
                </div>
              )}
            </div>
          </div>

          {/* INDICATEUR D'AUTONOMIE */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-white/50">
              <Clock className="size-3.5 text-amber-400" />
              <span>{t?.daysOfFuelReserve || (isEn ? "Estimated fuel coverage:" : "Autonomie carburant estimée :")}</span>
            </div>
            <span className="font-black text-amber-300">
              {summary.estimatedDaysCoverage} {isEn ? "days of operations" : "jours d'activité"}
            </span>
          </div>
        </div>

        {/* CARTE 2 (DROITE) : RÉCONCILIATION CASH BALANCE (DEMANDE SPÉCIFIQUE UTILISATEUR) */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-white/4 via-white/2 to-transparent border border-white/8 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <WalletIcon className="size-4 text-[#00F2FF]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white/70">
                  {isEn ? "Cash Balance Breakdown & Real Free Liquidity" : "Réconciliation Balance Cash & Trésorerie"}
                </span>
              </div>
              <span className="text-[10px] text-white/40 italic flex items-center gap-1">
                <Info className="size-3" /> {isEn ? "Prepayment Impact" : "Impact des Dépôts"}
              </span>
            </div>

            {/* GRILLE DES 3 NIVEAUX DE TRÉSORERIE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* NIVEAU 1 : SOLDE EN COMPTE (BRUT) */}
              <div className="rounded-xl bg-white/3 border border-white/5 p-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {isEn ? "1. Bank / Cash" : "1. Solde en Compte"}
                </p>
                <p className="text-base font-black text-white mt-1">
                  {formatMoney(summary.grossCashBalance)}
                </p>
                <p className="text-[9px] text-white/30 mt-0.5">
                  {isEn ? "Gross ledger balance" : "Solde brut en compte"}
                </p>
              </div>

              {/* NIVEAU 2 : DÉPÔT CARBURANT IMMOBILISÉ OU DETTE STATION */}
              <div className={`rounded-xl ${isOverdrawn ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'} border p-3`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isOverdrawn ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdrawn 
                    ? (isEn ? "2. Station Due" : "2. Dette Station")
                    : (isEn ? "2. Fuel Deposit" : "2. Dépôt Carburant")}
                </p>
                <p className={`text-base font-black mt-1 ${isOverdrawn ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : formatMoney(summary.fuelDepositCommitted)}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {isOverdrawn ? (isEn ? "To pay to station" : "Reste à régler") : (isEn ? "Blocked in station" : "Immobilisé station")}
                </p>
              </div>

              {/* NIVEAU 3 : CASH RÉELLEMENT DISPONIBLE (NET) */}
              <div className="rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/25 p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-[#00F2FF]/10 rounded-full blur-xl pointer-events-none" />
                <p className="text-[10px] font-bold text-[#00F2FF] uppercase tracking-wider">
                  {isEn ? "3. Real Free Cash" : "3. Cash Libre Réel"}
                </p>
                <p className="text-base font-black text-[#00F2FF] mt-1">
                  {formatMoney(summary.netAvailableCash)}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {isEn ? "Truly spendable" : "Réellement disponible"}
                </p>
              </div>
            </div>
          </div>

          {/* BANDEAU PÉDAGOGIQUE EXPLICATIF DE TRÉSORERIE */}
          <div className="mt-3 p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <p className="leading-tight text-[11px]">
              {isEn ? (
                <>
                  <strong className="text-white">Treasury Reality:</strong> You have {formatMoney(summary.grossCashBalance)} on account, but actually{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> spendable free cash because{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> is reserved at the fuel station.
                </>
              ) : (
                <>
                  <strong className="text-white">Réalité de Trésorerie :</strong> Vous avez {formatMoney(summary.grossCashBalance)} sur le compte, mais réellement{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> de cash disponible car{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> sont en dépôt chez {summary.activeStation}.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPTION : MONTANT DU CARBURANT PRIS À SAN PEDRO VS PRIS POUR ABIDJAN      */}
      {/* + OUTIL DE DIAGNOSTIC DES SÉQUENCES & INACTIVITÉ (LECTURE SEULE)          */}
      {/* ========================================================================= */}
      <div className="mt-5 relative z-10 rounded-2xl bg-black/35 border border-white/10 p-4 sm:p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <Fuel className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  {isEn ? "Fuel Breakdown San Pedro versus Abidjan" : "Fuel Breakdown San Pedro versus Abidjan"}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-white/70">
                  {formatMoney(corridorStats.totalFuel)}
                </span>
                {totalAnomaliesInScope.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                    <AlertTriangle className="size-3" />
                    {totalAnomaliesInScope.length} {isEn ? "sequence anomalies" : "incohérence(s) détectée(s)"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="size-3" />
                    {isEn ? "Sequences valid" : "Séquences conformes"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 mt-0.5">
                {isEn
                  ? "Read-only sequence diagnostic & fuel breakdown (San Pedro vs Abidjan) extracted from Google Spreadsheet"
                  : "Répartition du carburant (San Pedro vs Abidjan) & diagnostic en lecture seule des séquences de trajets depuis le Spreadsheet"}
              </p>
            </div>
          </div>

          {/* SÉLECTEUR D'OPTION : TOUS / SAN PEDRO / ABIDJAN */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedCorridor("ALL")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  selectedCorridor === "ALL"
                    ? "bg-white text-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {isEn ? "Both Options" : "Vue Comparée"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCorridor("SAN_PEDRO")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCorridor === "SAN_PEDRO"
                    ? "bg-teal-500 text-black shadow-sm"
                    : "text-teal-300/70 hover:text-teal-300 hover:bg-teal-500/10"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {isEn ? "San Pedro Fuel" : "Carburant San Pedro"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCorridor("ABIDJAN")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCorridor === "ABIDJAN"
                    ? "bg-orange-500 text-black shadow-sm"
                    : "text-orange-300/70 hover:text-orange-300 hover:bg-orange-500/10"
                }`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {isEn ? "Abidjan Fuel" : "Carburant Abidjan"}
              </button>
            </div>

            {onSyncTrips && (
              <button
                type="button"
                onClick={onSyncTrips}
                disabled={isSyncingTrips}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                title={isEn ? "Reload data from Google Spreadsheet after manual fixes" : "Recharger les données depuis le Google Spreadsheet après vos corrections manuelles"}
              >
                <RefreshCw className={`size-3.5 ${isSyncingTrips ? "animate-spin" : ""}`} />
                <span>{isSyncingTrips ? (isEn ? "Syncing..." : "Sync...") : (isEn ? "Sync Spreadsheet" : "Rafraîchir Spreadsheet")}</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRE DE PROPORTION VISUELLE */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <span className="text-teal-400">
              ⛽ {isEn ? "Taken at San Pedro" : "Carburant pris à San Pedro"} ({corridorStats.spPercent}%)
            </span>
            <span className="text-orange-400">
              ⛽ {isEn ? "Taken for Abidjan" : "Carburant pris pour Abidjan"} ({corridorStats.abjPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-l-full transition-all duration-500"
              style={{ width: `${corridorStats.spPercent}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-r-full transition-all duration-500"
              style={{ width: `${corridorStats.abjPercent}%` }}
            />
          </div>
        </div>

        {/* CARTES DE DÉTAIL SAN PEDRO & ABIDJAN */}
        <div className={`grid grid-cols-1 ${selectedCorridor === "ALL" ? "md:grid-cols-2" : ""} gap-4`}>
          {(selectedCorridor === "ALL" || selectedCorridor === "SAN_PEDRO") && (
            <div className="rounded-xl bg-teal-500/[0.07] border border-teal-500/25 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    ⛽ {isEn ? "San Pedro Corridor" : "Pris à San Pedro"}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 tabular-nums">
                    {formatMoney(corridorStats.sanPedroFuel)}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {corridorStats.sanPedroTrips} {isEn ? "refuels logged (Lauzoua ↔ San Pedro)" : "prises de carburant enregistrées (Axe San Pedro)"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-teal-400 tabular-nums">{corridorStats.spPercent}%</span>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">
                    {isEn ? "of total fuel" : "du budget gasoil"}
                  </p>
                </div>
              </div>

              {/* Détail par camion pour San Pedro */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-teal-500/15">
                {(["AMARA", "BRAHIMA", "SORO"] as const).map((truck) => (
                  <div key={truck} className="bg-black/30 rounded-lg p-2 border border-white/5">
                    <p className="text-[9px] font-bold text-white/50 uppercase">{truck}</p>
                    <p className="text-xs font-black text-teal-300 mt-0.5 tabular-nums">
                      {formatMoney(corridorStats.byTruck[truck].sanPedro)}
                    </p>
                    <p className="text-[9px] text-white/35 mt-0.5">
                      {corridorStats.byTruck[truck].spCount} {isEn ? "trips" : "voyages"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedCorridor === "ALL" || selectedCorridor === "ABIDJAN") && (
            <div className="rounded-xl bg-orange-500/[0.07] border border-orange-500/25 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    ⛽ {isEn ? "Abidjan Corridor" : "Pris pour Abidjan"}
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2 tabular-nums">
                    {formatMoney(corridorStats.abidjanFuel)}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {corridorStats.abidjanTrips} {isEn ? "refuels logged (Lauzoua ↔ Abidjan)" : "prises de carburant enregistrées (Axe Abidjan)"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-orange-400 tabular-nums">{corridorStats.abjPercent}%</span>
                  <p className="text-[9px] text-white/40 uppercase tracking-wider">
                    {isEn ? "of total fuel" : "du budget gasoil"}
                  </p>
                </div>
              </div>

              {/* Détail par camion pour Abidjan */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-orange-500/15">
                {(["AMARA", "BRAHIMA", "SORO"] as const).map((truck) => (
                  <div key={truck} className="bg-black/30 rounded-lg p-2 border border-white/5">
                    <p className="text-[9px] font-bold text-white/50 uppercase">{truck}</p>
                    <p className="text-xs font-black text-orange-300 mt-0.5 tabular-nums">
                      {formatMoney(corridorStats.byTruck[truck].abidjan)}
                    </p>
                    <p className="text-[9px] text-white/35 mt-0.5">
                      {corridorStats.byTruck[truck].abjCount} {isEn ? "trips" : "voyages"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* BARRE DE CONTRÔLE DU DIAGNOSTIC : DÉLAI D'INACTIVITÉ MAX & EXPORTS    */}
        {/* ===================================================================== */}
        <div className="rounded-2xl bg-[#141416] border border-white/10 p-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-white/10">
            {/* 1. CHAMP DE SAISIE NUMÉRIQUE : DÉLAI D'INACTIVITÉ MAX. (JOURS) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 shadow-inner">
                <Clock className="size-4 text-amber-400 shrink-0" />
                <label
                  htmlFor="max-inactivity-days-input"
                  className="text-xs font-black text-white whitespace-nowrap"
                >
                  {isEn ? "Max. inactivity threshold (days)" : "Délai d'inactivité max. (jours)"} :
                </label>
                <input
                  id="max-inactivity-days-input"
                  type="number"
                  min={1}
                  max={365}
                  value={maxInactivityDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMaxInactivityDays(Number.isFinite(val) && val >= 1 ? val : 1);
                  }}
                  className="w-16 px-2 py-1 rounded-lg bg-black/70 border border-amber-500/40 text-amber-300 font-black text-xs text-center focus:outline-none focus:border-amber-400 tabular-nums"
                />
                {maxInactivityDays !== DEFAULT_MAX_INACTIVITY_DAYS && (
                  <button
                    type="button"
                    onClick={() => setMaxInactivityDays(DEFAULT_MAX_INACTIVITY_DAYS)}
                    className="text-[10px] font-bold text-white/50 hover:text-white underline cursor-pointer"
                  >
                    {isEn ? "Reset (21d)" : "Défaut (21j)"}
                  </button>
                )}
              </div>

              {/* Filtres rapides : Tous vs Anomalies + Camion + Recherche */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setOnlyAnomalies(false)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    !onlyAnomalies
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {isEn ? `All Trips (${displayedDiagnosticRows.length})` : `Tous les trajets (${ !onlyAnomalies ? displayedDiagnosticRows.length : diagnosticResult.records.length })`}
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyAnomalies(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    onlyAnomalies
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-red-400 hover:bg-red-500/15"
                  }`}
                >
                  <AlertTriangle className="size-3" />
                  <span>
                    {isEn
                      ? `Anomalies Only (${totalAnomaliesInScope.length})`
                      : `Anomalies (${totalAnomaliesInScope.length})`}
                  </span>
                </button>
              </div>

              <select
                value={selectedDiagTruck}
                onChange={(e) => setSelectedDiagTruck(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-teal-400 cursor-pointer"
              >
                <option value="ALL" className="bg-[#1c1c1e]">{isEn ? "All Trucks (3)" : "Tous les camions (3)"}</option>
                <option value="AMARA" className="bg-[#1c1c1e]">AMARA TRUCK 76</option>
                <option value="BRAHIMA" className="bg-[#1c1c1e]">BRAHIMA TRUCK 45</option>
                <option value="SORO" className="bg-[#1c1c1e]">SORO TRUCK 52</option>
              </select>

              <div className="relative">
                <Search className="size-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  placeholder={isEn ? "Filter date, start, row..." : "Filtrer date, départ, ligne..."}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-teal-400 w-44"
                />
              </div>
            </div>

            {/* 3. BOUTONS D'EXPORTATION : EXCEL (.XLSX), CSV (.CSV), PDF (.PDF) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportFuelBreakdownToExcel(
                    displayedDiagnosticRows,
                    maxInactivityDays,
                    isEn ? "EN" : "FR"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-black transition-all cursor-pointer active:scale-95"
                title={isEn ? "Download table as Excel (.xlsx) with Alert/Status column" : "Télécharger le tableau sous format Excel (.xlsx) avec colonne Alerte/Statut"}
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportFuelBreakdownToCSV(
                    displayedDiagnosticRows,
                    maxInactivityDays,
                    isEn ? "EN" : "FR"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                title={isEn ? "Download table as CSV (.csv) with Alert/Status column" : "Télécharger le tableau sous format CSV (.csv) avec colonne Alerte/Statut"}
              >
                <Download className="size-3.5" />
                <span>CSV (.csv)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportFuelBreakdownToPDF(
                    displayedDiagnosticRows,
                    maxInactivityDays,
                    {
                      sanPedroFuel: corridorStats.sanPedroFuel,
                      abidjanFuel: corridorStats.abidjanFuel,
                      totalFuel: corridorStats.totalFuel,
                      anomalyCount: displayedDiagnosticRows.filter((r) => r.hasAnomaly).length
                    },
                    isEn ? "EN" : "FR"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-black transition-all cursor-pointer active:scale-95"
                title={isEn ? "Download table as PDF (.pdf) with highlighted anomalies" : "Télécharger le tableau sous format PDF (.pdf) avec anomalies en surbrillance"}
              >
                <FileText className="size-3.5" />
                <span>PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDiagTableOpen(!isDiagTableOpen)}
                className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
              >
                {isDiagTableOpen ? (isEn ? "Hide Table" : "Masquer Tableau") : (isEn ? "Show Table" : "Afficher Tableau")}
              </button>
            </div>
          </div>

          {/* BANNIÈRE D'EXPLICATION RÈGLE MÉTIER & LECTURE SEULE */}
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
            totalAnomaliesInScope.length > 0
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
          }`}>
            <div className="flex items-start sm:items-center gap-2.5">
              {totalAnomaliesInScope.length > 0 ? (
                <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <p className="text-[11px] leading-relaxed">
                {isEn ? (
                  <>
                    <strong>Read-Only Diagnostic Rule:</strong> Base of operations is <strong>Abidjan</strong>. After any total inactivity exceeding{" "}
                    <strong>{maxInactivityDays} days</strong> (no refuel, no trip), the next trip's departure point must be <strong>"Abidjan"</strong>.{" "}
                    {totalAnomaliesInScope.length > 0 && (
                      <span className="text-red-300 font-bold">
                        ({totalAnomaliesInScope.length} record(s) flagged — fix them directly in your Google Spreadsheet then click "Sync Spreadsheet").
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Règle Métier (Diagnostic en Lecture Seule) :</strong> Après une absence totale d'activité (aucun plein, aucun trajet) supérieure à{" "}
                    <strong>{maxInactivityDays} jours</strong>, le point de départ du trajet suivant doit obligatoirement être <strong>« Abidjan »</strong>.{" "}
                    {totalAnomaliesInScope.length > 0 && (
                      <span className="text-red-300 font-bold">
                        ({totalAnomaliesInScope.length} ligne(s) suspecte(s) détectée(s) — corrigez-les dans votre Google Spreadsheet source puis cliquez sur « Rafraîchir Spreadsheet »).
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-white/60 shrink-0 self-start sm:self-center">
              {isEn ? "Strictly Read-Only" : "Strictement Lecture Seule"}
            </span>
          </div>

          {/* 2A. TABLEAU DE SYNTHÈSE MENSUELLE (CODES COULEURS PAR COLONNE, SANS RÉPÉTITION) */}
          {monthlyBreakdownStats.length > 0 && (
            <div className="rounded-xl border border-white/15 bg-black/50 overflow-hidden shadow-lg">
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  {isEn
                    ? "Monthly Fuel Summary (By Column Color Code)"
                    : "Synthèse Mensuelle Carburant (Lecture par Code Couleur)"}
                </span>
                <span className="text-[11px] font-mono text-white/60">
                  {monthlyBreakdownStats.length} {isEn ? "month(s)" : "mois"}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[240px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider">
                    <tr className="border-b border-white/15">
                      <th className="py-3 px-4 bg-blue-950/90 text-blue-200 border-r border-white/10">
                        {isEn ? "Month" : "Mois"}
                      </th>
                      <th className="py-3 px-4 bg-amber-950/90 text-amber-200 text-right border-r border-white/10">
                        {isEn ? "Total Fuel" : "Total"}
                      </th>
                      <th className="py-3 px-4 bg-violet-950/90 text-violet-200 text-center border-r border-white/10">
                        {isEn ? "Total Refuels" : "Total prise"}
                      </th>
                      <th className="py-3 px-4 bg-emerald-950/90 text-emerald-200 text-right border-r border-white/10">
                        {isEn ? "Highest Refuel" : "Montant supérieur prise"}
                      </th>
                      <th className="py-3 px-4 bg-sky-950/90 text-sky-200 text-right border-r border-white/10">
                        {isEn ? "Lowest Refuel" : "Montant inférieur"}
                      </th>
                      <th className="py-3 px-4 bg-teal-950/90 text-teal-200 text-right border-r border-white/10">
                        {isEn ? "San Pedro" : "San Pedro"}
                      </th>
                      <th className="py-3 px-4 bg-orange-950/90 text-orange-200 text-right">
                        {isEn ? "Abidjan" : "Abidjan"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {monthlyBreakdownStats.map((m) => (
                      <tr key={m.monthKey} className="hover:brightness-110 transition-all">
                        <td className="py-3 px-4 bg-blue-500/10 text-blue-200 font-black whitespace-nowrap border-r border-white/5">
                          {m.monthLabel}
                        </td>
                        <td className="py-3 px-4 bg-amber-500/10 text-amber-300 font-mono font-black text-right whitespace-nowrap tabular-nums border-r border-white/5">
                          {formatMoney(m.totalFuelCfa)}
                        </td>
                        <td className="py-3 px-4 bg-violet-500/10 text-violet-200 font-mono font-black text-center whitespace-nowrap border-r border-white/5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-violet-500/25 border border-violet-400/30 text-violet-200 text-xs">
                            {m.refuelCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-emerald-500/10 text-emerald-300 font-mono font-black text-right whitespace-nowrap tabular-nums border-r border-white/5">
                          {formatMoney(m.maxRefuelCfa)}
                        </td>
                        <td className="py-3 px-4 bg-sky-500/10 text-sky-300 font-mono font-black text-right whitespace-nowrap tabular-nums border-r border-white/5">
                          {formatMoney(m.minRefuelCfa)}
                        </td>
                        <td className="py-3 px-4 bg-teal-500/10 text-teal-300 font-mono font-bold text-right whitespace-nowrap tabular-nums border-r border-white/5">
                          {formatMoney(m.sanPedroFuelCfa)}
                        </td>
                        <td className="py-3 px-4 bg-orange-500/10 text-orange-300 font-mono font-bold text-right whitespace-nowrap tabular-nums">
                          {formatMoney(m.abidjanFuelCfa)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2B. TABLEAU DÉTAILLÉ DES SÉQUENCES DE TRAJETS (COLONNES COLORÉES & AÉRÉES) */}
          {isDiagTableOpen && (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar rounded-xl border border-white/15 bg-black/50 shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider border-b border-white/15">
                  <tr>
                    <th className="py-3 px-3 bg-slate-900 text-slate-300 text-center border-r border-white/10">
                      {isEn ? "Row" : "Ligne"}
                    </th>
                    <th className="py-3 px-3.5 bg-blue-950 text-blue-200 border-r border-white/10">
                      {isEn ? "Date" : "Date"}
                    </th>
                    <th className="py-3 px-3.5 bg-slate-900 text-white border-r border-white/10">
                      {isEn ? "Truck" : "Camion"}
                    </th>
                    <th className="py-3 px-3.5 bg-slate-900 text-slate-200 border-r border-white/10">
                      {isEn ? "Departure" : "Départ"}
                    </th>
                    <th className="py-3 px-3.5 bg-slate-900 text-slate-200 border-r border-white/10">
                      {isEn ? "Destination" : "Destination"}
                    </th>
                    <th className="py-3 px-3.5 bg-teal-950 text-teal-200 text-center border-r border-white/10">
                      {isEn ? "Corridor" : "Corridor"}
                    </th>
                    <th className="py-3 px-3.5 bg-amber-950 text-amber-200 text-right border-r border-white/10">
                      {isEn ? "Fuel (CFA)" : "Carburant (CFA)"}
                    </th>
                    <th className="py-3 px-3 bg-sky-950 text-sky-200 text-right border-r border-white/10">
                      {isEn ? "Tonnage" : "Tonnage"}
                    </th>
                    <th className="py-3 px-3 bg-violet-950 text-violet-200 text-center border-r border-white/10">
                      {isEn ? "Inactivity" : "Inactivité"}
                    </th>
                    <th className="py-3 px-3.5 bg-emerald-950 text-emerald-200 text-center">
                      {isEn ? "Status / Alert" : "Statut / Alerte"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {displayedDiagnosticRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-white/40 italic">
                        {onlyAnomalies
                          ? isEn
                            ? `No sequence anomalies detected for a threshold of ${maxInactivityDays} days.`
                            : `Aucune incohérence de séquence détectée pour un délai d'inactivité max. de ${maxInactivityDays} jours.`
                          : isEn
                          ? "No trips match the current filters."
                          : "Aucun trajet ne correspond aux filtres sélectionnés."}
                      </td>
                    </tr>
                  ) : (
                    monthlyBreakdownStats.map((monthGroup) => (
                      <React.Fragment key={monthGroup.monthKey}>
                        {/* BANDEAU DE SÉPARATION DU MOIS AÉRÉ */}
                        <tr className="bg-slate-900/95 border-y border-white/20">
                          <td colSpan={10} className="py-2.5 px-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <span className="font-black text-blue-300 uppercase tracking-wide">
                                📅 {monthGroup.monthLabel}
                              </span>
                              <span className="text-white/25">•</span>
                              <span className="text-amber-300 font-bold">
                                Total : <strong className="font-mono">{formatMoney(monthGroup.totalFuelCfa)}</strong>
                              </span>
                              <span className="text-white/25">•</span>
                              <span className="text-violet-300 font-bold">
                                {isEn ? "Total refuels :" : "Total prise :"}{" "}
                                <strong className="font-mono">{monthGroup.refuelCount}</strong>
                              </span>
                              <span className="text-white/25">•</span>
                              <span className="text-emerald-300 font-bold">
                                {isEn ? "Highest :" : "Montant supérieur prise :"}{" "}
                                <strong className="font-mono">{formatMoney(monthGroup.maxRefuelCfa)}</strong>
                              </span>
                              <span className="text-white/25">•</span>
                              <span className="text-sky-300 font-bold">
                                {isEn ? "Lowest :" : "Montant inférieur :"}{" "}
                                <strong className="font-mono">{formatMoney(monthGroup.minRefuelCfa)}</strong>
                              </span>
                            </div>
                          </td>
                        </tr>
                        {monthGroup.records.map((row) => {
                          const truckBadgeClass =
                            row.truckKey === "AMARA"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              : row.truckKey === "BRAHIMA"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/30";

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                row.hasAnomaly
                                  ? "bg-red-500/20 hover:bg-red-500/30 border-l-4 border-l-red-500"
                                  : "hover:bg-white/[0.04]"
                              }`}
                            >
                              {/* Colonne 1 : Ligne Sheet (Ardoise) */}
                              <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400 bg-slate-500/5 border-r border-white/5 whitespace-nowrap">
                                {row.sheetRow ? `#${row.sheetRow}` : "—"}
                              </td>

                              {/* Colonne 2 : Date (Bleu) */}
                              <td className="py-3 px-3.5 font-mono font-bold text-[11px] text-blue-200 bg-blue-500/5 border-r border-white/5 whitespace-nowrap">
                                {row.displayDate}
                              </td>

                              {/* Colonne 3 : Camion (Badge couleur dédié par camion) */}
                              <td className="py-3 px-3.5 border-r border-white/5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-black ${truckBadgeClass}`}
                                >
                                  {row.shortTruckLabel}
                                </span>
                              </td>

                              {/* Colonne 4 : Départ */}
                              <td
                                className={`py-3 px-3.5 font-bold whitespace-nowrap border-r border-white/5 ${
                                  row.hasAnomaly
                                    ? "text-red-300 underline decoration-red-400"
                                    : "text-white/90"
                                }`}
                              >
                                {row.start}
                              </td>

                              {/* Colonne 5 : Destination */}
                              <td className="py-3 px-3.5 text-white/80 whitespace-nowrap border-r border-white/5">
                                {row.destination}
                              </td>

                              {/* Colonne 6 : Corridor (Turquoise San Pedro / Orange Abidjan) */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap border-r border-white/5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    row.corridor === "ABIDJAN"
                                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                      : "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                  }`}
                                >
                                  {row.corridorLabel}
                                </span>
                              </td>

                              {/* Colonne 7 : Carburant CFA (Ambre / Or) */}
                              <td className="py-3 px-3.5 text-right font-mono font-black text-amber-300 bg-amber-500/5 whitespace-nowrap tabular-nums border-r border-white/5">
                                {row.fuelCostCfa > 0 ? formatMoney(row.fuelCostCfa) : <span className="text-white/25">—</span>}
                              </td>

                              {/* Colonne 8 : Tonnage (Bleu Ciel / Cyan) */}
                              <td className="py-3 px-3 text-right font-mono font-bold text-sky-300 bg-sky-500/5 whitespace-nowrap tabular-nums border-r border-white/5">
                                {row.tonnage > 0 ? `${row.tonnage} T` : <span className="text-white/25">—</span>}
                              </td>

                              {/* Colonne 9 : Inactivité (Violet / Rouge) */}
                              <td className="py-3 px-3 text-center whitespace-nowrap bg-violet-500/5 border-r border-white/5">
                                {row.inactivityDays > 1 ? (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      row.inactivityDays > maxInactivityDays
                                        ? "bg-red-500/30 text-red-200 border border-red-500/50"
                                        : "bg-violet-500/20 text-violet-200 border border-violet-500/30"
                                    }`}
                                    title={
                                      row.previousActiveDate
                                        ? `Dernière activité : ${row.previousActiveDate}`
                                        : undefined
                                    }
                                  >
                                    {row.inactivityDays} j
                                  </span>
                                ) : (
                                  <span className="text-white/25">—</span>
                                )}
                              </td>

                              {/* Colonne 10 : Statut / Alerte (Vert OK / Rouge Anomalie) */}
                              <td className="py-3 px-3.5 text-center">
                                {row.hasAnomaly ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/25 border border-red-500/50 text-red-200 font-black text-[11px] text-left">
                                    <AlertTriangle className="size-3.5 text-red-400 shrink-0" />
                                    <span>{row.alertStatus}</span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-black text-[10px]">
                                    <CheckCircle2 className="size-3" />
                                    <span>OK</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DU GRAND LIVRE DE DÉCOMPTE & GESTION DES AVANCES                    */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161618] border border-white/10 rounded-[32px] p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
            {/* EN-TÊTE MODAL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Fuel className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isEn ? "Detailed Fuel Drawdown Ledger" : "Grand Livre du Décompte Journalier"}
                  </h3>
                  <p className="text-xs text-white/50">
                    {summary.activeStation} • {summary.dailyDrawdownLedger.length} {isEn ? "daily refuels logged" : "ravitaillements décomptés"}
                  </p>
                </div>
              </div>

              {/* SÉLECTEUR DIRECT DANS LE MODAL */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
                  <select
                    value={summary.selectedAdvanceId}
                    onChange={(e) => setSelectedAdvanceId(e.target.value)}
                    className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={RUNNING_ACCOUNT_ID} className="bg-[#1c1c1e] text-white">
                      🔄 {isEn ? "Running Account (Sept.–Oct. 12.5M)" : "Compte Courant (Sept.–Oct. 12,5M)"}
                    </option>
                    {summary.recentAdvances.map(a => (
                      <option key={a.id} value={a.id} className="bg-[#1c1c1e] text-white">
                        {a.amount.toLocaleString()} CFA — {a.station} ({a.date})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                  title={isEn ? "Export Drawdown CSV" : "Exporter le décompte en CSV"}
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">{isEn ? "CSV" : "CSV"}</span>
                </button>

                {canEdit && onAddAdvance && !isAddFormOpen && (
                  <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all"
                  >
                    <Plus className="size-3.5" />
                    <span>{isEn ? "+ Add" : "+ Ajouter"}</span>
                  </button>
                )}

                <button
                  onClick={() => { setIsModalOpen(false); setIsAddFormOpen(false); }}
                  className="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* FORMULAIRE RAPIDE D'AJOUT D'AVANCE */}
            {isAddFormOpen && (
              <form onSubmit={handleCreateAdvance} className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Plus className="size-3.5" />
                    {isEn ? "Record New Fuel Advance Prepayment" : "Enregistrer un Nouveau Versement Avance Station"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="text-xs text-white/40 hover:text-white"
                  >
                    {isEn ? "Cancel" : "Annuler"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Date" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Amount (CFA)" : "Montant (CFA)"}
                    </label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="Ex: 4000000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Station" : "Station-Service"}
                    </label>
                    <input
                      type="text"
                      value={formStation}
                      onChange={(e) => setFormStation(e.target.value)}
                      placeholder="Ex: Shell San Pedro"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Reference / Note" : "Libellé / Note"}
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ex: Virement 4M San Pedro"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    {isEn ? "Save Fuel Advance" : "Enregistrer l'Avance"}
                  </button>
                </div>
              </form>
            )}

            {/* BANDEAU SYNTHÈSE DU DÉCOMPTE SÉLECTIONNÉ */}
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Advance Amount" : "Montant Avance"}</p>
                <p className="text-base sm:text-lg font-black text-amber-400">{formatMoney(summary.advanceAmount)}</p>
                <p className="text-[9px] text-white/30">{summary.activeStation}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Total Fleet Fuel" : "Gasoil Brut Flotte"}</p>
                <p className="text-base sm:text-lg font-black text-white">{formatMoney(summary.totalFuelLogged)}</p>
                <p className="text-[9px] text-white/30">{isEn ? "San Pedro + Abidjan" : "San Pedro + Abidjan"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase">{isEn ? "Abidjan Fuel (Excl.)" : "Carburant Abidjan (Exclu)"}</p>
                <p className="text-base sm:text-lg font-black text-orange-400">-{formatMoney(summary.totalAbidjanFuelExcluded)}</p>
                <p className="text-[9px] text-orange-400/60">{isEn ? "Not deducted from Shell" : "Non déduit de Shell"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">{isEn ? "Paid Directly (Excl.)" : "Payé Direct Hors Shell"}</p>
                <p className="text-base sm:text-lg font-black text-emerald-400">-{formatMoney(summary.totalDirectPaidFuel)}</p>
                <p className="text-[9px] text-emerald-400/60">{isEn ? "Excluded from station" : "Exclu de l'avance Shell"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">
                  {isOverdrawn ? (isEn ? "Remaining Due" : "Reste à Régler") : (isEn ? "Available Balance" : "Solde Dépôt Restant")}
                </p>
                <p className={`text-base sm:text-lg font-black ${isOverdrawn ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : `+${formatMoney(summary.currentDepositBalance)}`}
                </p>
                <p className="text-[9px] text-white/40">
                  {isEn ? "Deducted:" : "Décompté :"} {formatMoney(summary.fuelConsumed)}
                </p>
              </div>
            </div>

            {/* TABLEAU EXACT DU DÉCOMPTE JOUR PAR JOUR */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#161618] z-10">
                    <tr className="border-b border-white/8 text-white/40 text-[10px] uppercase font-black">
                      <th className="py-2.5 px-3">{isEn ? "Date" : "Date"}</th>
                      <th className="py-2.5 px-3">{isEn ? "Refuel Description / Analysis (Cols M & N)" : "Ravitaillement Flotte / Analyse (Cols M & N)"}</th>
                      <th className="py-2.5 px-3 text-right">{isEn ? "Station Drawdown" : "Décompté Station"}</th>
                      <th className="py-2.5 px-3 text-right">{isEn ? "Advance Balance" : "Solde de l'Avance"}</th>
                      <th className="py-2.5 px-3 text-center">{isEn ? "Status" : "Statut"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {summary.dailyDrawdownLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-white/30 italic">
                          {isEn ? "No daily fuel logs recorded." : "Aucun ravitaillement journalier enregistré."}
                        </td>
                      </tr>
                    ) : (
                      summary.dailyDrawdownLedger.map((log) => (
                        <tr key={log.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3 text-white/70 font-mono text-[11px] whitespace-nowrap">{log.date}</td>
                          <td className="py-2.5 px-3 max-w-sm">
                            <p className="text-white/80 truncate">{log.comment}</p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {log.advanceAddedAmount && log.advanceAddedAmount > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  💰 +{formatMoney(log.advanceAddedAmount)} ({isEn ? "Advance credited" : "Avance créditée"})
                                </span>
                              )}
                              {log.isAbidjanExcluded && (log.abidjanFuelAmount || 0) > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                  🚫 {log.abidjanExclusionNote || (isEn ? "Abidjan fuel excluded:" : "Carburant Abidjan exclu :")} -{formatMoney(log.abidjanFuelAmount)}
                                </span>
                              )}
                              {log.isDirectPayment && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                  ⛽ {log.directPaymentNote || (isEn ? "Paid directly outside station:" : "Payé directement hors station :")} -{formatMoney(log.directPaymentAmount)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-bold text-orange-400">
                              -{formatMoney(log.stationDrawdownAmount)}
                            </div>
                            {(log.isDirectPayment || log.isAbidjanExcluded) && (
                              <div className="text-[9px] text-white/40">
                                ({isEn ? "Gross:" : "Brut :"} {formatMoney(log.amount)})
                              </div>
                            )}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${
                            log.remainingAdvanceBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {formatMoney(log.remainingAdvanceBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              log.isAbidjanExcluded && log.stationDrawdownAmount === 0
                                ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                                : log.isDirectPayment && log.stationDrawdownAmount === 0
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : log.isDirectPayment || log.isAbidjanExcluded
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : log.status === 'covered' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : log.status === 'low_credit' 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}>
                              {log.isAbidjanExcluded && log.stationDrawdownAmount === 0
                                ? (isEn ? "100% Abidjan (0 Shell)" : "100% Abidjan (0 Shell)")
                                : log.isDirectPayment && log.stationDrawdownAmount === 0
                                ? (isEn ? "100% Direct" : "100% Direct")
                                : log.isAbidjanExcluded
                                ? (isEn ? "Abidjan Excl." : "Abidjan Exclu")
                                : log.isDirectPayment
                                ? (isEn ? "Partially Direct" : "Partiel Station")
                                : log.status === 'covered' 
                                ? (isEn ? "Covered" : "Couvert") 
                                : log.status === 'low_credit' 
                                ? (isEn ? "Low Credit" : "Crédit Faible") 
                                : (isEn ? "Due / Overdrawn" : "Reste à régler")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PIED DE MODAL */}
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs text-white/40">
              <span>{summary.dailyDrawdownLedger.length} {isEn ? "operations in drawdown" : "opérations décomptées"}</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
              >
                {isEn ? "Close" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
