import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useMemo } from 'react';
import { TrendingUp, Package, Zap } from 'lucide-react';

type MiniChartsProps = {
  records: any[];
};

export function MiniCharts({ records }: MiniChartsProps) {
  // --- DATA PROCESSING ---
  const tonnageData = useMemo(() => {
    const drivers = ["AMARA", "BRAHIMA", "SORO"];
    return drivers.map(d => {
      const total = records
        .filter(r => r.chauffeur === d)
        .reduce((s, r) => s + (r.tonnage || 0), 0);
      return { name: d, tonnage: Math.round(total) };
    });
  }, [records]);

  const trendData = useMemo(() => {
    const activeDates = [...new Set(records.map(r => r.date))].sort();
    return activeDates.map(date => {
      const dayRecords = records.filter(r => r.date === date);
      const gross = dayRecords.reduce((s, r) => s + (Number(r.total_gross_cfa) || 0), 0);
      const expenses = dayRecords.reduce((s, r) => s + (Number(r.total_expense_cfa) || 0), 0);
      const net = dayRecords.reduce((s, r) => s + (Number(r.total_net_cfa) || 0), 0);

      return { 
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), 
        gross,
        expenses,
        net
      };
    });
  }, [records]);

  const stats = useMemo(() => {
    const totalGross = trendData.reduce((s, d) => s + d.gross, 0);
    const totalNet = trendData.reduce((s, d) => s + d.net, 0);
    const margin = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
    return { totalGross, totalNet, margin };
  }, [trendData]);

  const formatCurrencyShort = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 w-full h-full">
      
      {/* CARD 1: TONNAGE (COMPACT) */}
      <div className="panel-enter rounded-[24px] border border-white/5 bg-[#1c1c1e]/40 p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-[#61d2c0]/10 text-[#61d2c0]"><Package className="size-3.5" /></div>
             <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Volume Flotte</h4>
          </div>
          <span className="text-xs font-black text-white/80">{tonnageData.reduce((s,d)=>s+d.tonnage,0)} T</span>
        </div>
        
        <div className="flex-1 h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tonnageData}>
              <XAxis dataKey="name" hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '12px', fontSize: '10px' }}
              />
              <Bar dataKey="tonnage" radius={[6, 6, 6, 6]} barSize={30}>
                {tonnageData.map((entry, index) => (
                  <Cell key={index} fill={index === 0 ? '#00F2FF' : index === 1 ? '#FF375F' : '#FF9F0A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CARD 2 & 3: REVENUE TREND (CLEAN & INTEGRATED) */}
      <div className="xl:col-span-2 panel-enter rounded-[24px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl flex flex-col gap-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-[#FF375F]/10 text-[#FF375F]"><TrendingUp className="size-4" /></div>
             <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase">Performance Analytique</h3>
                <p className="text-[9px] text-white/20 font-bold uppercase tracking-wider">{trendData.length} dernières sessions</p>
             </div>
          </div>
          
          <div className="flex gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-white/20 uppercase">Marge Net</span>
                <span className="text-sm font-black text-[#30D158]">{stats.margin.toFixed(1)}%</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-white/20 uppercase">Total CA</span>
                <span className="text-sm font-black text-white">{formatCurrencyShort(stats.totalGross)}</span>
             </div>
          </div>
        </div>

        <div className="flex-1 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetCompact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#30D158" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#30D158" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} tickFormatter={formatCurrencyShort} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(28, 28, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '10px' }}
                formatter={(val: number) => new Intl.NumberFormat('fr-FR').format(val)}
              />
              <Area type="monotone" dataKey="gross" name="Revenu" stroke="#00F2FF" strokeWidth={2} fill="transparent" />
              <Area type="monotone" dataKey="net" name="Bénéfice" stroke="#30D158" strokeWidth={3} fill="url(#colorNetCompact)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-[#00F2FF]" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Revenus</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="size-1.5 rounded-full bg-[#30D158]" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Bénéfice</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-[#FF375F] uppercase">
                <Zap className="size-3" />
                Live Analysis
            </div>
        </div>
      </div>

    </div>
  );
}
