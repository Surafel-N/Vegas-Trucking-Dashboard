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
      
      // Thresholds: Green < 2500, Orange < 3500, Red >= 3500
      let status: 'good' | 'warning' | 'critical' = 'good';
      if (ratio > 3500) status = 'critical';
      else if (ratio > 2500) status = 'warning';

      return { label: d, ratio, status, totalFuel };
    }).sort((a, b) => b.ratio - a.ratio);
  }, [records]);

  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] p-5 text-white shadow-xl h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Fuel className="size-4" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Efficience Carburant</h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {efficiencyData.map((data) => (
          <div key={data.label} className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">{data.label}</p>
                <p className="text-xs font-bold text-white mt-0.5">{Math.round(data.ratio).toLocaleString()} CFA / Tonne</p>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                data.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' :
                data.status === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {data.status === 'good' ? 'Optimal' : data.status === 'warning' ? 'Élevé' : 'Critique'}
              </div>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
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
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <AlertCircle className="size-8 mb-2" />
            <p className="text-xs font-medium">Aucune donnée de fuel</p>
          </div>
        )}
      </div>
    </section>
  );
}
