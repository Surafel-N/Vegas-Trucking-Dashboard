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
import { 
  getDashboardMetrics, 
  formatDate, 
  formatTonnage, 
  formatPercent 
} from "../lib/dashboard";
import type { DashboardSummary } from "../utils/types";

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
};

const DEFAULT_ORDER = ['fleet', 'insights', 'stats', 'middle', 'archives'];

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
  onMonthChange
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

  const isWidgetEnabled = (id: string) => {
    return uiConfig?.widgets?.find((w: any) => w.id === id)?.enabled !== false;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;

    const newOrder = [...blocksOrder];
    const draggedIdx = newOrder.indexOf(draggedId);
    const targetIdx = newOrder.indexOf(id);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    setBlocksOrder(newOrder);
  };

  const kpiMap = {
    profit: {
      id: "profit",
      label: "Total Bénéfice",
      value: formatCurrency(dashboardData.global.totalProfit),
      helper: "Marge nette totale sur la période",
      tone: "green" as const,
    },
    tonnage: {
      id: "tonnage",
      label: "Tonnage Total",
      value: `${formatCompactNumber(dashboardData.global.totalTonnage)} T`,
      helper: "Cumul du tonnage transporté",
      tone: "indigo" as const,
    },
    costs: {
      id: "costs",
      label: "Total dépenses",
      value: formatCurrency(dashboardData.global.totalExpense),
      helper: "Somme de toutes les dépenses visibles",
      tone: "red" as const,
    },
    revenue: {
      id: "revenue",
      label: "Total Revenu",
      value: formatCurrency(dashboardData.global.totalRevenue),
      helper: "Somme du total brut",
      tone: "teal" as const,
    },
    voyages: {
      id: "voyages",
      label: "Total Voyages",
      value: `${dashboardData.global.totalVoyages}`,
      helper: "Nombre de chargements effectifs (Tonnage > 0)",
      tone: "indigo" as const,
    },
  };

  const activeKpis = (uiConfig?.widgets || [])
    .filter((w: any) => w.enabled && kpiMap[w.id as keyof typeof kpiMap])
    .map((w: any) => kpiMap[w.id as keyof typeof kpiMap]);

  const renderBlock = (id: string) => {
    switch (id) {
      case 'stats':
        return (
          <section key="stats" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeKpis.map((card) => (
              <KpiCard key={card.id} {...card} />
            ))}
          </section>
        );
      case 'middle':
        return (
          <div key="middle" className="grid grid-cols-1 xl:grid-cols-[max-content_1fr] gap-6 items-stretch my-6">
            {/* ÉTAPE 3 : LE SUPER-BLOC GAUCHE (Calendrier + Finance Intégrée iOS) */}
            <div className="flex flex-col md:flex-row gap-4 bg-[#181818] rounded-2xl md:rounded-[30px] border border-white/5 shadow-2xl p-4 w-full xl:w-max h-full items-center">
              {/* À GAUCHE du Super-Bloc : LogisticsCalendar */}
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

              {/* AU MILIEU du Super-Bloc : Séparateur vertical discret */}
              <div className="hidden md:block w-px h-[200px] bg-white/5 mx-4"></div>
              {/* Séparateur horizontal pour mobile */}
              <div className="md:hidden w-full h-px bg-white/5 my-2"></div>

              {/* À DROITE du Super-Bloc (Moteur de calcul intégré style iOS) */}
              <div className="w-full md:w-fit flex flex-col justify-between py-2 min-h-[200px] md:min-h-[250px]">
                <div>
                  <h4 className="text-[10px] text-white/40 uppercase font-bold tracking-widest text-center md:text-left">FINANCE & FUEL</h4>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6 mt-4 md:mt-6">
                    {/* Le Cercle (Gauche) */}
                    <div className="relative shrink-0 size-24 md:size-28 rounded-full border-[6px] border-[#cf5d56]/20 border-l-[#cf5d56] flex flex-col items-center justify-center">
                      <span className="text-xl md:text-2xl font-black text-white">{formatCompactNumber(financeStats.tonnage)}</span>
                      <span className="text-[9px] text-white/40 uppercase mt-1 text-center leading-none">TONNES</span>
                    </div>

                    {/* La Liste (Droite) */}
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

                {/* Footer */}
                <div className="mt-6 md:mt-8 pt-4 border-t border-white/5 flex justify-between items-end gap-6 md:gap-12">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">BÉNÉFICE NET</span>
                  <span className="text-base md:text-lg font-black text-white">{formatCurrency(financeStats.netProfit)}</span>
                </div>
              </div>
            </div>

            {/* ÉTAPE 4 : LE BLOC DROITE (Carte GPS Étendue) */}
            <div className="h-full w-full min-h-[350px] md:min-h-[500px]"> 
              <FleetTrackerWidget records={filteredData} /> 
            </div>
          </div>
        );

      case 'fleet':
        return (
          <section key="fleet" className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white shadow-[0_32px_80px_-48px_rgba(0,0,0,0.92)] xl:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">Fleet by driver</h3>
                <p className="mt-1 text-sm text-white/46">Clique sur une carte pour basculer directement vers la vue chauffeur.</p>
              </div>
              <div className="rounded-full border border-white/8 bg-white/4 px-3 py-2 text-sm text-white/48">Vue dashboard par défaut</div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {dashboardData.byDriver.map((driver) => (
                <button
                  key={driver.driverLabel}
                  type="button"
                  onClick={() => onSelectDriver(driver.driverLabel)}
                  className="panel-enter rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(207,93,86,0.18),transparent_38%),linear-gradient(180deg,#1a1818_0%,#111111_100%)] p-5 text-left shadow-[0_30px_70px_-48px_rgba(0,0,0,0.95)] transition hover:-translate-y-1.5 hover:border-[#cf5d56]/30 hover:shadow-[0_34px_80px_-44px_rgba(207,93,86,0.3)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-[#cf5d56]">{driver.sdv}</p>
                      <h4 className="mt-2 text-2xl font-semibold tracking-tight text-white">{driver.chauffeur}</h4>
                    </div>
                    <ArrowUpRight className="size-5 text-[#cf5d56]" />
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/46">
                          <Banknote className="size-4 text-[#61d2c0]" />
                          Bénéfice
                        </div>
                        <p className="mt-2 text-lg font-semibold text-[#9fe3b9]">{formatCurrency(driver.totalProfit)}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/46">
                          <Weight className="size-4 text-indigo-400" />
                          Tonnage
                        </div>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCompactNumber(driver.totalTonnage)} T</p>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/46">
                        <Wallet className="size-4 text-[#ff8f84]" />
                        Dépenses
                      </div>
                      <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(driver.totalExpense)}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/46">
                          <Fuel className="size-4 text-[#61d2c0]" />
                          Fuel
                        </div>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(driver.totalFuel)}</p>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-black/24 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/46">
                          <ReceiptText className="size-4 text-[#ffaf66]" />
                          Frais route
                        </div>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(driver.totalRoadFees)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white/54">
                      <span>{formatCompactNumber(driver.entryCount)} entrées</span>
                      {isWidgetEnabled("voyages") && (
                        <span className="font-medium text-indigo-400">{driver.totalVoyages} voyages</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      case 'insights':
        return (
          <div key="insights" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {metrics.mostProfitableDay && (
              <div className="xl:col-span-2">
                <MostProfitableDay 
                  day={metrics.mostProfitableDay} 
                  formatCurrency={formatCurrency} 
                  formatDate={formatDate} 
                  formatTonnage={formatTonnage} 
                />
              </div>
            )}
            
            <FleetStatus 
              totalTrips={metrics.totalVoyages}
              activeDays={metrics.activeDays}
              profitableTrips={metrics.profitableTrips}
              driverLabel={dashboardData.allTrips.length > 0 && (new Set(dashboardData.allTrips.map(r => r.driverLabel))).size === 1 
                ? dashboardData.allTrips[0].driverLabel 
                : "Performance Globale"}
              profitMargin={formatPercent(metrics.profitMargin)}
            />
          </div>
        );
      case 'archives':
        return (
          <div key="archives">
            {isWidgetEnabled("expenses") && (
              <div className="rounded-[30px] border border-white/7 bg-[#171717] p-8 text-white shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#cf5d56]/10 text-[#cf5d56]">
                      <Cloud className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">Archives Cloud Dépenses</h3>
                      <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Justificatifs & Factures</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Total Archivé</p>
                    <p className="text-2xl font-black text-[#ff8f84]">{formatCurrency(expenseRecords.reduce((s, r) => s + (r.amount || 0), 0))}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expenseRecords.slice(0, 6).map((r) => (
                    <a 
                      key={r.id} 
                      href={r.driveLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className={`flex items-center justify-between p-4 rounded-[22px] bg-white/[0.02] border border-white/5 transition-all hover:bg-[#cf5d56]/10 hover:border-[#cf5d56]/30 ${r.driveLink ? 'cursor-pointer' : 'pointer-events-none opacity-50'}`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-white/80 font-bold text-xs">{r.date}</span>
                        <span className="truncate max-w-[180px] text-white/30 text-[10px] uppercase tracking-wider font-medium">{r.category} • {r.subCategory}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-[#ff8f84]">{formatCurrency(r.amount)}</span>
                        {r.driveLink && <ExternalLink className="size-4 text-white/20" />}
                      </div>
                    </a>
                  ))}
                  {!expenseRecords.length && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-white/10 gap-3">
                      <Wallet className="size-12" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Aucun justificatif archivé</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <style>{`
        @keyframes jiggle { 0% { transform: rotate(-1deg); } 50% { transform: rotate(1.5deg); } 100% { transform: rotate(-1deg); } }
        .animate-jiggle { animation: jiggle 0.3s infinite; }
      `}</style>

      {/* Barre d'outils de personnalisation */}
      <div className="absolute -top-12 right-0 flex items-center gap-3">
        {isEditMode && (
          <button 
            onClick={() => setBlocksOrder(DEFAULT_ORDER)}
            className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-bold text-white/60 transition-all hover:bg-white/10"
          >
            <RotateCcw className="size-3" />
            Réinitialiser l'ordre
          </button>
        )}
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-lg ${
            isEditMode 
            ? "bg-[#61d2c0] text-black hover:bg-[#52b5a5]" 
            : "bg-[#cf5d56] text-white hover:bg-[#b8524c]"
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
          className={`relative transition-all duration-300 ${isEditMode ? 'animate-jiggle cursor-grab active:cursor-grabbing' : ''}`}
        >
          {isEditMode && (
            <div className="absolute inset-0 z-50 bg-black/5 backdrop-blur-[1px] rounded-[30px] border-2 border-dashed border-[#cf5d56]/20"></div>
          )}
          {renderBlock(blockId)}
        </div>
      ))}
    </div>
  );
}
