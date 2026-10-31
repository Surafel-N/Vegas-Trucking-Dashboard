import {
  Wrench,
  ExternalLink,
  X,
  Calendar,
  Banknote,
  FolderOpen,
  Search,
  Truck,
  Layers,
  Droplet,
  CheckCircle2,
  ChevronRight,
  Package,
  Hammer,
  Navigation,
  ShieldCheck,
  Users,
  Home,
  Wifi,
  Landmark,
  Sparkles,
  Gauge,
  SlidersHorizontal,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { type Language } from "../utils/i18n";
import {
  analyzeAllMaintenanceAndExpenses,
  aggregateAnalyzedItems,
  type AnalyzedExpenseItem,
  type MaintenanceOrExpenseSubType,
} from "../utils/maintenanceAnalyzer";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "../utils/accountingInitialData";

type MaintenanceLogProps = {
  records?: any[];
  expenseRecords?: any[];
  accountingTransactions?: any[];
  googleClientId?: string;
  oilChanges?: any;
  allTrips?: any[];
  t?: any;
  language?: Language;
};

// Extraction de l'ID Google Drive
function getDriveId(link?: string | null): string | null {
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

// URL iframe preview Google Drive sécurisée
function getDriveEmbedUrl(link?: string | null): string | null {
  if (!link || link.includes("/folders/")) return null;
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function MaintenanceLog({
  records = [],
  expenseRecords = [],
  accountingTransactions = INITIAL_ACCOUNTING_TRANSACTIONS,
  googleClientId,
  oilChanges,
  allTrips = [],
  t,
  language = "FR",
}: MaintenanceLogProps) {
  // Mode d'affichage Simplifié (par défaut pour novice/visiteur) vs Expert (comptable)
  const [viewMode, setViewMode] = useState<"simple" | "expert">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sdv_workshop_mode");
      if (saved === "expert" || saved === "simple") return saved;
    }
    return "simple";
  });

  const handleSetViewMode = (mode: "simple" | "expert") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("sdv_workshop_mode", mode);
    }
  };

  // Filtre rapide 1-clic pour le mode Simple
  const [simpleCategory, setSimpleCategory] = useState<"ALL" | "pneu" | "vidange" | "mecanique" | "urgent">("ALL");

  // États pour le mode Expert
  const [selectedRecord, setSelectedRecord] = useState<AnalyzedExpenseItem | null>(null);
  const [activeTab, setActiveTab] = useState<"maintenance" | "expenses" | "all">("maintenance");
  const [selectedTruck, setSelectedTruck] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | MaintenanceOrExpenseSubType>("ALL");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "truck">("day");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyDrive, setOnlyDrive] = useState<boolean>(false);

  const isEn = language === "EN";
  const locale = isEn ? "en-US" : "fr-FR";

  // Analyse complète et certifiée des maintenances et dépenses depuis le Spreadsheet (dates 2025 vs 2026 corrigées)
  const allAnalyzedItems = useMemo(() => {
    const txSource =
      accountingTransactions && accountingTransactions.length > 0
        ? accountingTransactions
        : INITIAL_ACCOUNTING_TRANSACTIONS;
    return analyzeAllMaintenanceAndExpenses(txSource, records, isEn ? "EN" : "FR");
  }, [accountingTransactions, records, isEn]);

  // Configuration des 3 camions pour les jauges unifiées
  const trucksGaugesConfig = [
    { key: "AMARA TRUCK 76", name: "AMARA", truckNum: "76", color: "#3B82F6", fallbackKm: 125325 },
    { key: "BRAHIMA TRUCK 45", name: "BRAHIMA", truckNum: "45", color: "#10B981", fallbackKm: 120334 },
    { key: "SORO TRUCK 52", name: "SORO", truckNum: "52", color: "#CF5D56", fallbackKm: 114795 },
  ];

  // Calcul haute fidélité des jauges de vidange pour les 3 camions
  const truckGauges = useMemo(() => {
    const tripList = allTrips && allTrips.length > 0 ? allTrips : records;

    return trucksGaugesConfig.map((cfg) => {
      const info = oilChanges?.[cfg.key];
      const truckTrips = tripList.filter((t) => {
        const l = String(t.driverLabel || t.chauffeur || "").toUpperCase();
        return l.includes(cfg.name) || l.includes(cfg.truckNum);
      });

      let maxTripKm = 0;
      truckTrips.forEach((t) => {
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

      let status: "ok" | "warning" | "urgent" = "ok";
      if (driven >= interval) status = "urgent";
      else if (driven >= interval * 0.8) status = "warning";

      return {
        ...cfg,
        lastKm,
        currentKm,
        driven,
        remaining,
        percent,
        status,
        lastDate: info?.date || "2026-10-13",
        comment: info?.comment,
      };
    });
  }, [allTrips, records, oilChanges]);

  const urgentOilCount = useMemo(() => {
    return truckGauges.filter((g) => g.status === "urgent").length;
  }, [truckGauges]);

  // Synthèse financière pour le mode Simple
  const simpleFinancialSummary = useMemo(() => {
    let tireBase = 0;
    let oilBase = 0;
    let mecBase = 0;
    let totalDisbursed = 0;

    allAnalyzedItems.forEach((item) => {
      if (item.domain === "maintenance") {
        totalDisbursed += item.totalCost;
        if (item.subType === "pneu") tireBase += item.baseCost;
        else if (item.subType === "vidange") oilBase += item.baseCost;
        else if (item.subType === "mecanique") mecBase += item.baseCost;
      }
    });

    return { tireBase, oilBase, mecBase, totalDisbursed };
  }, [allAnalyzedItems]);

  // Liste filtrée pour le mode Simple
  const simpleList = useMemo(() => {
    return allAnalyzedItems.filter((item) => {
      if (item.domain !== "maintenance") return false;
      if (simpleCategory === "pneu") return item.subType === "pneu";
      if (simpleCategory === "vidange") return item.subType === "vidange";
      if (simpleCategory === "mecanique") return item.subType === "mecanique";
      if (simpleCategory === "urgent") {
        const overdueTrucks = truckGauges.filter((g) => g.status === "urgent").map((g) => g.name);
        return (
          overdueTrucks.includes(item.truckKey) ||
          item.subType === "pneu" ||
          item.subType === "vidange"
        );
      }
      return true;
    });
  }, [allAnalyzedItems, simpleCategory, truckGauges]);

  // Configuration camions pour le mode Expert
  const trucksConfig = [
    { label: "AMARA 76", key: "AMARA", color: "#3B82F6" },
    { label: "BRAHIMA 45", key: "BRAHIMA", color: "#10B981" },
    { label: "SORO 52", key: "SORO", color: "#CF5D56" },
    { label: isEn ? "FLEET (SHARED)" : "FLOTTE (COMMUN)", key: "FLOTTE", color: "#F59E0B" },
  ];

  // Filtrage par domaine (Atelier vs Dépenses vs Tout) en mode Expert
  const domainFiltered = useMemo(() => {
    if (activeTab === "maintenance") {
      return allAnalyzedItems.filter((item) => item.domain === "maintenance");
    }
    if (activeTab === "expenses") {
      return allAnalyzedItems.filter((item) => item.domain === "expense");
    }
    return allAnalyzedItems;
  }, [allAnalyzedItems, activeTab]);

  // Filtrage combiné : Camion + Catégorie + Recherche + Justificatif en mode Expert
  const filteredList = useMemo(() => {
    return domainFiltered.filter((item) => {
      if (selectedTruck !== "ALL" && item.truckKey !== selectedTruck) {
        return false;
      }
      if (selectedCategory !== "ALL" && item.subType !== selectedCategory) {
        return false;
      }
      if (onlyDrive && !item.driveLink) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const hay = `${item.title} ${item.rawComment} ${item.vehicle} ${item.displayDate} ${item.date} ${item.totalCost} ${item.quantityNote || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [domainFiltered, selectedTruck, selectedCategory, onlyDrive, searchQuery]);

  // Agrégations multi-axes (Par Jour/Date, Par Semaine, Par Mois, Par Chauffeur)
  const groupedData = useMemo(
    () => aggregateAnalyzedItems(filteredList, groupBy, isEn ? "EN" : "FR"),
    [filteredList, groupBy, isEn]
  );
  const byMonthSummary = useMemo(
    () => aggregateAnalyzedItems(filteredList, "month", isEn ? "EN" : "FR"),
    [filteredList, isEn]
  );
  const byWeekSummary = useMemo(
    () => aggregateAnalyzedItems(filteredList, "week", isEn ? "EN" : "FR"),
    [filteredList, isEn]
  );
  const byTruckSummary = useMemo(
    () => aggregateAnalyzedItems(filteredList, "truck", isEn ? "EN" : "FR"),
    [filteredList, isEn]
  );

  // Totaux globaux de la sélection active en mode Expert
  const stats = useMemo(() => {
    let baseCost = 0;
    let mountingCost = 0;
    let deliveryCost = 0;
    let totalCost = 0;
    let driveCount = 0;

    filteredList.forEach((item) => {
      baseCost += item.baseCost;
      mountingCost += item.mountingCost;
      deliveryCost += item.deliveryCost;
      totalCost += item.totalCost;
      if (item.driveLink) driveCount += 1;
    });

    return {
      count: filteredList.length,
      baseCost,
      mountingCost,
      deliveryCost,
      totalCost,
      driveCount,
    };
  }, [filteredList]);

  // Libellé dynamique du prix de base selon l'onglet actif
  const basePriceLabel = useMemo(() => {
    if (selectedCategory === "pneu") return isEn ? "Tires Base Price" : "Prix des Pneus (Hors frais)";
    if (selectedCategory === "vidange") return isEn ? "Oil & Filters Price" : "Prix Huiles & Filtres";
    if (selectedCategory === "mecanique") return isEn ? "Parts Base Price" : "Prix des Pièces";
    if (selectedCategory === "salaires") return isEn ? "Net Salaries & Bonuses" : "Salaires & Primes";
    return isEn ? "Base Price (Parts / Tires)" : "Prix de Base (Pneus / Pièces)";
  }, [selectedCategory, isEn]);

  const getTruckBadge = (truckKey: string, vehicle: string) => {
    if (truckKey === "AMARA") {
      return {
        label: "AMARA TRUCK 76",
        color: "#3B82F6",
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.3)",
      };
    }
    if (truckKey === "BRAHIMA") {
      return {
        label: "BRAHIMA TRUCK 45",
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.3)",
      };
    }
    if (truckKey === "SORO") {
      return {
        label: "SORO TRUCK 52",
        color: "#CF5D56",
        bg: "rgba(207, 93, 86, 0.12)",
        border: "rgba(207, 93, 86, 0.3)",
      };
    }
    return {
      label: vehicle || (isEn ? "GENERAL FLEET" : "FLOTTE GÉNÉRALE"),
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.3)",
    };
  };

  const getSubTypeBadge = (subType: MaintenanceOrExpenseSubType, label: string) => {
    switch (subType) {
      case "pneu":
        return { label, icon: Layers, color: "#EC4899" };
      case "vidange":
        return { label, icon: Droplet, color: "#00F2FF" };
      case "mecanique":
        return { label, icon: Wrench, color: "#F59E0B" };
      case "lavage":
        return { label, icon: Sparkles, color: "#38BDF8" };
      case "salaires":
        return { label, icon: Users, color: "#10B981" };
      case "loyer":
        return { label, icon: Home, color: "#A855F7" };
      case "yango":
        return { label, icon: Navigation, color: "#FBBF24" };
      case "assurances":
        return { label, icon: ShieldCheck, color: "#60A5FA" };
      case "telecom":
        return { label, icon: Wifi, color: "#34D399" };
      case "taxes":
        return { label, icon: Landmark, color: "#F87171" };
      default:
        return { label, icon: Package, color: "#94A3B8" };
    }
  };

  const maintenanceTabs: { id: "ALL" | MaintenanceOrExpenseSubType; label: string; color: string }[] = [
    { id: "ALL", label: isEn ? "All Workshop" : "Tout Atelier", color: "#F97316" },
    { id: "pneu", label: isEn ? "🛞 Tires" : "🛞 Pneus", color: "#EC4899" },
    { id: "vidange", label: isEn ? "🛢️ Oil & Filters" : "🛢️ Vidanges & Huiles", color: "#00F2FF" },
    { id: "mecanique", label: isEn ? "⚙️ Mechanics & Parts" : "⚙️ Mécanique & Pièces", color: "#F59E0B" },
    { id: "lavage", label: isEn ? "🚿 Washing & Grease" : "🚿 Lavage & Graissage", color: "#38BDF8" },
  ];

  const expenseTabs: { id: "ALL" | MaintenanceOrExpenseSubType; label: string; color: string }[] = [
    { id: "ALL", label: isEn ? "All Expenses" : "Toutes Dépenses", color: "#CF5D56" },
    { id: "salaires", label: isEn ? "💼 Salaries & Payroll" : "💼 Salaires & Primes", color: "#10B981" },
    { id: "loyer", label: isEn ? "🏠 Rent & Housing" : "🏠 Loyer & Logement", color: "#A855F7" },
    { id: "yango", label: isEn ? "🚕 Transport & Yango" : "🚕 Transport & Yango", color: "#FBBF24" },
    { id: "assurances", label: isEn ? "🛡️ Insurance & Cards" : "🛡️ Assurances & Cartes", color: "#60A5FA" },
    { id: "telecom", label: isEn ? "📡 GPS, Telecom & Energy" : "📡 GPS, Télécom & Énergie", color: "#34D399" },
    { id: "taxes", label: isEn ? "🏛️ State Taxes" : "🏛️ Impôts & Taxes", color: "#F87171" },
    { id: "divers", label: isEn ? "📦 General & Misc" : "📦 Charges & Divers", color: "#94A3B8" },
  ];

  const activeCategoryTabs =
    activeTab === "maintenance"
      ? maintenanceTabs
      : activeTab === "expenses"
      ? expenseTabs
      : [...maintenanceTabs, ...expenseTabs.filter((x) => x.id !== "ALL")];

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 text-white shadow-2xl flex flex-col relative overflow-hidden">
      {/* EN-TÊTE PRINCIPAL AVEC COMMUTATEUR MODE SIMPLE / EXPERT */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10">
            <Wrench className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black uppercase tracking-tight">
                {t?.workshopFinances ||
                  (isEn ? "Workshop & Alerts Hub" : "Atelier & Alertes Flotte")}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {allAnalyzedItems.filter((i) => i.domain === "maintenance").length}{" "}
                {isEn ? "Workshop Entries" : "Opérations Atelier"}
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium mt-0.5">
              {isEn
                ? "Continuous oil service countdown, verified spreadsheet maintenance & receipts"
                : "Suivi vidanges moteurs (10 000 KM), dépenses d'atelier certifiées & justificatifs"}
            </p>
          </div>
        </div>

        {/* COMMUTATEUR SIMPLE / EXPERT */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-2xl shadow-inner">
            <button
              onClick={() => handleSetViewMode("simple")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === "simple"
                  ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>{isEn ? "Simple View" : "Vue Simplifiée"}</span>
            </button>
            <button
              onClick={() => handleSetViewMode("expert")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === "expert"
                  ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>{isEn ? "Expert Breakdown" : "Mode Expert"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1 : VUE SIMPLIFIÉE (POUR NOVICE / VISITEUR)                          */}
      {/* ========================================================================= */}
      {viewMode === "simple" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* 1. JAUGES UNIFIÉES DE VIDANGE POUR LES 3 CAMIONS */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-white/50">
              <span className="flex items-center gap-1.5">
                <Gauge className="size-4 text-[#00F2FF]" />
                {isEn
                  ? "Engine Oil Service Tracking (10,000 KM Interval)"
                  : "Suivi des Vidanges Moteurs (Intervalle 10 000 KM)"}
              </span>
              <span className="text-white/30 text-[10px]">
                {isEn ? "Certified Odometer" : "Odomètre certifié"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {truckGauges.map((truck) => {
                const isOverdue = truck.status === "urgent";
                const isWarning = truck.status === "warning";

                return (
                  <div
                    key={truck.key}
                    className={`p-3 rounded-xl border transition-all ${
                      isOverdue
                        ? "bg-red-500/10 border-red-500/30"
                        : isWarning
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-white/[0.03] border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: truck.color }}
                        />
                        <span className="font-black text-xs text-white">
                          {truck.name} {truck.truckNum}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isOverdue
                            ? "bg-red-500/20 text-red-400 font-mono"
                            : isWarning
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-[#10B981]/20 text-[#10B981]"
                        }`}
                      >
                        {isOverdue
                          ? `+${Math.abs(truck.remaining).toLocaleString(locale)} KM`
                          : `${truck.remaining.toLocaleString(locale)} KM ${
                              isEn ? "remaining" : "restants"
                            }`}
                      </span>
                    </div>

                    {/* Barre de progression */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isOverdue
                            ? "bg-red-500 animate-pulse"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-[#10B981]"
                        }`}
                        style={{ width: `${truck.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-white/40">
                      <span>
                        {truck.driven.toLocaleString(locale)} / {(10000).toLocaleString(locale)} KM
                      </span>
                      <span className="font-mono text-white/70">
                        {truck.currentKm.toLocaleString(locale)} KM {isEn ? "curr." : "act."}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 4 CARTES FINANCIÈRES ESSENTIELLES (SIMPLIFIÉES) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-pink-500/[0.07] border border-pink-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300/80 block">
                  {isEn ? "🛞 Tires (Base Price)" : "🛞 Pneus Neufs (Base)"}
                </span>
                <span className="text-lg font-black text-pink-400 font-mono mt-0.5 block">
                  {simpleFinancialSummary.tireBase.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {isEn ? "Tires purchased (excl. mounting)" : "Prix d'achat des pneus neufs"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Layers className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-500/[0.07] border border-cyan-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300/80 block">
                  {isEn ? "🛢️ Oil & Filters (Base)" : "🛢️ Vidanges & Huiles"}
                </span>
                <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">
                  {simpleFinancialSummary.oilBase.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {isEn ? "Oil drums & filter replacements" : "Fûts 205L & filtres moteur"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Droplet className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 block">
                  {isEn ? "⚙️ Mechanics & Parts" : "⚙️ Pièces Mécaniques"}
                </span>
                <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                  {simpleFinancialSummary.mecBase.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {isEn ? "Spare parts & components" : "Roulements, freins & pièces"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Wrench className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/[0.09] border border-emerald-500/30 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 block">
                  {isEn ? "💰 Total Disbursed (All-In)" : "💰 Total Décaissé Atelier"}
                </span>
                <span className="text-xl font-black text-[#9fe3b9] font-mono mt-0.5 block">
                  {simpleFinancialSummary.totalDisbursed.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-emerald-300/60 font-bold">
                  {isEn ? "Parts + labor + delivery" : "Pièces + montage + transport"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Banknote className="size-5" />
              </div>
            </div>
          </div>

          {/* 3. FILTRES RAPIDES 1-CLIC */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs font-bold">
            <button
              onClick={() => setSimpleCategory("ALL")}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                simpleCategory === "ALL"
                  ? "bg-white text-black shadow-md"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}
            >
              {isEn ? "All Operations" : "Toutes les interventions"} (
              {allAnalyzedItems.filter((i) => i.domain === "maintenance").length})
            </button>

            <button
              onClick={() => setSimpleCategory("pneu")}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                simpleCategory === "pneu"
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                  : "bg-white/5 text-pink-400 hover:bg-pink-500/10"
              }`}
            >
              <span>🛞 {isEn ? "Tires" : "Pneus"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/30">
                {allAnalyzedItems.filter((i) => i.subType === "pneu").length}
              </span>
            </button>

            <button
              onClick={() => setSimpleCategory("vidange")}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                simpleCategory === "vidange"
                  ? "bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20"
                  : "bg-white/5 text-[#00F2FF] hover:bg-[#00F2FF]/10"
              }`}
            >
              <Droplet className="size-3.5" />
              <span>{isEn ? "Oil & Filters" : "Vidanges"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/30 text-white">
                {allAnalyzedItems.filter((i) => i.subType === "vidange").length}
              </span>
            </button>

            <button
              onClick={() => setSimpleCategory("mecanique")}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                simpleCategory === "mecanique"
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                  : "bg-white/5 text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <Wrench className="size-3.5" />
              <span>{isEn ? "Mechanics" : "Mécanique"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/30 text-white">
                {allAnalyzedItems.filter((i) => i.subType === "mecanique").length}
              </span>
            </button>

            <button
              onClick={() => setSimpleCategory("urgent")}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                simpleCategory === "urgent"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse"
                  : urgentOilCount > 0
                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                  : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              <AlertTriangle className="size-3.5" />
              <span>{isEn ? "Urgent Alerts" : "Alertes Urgentes"}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/30">
                {urgentOilCount}
              </span>
            </button>
          </div>

          {/* 4. FLUX ÉPURÉ DES INTERVENTIONS (FEED SIMPLIFIÉ) */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {simpleList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <CheckCircle2 className="size-10 text-white/20 mb-2" />
                <p className="text-xs font-bold text-white/60">
                  {isEn ? "No interventions found in this category" : "Aucune intervention dans cette catégorie"}
                </p>
              </div>
            ) : (
              simpleList.map((item) => {
                const subBadge = getSubTypeBadge(item.subType, item.subTypeLabel);
                const Icon = subBadge.icon;
                const truckBadge = getTruckBadge(item.truckKey, item.vehicle);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedRecord(item)}
                    className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-md"
                        style={{
                          backgroundColor: `${subBadge.color}15`,
                          borderColor: `${subBadge.color}35`,
                          color: subBadge.color,
                        }}
                      >
                        <Icon className="size-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-black font-mono">
                            {item.displayDate}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border"
                            style={{
                              backgroundColor: truckBadge.bg,
                              borderColor: truckBadge.border,
                              color: truckBadge.color,
                            }}
                          >
                            {truckBadge.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
                            style={{
                              backgroundColor: `${subBadge.color}20`,
                              color: subBadge.color,
                            }}
                          >
                            {item.subTypeLabel}
                          </span>
                          {item.quantityNote && (
                            <span className="px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-black">
                              {item.quantityNote}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {item.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-sm font-mono font-black text-[#9fe3b9] block">
                          {item.totalCost.toLocaleString(locale)} CFA
                        </span>
                        <span className="text-[10px] text-white/40 block">
                          {item.mountingCost > 0 || item.deliveryCost > 0
                            ? `Base: ${item.baseCost.toLocaleString(locale)} • ${
                                isEn ? "Fees:" : "Frais:"
                              } ${(item.mountingCost + item.deliveryCost).toLocaleString(locale)}`
                            : isEn
                            ? "Direct parts"
                            : "Pièce directe"}
                        </span>
                      </div>

                      {item.driveLink && (
                        <span
                          className="p-2 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/30 transition-all"
                          title={isEn ? "View Drive Receipt" : "Voir le Justificatif Drive"}
                        >
                          <FolderOpen className="size-4" />
                        </span>
                      )}
                      <ChevronRight className="size-4 text-white/20 group-hover:text-white transition-all" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2 : VUE EXPERT (DÉCOMPOSITION COMPTABLE MULTI-AXES COMPLÈTE)          */}
      {/* ========================================================================= */}
      {viewMode === "expert" && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Sélecteur Domaine : Atelier vs Dépenses vs Tout */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/50 border border-white/10 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => {
                setActiveTab("maintenance");
                setSelectedCategory("ALL");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === "maintenance"
                  ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Wrench className="size-3.5" />
              <span>{isEn ? "Maintenance & Tires" : "Maintenance & Pneus"}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                setSelectedCategory("ALL");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === "expenses"
                  ? "bg-gradient-to-r from-[#CF5D56] to-[#b34842] text-white shadow-md shadow-[#CF5D56]/20"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Banknote className="size-3.5" />
              <span>{isEn ? "Operating Expenses" : "Toutes les Dépenses"}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("all");
                setSelectedCategory("ALL");
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-white text-black shadow-md"
                  : "text-white/50 hover:text-white"
              }`}
            >
              <Layers className="size-3.5" />
              <span>{isEn ? "Complete View" : "Tout Confondu"}</span>
            </button>
          </div>

          {/* 4 CARTES KPI DE DÉCOMPOSITION FINANCIÈRE (PRIX DE BASE / MONTAGE / LIVRAISON / TOTAL) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-pink-500/[0.07] border border-pink-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300/80 block">
                  {basePriceLabel}
                </span>
                <span className="text-lg font-black text-pink-400 font-mono mt-0.5 block">
                  {stats.baseCost.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {stats.totalCost > 0
                    ? `${Math.round((stats.baseCost / stats.totalCost) * 100)}% ${
                        isEn ? "of total" : "du total"
                      }`
                    : "0%"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400">
                <Package className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 block">
                  {isEn ? "Mounting & Labor Fees" : "Frais Montage & Main d'Œuvre"}
                </span>
                <span className="text-lg font-black text-amber-400 font-mono mt-0.5 block">
                  {stats.mountingCost.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {isEn ? "Tire mounting & mechanic labor" : "Montage pneus & M.O. mécanicien"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Hammer className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-500/[0.07] border border-cyan-500/25 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300/80 block">
                  {isEn ? "Delivery & Transport Fees" : "Frais Livraison & Transport"}
                </span>
                <span className="text-lg font-black text-cyan-400 font-mono mt-0.5 block">
                  {stats.deliveryCost.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-white/40">
                  {isEn ? "Abidjan-San Pedro shipping & Yango" : "Expédition Abidjan-San Pedro & Yango"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Navigation className="size-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/[0.09] border border-emerald-500/30 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 block">
                  {isEn ? "Total All-In (Base + Fees)" : "Total Général (Avec Montage & Livraison)"}
                </span>
                <span className="text-xl font-black text-[#9fe3b9] font-mono mt-0.5 block">
                  {stats.totalCost.toLocaleString(locale)} CFA
                </span>
                <span className="text-[10px] text-emerald-300/60 font-bold">
                  {stats.count} {isEn ? "line(s) analyzed" : "ligne(s) analysée(s)"}
                </span>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Banknote className="size-5" />
              </div>
            </div>
          </div>

          {/* ONGLETS DES SOUS-CATÉGORIES */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
            {activeCategoryTabs.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              const countForTab =
                tab.id === "ALL"
                  ? domainFiltered.length
                  : domainFiltered.filter((i) => i.subType === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setSelectedCategory(isSelected && tab.id !== "ALL" ? "ALL" : tab.id)
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isSelected
                      ? "text-white shadow-lg"
                      : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.07]"
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${tab.color}25`,
                          borderColor: tab.color,
                          color: "#fff",
                        }
                      : undefined
                  }
                >
                  <span>{tab.label}</span>
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-mono"
                    style={{
                      backgroundColor: isSelected ? tab.color : "rgba(255,255,255,0.08)",
                      color: isSelected ? "#000" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {countForTab}
                  </span>
                </button>
              );
            })}
          </div>

          {/* BARRE DE CONTRÔLE EXPERTE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-black/30 border border-white/8 p-3 rounded-2xl">
            {/* Filtre Camion / Chauffeur */}
            <div className="lg:col-span-5 flex flex-wrap items-center gap-1">
              <button
                onClick={() => setSelectedTruck("ALL")}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  selectedTruck === "ALL"
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {isEn ? "All Drivers" : "Tous Chauffeurs"}
              </button>
              {trucksConfig.map((tr) => (
                <button
                  key={tr.key}
                  onClick={() => setSelectedTruck(selectedTruck === tr.key ? "ALL" : tr.key)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 ${
                    selectedTruck === tr.key
                      ? "text-white shadow-sm"
                      : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                  style={selectedTruck === tr.key ? { backgroundColor: tr.color } : {}}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: tr.color }} />
                  {tr.label}
                </button>
              ))}
            </div>

            {/* Sélecteur d'axe de sous-total : Par Jour (Date) / Par Semaine / Par Mois / Par Chauffeur */}
            <div className="lg:col-span-4 flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
              {(
                [
                  { id: "day", label: isEn ? "By Date (Day)" : "Par Date (Jour)" },
                  { id: "week", label: isEn ? "By Week" : "Par Semaine" },
                  { id: "month", label: isEn ? "By Month" : "Par Mois" },
                  { id: "truck", label: isEn ? "By Driver" : "Par Chauffeur" },
                ] as const
              ).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupBy(g.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-black transition-all text-center whitespace-nowrap ${
                    groupBy === g.id
                      ? "bg-orange-500 text-white shadow"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Recherche + Filtre Justificatifs */}
            <div className="lg:col-span-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder={isEn ? "Search date, comment..." : "Chercher date, pneu, CFA..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-6 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setOnlyDrive(!onlyDrive)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all flex items-center gap-1 border ${
                  onlyDrive
                    ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                    : "bg-white/5 border-white/10 text-[#3B82F6]"
                }`}
                title={isEn ? "Filter rows with Drive receipt" : "Filtrer avec justificatif Drive"}
              >
                <FolderOpen className="size-3.5" /> ({stats.driveCount})
              </button>
            </div>
          </div>

          {/* SYNTHÈSE MULTI-AXES AUTOMATIQUE */}
          {filteredList.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* 1. Sous-totaux par Mois */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-3.5">
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/8">
                  <span className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                    {isEn ? "🗓️ Sub-Totals by Month" : "🗓️ Sous-Totaux par Mois"}
                  </span>
                  <span className="text-[10px] text-white/40 font-bold">
                    {isEn ? "Base / Fees / Total" : "Prix Base / Frais / Total"}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {byMonthSummary.map((m) => (
                    <div
                      key={m.key}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5"
                    >
                      <div>
                        <span className="font-black text-white block">{m.label}</span>
                        <span className="text-[10px] text-white/45">
                          {isEn ? "Base:" : "Prix base:"}{" "}
                          <strong className="text-pink-400">
                            {m.baseCost.toLocaleString(locale)}
                          </strong>
                          {(m.mountingCost > 0 || m.deliveryCost > 0) && (
                            <>
                              {" "}
                              • {isEn ? "Fees:" : "Montage+Livr.:"}{" "}
                              <strong className="text-amber-400">
                                {(m.mountingCost + m.deliveryCost).toLocaleString(locale)}
                              </strong>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-[#9fe3b9] block">
                          {m.totalCost.toLocaleString(locale)} CFA
                        </span>
                        <span className="text-[10px] text-white/30">{m.count} op.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Sous-totaux par Semaine */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-3.5">
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/8">
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                    {isEn ? "📆 Sub-Totals by Week" : "📆 Sous-Totaux par Semaine"}
                  </span>
                  <span className="text-[10px] text-white/40 font-bold">
                    {isEn ? "Base / Fees / Total" : "Prix Base / Frais / Total"}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {byWeekSummary.map((w) => (
                    <div
                      key={w.key}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-black text-white block truncate">{w.label}</span>
                        <span className="text-[10px] text-white/45">
                          {isEn ? "Base:" : "Prix base:"}{" "}
                          <strong className="text-pink-400">
                            {w.baseCost.toLocaleString(locale)}
                          </strong>
                          {(w.mountingCost > 0 || w.deliveryCost > 0) && (
                            <>
                              {" "}
                              • {isEn ? "Fees:" : "Montage+Livr.:"}{" "}
                              <strong className="text-amber-400">
                                {(w.mountingCost + w.deliveryCost).toLocaleString(locale)}
                              </strong>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-[#9fe3b9] block">
                          {w.totalCost.toLocaleString(locale)} CFA
                        </span>
                        <span className="text-[10px] text-white/30">{w.count} op.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Sous-totaux par Chauffeur / Camion */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-3.5">
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/8">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                    {isEn ? "🚛 Sub-Totals by Driver" : "🚛 Sous-Totaux par Chauffeur"}
                  </span>
                  <span className="text-[10px] text-white/40 font-bold">
                    {isEn ? "Base / Fees / Total" : "Prix Base / Frais / Total"}
                  </span>
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {byTruckSummary.map((tr) => {
                    const badge = getTruckBadge(tr.key, tr.label);
                    return (
                      <div
                        key={tr.key}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5"
                      >
                        <div>
                          <span
                            className="font-black block text-[11px]"
                            style={{ color: badge.color }}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-white/45">
                            {isEn ? "Base:" : "Prix base:"}{" "}
                            <strong className="text-pink-400">
                              {tr.baseCost.toLocaleString(locale)}
                            </strong>
                            {tr.mountingCost > 0 && (
                              <>
                                {" "}
                                • {isEn ? "Mount:" : "Montage:"}{" "}
                                <strong className="text-amber-400">
                                  {tr.mountingCost.toLocaleString(locale)}
                                </strong>
                              </>
                            )}
                            {tr.deliveryCost > 0 && (
                              <>
                                {" "}
                                • {isEn ? "Deliv:" : "Livr.:"}{" "}
                                <strong className="text-cyan-400">
                                  {tr.deliveryCost.toLocaleString(locale)}
                                </strong>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-[#9fe3b9] block">
                            {tr.totalCost.toLocaleString(locale)} CFA
                          </span>
                          <span className="text-[10px] text-white/30">{tr.count} op.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU DÉTAILLÉ DATE PAR DATE AVEC COLONNES COMPLÈTES (BASE / MONTAGE / LIVRAISON / TOTAL) */}
          <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            {groupedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h4 className="text-sm font-bold text-white/60">
                  {isEn ? "No matching records found" : "Aucun résultat trouvé pour ce filtre"}
                </h4>
                <p className="text-xs text-white/40 mt-1">
                  {isEn
                    ? "Try selecting another category or clearing the search filter."
                    : "Essayez de changer d'onglet ou de réinitialiser le filtre chauffeur."}
                </p>
              </div>
            ) : (
              groupedData.map((group) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.015] overflow-hidden"
                >
                  {/* En-tête du groupe avec tous les sous-totaux */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white/[0.04] border-b border-white/8">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="size-4 text-orange-400 shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          {group.label}
                        </h4>
                        {group.subLabel && (
                          <span className="text-[10px] text-white/40 font-semibold block">
                            {group.subLabel} • {group.count}{" "}
                            {isEn ? "entry(ies)" : "opération(s)"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/25 text-pink-300">
                        {isEn ? "Base:" : "Prix Base:"}{" "}
                        <strong>{group.baseCost.toLocaleString(locale)}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300">
                        {isEn ? "Mounting:" : "Montage:"}{" "}
                        <strong>{group.mountingCost.toLocaleString(locale)}</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                        {isEn ? "Delivery:" : "Livraison:"}{" "}
                        <strong>{group.deliveryCost.toLocaleString(locale)}</strong>
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-[#9fe3b9] font-black">
                        TOTAL : {group.totalCost.toLocaleString(locale)} CFA
                      </span>
                    </div>
                  </div>

                  {/* Lignes détaillées date par date */}
                  <div className="divide-y divide-white/5">
                    {group.items.map((item) => {
                      const subBadge = getSubTypeBadge(item.subType, item.subTypeLabel);
                      const Icon = subBadge.icon;
                      const truckBadge = getTruckBadge(item.truckKey, item.vehicle);

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedRecord(item)}
                          className="p-3.5 hover:bg-white/[0.03] transition-all cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-md mt-0.5"
                              style={{
                                backgroundColor: `${subBadge.color}15`,
                                borderColor: `${subBadge.color}35`,
                                color: subBadge.color,
                              }}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-black font-mono">
                                  {item.displayDate}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase border"
                                  style={{
                                    backgroundColor: truckBadge.bg,
                                    borderColor: truckBadge.border,
                                    color: truckBadge.color,
                                  }}
                                >
                                  {truckBadge.label}
                                </span>
                                <span
                                  className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
                                  style={{
                                    backgroundColor: `${subBadge.color}20`,
                                    color: subBadge.color,
                                  }}
                                >
                                  {item.subTypeLabel}
                                </span>
                                {item.quantityNote && (
                                  <span className="px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-black">
                                    {item.quantityNote}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-white/95">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-white/45 mt-0.5 italic">
                                Spreadsheet : &ldquo;{item.rawComment}&rdquo;
                              </p>
                            </div>
                          </div>

                          {/* Colonnes de décomposition des coûts sur chaque ligne */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 justify-end">
                            <div className="px-2.5 py-1.5 rounded-xl bg-pink-500/[0.06] border border-pink-500/20 text-right min-w-[96px]">
                              <span className="text-[8px] font-black uppercase text-pink-300/70 block">
                                {item.subType === "pneu"
                                  ? isEn
                                    ? "Tires Price"
                                    : "Prix Pneus"
                                  : isEn
                                  ? "Base Price"
                                  : "Prix Base"}
                              </span>
                              <span className="text-xs font-black text-pink-400 font-mono">
                                {item.baseCost.toLocaleString(locale)}
                              </span>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-right min-w-[86px]">
                              <span className="text-[8px] font-black uppercase text-amber-300/70 block">
                                {isEn ? "Mounting/Labor" : "Frais Montage"}
                              </span>
                              <span className="text-xs font-black text-amber-400 font-mono">
                                {item.mountingCost > 0
                                  ? `+${item.mountingCost.toLocaleString(locale)}`
                                  : "0"}
                              </span>
                            </div>

                            <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 text-right min-w-[86px]">
                              <span className="text-[8px] font-black uppercase text-cyan-300/70 block">
                                {isEn ? "Delivery/Transp." : "Frais Livraison"}
                              </span>
                              <span className="text-xs font-black text-cyan-400 font-mono">
                                {item.deliveryCost > 0
                                  ? `+${item.deliveryCost.toLocaleString(locale)}`
                                  : "0"}
                              </span>
                            </div>

                            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right min-w-[115px]">
                              <span className="text-[8px] font-black uppercase text-emerald-300/70 block">
                                {isEn ? "Total CFA" : "Total Tout Compris"}
                              </span>
                              <span className="text-sm font-black text-[#9fe3b9] font-mono">
                                {item.totalCost.toLocaleString(locale)} CFA
                              </span>
                            </div>

                            {item.driveLink && (
                              <span
                                className="p-2 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6]"
                                title={isEn ? "Receipt attached" : "Justificatif Drive"}
                              >
                                <FolderOpen className="size-4" />
                              </span>
                            )}
                            <ChevronRight className="size-4 text-white/20 group-hover:text-white transition-all" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : DÉTAIL DE L'OPÉRATION & APERÇU GOOGLE DRIVE                       */}
      {/* ========================================================================= */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#161616] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <Wrench className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedRecord.title}</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {selectedRecord.vehicle} • {selectedRecord.displayDate} •{" "}
                    {selectedRecord.subTypeLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Décomposition financière complète */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/25">
                <span className="text-[10px] font-black uppercase text-pink-300 block">
                  {isEn ? "Base Price" : "Prix de Base"}
                </span>
                <p className="text-base font-black text-pink-400 font-mono mt-1">
                  {selectedRecord.baseCost.toLocaleString(locale)} CFA
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                <span className="text-[10px] font-black uppercase text-amber-300 block">
                  {isEn ? "Mounting / Labor" : "Frais de Montage"}
                </span>
                <p className="text-base font-black text-amber-400 font-mono mt-1">
                  {selectedRecord.mountingCost.toLocaleString(locale)} CFA
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25">
                <span className="text-[10px] font-black uppercase text-cyan-300 block">
                  {isEn ? "Delivery / Transport" : "Frais de Livraison"}
                </span>
                <p className="text-base font-black text-cyan-400 font-mono mt-1">
                  {selectedRecord.deliveryCost.toLocaleString(locale)} CFA
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35">
                <span className="text-[10px] font-black uppercase text-emerald-300 block">
                  {isEn ? "Total Disbursed" : "Total Décaissé"}
                </span>
                <p className="text-base font-black text-[#9fe3b9] font-mono mt-1">
                  {selectedRecord.totalCost.toLocaleString(locale)} CFA
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                {isEn
                  ? "Original Spreadsheet Comment (Col M / N)"
                  : "Commentaire Exact Extrait de la Feuille Spreadsheet (Col M / N)"}
              </span>
              <p className="text-sm text-white/90 leading-relaxed font-mono">
                &ldquo;{selectedRecord.rawComment}&rdquo;
              </p>
            </div>

            {selectedRecord.driveLink ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white/60 flex items-center gap-1.5">
                    <FolderOpen className="size-4 text-[#3B82F6]" />
                    {isEn ? "Attached Receipt" : "Pièce Justificative Associée"}
                  </span>
                  <a
                    href={selectedRecord.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3B82F6] hover:underline font-bold flex items-center gap-1"
                  >
                    {isEn ? "Open in Drive" : "Ouvrir dans Drive"}{" "}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="min-h-[300px] rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center relative">
                  {getDriveEmbedUrl(selectedRecord.driveLink) ? (
                    <iframe
                      src={getDriveEmbedUrl(selectedRecord.driveLink)!}
                      className="w-full h-[360px] border-0"
                      allow="autoplay"
                      title="Justificatif Drive"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <FolderOpen className="size-10 text-[#3B82F6] mx-auto" />
                      <a
                        href={selectedRecord.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider"
                      >
                        <ExternalLink className="size-3.5" />{" "}
                        {isEn ? "Open full folder" : "Ouvrir le dossier complet"}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export default MaintenanceLog;
