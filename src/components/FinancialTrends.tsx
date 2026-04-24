import React, { useMemo } from 'react';
import { 
  Banknote, 
  Wallet, 
  TrendingUp, 
  Percent, 
  ArrowUpRight, 
  Coins
} from 'lucide-react';

type FinancialTrendsProps = {
  records: any[];
  formatCurrency: (val: number) => string;
};

export function FinancialTrends({ records, formatCurrency }: FinancialTrendsProps) {
  const stats = useMemo(() => {
    if (!records || records.length === 0) {
      return { revenue: 0, expenses: 0, netProfit: 0, margin: 0 };
    }

    const revenue = records.reduce((s, r) => s + (Number(r.total_gross_cfa) || 0), 0);
    const expenses = records.reduce((s, r) => s + (Number(r.total_expense_cfa) || 0), 0);
    const netProfit = revenue - expenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return { revenue, expenses, netProfit, margin };
  }, [records]);

  const cards = [
    {
      label: "Total Revenus",
      value: formatCurrency(stats.revenue),
      icon: Banknote,
      color: "text-[#00F2FF]",
      bg: "bg-[#00F2FF]/10",
      desc: "Chiffre d'affaires brut"
    },
    {
      label: "Total Dépenses",
      value: formatCurrency(stats.expenses),
      icon: Wallet,
      color: "text-[#FF375F]",
      bg: "bg-[#FF375F]/10",
      desc: "Coûts opérationnels totaux"
    },
    {
      label: "Bénéfice Net",
      value: formatCurrency(stats.netProfit),
      icon: Coins,
      color: "text-[#30D158]",
      bg: "bg-[#30D158]/10",
      desc: "Résultat après frais"
    },
    {
      label: "Marge Bénéficiaire",
      value: `${stats.margin.toFixed(1)}%`,
      icon: Percent,
      color: "text-[#BF5AF2]",
      bg: "bg-[#BF5AF2]/10",
      desc: "Rentabilité sur CA"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {cards.map((card, i) => (
        <div key={i} className="panel-enter rounded-[24px] border border-white/10 bg-[#1c1c1e] p-5 shadow-xl hover:bg-white/[0.04] transition-all group overflow-hidden relative">
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
          </div>
        </div>
      ))}
    </div>
  );
}
