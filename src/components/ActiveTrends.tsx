import React, { useMemo } from 'react';
import { TrendingUp, Package, Maximize2, Hash, ArrowUpRight, BarChart3 } from 'lucide-react';

type ActiveTrendsProps = {
  records: any[];
  formatCurrency: (val: number) => string;
};

export function ActiveTrends({ records, formatCurrency }: ActiveTrendsProps) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) {
      return { maxLoad: 0, avgLoad: 0, tripCount: 0, totalLoad: 0 };
    }

    const loads = records.map(r => r.tonnage || 0);
    const maxLoad = loads.length > 0 ? Math.max(...loads) : 0;
    
    // Règle: > 100T = 2 voyages, > 0T = 1 voyage, sinon 0
    const tripCount = records.reduce((acc, r) => {
      const t = r.tonnage || 0;
      if (t > 100) return acc + 2;
      if (t > 0) return acc + 1;
      return acc;
    }, 0);

    const totalLoad = loads.reduce((a, b) => a + b, 0);
    const avgLoad = tripCount > 0 ? totalLoad / tripCount : 0;

    return { maxLoad, avgLoad, tripCount, totalLoad };
  }, [records]);

  const cards = [
    {
      label: "Total Chargé ce Mois",
      value: `${stats.totalLoad.toFixed(1)} T`,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      desc: "Volume global mensuel"
    },
    {
      label: "Charge Max Mensuelle",
      value: `${stats.maxLoad.toFixed(1)} T`,
      icon: Maximize2,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      desc: "Record de chargement"
    },
    {
      label: "Chargement Moyen",
      value: `${stats.avgLoad.toFixed(1)} T`,
      icon: Package,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      desc: "Efficacité par voyage"
    },
    {
      label: "Nombre de Voyages",
      value: stats.tripCount,
      icon: Hash,
      color: "text-[#cf5d56]",
      bg: "bg-[#cf5d56]/10",
      desc: "Jours avec chargement"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => (
        <div key={i} className="panel-enter rounded-[24px] border border-white/10 bg-[#1c1c1e] p-5 shadow-xl hover:bg-white/[0.04] transition-all group overflow-hidden relative">
          {/* Background Decoration */}
          <div className={`absolute -right-4 -top-4 size-24 ${card.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <card.icon className="size-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/40">{card.label}</span>
              </div>
              
              <div>
                <p className="text-2xl font-black text-white tracking-tighter">{card.value}</p>
                <p className="text-[10px] text-white/20 font-bold uppercase mt-1 flex items-center gap-1">
                  <ArrowUpRight className="size-3" />
                  {card.desc}
                </p>
              </div>
            </div>
            
            <div className="h-12 w-12 flex items-end justify-end opacity-10 group-hover:opacity-30 transition-opacity">
               <BarChart3 className="size-full text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
