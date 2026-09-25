import { useState, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Package, 
  Zap, 
  BarChart3, 
  Award, 
  Truck, 
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  Filter
} from 'lucide-react';

export type MiniChartsProps = {
  records: any[];
  formatCurrency?: (val: number, curr?: string) => string;
  currency?: string;
  t?: any;
};

// --- CONFIGURATION OFFICIELLE DES CHAUFFEURS ---
export const DRIVER_CONFIG = [
  {
    key: "AMARA",
    label: "AMARA TRUCK 76",
    shortName: "AMARA",
    unit: "76",
    plate: "AA-672-PS",
    color: "#3B82F6", // Bleu Royal
    lightColor: "#93C5FD",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400"
  },
  {
    key: "BRAHIMA",
    label: "BRAHIMA TRUCK 45",
    shortName: "BRAHIMA",
    unit: "45",
    plate: "AA-736-PK",
    color: "#10B981", // Vert Émeraude
    lightColor: "#6EE7B7",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400"
  },
  {
    key: "SORO",
    label: "SORO TRUCK 52",
    shortName: "SORO",
    unit: "52",
    plate: "AA-579-PJ",
    color: "#CF5D56", // Rouge Corail
    lightColor: "#FCA5A5",
    bg: "bg-[#cf5d56]/10",
    border: "border-[#cf5d56]/30",
    text: "text-[#cf5d56]"
  }
];

function getDriverKey(record: any): "AMARA" | "BRAHIMA" | "SORO" | null {
  const lbl = String(record?.driverLabel || record?.chauffeur || "").toUpperCase();
  if (lbl.includes("AMARA") || lbl.includes("76")) return "AMARA";
  if (lbl.includes("BRAHIMA") || lbl.includes("45")) return "BRAHIMA";
  if (lbl.includes("SORO") || lbl.includes("SORRO") || lbl.includes("52")) return "SORO";
  return null;
}

