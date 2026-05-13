import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Fuel, ShieldCheck, Utensils, Anchor, PlusCircle, 
  Wallet, Target, Truck, Wrench, Route
} from 'lucide-react';

const COLORS = {
  fuel: "#00F2FF", 
  frais: "#FF375F", 
  maintenance: "#FF9F0A", // Orange Apple pour la maintenance
  drivers: ["#00F2FF", "#00A2FF", "#006AFF"],
  categories: {
    péages: "#FF9F0A",
    police: "#5E5CE6",
    repas: "#30D158",
    extra: "#FF375F",
    maintenance: "#FF9F0A"
  }
};

type QuantumProps = {
  data: any[];
  maintenanceTotal: number;
  formatCurrency: (val: number) => string;
  t: any;
  records: any[]; // Pour le calcul des KM
};

export function QuantumExpenseAnalysis({ data, maintenanceTotal, formatCurrency, t, records }: QuantumProps) {
  
  const stats = useMemo(() => {
    const drivers = ["AMARA", "BRAHIMA", "SORO"];
    
    // Calcul des KM (Logique extraite de FleetTrackerWidget)
    const kmData = {};
    const sortedRecords = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sortedRecords.forEach(t => {
      if (!t.driverLabel) return;
      const labelUpper = t.driverLabel.toUpperCase();
      let driverKey = null;
      if (labelUpper.includes("AMARA")) driverKey = "AMARA";
      else if (labelUpper.includes("BRAHIMA")) driverKey = "BRAHIMA";
      else if (labelUpper.includes("SORO") || labelUpper.includes("SORRO")) driverKey = "SORO";
      else return;
      const kmValue = Number(t.km || t.distanceKm || 0);
      if (kmValue > 0) kmData[driverKey] = kmValue;
    });

    const sums = data.reduce((acc, row) => ({
      fuel: acc.fuel + (row.fuel_cost_cfa || 0),
      road: acc.road + (row.road_fees_cfa || 0),
      police: acc.police + (row.police_fees_cfa || 0),
      food: acc.food + (row.food_fees_cfa || 0),
      extra: acc.extra + (row.other_expenses_cfa || 0),
      total: acc.total + (row.total_expense_cfa || 0),
      gross: acc.gross + (row.total_gross_cfa || 0),
      net: acc.net + (row.total_net_cfa || 0)
    }), { fuel: 0, road: 0, police: 0, food: 0, extra: 0, total: 0, gross: 0, net: 0 });

    // Ajout de la maintenance au total
    const grandTotalExpense = sums.total + maintenanceTotal;
    const realNetProfit = sums.gross - grandTotalExpense;

    // Anneau Interne : GASOIL vs LOGISTIQUE vs MAINTENANCE
    const innerData = [
      { name: t?.fuel || "Gasoil", value: sums.fuel, color: COLORS.fuel },
      { name: t?.logistics || "Logistique", value: sums.road + sums.police + sums.food + sums.extra, color: COLORS.frais },
      { name: t?.maintenance || "Maintenance", value: maintenanceTotal, color: COLORS.maintenance }
    ].filter(d => d.value > 0);

    // Anneau Externe : DÉTAIL COMPLET
    const outerData = [
      ...drivers.map((name, i) => ({
        name: `${t?.fuel || 'Gasoil'} ${name}`,
        value: data.filter(t => t.chauffeur === name).reduce((s, r) => s + (r.fuel_cost_cfa || 0), 0),
        color: COLORS.drivers[i],
        icon: Truck
      })),
      { name: t?.tolls || "Péages", value: sums.road, color: COLORS.categories.péages, icon: Anchor },
      { name: t?.police || "Police", value: sums.police, color: COLORS.categories.police, icon: ShieldCheck },
      { name: t?.meals || "Repas", value: sums.food, color: COLORS.categories.repas, icon: Utensils },
      { name: t?.maintenance || "Maintenance", value: maintenanceTotal, color: COLORS.maintenance, icon: Wrench },
      { name: t?.extras || "Extras", value: sums.extra, color: COLORS.categories.extra, icon: PlusCircle }
    ].filter(d => d.value > 0);

    return { sums, innerData, outerData, grandTotalExpense, realNetProfit, kmData };
  }, [data, maintenanceTotal, records, t]);

  const infographicCards = [
    { label: t?.fuel || "Gasoil", value: stats.sums.fuel, icon: Fuel, color: "text-[#00F2FF]", bg: "bg-[#00F2FF]/10" },
    { label: t?.maintenance || "Maintenance", value: maintenanceTotal, icon: Wrench, color: "text-[#FF9F0A]", bg: "bg-[#FF9F0A]/10" },
    { label: t?.totalExpenses || "Total Frais", value: stats.grandTotalExpense, icon: Wallet, color: "text-[#FF375F]", bg: "bg-[#FF375F]/10" },
  ];

  return (
    <div className="w-full h-full flex flex-col xl:flex-row items-center gap-10">
      
      {/* DONUT COLUMN */}
      <div className="relative w-full xl:w-[60%] h-[450px]">
        <ResponsiveContainer width="100%" height={450}>
          <PieChart>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '12px', fontSize: '12px' }} 
              itemStyle={{ color: '#fff' }} 
              formatter={(value: number) => formatCurrency(value)}
            />
            {/* INNER RING: CATEGORIES OVERVIEW */}
            <Pie 
              data={stats.innerData} 
              innerRadius={80} 
              outerRadius={110} 
              paddingAngle={5} 
              dataKey="value" 
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {stats.innerData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Pie>

            {/* OUTER RING: DETAILED BREAKDOWN */}
            <Pie 
              data={stats.outerData} 
              innerRadius={125} 
              outerRadius={150} 
              paddingAngle={2} 
              dataKey="value" 
              stroke="none"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
              minAngle={5}
              animationBegin={200}
              animationDuration={1800}
            >
              {stats.outerData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{t?.totalExpenses || "Total Dépenses"}</p>
          <span className="text-2xl font-black text-white tracking-tighter drop-shadow-lg">{formatCurrency(stats.grandTotalExpense)}</span>
        </div>
      </div>

      {/* INFOGRAPHICS COLUMN */}
      <div className="w-full xl:w-[40%] flex flex-col gap-3">
        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 px-1">{t?.analyticalRecap || "Récapitulatif Analytique"}</h4>
        {infographicCards.map((card, i) => (
          <div key={i} className="p-3 rounded-[20px] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3">
              <div className={`size-8 rounded-xl ${card.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <card.icon className={`size-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none mb-0.5">{card.label}</p>
                <p className="text-sm font-black text-white">{formatCurrency(card.value)}</p>
              </div>
            </div>
            <span className="text-[9px] font-black text-white/10 uppercase">{((card.value / (stats.grandTotalExpense || 1)) * 100).toFixed(0)}%</span>
          </div>
        ))}

        {/* KM MONITORING INTEGRATION */}
        <div className="mt-4 p-4 rounded-[28px] bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Route className="size-4 text-[#cf5d56]" />
            <h5 className="text-[10px] font-black text-white/50 uppercase tracking-[0.1em]">{t?.mileageTracking || "Suivi Kilométrage"}</h5>
          </div>
          {Object.entries(stats.kmData).map(([driver, km]) => (
            <div key={driver} className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-black text-white/40">{driver}</span>
                <span className="font-black text-white">{Number(km).toLocaleString()} <span className="text-white/30">KM</span></span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#cf5d56] opacity-60 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min(100, (Number(km) / 800000) * 100)}%` }} 
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Performance Summary */}
        <div className="mt-2 p-3 rounded-[20px] bg-[#30D158]/5 border border-[#30D158]/10 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-[#30D158] uppercase">{t?.netMarginRev || "Marge Net / Revenu"}</span>
                <span className="text-[10px] font-black text-white">{((stats.realNetProfit / (stats.sums.gross || 1)) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#30D158] rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, (stats.realNetProfit / (stats.sums.gross || 1)) * 100)}%` }} />
            </div>
        </div>
      </div>
    </div>
  );
}

