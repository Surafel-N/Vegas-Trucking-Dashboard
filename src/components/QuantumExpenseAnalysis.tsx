import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Sector
} from 'recharts';
import { 
  Fuel, 
  ShieldCheck, 
  Utensils, 
  Anchor, 
  PlusCircle, 
  Wallet, 
  Truck, 
  Wrench, 
  Route,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// --- PALETTE DE COULEURS CLARIFIÉE & CONTRASTÉE ---
export const QUANTUM_PALETTE = {
  // Par Nature de Frais
  fuel: { color: "#00F2FF", light: "#A5F3FC", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  maintenance: { color: "#F59E0B", light: "#FDE68A", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  road: { color: "#8B5CF6", light: "#DDD6FE", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  police: { color: "#EC4899", light: "#FBCFE8", bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  food: { color: "#10B981", light: "#A7F3D0", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  extra: { color: "#F97316", light: "#FED7AA", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },

  // Par Véhicule / Chauffeur
  drivers: {
    AMARA: { color: "#3B82F6", light: "#93C5FD", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
    BRAHIMA: { color: "#10B981", light: "#6EE7B7", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
    SORO: { color: "#CF5D56", light: "#FCA5A5", bg: "bg-[#cf5d56]/10", border: "border-[#cf5d56]/30", text: "text-[#cf5d56]" },
    FLOTTE: { color: "#A855F7", light: "#E9D5FF", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" }
  }
};

type QuantumProps = {
  data: any[];
  maintenanceTotal: number;
  formatCurrency: (val: number, curr?: string) => string;
  currency?: string;
  t?: any;
  records?: any[];
  allTrips?: any[];
};

export function QuantumExpenseAnalysis({ 
  data = [], 
  maintenanceTotal = 0, 
  formatCurrency, 
  currency = "CFA",
  t, 
  records = [],
  allTrips = []
}: QuantumProps) {
  // Mode de perspective : "nature" (par type de coût) ou "driver" (par véhicule)
  const [perspective, setPerspective] = useState<"nature" | "driver">("nature");
  // Index de la tranche survolée pour le centre dynamique
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${new Intl.NumberFormat('fr-FR').format(Math.round(val))} ${currency}`;
  };

  // --- 1. CALCULS ANALYTIQUES GLOBAUX ---
  const stats = useMemo(() => {
    // Calcul des totaux opérationnels en une seule passe
    const sums = data.reduce((acc, row) => ({
      fuel: acc.fuel + (Number(row.fuel_cost_cfa) || 0),
      road: acc.road + (Number(row.road_fees_cfa) || 0),
      police: acc.police + (Number(row.police_fees_cfa) || 0),
      food: acc.food + (Number(row.food_fees_cfa) || 0),
      extra: acc.extra + (Number(row.other_expenses_cfa) || 0),
      gross: acc.gross + (Number(row.total_gross_cfa) || 0),
      net: acc.net + (Number(row.total_net_cfa) || 0)
    }), { fuel: 0, road: 0, police: 0, food: 0, extra: 0, gross: 0, net: 0 });

    const totalRouteExpenses = sums.fuel + sums.road + sums.police + sums.food + sums.extra;
    const grandTotalExpense = totalRouteExpenses + maintenanceTotal;
    const realNetProfit = sums.gross - grandTotalExpense;
    const netMargin = sums.gross > 0 ? (realNetProfit / sums.gross) * 100 : 0;

    // Ratio Carburant / CA
    const fuelRatio = sums.gross > 0 ? (sums.fuel / sums.gross) * 100 : 0;
    
    // Coût moyen par rotation / voyage
    const totalTripsCount = data.length || 1;
    const avgCostPerTrip = Math.round(grandTotalExpense / totalTripsCount);

    // --- A. DONNÉES PAR NATURE DE FRAIS ---
    const natureList = [
      {
        id: "fuel",
        name: t?.fuel || "Gasoil",
        value: sums.fuel,
        color: QUANTUM_PALETTE.fuel.color,
        lightColor: QUANTUM_PALETTE.fuel.light,
        bg: QUANTUM_PALETTE.fuel.bg,
        border: QUANTUM_PALETTE.fuel.border,
        text: QUANTUM_PALETTE.fuel.text,
        icon: Fuel,
        desc: "Carburant moteur principal"
      },
      {
        id: "maintenance",
        name: t?.maintenance || "Maintenance Flotte",
        value: maintenanceTotal,
        color: QUANTUM_PALETTE.maintenance.color,
        lightColor: QUANTUM_PALETTE.maintenance.light,
        bg: QUANTUM_PALETTE.maintenance.bg,
        border: QUANTUM_PALETTE.maintenance.border,
        text: QUANTUM_PALETTE.maintenance.text,
        icon: Wrench,
        desc: "Atelier, vidanges & pièces"
      },
      {
        id: "road",
        name: t?.tolls || "Péages & Autoroute",
        value: sums.road,
        color: QUANTUM_PALETTE.road.color,
        lightColor: QUANTUM_PALETTE.road.light,
        bg: QUANTUM_PALETTE.road.bg,
        border: QUANTUM_PALETTE.road.border,
        text: QUANTUM_PALETTE.road.text,
        icon: Anchor,
        desc: "Droits de passage et ponts"
      },
      {
        id: "police",
        name: t?.police || "Contrôles / Police",
        value: sums.police,
        color: QUANTUM_PALETTE.police.color,
        lightColor: QUANTUM_PALETTE.police.light,
        bg: QUANTUM_PALETTE.police.bg,
        border: QUANTUM_PALETTE.police.border,
        text: QUANTUM_PALETTE.police.text,
        icon: ShieldCheck,
        desc: "Escortes & contrôles routiers"
      },
      {
        id: "food",
        name: t?.meals || "Frais Route & Repas",
        value: sums.food,
        color: QUANTUM_PALETTE.food.color,
        lightColor: QUANTUM_PALETTE.food.light,
        bg: QUANTUM_PALETTE.food.bg,
        border: QUANTUM_PALETTE.food.border,
        text: QUANTUM_PALETTE.food.text,
        icon: Utensils,
        desc: "Indemnités de mission chauffeur"
      },
      {
        id: "extra",
        name: t?.extras || "Divers & Extras",
        value: sums.extra,
        color: QUANTUM_PALETTE.extra.color,
        lightColor: QUANTUM_PALETTE.extra.light,
        bg: QUANTUM_PALETTE.extra.bg,
        border: QUANTUM_PALETTE.extra.border,
        text: QUANTUM_PALETTE.extra.text,
        icon: PlusCircle,
        desc: "Dépannages & imprévus"
      }
    ]
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        percent: grandTotalExpense > 0 ? (item.value / grandTotalExpense) * 100 : 0
      }));

    // --- B. DONNÉES PAR VÉHICULE & CHAUFFEUR ---
    const driverTotals: Record<string, { total: number; fuel: number; trips: number }> = {
      AMARA: { total: 0, fuel: 0, trips: 0 },
      BRAHIMA: { total: 0, fuel: 0, trips: 0 },
      SORO: { total: 0, fuel: 0, trips: 0 }
    };

    data.forEach(r => {
      const lbl = String(r.driverLabel || r.chauffeur || "").toUpperCase();
      let key: "AMARA" | "BRAHIMA" | "SORO" | null = null;
      if (lbl.includes("AMARA") || lbl.includes("76")) key = "AMARA";
      else if (lbl.includes("BRAHIMA") || lbl.includes("45")) key = "BRAHIMA";
      else if (lbl.includes("SORO") || lbl.includes("SORRO") || lbl.includes("52")) key = "SORO";

      if (key) {
        const fuel = Number(r.fuel_cost_cfa) || 0;
        const exp = Number(r.total_expense_cfa) || (fuel + (Number(r.road_fees_cfa) || 0));
        driverTotals[key].total += exp;
        driverTotals[key].fuel += fuel;
        driverTotals[key].trips += 1;
      }
    });

    const driverList = [
      {
        id: "AMARA",
        name: "AMARA TRUCK 76",
        shortName: "AMARA",
        unit: "76",
        value: driverTotals.AMARA.total,
        color: QUANTUM_PALETTE.drivers.AMARA.color,
        lightColor: QUANTUM_PALETTE.drivers.AMARA.light,
        bg: QUANTUM_PALETTE.drivers.AMARA.bg,
        border: QUANTUM_PALETTE.drivers.AMARA.border,
        text: QUANTUM_PALETTE.drivers.AMARA.text,
        icon: Truck,
        desc: `${driverTotals.AMARA.trips} voyages enregistrés`
      },
      {
        id: "BRAHIMA",
        name: "BRAHIMA TRUCK 45",
        shortName: "BRAHIMA",
        unit: "45",
        value: driverTotals.BRAHIMA.total,
        color: QUANTUM_PALETTE.drivers.BRAHIMA.color,
        lightColor: QUANTUM_PALETTE.drivers.BRAHIMA.light,
        bg: QUANTUM_PALETTE.drivers.BRAHIMA.bg,
        border: QUANTUM_PALETTE.drivers.BRAHIMA.border,
        text: QUANTUM_PALETTE.drivers.BRAHIMA.text,
        icon: Truck,
        desc: `${driverTotals.BRAHIMA.trips} voyages enregistrés`
      },
      {
        id: "SORO",
        name: "SORO TRUCK 52",
        shortName: "SORO",
        unit: "52",
        value: driverTotals.SORO.total,
        color: QUANTUM_PALETTE.drivers.SORO.color,
        lightColor: QUANTUM_PALETTE.drivers.SORO.light,
        bg: QUANTUM_PALETTE.drivers.SORO.bg,
        border: QUANTUM_PALETTE.drivers.SORO.border,
        text: QUANTUM_PALETTE.drivers.SORO.text,
        icon: Truck,
        desc: `${driverTotals.SORO.trips} voyages enregistrés`
      },
      {
        id: "FLOTTE",
        name: "Maintenance Flotte (Atelier)",
        shortName: "Maintenance",
        unit: "ATELIER",
        value: maintenanceTotal,
        color: QUANTUM_PALETTE.drivers.FLOTTE.color,
        lightColor: QUANTUM_PALETTE.drivers.FLOTTE.light,
        bg: QUANTUM_PALETTE.drivers.FLOTTE.bg,
        border: QUANTUM_PALETTE.drivers.FLOTTE.border,
        text: QUANTUM_PALETTE.drivers.FLOTTE.text,
        icon: Wrench,
        desc: "Coûts centraux non affectés"
      }
    ]
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        percent: grandTotalExpense > 0 ? (item.value / grandTotalExpense) * 100 : 0
      }));

    // --- C. CALCUL ODOMÈTRE CERTIFIÉ ---
    const kmData: Record<string, number> = {
      AMARA: 117324,
      BRAHIMA: 110593,
      SORO: 110975
    };
    const sourceTrips = allTrips && allTrips.length > 0 ? allTrips : (records && records.length > 0 ? records : data);
    sourceTrips.forEach(t => {
      const lbl = String(t.driverLabel || t.chauffeur || "").toUpperCase();
      let key: "AMARA" | "BRAHIMA" | "SORO" | null = null;
      if (lbl.includes("AMARA") || lbl.includes("76")) key = "AMARA";
      else if (lbl.includes("BRAHIMA") || lbl.includes("45")) key = "BRAHIMA";
      else if (lbl.includes("SORO") || lbl.includes("SORRO") || lbl.includes("52")) key = "SORO";
      if (!key) return;

      let kVal = Number(t.km || 0);
      if (key === "SORO" && kVal === 712827) kVal = 71283;
      if (key === "BRAHIMA" && kVal === 196266) kVal = 106266;
      if (key === "BRAHIMA" && kVal === 10492) kVal = 107492;
      if (key === "SORO" && kVal === 59757 && (t.date || "") < "2025-10-01") kVal = 50757;
      if (kVal >= 20000 && kVal <= 200000) {
        kmData[key] = Math.max(kmData[key], kVal);
      }
    });

    return {
      sums,
      grandTotalExpense,
      realNetProfit,
      netMargin,
      fuelRatio,
      avgCostPerTrip,
      natureList,
      driverList,
      kmData
    };
  }, [data, maintenanceTotal, records, allTrips, t]);

  // Données de l'anneau actif selon la perspective choisie
  const activeData = perspective === "nature" ? stats.natureList : stats.driverList;
  const hoveredItem = activeIndex !== null && activeData[activeIndex] ? activeData[activeIndex] : null;

  return (
    <div className="w-full h-full flex flex-col gap-6">
      
      {/* 1. EN-TÊTE DU MODULE AVEC COMMUTATEUR DE PERSPECTIVE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Contrôle des Coûts
            </span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/60 font-medium">Ventilation Globale</span>
          </div>
        </div>

        {/* Commutateur : Par Nature vs Par Véhicule */}
        <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => { setPerspective("nature"); setActiveIndex(null); }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              perspective === "nature" 
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-lg shadow-cyan-500/20" 
                : "text-white/50 hover:text-white"
            }`}
          >
            <Layers className="size-3" />
            <span>Par Nature</span>
          </button>
          <button
            onClick={() => { setPerspective("driver"); setActiveIndex(null); }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              perspective === "driver" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/20" 
                : "text-white/50 hover:text-white"
            }`}
          >
            <Truck className="size-3" />
            <span>Par Véhicule</span>
          </button>
        </div>
      </div>

      {/* 2. GRILLE PRINCIPALE : DONUT HAUTE RÉSOLUTION + GRILLE ANALYTIQUE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
        
        {/* COLONNE GAUCHE (5 COLONNES) : LE DONUT AVEC CENTRE DYNAMIQUE INTERACTIF */}
        <div className="xl:col-span-5 relative flex items-center justify-center min-h-[360px] w-full">
          <div className="relative w-full h-[360px] max-w-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={() => null} />
                <Pie 
                  data={activeData} 
                  innerRadius={105} 
                  outerRadius={145} 
                  paddingAngle={3} 
                  dataKey="value" 
                  stroke="#1c1c1e"
                  strokeWidth={3}
                  animationBegin={0}
                  animationDuration={1000}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {activeData.map((entry, index) => {
                    const isHovered = activeIndex === index;
                    return (
                      <Cell 
                        key={entry.id} 
                        fill={entry.color} 
                        opacity={activeIndex === null || isHovered ? 1 : 0.4}
                        className="transition-all duration-300 cursor-pointer"
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 12px ${entry.color})` : 'none',
                          transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                          transformOrigin: 'center center'
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* CENTRE DYNAMIQUE INTERACTIF HAUTE RÉSOLUTION */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
              {hoveredItem ? (
                <div className="animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: hoveredItem.color }} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-white truncate max-w-[170px]">
                      {hoveredItem.name}
                    </span>
                  </div>
                  <p className="text-xl font-black font-mono text-white tracking-tight leading-tight">
                    {formatMoney(hoveredItem.value)}
                  </p>
                  <span 
                    className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full font-mono shadow-sm"
                    style={{ backgroundColor: `${hoveredItem.color}25`, color: hoveredItem.color }}
                  >
                    {hoveredItem.percent.toFixed(1)}% du total
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 leading-none">
                    {perspective === "driver" ? "Dépenses par Camion" : "Total Coûts Flotte"}
                  </p>
                  <span className="text-2xl font-black font-mono text-white tracking-tight drop-shadow-lg">
                    {formatMoney(stats.grandTotalExpense)}
                  </span>
                  <span className="inline-block mt-1 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                    {activeData.length} catégories actives
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (7 COLONNES) : GRILLE D'ANALYSE DÉTAILLÉE AVEC JAUGES */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
              {perspective === "nature" ? "Postes de Coûts Analytiques" : "Ventilation par Véhicule"}
            </h4>
            <span className="text-[10px] font-bold text-white/30 font-mono">
              100% = {formatMoney(stats.grandTotalExpense)}
            </span>
          </div>

          {/* Grille des catégories avec couleurs vives & barres de progression */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeData.map((item, idx) => {
              const isSelected = activeIndex === idx;
              const IconComp = item.icon || Layers;

              return (
                <div 
                  key={item.id} 
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? "bg-white/10 border-white/40 shadow-xl scale-[1.02]" 
                      : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="size-8 rounded-xl flex items-center justify-center shrink-0 shadow-md transition-transform"
                        style={{ backgroundColor: `${item.color}20`, color: item.color }}
                      >
                        <IconComp className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{item.name}</p>
                        <p className="text-[9px] text-white/40 truncate">{item.desc}</p>
                      </div>
                    </div>
                    <span 
                      className="text-xs font-black font-mono shrink-0 px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>

                  {/* Montant & Jauge de part */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-[11px]">
                      <span className="text-[9px] font-bold text-white/40 uppercase">Montant</span>
                      <span className="font-mono font-black text-white">{formatMoney(item.value)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full rounded-full transition-all duration-700"
                        style={{ 
                          width: `${Math.max(4, item.percent)}%`, 
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. RATIOS DE RENTABILITÉ & PERFORMANCE STRATÉGIQUE */}
          <div className="mt-2 pt-3 border-t border-white/5 grid grid-cols-3 gap-2.5">
            
            {/* RATIO 1 : GASOIL / CA */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-white/40 block mb-1">
                  Ratio Gasoil / C.A.
                </span>
                <span className={`text-base font-black font-mono ${
                  stats.fuelRatio <= 38 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {stats.fuelRatio.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {stats.fuelRatio <= 38 ? (
                  <span className="text-[8px] font-bold text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="size-2.5" /> Optimal (&lt;38%)
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-amber-400 flex items-center gap-0.5">
                    <AlertCircle className="size-2.5" /> Vigilance (&gt;38%)
                  </span>
                )}
              </div>
            </div>

            {/* RATIO 2 : COÛT MOYEN PAR VOYAGE */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-white/40 block mb-1">
                  Coût Moyen / Rotation
                </span>
                <span className="text-sm font-black font-mono text-white">
                  {new Intl.NumberFormat('fr-FR').format(stats.avgCostPerTrip)} <span className="text-[9px] text-white/40 font-sans">{currency}</span>
                </span>
              </div>
              <p className="mt-1 text-[8px] font-bold text-white/30 uppercase">
                {data.length} voyages pris en compte
              </p>
            </div>

            {/* RATIO 3 : MARGE NETTE RÉELLE (POST-MAINTENANCE) */}
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-wider text-white/40 block mb-1">
                  Marge Nette Réelle
                </span>
                <span className={`text-base font-black font-mono ${
                  stats.netMargin >= 0 ? "text-[#30D158]" : "text-red-400"
                }`}>
                  {stats.netMargin.toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 text-[8px] font-bold text-white/30 font-mono truncate">
                Net : {formatMoney(stats.realNetProfit)}
              </p>
            </div>

          </div>

          {/* 4. SUIVI ODOMÈTRE CERTIFIÉ (CYCLE VIDANGE) */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="size-3.5 text-[#cf5d56]" />
                <h5 className="text-[9px] font-black text-white/60 uppercase tracking-wider">
                  Odomètres Certifiés & Cycle 10 000 KM
                </h5>
              </div>
              <span className="text-[9px] font-bold text-white/30 font-mono">Dernier relevé Sept 2026</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(stats.kmData).map(([driver, km]) => {
                const numKm = Number(km);
                const cycleProgress = ((numKm % 10000) / 10000) * 100;
                const dConfig = QUANTUM_PALETTE.drivers[driver as keyof typeof QUANTUM_PALETTE.drivers] || { color: "#3B82F6" };

                return (
                  <div key={driver} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white/60 text-[9px]">{driver}</span>
                      <span className="font-mono font-black text-white text-[10px]">
                        {numKm.toLocaleString("fr-FR")} <span className="text-[8px] text-white/30 font-sans">KM</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000" 
                        style={{ 
                          width: `${Math.min(100, Math.max(8, cycleProgress))}%`,
                          backgroundColor: dConfig.color 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default QuantumExpenseAnalysis;
