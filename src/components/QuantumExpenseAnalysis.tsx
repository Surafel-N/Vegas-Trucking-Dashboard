import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip
} from 'recharts';
import { 
  Fuel, 
  ShieldCheck, 
  Utensils, 
  Anchor, 
  PlusCircle, 
  Wallet, 
  Truck, 
  Wrench, 
  Route,
  TrendingUp,
  Percent,
  Layers,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { type Language } from '../utils/i18n';

// --- PALETTE DE COULEURS HARMONISÉE & CONTRASTÉE ---
export const QUANTUM_PALETTE = {
  // Par Nature de Frais
  fuel: { color: "#00F2FF", light: "#A5F3FC", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  maintenance: { color: "#F59E0B", light: "#FDE68A", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  road: { color: "#8B5CF6", light: "#DDD6FE", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
  police: { color: "#EC4899", light: "#FBCFE8", bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400" },
  food: { color: "#10B981", light: "#A7F3D0", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  extra: { color: "#F97316", light: "#FED7AA", bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },

  // Par Véhicule / Chauffeur
  drivers: {
    AMARA: { color: "#3B82F6", light: "#93C5FD", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
    BRAHIMA: { color: "#10B981", light: "#6EE7B7", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
    SORO: { color: "#CF5D56", light: "#FCA5A5", bg: "bg-[#cf5d56]/10", border: "border-[#cf5d56]/30", text: "text-[#cf5d56]" },
    FLOTTE: { color: "#A855F7", light: "#E9D5FF", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" }
  }
};

export const TRUCKS_CONFIG = [
  { key: "AMARA", label: "AMARA TRUCK 76", shortName: "AMARA", unit: "76", plate: "AA-672-PS", color: "#3B82F6" },
  { key: "BRAHIMA", label: "BRAHIMA TRUCK 45", shortName: "BRAHIMA", unit: "45", plate: "AA-736-PK", color: "#10B981" },
  { key: "SORO", label: "SORO TRUCK 52", shortName: "SORO", unit: "52", plate: "AA-579-PJ", color: "#CF5D56" }
];

type QuantumProps = {
  data: any[];
  maintenanceTotal: number;
  maintenanceRecords?: any[];
  allMaintenanceRecords?: any[];
  formatCurrency?: (val: number, curr?: string) => string;
  currency?: string;
  t?: any;
  records?: any[];
  allTrips?: any[];
  language?: Language;
};

// Helper pour calculer le numéro de semaine ISO
function getWeekInfo(dateStr: string, lang: Language = 'FR') {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayNr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = `${monday.getDate().toString().padStart(2, '0')}/${(monday.getMonth() + 1).toString().padStart(2, '0')}`;
  const endStr = `${sunday.getDate().toString().padStart(2, '0')}/${(sunday.getMonth() + 1).toString().padStart(2, '0')}`;

  return {
    year: d.getFullYear(),
    week,
    key: `${d.getFullYear()}-W${String(week).padStart(2, '0')}`,
    label: `${lang === 'EN' ? 'Week' : 'Semaine'} ${week} (${startStr} - ${endStr})`
  };
}

export function QuantumExpenseAnalysis({ 
  data = [], 
  maintenanceTotal = 0, 
  maintenanceRecords = [],
  allMaintenanceRecords = [],
  formatCurrency, 
  currency = "CFA",
  t, 
  records = [],
  allTrips = [],
  language = 'FR'
}: QuantumProps) {
  // Mode de vue : "driver" (par camion) par défaut ou "nature" (par type de coût)
  const [perspective, setPerspective] = useState<"driver" | "nature">("driver");
  // Granularité temporelle : "global" | "year" | "month" | "week" | "day"
  const [timeScale, setTimeScale] = useState<"global" | "year" | "month" | "week" | "day">("global");
  
  // Période sélectionnée dans le sélecteur contextuel
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  
  // Accordéon / détail étendu par camion
  const [expandedTruck, setExpandedTruck] = useState<string | null>(null);
  // Tranche survolée sur le Donut
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${new Intl.NumberFormat(language === 'EN' ? 'en-US' : 'fr-FR').format(Math.round(val))} ${currency}`;
  };

  const formatCompact = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return String(Math.round(val));
  };

  // Base complète des trajets et de la maintenance
  const sourceTrips = useMemo(() => {
    return allTrips && allTrips.length > 0 ? allTrips : data;
  }, [allTrips, data]);

  const sourceMaintenance = useMemo(() => {
    return allMaintenanceRecords && allMaintenanceRecords.length > 0 ? allMaintenanceRecords : maintenanceRecords;
  }, [allMaintenanceRecords, maintenanceRecords]);

  // --- LISTES DES PÉRIODES DISPONIBLES POUR LE SÉLECTEUR ---
  const timePeriods = useMemo(() => {
    const yearsSet = new Set<string>();
    const monthsMap = new Map<string, string>();
    const weeksMap = new Map<string, string>();
    const daysSet = new Set<string>();

    sourceTrips.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return;
      
      const y = String(d.getFullYear());
      yearsSet.add(y);

      const mKey = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString(language === 'EN' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' });
      monthsMap.set(mKey, mLabel);

      const wInfo = getWeekInfo(r.date, language);
      if (wInfo) {
        weeksMap.set(wInfo.key, wInfo.label);
      }

      daysSet.add(r.date);
    });

    const years = Array.from(yearsSet).sort().reverse();
    const months = Array.from(monthsMap.entries()).map(([k, label]) => ({ key: k, label })).sort((a, b) => b.key.localeCompare(a.key));
    const weeks = Array.from(weeksMap.entries()).map(([k, label]) => ({ key: k, label })).sort((a, b) => b.key.localeCompare(a.key));
    const days = Array.from(daysSet).sort().reverse();

    return { years, months, weeks, days };
  }, [sourceTrips, language]);

  // Initialisation par défaut des sélecteurs si non renseignés
  useMemo(() => {
    if (!selectedMonth && timePeriods.months.length > 0) {
      setSelectedMonth(timePeriods.months[0].key);
    }
    if (!selectedWeek && timePeriods.weeks.length > 0) {
      setSelectedWeek(timePeriods.weeks[0].key);
    }
    if (!selectedDay && timePeriods.days.length > 0) {
      setSelectedDay(timePeriods.days[0]);
    }
  }, [timePeriods]);

  // --- FILTRAGE DES TRAJETS ET MAINTENANCES SELON LE SÉLECTEUR TEMPOREL DU MODULE ---
  const { scopedTrips, scopedMaintenance, periodLabel } = useMemo(() => {
    if (timeScale === "global") {
      return { 
        scopedTrips: data, 
        scopedMaintenance: maintenanceRecords,
        periodLabel: language === 'EN' ? "Active dashboard period" : "Période active du tableau de bord"
      };
    }

    if (timeScale === "year") {
      const trips = sourceTrips.filter(r => r.date && r.date.startsWith(selectedYear));
      const maint = sourceMaintenance.filter(r => r.date && r.date.startsWith(selectedYear));
      return { 
        scopedTrips: trips, 
        scopedMaintenance: maint, 
        periodLabel: language === 'EN' ? `Year ${selectedYear}` : `Année ${selectedYear}` 
      };
    }

    if (timeScale === "month") {
      const trips = sourceTrips.filter(r => r.date && r.date.startsWith(selectedMonth));
      const maint = sourceMaintenance.filter(r => r.date && r.date.startsWith(selectedMonth));
      const label = timePeriods.months.find(m => m.key === selectedMonth)?.label || selectedMonth;
      return { 
        scopedTrips: trips, 
        scopedMaintenance: maint, 
        periodLabel: language === 'EN' ? `Month of ${label}` : `Mois de ${label}` 
      };
    }

    if (timeScale === "week") {
      const trips = sourceTrips.filter(r => {
        const w = getWeekInfo(r.date, language);
        return w && w.key === selectedWeek;
      });
      const maint = sourceMaintenance.filter(r => {
        const w = getWeekInfo(r.date, language);
        return w && w.key === selectedWeek;
      });
      const label = timePeriods.weeks.find(w => w.key === selectedWeek)?.label || selectedWeek;
      return { scopedTrips: trips, scopedMaintenance: maint, periodLabel: label };
    }

    if (timeScale === "day") {
      const trips = sourceTrips.filter(r => r.date === selectedDay);
      const maint = sourceMaintenance.filter(r => r.date === selectedDay);
      const dayFormatted = selectedDay ? new Date(selectedDay).toLocaleDateString(language === 'EN' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "";
      return { scopedTrips: trips, scopedMaintenance: maint, periodLabel: dayFormatted };
    }

    return { 
      scopedTrips: data, 
      scopedMaintenance: maintenanceRecords, 
      periodLabel: language === 'EN' ? "Global" : "Global" 
    };
  }, [timeScale, selectedYear, selectedMonth, selectedWeek, selectedDay, sourceTrips, sourceMaintenance, data, maintenanceRecords, timePeriods, language]);

  // Navigation jour précédent / jour suivant
  const handleDayStep = (delta: number) => {
    const idx = timePeriods.days.indexOf(selectedDay);
    if (idx === -1) return;
    const nextIdx = idx - delta; // note: days is descending (0 is latest)
    if (nextIdx >= 0 && nextIdx < timePeriods.days.length) {
      setSelectedDay(timePeriods.days[nextIdx]);
    }
  };

  // Helper pour attribuer la maintenance à un camion précis
  const getMaintenanceTruck = (r: any): "AMARA" | "BRAHIMA" | "SORO" | "FLOTTE" => {
    const v = String(r?.vehicle || r?.driverLabel || r?.description || "").toUpperCase();
    if (v.includes("AMARA") || v.includes("76")) return "AMARA";
    if (v.includes("BRAHIMA") || v.includes("45")) return "BRAHIMA";
    if (v.includes("SORO") || v.includes("SORRO") || v.includes("52")) return "SORO";
    return "FLOTTE";
  };

  // --- 2. CALCUL FINANCIER COMPLET PAR CAMION & PAR NATURE ---
  const financialModel = useMemo(() => {
    // A. Calcul de la maintenance allouée
    let maintAmara = 0;
    let maintBrahima = 0;
    let maintSoro = 0;
    let maintFlotte = 0;

    scopedMaintenance.forEach(r => {
      const cost = Number(r.cost || r.amount || 0);
      const tKey = getMaintenanceTruck(r);
      if (tKey === "AMARA") maintAmara += cost;
      else if (tKey === "BRAHIMA") maintBrahima += cost;
      else if (tKey === "SORO") maintSoro += cost;
      else maintFlotte += cost;
    });

    // Répartition de la maintenance générale équitablement sur les 3 camions
    const sharedMaintPerTruck = maintFlotte / 3;

    // B. Initialisation des agrégats par camion
    const trucksData = {
      AMARA: {
        ca: 0,
        fuel: 0,
        roadFees: 0, // péages + autoroute
        policeFees: 0,
        foodFees: 0,
        extraFees: 0,
        directMaintenance: maintAmara,
        totalMaintenance: maintAmara + sharedMaintPerTruck,
        sharedMaintenance: sharedMaintPerTruck,
        tonnage: 0,
        tripsCount: 0
      },
      BRAHIMA: {
        ca: 0,
        fuel: 0,
        roadFees: 0,
        policeFees: 0,
        foodFees: 0,
        extraFees: 0,
        directMaintenance: maintBrahima,
        totalMaintenance: maintBrahima + sharedMaintPerTruck,
        sharedMaintenance: sharedMaintPerTruck,
        tonnage: 0,
        tripsCount: 0
      },
      SORO: {
        ca: 0,
        fuel: 0,
        roadFees: 0,
        policeFees: 0,
        foodFees: 0,
        extraFees: 0,
        directMaintenance: maintSoro,
        totalMaintenance: maintSoro + sharedMaintPerTruck,
        sharedMaintenance: sharedMaintPerTruck,
        tonnage: 0,
        tripsCount: 0
      }
    };

    scopedTrips.forEach(r => {
      const lbl = String(r.driverLabel || r.chauffeur || "").toUpperCase();
      let key: "AMARA" | "BRAHIMA" | "SORO" | null = null;
      if (lbl.includes("AMARA") || lbl.includes("76")) key = "AMARA";
      else if (lbl.includes("BRAHIMA") || lbl.includes("45")) key = "BRAHIMA";
      else if (lbl.includes("SORO") || lbl.includes("SORRO") || lbl.includes("52")) key = "SORO";
      if (!key) return;

      const tObj = trucksData[key];
      tObj.ca += Number(r.total_gross_cfa) || 0;
      tObj.fuel += Number(r.fuel_cost_cfa) || 0;
      tObj.roadFees += Number(r.road_fees_cfa) || 0;
      tObj.policeFees += Number(r.police_fees_cfa) || 0;
      tObj.foodFees += Number(r.food_fees_cfa) || 0;
      tObj.extraFees += Number(r.other_expenses_cfa) || 0;
      tObj.tonnage += Number(r.tonnage) || 0;
      tObj.tripsCount += 1;
    });

    // C. Synthèse détaillée des 3 camions avec les 5 métriques exigées
    const detailedTrucks = TRUCKS_CONFIG.map(cfg => {
      const raw = trucksData[cfg.key as keyof typeof trucksData];
      const ca = raw.ca;
      const fuel = raw.fuel;
      const totalRouteExpenses = raw.roadFees + raw.policeFees + raw.foodFees + raw.extraFees;
      const maintenance = raw.totalMaintenance;
      const totalExpenses = fuel + totalRouteExpenses + maintenance;
      const net = ca - totalExpenses;
      const margin = ca > 0 ? (net / ca) * 100 : 0;

      return {
        ...cfg,
        ca,
        fuel,
        totalRouteExpenses,
        maintenance,
        directMaintenance: raw.directMaintenance,
        sharedMaintenance: raw.sharedMaintenance,
        totalExpenses,
        net,
        margin,
        tonnage: Math.round(raw.tonnage * 10) / 10,
        tripsCount: raw.tripsCount,
        subDetails: {
          tolls: raw.roadFees,
          police: raw.policeFees,
          meals: raw.foodFees,
          extras: raw.extraFees
        }
      };
    });

    // D. Totaux Flotte Globaux
    const totalFleetCA = detailedTrucks.reduce((s, t) => s + t.ca, 0);
    const totalFleetFuel = detailedTrucks.reduce((s, t) => s + t.fuel, 0);
    const totalFleetRoute = detailedTrucks.reduce((s, t) => s + t.totalRouteExpenses, 0);
    const totalFleetMaintenance = detailedTrucks.reduce((s, t) => s + t.maintenance, 0);
    const totalFleetExpenses = totalFleetFuel + totalFleetRoute + totalFleetMaintenance;
    const totalFleetNet = totalFleetCA - totalFleetExpenses;
    const totalFleetMargin = totalFleetCA > 0 ? (totalFleetNet / totalFleetCA) * 100 : 0;
    const totalFleetTrips = detailedTrucks.reduce((s, t) => s + t.tripsCount, 0);

    // E. Données pour le Donut en perspective "driver" (par camion)
    const donutDrivers = detailedTrucks.map(t => ({
      id: t.key,
      name: t.label,
      shortName: t.shortName,
      unit: t.unit,
      value: t.totalExpenses,
      color: t.color,
      percent: totalFleetExpenses > 0 ? (t.totalExpenses / totalFleetExpenses) * 100 : 0,
      net: t.net,
      ca: t.ca
    }));

    // F. Données pour le Donut en perspective "nature" (par type de coût)
    const totalTolls = detailedTrucks.reduce((s, t) => s + t.subDetails.tolls, 0);
    const totalPolice = detailedTrucks.reduce((s, t) => s + t.subDetails.police, 0);
    const totalMeals = detailedTrucks.reduce((s, t) => s + t.subDetails.meals, 0);
    const totalExtras = detailedTrucks.reduce((s, t) => s + t.subDetails.extras, 0);

    const donutNature = [
      { 
        id: "fuel", 
        name: language === 'EN' ? "Diesel Fuel" : "Gasoil", 
        value: totalFleetFuel, 
        color: QUANTUM_PALETTE.fuel.color, 
        icon: Fuel, 
        desc: language === 'EN' ? "Engine fuel" : "Carburant moteur" 
      },
      { 
        id: "maintenance", 
        name: language === 'EN' ? "Maintenance" : "Maintenance", 
        value: totalFleetMaintenance, 
        color: QUANTUM_PALETTE.maintenance.color, 
        icon: Wrench, 
        desc: language === 'EN' ? "Workshop, services & parts" : "Atelier, révisions & pièces" 
      },
      { 
        id: "road", 
        name: language === 'EN' ? "Tolls & Highway" : "Péages & Autoroute", 
        value: totalTolls, 
        color: QUANTUM_PALETTE.road.color, 
        icon: Anchor, 
        desc: language === 'EN' ? "Right of way & weighing" : "Droits de passage & pesée" 
      },
      { 
        id: "police", 
        name: language === 'EN' ? "Police Checks" : "Contrôles Police", 
        value: totalPolice, 
        color: QUANTUM_PALETTE.police.color, 
        icon: ShieldCheck, 
        desc: language === 'EN' ? "Escorts & checkpoints" : "Escortes & contrôles" 
      },
      { 
        id: "food", 
        name: language === 'EN' ? "Meals & Road Per Diem" : "Repas & Route", 
        value: totalMeals, 
        color: QUANTUM_PALETTE.food.color, 
        icon: Utensils, 
        desc: language === 'EN' ? "Mission allowances" : "Indemnités de mission" 
      },
      { 
        id: "extra", 
        name: language === 'EN' ? "Misc & Extras" : "Divers & Extras", 
        value: totalExtras, 
        color: QUANTUM_PALETTE.extra.color, 
        icon: PlusCircle, 
        desc: language === 'EN' ? "Repairs & unexpected" : "Dépannages & imprévus" 
      }
    ]
      .filter(item => item.value > 0)
      .map(item => ({
        ...item,
        percent: totalFleetExpenses > 0 ? (item.value / totalFleetExpenses) * 100 : 0
      }));

    return {
      detailedTrucks,
      totalFleetCA,
      totalFleetFuel,
      totalFleetRoute,
      totalFleetMaintenance,
      totalFleetExpenses,
      totalFleetNet,
      totalFleetMargin,
      totalFleetTrips,
      donutDrivers,
      donutNature
    };
  }, [scopedTrips, scopedMaintenance, language]);

  // Données de l'anneau actif selon la perspective choisie
  const activeDonutData = perspective === "driver" ? financialModel.donutDrivers : financialModel.donutNature;
  const hoveredSlice = activeIndex !== null && activeDonutData[activeIndex] ? activeDonutData[activeIndex] : null;

  return (
    <div className="w-full h-full flex flex-col gap-5">
      
      {/* ======================================================== */}
      {/* 1. BARRE DE COMMANDE & CONTRÔLE TEMPOREL MULTI-NIVEAUX */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-3xl bg-black/40 border border-white/8 shadow-xl">
        
        {/* Sélecteur de perspective (Par Camion vs Par Nature) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => { setPerspective("driver"); setActiveIndex(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                perspective === "driver" 
                  ? "bg-gradient-to-r from-blue-500 via-emerald-500 to-[#cf5d56] text-white shadow-lg" 
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Truck className="size-3.5" />
              <span>{language === 'EN' ? "By Truck (Details)" : "Par Camion (Détail)"}</span>
            </button>
            <button
              onClick={() => { setPerspective("nature"); setActiveIndex(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                perspective === "nature" 
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" 
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Layers className="size-3.5" />
              <span>{language === 'EN' ? "By Nature" : "Par Nature"}</span>
            </button>
          </div>
          
          <span className="hidden sm:inline-block text-[11px] font-bold text-white/40 italic">
            • {periodLabel}
          </span>
        </div>

        {/* Sélecteur de Granularité Temporelle (An, Mois, Semaine, Jour) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Boutons de granularité */}
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setTimeScale("global")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeScale === "global" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {language === 'EN' ? "Global" : "Global"}
            </button>
            <button
              onClick={() => setTimeScale("year")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeScale === "year" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {language === 'EN' ? "By Year" : "Par An"}
            </button>
            <button
              onClick={() => setTimeScale("month")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeScale === "month" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {language === 'EN' ? "By Month" : "Par Mois"}
            </button>
            <button
              onClick={() => setTimeScale("week")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeScale === "week" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {language === 'EN' ? "By Week" : "Par Semaine"}
            </button>
            <button
              onClick={() => setTimeScale("day")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                timeScale === "day" ? "bg-white/20 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {language === 'EN' ? "By Day" : "Par Jour"}
            </button>
          </div>

          {/* Menus contextuels selon la granularité active */}
          {timeScale === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-black/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold cursor-pointer"
            >
              {timePeriods.years.map(y => (
                <option key={y} value={y}>{language === 'EN' ? `Year ${y}` : `Année ${y}`}</option>
              ))}
            </select>
          )}

          {timeScale === "month" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold cursor-pointer max-w-[180px]"
            >
              {timePeriods.months.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          )}

          {timeScale === "week" && (
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-black/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none font-bold cursor-pointer max-w-[210px]"
            >
              {timePeriods.weeks.map(w => (
                <option key={w.key} value={w.key}>{w.label}</option>
              ))}
            </select>
          )}

          {timeScale === "day" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDayStep(-1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10"
                title={language === 'EN' ? "Previous day" : "Jour précédent"}
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-black/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none font-mono font-bold cursor-pointer"
              >
                {timePeriods.days.map(d => (
                  <option key={d} value={d}>
                    {new Date(d).toLocaleDateString(language === 'EN' ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDayStep(1)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10"
                title={language === 'EN' ? "Next day" : "Jour suivant"}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. ZONE DONUT COMPARATIF + SYNTHÈSE GLOBALE */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        
        {/* LE DONUT INTERACTIF (4 COLONNES) */}
        <div className="xl:col-span-4 relative flex items-center justify-center min-h-[300px] w-full">
          <div className="relative w-full h-[300px] max-w-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={() => null} />
                <Pie 
                  data={activeDonutData} 
                  innerRadius={85} 
                  outerRadius={120} 
                  paddingAngle={3} 
                  dataKey="value" 
                  stroke="#1c1c1e"
                  strokeWidth={3}
                  animationBegin={0}
                  animationDuration={800}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {activeDonutData.map((entry, index) => {
                    const isHovered = activeIndex === index;
                    return (
                      <Cell 
                        key={entry.id} 
                        fill={entry.color} 
                        opacity={activeIndex === null || isHovered ? 1 : 0.4}
                        className="transition-all duration-300 cursor-pointer"
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 10px ${entry.color})` : 'none',
                          transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                          transformOrigin: 'center center'
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* CENTRE DYNAMIQUE DU DONUT */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {hoveredSlice ? (
                <div className="animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="size-2 rounded-full" style={{ backgroundColor: hoveredSlice.color }} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[150px]">
                      {hoveredSlice.name}
                    </span>
                  </div>
                  <p className="text-lg font-black font-mono text-white tracking-tight leading-none my-1">
                    {formatMoney(hoveredSlice.value)}
                  </p>
                  <span 
                    className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full font-mono"
                    style={{ backgroundColor: `${hoveredSlice.color}25`, color: hoveredSlice.color }}
                  >
                    {hoveredSlice.percent.toFixed(1)}% {language === 'EN' ? "of costs" : "des coûts"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] mb-1">
                    {perspective === "driver" 
                      ? (language === 'EN' ? "Total Fleet Costs" : "Coûts Flotte Totaux") 
                      : (language === 'EN' ? "Total Expenses" : "Dépenses Totales")}
                  </p>
                  <span className="text-xl font-black font-mono text-white tracking-tight drop-shadow-lg">
                    {formatMoney(financialModel.totalFleetExpenses)}
                  </span>
                  <span className="inline-block mt-1 text-[8px] font-bold text-white/40 uppercase tracking-widest">
                    {activeDonutData.length} {language === 'EN' ? "active entities" : "entités actives"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PANNEAU BILAN GLOBALE DE LA PÉRIODE (8 COLONNES) */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/8 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">
              {language === 'EN' ? "Global Revenue" : "C.A. Global"}
            </span>
            <p className="text-lg font-black font-mono text-white mt-2">
              {formatMoney(financialModel.totalFleetCA)}
            </p>
            <span className="text-[9px] text-white/30 font-medium mt-1">
              {language === 'EN' ? "Total revenue generated" : "Revenu total généré"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">
              {language === 'EN' ? "Total Fuel" : "Total Gasoil"}
            </span>
            <p className="text-lg font-black font-mono text-cyan-300 mt-2">
              {formatMoney(financialModel.totalFleetFuel)}
            </p>
            <span className="text-[9px] text-cyan-400/50 font-medium mt-1">
              {((financialModel.totalFleetFuel / (financialModel.totalFleetCA || 1)) * 100).toFixed(1)}% {language === 'EN' ? "of Revenue" : "du C.A."}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider">
              {language === 'EN' ? "Total Maintenance" : "Total Maintenance"}
            </span>
            <p className="text-lg font-black font-mono text-amber-300 mt-2">
              {formatMoney(financialModel.totalFleetMaintenance)}
            </p>
            <span className="text-[9px] text-amber-400/50 font-medium mt-1">
              {language === 'EN' ? "Repairs & parts" : "Réparations & pièces"}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
              {language === 'EN' ? "Fleet Net Profit" : "Bénéfice Net Flotte"}
            </span>
            <p className={`text-lg font-black font-mono mt-2 ${
              financialModel.totalFleetNet >= 0 ? "text-[#30D158]" : "text-red-400"
            }`}>
              {formatMoney(financialModel.totalFleetNet)}
            </p>
            <span className="text-[9px] text-emerald-400/60 font-bold mt-1">
              {language === 'EN' ? "Net Margin: " : "Marge Nette : "}{financialModel.totalFleetMargin.toFixed(1)}%
            </span>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. VUE PRINCIPALE : LES 3 CARTES DÉTAILLÉES PAR CAMION   */}
      {/* ======================================================== */}
      {perspective === "driver" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-white/50" />
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                {language === 'EN' ? "Financial Breakdown by Truck" : "Détail Financier par Camion"}
              </h4>
            </div>
            <span className="text-[10px] text-white/40">
              {language === 'EN' ? "Click on a card to see road expense sub-details" : "Cliquez sur une carte pour voir les sous-détails des frais de route"}
            </span>
          </div>

          {/* GRILLE DES 3 CAMIONS AVEC LES 5 INDICATEURS EXIGÉS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {financialModel.detailedTrucks.map(truck => {
              const isExpanded = expandedTruck === truck.key;

              return (
                <div 
                  key={truck.key}
                  className={`rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between bg-[#141414] hover:border-white/20 ${
                    truck.key === "AMARA" ? "border-blue-500/30 shadow-lg shadow-blue-500/5" :
                    truck.key === "BRAHIMA" ? "border-emerald-500/30 shadow-lg shadow-emerald-500/5" :
                    "border-[#cf5d56]/30 shadow-lg shadow-red-500/5"
                  }`}
                >
                  <div>
                    {/* En-tête Camion */}
                    <div className="flex items-start justify-between pb-3 border-b border-white/8 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="size-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md"
                          style={{ backgroundColor: truck.color }}
                        >
                          {truck.unit}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">{truck.label}</h4>
                          <p className="text-[10px] font-mono text-white/40">{truck.plate}</p>
                        </div>
                      </div>

                      {/* Badge Marge Nette */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black font-mono uppercase ${
                        truck.margin >= 20 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        truck.margin >= 0 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                        "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                        {truck.margin.toFixed(1)}% {language === 'EN' ? "Margin" : "Marge"}
                      </span>
                    </div>

                    {/* LES 5 INDICATEURS FINANCIERS EXIGÉS */}
                    <div className="space-y-2.5">
                      
                      {/* 1. CHIFFRE D'AFFAIRES */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-white/10 flex items-center justify-center text-white">
                            <DollarSign className="size-3.5" />
                          </div>
                          <span className="text-[11px] font-bold text-white/70">
                            {language === 'EN' ? "Revenue" : "Chiffre d'Affaires"}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-white">
                          {formatMoney(truck.ca)}
                        </span>
                      </div>

                      {/* 2. TOTAL CARBURANT */}
                      <div className="p-2.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/15 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                            <Fuel className="size-3.5" />
                          </div>
                          <span className="text-[11px] font-bold text-cyan-300">
                            {language === 'EN' ? "Total Fuel" : "Total Carburant"}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-cyan-300">
                          {formatMoney(truck.fuel)}
                        </span>
                      </div>

                      {/* 3. TOTAL FRAIS DE ROUTE */}
                      <div 
                        onClick={() => setExpandedTruck(isExpanded ? null : truck.key)}
                        className="p-2.5 rounded-xl bg-purple-500/[0.04] border border-purple-500/15 flex items-center justify-between cursor-pointer hover:bg-purple-500/10 transition-colors"
                        title={language === 'EN' ? "Click to view sub-details" : "Cliquez pour afficher le sous-détail"}
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                            <Route className="size-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-purple-300 block leading-tight">
                              {language === 'EN' ? "Total Road Expenses" : "Total Frais de Route"}
                            </span>
                            <span className="text-[8px] text-purple-400/60 uppercase">
                              {language === 'EN' ? "Tolls, Police, Meals, Extras" : "Péages, Police, Repas, Extras"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-purple-300">
                            {formatMoney(truck.totalRouteExpenses)}
                          </span>
                          {isExpanded ? <ChevronUp className="size-3.5 text-purple-400" /> : <ChevronDown className="size-3.5 text-purple-400" />}
                        </div>
                      </div>

                      {/* SOUS-DÉTAILS DES FRAIS DE ROUTE SI DÉPLIÉ */}
                      {isExpanded && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs animate-in fade-in">
                          <div className="flex justify-between items-center text-white/60">
                            <span className="flex items-center gap-1.5"><Anchor className="size-3 text-purple-400" /> {language === 'EN' ? "Tolls & Bridges:" : "Péages & Ponts :"}</span>
                            <span className="font-mono font-bold text-white">{formatMoney(truck.subDetails.tolls)}</span>
                          </div>
                          <div className="flex justify-between items-center text-white/60">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-pink-400" /> {language === 'EN' ? "Police & Checks:" : "Police & Contrôles :"}</span>
                            <span className="font-mono font-bold text-white">{formatMoney(truck.subDetails.police)}</span>
                          </div>
                          <div className="flex justify-between items-center text-white/60">
                            <span className="flex items-center gap-1.5"><Utensils className="size-3 text-emerald-400" /> {language === 'EN' ? "Meals & Expenses:" : "Repas & Frais :"}</span>
                            <span className="font-mono font-bold text-white">{formatMoney(truck.subDetails.meals)}</span>
                          </div>
                          <div className="flex justify-between items-center text-white/60">
                            <span className="flex items-center gap-1.5"><PlusCircle className="size-3 text-orange-400" /> {language === 'EN' ? "Extras & Misc:" : "Extras & Divers :"}</span>
                            <span className="font-mono font-bold text-white">{formatMoney(truck.subDetails.extras)}</span>
                          </div>
                        </div>
                      )}

                      {/* 4. TOTAL MAINTENANCE */}
                      <div className="p-2.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                            <Wrench className="size-3.5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-amber-300 block leading-tight">
                              {language === 'EN' ? "Total Maintenance" : "Total Maintenance"}
                            </span>
                            <span className="text-[8px] text-amber-400/60 uppercase">
                              {truck.directMaintenance > 0 
                                ? (language === 'EN' ? "Specific + Workshop" : "Spécifique + Atelier") 
                                : (language === 'EN' ? "Workshop share" : "Part atelier")}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-sm text-amber-300">
                          {formatMoney(truck.maintenance)}
                        </span>
                      </div>

                      {/* 5. LE BÉNÉFICE NET */}
                      <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between mt-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-white/40 block leading-tight">
                            {language === 'EN' ? "Net Profit" : "Bénéfice Net"}
                          </span>
                          <span className="text-[8px] text-white/30">
                            {language === 'EN' ? "Revenue - All costs" : "C.A. - Tous coûts"}
                          </span>
                        </div>
                        <span className={`font-mono font-black text-base ${
                          truck.net >= 0 ? "text-[#30D158]" : "text-red-400"
                        }`}>
                          {formatMoney(truck.net)}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Volume & Rotations du camion */}
                  <div className="pt-3 border-t border-white/5 mt-4 flex items-center justify-between text-[10px] text-white/40 font-mono">
                    <span>{truck.tonnage} {language === 'EN' ? "Tons transported" : "Tonnes transportées"}</span>
                    <span>{truck.tripsCount} {language === 'EN' ? "trips" : "voyages"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VUE PAR NATURE (GRILLE DÉTAILLÉE DES POSTES DE COÛTS) */}
      {/* ======================================================== */}
      {perspective === "nature" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              {language === 'EN' ? "Breakdown by Nature of Expenses" : "Répartition par Nature de Frais"}
            </h4>
            <span className="text-[10px] text-white/40">
              {language === 'EN' ? "Total: " : "Total : "}{formatMoney(financialModel.totalFleetExpenses)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {financialModel.donutNature.map((item, idx) => {
              const IconComp = item.icon || Layers;
              return (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#141414] border border-white/8 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="size-8 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                        style={{ backgroundColor: `${item.color}20`, color: item.color }}
                      >
                        <IconComp className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{item.name}</p>
                        <p className="text-[9px] text-white/40">{item.desc}</p>
                      </div>
                    </div>
                    <span 
                      className="text-xs font-black font-mono px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      {item.percent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-[9px] font-bold text-white/40 uppercase">
                        {language === 'EN' ? "Amount" : "Montant"}
                      </span>
                      <span className="font-mono font-black text-white">{formatMoney(item.value)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(4, item.percent)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

export default QuantumExpenseAnalysis;
