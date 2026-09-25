import { 
  AlertTriangle, Info, CheckCircle2, ShieldAlert, 
  Fuel, Droplet, TrendingDown, ArrowRight, Gauge, 
  Truck, ShieldCheck, Filter, Wrench 
} from "lucide-react";
import { useState, useMemo } from "react";
import { Language, translateComment } from "../utils/i18n";

type OperationalAlertsProps = {
  records: any[];
  allTrips?: any[];
  oilChanges?: any;
  t?: any;
  language?: Language;
};

export function OperationalAlerts({ records, allTrips = [], oilChanges, t, language = "FR" }: OperationalAlertsProps) {
  const isEn = language === "EN";
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'vidange' | 'financial' | 'transit'>('all');

  // Configuration officielle des 3 camions
  const trucksConfig = [
    { key: "AMARA TRUCK 76", name: "AMARA", truckNum: "76", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", fallbackKm: 117324 },
    { key: "BRAHIMA TRUCK 45", name: "BRAHIMA", truckNum: "45", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", fallbackKm: 110593 },
    { key: "SORO TRUCK 52", name: "SORO", truckNum: "52", color: "#CF5D56", bg: "rgba(207, 93, 86, 0.12)", border: "rgba(207, 93, 86, 0.3)", fallbackKm: 110975 }
  ];

  // Calcul haute fidélité des jauges de vidange pour les 3 camions
  const truckGauges = useMemo(() => {
    const tripList = (allTrips && allTrips.length > 0) ? allTrips : records;

    return trucksConfig.map(cfg => {
      const info = oilChanges?.[cfg.key];
      const truckTrips = tripList.filter(t => {
        const l = String(t.driverLabel || t.chauffeur || "").toUpperCase();
        return l.includes(cfg.name) || l.includes(cfg.truckNum);
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

      const currentKm = Math.max(cfg.fallbackKm, maxTripKm);
      const lastKm = Number(info?.mileage) || 0;
      const interval = Number(info?.interval) || 10000;
      const driven = Math.max(0, currentKm - lastKm);
      const remaining = interval - driven;
      const percent = Math.min(100, Math.round((driven / interval) * 100));

      let status: 'ok' | 'warning' | 'urgent' = 'ok';
      if (driven >= interval) status = 'urgent';
      else if (driven >= interval * 0.8) status = 'warning';

      return {
        ...cfg,
        lastKm,
        currentKm,
        driven,
        remaining,
        percent,
        status,
        lastDate: info?.date || "2026-04-16",
        comment: info?.comment
      };
    });
  }, [allTrips, records, oilChanges]);

  // Liste enrichie des alertes ciblées et filtrage des faux positifs
  const { allAlerts, counts } = useMemo(() => {
    const list: {
      id: string;
      category: 'vidange' | 'financial' | 'fuel' | 'transit' | 'system';
      type: 'critical' | 'warning' | 'info';
      title: string;
      desc: string;
      truck?: string;
      truckColor?: string;
      date?: string;
      amount?: number;
    }[] = [];

    // 1. Alertes Vidange réelles générées depuis les jauges certifiées
    truckGauges.forEach(gauge => {
      if (gauge.status === 'urgent') {
        const overdue = Math.abs(gauge.remaining);
        list.push({
          id: `vidange-urgent-${gauge.key}`,
          category: 'vidange',
          type: 'critical',
          title: isEn 
            ? `OVERDUE OIL SERVICE : ${gauge.name} TRUCK ${gauge.truckNum}`
            : `VIDANGE DÉPASSÉE : ${gauge.name} TRUCK ${gauge.truckNum}`,
          desc: isEn
            ? `Critical excess of +${overdue.toLocaleString("en-US")} KM (${gauge.driven.toLocaleString("en-US")} KM driven since oil service on ${gauge.lastDate} at ${gauge.lastKm.toLocaleString("en-US")} KM). High mechanical risk.`
            : `Dépassement critique de +${overdue.toLocaleString("fr-FR")} KM (Roulé ${gauge.driven.toLocaleString("fr-FR")} KM depuis la vidange du ${gauge.lastDate} à ${gauge.lastKm.toLocaleString("fr-FR")} KM). Risque mécanique élevé.`,
          truck: `${gauge.name} ${gauge.truckNum}`,
          truckColor: gauge.color,
          date: gauge.lastDate
        });
      } else if (gauge.status === 'warning') {
        list.push({
          id: `vidange-warn-${gauge.key}`,
          category: 'vidange',
          type: 'warning',
          title: isEn
            ? `IMMINENT OIL SERVICE : ${gauge.name} TRUCK ${gauge.truckNum}`
            : `VIDANGE IMMINENTE : ${gauge.name} TRUCK ${gauge.truckNum}`,
          desc: isEn
            ? `Only ${gauge.remaining.toLocaleString("en-US")} KM remaining before service (${gauge.driven.toLocaleString("en-US")} / 10,000 KM driven).`
            : `Plus que ${gauge.remaining.toLocaleString("fr-FR")} KM avant révision (${gauge.driven.toLocaleString("fr-FR")} / 10 000 KM roulés).`,
          truck: `${gauge.name} ${gauge.truckNum}`,
          truckColor: gauge.color,
          date: gauge.lastDate
        });
      }
    });

    // 2. Traitement analytique des enregistrements d'exploitation
    records.forEach(r => {
      const driver = String(r.driverLabel || r.chauffeur || "");
      let color = "#CF5D56";
      if (driver.includes("AMARA")) color = "#3B82F6";
      else if (driver.includes("BRAHIMA")) color = "#10B981";

      const tonnage = Number(r.tonnage) || 0;
      const gross = Number(r.total_gross_cfa) || 0;
      const fuel = Number(r.fuel_cost_cfa) || 0;
      const road = Number(r.road_fees_cfa) || 0;
      const net = Number(r.total_net_cfa) || 0;
      const expense = Number(r.total_expense_cfa) || (fuel + road);

      // CAS A : Départ / Transit à vide vers la mine (Point de stationnement -> Site d'extraction)
      if (tonnage === 0 && gross === 0 && expense > 0) {
        list.push({
          id: `transit-${r.id}`,
          category: 'transit',
          type: 'info',
          title: isEn ? `Deployment towards mine (Empty transit)` : `Mise en route vers la mine (Trajet à vide)`,
          desc: isEn
            ? `${r.driverLabel || 'Truck'} : Relocation from parking station to extraction site empty (${expense.toLocaleString("en-US")} CFA fuel/road). Normal operational setup cost.`
            : `${r.driverLabel || 'Camion'} : Ralliement du point de stationnement au site d'extraction à vide (${expense.toLocaleString("fr-FR")} CFA de gasoil/route). Coût normal de mise en place opérationnelle.`,
          truck: r.driverLabel,
          truckColor: color,
          amount: expense,
          date: r.date
        });
        return;
      }

      // CAS B : VRAIE Marge Négative sur Voyage Chargé (Anomalie de rentabilité commerciale)
      if (tonnage > 0 && net < 0) {
        list.push({
          id: `neg-${r.id}`,
          category: 'financial',
          type: 'critical',
          title: isEn ? `Negative Margin on Loaded Trip` : `Marge Négative sur Voyage Chargé`,
          desc: isEn
            ? `${r.driverLabel || 'Truck'} : Loss of ${Math.abs(net).toLocaleString("en-US")} CFA on loaded trip of ${tonnage}T (Revenue insufficient for expenses incurred).`
            : `${r.driverLabel || 'Camion'} : Perte de ${Math.abs(net).toLocaleString("fr-FR")} CFA sur voyage chargé de ${tonnage}T (Recette insuffisante face aux frais engagés).`,
          truck: r.driverLabel,
          truckColor: color,
          amount: Math.abs(net),
          date: r.date
        });
      }

      // CAS C : Surconsommation Carburant anormale sur voyage chargé (> 4 200 CFA / Tonne)
      if (tonnage > 0 && fuel > 0) {
        const ratioFuelPerTon = fuel / tonnage;
        if (ratioFuelPerTon > 4200) {
          list.push({
            id: `fuel-ratio-${r.id}`,
            category: 'fuel',
            type: 'warning',
            title: isEn 
              ? `Fuel Overconsumption (${Math.round(ratioFuelPerTon).toLocaleString("en-US")} CFA/T)`
              : `Surconsommation Gasoil (${Math.round(ratioFuelPerTon).toLocaleString("fr-FR")} CFA/T)`,
            desc: isEn
              ? `${r.driverLabel || 'Truck'} : Abnormally high fuel ratio (${fuel.toLocaleString("en-US")} CFA for ${tonnage}T carried).`
              : `${r.driverLabel || 'Camion'} : Ratio carburant anormalement élevé (${fuel.toLocaleString("fr-FR")} CFA pour ${tonnage}T transportées).`,
            truck: r.driverLabel,
            truckColor: color,
            amount: fuel,
            date: r.date
          });
        }
      }

      // CAS D : Frais de Route / Péages inhabituels (> 95 000 CFA)
      if (road > 95000) {
        list.push({
          id: `road-${r.id}`,
          category: 'financial',
          type: 'warning',
          title: isEn
            ? `High Road Fees (${road.toLocaleString("en-US")} CFA)`
            : `Frais de Route Élevés (${road.toLocaleString("fr-FR")} CFA)`,
          desc: isEn
            ? `${r.driverLabel || 'Truck'} : Significant excess in road fees/tolls on ${r.date}.`
            : `${r.driverLabel || 'Camion'} : Dépassement important des frais de route/péages le ${r.date}.`,
          truck: r.driverLabel,
          truckColor: color,
          amount: road,
          date: r.date
        });
      }
    });

    // Tri : critiques en premier, puis les avertissements, puis par date décroissante
    const sorted = list.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      if (order[a.type] !== order[b.type]) {
        return order[a.type] - order[b.type];
      }
      return (b.date || "").localeCompare(a.date || "");
    });

    const counts = {
      all: sorted.length,
      critical: sorted.filter(a => a.type === 'critical').length,
      warning: sorted.filter(a => a.type === 'warning').length,
      vidange: sorted.filter(a => a.category === 'vidange').length,
      transit: sorted.filter(a => a.category === 'transit').length,
      financial: sorted.filter(a => a.category === 'financial' || a.category === 'fuel').length
    };

    return { allAlerts: sorted, counts };
  }, [truckGauges, records]);

  // Filtrage selon le bouton chip sélectionné
  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'critical') return allAlerts.filter(a => a.type === 'critical');
    if (activeFilter === 'warning') return allAlerts.filter(a => a.type === 'warning');
    if (activeFilter === 'vidange') return allAlerts.filter(a => a.category === 'vidange');
    if (activeFilter === 'transit') return allAlerts.filter(a => a.category === 'transit');
    if (activeFilter === 'financial') return allAlerts.filter(a => a.category === 'financial' || a.category === 'fuel');
    return allAlerts;
  }, [allAlerts, activeFilter]);

  const locale = t?.months?.[0] === "January" ? "en-US" : "fr-FR";

  return (
    <section className="panel-enter rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 text-white shadow-2xl h-full flex flex-col relative overflow-hidden">
      {/* GLOW DE FOND */}
      <div className={`absolute top-0 right-0 w-64 h-64 ${counts.critical > 0 ? 'bg-red-500/5' : 'bg-[#10B981]/5'} rounded-full blur-3xl pointer-events-none`}></div>

      {/* EN-TÊTE DU MODULE AVEC STATUT GLOBAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg ${
            counts.critical > 0 
              ? 'bg-red-500/15 border-red-500/30 text-red-500 shadow-red-500/10' 
              : counts.warning > 0 
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 shadow-amber-500/10' 
                : 'bg-[#10B981]/15 border-[#10B981]/30 text-[#10B981] shadow-[#10B981]/10'
          }`}>
            {counts.critical > 0 ? <ShieldAlert className="size-6 animate-pulse" /> : <ShieldCheck className="size-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-tight">
                {t?.fleetAlerts || (isEn ? "Fleet & Maintenance Alerts" : "Alertes Flotte & Maintenance")}
              </h3>
              {counts.critical > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  {isEn ? `${counts.critical} Critical` : `${counts.critical} Critique(s)`}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                  {isEn ? "Optimal System" : "Système Optimal"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">
              {isEn 
                ? "Continuous monitoring of oil services (10,000 KM), net margins and fuel" 
                : "Surveillance continue des vidanges (10 000 KM), des marges nettes et du carburant"}
            </p>
          </div>
        </div>
      </div>

      {/* BANDEAU DE JAUGES DE VIDANGE POUR LES 3 CAMIONS */}
      <div className="mb-5 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-white/40">
          <span className="flex items-center gap-1.5">
            <Gauge className="size-3.5 text-[#00F2FF]" />
            {isEn ? "Engine Oil Service Tracking (10,000 KM Interval)" : "Suivi des Vidanges Moteurs (Intervalle 10 000 KM)"}
          </span>
          <span className="text-white/30 text-[10px]">
            {isEn ? "Certified odometer" : "Odomètre certifié"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {truckGauges.map(truck => {
            const isOverdue = truck.status === 'urgent';
            const isWarning = truck.status === 'warning';

            return (
              <div 
                key={truck.key}
                className={`p-2.5 rounded-xl border transition-all ${
                  isOverdue 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : isWarning 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-white/[0.03] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: truck.color }}></span>
                    <span className="font-black text-xs text-white">{truck.name} {truck.truckNum}</span>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    isOverdue 
                      ? 'bg-red-500/20 text-red-400 font-mono' 
                      : isWarning 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-[#10B981]/20 text-[#10B981]'
                  }`}>
                    {isOverdue 
                      ? `+${Math.abs(truck.remaining).toLocaleString(isEn ? "en-US" : "fr-FR")} KM` 
                      : `${truck.remaining.toLocaleString(isEn ? "en-US" : "fr-FR")} KM ${isEn ? "remaining" : "restants"}`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      isOverdue 
                        ? 'bg-red-500 animate-pulse' 
                        : isWarning 
                          ? 'bg-amber-500' 
                          : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${truck.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-white/40">
                  <span>{truck.driven.toLocaleString(isEn ? "en-US" : "fr-FR")} / 10 000 KM</span>
                  <span className="font-mono text-white/60">{truck.currentKm.toLocaleString(isEn ? "en-US" : "fr-FR")} KM {isEn ? "curr." : "act."}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BARRE DE FILTRES RAPIDES (CHIPS) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-white/20 text-white shadow-sm'
              : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
          }`}
        >
          {isEn ? `All (${counts.all})` : `Toutes (${counts.all})`}
        </button>

        <button
          onClick={() => setActiveFilter('critical')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'critical'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'bg-white/5 text-red-400 hover:bg-red-500/10'
          }`}
        >
          <span className="size-1.5 rounded-full bg-current"></span>
          {isEn ? `Critical (${counts.critical})` : `Critiques (${counts.critical})`}
        </button>

        <button
          onClick={() => setActiveFilter('warning')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'warning'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <span className="size-1.5 rounded-full bg-current"></span>
          {isEn ? `Warnings (${counts.warning})` : `Avertissements (${counts.warning})`}
        </button>

        <button
          onClick={() => setActiveFilter('vidange')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'vidange'
              ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20'
              : 'bg-white/5 text-[#00F2FF] hover:bg-[#00F2FF]/10'
          }`}
        >
          <Droplet className="size-3" />
          {isEn ? `Oil Services (${counts.vidange})` : `Vidanges (${counts.vidange})`}
        </button>

        <button
          onClick={() => setActiveFilter('transit')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'transit'
              ? 'bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/20'
              : 'bg-white/5 text-[#3B82F6] hover:bg-blue-500/10'
          }`}
        >
          <Truck className="size-3" />
          {isEn ? `Mine Transits (${counts.transit})` : `Transits Mine (${counts.transit})`}
        </button>

        <button
          onClick={() => setActiveFilter('financial')}
          className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'financial'
              ? 'bg-[#CF5D56] text-white shadow-lg shadow-[#CF5D56]/20'
              : 'bg-white/5 text-[#CF5D56] hover:bg-[#CF5D56]/10'
          }`}
        >
          <TrendingDown className="size-3" />
          {isEn ? `Margin & Fuel (${counts.financial})` : `Marge & Carburant (${counts.financial})`}
        </button>
      </div>

      {/* LISTE FLUIDE DES ALERTES */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar min-h-[220px]">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="size-12 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] mb-2 shadow-lg shadow-[#10B981]/5">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="text-xs font-black uppercase text-white/80 tracking-wide">
              {activeFilter === 'all' 
                ? (isEn ? "Fleet 100% Operational" : "Flotte 100% Opérationnelle") 
                : (isEn ? "No alerts in this category" : "Aucune alerte dans cette catégorie")}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {isEn ? "All metrics and oil services are under control" : "Toutes les métriques et vidanges sont sous contrôle"}
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isCrit = alert.type === 'critical';
            const isWarn = alert.type === 'warning';
            const isTransit = alert.category === 'transit';

            return (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 group ${
                  isCrit 
                    ? 'border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/[0.08]' 
                    : isWarn 
                      ? 'border-amber-500/25 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]' 
                      : isTransit
                        ? 'border-blue-500/20 bg-blue-500/[0.03] hover:bg-blue-500/[0.06]'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-xl border shrink-0 ${
                    isCrit 
                      ? 'bg-red-500/15 border-red-500/30 text-red-400' 
                      : isWarn 
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                        : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                  }`}>
                    {alert.category === 'vidange' ? (
                      <Droplet className="size-4" />
                    ) : alert.category === 'transit' ? (
                      <Truck className="size-4" />
                    ) : alert.category === 'fuel' ? (
                      <Fuel className="size-4" />
                    ) : (
                      <AlertTriangle className="size-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {alert.truck && (
                          <span 
                            className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border"
                            style={{ 
                              color: alert.truckColor || "#fff", 
                              backgroundColor: `${alert.truckColor}15` || "rgba(255,255,255,0.05)",
                              borderColor: `${alert.truckColor}30` || "rgba(255,255,255,0.1)"
                            }}
                          >
                            {alert.truck}
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : isTransit ? 'text-blue-400' : 'text-emerald-400'
                        }`}>
                          {isCrit 
                            ? (isEn ? "Critical" : "Critique") 
                            : isWarn 
                              ? (isEn ? "Warning" : "Avertissement") 
                              : isTransit 
                                ? (isEn ? "Mine Transit (Empty)" : "Transit Mine (À vide)") 
                                : "Info"}
                        </span>
                      </div>

                      {alert.date && (
                        <span className="text-[10px] font-bold text-white/30 font-mono whitespace-nowrap">
                          {new Date(alert.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-white leading-tight">{alert.title}</h4>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{alert.desc}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default OperationalAlerts;
