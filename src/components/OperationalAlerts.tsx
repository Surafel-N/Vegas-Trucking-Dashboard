import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

type OperationalAlertsProps = {
  records: any[];
  allTrips?: any[];
  oilChanges?: any;
  t?: any;
};

export function OperationalAlerts({ records, allTrips = [], oilChanges, t }: OperationalAlertsProps) {
  const alerts = useMemo(() => {
    const list: { id: string; type: 'critical' | 'warning' | 'info'; title: string; desc: string; date?: string }[] = [];

    // 1. Alertes Vidange Odomètre (Spreadsheet Comments & LocalStorage)
    if (oilChanges) {
      const trucks = [
        { label: "AMARA TRUCK 76", fallbackKm: 117324 },
        { label: "BRAHIMA TRUCK 45", fallbackKm: 110593 },
        { label: "SORO TRUCK 52", fallbackKm: 110975 }
      ];
      
      const tripList = (allTrips && allTrips.length > 0) ? allTrips : records;
      
      trucks.forEach(({ label, fallbackKm }) => {
        const info = oilChanges[label];
        if (!info) return;
        
        const truckTrips = tripList.filter(t => {
          const l = String(t.driverLabel || t.chauffeur || "").toUpperCase();
          return l.includes(label.split(' ')[0]) || l.includes(label.split(' ')[2]);
        });
        
        let maxTripKm = 0;
        truckTrips.forEach(t => {
          let k = Number(t.km || 0);
          if (k === 712827) k = 71283;
          else if (k === 196266) k = 106266;
          else if (k === 10492) k = 107492;
          else if (k === 59757 && t.date < "2025-10-01") k = 50757;
          else if (k > 200000) k = 0;
          if (k >= 20000 && k <= 150000 && k > maxTripKm) {
            maxTripKm = k;
          }
        });
        
        const currentKm = Math.max(fallbackKm, maxTripKm);
        const lastKm = Number(info.mileage) || 0;
        const interval = Number(info.interval) || 10000;
        const driven = Math.max(0, currentKm - lastKm);
        
        if (driven >= interval) {
          const overdue = driven - interval;
          list.push({
            id: `vidange-crit-${label}`,
            type: 'critical',
            title: `VIDANGE URGENTE : ${label.split(' ')[0]}`,
            desc: `Dépassement de +${overdue.toLocaleString("fr-FR")} KM (Roulé ${driven.toLocaleString("fr-FR")} KM depuis la vidange du ${info.date} à ${lastKm.toLocaleString("fr-FR")} KM).`,
            date: info.date
          });
        } else if (driven >= interval * 0.8) {
          const remaining = interval - driven;
          list.push({
            id: `vidange-warn-${label}`,
            type: 'warning',
            title: `VIDANGE IMMINENTE : ${label.split(' ')[0]}`,
            desc: `Plus que ${remaining.toLocaleString("fr-FR")} KM avant la prochaine vidange (${driven.toLocaleString("fr-FR")} / ${interval.toLocaleString("fr-FR")} KM).`,
            date: info.date
          });
        }
      });
    }

    const negativeTrips = records.filter(r => (r.total_net_cfa || 0) < 0);
    negativeTrips.forEach(r => {
      list.push({
        id: `neg-${r.id}`,
        type: 'critical',
        title: t?.negativeMargin || "Marge Négative",
        desc: `${r.driverLabel}: ${t?.lossOf || "Perte de"} ${Math.abs(r.total_net_cfa).toLocaleString()} CFA`,
        date: r.date
      });
    });

    const highFuelMissingTonnage = records.filter(r => (r.fuel_cost_cfa || 0) > 100000 && (r.tonnage || 0) === 0);
    highFuelMissingTonnage.forEach(r => {
      list.push({
        id: `fuel-${r.id}`,
        type: 'warning',
        title: t?.fuelWithoutTonnage || "Fuel sans Tonnage",
        desc: `${r.driverLabel}: ${r.fuel_cost_cfa.toLocaleString()} CFA sans voyage.`,
        date: r.date
      });
    });

    if (records.length > 0) {
      list.push({
        id: 'summary-1',
        type: 'info',
        title: t?.activitySummary || "Activité",
        desc: `${records.length} ${t?.operationsRecorded || "opérations enregistrées"}.`,
      });
    }

    return list.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (b.type === 'critical' && a.type !== 'critical') return 1;
      return (b.date || "").localeCompare(a.date || "");
    }).slice(0, 10);
  }, [records, allTrips, oilChanges, t]);

  const locale = t?.months?.[0] === "January" ? "en-US" : "fr-FR";

  return (
    <section className="panel-enter rounded-[40px] border border-white/5 bg-[#111] p-6 text-white shadow-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <ShieldAlert className="size-5" />
        </div>
        <div>
           <h3 className="text-sm font-black uppercase tracking-tighter">{t?.fleetAlerts || "Alertes Flotte"}</h3>
           <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none mt-0.5">{t?.activeMonitoring || "Surveillance Active"}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {alerts.map((alert) => (
          <div key={alert.id} className={`p-4 rounded-[28px] border transition-all duration-300 ${
            alert.type === 'critical' ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' :
            alert.type === 'warning' ? 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10' :
            'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
          }`}>
            <div className="flex gap-4">
              <div className="mt-1">
                {alert.type === 'critical' ? <AlertTriangle className="size-4 text-red-500 shrink-0" /> :
                 alert.type === 'warning' ? <AlertTriangle className="size-4 text-orange-500 shrink-0" /> :
                 <Info className="size-4 text-blue-400 shrink-0" />}
              </div>
              
              <div className="min-w-0">
                <h4 className={`text-xs font-black uppercase tracking-tight ${
                  alert.type === 'critical' ? 'text-red-400' :
                  alert.type === 'warning' ? 'text-orange-400' :
                  'text-blue-300'
                }`}>{alert.title}</h4>
                <p className="text-[11px] text-white/40 mt-1 leading-relaxed font-medium">{alert.desc}</p>
                {alert.date && <p className="text-[9px] font-black uppercase text-white/10 mt-2 tracking-tighter">{new Date(alert.date).toLocaleDateString(locale)}</p>}
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/10 italic">
            <CheckCircle2 className="size-10 mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-widest">{t?.zeroAnomalies || "Zéro anomalies"}</p>
          </div>
        )}
      </div>
    </section>
  );
}
