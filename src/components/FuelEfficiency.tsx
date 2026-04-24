import { Fuel, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { useMemo } from "react";

type FuelEfficiencyProps = {
  records: any[];
};

export function FuelEfficiency({ records }: FuelEfficiencyProps) {
  const efficiencyData = useMemo(() => {
    const drivers = [...new Set(records.map(r => r.driverLabel))];
    return drivers.map(d => {
      const driverRecords = records.filter(r => r.driverLabel === d);
      const totalFuel = driverRecords.reduce((s, r) => s + (r.fuel_cost_cfa || 0), 0);
      const totalTonnage = driverRecords.reduce((s, r) => s + (r.tonnage || 0), 0);
      const ratio = totalTonnage > 0 ? totalFuel / totalTonnage : 0;
      
      let status: 'good' | 'warning' | 'critical' = 'good';
      if (ratio > 3500) status = 'critical';
      else if (ratio > 2500) status = 'warning';

      return { label: d, ratio, status, totalFuel };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [records]);

  return (
    <section className="panel-enter rounded-[40px] border border-white/5 bg-[#111] p-6 text-white shadow-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Fuel className="size-5" />
        </div>
        <div>
           <h3 className="text-sm font-black uppercase tracking-tighter">Efficience Fuel</h3>
           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none mt-0.5">Ratio Carburant / Tonne</p>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pr-1 custom-scrollbar">
        {efficiencyData.map((data) => (
          <div key={data.label} className="p-4 rounded-[28px] bg-white/2 border border-white/5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{data.label}</p>
                <p className="text-sm font-black text-white mt-1">{Math.round(data.ratio).toLocaleString()} <span className="text-[10px] text-white/40 font-bold tracking-normal">CFA/T</span></p>
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                data.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' :
                data.status === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {data.status === 'good' ? 'Optimal' : data.status === 'warning' ? 'Élevé' : 'Critique'}
              </div>
            </div>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  data.status === 'good' ? 'bg-emerald-500' :
                  data.status === 'warning' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (data.ratio / 5000) * 100)}%` }}
              />
            </div>
          </div>
        ))}

        {efficiencyData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/10 italic">
            <Fuel className="size-10 mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
          </div>
        )}
      </div>
    </section>
  );
}
