import React, { useState, useMemo } from 'react';
import { 
  Wrench, AlertTriangle, CheckCircle2, Clock, 
  RotateCcw, Truck, Calendar, Plus, X, Check, ShieldAlert,
  ChevronRight, Gauge, Info
} from 'lucide-react';
import type { Language } from '../utils/i18n';

export interface OilChangeInfo {
  mileage: number;
  date: string;
  comment?: string;
  interval?: number;
}

export interface OilChangeGaugeWidgetProps {
  allTrips: any[];
  oilChanges: Record<string, OilChangeInfo>;
  onUpdateOilChange?: (truckLabel: string, mileage: number, date: string, comment?: string) => void;
  canEdit?: boolean;
  t?: any;
  language?: Language;
}

const FLEET_DEFINITIONS = [
  {
    id: "AMARA",
    label: "AMARA TRUCK 76",
    driver: "AMARA",
    unit: "76",
    plate: "AA-672-PS",
    fallbackKm: 117324,
    defaultServiceKm: 100312,
    defaultServiceDate: "2026-04-16",
    color: "#4285F4"
  },
  {
    id: "BRAHIMA",
    label: "BRAHIMA TRUCK 45",
    driver: "BRAHIMA",
    unit: "45",
    plate: "AA-736-PK",
    fallbackKm: 110593,
    defaultServiceKm: 93962,
    defaultServiceDate: "2026-04-16",
    color: "#34A853"
  },
  {
    id: "SORO",
    label: "SORO TRUCK 52",
    driver: "SORO",
    unit: "52",
    plate: "AA-579-PJ",
    fallbackKm: 110975,
    defaultServiceKm: 91000,
    defaultServiceDate: "2026-04-24",
    color: "#cf5d56"
  }
];

