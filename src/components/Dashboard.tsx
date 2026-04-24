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
import { LogisticsCalendar } from "./LogisticsCalendar";
import { FleetStatus } from "./FleetStatus";
import { MaintenanceLog } from "./MaintenanceLog";
import { FuelEfficiency } from "./FuelEfficiency";
import { OperationalAlerts } from "./OperationalAlerts";
import { MiniCharts } from "./MiniCharts";
import { QuantumExpenseAnalysis } from "./QuantumExpenseAnalysis";
import { ActiveTrends } from "./ActiveTrends";
import { FinancialTrends } from "./FinancialTrends";
import {
  getDashboardMetrics,  formatCurrency, 
  formatCompactNumber, 
  formatTonnage, 
  formatPercent 
} from "../lib/dashboard";
import type { DashboardSummary } from "../utils/types";
import { FilterBar } from "./FilterBar";

type DashboardProps = {
  formatCurrency: (value: number) => string;
  formatCompactNumber: (value: number) => string;
  onSelectDriver: (driverLabel: string) => void;
  selectedChauffeur: string;
  onDateSelect?: (date: string | null) => void;
  onReset?: () => void;
  filteredData: any[];
  calendarData: any[];
  filterProps?: any;
  maintenanceRecords: any[];
  allTrips: any[];
  oilChanges: any;
  selectedDates: string[];
};

