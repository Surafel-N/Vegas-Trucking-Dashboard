import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

type OperationalAlertsProps = {
  records: any[];
};

export function OperationalAlerts({ records }: OperationalAlertsProps) {
  const alerts = useMemo(() => {
    const list: { id: string; type: 'critical' | 'warning' | 'info'; title: string; desc: string; date?: string }[] = [];

    // 1. Check for negative margin trips
    const negativeTrips = records.filter(r => (r.total_net_cfa || 0) < 0);
    negativeTrips.forEach(r => {
      list.push({
        id: `neg-${r.id}`,
        type: 'critical',
        title: "Marge Négative Détectée",
        desc: `${r.driverLabel} sur ${r.destination}: Perte de ${Math.abs(r.total_net_cfa).toLocaleString()} CFA`,
        date: r.date
      });
    });

    // 2. Check for missing tonnage on fuel expenses
    const highFuelMissingTonnage = records.filter(r => (r.fuel_cost_cfa || 0) > 100000 && (r.tonnage || 0) === 0);
    highFuelMissingTonnage.forEach(r => {
      list.push({
        id: `fuel-${r.id}`,
        type: 'warning',
        title: "Dépense Fuel sans Tonnage",
        desc: `${r.driverLabel}: Plein de ${r.fuel_cost_cfa.toLocaleString()} CFA sans voyage enregistré.`,
        date: r.date
      });
    });

    // 3. Activity summary
    if (records.length > 0) {
      list.push({
        id: 'summary-1',
        type: 'info',
        title: "Volume d'activité",
        desc: `${records.length} opérations enregistrées sur la période sélectionnée.`,
      });
    }

    return list.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 10);
  }, [records]);

  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] p-5 text-white shadow-xl h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
          <ShieldAlert className="size-4" />
        </div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Alertes Opérationnelles</h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {alerts.map((alert) => (
          <div key={alert.id} className={`p-3 rounded-2xl border ${
            alert.type === 'critical' ? 'border-red-500/20 bg-red-500/5' :
            alert.type === 'warning' ? 'border-orange-500/20 bg-orange-500/5' :
            'border-blue-500/20 bg-blue-500/5'
          }`}>
            <div className="flex gap-3">
              {alert.type === 'critical' ? <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" /> :
               alert.type === 'warning' ? <AlertTriangle className="size-4 text-orange-500 shrink-0 mt-0.5" /> :
               <Info className="size-4 text-blue-400 shrink-0 mt-0.5" />}
              
              <div className="min-w-0">
                <h4 className={`text-xs font-bold ${
                  alert.type === 'critical' ? 'text-red-400' :
                  alert.type === 'warning' ? 'text-orange-400' :
                  'text-blue-300'
                }`}>{alert.title}</h4>
                <p className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{alert.desc}</p>
                {alert.date && <p className="text-[9px] font-black uppercase text-white/20 mt-1">{new Date(alert.date).toLocaleDateString('fr-FR')}</p>}
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/10 italic">
            <CheckCircle2 className="size-8 mb-2" />
            <p className="text-xs">Aucune anomalie détectée</p>
          </div>
        )}
      </div>
    </section>
  );
}