export function MiniCharts({ 
  records = [], 
  formatCurrency, 
  currency = "CFA",
  t 
}: MiniChartsProps) {
  // États de sélection pour Performance Analytique
  const [metric, setMetric] = useState<"net" | "gross" | "tonnage">("net");
  const [viewMode, setViewMode] = useState<"compare" | "timeline">("compare");
  
  // Nouveaux états de clarté pour l'ÉVOLUTION
  const [evolutionGranularity, setEvolutionGranularity] = useState<"month" | "week" | "day" | "cumulative">("month");
  const [evolutionChartType, setEvolutionChartType] = useState<"bar" | "line">("bar");
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>("ALL");

  const locale = t?.months?.[0] === "January" ? "en-US" : "fr-FR";

  // Formatage monétaire rapide
  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${new Intl.NumberFormat(locale).format(Math.round(val))} ${currency}`;
  };

  const formatCompact = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return String(Math.round(val));
  };

  // --- 1. CALCULS MODULE VOLUME FLOTTE ---
  const volumeData = useMemo(() => {
    const list = DRIVER_CONFIG.map(cfg => {
      const driverTrips = records.filter(r => getDriverKey(r) === cfg.key);
      const tonnage = driverTrips.reduce((acc, r) => acc + (Number(r.tonnage) || 0), 0);
      const tripsCount = driverTrips.length;
      const avgTonnage = tripsCount > 0 ? tonnage / tripsCount : 0;

      return {
        key: cfg.key,
        name: `${cfg.shortName} (${cfg.unit})`,
        shortName: cfg.shortName,
        unit: cfg.unit,
        tonnage: Math.round(tonnage * 10) / 10,
        tripsCount,
        avgTonnage: Math.round(avgTonnage * 10) / 10,
        color: cfg.color,
        lightColor: cfg.lightColor,
        bg: cfg.bg,
        border: cfg.border,
        text: cfg.text
      };
    });

    const totalTonnage = list.reduce((acc, d) => acc + d.tonnage, 0);
    const totalTrips = list.reduce((acc, d) => acc + d.tripsCount, 0);

    const withShare = list.map(d => ({
      ...d,
      share: totalTonnage > 0 ? (d.tonnage / totalTonnage) * 100 : 0
    }));

    return { list: withShare, totalTonnage, totalTrips };
  }, [records]);

  // --- 2. CALCULS MODULE PERFORMANCE ANALYTIQUE (COMPARATIF PAR CHAUFFEUR) ---
  const driverPerformance = useMemo(() => {
    const perfList = DRIVER_CONFIG.map(cfg => {
      const driverTrips = records.filter(r => getDriverKey(r) === cfg.key);
      const gross = driverTrips.reduce((acc, r) => acc + (Number(r.total_gross_cfa) || 0), 0);
      const expenses = driverTrips.reduce((acc, r) => acc + (Number(r.total_expense_cfa) || 0), 0);
      const net = driverTrips.reduce((acc, r) => acc + (Number(r.total_net_cfa) || 0), 0);
      const tonnage = driverTrips.reduce((acc, r) => acc + (Number(r.tonnage) || 0), 0);
      const margin = gross > 0 ? (net / gross) * 100 : 0;

      return {
        key: cfg.key,
        name: `${cfg.shortName} (${cfg.unit})`,
        shortName: cfg.shortName,
        unit: cfg.unit,
        plate: cfg.plate,
        gross: Math.round(gross),
        expenses: Math.round(expenses),
        net: Math.round(net),
        tonnage: Math.round(tonnage * 10) / 10,
        margin: Math.round(margin * 10) / 10,
        color: cfg.color,
        bg: cfg.bg,
        border: cfg.border,
        text: cfg.text
      };
    });

    const topNetDriver = [...perfList].sort((a, b) => b.net - a.net)[0]?.key;
    return { list: perfList, topNetDriver };
  }, [records]);

  // Données pour le bar chart comparatif
  const compareChartData = useMemo(() => {
    return driverPerformance.list.map(d => {
      let value = 0;
      let label = "";
      if (metric === "net") {
        value = d.net;
        label = formatCompact(d.net) + ` ${currency}`;
      } else if (metric === "gross") {
        value = d.gross;
        label = formatCompact(d.gross) + ` ${currency}`;
      } else {
        value = d.tonnage;
        label = `${d.tonnage} T`;
      }

      return {
        key: d.key,
        name: `${d.shortName} (${d.unit})`,
        shortName: d.shortName,
        unit: d.unit,
        value,
        displayLabel: label,
        color: d.color,
        gross: d.gross,
        expenses: d.expenses,
        net: d.net,
        tonnage: d.tonnage,
        margin: d.margin
      };
    });
  }, [driverPerformance, metric, currency]);

  // --- 3. CALCULS MODULE ÉVOLUTION TEMPORELLE HAUTE LISIBILITÉ ---
  const evolutionData = useMemo(() => {
    const sorted = [...records].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (sorted.length === 0) return [];

    const getVal = (r: any) => {
      if (metric === "net") return Number(r.total_net_cfa) || 0;
      if (metric === "gross") return Number(r.total_gross_cfa) || 0;
      return Number(r.tonnage) || 0;
    };

    // A. Évolution Mensuelle (Par Mois)
    if (evolutionGranularity === "month") {
      const monthMap = new Map<string, { label: string; periodTitle: string; AMARA: number; BRAHIMA: number; SORO: number; total: number }>();
      
      sorted.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthShort = d.toLocaleDateString(locale, { month: 'short' });
        const label = `${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)} ${String(d.getFullYear()).slice(-2)}`;
        const periodTitle = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

        if (!monthMap.has(mKey)) {
          monthMap.set(mKey, { label, periodTitle, AMARA: 0, BRAHIMA: 0, SORO: 0, total: 0 });
        }

        const entry = monthMap.get(mKey)!;
        const driverKey = getDriverKey(r);
        const val = getVal(r);
        if (driverKey === "AMARA") entry.AMARA += val;
        else if (driverKey === "BRAHIMA") entry.BRAHIMA += val;
        else if (driverKey === "SORO") entry.SORO += val;
        entry.total += val;
      });

      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => ({
          key: k,
          label: v.label,
          periodTitle: v.periodTitle,
          AMARA: Math.round(v.AMARA),
          BRAHIMA: Math.round(v.BRAHIMA),
          SORO: Math.round(v.SORO),
          total: Math.round(v.total)
        }));
    }

    // B. Évolution Hebdomadaire (Par Semaine)
    if (evolutionGranularity === "week") {
      const weekMap = new Map<string, { label: string; periodTitle: string; AMARA: number; BRAHIMA: number; SORO: number; total: number }>();

      sorted.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
        }
        const weekNo = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
        const wKey = `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        
        const monday = new Date(d);
        monday.setDate(d.getDate() - dayNr);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const periodTitle = `Semaine ${weekNo} (${monday.getDate()}/${monday.getMonth()+1} - ${sunday.getDate()}/${sunday.getMonth()+1})`;

        if (!weekMap.has(wKey)) {
          weekMap.set(wKey, { label: `S${weekNo}`, periodTitle, AMARA: 0, BRAHIMA: 0, SORO: 0, total: 0 });
        }

        const entry = weekMap.get(wKey)!;
        const driverKey = getDriverKey(r);
        const val = getVal(r);
        if (driverKey === "AMARA") entry.AMARA += val;
        else if (driverKey === "BRAHIMA") entry.BRAHIMA += val;
        else if (driverKey === "SORO") entry.SORO += val;
        entry.total += val;
      });

      return Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => ({
          key: k,
          label: v.label,
          periodTitle: v.periodTitle,
          AMARA: Math.round(v.AMARA),
          BRAHIMA: Math.round(v.BRAHIMA),
          SORO: Math.round(v.SORO),
          total: Math.round(v.total)
        }));
    }

    // C. Évolution Quotidienne (Par Date)
    if (evolutionGranularity === "day") {
      const dayMap = new Map<string, { label: string; periodTitle: string; AMARA: number; BRAHIMA: number; SORO: number; total: number }>();

      sorted.forEach(r => {
        if (!r.date) return;
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        const dayKey = r.date;
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const periodTitle = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, { label, periodTitle, AMARA: 0, BRAHIMA: 0, SORO: 0, total: 0 });
        }

        const entry = dayMap.get(dayKey)!;
        const driverKey = getDriverKey(r);
        const val = getVal(r);
        if (driverKey === "AMARA") entry.AMARA += val;
        else if (driverKey === "BRAHIMA") entry.BRAHIMA += val;
        else if (driverKey === "SORO") entry.SORO += val;
        entry.total += val;
      });

      return Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => ({
          key: k,
          label: v.label,
          periodTitle: v.periodTitle,
          AMARA: Math.round(v.AMARA),
          BRAHIMA: Math.round(v.BRAHIMA),
          SORO: Math.round(v.SORO),
          total: Math.round(v.total)
        }));
    }

    // D. Progression Cumulée (Croissance au fil du temps)
    let amaraRunning = 0;
    let brahimaRunning = 0;
    let soroRunning = 0;

    const dayMap = new Map<string, { label: string; periodTitle: string; AMARA: number; BRAHIMA: number; SORO: number }>();
    sorted.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return;
      const dayKey = r.date;
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const periodTitle = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { label, periodTitle, AMARA: 0, BRAHIMA: 0, SORO: 0 });
      }
      const entry = dayMap.get(dayKey)!;
      const driverKey = getDriverKey(r);
      const val = getVal(r);
      if (driverKey === "AMARA") entry.AMARA += val;
      else if (driverKey === "BRAHIMA") entry.BRAHIMA += val;
      else if (driverKey === "SORO") entry.SORO += val;
    });

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        amaraRunning += v.AMARA;
        brahimaRunning += v.BRAHIMA;
        soroRunning += v.SORO;
        return {
          key: k,
          label: v.label,
          periodTitle: `Cumul au ${v.periodTitle}`,
          AMARA: Math.round(amaraRunning),
          BRAHIMA: Math.round(brahimaRunning),
          SORO: Math.round(soroRunning),
          total: Math.round(amaraRunning + brahimaRunning + soroRunning)
        };
      });
  }, [records, metric, evolutionGranularity, locale]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full h-full">
      
      {/* ======================================================== */}
      {/* 1. CARTE GAUCHE : VOLUME FLOTTE (TONNAGE PAR CHAUFFEUR) */}
      {/* ======================================================== */}
      <div className="xl:col-span-4 panel-enter rounded-[28px] border border-white/10 bg-[#1c1c1e] p-5 shadow-2xl flex flex-col justify-between">
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Package className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {t?.fleetVolume || "Volume Flotte"}
                </h4>
                <p className="text-[10px] text-white/40">Tonnage réel par véhicule</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase text-white/40 block leading-tight">Total Flotte</span>
              <span className="text-sm font-black font-mono text-cyan-400">
                {volumeData.totalTonnage.toLocaleString(locale)} <span className="text-[10px] text-white/40 font-sans">T</span>
              </span>
            </div>
          </div>

          <div className="h-[170px] w-full min-w-0 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData.list} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                  unit="T"
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#141414] border border-white/10 p-3 rounded-2xl shadow-2xl text-xs space-y-1.5 min-w-[170px]">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="font-black text-white">{d.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/70">
                          <span>Tonnage :</span>
                          <span className="font-mono font-black text-white">{d.tonnage} T</span>
                        </div>
                        <div className="flex justify-between items-center text-white/70">
                          <span>Part flotte :</span>
                          <span className="font-mono font-bold text-cyan-400">{d.share.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center text-white/70">
                          <span>Voyages :</span>
                          <span className="font-mono text-white/90">{d.tripsCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-white/70">
                          <span>Moyenne/voyage :</span>
                          <span className="font-mono text-white/90">{d.avgTonnage} T</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey="tonnage" 
                  radius={[8, 8, 4, 4]} 
                  barSize={38}
                  label={{ 
                    position: 'top', 
                    fill: '#ffffff', 
                    fontSize: 10, 
                    fontWeight: 800,
                    formatter: (val: number) => `${val} T`
                  }}
                >
                  {volumeData.list.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-white/5">
          <div>
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-white/40 mb-1.5">
              <span>Répartition de Charge</span>
              <span>100% Flotte</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden flex p-0.5 border border-white/5 gap-0.5">
              {volumeData.list.map(d => (
                <div 
                  key={d.key} 
                  className="h-full rounded-sm transition-all duration-1000"
                  style={{ width: `${d.share}%`, backgroundColor: d.color }}
                  title={`${d.shortName}: ${d.share.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {volumeData.list.map(d => (
              <div 
                key={d.key} 
                className={`p-2.5 rounded-xl border ${d.border} ${d.bg} flex flex-col justify-between`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-black text-white truncate">{d.shortName}</span>
                </div>
                <div>
                  <span className="text-xs font-mono font-black text-white">{d.tonnage}T</span>
                  <p className="text-[9px] font-bold text-white/40">{d.share.toFixed(0)}% • {d.tripsCount} v.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. CARTE DROITE : PERFORMANCE ANALYTIQUE (MULTI-VUES)     */}
      {/* ======================================================== */}
      <div className="xl:col-span-8 panel-enter rounded-[28px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl flex flex-col justify-between">
        
        <div>
          {/* En-tête Principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-tight uppercase">
                    {t?.analyticalPerformance || "Performance Analytique"}
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                    Par Chauffeur
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Comparaison financière et rentabilité avec codes couleurs dédiés
                </p>
              </div>
            </div>

            {/* Sélecteurs : Vue & Métrique */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Sélecteur de Métrique */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setMetric("net")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    metric === "net" 
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20" 
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Bénéfice Net
                </button>
                <button
                  onClick={() => setMetric("gross")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    metric === "gross" 
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  C.A. Brut
                </button>
                <button
                  onClick={() => setMetric("tonnage")}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    metric === "tonnage" 
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" 
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  Tonnage
                </button>
              </div>

              {/* Sélecteur de Vue (Comparatif vs Évolution) */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setViewMode("compare")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === "compare" 
                      ? "bg-white/15 text-white" 
                      : "text-white/40 hover:text-white"
                  }`}
                  title="Vue Comparatif par Chauffeur"
                >
                  <BarChart3 className="size-3" />
                  <span>Comparatif</span>
                </button>
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === "timeline" 
                      ? "bg-white/15 text-white" 
                      : "text-white/40 hover:text-white"
                  }`}
                  title="Vue Évolution Temporelle"
                >
                  <TrendingUp className="size-3" />
                  <span>Évolution</span>
                </button>
              </div>

            </div>

          </div>

          {/* SOUS-BARRE DE CONTRÔLE D'ÉVOLUTION (SI EN MODE ÉVOLUTION) */}
          {viewMode === "timeline" && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-black/40 border border-white/5 mb-3 animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/40 px-1">Fréquence :</span>
                <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setEvolutionGranularity("month")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      evolutionGranularity === "month" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Par Mois
                  </button>
                  <button
                    onClick={() => setEvolutionGranularity("week")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      evolutionGranularity === "week" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Par Semaine
                  </button>
                  <button
                    onClick={() => setEvolutionGranularity("day")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      evolutionGranularity === "day" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Par Date
                  </button>
                  <button
                    onClick={() => setEvolutionGranularity("cumulative")}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      evolutionGranularity === "cumulative" ? "bg-cyan-500/20 text-cyan-300" : "text-white/40 hover:text-white"
                    }`}
                  >
                    Cumulatif
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/40 px-1">Format :</span>
                <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setEvolutionChartType("bar")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                      evolutionChartType === "bar" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="size-2.5" /> Barres
                  </button>
                  <button
                    onClick={() => setEvolutionChartType("line")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                      evolutionChartType === "line" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <TrendingUp className="size-2.5" /> Courbes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ZONE DU GRAPHIQUE SELON LA VUE SÉLECTIONNÉE */}
          <div className="h-[230px] w-full min-w-0 my-1">
            
            {/* VUE 1 : COMPARATIF PAR CHAUFFEUR (BAR CHART NET ET ÉPURÉ) */}
            {viewMode === "compare" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareChartData} margin={{ top: 25, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 800 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[200px]">
                          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <div className="size-3 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="font-black text-white">{d.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-white/40">{d.unit}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-white/70">
                              <span>Chiffre d'Affaires :</span>
                              <span className="font-mono font-bold text-white">{formatMoney(d.gross)}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/70">
                              <span>Dépenses Totales :</span>
                              <span className="font-mono text-red-400">-{formatMoney(d.expenses)}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/90 pt-1 border-t border-white/5 font-black">
                              <span>Bénéfice Net :</span>
                              <span className="font-mono text-emerald-400">{formatMoney(d.net)}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/60">
                              <span>Marge Nette :</span>
                              <span className="font-mono text-cyan-400 font-bold">{d.margin}%</span>
                            </div>
                            <div className="flex justify-between items-center text-white/60">
                              <span>Volume Tonnage :</span>
                              <span className="font-mono text-white/90">{d.tonnage} T</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[10, 10, 4, 4]} 
                    barSize={54}
                    label={{ 
                      position: 'top', 
                      fill: '#ffffff', 
                      fontSize: 11, 
                      fontWeight: 800,
                      formatter: (val: number) => metric === "tonnage" ? `${val} T` : `${formatCompact(val)} ${currency}`
                    }}
                  >
                    {compareChartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* VUE 2 : ÉVOLUTION HAUTE LISIBILITÉ EN BARRES GROUPÉES */}
            {viewMode === "timeline" && evolutionChartType === "bar" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData} margin={{ top: 20, right: 15, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const periodObj = payload[0]?.payload;
                      return (
                        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[210px]">
                          <div className="pb-1.5 border-b border-white/10 flex items-center justify-between">
                            <span className="font-black text-white">{periodObj?.periodTitle || label}</span>
                            <span className="text-[10px] text-white/40 font-mono">
                              Total: {metric === "tonnage" ? `${periodObj?.total} T` : formatCompact(periodObj?.total)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {payload.map((p: any) => (
                              <div key={p.dataKey} className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <div className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="text-white/80 font-bold">{p.name} :</span>
                                </div>
                                <span className="font-mono font-black text-white">
                                  {metric === "tonnage" ? `${p.value} T` : formatMoney(p.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "AMARA") && (
                    <Bar 
                      dataKey="AMARA" 
                      name="AMARA (76)" 
                      fill="#3B82F6" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={28}
                    />
                  )}
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "BRAHIMA") && (
                    <Bar 
                      dataKey="BRAHIMA" 
                      name="BRAHIMA (45)" 
                      fill="#10B981" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={28}
                    />
                  )}
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "SORO") && (
                    <Bar 
                      dataKey="SORO" 
                      name="SORO (52)" 
                      fill="#CF5D56" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={28}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* VUE 2 (BIS) : ÉVOLUTION HAUTE LISIBILITÉ EN COURBES NETTES SANS AIRS OPAQUES */}
            {viewMode === "timeline" && evolutionChartType === "line" && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const periodObj = payload[0]?.payload;
                      return (
                        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-[210px]">
                          <div className="pb-1.5 border-b border-white/10 flex items-center justify-between">
                            <span className="font-black text-white">{periodObj?.periodTitle || label}</span>
                            <span className="text-[10px] text-white/40 font-mono">
                              Total: {metric === "tonnage" ? `${periodObj?.total} T` : formatCompact(periodObj?.total)}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {payload.map((p: any) => (
                              <div key={p.dataKey} className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <div className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                  <span className="text-white/80 font-bold">{p.name} :</span>
                                </div>
                                <span className="font-mono font-black text-white">
                                  {metric === "tonnage" ? `${p.value} T` : formatMoney(p.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "AMARA") && (
                    <Line 
                      type="monotone" 
                      dataKey="AMARA" 
                      name="AMARA (76)" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#3B82F6", stroke: "#1c1c1e", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#3B82F6", stroke: "#fff", strokeWidth: 2 }}
                    />
                  )}
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "BRAHIMA") && (
                    <Line 
                      type="monotone" 
                      dataKey="BRAHIMA" 
                      name="BRAHIMA (45)" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#10B981", stroke: "#1c1c1e", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#10B981", stroke: "#fff", strokeWidth: 2 }}
                    />
                  )}
                  {(selectedDriverFilter === "ALL" || selectedDriverFilter === "SORO") && (
                    <Line 
                      type="monotone" 
                      dataKey="SORO" 
                      name="SORO (52)" 
                      stroke="#CF5D56" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "#CF5D56", stroke: "#1c1c1e", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#CF5D56", stroke: "#fff", strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}

          </div>
        </div>

        {/* PIED DE MODULE : CARTOUCHES RÉCAPITULATIFS & CODE COULEUR CLIQUEABLES */}
        <div className="pt-3 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {driverPerformance.list.map(d => {
              const isTop = d.key === driverPerformance.topNetDriver;
              const isFiltered = selectedDriverFilter === d.key;

              return (
                <button
                  key={d.key}
                  onClick={() => {
                    if (viewMode === "timeline") {
                      setSelectedDriverFilter(prev => prev === d.key ? "ALL" : d.key);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between ${
                    isFiltered 
                      ? "ring-2 ring-white/40 bg-white/10 border-white/30" 
                      : `${d.border} ${d.bg} hover:border-white/20`
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="size-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-md"
                      style={{ backgroundColor: d.color }}
                    >
                      {d.unit}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-black text-white truncate">{d.shortName}</h5>
                        {isTop && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Award className="size-2.5" /> Top
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-white/50">
                        {d.margin}% marge • {d.tonnage}T
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-xs font-mono font-black text-white block">
                      {metric === "tonnage" ? `${d.tonnage} T` : formatCompact(metric === "gross" ? d.gross : d.net)}
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase">
                      {metric === "tonnage" ? "Transporté" : metric === "gross" ? "C.A." : "Bénéfice"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Légende interactive pour la vue chronologique */}
          {viewMode === "timeline" && (
            <div className="flex items-center justify-between text-[10px] text-white/40 pt-2 px-1">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" /> AMARA
                <span className="size-2 rounded-full bg-emerald-500 ml-2" /> BRAHIMA
                <span className="size-2 rounded-full bg-[#cf5d56] ml-2" /> SORO
              </span>
              {selectedDriverFilter !== "ALL" ? (
                <button 
                  onClick={() => setSelectedDriverFilter("ALL")}
                  className="text-cyan-400 hover:underline font-bold text-[10px]"
                >
                  Afficher tous les chauffeurs
                </button>
              ) : (
                <span>Cliquez sur une carte pour isoler un chauffeur</span>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default MiniCharts;
