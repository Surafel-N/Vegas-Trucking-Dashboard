import { useMemo, useState, useEffect } from "react";
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Truck, 
  CircleDollarSign, 
  PiggyBank, 
  Percent, 
  Clock, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { Language } from "../utils/i18n";

interface CurrentMonthWidgetProps {
  allTrips: any[];
  formatCurrency: (val: number, curr?: string) => string;
  formatCompactNumber: (val: number) => string;
  currency?: string;
  onSyncTrips?: () => void;
  isSyncingTrips?: boolean;
  lastSyncAt?: number | string | null;
  t?: any;
  language?: Language;
}

export function CurrentMonthWidget({
  allTrips = [],
  formatCurrency,
  formatCompactNumber,
  currency = "CFA",
  onSyncTrips,
  isSyncingTrips = false,
  lastSyncAt,
  t,
  language = "FR"
}: CurrentMonthWidgetProps) {
  const isEn = language === "EN";

  // Heure actuelle pour calcul du temps écoulé depuis la dernière synchro
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 30000); // maj toutes les 30s
    return () => clearInterval(timer);
  }, []);

  // Détermination du mois actif (mois courant ou dernier mois disponible dans les données)
  const activeMonthData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    const currentRecords = (allTrips || []).filter(
      r => Number(r.year) === currentYear && Number(r.month) === currentMonth
    );

    let year = currentYear;
    let month = currentMonth;
    let records = currentRecords;

    // Si aucune donnée dans le mois calendaire courant, on prend le mois le plus récent avec données
    if (records.length === 0 && allTrips && allTrips.length > 0) {
      let latestYear = 0;
      let latestMonth = 0;
      allTrips.forEach(r => {
        const y = Number(r.year) || 0;
        const m = Number(r.month) || 0;
        if (y > latestYear || (y === latestYear && m > latestMonth)) {
          latestYear = y;
          latestMonth = m;
        }
      });
      if (latestYear > 0 && latestMonth > 0) {
        year = latestYear;
        month = latestMonth;
        records = allTrips.filter(
          r => Number(r.year) === latestYear && Number(r.month) === latestMonth
        );
      }
    }

    // Calcul des jours max du mois et jour actuel / dernière saisie
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNumbers = records.map(r => {
      const d = r.day || (r.date ? new Date(r.date).getDate() : 0);
      return Number(d) || 0;
    }).filter(d => d > 0);
    const lastEntryDay = dayNumbers.length > 0 ? Math.max(...dayNumbers) : (today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : daysInMonth);
    const currentOrLastDay = (today.getFullYear() === year && today.getMonth() + 1 === month) 
      ? today.getDate() 
      : lastEntryDay;

    // Nom du mois
    const dateForName = new Date(year, month - 1, 1);
    const monthName = new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", { month: "long" }).format(dateForName);

    // Date de la dernière écriture formatée
    const lastDateRecorded = records.length > 0
      ? records.reduce((max, r) => (!max || (r.date && r.date > max) ? r.date : max), "")
      : "";

    return {
      year,
      month,
      monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      records,
      daysInMonth,
      currentOrLastDay,
      lastEntryDay,
      lastDateRecorded
    };
  }, [allTrips, isEn]);

  // Agrégations financières et opérationnelles du mois en cours
  const currentStats = useMemo(() => {
    const { records, daysInMonth, currentOrLastDay } = activeMonthData;
    let totalTonnage = 0;
    let totalGross = 0;
    let totalExpense = 0;
    let totalVoyages = 0;
    const activeDaysSet = new Set<string>();

    records.forEach(r => {
      const t = Number(r.tonnage) || 0;
      const g = Number(r.total_gross_cfa || r.totalGrossCFA) || 0;
      const e = Number(r.total_expense_cfa || r.totalExpense) || (Number(r.fuel_cost_cfa || 0) + Number(r.road_fees_cfa || 0));
      
      totalTonnage += t;
      totalGross += g;
      totalExpense += e;

      if (t > 0) {
        totalVoyages += (t > 100 ? 2 : 1);
      }
      if (r.date && (t > 0 || g > 0)) {
        activeDaysSet.add(r.date);
      }
    });

    const totalNet = totalGross - totalExpense;
    const margin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
    const activeDaysCount = activeDaysSet.size || 1;
    const avgDailyGross = activeDaysCount > 0 ? Math.round(totalGross / activeDaysCount) : 0;
    const progressPct = Math.min(100, Math.round((currentOrLastDay / daysInMonth) * 100));

    return {
      totalTonnage,
      totalVoyages,
      totalGross,
      totalExpense,
      totalNet,
      margin,
      activeDaysCount,
      avgDailyGross,
      progressPct
    };
  }, [activeMonthData]);

  // Comparatif M-1 à date équivalente (ex: 1 au 20 du mois précédent)
  const comparisonMMinus1 = useMemo(() => {
    const { year, month, lastEntryDay } = activeMonthData;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevRecords = (allTrips || []).filter(r => {
      const y = Number(r.year);
      const m = Number(r.month);
      const d = Number(r.day || (r.date ? new Date(r.date).getDate() : 0));
      return y === prevYear && m === prevMonth && d <= lastEntryDay;
    });

    if (prevRecords.length === 0) return null;

    let prevTonnage = 0;
    let prevGross = 0;
    let prevExpense = 0;
    prevRecords.forEach(r => {
      prevTonnage += Number(r.tonnage) || 0;
      prevGross += Number(r.total_gross_cfa || r.totalGrossCFA) || 0;
      prevExpense += Number(r.total_expense_cfa || r.totalExpense) || (Number(r.fuel_cost_cfa || 0) + Number(r.road_fees_cfa || 0));
    });
    const prevNet = prevGross - prevExpense;

    const prevMonthName = new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", { month: "short" }).format(new Date(prevYear, prevMonth - 1, 1));

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    return {
      prevMonthName,
      cutoffDay: lastEntryDay,
      tonnagePct: calcPct(currentStats.totalTonnage, prevTonnage),
      grossPct: calcPct(currentStats.totalGross, prevGross),
      netPct: calcPct(currentStats.totalNet, prevNet),
      prevTonnage,
      prevGross,
      prevNet
    };
  }, [activeMonthData, allTrips, currentStats, isEn]);

  // Ventilation par chauffeur (AMARA, BRAHIMA, SORO)
  const driverBreakdown = useMemo(() => {
    const DRIVER_CONFIG = [
      { key: "AMARA", label: "AMARA · 76", color: "#cf5d56", bg: "bg-[#cf5d56]" },
      { key: "BRAHIMA", label: "BRAHIMA · 45", color: "#00F2FF", bg: "bg-[#00F2FF]" },
      { key: "SORO", label: "SORO · 52", color: "#BF5AF2", bg: "bg-[#BF5AF2]" }
    ];

    const totalGross = currentStats.totalGross || 1;

    return DRIVER_CONFIG.map(cfg => {
      const records = activeMonthData.records.filter(r => 
        String(r.driverLabel || r.chauffeur || "").toUpperCase().includes(cfg.key)
      );

      let tonnage = 0;
      let gross = 0;
      let net = 0;
      let voyages = 0;

      records.forEach(r => {
        const t = Number(r.tonnage) || 0;
        const g = Number(r.total_gross_cfa || r.totalGrossCFA) || 0;
        const e = Number(r.total_expense_cfa || r.totalExpense) || (Number(r.fuel_cost_cfa || 0) + Number(r.road_fees_cfa || 0));
        tonnage += t;
        gross += g;
        net += (g - e);
        if (t > 0) voyages += (t > 100 ? 2 : 1);
      });

      const sharePct = totalGross > 0 ? (gross / totalGross) * 100 : 0;

      return {
        ...cfg,
        tonnage,
        gross,
        net,
        voyages,
        sharePct
      };
    });
  }, [activeMonthData.records, currentStats.totalGross]);

  // Libellé de dernière synchronisation
  const syncLabel = useMemo(() => {
    if (!lastSyncAt) return isEn ? "Synchronized recently" : "Synchronisé récemment";
    const ts = typeof lastSyncAt === "string" ? new Date(lastSyncAt).getTime() : lastSyncAt;
    const diffSec = Math.max(0, Math.floor((nowTime - ts) / 1000));
    if (diffSec < 45) return isEn ? "Synchronized just now" : "Synchronisé à l'instant";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return isEn ? `Synchronized ${diffMin} min ago` : `Synchronisé il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    return isEn ? `Synchronized ${diffHours}h ago` : `Synchronisé il y a ${diffHours}h`;
  }, [lastSyncAt, nowTime, isEn]);

  // Format date française JJ/MM/AAAA
  const formattedLastDate = useMemo(() => {
    if (!activeMonthData.lastDateRecorded) return "";
    const parts = activeMonthData.lastDateRecorded.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return activeMonthData.lastDateRecorded;
  }, [activeMonthData.lastDateRecorded]);

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Halo lumineux d'accentuation en arrière-plan */}
      <div className="absolute -top-24 -right-24 size-64 bg-[#00F2FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 size-64 bg-[#61d2c0]/10 rounded-full blur-3xl pointer-events-none" />

      {/* EN-TÊTE : Titre du mois + Statut de Synchronisation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#61d2c0]/15 text-[#61d2c0] border border-[#61d2c0]/30 shadow-lg shadow-[#61d2c0]/10">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-widest text-white/90">
                {t?.currentMonth || (isEn ? "Current Month" : "Mois en cours")} · {activeMonthData.monthName} {activeMonthData.year}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/70 border border-white/10">
                {t?.liveOps || "Live"}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {isEn 
                ? "Always shows the active operational month, independent of calendar filters" 
                : "Affichage permanent du mois réel, indépendant des filtres du calendrier"}
            </p>
          </div>
        </div>

        {/* Indicateur de synchro Spreadsheet + Bouton d'actualisation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[11px]">
            <span className={`size-2 rounded-full ${isSyncingTrips ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
            <span className="text-white/70 font-medium">
              {isSyncingTrips ? (isEn ? "Syncing with Spreadsheet..." : "Synchronisation en cours...") : syncLabel}
            </span>
            {formattedLastDate && (
              <>
                <span className="text-white/20">|</span>
                <span className="text-white/40">
                  {isEn ? "Last entry:" : "Dernière saisie :"} <strong className="text-white/80 font-bold">{formattedLastDate}</strong>
                </span>
              </>
            )}
          </div>

          {onSyncTrips && (
            <button
              onClick={onSyncTrips}
              disabled={isSyncingTrips}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer select-none ${
                isSyncingTrips
                  ? "bg-white/5 border-white/10 text-white/40"
                  : "bg-white/5 hover:bg-[#61d2c0] hover:text-black border-white/10 text-white/80 hover:border-[#61d2c0] shadow-sm"
              }`}
              title={isEn ? "Refresh data from Google Sheets" : "Actualiser les données depuis le Spreadsheet"}
            >
              <RefreshCw className={`size-3.5 ${isSyncingTrips ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">{isEn ? "Sync" : "Actualiser"}</span>
            </button>
          )}
        </div>
      </div>

      {/* GRILLE DES 4 KPI CLÉS DU MOIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 relative z-10">
        
        {/* KPI 1 : CHARGEMENTS (TONNAGE & VOYAGES) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400/90 flex items-center gap-1.5">
                <Truck className="size-3.5 text-sky-400" />
                {t?.totalTonnage || (isEn ? "Tonnage Loaded" : "Chargements")}
              </span>
              <span className="text-[10px] font-bold text-white/40 uppercase">
                {currentStats.totalVoyages} {t?.voyages || "voyages"}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {currentStats.totalTonnage.toLocaleString(isEn ? "en-US" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                <span className="text-base font-bold text-white/50">T</span>
              </p>
              <p className="text-xs text-white/50 mt-1">
                <strong className="text-white/80 font-bold">{currentStats.totalVoyages}</strong> {isEn ? "completed rotations" : "voyages effectués"}
              </p>
            </div>
          </div>

          {/* Comparatif M-1 */}
          <div className="mt-3 pt-2.5 border-t border-white/5">
            {comparisonMMinus1 ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                {comparisonMMinus1.tonnagePct >= 0 ? (
                  <TrendingUp className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-400 shrink-0" />
                )}
                <span className={`font-black ${comparisonMMinus1.tonnagePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {comparisonMMinus1.tonnagePct >= 0 ? '+' : ''}{comparisonMMinus1.tonnagePct.toFixed(1)}%
                </span>
                <span className="text-white/35 truncate">
                  vs 1–{comparisonMMinus1.cutoffDay} {comparisonMMinus1.prevMonthName} ({comparisonMMinus1.prevTonnage.toFixed(0)} T)
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-white/30 italic">{isEn ? "Current month baseline" : "Référence mois en cours"}</span>
            )}
          </div>
        </div>

        {/* KPI 2 : CHIFFRE D'AFFAIRES (GROSS REVENUE) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#00F2FF]/90 flex items-center gap-1.5">
                <CircleDollarSign className="size-3.5 text-[#00F2FF]" />
                {t?.revenue || (isEn ? "Gross Turnover" : "Chiffre d'Affaires")}
              </span>
              <span className="text-[10px] font-bold text-white/40 uppercase">
                {isEn ? "Col G" : "Col G Brut"}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatCurrency(currentStats.totalGross, currency)}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {isEn ? "Average:" : "Moyenne :"} <strong className="text-white/80 font-bold">{formatCurrency(currentStats.avgDailyGross, currency)}</strong> {isEn ? "/ active day" : "/ jour actif"}
              </p>
            </div>
          </div>

          {/* Comparatif M-1 */}
          <div className="mt-3 pt-2.5 border-t border-white/5">
            {comparisonMMinus1 ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                {comparisonMMinus1.grossPct >= 0 ? (
                  <TrendingUp className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-400 shrink-0" />
                )}
                <span className={`font-black ${comparisonMMinus1.grossPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {comparisonMMinus1.grossPct >= 0 ? '+' : ''}{comparisonMMinus1.grossPct.toFixed(1)}%
                </span>
                <span className="text-white/35 truncate">
                  vs 1–{comparisonMMinus1.cutoffDay} {comparisonMMinus1.prevMonthName} ({formatCompactNumber(comparisonMMinus1.prevGross)})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-white/30 italic">{isEn ? "Full gross billing" : "Facturation brute mensuelle"}</span>
            )}
          </div>
        </div>

        {/* KPI 3 : CHIFFRE D'AFFAIRES NET (NET REVENUE) */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#9fe3b9] flex items-center gap-1.5">
                <PiggyBank className="size-3.5 text-[#9fe3b9]" />
                {t?.netProfit || (isEn ? "Net Revenue" : "Chiffre d'Affaires Net")}
              </span>
              <span className="text-[10px] font-bold text-[#9fe3b9]/70 uppercase">
                {isEn ? "After Fuel & Road" : "Net Opérationnel"}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black text-[#9fe3b9] tracking-tight">
                {formatCurrency(currentStats.totalNet, currency)}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {isEn ? "CA − fuel − road fees" : "CA − carburant − frais de route"}
              </p>
            </div>
          </div>

          {/* Comparatif M-1 */}
          <div className="mt-3 pt-2.5 border-t border-white/5">
            {comparisonMMinus1 ? (
              <div className="flex items-center gap-1.5 text-[11px]">
                {comparisonMMinus1.netPct >= 0 ? (
                  <TrendingUp className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="size-3.5 text-rose-400 shrink-0" />
                )}
                <span className={`font-black ${comparisonMMinus1.netPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {comparisonMMinus1.netPct >= 0 ? '+' : ''}{comparisonMMinus1.netPct.toFixed(1)}%
                </span>
                <span className="text-white/35 truncate">
                  vs 1–{comparisonMMinus1.cutoffDay} {comparisonMMinus1.prevMonthName} ({formatCompactNumber(comparisonMMinus1.prevNet)})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-white/30 italic">{isEn ? "Operating net balance" : "Solde net d'exploitation"}</span>
            )}
          </div>
        </div>

        {/* KPI 4 : MARGE NETTE & AVANCEMENT DU MOIS */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col justify-between hover:bg-white/[0.05] transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90 flex items-center gap-1.5">
                <Percent className="size-3.5 text-amber-400" />
                {t?.margin || (isEn ? "Net Margin" : "Marge Nette")}
              </span>
              <span className="text-[10px] font-bold text-white/40 uppercase">
                {isEn ? "Day" : "Jour"} {activeMonthData.currentOrLastDay} / {activeMonthData.daysInMonth}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                {currentStats.margin.toFixed(1)} <span className="text-base font-bold text-white/50">%</span>
              </p>
              <p className="text-xs text-white/50 mt-1">
                {activeMonthData.currentOrLastDay} {isEn ? "days elapsed in month" : "jours écoulés sur le mois"}
              </p>
            </div>
          </div>

          {/* Barre de progression calendaire */}
          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
            <div className="flex justify-between text-[10px] text-white/40 font-bold">
              <span>{isEn ? "Month progress:" : "Avancement mois :"}</span>
              <span className="text-amber-300 font-black">{currentStats.progressPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-700" 
                style={{ width: `${currentStats.progressPct}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* BANDEAU DE RÉPARTITION DU CA PAR CAMION */}
      <div className="mt-4 rounded-2xl bg-black/30 border border-white/5 p-3 sm:p-4 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            {isEn ? "Revenue Breakdown by Truck (Active Month)" : "Répartition du Chiffre d'Affaires par Camion"}
          </span>
          <span className="text-[10px] text-white/30 font-medium">
            {isEn ? "Flotte 3 Unités SDV" : "Flotte 3 Unités SDV"}
          </span>
        </div>

        {/* Barre colorée segmentée */}
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-white/5 border border-white/5">
          {driverBreakdown.map((d) => (
            <div
              key={d.key}
              style={{ width: `${Math.max(1, d.sharePct)}%`, backgroundColor: d.color }}
              className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
              title={`${d.label}: ${d.sharePct.toFixed(1)}%`}
            />
          ))}
        </div>

        {/* Légende détaillée par chauffeur */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-2 border-t border-white/5 text-[11px]">
          {driverBreakdown.map((d) => (
            <div key={d.key} className="flex items-center justify-between bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="font-black text-white/90">{d.label}</span>
              </div>
              <div className="text-right">
                <p className="font-black text-white text-xs">{formatCurrency(d.gross, currency)}</p>
                <p className="text-[9px] text-white/40 font-medium">
                  {d.tonnage.toFixed(1)} T • {d.voyages} {isEn ? "trips" : "voy."} ({d.sharePct.toFixed(0)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

