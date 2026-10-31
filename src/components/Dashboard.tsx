import { useMemo, useState, useEffect } from "react";
import { 
  ArrowUpRight, 
  Banknote, 
  Fuel, 
  Weight, 
  Calendar,
  Truck,
  Activity,
  ShieldAlert,
  ChevronRight,
  Target,
  PieChart as PieIcon,
  CircleDollarSign,
  Zap,
  Layout,
  Maximize,
  Minimize,
  X,
  Wrench
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { FleetTrackerWidget } from "./FleetTrackerWidget";
import { CurrentMonthWidget } from "./CurrentMonthWidget";
import { LogisticsCalendar } from "./LogisticsCalendar";
import { FleetStatus } from "./FleetStatus";
import { MaintenanceLog } from "./MaintenanceLog";
import { FuelEfficiency } from "./FuelEfficiency";
import { OperationalAlerts } from "./OperationalAlerts";
import { MiniCharts } from "./MiniCharts";
import { QuantumExpenseAnalysis } from "./QuantumExpenseAnalysis";
import { ActiveTrends } from "./ActiveTrends";
import { FinancialTrends } from "./FinancialTrends";
import { OilChangeGaugeWidget } from "./OilChangeGaugeWidget";
import { FuelAdvanceDashboardWidget } from "./FuelAdvanceDashboardWidget";
import { DashboardCategoryTabs, DashboardCategory } from "./DashboardCategoryTabs";
import { FuelAdvance, DEFAULT_FUEL_ADVANCES } from "../utils/fuelAdvanceTracker";
import { resolveTripFuelCorridor } from "../utils/fuelBreakdownDiagnostic";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "../utils/accountingInitialData";
import {
  getDashboardMetrics,  formatCurrency, 
  formatCompactNumber, 
  formatTonnage, 
  formatPercent,
  ALL_CHAUFFEURS,
  ALL_MONTHS,
  ALL_YEARS
} from "../lib/dashboard";
import type { DashboardSummary } from "../utils/types";
import { FilterBar } from "./FilterBar";
import type { Language } from "../utils/i18n";
import { isSalaryRecord } from "../utils/salaryFilter";

type DashboardProps = {
  formatCurrency: (value: number, curr?: string) => string;
  formatCompactNumber: (value: number) => string;
  onSelectDriver: (driverLabel: string) => void;
  selectedChauffeur: string;
  onDateSelect?: (selection: any) => void;
  onReset?: () => void;
  filteredData: any[];
  calendarData: any[];
  filterProps?: any;
  maintenanceRecords: any[];
  setMaintenanceRecords?: React.Dispatch<React.SetStateAction<any[]>> | null;
  expenseRecords?: any[];
  allTrips: any[];
  oilChanges: any;
  setOilChanges?: React.Dispatch<React.SetStateAction<any>> | null;
  selectedDates: string[];
  googleClientId?: string;
  currency?: string;
  t: any;
  language?: Language;
  allRecords: any[];
  fuelAdvances?: FuelAdvance[];
  setFuelAdvances?: React.Dispatch<React.SetStateAction<FuelAdvance[]>> | null;
  accountingTransactions?: any[];
  cashBalance?: number;
  onSyncTrips?: () => void;
  isSyncingTrips?: boolean;
  lastSyncAt?: number | string | null;
};

export function Dashboard({
  drivers = [],
  onSelectDriver,
  selectedChauffeur,
  onDateSelect,
  onReset,
  filteredData: initialFilteredData = [],
  calendarData = [],
  filterProps,
  maintenanceRecords = [],
  setMaintenanceRecords,
  expenseRecords = [],
  allTrips = [],
  oilChanges = {},
  setOilChanges,
  formatCurrency,
  formatCompactNumber,
  selectedDates = [],
  googleClientId,
  currency = "CFA",
  t,
  language = "FR",
  allRecords = [],
  fuelAdvances = DEFAULT_FUEL_ADVANCES,
  setFuelAdvances,
  accountingTransactions = INITIAL_ACCOUNTING_TRANSACTIONS,
  cashBalance,
  onSyncTrips,
  isSyncingTrips = false,
  lastSyncAt = null
}: DashboardProps) {

  // --- ÉTATS PILOTES DU CALENDRIER ---
  const [viewDate, setViewDate] = useState(new Date());
  const [isGpsExpanded, setIsGpsExpanded] = useState(false);

  // --- MOTEUR DE SYNCHRONISATION GLOBAL ---
  const syncFilteredData = useMemo(() => {
    // initialFilteredData est déjà filtré par App.jsx (Chauffeur, Multi-Années, Multi-Mois)
    // Mais s'il y a des jours spécifiques sélectionnés (selectedDates), on affine ici.
    let data = [...initialFilteredData];
    if (selectedDates && selectedDates.length > 0) {
        return data.filter(t => selectedDates.includes(t.date));
    }
    return data;
  }, [initialFilteredData, selectedDates]);

  // --- CALCUL MAINTENANCE FILTRÉE ---
  const filteredMaintenance = useMemo(() => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return [];

    return maintenanceRecords
      .filter(r => !isSalaryRecord(r))
      .filter(r => {
      const rDate = new Date(r.date);
      
      let dateMatch = false;
      if (selectedDates && selectedDates.length > 0) {
          dateMatch = selectedDates.includes(r.date);
      } else {
          // On suit les filtres globaux passés par App.jsx
          const yFilter = filterProps?.year || [];
          const mFilter = filterProps?.month || [];
          
          const yMatch = yFilter.includes(ALL_YEARS) || yFilter.includes(String(rDate.getFullYear()));
          const mMatch = mFilter.includes(ALL_MONTHS) || mFilter.includes(String(rDate.getMonth() + 1));
          dateMatch = yMatch && mMatch;
      }

      // Filtre Chauffeur/Véhicule
      let chauffeurMatch = true;
      if (selectedChauffeur !== ALL_CHAUFFEURS) {
        chauffeurMatch = String(r.vehicle || r.driverLabel || "").toUpperCase().includes(selectedChauffeur.split(' ')[2]) || String(r.vehicle || r.driverLabel || "").toUpperCase().includes(selectedChauffeur.split(' ')[0]);
      }
      
      return dateMatch && chauffeurMatch;
    });
  }, [maintenanceRecords, selectedDates, filterProps, selectedChauffeur, t]);

  const maintenanceTotal = useMemo(() => {
    return filteredMaintenance.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [filteredMaintenance]);

  const metrics = useMemo(() => getDashboardMetrics(syncFilteredData), [syncFilteredData]);

  const financeStats = useMemo(() => {
    const tonnage = syncFilteredData.reduce((s, r) => s + (Number(r.tonnage) || 0), 0);
    const revenue = syncFilteredData.reduce((s, r) => s + (Number(r.total_gross_cfa) || 0), 0);
    const expense = syncFilteredData.reduce((s, r) => s + (Number(r.total_expense_cfa) || 0), 0);
    const netProfit = revenue - (expense + maintenanceTotal);
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { tonnage, revenue, netProfit, margin };
  }, [syncFilteredData, maintenanceTotal]);

  // --- HANDLERS ---
  const handleDayClick = (date: string | null) => {
    if (!date) return;
    
    const newDates = selectedDates.includes(date)
        ? selectedDates.filter(d => d !== date)
        : [...selectedDates, date];

    if (onDateSelect) {
        onDateSelect({ 
            dates: newDates, 
            months: [ALL_MONTHS], // Sélection de jours précis désactive le filtre mois
        });
    }
  };

  const handleMonthChange = (offset: number) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(next);
  };

  const handleResetDay = () => {
    if (onDateSelect) onDateSelect(null);
  };

  const handlePresetPeriod = (presetKey: string) => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    
    if (presetKey === "today") {
      const todayISO = now.toISOString().split("T")[0];
      const hasToday = (allTrips || []).some(t => t.date === todayISO);
      const targetDate = hasToday 
        ? todayISO 
        : (allTrips && allTrips.length > 0 ? [...allTrips].sort((a,b)=>a.date.localeCompare(b.date)).pop()?.date : todayISO);
      if (targetDate) {
        const dObj = new Date(targetDate);
        setViewDate(new Date(dObj.getFullYear(), dObj.getMonth(), 1));
        if (onDateSelect) {
          onDateSelect({
            dates: [targetDate],
            months: [ALL_MONTHS],
            years: [String(dObj.getFullYear())]
          });
        }
      }
    } else if (presetKey === "week") {
      const latestDateStr = allTrips && allTrips.length > 0 ? [...allTrips].sort((a,b)=>a.date.localeCompare(b.date)).pop()?.date : now.toISOString().split("T")[0];
      const refDate = new Date(latestDateStr);
      const dayOfWeek = refDate.getDay();
      const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() + diffToMon);
      
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekDates.push(d.toISOString().split("T")[0]);
      }
      setViewDate(new Date(refDate.getFullYear(), refDate.getMonth(), 1));
      if (onDateSelect) {
        onDateSelect({
          dates: weekDates,
          months: [ALL_MONTHS],
          years: [String(refDate.getFullYear())]
        });
      }
    } else if (presetKey === "month") {
      setViewDate(new Date(curY, curM - 1, 1));
      if (onDateSelect) {
        onDateSelect({
          dates: [],
          months: [String(curM)],
          years: [String(curY)]
        });
      }
    } else if (presetKey === "lastmonth") {
      const prevM = curM === 1 ? 12 : curM - 1;
      const prevY = curM === 1 ? curY - 1 : curY;
      setViewDate(new Date(prevY, prevM - 1, 1));
      if (onDateSelect) {
        onDateSelect({
          dates: [],
          months: [String(prevM)],
          years: [String(prevY)]
        });
      }
    } else if (presetKey === "year") {
      setViewDate(new Date(curY, curM - 1, 1));
      if (onDateSelect) {
        onDateSelect({
          dates: [],
          months: [ALL_MONTHS],
          years: [String(curY)]
        });
      }
    } else if (presetKey === "all") {
      setViewDate(new Date(curY, curM - 1, 1));
      if (onDateSelect) {
        onDateSelect({
          dates: [],
          months: [ALL_MONTHS],
          years: [ALL_YEARS]
        });
      }
      if (onSelectDriver) {
        onSelectDriver(ALL_CHAUFFEURS);
      }
    }
  };

  const handleSelectionFromCalendar = (type: 'month' | 'year', values: string[]) => {
      if (onDateSelect) {
          onDateSelect({
              [type === 'month' ? 'months' : 'years']: values,
              dates: [] // On réinitialise les jours si on change mois/année
          });
      }
  };

  const isAllYears = Array.isArray(filterProps?.year) && filterProps.year.includes(ALL_YEARS);

  const handleUpdateOilChange = (truckLabel: string, mileage: number, date: string, comment?: string) => {
    if (setOilChanges) {
      setOilChanges((prev: any) => ({
        ...prev,
        [truckLabel]: { 
          mileage, 
          date, 
          comment: comment || "Vidange manuelle", 
          interval: 10000 
        }
      }));
    }
  };

  const isEn = language === "EN";

  const fuelCategoryStats = useMemo(() => {
    let totalFuel = 0;
    let spFuel = 0;
    let abjFuel = 0;
    (syncFilteredData || []).forEach((r) => {
      const f = Number(r.fuel_cost_cfa) || 0;
      if (f <= 0) return;
      totalFuel += f;
      if (resolveTripFuelCorridor(r) === "ABIDJAN") abjFuel += f;
      else spFuel += f;
    });
    const spPct = totalFuel > 0 ? Math.round((spFuel / totalFuel) * 100) : 0;
    const abjPct = totalFuel > 0 ? Math.round((abjFuel / totalFuel) * 100) : 0;
    return { totalFuel, spFuel, abjFuel, spPct, abjPct };
  }, [syncFilteredData]);

  const dashboardCategories: DashboardCategory[] = useMemo(
    () => [
      {
        id: "fuel_treasury",
        icon: <Fuel className="size-5" />,
        label: isEn ? "Fuel & Cash Reconciliation" : "Carburant & Trésorerie",
        kpi: formatCurrency(fuelCategoryStats.totalFuel, currency),
        subKpi: `San Pedro ${fuelCategoryStats.spPct}% • Abidjan ${fuelCategoryStats.abjPct}%`,
        accent: "amber",
        content: (
          <FuelAdvanceDashboardWidget
            advances={fuelAdvances}
            transactions={accountingTransactions}
            trips={syncFilteredData}
            allTrips={allTrips}
            rawCashBalance={cashBalance}
            onAddAdvance={
              setFuelAdvances
                ? (newAdv) => setFuelAdvances((prev) => [newAdv, ...(prev || [])])
                : undefined
            }
            onSyncTrips={onSyncTrips}
            isSyncingTrips={isSyncingTrips}
            formatCurrency={formatCurrency}
            currency={currency}
            t={t}
            language={language}
            canEdit={!!setFuelAdvances}
          />
        ),
      },
      {
        id: "workshop_alerts",
        icon: <Wrench className="size-5" />,
        label: isEn ? "Workshop & Alerts" : "Atelier & Alertes",
        kpi: formatCurrency(maintenanceTotal, currency),
        subKpi: isEn
          ? `${filteredMaintenance.length} workshop record(s)`
          : `${filteredMaintenance.length} intervention(s) atelier`,
        accent: "rose",
        badge: filteredMaintenance.length > 0 ? filteredMaintenance.length : undefined,
        content: (
          <div className="space-y-4">
            <MaintenanceLog
              records={filteredMaintenance}
              expenseRecords={expenseRecords}
              accountingTransactions={accountingTransactions}
              googleClientId={googleClientId}
              oilChanges={oilChanges}
              allTrips={allTrips}
              t={t}
              language={language}
            />
            <OperationalAlerts
              records={syncFilteredData}
              allTrips={allTrips}
              oilChanges={oilChanges}
              t={t}
              language={language}
            />
          </div>
        ),
      },
      {
        id: "trends_volumes",
        icon: <Activity className="size-5" />,
        label: isEn ? "Revenue & Tonnage Trends" : "Tendances & Volumes",
        kpi: formatCurrency(financeStats.revenue, currency),
        subKpi: `${formatCompactNumber(financeStats.tonnage)} T • ${isEn ? "Margin" : "Marge"} ${financeStats.margin.toFixed(1)}%`,
        accent: "emerald",
        content: (
          <ActiveTrends
            records={syncFilteredData}
            formatCurrency={(v) => formatCurrency(v, currency)}
            t={t}
            language={language}
          />
        ),
      },
      {
        id: "drivers_matrix",
        icon: <Target className="size-5" />,
        label: isEn ? "Active Drivers Matrix" : "Matrice Chauffeurs",
        kpi:
          selectedChauffeur === ALL_CHAUFFEURS
            ? isEn
              ? "All 3 Trucks"
              : "3 Camions Actifs"
            : selectedChauffeur.split(" ")[0],
        subKpi: "AMARA 76 • BRAHIMA 45 • SORO 52",
        accent: "sky",
        content: (
          <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="p-2 rounded-xl bg-[#cf5d56]/10 text-[#cf5d56]">
                <Target className="size-4" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white/80 leading-none">
                {t?.activeDriversMatrix || "Active Drivers Matrix"}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["AMARA TRUCK 76", "BRAHIMA TRUCK 45", "SORO TRUCK 52"].map((label) => {
                const isActive = selectedChauffeur === label;
                const driverData = syncFilteredData.filter((t) => t.driverLabel === label);
                const dProfit = driverData.reduce(
                  (s, r) => s + (Number(r.total_net_cfa) || 0),
                  0
                );
                const dTonnage = driverData.reduce((s, r) => s + (Number(r.tonnage) || 0), 0);
                return (
                  <button
                    key={label}
                    onClick={() =>
                      onSelectDriver(label === selectedChauffeur ? ALL_CHAUFFEURS : label)
                    }
                    className={`group rounded-[24px] border p-5 text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? "bg-[#cf5d56] border-[#cf5d56] shadow-xl"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07] shadow-xl"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                          isActive
                            ? "bg-black text-white"
                            : "bg-[#cf5d56] text-black shadow-lg shadow-[#cf5d56]/20"
                        }`}
                      >
                        {label.split(" ")[2]}
                      </div>
                      <ArrowUpRight
                        className={`size-4 transition-colors ${
                          isActive ? "text-white" : "text-white/20"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${
                          isActive ? "text-black/60" : "text-[#cf5d56]"
                        }`}
                      >
                        UNIT {label.split(" ")[2]}
                      </p>
                      <h4
                        className={`text-base font-black truncate mb-4 tracking-tight ${
                          isActive ? "text-black" : "text-white"
                        }`}
                      >
                        {label.split(" ")[0]}
                      </h4>
                    </div>
                    <div
                      className={`pt-4 border-t flex justify-between items-center ${
                        isActive ? "border-black/10" : "border-white/5"
                      }`}
                    >
                      <span
                        className={`text-xs font-black ${
                          isActive
                            ? "text-black"
                            : dProfit >= 0
                            ? "text-[#9fe3b9]"
                            : "text-red-400"
                        }`}
                      >
                        {formatCurrency(dProfit, currency)}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isActive ? "text-black/40" : "text-white/30"
                        }`}
                      >
                        {dTonnage}T
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ),
      },
    ],
    [
      isEn,
      fuelCategoryStats,
      fuelAdvances,
      accountingTransactions,
      syncFilteredData,
      allTrips,
      cashBalance,
      setFuelAdvances,
      onSyncTrips,
      isSyncingTrips,
      formatCurrency,
      currency,
      t,
      language,
      maintenanceTotal,
      filteredMaintenance,
      googleClientId,
      oilChanges,
      financeStats,
      formatCompactNumber,
      selectedChauffeur,
      onSelectDriver,
    ]
  );

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-6 font-sans antialiased text-white relative">

      {/* 1. BARRE DE FILTRES GLOBALE */}
      {filterProps && (
         <div className="panel-enter rounded-2xl border border-white/5 bg-[#1c1c1e] p-1.5 shadow-xl">
            <FilterBar {...filterProps} t={t} language={language} />
         </div>
      )}

      {/* 2. GPS FLEET LIVE (PLEINE LARGEUR EN TÊTE, À SA PLACE) */}
      <section className={`panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-4 shadow-2xl transition-all duration-700 relative overflow-hidden ${isGpsExpanded ? 'h-[70vh]' : 'h-[250px]'}`}>
         <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                 <div className="size-2 rounded-full bg-[#cf5d56] animate-pulse shadow-[0_0_8px_#cf5d56]" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/90 italic">{t?.fleetLive || "Fleet Live"}</span>
             </div>
             <button onClick={() => setIsGpsExpanded(!isGpsExpanded)} className="px-3 py-1 rounded-xl bg-white/5 hover:bg-[#cf5d56] hover:text-white text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 border border-white/10">
               {isGpsExpanded ? <><Minimize className="size-3" /> {t?.reduce || "Réduire"}</> : <><Maximize className="size-3" /> {t?.focusMode || "Focus Mode"}</>}
             </button>
         </div>
         <FleetTrackerWidget records={allTrips} drivers={drivers} t={t} language={language} />
      </section>

      {isGpsExpanded && <div className="h-[28vh] min-h-[250px]" />}

      {/* 2.5 NOUVEAU MODULE MOIS EN COURS (KPI MENSUELS EN TEMPS RÉEL DEPUIS LE SPREADSHEET) */}
      <CurrentMonthWidget
        allTrips={allTrips}
        formatCurrency={formatCurrency}
        formatCompactNumber={formatCompactNumber}
        currency={currency}
        onSyncTrips={onSyncTrips}
        isSyncingTrips={isSyncingTrips}
        lastSyncAt={lastSyncAt}
        t={t}
        language={language}
      />

      {/* 3. CALENDRIER À GAUCHE & QUANTUM FINANCE ANALYZER (+ FINANCIAL BREAKDOWN BY TRUCK) À DROITE */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-5 sm:p-6 shadow-2xl flex flex-col items-stretch min-h-[500px]">
            <div className="flex-1 w-full h-full">
                <LogisticsCalendar 
                  records={calendarData} 
                  selectedDay={selectedDates.length === 1 ? selectedDates[0] : (isAllYears ? "ALL_YEARS_GLOBAL" : null)} 
                  viewDate={viewDate} 
                  onDayClick={handleDayClick} 
                  onMonthChange={handleMonthChange} 
                  onResetDay={handleResetDay} 
                  isDateFiltered={selectedDates.length > 0} 
                  selectedChauffeur={selectedChauffeur} 
                  onChauffeurChange={onSelectDriver} 
                  chauffeurOptions={filterProps?.chauffeurs}
                  year={filterProps?.year}
                  month={filterProps?.month}
                  selectedDates={selectedDates}
                  onSelection={handleSelectionFromCalendar}
                  onPresetPeriod={handlePresetPeriod}
                  onReset={onReset}
                  t={t}
                  language={language}
                  currency={currency}
                />
            </div>
        </div>

        <div className="col-span-12 lg:col-span-7 xl:col-span-8 panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-7 shadow-2xl flex flex-col overflow-hidden">
            <header className="flex items-center justify-between mb-2 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[#00F2FF]/10 text-[#00F2FF]"><Zap className="size-5" /></div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/80 leading-none">{t?.quantumFinance || "Quantum Finance Analyzer"}</h3>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-1 italic underline decoration-[#00F2FF]/30 underline-offset-4">{t?.analyticalRecap || "Exploration des Coûts Multidimensionnelle"}</p>
                    </div>
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center min-h-[450px] min-w-0">
                <QuantumExpenseAnalysis 
                  data={allTrips} 
                  maintenanceTotal={0} 
                  maintenanceRecords={maintenanceRecords || []}
                  allMaintenanceRecords={maintenanceRecords || []}
                  drivers={drivers}
                  allTrips={allTrips}
                  formatCurrency={formatCurrency}
                  language={language}
                  t={t}
                />
            </div>
        </div>
      </section>

      {/* 4. HYBRIDE A+B : CATÉGORIES REPLIABLES AVEC MINI-KPI TOUJOURS VISIBLES */}
      <DashboardCategoryTabs
        categories={dashboardCategories}
        language={language}
      />

    </div>
  );
}