export function Dashboard({
  onSelectDriver,
  selectedChauffeur,
  onDateSelect,
  onReset,
  filteredData: initialFilteredData = [],
  calendarData = [],
  filterProps,
  maintenanceRecords = [],
  allTrips = [],
  oilChanges = {},
  formatCurrency,
  formatCompactNumber,
  selectedDates = []
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
  const maintenanceTotal = useMemo(() => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return 0;

    return maintenanceRecords.filter(r => {
      const rDate = new Date(r.date);
      
      let dateMatch = false;
      if (selectedDates && selectedDates.length > 0) {
          dateMatch = selectedDates.includes(r.date);
      } else {
          // On suit les filtres globaux passés par App.jsx
          const yFilter = filterProps?.year || [];
          const mFilter = filterProps?.month || [];
          
          const yMatch = yFilter.includes("Toutes les années") || yFilter.includes(String(rDate.getFullYear()));
          const mMatch = mFilter.includes("Tous les mois") || mFilter.includes(String(rDate.getMonth() + 1));
          dateMatch = yMatch && mMatch;
      }

      // Filtre Chauffeur/Véhicule
      let chauffeurMatch = true;
      if (selectedChauffeur !== "Tous les chauffeurs") {
        chauffeurMatch = r.vehicle.includes(selectedChauffeur.split(' ')[2]) || r.vehicle.includes(selectedChauffeur.split(' ')[0]);
      }
      
      return dateMatch && chauffeurMatch;
    }).reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [maintenanceRecords, selectedDates, filterProps, selectedChauffeur]);

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

  const handleSelectionFromCalendar = (type: 'month' | 'year', values: string[]) => {
      if (onDateSelect) {
          onDateSelect({
              [type === 'month' ? 'months' : 'years']: values,
              dates: [] // On réinitialise les jours si on change mois/année
          });
      }
  };

  const isAllYears = Array.isArray(filterProps?.year) && filterProps.year.includes("Toutes les années");

  return (
    <div className="flex flex-col gap-4 w-full h-full pb-6 font-sans antialiased text-white relative">

      {filterProps && (
         <div className="panel-enter rounded-2xl border border-white/5 bg-[#1c1c1e] p-1.5 shadow-xl">
            <FilterBar {...filterProps} />
         </div>
      )}

      {/* GPS / Fleet Widget Header */}
      <section className={`panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-4 shadow-2xl transition-all duration-700 relative overflow-hidden ${isGpsExpanded ? 'h-[70vh]' : 'h-[110px]'}`}>
         <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                 <div className="size-2 rounded-full bg-[#cf5d56] animate-pulse shadow-[0_0_8px_#cf5d56]" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/90 italic">Fleet Live</span>
             </div>
             <button onClick={() => setIsGpsExpanded(!isGpsExpanded)} className="px-3 py-1 rounded-xl bg-white/5 hover:bg-[#cf5d56] hover:text-white text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 border border-white/10">
               {isGpsExpanded ? <><Minimize className="size-3" /> Réduire</> : <><Maximize className="size-3" /> Focus Mode</>}
             </button>
         </div>
         <FleetTrackerWidget records={allTrips} />
      </section>

      {isGpsExpanded && <div className="h-[28vh] min-h-[250px]" />}

      <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl flex flex-col items-stretch min-h-[500px]">
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
/>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-none mb-1.5">Volume</p>
                    <p className="text-base font-black text-white">{formatCompactNumber(financeStats.tonnage)} T</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-widest leading-none mb-1.5">Net Profit</p>
                    <p className="text-base font-black text-[#9fe3b9]">{formatCurrency(financeStats.netProfit)}</p>
                </div>
            </div>
        </div>

        <div className="col-span-12 lg:col-span-7 xl:col-span-8 panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-7 shadow-2xl flex flex-col overflow-hidden">
            <header className="flex items-center justify-between mb-2 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[#00F2FF]/10 text-[#00F2FF]"><Zap className="size-5" /></div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white/80 leading-none">Quantum Finance Analyzer</h3>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-1 italic underline decoration-[#00F2FF]/30 underline-offset-4">Exploration des Coûts Multidimensionnelle</p>
                    </div>
                </div>
            </header>
            <div className="flex-1 flex items-center justify-center">
                <QuantumExpenseAnalysis data={syncFilteredData} maintenanceTotal={maintenanceTotal} formatCurrency={formatCurrency} />
            </div>
        </div>
        </section>

        {/* ACTIVE TRENDS MODULE */}
        <section className="mb-4">
          <ActiveTrends records={syncFilteredData} formatCurrency={formatCurrency} />
        </section>

        {/* FINANCIAL TRENDS MODULE */}
        <section className="mb-4">
          <FinancialTrends records={syncFilteredData} formatCurrency={formatCurrency} />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">          <div className="md:col-span-3 panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl flex flex-col">
              <div className="flex items-center gap-3 mb-6 px-1">
                  <div className="p-2.5 rounded-2xl bg-[#cf5d56]/10 text-[#cf5d56]"><Target className="size-4" /></div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/80 leading-none">Active Drivers Matrix</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                {["AMARA TRUCK 76", "BRAHIMA TRUCK 45", "SORO TRUCK 52"].map((label) => {
                  const isActive = selectedChauffeur === label;
                  const driverData = syncFilteredData.filter(t => t.driverLabel === label);
                  const dProfit = driverData.reduce((s, r) => s + (Number(r.total_net_cfa) || 0), 0);
                  const dTonnage = driverData.reduce((s, r) => s + (Number(r.tonnage) || 0), 0);
                  return (
                    <button key={label} onClick={() => onSelectDriver(label === selectedChauffeur ? "Tous les chauffeurs" : label)} className={`group rounded-[28px] border p-5 text-left transition-all duration-500 flex flex-col justify-between ${isActive ? "bg-[#cf5d56] border-[#cf5d56] shadow-xl" : "bg-white/2 border-white/5 hover:bg-white/5 shadow-xl"}`}>
                      <div className="flex justify-between items-start mb-4"><div className={`size-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${isActive ? 'bg-black text-white' : 'bg-[#cf5d56] text-black shadow-lg shadow-[#cf5d56]/20'}`}>{label.split(' ')[2]}</div><ArrowUpRight className={`size-4 transition-colors ${isActive ? 'text-white' : 'text-white/20'}`} /></div>
                      <div><p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isActive ? 'text-black/60' : 'text-[#cf5d56]'}`}>UNIT {label.split(' ')[2]}</p><h4 className={`text-base font-black truncate mb-4 tracking-tight ${isActive ? 'text-black' : 'text-white'}`}>{label.split(' ')[0]}</h4></div>
                      <div className={`pt-4 border-t flex justify-between items-center ${isActive ? 'border-black/10' : 'border-white/5'}`}><span className={`text-xs font-black ${isActive ? 'text-black' : (dProfit >= 0 ? 'text-[#9fe3b9]' : 'text-red-400')}`}>{formatCurrency(dProfit)}</span><span className={`text-[10px] font-bold ${isActive ? 'text-black/40' : 'text-white/30'}`}>{dTonnage}T</span></div>
                    </button>
                  );
                })}
              </div>
          </div>
          <div className="col-span-1 h-full"><FleetStatus totalTrips={metrics.totalTrips} activeDays={metrics.activeDays} profitableTrips={metrics.profitableTrips} driverLabel={selectedChauffeur} profitMargin={formatPercent(financeStats.margin / 100)} /></div>
      </section>

      {/* REVENUE TREND & TONNAGE (FULL WIDTH APPLE DESIGN) */}
      <section className="col-span-12">
          <MiniCharts records={syncFilteredData} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <MaintenanceLog records={maintenanceRecords} />
          <OperationalAlerts records={syncFilteredData} />
      </div>

    </div>
  );
}
