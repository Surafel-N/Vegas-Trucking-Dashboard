import React, { useState, useMemo, useEffect } from 'react';
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
  DollarSign,
  Edit2,
  Trash2,
  Save,
  X,
  ExternalLink,
  Eye,
  Plus,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { type Language, translateComment } from '../utils/i18n';

// Helper extraction Google Drive
function getDriveId(link: string | null | undefined): string | null {
  if (!link) return null;
  const matchD = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchD && matchD[1]) return matchD[1];
  const matchId = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchId && matchId[1]) return matchId[1];
  const matchFolder = link.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
  if (matchFolder && matchFolder[1]) return matchFolder[1];
  const fallback = link.match(/[-\w]{25,}/);
  return fallback ? fallback[0] : null;
}

function getDriveEmbedUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  if (link.includes("/folders/")) return null;
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export const VEHICLE_OPTIONS = [
  "AMARA TRUCK 76",
  "BRAHIMA TRUCK 45",
  "SORO TRUCK 52",
  "FLOTTE / ATELIER GÉNÉRAL"
];

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
  setMaintenanceRecords?: React.Dispatch<React.SetStateAction<any[]>> | null;
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
  setMaintenanceRecords,
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

  // --- ÉTATS POUR LE MODAL DE DÉTAIL & MODIFICATION DE LA MAINTENANCE PAR CAMION ---
  const [selectedMaintTruck, setSelectedMaintTruck] = useState<"AMARA" | "BRAHIMA" | "SORO" | null>(null);
  const [maintTab, setMaintTab] = useState<"all" | "direct" | "shared">("all");
  const [localMaintenance, setLocalMaintenance] = useState<any[] | null>(null);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [editMaintForm, setEditMaintForm] = useState<{
    id: string;
    date: string;
    vehicle: string;
    description: string;
    cost: number | string;
    driveLink: string;
  }>({
    id: "",
    date: "",
    vehicle: "AMARA TRUCK 76",
    description: "",
    cost: "",
    driveLink: ""
  });

  const [isAddingMaint, setIsAddingMaint] = useState(false);
  const [newMaintForm, setNewMaintForm] = useState<{
    date: string;
    vehicle: string;
    description: string;
    cost: number | string;
    driveLink: string;
  }>({
    date: new Date().toISOString().split("T")[0],
    vehicle: "AMARA TRUCK 76",
    description: "",
    cost: "",
    driveLink: ""
  });

  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Nettoyage automatique du message de confirmation
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Réinitialisation de l'override local si les données maîtresses changent
  useEffect(() => {
    if (allMaintenanceRecords && allMaintenanceRecords.length > 0) {
      setLocalMaintenance(null);
    }
  }, [allMaintenanceRecords]);

  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${new Intl.NumberFormat(language === 'EN' ? 'en-US' : 'fr-FR').format(Math.round(val))} ${currency}`;
  };

  const formatCompact = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'k';
    return String(Math.round(val));
  };

  // Helper pour générer une clé stable de repérage pour chaque ligne
  const getRecordKey = (r: any, idx?: number): string => {
    if (r.id) return String(r.id);
    return `maint-${r.date || ''}-${r.vehicle || r.driverLabel || ''}-${r.cost || r.amount || 0}-${(r.description || '').slice(0, 10)}-${idx ?? 0}`;
  };

  // Base complète des trajets et de la maintenance (avec support des modifications locales réactives)
  const sourceTrips = useMemo(() => {
    return allTrips && allTrips.length > 0 ? allTrips : data;
  }, [allTrips, data]);

  const sourceMaintenance = useMemo(() => {
    if (localMaintenance) return localMaintenance;
    return allMaintenanceRecords && allMaintenanceRecords.length > 0 ? allMaintenanceRecords : maintenanceRecords;
  }, [localMaintenance, allMaintenanceRecords, maintenanceRecords]);

  // Actions d'édition & ajout de maintenance
  const handleStartEdit = (record: any, idx?: number) => {
    const key = getRecordKey(record, idx);
    const costVal = record.cost !== undefined ? record.cost : (record.amount !== undefined ? record.amount : 0);
    setEditingMaintId(key);
    setEditMaintForm({
      id: key,
      date: record.date || new Date().toISOString().split("T")[0],
      vehicle: record.vehicle || record.driverLabel || "AMARA TRUCK 76",
      description: record.description || "",
      cost: costVal,
      driveLink: record.driveLink || record.imageUrl || ""
    });
    setIsAddingMaint(false);
  };

  const handleSaveEdit = () => {
    if (!editMaintForm.description.trim()) {
      alert(language === 'EN' ? "Please provide a description." : "Veuillez saisir une description.");
      return;
    }
    const parsedCost = Number(editMaintForm.cost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      alert(language === 'EN' ? "Please provide a valid cost." : "Veuillez saisir un coût valide.");
      return;
    }

    const updated = (sourceMaintenance || []).map((r: any, idx: number) => {
      const rKey = getRecordKey(r, idx);
      if (rKey === editMaintForm.id) {
        return {
          ...r,
          id: r.id || editMaintForm.id,
          date: editMaintForm.date,
          vehicle: editMaintForm.vehicle,
          driverLabel: editMaintForm.vehicle,
          description: editMaintForm.description,
          cost: parsedCost,
          amount: parsedCost,
          driveLink: editMaintForm.driveLink.trim() || null
        };
      }
      return r;
    });

    if (setMaintenanceRecords) {
      setMaintenanceRecords(updated);
    }
    setLocalMaintenance(updated);
    setEditingMaintId(null);
    setFeedbackMsg({
      type: 'success',
      text: language === 'EN' 
        ? "Maintenance record updated successfully!" 
        : "Intervention de maintenance mise à jour avec succès !"
    });
  };

  const handleSaveNew = () => {
    if (!newMaintForm.description.trim()) {
      alert(language === 'EN' ? "Please provide a description." : "Veuillez saisir une description.");
      return;
    }
    const parsedCost = Number(newMaintForm.cost);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      alert(language === 'EN' ? "Please provide a valid cost." : "Veuillez saisir un montant valide.");
      return;
    }

    const newRecord = {
      id: `maint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: newMaintForm.date || new Date().toISOString().split("T")[0],
      vehicle: newMaintForm.vehicle,
      driverLabel: newMaintForm.vehicle,
      description: newMaintForm.description.trim(),
      cost: parsedCost,
      amount: parsedCost,
      driveLink: newMaintForm.driveLink.trim() || null,
      source: "manual",
      status: "Completed"
    };

    const updated = [newRecord, ...(sourceMaintenance || [])];
    if (setMaintenanceRecords) {
      setMaintenanceRecords(updated);
    }
    setLocalMaintenance(updated);
    setIsAddingMaint(false);
    setNewMaintForm({
      date: new Date().toISOString().split("T")[0],
      vehicle: selectedMaintTruck ? (TRUCKS_CONFIG.find(t => t.key === selectedMaintTruck)?.label || "AMARA TRUCK 76") : "AMARA TRUCK 76",
      description: "",
      cost: "",
      driveLink: ""
    });
    setFeedbackMsg({
      type: 'success',
      text: language === 'EN'
        ? "New maintenance entry added successfully!"
        : "Nouvelle intervention enregistrée avec succès !"
    });
  };

  const handleDeleteRecord = (record: any, idx?: number) => {
    const costVal = record.cost !== undefined ? record.cost : (record.amount !== undefined ? record.amount : 0);
    const confirmText = language === 'EN'
      ? `Are you sure you want to delete this maintenance: "${record.description}" (${Number(costVal).toLocaleString()} CFA)?`
      : `Êtes-vous sûr de vouloir supprimer cette maintenance : "${record.description}" (${Number(costVal).toLocaleString()} CFA) ?`;
    
    if (!window.confirm(confirmText)) return;

    const targetKey = getRecordKey(record, idx);
    const updated = (sourceMaintenance || []).filter((r: any, i: number) => {
      return getRecordKey(r, i) !== targetKey;
    });

    if (setMaintenanceRecords) {
      setMaintenanceRecords(updated);
    }
    setLocalMaintenance(updated);
    if (editingMaintId === targetKey) {
      setEditingMaintId(null);
    }
    setFeedbackMsg({
      type: 'success',
      text: language === 'EN'
        ? "Maintenance record deleted."
        : "Intervention supprimée avec succès."
    });
  };

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

                      {/* 4. TOTAL MAINTENANCE (CLIQUABLE & ÉDITABLE) */}
                      <div 
                        onClick={() => {
                          setSelectedMaintTruck(truck.key as "AMARA" | "BRAHIMA" | "SORO");
                          setMaintTab("all");
                          setEditingMaintId(null);
                          setIsAddingMaint(false);
                          setFeedbackMsg(null);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedMaintTruck(truck.key as "AMARA" | "BRAHIMA" | "SORO");
                            setMaintTab("all");
                          }
                        }}
                        className="p-2.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 hover:border-amber-500/60 hover:bg-amber-500/15 transition-all duration-200 cursor-pointer group/maint shadow-sm hover:shadow-amber-500/10 active:scale-[0.99]"
                        title={language === 'EN' ? "Click to view maintenance details and edit" : "Cliquer pour voir le détail de la maintenance et modifier"}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-lg bg-amber-500/20 group-hover/maint:bg-amber-500/30 flex items-center justify-center text-amber-400 transition-colors">
                              <Wrench className="size-3.5 group-hover/maint:rotate-12 transition-transform" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-amber-300 block leading-tight group-hover/maint:text-amber-200">
                                  {language === 'EN' ? "Total Maintenance" : "Total Maintenance"}
                                </span>
                                <span className="text-[8px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center gap-0.5 border border-amber-500/30">
                                  <Edit2 className="size-2.5" />
                                  <span>{language === 'EN' ? "Details / Edit" : "Détails & Édition"}</span>
                                </span>
                              </div>
                              <span className="text-[8px] text-amber-400/60 uppercase group-hover/maint:text-amber-400/80">
                                {truck.directMaintenance > 0 
                                  ? (language === 'EN' ? "Specific + Workshop share (Click)" : "Spécifique + Part atelier (Cliquer)") 
                                  : (language === 'EN' ? "Workshop share (Click)" : "Part atelier (Cliquer)")}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-sm text-amber-300 group-hover/maint:text-amber-200">
                              {formatMoney(truck.maintenance)}
                            </span>
                            <ChevronRight className="size-3.5 text-amber-400/60 group-hover/maint:text-amber-300 group-hover/maint:translate-x-0.5 transition-all" />
                          </div>
                        </div>
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

      {/* ======================================================== */}
      {/* MODAL DE DÉTAIL & MODIFICATION DE LA MAINTENANCE PAR CAMION */}
      {/* ======================================================== */}
      {selectedMaintTruck && (() => {
        const activeTruckCfg = TRUCKS_CONFIG.find(t => t.key === selectedMaintTruck) || TRUCKS_CONFIG[0];
        const modalDirectRecords = scopedMaintenance.filter(r => getMaintenanceTruck(r) === selectedMaintTruck);
        const modalSharedRecords = scopedMaintenance.filter(r => getMaintenanceTruck(r) === "FLOTTE");
        const modalDirectCost = modalDirectRecords.reduce((s, r) => s + (Number(r.cost || r.amount) || 0), 0);
        const modalSharedCost = modalSharedRecords.reduce((s, r) => s + (Number(r.cost || r.amount) || 0), 0);
        const modalTruckSharedShare = Math.round(modalSharedCost / 3);
        const modalGrandTotal = modalDirectCost + modalTruckSharedShare;

        let displayItems: Array<{ record: any; isShared: boolean; idx: number }> = [];
        if (maintTab === "all" || maintTab === "direct") {
          modalDirectRecords.forEach((r, idx) => displayItems.push({ record: r, isShared: false, idx }));
        }
        if (maintTab === "all" || maintTab === "shared") {
          modalSharedRecords.forEach((r, idx) => displayItems.push({ record: r, isShared: true, idx }));
        }
        displayItems.sort((a, b) => String(b.record.date || "").localeCompare(String(a.record.date || "")));

        return (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#121212] border border-white/10 rounded-[28px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
              
              {/* HEADER DU MODAL */}
              <div className="p-5 px-6 border-b border-white/5 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3.5">
                  <div 
                    className="size-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg shrink-0"
                    style={{ backgroundColor: activeTruckCfg.color }}
                  >
                    {activeTruckCfg.unit}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">
                        {language === 'EN' ? `Maintenance Details - ${activeTruckCfg.label}` : `Détail Maintenance - ${activeTruckCfg.label}`}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
                        {activeTruckCfg.plate}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-white/40 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="size-3 text-amber-400" />
                      <span>{language === 'EN' ? "Active Period:" : "Période active :"} <span className="text-amber-300 font-mono font-semibold">{periodLabel}</span></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAddingMaint(!isAddingMaint);
                      setEditingMaintId(null);
                      setNewMaintForm({
                        date: new Date().toISOString().split("T")[0],
                        vehicle: activeTruckCfg.label,
                        description: "",
                        cost: "",
                        driveLink: ""
                      });
                    }}
                    className="h-9 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-black text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="size-3.5" />
                    <span>{language === 'EN' ? "Add Entry" : "Nouvelle Intervention"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMaintTruck(null);
                      setEditingMaintId(null);
                      setIsAddingMaint(false);
                    }}
                    className="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* MESSAGE DE NOTIFICATION / FEEDBACK */}
              {feedbackMsg && (
                <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* CONTENU DU MODAL (SCROLLABLE) */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* CARTES KPI SYNTHÈSE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/70">
                      {language === 'EN' ? "Total Maintenance Charged" : "Total Maintenance Imputé"}
                    </p>
                    <p className="text-xl font-mono font-black text-amber-300 mt-1">
                      {formatMoney(modalGrandTotal)}
                    </p>
                    <p className="text-[9px] text-white/40 mt-1">
                      {language === 'EN' ? "Direct + 1/3 Shared Fleet share" : "Direct + 1/3 Part Atelier Partagée"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400/70">
                      {language === 'EN' ? "Direct Specific Cost (100%)" : "Dépenses Directes (100%)"}
                    </p>
                    <p className="text-xl font-mono font-black text-emerald-300 mt-1">
                      {formatMoney(modalDirectCost)}
                    </p>
                    <p className="text-[9px] text-white/40 mt-1">
                      {modalDirectRecords.length} {language === 'EN' ? "specific intervention(s)" : "intervention(s) dédiée(s)"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-500/[0.05] border border-purple-500/20">
                    <p className="text-[10px] font-black uppercase tracking-wider text-purple-400/70">
                      {language === 'EN' ? "Workshop Fleet Overhead (1/3)" : "Quote-part Atelier (1/3)"}
                    </p>
                    <p className="text-xl font-mono font-black text-purple-300 mt-1">
                      {formatMoney(modalTruckSharedShare)}
                    </p>
                    <p className="text-[9px] text-white/40 mt-1">
                      {language === 'EN' ? `Total fleet: ${formatMoney(modalSharedCost)} (${modalSharedRecords.length} entries)` : `Sur total flotte : ${formatMoney(modalSharedCost)} (${modalSharedRecords.length} entrées)`}
                    </p>
                  </div>
                </div>

                {/* BANDEAU D'EXPLICATION */}
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-white/60">
                  <Info className="size-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {language === 'EN' 
                      ? "This view displays all maintenance expenses allocated to this truck. You can directly edit the date, description, cost, vehicle assignment, or delete any erroneous entry. Changes update net profits instantly." 
                      : "Cette vue détaille toutes les dépenses de maintenance affectées à ce camion. Vous pouvez directement modifier la date, le libellé, le montant, réaffecter le camion ou supprimer une entrée erronée. Tout ajustement recalcule immédiatement la comptabilité et le bénéfice net."}
                  </p>
                </div>

                {/* FORMULAIRE D'AJOUT D'UNE NOUVELLE INTERVENTION */}
                {isAddingMaint && (
                  <div className="p-5 rounded-2xl bg-[#161616] border border-amber-500/30 space-y-4 shadow-xl animate-in slide-in-from-top-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                        <Plus className="size-4" />
                        {language === 'EN' ? "Add Maintenance Record" : "Ajouter une Intervention de Maintenance"}
                      </h4>
                      <button
                        onClick={() => setIsAddingMaint(false)}
                        className="text-white/40 hover:text-white text-xs font-bold"
                      >
                        {language === 'EN' ? "Cancel" : "Annuler"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                          {language === 'EN' ? "Date" : "Date"}
                        </label>
                        <input
                          type="date"
                          value={newMaintForm.date}
                          onChange={(e) => setNewMaintForm({ ...newMaintForm, date: e.target.value })}
                          className="w-full h-10 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                          {language === 'EN' ? "Vehicle / Assignment" : "Véhicule / Affectation"}
                        </label>
                        <select
                          value={newMaintForm.vehicle}
                          onChange={(e) => setNewMaintForm({ ...newMaintForm, vehicle: e.target.value })}
                          className="w-full h-10 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-amber-300 font-bold outline-none focus:border-amber-500"
                        >
                          {VEHICLE_OPTIONS.map(v => (
                            <option key={v} value={v} className="bg-[#181818] text-white">{v}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                          {language === 'EN' ? "Description / Work done" : "Description / Pièce ou Travail réalisé"}
                        </label>
                        <input
                          type="text"
                          placeholder={language === 'EN' ? "e.g. Front brake pads replacement..." : "ex: Changement plaquettes de frein avant..."}
                          value={newMaintForm.description}
                          onChange={(e) => setNewMaintForm({ ...newMaintForm, description: e.target.value })}
                          className="w-full h-10 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                          {language === 'EN' ? "Cost (CFA)" : "Coût (CFA)"}
                        </label>
                        <input
                          type="number"
                          placeholder="ex: 150000"
                          value={newMaintForm.cost}
                          onChange={(e) => setNewMaintForm({ ...newMaintForm, cost: e.target.value })}
                          className="w-full h-10 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                          {language === 'EN' ? "Drive / Image Proof Link (Optional)" : "Lien Preuve Drive / Photo (Optionnel)"}
                        </label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={newMaintForm.driveLink}
                          onChange={(e) => setNewMaintForm({ ...newMaintForm, driveLink: e.target.value })}
                          className="w-full h-10 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsAddingMaint(false)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold transition-all"
                      >
                        {language === 'EN' ? "Cancel" : "Annuler"}
                      </button>
                      <button
                        onClick={handleSaveNew}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all flex items-center gap-1.5"
                      >
                        <Save className="size-3.5" />
                        <span>{language === 'EN' ? "Save Entry" : "Enregistrer l'Intervention"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SÉLECTEUR D'ONGLET / FILTRE */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMaintTab("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        maintTab === "all" 
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {language === 'EN' ? "All" : "Toutes"} ({modalDirectRecords.length + modalSharedRecords.length})
                    </button>
                    <button
                      onClick={() => setMaintTab("direct")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        maintTab === "direct" 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {language === 'EN' ? "Specific" : "Spécifiques"} ({modalDirectRecords.length})
                    </button>
                    <button
                      onClick={() => setMaintTab("shared")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        maintTab === "shared" 
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {language === 'EN' ? "Shared Fleet (1/3)" : "Part Atelier (1/3)"} ({modalSharedRecords.length})
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-white/40">
                    {displayItems.length} {language === 'EN' ? "records displayed" : "lignes affichées"}
                  </span>
                </div>

                {/* LISTE DES LIGNES DE MAINTENANCE */}
                <div className="space-y-2.5">
                  {displayItems.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                      <Wrench className="size-8 text-white/20 mx-auto" />
                      <p className="text-xs font-bold text-white/40">
                        {language === 'EN' 
                          ? "No maintenance records found for this truck in the selected period." 
                          : "Aucune intervention de maintenance enregistrée pour ce camion sur la période sélectionnée."}
                      </p>
                    </div>
                  ) : (
                    displayItems.map(({ record: r, isShared, idx }) => {
                      const itemKey = getRecordKey(r, idx);
                      const isEditing = editingMaintId === itemKey;
                      const costVal = Number(r.cost !== undefined ? r.cost : (r.amount !== undefined ? r.amount : 0));
                      const shareCost = isShared ? Math.round(costVal / 3) : costVal;

                      const formattedDate = r.date 
                        ? new Date(r.date).toLocaleDateString(language === 'EN' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : "---";

                      if (isEditing) {
                        return (
                          <div key={itemKey} className="p-4 rounded-2xl bg-[#1c1c1c] border border-amber-500/40 space-y-3 shadow-lg animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                                <Edit2 className="size-3.5" />
                                {language === 'EN' ? "Edit Maintenance Entry" : "Modifier l'Intervention"}
                              </span>
                              <button onClick={() => setEditingMaintId(null)} className="text-white/40 hover:text-white">
                                <X className="size-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                                  {language === 'EN' ? "Date" : "Date"}
                                </label>
                                <input
                                  type="date"
                                  value={editMaintForm.date}
                                  onChange={(e) => setEditMaintForm({ ...editMaintForm, date: e.target.value })}
                                  className="w-full h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                                  {language === 'EN' ? "Vehicle / Assignment" : "Véhicule / Affectation"}
                                </label>
                                <select
                                  value={editMaintForm.vehicle}
                                  onChange={(e) => setEditMaintForm({ ...editMaintForm, vehicle: e.target.value })}
                                  className="w-full h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-amber-300 font-bold outline-none focus:border-amber-500"
                                >
                                  {VEHICLE_OPTIONS.map(v => (
                                    <option key={v} value={v} className="bg-[#181818] text-white">{v}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                                  {language === 'EN' ? "Description" : "Description / Libellé"}
                                </label>
                                <input
                                  type="text"
                                  value={editMaintForm.description}
                                  onChange={(e) => setEditMaintForm({ ...editMaintForm, description: e.target.value })}
                                  className="w-full h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                                  {language === 'EN' ? "Amount (CFA)" : "Montant (CFA)"}
                                </label>
                                <input
                                  type="number"
                                  value={editMaintForm.cost}
                                  onChange={(e) => setEditMaintForm({ ...editMaintForm, cost: e.target.value })}
                                  className="w-full h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-white/40 block mb-1 uppercase">
                                  {language === 'EN' ? "Proof URL" : "Lien Justificatif Drive"}
                                </label>
                                <input
                                  type="url"
                                  value={editMaintForm.driveLink}
                                  onChange={(e) => setEditMaintForm({ ...editMaintForm, driveLink: e.target.value })}
                                  className="w-full h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={() => setEditingMaintId(null)}
                                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold transition-all"
                              >
                                {language === 'EN' ? "Cancel" : "Annuler"}
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all flex items-center gap-1.5"
                              >
                                <Save className="size-3.5" />
                                <span>{language === 'EN' ? "Save Changes" : "Enregistrer"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={itemKey}
                          className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 hover:border-white/15 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono text-white/50 flex items-center gap-1">
                                <Calendar className="size-3 text-white/30" />
                                {formattedDate}
                              </span>

                              {isShared ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  {language === 'EN' ? "Shared Workshop (1/3)" : "Part Atelier (1/3)"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {language === 'EN' ? "Direct Specific" : "Spécifique Camion"}
                                </span>
                              )}

                              <span className="text-[10px] font-bold text-white/40">
                                {r.vehicle || r.driverLabel || activeTruckCfg.label}
                              </span>

                              {r.source === "Google Sheets" && (
                                <span className="text-[9px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded-full flex items-center gap-1">
                                  <Sparkles className="size-2.5" /> GSheets
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-white">
                              {translateComment(r.description, language)}
                            </p>

                            {(r.driveLink || r.imageUrl) && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(r)}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold transition-all"
                              >
                                <Eye className="size-3" />
                                <span>{language === 'EN' ? "View Proof / Receipt" : "Voir Justificatif"}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <div className="text-right">
                              <p className="font-mono font-black text-sm text-amber-300">
                                {formatMoney(shareCost)}
                              </p>
                              {isShared && (
                                <p className="text-[9px] text-white/30 font-mono">
                                  {language === 'EN' ? `Total: ${formatMoney(costVal)}` : `Total atelier : ${formatMoney(costVal)}`}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEdit(r, idx)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-300 transition-all"
                                title={language === 'EN' ? "Edit entry" : "Modifier l'intervention"}
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r, idx)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                                title={language === 'EN' ? "Delete entry" : "Supprimer l'intervention"}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

              {/* PIED DU MODAL */}
              <div className="p-4 px-6 border-t border-white/5 flex items-center justify-between bg-black/40">
                <span className="text-[11px] text-white/40">
                  {language === 'EN' 
                    ? "✨ All modifications recalculate the truck's net profit in real time." 
                    : "✨ Toute modification recalcule le bénéfice net du camion en temps réel."}
                </span>
                <button
                  onClick={() => {
                    setSelectedMaintTruck(null);
                    setEditingMaintId(null);
                    setIsAddingMaint(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-all"
                >
                  {language === 'EN' ? "Close" : "Fermer"}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL APERÇU DIRECT DU JUSTIFICATIF / GOOGLE DRIVE */}
      {/* ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-white/10 rounded-[28px] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 px-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Eye className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {translateComment(previewDoc.description, language) || (language === 'EN' ? 'Maintenance Receipt' : 'Justificatif Maintenance')}
                  </h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase">
                    {previewDoc.vehicle || previewDoc.driverLabel} • {previewDoc.date} • {Number(previewDoc.cost || previewDoc.amount || 0).toLocaleString(language === 'EN' ? 'en-US' : 'fr-FR')} CFA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(previewDoc.driveLink || previewDoc.imageUrl) && (
                  <a
                    href={previewDoc.driveLink || previewDoc.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>{language === 'EN' ? "Open Drive" : "Ouvrir Drive"}</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-white/40 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black/60 p-4 flex items-center justify-center overflow-hidden">
              {(() => {
                const targetUrl = previewDoc.driveLink || previewDoc.imageUrl;
                const embedUrl = getDriveEmbedUrl(targetUrl);
                if (embedUrl) {
                  return (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full rounded-2xl border border-white/5"
                      title="Preview"
                      allow="autoplay"
                    />
                  );
                }
                if (targetUrl && (targetUrl.endsWith(".jpg") || targetUrl.endsWith(".png") || targetUrl.endsWith(".jpeg") || targetUrl.includes("drive.google.com/thumbnail"))) {
                  return (
                    <img 
                      src={targetUrl} 
                      className="max-h-full max-w-full object-contain rounded-2xl border border-white/5 shadow-2xl" 
                      alt="Receipt" 
                    />
                  );
                }
                return (
                  <div className="text-center space-y-3">
                    <p className="text-xs text-white/40">
                      {language === 'EN' ? "Preview not directly embeddable for this format." : "Aperçu direct non intégrable pour ce format."}
                    </p>
                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all"
                      >
                        <ExternalLink className="size-4" />
                        <span>{language === 'EN' ? "Open document in new tab" : "Ouvrir le document dans un nouvel onglet"}</span>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default QuantumExpenseAnalysis;
