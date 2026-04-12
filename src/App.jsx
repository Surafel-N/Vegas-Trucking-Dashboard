import LoginScreen from "./components/LoginScreen.jsx";
import { useState, useMemo, useEffect, startTransition } from "react";

import {
  AlertTriangle,
  BarChart3,
  LogOut,
  ReceiptText,
  Settings,
  Settings2,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Wallet,
  Banknote,
  Grid2X2,
  PlusCircle,
  RefreshCcw,
  Cloud,
  ExternalLink,
} from "lucide-react";
import {
  ALL_CHAUFFEURS,
  ALL_DESTINATIONS,
  ALL_MONTHS,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatPercent,
  formatTonnage,
  getDashboardMetrics,
  getDateBounds,
  getMonthOptions,
  getYearOptions,
  loadSDVFiles,
} from "./lib/dashboard";
import { computeDashboard } from "./utils/computeDashboard";
import SmartBulkImporter from './components/SmartBulkImporter';
import { MaintenanceAdminModule } from "./components/MaintenanceAdminModule.jsx";
import {
  loadFinanceRecords,
  saveFinanceRecords,
  buildUploadRecord,
} from "./utils/financeRecords";
import { ROLE_MANAGER, ROLE_VIEWER, ROLE_ADMIN, getRolePermissions } from "./utils/auth";
import { getMonthlyComparison } from "./utils/getMonthlyComparison";
import ExpenseModule from './components/ExpenseModule';
import { KpiCard } from "./components/KpiCard";
import { FilterBar } from "./components/FilterBar";
import { Charts } from "./components/Charts";
import { FleetStatus } from "./components/FleetStatus";
import { LogisticsCalendar } from "./components/LogisticsCalendar";
import { FleetTrackerWidget } from "./components/FleetTrackerWidget";
import { MostProfitableDay } from "./components/MostProfitableDay";
import { ReportsModule } from "./components/ReportsModule";
import { SettingsModule } from "./components/SettingsModule";
import { TransportTable } from "./components/TransportTable";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FinanceWorkspace } from "./components/FinanceWorkspace";
import { DocumentsIngestionModule } from "./components/DocumentsIngestionModule";
import { TripsModule } from "./components/TripsModule";
import { DailyClosingModule } from "./components/DailyClosingModule";
import { AuditLogModule } from "./components/AuditLogModule";
import { DriversModule } from "./components/DriversModule";
import ManualEntryModule from "./components/ManualEntryModule";

// IMPORT DU NOUVEAU MODULE DE VALIDATION IA
import AITicketValidationModule from "./components/AITicketValidationModule";

const APP_STORAGE_KEYS = {
  auth: "sdv_auth_session_v1",
  trips: "sdv_manual_trips_v1",
  closings: "sdv_closings_v1",
  categories: "sdv_categories_v1",
  audit: "sdv_audit_logs_v1",
  inbox: "sdv_documents_inbox_v1",
  drivers: "sdv_cms_drivers_v1",
  vehicles: "sdv_cms_vehicles_v1",
  destinations: "sdv_cms_destinations_v1",
  rules: "sdv_cms_rules_v1",
  ui: "sdv_cms_ui_v1",
  pending_ai_tickets: "sdv_pending_ai_tickets_v1",
  maintenance: "sdv_maintenance_v1"
};

const DEFAULT_BUSINESS_RULES_UI = {
  voyageThreshold: 100,
  fuelCostPerKm: 0,
  targetMargin: 0.2,
};

const DEFAULT_UI_CONFIG = {
  widgets: [
    { id: "profit", label: "Total Bénéfice", enabled: true },
    { id: "tonnage", label: "Tonnage Total", enabled: true },
    { id: "costs", label: "Total dépenses", enabled: true },
    { id: "revenue", label: "Total Revenu", enabled: true },
    { id: "voyages", label: "Total Voyages", enabled: true },
    { id: "calendar", label: "Calendrier", enabled: true },
    { id: "expenses", label: "Dépenses Cloud", enabled: true },
    { id: "mileage", label: "Kilométrage Flotte", enabled: true },
  ],
  menu: [
    { id: "dashboard", label: "Dashboard", enabled: true },
    { id: "analytics", label: "Analytics", enabled: true },
    { id: "drivers", label: "Chauffeurs", enabled: true },
    { id: "trips", label: "Trajets", enabled: true },
    { id: "depenses", label: "Dépenses", enabled: true },
    { id: "encaissements", label: "Encaissements", enabled: true },
    { id: "documents", label: "Validation IA", enabled: true }, // RENOMMÉ ICI
    { id: "closing", label: "Clôture jour", enabled: true },
    { id: "reports", label: "Rapports", enabled: true },
    { id: "audit", label: "Audit", enabled: true },
    { id: "maintenance", label: "Maintenance", enabled: true },
    { id: "quick-entry", label: "Saisie Rapide", enabled: true },
    { id: "admin", label: "Importation", enabled: true },
    { id: "settings", label: "Réglages", enabled: true },
  ],
};
const DEFAULT_DRIVERS = [
  { id: "drv-amara", sdv: "TRUCK 76", name: "AMARA", phone: "+225 07 07 00 00 01", license: "SDV-AMARA-01", status: "active", vehicle: "AA-672-PS-09" },
  { id: "drv-brahima", sdv: "TRUCK 45", name: "BRAHIMA", phone: "+225 07 07 00 00 02", license: "SDV-BRAHIMA-02", status: "active", vehicle: "BB-221-TR-07" },
  { id: "drv-soro", sdv: "TRUCK 52", name: "SORO", phone: "+225 07 07 00 00 03", license: "SDV-SORO-03", status: "active", vehicle: "CC-478-KL-01" },
];
const DEFAULT_DESTINATIONS_LIST = ["Abidjan", "San Pedro", "Lauzoua", "Yamoussoukro", "Bouake"];
const DEFAULT_VEHICLES = [
  { id: "veh-1", plate: "AA-672-PS-09", model: "Renault Kerax", status: "active" },
  { id: "veh-2", plate: "BB-221-TR-07", model: "Volvo FMX", status: "active" },
  { id: "veh-3", plate: "CC-478-KL-01", model: "Scania G440", status: "active" },
];

function loadJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch (err) {
    return fallback;
  }
}

function saveJson(key, data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (e) { }
}

function Header({ activeSection, onSectionChange, isAuthenticated, authUser, onLogout, menuConfig = [], syncWithGoogleSheets, isSyncing, syncTicketsIA, isSyncingTickets, pendingCount }) {
  const iconMap = {
    dashboard: BarChart3, analytics: BarChart3, drivers: Users, trips: Truck,
    depenses: Wallet, encaissements: Banknote, documents: ReceiptText,
    closing: ShieldCheck, reports: ReceiptText, audit: ShieldCheck,
    "quick-entry": PlusCircle, admin: Settings, settings: Settings2,
  };

  const activeMenu = menuConfig.filter(m => m.enabled);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/50 px-4 md:px-6 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#cf5d56]">
          <Truck className="size-6 text-white" />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold text-white md:text-lg">SDV Chauffeur</h1>
          <p className="text-[10px] text-white/50">Logistics & Performance</p>
        </div>
      </div>
      
      {/* Navigation visible uniquement sur Desktop */}
      <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar mx-2 flex-1 scroll-smooth">
        {activeMenu.map((item) => {
          const Icon = iconMap[item.id] || Grid2X2;
          const isActive = activeSection === item.id;
          return (
            <button 
              key={item.id} onClick={() => onSectionChange(item.id)}
              className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${isActive ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
            >
              <Icon className="size-4 shrink-0" /> 
              <span className={isActive ? "block" : "hidden md:block"}>{item.label}</span>
              {item.id === 'documents' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); syncTicketsIA && syncTicketsIA(); }}
          disabled={isSyncingTickets || !syncTicketsIA}
          title="Sync Tickets IA"
          className={`relative z-50 pointer-events-auto cursor-pointer flex items-center justify-center gap-2 rounded-full bg-[#4285F4]/10 p-2 md:px-4 md:py-2 text-xs font-bold text-[#4285F4] transition-all hover:bg-[#4285F4]/20 disabled:opacity-30 ${!syncTicketsIA ? 'hidden' : ''}`}
        >
          <Cloud className={`size-4 md:size-3 ${isSyncingTickets ? "animate-bounce" : ""}`} />
          <span className="hidden lg:block">{isSyncingTickets ? "Analyse..." : "Sync IA"}</span>
        </button>

        <button
          onClick={(e) => { e.preventDefault(); syncWithGoogleSheets && syncWithGoogleSheets(); }}
          disabled={isSyncing || !syncWithGoogleSheets}
          title="Sync Sheets"
          className={`relative z-50 pointer-events-auto cursor-pointer flex items-center justify-center gap-2 rounded-full bg-[#cf5d56]/10 p-2 md:px-4 md:py-2 text-xs font-bold text-[#cf5d56] transition-all hover:bg-[#cf5d56]/20 disabled:opacity-30 ${!syncWithGoogleSheets ? 'hidden' : ''}`}
        >
          <RefreshCcw className={`size-4 md:size-3 ${isSyncing ? "animate-spin" : ""}`} />
          <span className="hidden lg:block">{isSyncing ? "Synchro..." : "Sync Sheets"}</span>
        </button>

        {isAuthenticated && (
          <div className="flex items-center gap-2 md:gap-3 border-l border-white/10 pl-2 md:pl-4 ml-1 md:ml-0">
            <div className="text-right hidden xl:block">
              <p className="text-sm font-medium text-white">{authUser?.username || "Admin"}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/40">{authUser?.role || "Manager"}</p>
            </div>
            <button onClick={onLogout} className="rounded-full bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function BottomNav({ activeSection, onSectionChange, menuConfig = [] }) {
  const iconMap = {
    dashboard: BarChart3, analytics: BarChart3, drivers: Users, trips: Truck,
    depenses: Wallet, encaissements: Banknote, documents: ReceiptText,
    closing: ShieldCheck, reports: ReceiptText, audit: ShieldCheck,
    "quick-entry": PlusCircle, admin: Settings, settings: Settings2,
  };

  // On affiche seulement les sections principales en bas sur mobile
  const priorityOrder = ["dashboard", "analytics", "trips", "depenses", "documents", "reports", "settings"];
  const mobileMenu = menuConfig
    .filter(m => m.enabled && priorityOrder.includes(m.id))
    .sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id))
    .slice(0, 5); // Max 5 items pour la barre du bas

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around bg-black/80 backdrop-blur-2xl border-t border-white/10 px-2 py-3 pb-safe">
      {mobileMenu.map((item) => {
        const Icon = iconMap[item.id] || Grid2X2;
        const isActive = activeSection === item.id;
        return (
          <button 
            key={item.id} 
            onClick={() => onSectionChange(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${isActive ? "text-[#cf5d56]" : "text-white/40"}`}
          >
            <Icon className={`size-6 ${isActive ? "scale-110" : "scale-100"}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
          </button>
        );
      })}
    </nav>
  );
}

function EmptyState({ invalidRange, selectedYear }) {
  return (
    <section className="rounded-[30px] border border-[#cf5d56]/18 bg-[#181818] p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#cf5d56]/12 p-3 text-[#ff8f84]">
        <AlertTriangle className="size-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">
        {invalidRange ? "Plage de dates invalide" : `Aucune donnée pour l'année ${selectedYear}`}
      </h3>
      <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-md mx-auto">
        Utilisez le sélecteur d'année ou allez dans l'onglet 'Importation' pour ajouter de nouveaux trajets.
      </p>
    </section>
  );
}

export default function App() {
const [authUser, setAuthUser] = useState(() => loadJson(APP_STORAGE_KEYS.auth, null));
  const [activeSection, setActiveSection] = useState("dashboard");
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingTickets, setIsSyncingTickets] = useState(false);

  // File d'attente IA
  const [pendingTickets, setPendingTickets] = useState(() => loadJson(APP_STORAGE_KEYS.pending_ai_tickets, []));

  const [drivers, setDrivers] = useState(() => loadJson(APP_STORAGE_KEYS.drivers, DEFAULT_DRIVERS));
  const [vehicles, setVehicles] = useState(() => loadJson(APP_STORAGE_KEYS.vehicles, DEFAULT_VEHICLES));
  const [destinationsList, setDestinationsList] = useState(() => loadJson(APP_STORAGE_KEYS.destinations, DEFAULT_DESTINATIONS_LIST));
  const [businessRules, setBusinessRules] = useState(() => loadJson(APP_STORAGE_KEYS.rules, DEFAULT_BUSINESS_RULES_UI));
  const [uiConfig, setUiConfig] = useState(() => loadJson(APP_STORAGE_KEYS.ui, DEFAULT_UI_CONFIG));

  const [manualTrips, setManualTrips] = useState(() => loadJson(APP_STORAGE_KEYS.trips, []));
  const [expenseRecords, setExpenseRecords] = useState(() => loadFinanceRecords("expenses"));
  const [incomeRecords, setIncomeRecords] = useState(() => loadFinanceRecords("incomes"));
  const [documentRecords, setDocumentRecords] = useState(() => loadFinanceRecords("documents"));
  const [dailyClosings, setDailyClosings] = useState(() => loadJson(APP_STORAGE_KEYS.closings, []));
  const [auditLogs, setAuditLogs] = useState(() => loadJson(APP_STORAGE_KEYS.audit, []));
  const [maintenanceRecords, setMaintenanceRecords] = useState(() => loadJson(APP_STORAGE_KEYS.maintenance, []));
  const [oilChanges, setOilChanges] = useState(() => loadJson('sdv_oil_changes_v1', {}));

  const [categories, setCategories] = useState(() =>
    loadJson(APP_STORAGE_KEYS.categories, { expense: ["Carburant", "Péage"], income: ["Recette trajet"] }),
  );
// On vérifie si l'utilisateur est un Admin
  const isAdmin = authUser?.role === "admin";
  const transportBundle = useMemo(() => {
    try { return loadSDVFiles(businessRules); } catch (e) { return { records: [], stats: [] }; }
  }, [businessRules]);

  const allRecords = transportBundle.records;
  
  const trips = useMemo(() => [
    ...(allRecords || []).map(row => ({ ...row, tripType: "Régulier" })),
    ...(manualTrips || []),
  ], [allRecords, manualTrips]);

  const yearOptions = useMemo(() => getYearOptions(trips), [trips]);
  const [chauffeur, setChauffeur] = useState(ALL_CHAUFFEURS);
  const [month, setMonth] = useState(ALL_MONTHS);
  
  // Default year logic: use 2026 if it has data, otherwise fallback to 2025
  const [year, setYear] = useState(() => {
    const has2026 = trips.some(t => String(t.year) === "2026");
    if (has2026) return "2026";
    return yearOptions.includes("2025") ? "2025" : (yearOptions[yearOptions.length - 1] || "2026");
  });
  const [destination, setDestination] = useState(ALL_DESTINATIONS);
  
  const globalBounds = useMemo(() => getDateBounds(trips), [trips]);
  const [startDate, setStartDate] = useState(globalBounds.min);
  const [endDate, setEndDate] = useState(globalBounds.max);

  const chauffeurOptions = useMemo(() => [ALL_CHAUFFEURS, ...drivers.map(d => `${d.name} ${d.sdv}`)], [drivers]);
  const monthOptions = useMemo(() => getMonthOptions(trips), [trips]);
  const destinationOptions = useMemo(() => [ALL_DESTINATIONS, ...destinationsList], [destinationsList]);

  const filteredData = useMemo(() => {
    return trips.filter((t) => {
      const chauffeurMatch = chauffeur === ALL_CHAUFFEURS || String(t.driverLabel || "").trim() === String(chauffeur).trim();
      const recordMonth = t.month || (t.date ? new Date(t.date + 'T00:00:00').getMonth() + 1 : null);
      const monthMatch = month === ALL_MONTHS || (recordMonth !== null && String(recordMonth) === String(Number(month)));
      const recordYear = t.year || (t.date ? new Date(t.date + 'T00:00:00').getFullYear() : null);
      const yearMatch = !year || (recordYear !== null && String(recordYear) === String(year));
      const destinationMatch = destination === ALL_DESTINATIONS || t.destination === destination;
      const startMatch = !startDate || t.date >= startDate;
      const endMatch = !endDate || t.date <= endDate;
      return chauffeurMatch && monthMatch && yearMatch && destinationMatch && startMatch && endMatch;
    });
  }, [trips, chauffeur, month, year, destination, startDate, endDate]);

  const calendarData = useMemo(() => {
    return trips.filter((t) => {
      const chauffeurMatch = chauffeur === ALL_CHAUFFEURS || String(t.driverLabel || "").trim() === String(chauffeur).trim();
      const recordYear = t.year || (t.date ? new Date(t.date + 'T00:00:00').getFullYear() : null);
      const yearMatch = !year || (recordYear !== null && String(recordYear) === String(year));
      const destinationMatch = destination === ALL_DESTINATIONS || t.destination === destination;
      const startMatch = !startDate || t.date >= startDate;
      const endMatch = !endDate || t.date <= endDate;
      return chauffeurMatch && yearMatch && destinationMatch && startMatch && endMatch;
    });
  }, [trips, chauffeur, year, destination, startDate, endDate]);

  const dashboardData = useMemo(() => computeDashboard(filteredData), [filteredData]);
  const dashboardMetrics = useMemo(() => getDashboardMetrics(filteredData), [filteredData]);
  const monthlyComparison = useMemo(() => getMonthlyComparison(allRecords, year), [allRecords, year]);
  const invalidRange = startDate && endDate && startDate > endDate;
  const rolePermissions = getRolePermissions(authUser?.role || ROLE_VIEWER);

  const filteredMenu = useMemo(() => {
    return uiConfig.menu.filter(item => {
      if (!item.enabled) return false;
      if (authUser?.role === "viewer") {
        // Le visiteur ne voit que Dashboard, Analytics, Audit et Rapports (en lecture seule)
        return ["dashboard", "analytics", "reports", "audit"].includes(item.id);
      }
      return true;
    });
  }, [uiConfig.menu, authUser?.role]);


  const chauffeurKpis = useMemo(() => [
    { label: "Revenue", value: formatCurrency(dashboardMetrics.totalRevenue), tone: "teal" },
    { label: "Costs", value: formatCurrency(dashboardMetrics.totalCosts), tone: "red" },
    { label: "Profit", value: formatCurrency(dashboardMetrics.totalProfit), tone: "green" },
    { label: "Tonnage", value: formatTonnage(dashboardMetrics.totalTonnage), tone: "slate" },
  ], [dashboardMetrics]);

  useEffect(() => { 
    // Migration plus robuste des noms de camions
    let globalMigrated = false;
    const migratedDrivers = drivers.map(d => {
      let sdv = String(d.sdv || "").toUpperCase();
      let name = String(d.name || "").toUpperCase();
      let newSdv = d.sdv;

      if (name === "AMARA" && (sdv.includes("SDV 1") || sdv.includes("SDV1") || sdv.includes("TRUCK 76") === false)) { newSdv = "TRUCK 76"; }
      if (name === "BRAHIMA" && (sdv.includes("SDV 2") || sdv.includes("SDV2") || sdv.includes("TRUCK 45") === false)) { newSdv = "TRUCK 45"; }
      if (name === "SORO" && (sdv.includes("SDV 3") || sdv.includes("SV3") || sdv.includes("SDV3") || sdv.includes("TRUCK 52") === false)) { newSdv = "TRUCK 52"; }
      
      if (newSdv !== d.sdv) {
        globalMigrated = true;
        return { ...d, sdv: newSdv };
      }
      return d;
    });

    if (globalMigrated) setDrivers(migratedDrivers);
    saveJson(APP_STORAGE_KEYS.drivers, drivers); 
  }, [drivers]);
  
  useEffect(() => { 
    // Migration plus robuste des trajets manuels
    const needsMigration = manualTrips.some(t => {
      const label = String(t.driverLabel || "").toUpperCase();
      return label.includes("(") || label.includes("SDV") || label.includes("SV");
    });
    
    if (needsMigration) {
      const migrated = manualTrips.map(t => {
        let label = String(t.driverLabel || "").toUpperCase();
        if (label.includes("AMARA")) label = "AMARA TRUCK 76";
        else if (label.includes("BRAHIMA")) label = "BRAHIMA TRUCK 45";
        else if (label.includes("SORO")) label = "SORO TRUCK 52";
        return { ...t, driverLabel: label };
      });
      setManualTrips(migrated);
    }
    saveJson(APP_STORAGE_KEYS.trips, manualTrips); 
  }, [manualTrips]);

  useEffect(() => { saveJson(APP_STORAGE_KEYS.pending_ai_tickets, pendingTickets); }, [pendingTickets]);
  useEffect(() => { saveJson(APP_STORAGE_KEYS.maintenance, maintenanceRecords); }, [maintenanceRecords]);
  useEffect(() => { saveJson('sdv_oil_changes_v1', oilChanges); }, [oilChanges]);

  const handleClearAllStorage = () => {
    if (confirm("🚨 Attention : Cela va supprimer absolument TOUTES les données (2026, imports, réglages). Confirmer ?")) {
      localStorage.clear(); window.location.reload();
    }
  };
const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem(APP_STORAGE_KEYS.auth);
    setActiveSection("dashboard");
  };
  const deleteImportBatch = (batchId) => {
    const batchCount = manualTrips.filter(t => t.batchId === batchId).length;
    if (confirm(`Voulez-vous vraiment supprimer cet import de ${batchCount} trajets ?`)) {
      setManualTrips(prev => prev.filter(t => t.batchId !== batchId));
      setAuditLogs(prev => prev.filter(log => log.batchId !== batchId));
      alert("Import supprimé avec succès.");
    }
  };

  // ----------------------------------------------------
  // NOUVELLES FONCTIONS IA
  // ----------------------------------------------------

  const handleApproveAITicket = (ticketInfo) => {
    const finalData = ticketInfo.finalData;
    const dateObj = finalData.date ? new Date(finalData.date) : new Date();
    
    const gross = parseFloat(finalData.total_gross_cfa) || 0;
    const expense = parseFloat(finalData.total_expense_cfa) || 0;
    const tonnage = parseFloat(finalData.tonnage) || 0;

    const newTrip = {
      id: `ai-${Date.now()}`,
      batchId: 'ai-manual-validation',
      importDate: new Date().toISOString(),
      driverLabel: finalData.driverLabel,
      date: finalData.date,
      day: dateObj.getDate(),
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      start: "Non renseigné",
      destination: "Non renseigné",
      fuel_cost_cfa: 0,
      road_fees_cfa: 0,
      tonnage: tonnage,
      total_gross_cfa: gross,
      total_expense_cfa: expense,
      total_net_cfa: gross - expense,
      voyages: tonnage > 100 ? 2 : (tonnage > 0 ? 1 : 0),
      tripType: "IA Validé",
      comments: `Ticket scanné validé manuellement`,
      km: 0
    };

    setManualTrips(prev => [...prev, newTrip]);
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`, timestamp: new Date().toISOString(), type: "Validation IA", count: 1, batchId: 'ai-manual-validation'
    }, ...prev]);
  };

  const syncTicketsIA = async () => {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
      alert("⚠️ Clé Gemini introuvable. As-tu bien créé le fichier .env ?");
      return;
    }

    setIsSyncingTickets(true);
    console.log("🚀 Lancement de la lecture IA...");

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const folderId = '1imyGSmHQLno6yNwUl5cHJbjfD_kI24zJ';
              const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,thumbnailLink)`;

              const driveRes = await fetch(listUrl, {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
              });
              const driveData = await driveRes.json();
              const files = driveData.files || [];

              if (files.length === 0) {
                alert("🤷‍♂️ Aucun ticket trouvé dans le dossier Drive.");
                setIsSyncingTickets(false);
                return;
              }

              alert(`✅ ${files.length} ticket(s) trouvé(s) ! L'IA commence la lecture. Patiente un peu...`);
              const newPendingTickets = [];

              for (const file of files) {
                console.log(`Lecture du fichier ${file.name}...`);
                
                const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                  headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                const blob = await fileRes.blob();
                
                const base64data = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result.split(',')[1]);
                  reader.readAsDataURL(blob);
                });

                const geminiPrompt = `
                  Tu es un expert en logistique en Côte d'Ivoire.
                  Analyse ce ticket de pesée ou de transport et extrais les informations suivantes sous format JSON strict.
                  - "chauffeur": Le nom du chauffeur (cherche AMARA, BRAHIMA ou SORO).
                  - "date": La date du ticket au format YYYY-MM-DD.
                  - "tonnage": Le poids (en nombre).
                  - "total_gross_cfa": Le montant total payé ou recette brute (en nombre).
                  - "total_expense_cfa": Les frais, avances ou péages (en nombre).
                  Si tu ne trouves pas une info, mets 0 ou null.
                  Renvoie UNIQUEMENT le code JSON, sans texte autour.
                `;

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
                const geminiRes = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [ { text: geminiPrompt }, { inline_data: { mime_type: blob.type, data: base64data } } ] }]
                  })
                });

                const geminiData = await geminiRes.json();
                let aiResponseText = geminiData.candidates[0].content.parts[0].text;
                
                aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const extractedData = JSON.parse(aiResponseText);

                let finalDriverLabel = "";
                const cName = String(extractedData.chauffeur || "").toUpperCase();
                if (cName.includes("AMARA")) finalDriverLabel = "AMARA TRUCK 76";
                else if (cName.includes("BRAHIMA")) finalDriverLabel = "BRAHIMA TRUCK 45";
                else if (cName.includes("SORO")) finalDriverLabel = "SORO TRUCK 52";

                newPendingTickets.push({
                  id: file.id,
                  receivedAt: new Date().toISOString(),
                  source: 'Drive Bot',
                  imageUrl: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s800') : null,
                  aiData: {
                    driverLabel: finalDriverLabel,
                    date: extractedData.date || new Date().toISOString().split('T')[0],
                    tonnage: parseFloat(extractedData.tonnage) || 0,
                    total_gross_cfa: parseFloat(extractedData.total_gross_cfa) || 0,
                    total_expense_cfa: parseFloat(extractedData.total_expense_cfa) || 0
                  }
                });
              }

              setPendingTickets(prev => [...newPendingTickets, ...prev]);
              alert("🎉 Lecture terminée ! Allez dans 'Validation IA' pour vérifier et intégrer les tickets.");

            } catch (error) {
              console.error("Erreur de traitement:", error);
              alert("❌ Erreur pendant la lecture. Regarde la console.");
            } finally {
              setIsSyncingTickets(false);
            }
          }
        },
        error_callback: (err) => {
          console.error("Erreur Auth:", err);
          setIsSyncingTickets(false);
        }
      });
      client.requestAccessToken();
    } catch (err) {
      console.error("Erreur d'initialisation:", err);
      setIsSyncingTickets(false);
    }
  };

  // ----------------------------------------------------
  // SYNCHRONISATION GOOGLE SHEETS
  // ----------------------------------------------------

  const syncWithGoogleSheets = async () => {
    console.log("🚀 Tentative de synchro Google Sheets...");

    if (!window.google?.accounts?.oauth2) {
      alert("❌ Erreur : La bibliothèque Google n'est pas chargée. Vérifiez votre connexion internet.");
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("❌ Erreur : VITE_GOOGLE_CLIENT_ID est manquant dans les réglages.");
      return;
    }

    setIsSyncing(true);
    const batchId = `sync-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    try {
      console.log("Initialisation du client Google avec ID:", clientId);
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
        prompt: 'consent',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              console.log("✅ Accès autorisé par Google.");
              const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
              const ranges = ["'AMARA TRUCK 76'!A2:O", "'BRAHIMA TRUCK 45'!A2:O", "'SORO TRUCK 52'!A2:O"];
              const queryRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
              const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryRanges}`;

              const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
              });

              if (!response.ok) throw new Error("Erreur Sheets API: " + response.status);
              const data = await response.json();
              
              if (!data.valueRanges) {
                alert("Données Google Sheets vides ou inaccessibles.");
                return;
              }

              const driverKeys = [{ chauffeur: "AMARA", sdv: "TRUCK 76" }, { chauffeur: "BRAHIMA", sdv: "TRUCK 45" }, { chauffeur: "SORO", sdv: "TRUCK 52" }];
              let importedTrips = [];

              data.valueRanges.forEach((vr, idx) => {
                const rows = vr.values || [];
                const { chauffeur, sdv } = driverKeys[idx];
                const driverLabel = `${sdv} (${chauffeur})`;

                rows.forEach(row => {
                  const rawDate = String(row[0] || "").trim();
                  let isoDate = null;
                  const moisMap = { "janvier": "01", "fevrier": "02", "février": "02", "mars": "03", "avril": "04", "mai": "05", "juin": "06", "juillet": "07", "aout": "08", "août": "08", "septembre": "09", "octobre": "10", "novembre": "11", "decembre": "12", "décembre": "12" };
                  const dateTextMatch = rawDate.toLowerCase().match(/(?:\w+)?\s*(\d{1,2})\s+([a-zéû]+)\s+(\d{2,4})/);
                  if (dateTextMatch) {
                    const d = dateTextMatch[1].padStart(2, '0');
                    const m = moisMap[dateTextMatch[2]];
                    let y = dateTextMatch[3];
                    if (y.length === 2) y = "20" + y;
                    if (m) isoDate = `${y}-${m}-${d}`;
                  } else {
                    const dateNumMatch = rawDate.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
                    if (dateNumMatch) {
                      let d = dateNumMatch[1].padStart(2, '0');
                      let m = dateNumMatch[2].padStart(2, '0');
                      let y = dateNumMatch[3];
                      if (y.length === 2) y = "20" + y;
                      isoDate = `${y}-${m}-${d}`;
                    }
                  }

                  // STRICT 2026 FEB RESTRICTION
                  if (!isoDate || isoDate < "2026-02-01") return;

                  const dateObj = new Date(isoDate);
                  const parseNum = (v) => {
                    if (!v) return 0;
                    let clean = String(v).replace(/\s/g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
                    return parseFloat(clean) || 0;
                  };
                  let tonnage = parseNum(row[10]); 
                  let totalGross = parseNum(row[11]); 
                  let totalExpense = parseNum(row[9]); 

                  const newTrip = {
                    id: `gsheet-${chauffeur}-${isoDate}-${totalGross}-${Math.random().toString(36).substr(2, 5)}`,
                    batchId, importDate: new Date().toISOString(), chauffeur, driverLabel, sdv, date: isoDate, day: dateObj.getDate(), month: dateObj.getMonth() + 1, year: dateObj.getFullYear(),
                    start: row[1] || "Non renseigné", destination: row[2] || "Non renseigné", fuel_cost_cfa: parseNum(row[3]), road_fees_cfa: parseNum(row[5]),
                    tonnage, total_gross_cfa: totalGross, total_expense_cfa: totalExpense, total_net_cfa: totalGross - totalExpense,
                    voyages: tonnage > 100 ? 2 : (tonnage > 0 ? 1 : 0), tripType: "Google Sheets", comments: row[13] || "", km: parseNum(row[14])
                  };

                  // DUPLICATE CHECK (Check both manual and regular records)
                  const isDuplicate = trips.some(existing => 
                    existing.date === newTrip.date && 
                    existing.chauffeur === newTrip.chauffeur && 
                    Math.abs((existing.total_gross_cfa || 0) - newTrip.total_gross_cfa) < 10
                  );

                  if (!isDuplicate) {
                    importedTrips.push(newTrip);
                  }
                });
              });

              if (importedTrips.length > 0) {
                setManualTrips(prev => [...prev, ...importedTrips]);
                alert(`${importedTrips.length} nouveaux trajets synchronisés ! (Les doublons ont été ignorés)`);
              } else {
                alert("Aucun nouveau trajet trouvé ou tous les trajets sont déjà présents.");
              }
            } catch (err) {
              console.error("Fetch Error:", err);
              alert("Erreur de récupération : " + err.message);
            } finally {
              setIsSyncing(false);
            }
          }
        },
        error_callback: (err) => {
          console.error("Google Auth Error Detail:", err);
          alert(`Erreur Google (${err.error}) : ${err.error_description || "Vérifiez l'URL du site."}`);
          setIsSyncing(false);
        }
      });
      client.requestAccessToken();
    } catch (err) {
      console.error("Sync Initialization Exception:", err);
      alert("Erreur fatale. Détails: " + err.message);
      setIsSyncing(false);
    }
  };

  const handleSectionChange = (section) => {
    startTransition(() => { setActiveSection(section); });
  };