export function OilChangeGaugeWidget({
  allTrips = [],
  oilChanges = {},
  onUpdateOilChange,
  canEdit = true,
  t,
  language = 'FR'
}: OilChangeGaugeWidgetProps) {
  const isEn = language === 'EN';
  const locale = isEn ? 'en-US' : 'fr-FR';

  const [modalTruck, setModalTruck] = useState<typeof FLEET_DEFINITIONS[0] | null>(null);
  const [modalMileage, setModalMileage] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [modalNotes, setModalNotes] = useState<string>("");

  // Calcul du kilométrage odomètre actuel vérifié et nettoyé pour chaque camion
  const fleetStatus = useMemo(() => {
    return FLEET_DEFINITIONS.map(truck => {
      // Filtrer les trajets du camion
      const truckTrips = (allTrips || []).filter(trip => {
        const lbl = String(trip.driverLabel || trip.chauffeur || "").toUpperCase();
        return lbl.includes(truck.id) || lbl.includes(truck.unit);
      });

      // Trouver le kilométrage le plus récent et valide
      let maxTripKm = 0;
      let lastDate = "";

      // Trier les trajets par date
      const sortedTrips = [...truckTrips].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedTrips.forEach(t => {
        let k = Number(t.km || 0);
        // Nettoyage des anomalies et coquilles
        if (k === 712827) k = 71283;
        else if (k === 196266) k = 106266;
        else if (k === 10492) k = 107492;
        else if (k === 59757 && t.date < "2025-10-01") k = 50757;
        else if (k > 200000) k = 0;
        else if (k < 1000) k = 0;

        if (k >= 20000 && k <= 150000) {
          if (k > maxTripKm) {
            maxTripKm = k;
            lastDate = t.date;
          }
        }
      });

      // Le kilométrage actuel est le plus grand entre le relevé issu des trajets et le relevé vérifié du spreadsheet
      const currentKm = Math.max(truck.fallbackKm, maxTripKm);

      // Données de la dernière vidange
      const stored = oilChanges[truck.label];
      const lastServiceKm = Number(stored?.mileage) || truck.defaultServiceKm;
      const lastServiceDate = stored?.date || truck.defaultServiceDate;
      const interval = Number(stored?.interval) || 10000; // Intervalle recommandé de 10 000 KM

      // Distance parcourue depuis la dernière vidange
      const kmSinceService = Math.max(0, currentKm - lastServiceKm);
      const remainingKm = interval - kmSinceService;
      const percent = Math.min(200, (kmSinceService / interval) * 100);

      const isOverdue = remainingKm < 0;
      const isWarning = remainingKm >= 0 && remainingKm <= 2000;
      const isOk = remainingKm > 2000;

      return {
        ...truck,
        currentKm,
        lastTripDate: lastDate || lastServiceDate,
        lastServiceKm,
        lastServiceDate,
        interval,
        kmSinceService,
        remainingKm,
        percent,
        isOverdue,
        isWarning,
        isOk
      };
    });
  }, [allTrips, oilChanges]);

  // Détection des alertes critiques
  const overdueCount = fleetStatus.filter(f => f.isOverdue).length;

  function openServiceModal(truck: typeof FLEET_DEFINITIONS[0], currentKm: number) {
    setModalTruck(truck);
    setModalMileage(String(currentKm));
    setModalDate(new Date().toISOString().slice(0, 10));
    setModalNotes(isEn ? "Full service (15W40 Oil + Fuel and oil filters)" : "Vidange complète (Huile 15W40 + Filtre à huile et gazole)");
  }

  function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    if (!modalTruck || !onUpdateOilChange) return;

    const km = parseFloat(modalMileage);
    if (isNaN(km) || km <= 0) return;

    onUpdateOilChange(modalTruck.label, km, modalDate, modalNotes.trim());
    setModalTruck(null);
  }

  return (
    <div className="space-y-4">
      {/* BANNIÈRE D'ALERTE GÉNÉRALE SI DÉPASSEMENT */}
      {overdueCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/20 via-red-500/10 to-transparent border border-red-500/30 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500 text-white shadow-lg shadow-red-500/30">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-red-400">
                {isEn 
                  ? `Oil Change Overdue Alert (${overdueCount} truck${overdueCount > 1 ? "s" : ""})`
                  : `Alerte Vidange Dépassée (${overdueCount} camion${overdueCount > 1 ? "s" : ""})`
                }
              </h4>
              <p className="text-[11px] text-white/70 mt-0.5 font-medium">
                {isEn
                  ? "The recommended 10,000 KM threshold has been exceeded. Last recorded services date from April 2026."
                  : "Le seuil recommandé de 10 000 KM a été franchi. Les dernières vidanges datent d'avril 2026."
                }
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30">
            {isEn ? "Action required" : "Action requise"}
          </span>
        </div>
      )}

      {/* EN-TÊTE DU MODULE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20">
            <Gauge className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white">
              {t?.odometerTracking || (isEn ? "Odometer & Oil Change Gauge Tracking" : "Suivi Odomètre & Jauge de Vidange")}
            </h3>
            <p className="text-[10px] text-white/40">
              {t?.manufacturerInterval || (isEn ? "Manufacturer recommended interval: 10,000 KM • Based on SDV Spreadsheet" : "Intervalle recommandé constructeur : 10 000 KM • Basé sur le Spreadsheet SDV")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> &lt; 8 000 KM</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> &gt; 8 000 KM</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500 animate-pulse" /> &gt; 10 000 KM</span>
        </div>
      </div>

      {/* GRILLE DES 3 CAMIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fleetStatus.map(truck => {
          return (
            <div 
              key={truck.id}
              className={`rounded-[28px] p-5 border transition-all duration-300 flex flex-col justify-between ${
                truck.isOverdue 
                  ? "bg-red-500/[0.04] border-red-500/30 shadow-xl shadow-red-500/5 hover:border-red-500/50" 
                  : truck.isWarning 
                    ? "bg-amber-500/[0.04] border-amber-500/30 shadow-xl shadow-amber-500/5 hover:border-amber-500/50"
                    : "bg-[#1c1c1e] border-white/10 hover:border-white/20 shadow-xl"
              }`}
            >
              <div>
                {/* En-tête Camion */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-white">
                      {truck.unit}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{truck.label}</h4>
                      <p className="text-[10px] font-mono text-white/40">{truck.plate}</p>
                    </div>
                  </div>

                  {/* Badge Statut Vidange */}
                  {truck.isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                      <AlertTriangle className="size-3" /> {isEn ? "Overdue" : "Dépassé"}
                    </span>
                  )}
                  {truck.isWarning && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <Clock className="size-3" /> {isEn ? "Upcoming" : "À prévoir"}
                    </span>
                  )}
                  {truck.isOk && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="size-3" /> {isEn ? "Compliant" : "Conforme"}
                    </span>
                  )}
                </div>

                {/* Kilométrage Actuel */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 mb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1">
                    {t?.currentOdometer || (isEn ? "Current Mileage (Odometer)" : "Kilométrage Actuel (Odomètre)")}
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-white tracking-tight">
                      {truck.currentKm.toLocaleString(locale)}
                    </span>
                    <span className="text-xs font-bold text-white/30 font-mono">KM</span>
                  </div>
                </div>

                {/* SECTION JAUGE */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-white/50 flex items-center gap-1">
                      <Wrench className="size-3 text-orange-400" />
                      {isEn ? "Driven since service:" : "Roulé depuis vidange :"}
                    </span>
                    <span className={`font-mono font-black ${
                      truck.isOverdue ? "text-red-400" : truck.isWarning ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {truck.kmSinceService.toLocaleString(locale)} KM
                    </span>
                  </div>

                  {/* Barre de Jauge Horizontale avec seuil 10 000 KM */}
                  <div className="relative w-full h-3.5 bg-black/50 rounded-full border border-white/10 p-0.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        truck.isOverdue 
                          ? "bg-gradient-to-r from-amber-500 via-red-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                          : truck.isWarning
                            ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                            : "bg-gradient-to-r from-blue-500 to-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (truck.kmSinceService / truck.interval) * 100)}%` }}
                    />
                  </div>

                  {/* Statut sous la jauge */}
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-white/30">{isEn ? "Ref. 10,000 KM" : "Réf. 10 000 KM"}</span>
                    {truck.isOverdue ? (
                      <span className="text-red-400 font-mono font-black">
                        +{Math.abs(truck.remainingKm).toLocaleString(locale)} {isEn ? "KM overdue" : "KM de retard"}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono">
                        {isEn ? `${truck.remainingKm.toLocaleString(locale)} KM left` : `Reste ${truck.remainingKm.toLocaleString(locale)} KM`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Historique Dernière Vidange */}
                <div className="pt-3 border-t border-white/5 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-white/50">
                    <span>{isEn ? "Last service:" : "Dernière vidange :"}</span>
                    <span className="font-bold text-white/80 font-mono">
                      {new Date(truck.lastServiceDate).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white/50">
                    <span>{isEn ? "At odometer:" : "Au compteur :"}</span>
                    <span className="font-mono text-white/80 font-bold">
                      {truck.lastServiceKm.toLocaleString(locale)} KM
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              {canEdit && (
                <button
                  onClick={() => openServiceModal(truck, truck.currentKm)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-white/5 hover:bg-orange-500/20 text-white/70 hover:text-orange-300 border border-white/10 hover:border-orange-500/30 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group"
                >
                  <Wrench className="size-3.5 text-orange-400 group-hover:rotate-45 transition-transform" />
                  <span>{isEn ? "Record Oil Service" : "Enregistrer Vidange"}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL RAPIDE : ENREGISTRER UNE VIDANGE */}
      {modalTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm">
                  {modalTruck.unit}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{isEn ? "Record an Oil Service" : "Enregistrer une Vidange"}</h3>
                  <p className="text-xs text-white/40">{modalTruck.label} • {modalTruck.plate}</p>
                </div>
              </div>
              <button onClick={() => setModalTruck(null)} className="p-1.5 text-white/40 hover:text-white rounded-lg">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Service Date *" : "Date de la Vidange *"}
                </label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Odometer Reading at Service (KM) *" : "Kilométrage Compteur au Service (KM) *"}
                </label>
                <input
                  type="number"
                  required
                  value={modalMileage}
                  onChange={(e) => setModalMileage(e.target.value)}
                  placeholder="ex: 117324"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold outline-none focus:border-orange-500"
                />
                <p className="mt-1 text-[10px] text-white/30">
                  {isEn 
                    ? `Last recorded service at ${modalTruck.defaultServiceKm.toLocaleString("en-US")} KM.`
                    : `Dernier service enregistré à ${modalTruck.defaultServiceKm.toLocaleString("fr-FR")} KM.`
                  }
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Completed Work & Notes" : "Travaux Réalisés & Notes"}
                </label>
                <textarea
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder={isEn ? "15W40 Oil, fuel filter, air filter..." : "Huile 15W40, filtre gazole, filtre à air..."}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-3 border-t border-white/8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalTruck(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-bold"
                >
                  {t?.cancel || (isEn ? "Cancel" : "Annuler")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                  <Check className="size-3.5" /> {isEn ? "Validate Oil Service" : "Valider la Vidange"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OilChangeGaugeWidget;

