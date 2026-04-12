import { useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  Banknote, 
  Fuel, 
  ReceiptText, 
  Wallet, 
  Weight, 
  AlertTriangle, 
  Cloud, 
  ExternalLink,
  Sparkles,
  Activity,
  Layout,
  RotateCcw,
  Check,
  Zap,
  CircleDollarSign
} from "lucide-react";
import { KpiCard } from "./KpiCard";
import { FleetTrackerWidget } from "./FleetTrackerWidget";
import { LogisticsCalendar } from "./LogisticsCalendar";
import { MostProfitableDay } from "./MostProfitableDay";
import { FleetStatus } from "./FleetStatus";
import { MaintenanceLog } from "./MaintenanceLog";
import { FuelEfficiency } from "./FuelEfficiency";
import { OperationalAlerts } from "./OperationalAlerts";
import { MiniCharts } from "./MiniCharts";
import { 
  getDashboardMetrics, 
  formatDate, 
  formatTonnage, 
  formatPercent 
} from "../lib/dashboard";
import type { DashboardSummary } from "../utils/types";
import { FilterBar } from "./FilterBar";

type DashboardProps = {
  dashboardData: DashboardSummary;
  formatCurrency: (value: number) => string;
  formatCompactNumber: (value: number) => string;
  onSelectDriver: (driverLabel: string) => void;
  uiConfig: any;
  expenseRecords?: any[];
  incomeRecords?: any[];
  documentRecords?: any[];
  selectedYear: string;
  onDateSelect?: (date: string) => void;
  onReset?: () => void;
  isDateFiltered?: boolean;
  filteredData?: any[];
  calendarData?: any[];
  globalMonth?: string;
  onMonthChange?: (month: string) => void;
  filterProps?: any;
  maintenanceRecords?: any[];
};

const DEFAULT_ORDER = ['top_gps', 'middle', 'controls', 'fleet', 'operational', 'archives'];