// --- MUR DE SÉCURITÉ ---
  if (!authUser) {
    return (
      <LoginScreen onLogin={(user) => {
        setAuthUser(user);
        saveJson(APP_STORAGE_KEYS.auth, user);
      }} />
    );
  }

  // -----------------------
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black font-sans antialiased text-white">
      <Header 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
        isAuthenticated={!!authUser} 
        authUser={authUser} 
        onLogout={() => setAuthUser(null)} 
        menuConfig={filteredMenu} 
        syncWithGoogleSheets={rolePermissions.canSync ? syncWithGoogleSheets : null}
        isSyncing={isSyncing}
        syncTicketsIA={rolePermissions.canSync ? syncTicketsIA : null}
        isSyncingTickets={isSyncingTickets}
        pendingCount={rolePermissions.canSync ? pendingTickets.length : 0} 
        />


<main className="h-[calc(100svh-4rem)] md:h-[calc(100svh-10rem)] overflow-auto p-4 md:p-6 md:pt-0 pb-24 md:pb-6">
        <div className="mx-auto max-w-[1600px]">
          <ErrorBoundary>
          <div className="panel-enter">
            
            {activeSection === "dashboard" && (
              <div className="space-y-6">
                {!filteredData.length ? ( 
                  <EmptyState selectedYear={year} invalidRange={invalidRange} /> 
                ) : (
                  <Dashboard 
                    dashboardData={dashboardData} 
                    formatCurrency={formatCurrency} 
                    formatCompactNumber={formatCompactNumber} 
                    onSelectDriver={(l) => { setChauffeur(l); }} 
                    uiConfig={uiConfig} 
                    selectedYear={year} 
                    onDateSelect={(d) => { setStartDate(d); setEndDate(d); }} 
                    onReset={() => { setStartDate(globalBounds.min); setEndDate(globalBounds.max); }} 
                    isDateFiltered={startDate !== globalBounds.min || endDate !== globalBounds.max} 
                    filteredData={filteredData} 
                    calendarData={calendarData} 
                    globalMonth={month} 
                    onMonthChange={setMonth}
                    maintenanceRecords={maintenanceRecords}
                    oilChanges={oilChanges}
                    allTrips={trips}
                    // Filter Props
                    filterProps={{
                      chauffeurs: chauffeurOptions,
                      chauffeur,
                      months: monthOptions,
                      month,
                      years: yearOptions,
                      year,
                      destinations: destinationOptions,
                      destination,
                      startDate,
                      endDate,
                      onChauffeurChange: setChauffeur,
                      onMonthChange: setMonth,
                      onYearChange: setYear,
                      onDestinationChange: setDestination,
                      onStartDateChange: setStartDate,
                      onEndDateChange: setEndDate,
                      onReset: () => { setChauffeur(ALL_CHAUFFEURS); setMonth(ALL_MONTHS); setStartDate(globalBounds.min); setEndDate(globalBounds.max); },
                      onClearAllStorage: rolePermissions.canDelete ? handleClearAllStorage : null
                    }}
                  />
                )}
              </div>
            )}

            {activeSection === "analytics" && <Charts dashboardData={dashboardData} monthlyComparison={monthlyComparison} formatCurrency={formatCurrency} />}
            {activeSection === "drivers" && <DriversModule drivers={drivers} setDrivers={rolePermissions.canEdit ? setDrivers : null} />}
            {activeSection === "trips" && <TripsModule trips={filteredData} chauffeurs={chauffeurOptions} onAddTrip={rolePermissions.canEdit ? (t) => setManualTrips([...manualTrips, t]) : null} />}
            {activeSection === "depenses" && <ExpenseModule expenses={expenseRecords} setExpenses={rolePermissions.canEdit ? setExpenseRecords : null} drivers={drivers} formatCurrency={formatCurrency} />}
            {activeSection === "encaissements" && <FinanceWorkspace type="income" records={incomeRecords} setRecords={rolePermissions.canEdit ? setIncomeRecords : null} categories={categories} setCategories={rolePermissions.canEdit ? setCategories : null} />}
            
            {/* L'ONGLET VALIDATION IA */}
            {activeSection === "documents" && (
              <AITicketValidationModule 
                pendingTickets={pendingTickets} 
                setPendingTickets={rolePermissions.canEdit ? setPendingTickets : null} 
                onApprove={rolePermissions.canEdit ? handleApproveAITicket : null}
                drivers={drivers}
              />
            )}

            {activeSection === "closing" && <DailyClosingModule closings={dailyClosings} setClosings={rolePermissions.canEdit ? setDailyClosings : null} />}
            {activeSection === "maintenance" && <MaintenanceAdminModule records={maintenanceRecords} setRecords={rolePermissions.canEdit ? setMaintenanceRecords : null} drivers={drivers} googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID} oilChanges={oilChanges} setOilChanges={rolePermissions.canEdit ? setOilChanges : null} />}
            {activeSection === "reports" && <ReportsModule records={manualTrips} setRecords={rolePermissions.canDelete ? setManualTrips : null} chauffeurs={chauffeurOptions} auditLogs={auditLogs} onDeleteBatch={rolePermissions.canDelete ? deleteImportBatch : null} canDelete={rolePermissions.canDelete} />}
            {activeSection === "audit" && <AuditLogModule logs={auditLogs} />}
            {activeSection === "quick-entry" && <ManualEntryModule setTrips={rolePermissions.canEdit ? setManualTrips : null} />}
            {activeSection === "admin" && <SmartBulkImporter setTrips={rolePermissions.canEdit ? setManualTrips : null} setAuditLogs={rolePermissions.canEdit ? setAuditLogs : null} />}
            {activeSection === "settings" && <SettingsModule drivers={drivers} setDrivers={rolePermissions.canEdit ? setDrivers : null} vehicles={vehicles} setVehicles={rolePermissions.canEdit ? setVehicles : null} destinationsList={destinationsList} setDestinationsList={rolePermissions.canEdit ? setDestinationsList : null} businessRules={businessRules} setBusinessRules={rolePermissions.canEdit ? setBusinessRules : null} uiConfig={uiConfig} setUiConfig={rolePermissions.canEdit ? setUiConfig : null} categories={categories} setCategories={rolePermissions.canEdit ? setCategories : null} canManageCategories={rolePermissions.canManageCategories} trips={trips} onBulkImport={rolePermissions.canEdit ? (newTrips) => setManualTrips([...manualTrips, ...newTrips]) : null} onClearAllStorage={rolePermissions.canDelete ? handleClearAllStorage : null} />}
            
          </div>
        </ErrorBoundary>
        </div>
        </main>

        <BottomNav 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
        menuConfig={uiConfig.menu} 
        />
        </div>
        );
        } 
 