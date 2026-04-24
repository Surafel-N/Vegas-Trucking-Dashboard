import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Fuel, ShieldCheck, Utensils, Anchor, PlusCircle, 
  Wallet, TrendingUp, Zap, ChevronRight 
} from 'lucide-react';

// Palette "iOS System Colors" - Mode Sombre
const IOS_COLORS = {
  blue: "#0A84FF",
  green: "#30D158",
  orange: "#FF9F0A",
  indigo: "#5E5CE6",
  pink: "#FF375F",
  teal: "#64D2FF",
  purple: "#BF5AF2",
  yellow: "#FFD60A",
  gray: "#8E8E93"
};

type AppleExpenseProps = {
  data: any[];
  formatCurrency: (val: number) => string;
};

export function AppleExpenseAnalysis({ data, formatCurrency }: AppleExpenseProps) {
  
  // Analyse dynamique des données (Zéro catégorie en dur)
  const stats = useMemo(() => {
    const sums = data.reduce((acc, row) => ({
      fuel: acc.fuel + (row.fuel_cost_cfa || 0),
      road: acc.road + (row.road_fees_cfa || 0),
      police: acc.police + (row.police_fees_cfa || 0),
      food: acc.food + (row.food_fees_cfa || 0),
      extra: acc.extra + (row.other_expenses_cfa || 0),
      total: acc.total + (row.total_expense_cfa || 0),
      revenue: acc.revenue + (row.total_gross_cfa || 0),
      net: acc.net + (row.total_net_cfa || 0)
    }), { fuel: 0, road: 0, police: 0, food: 0, extra: 0, total: 0, revenue: 0, net: 0 });

    // Anneau Interne : Grandes Familles
    const innerData = [
      { name: "Carburant", value: sums.fuel, color: IOS_COLORS.blue },
      { name: "Logistique", value: sums.road + sums.police + sums.food + sums.extra, color: IOS_COLORS.purple }
    ].filter(d => d.value > 0);

    // Anneau Externe : Détail Précis
    const outerData = [
      { name: "Gasoil", value: sums.fuel, color: IOS_COLORS.blue, icon: Fuel },
      { name: "Péages", value: sums.road, color: IOS_COLORS.orange, icon: Anchor },
      { name: "Police", value: sums.police, color: IOS_COLORS.indigo, icon: ShieldCheck },
      { name: "Repas", value: sums.food, color: IOS_COLORS.green, icon: Utensils },
      { name: "Bonus/Extra", value: sums.extra, color: IOS_COLORS.pink, icon: PlusCircle }
    ].filter(d => d.value > 0);

    return { sums, innerData, outerData };
  }, [data]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center flex-1">
        
        {/* SECTION GRAPHIQUE (NESTED DONUT) - 5 Cols */}
        <div className="xl:col-span-5 h-[450px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Anneau Interne : Familles */}
              <Pie
                data={stats.innerData}
                innerRadius={90}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={1000}
              >
                {stats.innerData.map((entry, index) => (
                  <Cell key={`inner-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {/* Anneau Externe : Détails */}
              <Pie
                data={stats.outerData}
                innerRadius={135}
                outerRadius={160}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                animationBegin={200}
                animationDuration={1200}
              >
                {stats.outerData.map((entry, index) => (
                  <Cell key={`outer-${index}`} fill={entry.color} opacity={0.8} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(28, 28, 30, 0.9)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '16px',
                  backdropFilter: 'blur(10px)',
                  fontSize: '12px'
                }} 
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Cœur du Graphique (iOS Style) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
              <Wallet className="size-6 text-white/20" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Total Frais</span>
            <span className="text-2xl font-black text-white tracking-tighter mt-1 drop-shadow-lg">
              {formatCurrency(stats.sums.total)}
            </span>
          </div>
        </div>

        {/* SECTION INFOGRAPHIE (LÉGENDE CARDS) - 7 Cols */}
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
          {stats.outerData.map((item) => {
            const Icon = item.icon;
            const percentage = ((item.value / stats.sums.total) * 100).toFixed(0);
            
            return (
              <div 
                key={item.name}
                className="group relative overflow-hidden rounded-[24px] bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] hover:border-white/10 shadow-xl"
              >
                {/* Accent de couleur iOS */}
                <div className="absolute top-0 left-0 w-1 h-full opacity-40 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: item.color }} />
                
                <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                    <Icon className="size-4" style={{ color: item.color }} />
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase tracking-widest">
                    {percentage}%
                  </span>
                </div>
                
                <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1">{item.name}</h4>
                <p className="text-sm font-black text-white tracking-tight">{formatCurrency(item.value)}</p>
              </div>
            );
          })}

          {/* Carte Spéciale Rentabilité (Highlight) */}
          <div className="sm:col-span-2 mt-2 rounded-[28px] bg-gradient-to-br from-[#30D15820] to-transparent border border-[#30D15830] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl bg-[#30D15820] flex items-center justify-center">
                <TrendingUp className="size-5 text-[#30D158]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#30D158] uppercase tracking-widest leading-none mb-1">Marge Opérationnelle</p>
                <h4 className="text-base font-black text-white tracking-tight">Performance Net</h4>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-[#30D158] tracking-tighter">
                {new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1 }).format(stats.sums.revenue > 0 ? stats.sums.net / stats.sums.revenue : 0)}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