export function Dashboard({
  dashboardData,
  formatCurrency,
  formatCompactNumber,
  onSelectDriver,
  uiConfig,
  expenseRecords = [],
  incomeRecords = [],
  documentRecords = [],
  selectedYear,
  onDateSelect,
  onReset,
  isDateFiltered,
  filteredData = [],
  calendarData = [],
  globalMonth,
  onMonthChange,
  filterProps,
  maintenanceRecords = []
}: DashboardProps) {

  const [isEditMode, setIsEditMode] = useState(false);
  const [blocksOrder, setBlocksOrder] = useState(DEFAULT_ORDER);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const metrics = getDashboardMetrics(filteredData);

  const financeStats = useMemo(() => {
    const tonnage = filteredData.reduce((s, r) => s + (r.tonnage || 0), 0);
    const fuel = filteredData.reduce((s, r) => s + (r.fuel_cost_cfa || 0), 0);
    const roadFees = filteredData.reduce((s, r) => s + (r.road_fees_cfa || 0), 0);
    const revenue = tonnage * 8000;
    const netProfit = revenue - (fuel + roadFees);
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { tonnage, fuel, roadFees, revenue, netProfit, margin };
  }, [filteredData]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;
    const items = [...blocksOrder];
    const fromIndex = items.indexOf(draggedId);
    const toIndex = items.indexOf(id);
    items.splice(fromIndex, 1);
    items.splice(toIndex, 0, draggedId);
    setBlocksOrder(items);
  };

  const renderBlock = (id: string) => {
    switch (id) {
      case 'top_gps':
        return (
          <div key="top_gps" className="w-full h-full min-h-[300px] md:min-h-[400px] mb-6">
            <FleetTrackerWidget records={filteredData} />
          </div>
        );

      case 'middle':
        return (
          <div key="middle" className="grid grid-cols-1 xl:grid-cols-[max-content_1fr] gap-6 items-stretch mb-6">
            <div className="flex flex-col md:flex-row gap-4 bg-[#181818] rounded-2xl md:rounded-[30px] border border-white/5 shadow-2xl p-4 w-full xl:w-max h-full items-center">
              <div className="w-full md:w-auto overflow-x-auto">
                <LogisticsCalendar 
                  records={calendarData} 
                  onDateSelect={onDateSelect}
                  onReset={onReset}
                  isDateFiltered={isDateFiltered}
                  globalMonth={globalMonth}
                  onMonthChange={onMonthChange}
                />
              </div>
              <div className="hidden md:block w-px h-[200px] bg-white/5 mx-4"></div>
              <div className="md:hidden w-full h-px bg-white/5 my-2"></div>
              <div className="w-full md:w-fit flex flex-col justify-between py-2 min-h-[200px] md:min-h-[250px]">
                <div>
                  <h4 className="text-[10px] text-white/40 uppercase font-bold tracking-widest text-center md:text-left">FINANCE & FUEL</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 md:mt-6">
                    <div className="relative shrink-0 size-24 md:size-28 rounded-full border-[6px] border-[#cf5d56]/20 border-l-[#cf5d56] flex flex-col items-center justify-center">
                      <span className="text-xl md:text-2xl font-black text-white">{formatCompactNumber(financeStats.tonnage)}</span>
                      <span className="text-[9px] text-white/40 uppercase mt-1 text-center leading-none">TONNES</span>
                    </div>
                    <div className="flex flex-col gap-3 md:gap-4 w-full">
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <Banknote className="size-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[9px] text-white/40 uppercase font-bold tracking-tighter">REVENU (TX 8K)</p>
                          <p className="text-xs font-bold text-white">{formatCurrency(financeStats.revenue)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                          <Fuel className="size-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[9px] text-white/40 uppercase font-bold tracking-tighter">CONSOMMATION FUEL</p>
                          <p className="text-xs font-bold text-white">{formatCurrency(financeStats.fuel)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-md bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                          <ReceiptText className="size-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[9px] text-white/40 uppercase font-bold tracking-tighter">FRAIS & DIVERS</p>
                          <p className="text-xs font-bold text-white">{formatCurrency(financeStats.roadFees)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 md:mt-8 pt-4 border-t border-white/5 flex justify-between items-end gap-6 md:gap-12">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">BÉNÉFICE NET</span>
                  <span className="text-base md:text-lg font-black text-white">{formatCurrency(financeStats.netProfit)}</span>
                </div>
              </div>
            </div>
            <div className="h-full w-full"> 
              <MiniCharts records={filteredData} />
            </div>
          </div>
        );

      case 'controls':
        return (
          <div key="controls" className="w-full mb-6">
            {filterProps && <FilterBar {...filterProps} />}
          </div>
        );

      case 'fleet':
        return (
          <div key="fleet" className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 items-stretch mb-6">
            <section className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white shadow-xl xl:p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">Fleet by driver</h3>
                  <p className="mt-1 text-sm text-white/46">Clique sur une carte pour basculer vers la vue chauffeur.</p>
                </div>
                <div className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-sm text-white/48">Vue dynamique</div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {dashboardData.byDriver.map((driver) => (
                  <button
                    key={driver.driverLabel}
                    type="button"
                    onClick={() => onSelectDriver(driver.driverLabel)}
                    className="panel-enter rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(207,93,86,0.18),transparent_38%),linear-gradient(180deg,#1a1818_0%,#111111_100%)] p-5 text-left shadow-lg transition hover:-translate-y-1.5 hover:border-[#cf5d56]/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[#cf5d56]">{driver.sdv}</p>
                        <h4 className="mt-2 text-xl font-semibold tracking-tight text-white">{driver.chauffeur}</h4>
                      </div>
                      <ArrowUpRight className="size-5 text-[#cf5d56]" />
                    </div>
                    <div className="mt-5 grid gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Bénéfice</p>
                          <p className="mt-1 text-base font-semibold text-[#9fe3b9]">{formatCurrency(driver.totalProfit)}</p>
                        </div>
                        <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                          <p className="text-[10px] text-white/40 uppercase font-bold">Tonnage</p>
                          <p className="mt-1 text-base font-semibold text-white">{formatCompactNumber(driver.totalTonnage)} T</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <FleetStatus 
              totalTrips={metrics.totalTrips} 
              activeDays={metrics.activeDays} 
              profitableTrips={metrics.profitableTrips} 
              driverLabel={dashboardData.chauffeur} 
              profitMargin={formatPercent(financeStats.margin)}
            />
          </div>
        );

      case 'operational':
        return (
          <div key="operational" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 min-h-[400px]">
            <MaintenanceLog records={maintenanceRecords} />
            <FuelEfficiency records={filteredData} />
            <OperationalAlerts records={filteredData} />
          </div>
        );

      case 'archives':
        return (
          <div key="archives" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight text-white">Archives des trajets</h3>
            </div>
            <TransportTable
              rows={filteredData}
              formatCurrency={formatCurrency}
              formatTonnage={formatTonnage}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="absolute -top-12 right-0 flex items-center gap-3">
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-lg ${
            isEditMode ? "bg-[#61d2c0] text-black" : "bg-[#cf5d56] text-white"
          }`}
        >
          {isEditMode ? <Check className="size-3" /> : <Layout className="size-3" />}
          {isEditMode ? "Terminer" : "Modifier l'écran"}
        </button>
      </div>

      {blocksOrder.map((blockId) => (
        <div
          key={blockId}
          draggable={isEditMode}
          onDragStart={(e) => handleDragStart(e, blockId)}
          onDragOver={(e) => handleDragOver(e, blockId)}
          className={`relative transition-all duration-300 ${isEditMode ? 'opacity-50 cursor-grab' : ''}`}
        >
          {renderBlock(blockId)}
        </div>
      ))}
    </div>
  );
}

function TransportTable({ rows, formatCurrency, formatTonnage }: any) {
  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Chauffeur</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Destination</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Tonnage</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Bénéfice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.slice(0, 10).map((row: any) => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-white/70">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-6 py-4 text-xs font-black text-[#cf5d56]">{row.chauffeur}</td>
                <td className="px-6 py-4 text-xs text-white/50">{row.destination}</td>
                <td className="px-6 py-4 text-xs font-mono text-white/40">{formatTonnage(row.tonnage)}</td>
                <td className="px-6 py-4 text-xs font-black text-[#9fe3b9] text-right">{formatCurrency(row.total_net_cfa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
