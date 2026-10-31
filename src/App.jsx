import LoginScreen from "./components/LoginScreen.jsx";
import { useState, useMemo, useEffect, startTransition, lazy, Suspense } from "react";

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
  Banknote,
  Grid2X2,
  PlusCircle,
  RefreshCcw,
  Cloud,
  ExternalLink,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Database,
  Menu,
  X,
  Sparkles,
  Activity,
  User,
  Search,
  Layout,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { WalletIcon } from "./components/WalletIcon";
import {
  ALL_CHAUFFEURS,
  ALL_DESTINATIONS,
  ALL_MONTHS,
  ALL_YEARS,
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
import { isSalaryRecord, MAINTENANCE_KEYWORDS } from "./utils/salaryFilter";
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
import { FilterBar } from "./components/FilterBar";
import { FleetStatus } from "./components/FleetStatus";
import { LogisticsCalendar } from "./components/LogisticsCalendar";
import { FleetTrackerWidget } from "./components/FleetTrackerWidget";
import { ReportsModule } from "./components/ReportsModule";
import { SettingsModule } from "./components/SettingsModule";
const FlotteHub = lazy(() => import("./components/FlotteHub").then(module => ({ default: module.FlotteHub })));
const FinanceHub = lazy(() => import("./components/FinanceHub").then(module => ({ default: module.FinanceHub })));
const DataEntryHub = lazy(() => import("./components/DataEntryHub").then(module => ({ default: module.DataEntryHub })));
const ReportsHub = lazy(() => import("./components/ReportsHub").then(module => ({ default: module.ReportsHub })));

import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FinanceWorkspace } from "./components/FinanceWorkspace";
import { TripsModule } from "./components/TripsModule";
import { DailyClosingModule } from "./components/DailyClosingModule";
import { AuditLogModule } from "./components/AuditLogModule";
import { DriversModule } from "./components/DriversModule";
import ManualEntryModule from "./components/ManualEntryModule";
import AITicketValidationModule from "./components/AITicketValidationModule";
import WhatsAppDriveBotModule from "./components/WhatsAppDriveBotModule";
import AccountingModule, { INITIAL_INVOICES } from "./components/AccountingModule";
import { parseSpreadsheetAccounting, parseFrenchDate } from "./utils/accountingParser";
import { analyzeAllMaintenanceAndExpenses, sanitizeSpreadsheetDate } from "./utils/maintenanceAnalyzer";
import { DEFAULT_FUEL_ADVANCES, extractFuelAdvancesFromTransactions } from "./utils/fuelAdvanceTracker";
import { normalizeTripCorridorFields } from "./utils/fuelBreakdownDiagnostic";
import { INITIAL_TRIPS } from "./utils/tripsInitialData";
import { TRANSLATIONS, translateCategory, translateComment } from "./utils/i18n";
import {
  INITIAL_OIL_CHANGES,
  syncOilChangesFromData,
  detectOilChangeFromComment,
  getTruckOdometerAtDate,
} from "./utils/oilChangeDetector";
export { INITIAL_OIL_CHANGES };

const APP_STORAGE_KEYS = {
  auth: "sdv_auth_session_v1",
  trips: "sdv_manual_trips_v3",
  invoices: "sdv_invoices_v1",
  closings: "sdv_closings_v1",
  categories: "sdv_categories_v1",
  audit: "sdv_audit_logs_v1",
  inbox: "sdv_documents_inbox_v1",
  drivers: "sdv_cms_drivers_v1",
  vehicles: "sdv_cms_vehicles_v1",
  destinations: "sdv_cms_destinations_v1",
  rules: "sdv_cms_rules_v1",
  ui: "sdv_cms_ui_v2",
  pending_ai_tickets: "sdv_pending_ai_tickets_v1",
  maintenance: "sdv_maintenance_v1",
  oil_changes: "sdv_oil_changes_v1",
  accounting_transactions: "sdv_accounting_transactions_v4",
  fuel_advances: "sdv_fuel_advances_v3",
  language: "sdv_language_pref_v1"
};

const DEFAULT_DRIVERS = [
  { id: "drv-amara", sdv: "TRUCK 76", name: "AMARA", status: "active", vehicle: "AA-672-PS-09" },
  { id: "drv-brahima", sdv: "TRUCK 45", name: "BRAHIMA", status: "active", vehicle: "BB-221-TR-07" },
  { id: "drv-soro", sdv: "TRUCK 52", name: "SORO", status: "active", vehicle: "CC-478-KL-01" },
];

const DEFAULT_UI_CONFIG = {
  widgets: [],
  menu: [
    { id: "dashboard", label: "Tableau de Bord", enabled: true },
    { id: "flotte", label: "Flotte", enabled: true },
    { id: "finances", label: "Finances", enabled: true },
    { id: "whatsapp_bot", label: "Bot WhatsApp & Drive", enabled: true },
    { id: "data_entry", label: "Ajouter des données", enabled: true },
    { id: "maintenance", label: "Maintenance", enabled: true },
    { id: "reports_hub", label: "Rapports", enabled: true },
    { id: "settings", label: "Réglages", enabled: true },
  ],
};

function loadJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) || fallback;
  } catch (e) { return fallback; }
}

function saveJson(key, data) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
}

export default function App() {
  const [authUser, setAuthUser] = useState(() => loadJson(APP_STORAGE_KEYS.auth, null));
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingMaintenance, setIsSyncingMaintenance] = useState(false);
  const [isSyncingTickets, setIsSyncingTickets] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    try {
      const saved = localStorage.getItem("sdv_last_sync_time");
      return saved ? Number(saved) : Date.now();
    } catch {
      return Date.now();
    }
  });
  const [currency, setCurrency] = useState("CFA");
  const [language, setLanguage] = useState(() => loadJson(APP_STORAGE_KEYS.language, "FR"));

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.language, language);
  }, [language]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.FR;

  const [drivers, setDrivers] = useState(() => loadJson(APP_STORAGE_KEYS.drivers, DEFAULT_DRIVERS));
  const [vehicles, setVehicles] = useState(() => loadJson(APP_STORAGE_KEYS.vehicles, []));
  const [destinationsList, setDestinationsList] = useState(() => loadJson(APP_STORAGE_KEYS.destinations, []));
  const [businessRules, setBusinessRules] = useState(() => loadJson(APP_STORAGE_KEYS.rules, {}));
  const [uiConfig, setUiConfig] = useState(() => {
    const loaded = loadJson(APP_STORAGE_KEYS.ui, DEFAULT_UI_CONFIG);
    if (!loaded || !loaded.menu) return DEFAULT_UI_CONFIG;
    const existing = new Set(loaded.menu.map(m => m.id));
    const missing = DEFAULT_UI_CONFIG.menu.filter(d => !existing.has(d.id));
    if (missing.length > 0) {
      return { ...loaded, menu: [...loaded.menu, ...missing] };
    }
    return loaded;
  });
  const [manualTrips, setManualTrips] = useState(() => {
    const loaded = loadJson(APP_STORAGE_KEYS.trips, null);
    if (loaded && Array.isArray(loaded) && loaded.length > 0) {
      return loaded.map(r => normalizeTripCorridorFields(r));
    }
    const legacyV2 = loadJson("sdv_manual_trips_v2", null);
    if (legacyV2 && Array.isArray(legacyV2) && legacyV2.length > 0) {
      const manualOnly = legacyV2.filter(
        t =>
          t?.tripType !== "Google Sheets" &&
          !String(t?.id || "").startsWith("gs-") &&
          !String(t?.comments || "").includes("Synchronisé")
      );
      return [...manualOnly, ...INITIAL_TRIPS].map(r => normalizeTripCorridorFields(r));
    }
    return INITIAL_TRIPS.map(r => normalizeTripCorridorFields(r));
  });
  const [maintenanceRecords, setMaintenanceRecords] = useState(() => {
    const loaded = loadJson(APP_STORAGE_KEYS.maintenance, []);
    return (loaded || [])
      .filter(r => !isSalaryRecord(r))
      .map(r => ({ ...r, date: sanitizeSpreadsheetDate(r.date) }));
  });
  const [oilChanges, setOilChanges] = useState(() => {
    const saved = loadJson(APP_STORAGE_KEYS.oil_changes, {});
    const loadedTrips = loadJson(APP_STORAGE_KEYS.trips, null);
    const tripsForSync = (loadedTrips && Array.isArray(loadedTrips) && loadedTrips.length > 0) ? loadedTrips : INITIAL_TRIPS;
    const loadedAcct = loadJson(APP_STORAGE_KEYS.accounting_transactions, []);
    return syncOilChangesFromData(tripsForSync, loadedAcct, saved);
  });
  const [pendingTickets, setPendingTickets] = useState(() => loadJson(APP_STORAGE_KEYS.pending_ai_tickets, []));
  const [auditLogs, setAuditLogs] = useState(() => loadJson(APP_STORAGE_KEYS.audit, []));
  const [categories, setCategories] = useState(() => loadJson(APP_STORAGE_KEYS.categories, { 
    expense: ["Carburant", "Péage", "Police", "Repas", "Maintenance", "Salaires & Rémunérations"], 
    income: ["Recette trajet"] 
  }));
  const [expenseRecords, setExpenseRecords] = useState(() => {
    const loadedExpenses = (loadFinanceRecords("expenses") || []).map(r => ({
      ...r,
      date: sanitizeSpreadsheetDate(r.date)
    }));
    const loadedMaint = loadJson(APP_STORAGE_KEYS.maintenance, []) || [];
    const salariesFromMaint = loadedMaint.filter(isSalaryRecord).map(r => ({
      ...r,
      date: sanitizeSpreadsheetDate(r.date),
      category: "Salaires & Rémunérations",
      subCategory: "Salaires & Rémunérations",
      driverLabel: r.vehicle || r.driverLabel || "FLOTTE",
      type: "out"
    }));

    if (salariesFromMaint.length > 0) {
      const existingIds = new Set(loadedExpenses.map(e => e.id));
      const toAdd = salariesFromMaint.filter(s => !existingIds.has(s.id));
      return [...loadedExpenses, ...toAdd];
    }
    return loadedExpenses;
  });
  const [incomeRecords, setIncomeRecords] = useState(() => loadFinanceRecords("incomes"));
  const [dailyClosings, setDailyClosings] = useState(() => loadJson(APP_STORAGE_KEYS.closings, []));
  const [invoices, setInvoices] = useState(() => loadJson(APP_STORAGE_KEYS.invoices, INITIAL_INVOICES));
  const [accountingTransactions, setAccountingTransactions] = useState(() => loadJson(APP_STORAGE_KEYS.accounting_transactions, []));
  
  useEffect(() => {
    if (accountingTransactions.length === 0) {
      import("./utils/accountingInitialData").then(mod => {
        setAccountingTransactions(mod.INITIAL_ACCOUNTING_TRANSACTIONS);
      });
    }
  }, []);

  // Synchronisation dynamique certifiée des vidanges moteurs lors de mises à jour comptables ou trajets
  useEffect(() => {
    setOilChanges(prev => {
      const synced = syncOilChangesFromData(manualTrips, accountingTransactions, prev);
      if (JSON.stringify(synced) !== JSON.stringify(prev)) {
        return synced;
      }
      return prev;
    });
  }, [accountingTransactions, manualTrips]);

  const [fuelAdvances, setFuelAdvances] = useState(() => {
    const loaded = loadJson(APP_STORAGE_KEYS.fuel_advances, null);
    if (loaded && Array.isArray(loaded) && loaded.length > 0) return loaded;
    return DEFAULT_FUEL_ADVANCES;
  });

  // Synchronisation et assainissement automatique des Maintenances & Dépenses depuis les écritures Spreadsheet certifiées
  useEffect(() => {
    if (!accountingTransactions || accountingTransactions.length === 0) return;

    const isGsRecord = (r) => {
      if (!r) return false;
      return (
        r.source === "Google Sheets" ||
        String(r.id || "").startsWith("gs-") ||
        String(r.id || "").startsWith("tx-") ||
        r.subCategory === "Sync Spreadsheet" ||
        String(r.description || "").includes("(Spreedsheet)")
      );
    };

    const analyzed = analyzeAllMaintenanceAndExpenses(accountingTransactions, [], language);
    const gsMaint = analyzed
      .filter(item => item.domain === "maintenance")
      .map(item => ({
        id: item.id,
        date: item.date,
        vehicle: item.vehicle,
        driverLabel: item.vehicle,
        truckKey: item.truckKey,
        description: item.title,
        rawComment: item.rawComment,
        quantityNote: item.quantityNote,
        baseCost: item.baseCost,
        mountingCost: item.mountingCost,
        deliveryCost: item.deliveryCost,
        cost: item.totalCost,
        amount: item.totalCost,
        totalCost: item.totalCost,
        subType: item.subType,
        subTypeLabel: item.subTypeLabel,
        repairType: item.subTypeLabel,
        driveLink: item.driveLink,
        source: "Google Sheets",
        status: "Completed"
      }));

    const gsExpenses = analyzed
      .filter(item => item.domain === "expense")
      .map(item => ({
        id: item.id,
        date: item.date,
        driverLabel: item.vehicle,
        vehicle: item.vehicle,
        truckKey: item.truckKey,
        description: item.title,
        rawComment: item.rawComment,
        quantityNote: item.quantityNote,
        baseCost: item.baseCost,
        mountingCost: item.mountingCost,
        deliveryCost: item.deliveryCost,
        amount: item.totalCost,
        cost: item.totalCost,
        totalCost: item.totalCost,
        category: item.subType === "salaires" ? "Salaires & Rémunérations" : item.subTypeLabel,
        subCategory: item.subTypeLabel,
        subType: item.subType,
        subTypeLabel: item.subTypeLabel,
        driveLink: item.driveLink,
        source: "Google Sheets",
        type: "out"
      }));

    setMaintenanceRecords(prev => {
      const manualOnly = (prev || [])
        .filter(r => !isGsRecord(r) && !isSalaryRecord(r))
        .map(r => ({ ...r, date: sanitizeSpreadsheetDate(r.date) }));
      return [...manualOnly, ...gsMaint];
    });

    setExpenseRecords(prev => {
      const manualOnly = (prev || [])
        .filter(r => !isGsRecord(r))
        .map(r => ({ ...r, date: sanitizeSpreadsheetDate(r.date) }));
      return [...manualOnly, ...gsExpenses];
    });
  }, [accountingTransactions, language]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.invoices, invoices);
  }, [invoices]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.accounting_transactions, accountingTransactions);
  }, [accountingTransactions]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.fuel_advances, fuelAdvances);
  }, [fuelAdvances]);

  useEffect(() => {
    saveFinanceRecords("expenses", expenseRecords);
  }, [expenseRecords]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.maintenance, maintenanceRecords);
  }, [maintenanceRecords]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.oil_changes, oilChanges);
  }, [oilChanges]);

  const syncMaintenanceAndExpenses = async () => {
    setIsSyncingMaintenance(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        callback: async (tr) => {
          if (tr.access_token) {
            const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
            const range = "'Spreedsheet'!A2:Z";
            const fields = "sheets(data(rowData(values(formattedValue,hyperlink))))";
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?ranges=${encodeURIComponent(range)}&fields=${fields}`;
            
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${tr.access_token}` } });
            const data = await res.json();
            const rawRows = data?.sheets?.[0]?.data?.[0]?.rowData || [];
            const counts = processMaintenanceData(rawRows);
            const acctCount = processAccountingSpreadsheet(rawRows);
            
            alert(`SYNC TERMINÉE : ${counts.maintenance} Maintenances, ${counts.expenses} Dépenses et ${acctCount} Écritures Comptables récupérées.`);
            setIsSyncingMaintenance(false);
          }
        },
        error_callback: () => setIsSyncingMaintenance(false)
      });
      client.requestAccessToken();
    } catch (e) {
      console.error(e);
      setIsSyncingMaintenance(false);
    }
  };

  // LOGIQUE TRANSPORT
  const trips = useMemo(() => [
    ...manualTrips
  ], [manualTrips]);
  const [chauffeur, setChauffeur] = useState(ALL_CHAUFFEURS);
  const [month, setMonth] = useState([ALL_MONTHS]);
  const [year, setYear] = useState([ALL_YEARS]);
  const [destination, setDestination] = useState(ALL_DESTINATIONS);
  const [selectedDates, setSelectedDates] = useState([]); // Nouveau: Liste de jours précis

  const chauffeurOptions = useMemo(() => [ALL_CHAUFFEURS, ...drivers.map(d => `${d.name} ${d.sdv}`)], [drivers]);
  const monthOptions = useMemo(() => getMonthOptions(trips), [trips]);
  const yearOptions = useMemo(() => getYearOptions(trips), [trips]);
  const destinationOptions = [ALL_DESTINATIONS, ...destinationsList];

  const filteredData = useMemo(() => {
    return trips.filter(t => {
      const chauffeurVal = String(chauffeur || "").trim();
      const cMatch = chauffeurVal === ALL_CHAUFFEURS || String(t.driverLabel || "").trim() === chauffeurVal;
      
      // Multi-Mois
      const mMatch = month.includes(ALL_MONTHS) || month.length === 0 || month.includes(String(t.month));
      
      // Multi-Années
      const yMatch = year.includes(ALL_YEARS) || year.length === 0 || year.includes(String(t.year));
      
      // Multi-Jours (si des jours précis sont sélectionnés, ils priment)
      const dMatch = destination === ALL_DESTINATIONS || t.destination === destination;
      const dateMatch = selectedDates.length === 0 || selectedDates.includes(t.date);

      return cMatch && mMatch && yMatch && dMatch && dateMatch;
    });
  }, [trips, chauffeur, month, year, destination, selectedDates]);

  const calendarData = useMemo(() => {
    return trips.filter(t => {
      const chauffeurVal = String(chauffeur || "").trim();
      const cMatch = chauffeurVal === ALL_CHAUFFEURS || String(t.driverLabel || "").trim() === chauffeurVal;
      const yMatch = year.includes(ALL_YEARS) || year.length === 0 || year.includes(String(t.year));
      return cMatch && yMatch;
    });
  }, [trips, chauffeur, year]);

  const iconMap = {
    dashboard: LayoutDashboard, flotte: Truck, finances: Banknote, whatsapp_bot: MessageSquare, data_entry: PlusCircle,
    maintenance: Settings2, reports_hub: Database, settings: Settings
  };

  const isEn = language === "EN";
  const menuLabels = {
    dashboard: t.dashboard || (isEn ? "Dashboard" : "Tableau de Bord"),
    flotte: isEn ? "Fleet" : "Flotte",
    finances: isEn ? "Finances" : "Finances",
    whatsapp_bot: isEn ? "WhatsApp & Drive Bot" : "Bot WhatsApp & Drive",
    data_entry: isEn ? "Data Entry" : "Ajouter des données",
    maintenance: t.maintenance || (isEn ? "Maintenance" : "Maintenance"),
    reports_hub: t.reports || (isEn ? "Reports" : "Rapports"),
    settings: t.settings || (isEn ? "Settings" : "Réglages")
  };

  const filteredMenu = useMemo(() => {
    const rawMenu = uiConfig?.menu?.length > 0 ? uiConfig.menu : DEFAULT_UI_CONFIG.menu;
    const existing = new Set(rawMenu.map(i => i.id));
    const missing = DEFAULT_UI_CONFIG.menu.filter(d => !existing.has(d.id));
    const base = [...rawMenu, ...missing];

    return base
      .filter(item => {
        if (item.enabled === false) return false;
        if (authUser?.role === "viewer") return ["dashboard", "reports_hub", "finances"].includes(item.id);
        return true;
      })
      .map(item => ({
        ...item,
        label: menuLabels[item.id] || item.label
      }));
  }, [uiConfig, authUser, menuLabels]);

  useEffect(() => { saveJson(APP_STORAGE_KEYS.trips, manualTrips); }, [manualTrips]);
  useEffect(() => { saveJson(APP_STORAGE_KEYS.pending_ai_tickets, pendingTickets); }, [pendingTickets]);
  useEffect(() => { saveJson(APP_STORAGE_KEYS.audit, auditLogs); }, [auditLogs]);
  useEffect(() => { saveJson(APP_STORAGE_KEYS.closings, dailyClosings); }, [dailyClosings]);
  const processTripsData = (valueRanges) => {
    if (!valueRanges) return;
    const driverKeys = [{ c: "AMARA", s: "TRUCK 76" }, { c: "BRAHIMA", s: "TRUCK 45" }, { c: "SORO", s: "TRUCK 52" }];
    let imported = [];

    valueRanges.forEach((vr, i) => {
      const startsAtA2 = String(vr?.range || "").includes("!A2");
      (vr.values || []).forEach((row, rowIdx) => {
        let isoDate = "";
        if (row[0]) {
          const cleanDate = String(row[0]).replace(/^[a-zA-Zéû]+\s+/i, "").toLowerCase().trim();
          if (cleanDate.includes("/") || cleanDate.includes("-")) {
            const parts = cleanDate.split(/[\/\-]/);
            if (parts.length === 3) {
              let [d, m, y] = parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
              if (y.length === 2) y = "20" + y;
              const dd = d.padStart(2, '0');
              const mm = m.padStart(2, '0');
              const candidate = `${y}-${mm}-${dd}`;
              if (/^\d{4}-\d{2}-\d{2}$/.test(candidate) && Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
                isoDate = candidate;
              }
            }
          } else {
            const monthsFr = ["janv", "févr", "mars", "avril", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
            const parts = cleanDate.split(/\s+/);
            if (parts.length >= 2) {
              const d = parts[0].padStart(2, '0');
              let m = "";
              const monthStr = parts[1];
              monthsFr.forEach((name, idx) => {
                if (monthStr.startsWith(name) || monthStr.startsWith(name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
                  m = String(idx + 1).padStart(2, '0');
                }
              });
              if (m) {
                let y = parts[2] || "2026";
                if (y.length === 2) y = "20" + y;
                const candidate = `${y}-${m}-${d}`;
                if (/^\d{4}-\d{2}-\d{2}$/.test(candidate) && Number(d) >= 1 && Number(d) <= 31) {
                  isoDate = candidate;
                }
              }
            }
          }
        }

        if (!isoDate) return;

        const parseNum = (v) => {
           if (!v) return 0;
           let s = String(v).replace(/\s/g, "");
           if (s.includes(".") && !s.includes(",")) { if (s.split(".").pop().length === 3 || s.length > 5) s = s.replace(/\./g, ""); }
           return parseFloat(s.replace(/,/g, ".").replace(/[^0-9.-]/g, "")) || 0;
        };

        const chauffeur = driverKeys[i].c;
        const sheetRow = startsAtA2 ? rowIdx + 2 : rowIdx + 1;
        let fuel = 0, roadSubTotal = 0, totalExpense = 0, km = 0, tonnage = 0, totalGross = 0;
        let start = String(row[1] || "").trim();
        let destination = String(row[2] || "").trim();

        if (isoDate >= "2026-02-01") {
          fuel = parseNum(row[3]);
          const tolls = parseNum(row[4]);
          const police = parseNum(row[5]);
          const food = parseNum(row[6]);
          const bonus = parseNum(row[7]);
          roadSubTotal = parseNum(row[8]) || (tolls + police + food + bonus);
          totalExpense = parseNum(row[9]) || (fuel + roadSubTotal);
          tonnage = parseNum(row[10]);
          totalGross = parseNum(row[11]);
        } else if (isoDate >= "2026-01-01") {
          if (chauffeur === "AMARA") {
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[5]);
            tonnage = parseNum(row[6]); totalGross = parseNum(row[7]);
          } else if (chauffeur === "BRAHIMA") {
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[6]);
            tonnage = parseNum(row[7]); totalGross = parseNum(row[8]);
          } else { // SORO
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[8]);
            tonnage = parseNum(row[9]); totalGross = parseNum(row[10]);
          }
        } else {
          if (chauffeur === "AMARA") {
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[5]);
            tonnage = parseNum(row[6]); totalGross = parseNum(row[7]);
          } else if (chauffeur === "BRAHIMA") {
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[6]);
            tonnage = parseNum(row[7]); totalGross = parseNum(row[8]);
          } else { // SORO
            fuel = parseNum(row[3]); roadSubTotal = parseNum(row[4]); totalExpense = parseNum(row[5]);
            tonnage = parseNum(row[6]); totalGross = parseNum(row[7]);
          }
        }

        // Ignorer les lignes calendaires vides sans aucune activité financière ni tonnage
        if (fuel <= 0 && tonnage <= 0 && totalExpense <= 0 && totalGross <= 0) return;

        // Extraction intelligente et fiable du Kilométrage (KM)
        let rawKm = 0;
        // 1. Chercher explicitement dans les cellules contenant "km"
        for (let colIdx = 1; colIdx < row.length; colIdx++) {
          const val = String(row[colIdx] || "").trim();
          if (/cfa|\$|total|distance/i.test(val)) continue;
          if (/km/i.test(val)) {
            const digits = val.replace(/[^0-9]/g, "");
            const parsed = parseInt(digits, 10);
            if (parsed >= 1000) {
              rawKm = parsed;
              break;
            }
          }
        }

        // 2. Si pas trouvé par "km", tester colonnes 13, 14, 12, 11 sans confusion financière
        if (!rawKm) {
          for (const cIdx of [13, 14, 12, 11, 10, 9]) {
            const cellVal = String(row[cIdx] || "").trim();
            if (!cellVal || /cfa|\$/i.test(cellVal)) continue;
            const digits = cellVal.replace(/[^0-9]/g, "");
            const parsed = parseInt(digits, 10);
            if (parsed >= 20000 && parsed <= 150000) {
              rawKm = parsed;
              break;
            }
          }
        }

        // 3. Correction des erreurs et coquilles humaines documentées du Spreadsheet
        if (rawKm > 200000) rawKm = 0; // Outlier excessif ignoré
        else if (rawKm < 1000) rawKm = 0; // Distance de trajet isolée ignorée

        km = rawKm;

        imported.push(normalizeTripCorridorFields({
          id: `gs-${chauffeur}-${isoDate}-r${sheetRow}`,
          sheetRow,
          date: isoDate, chauffeur, driverLabel: `${chauffeur} ${driverKeys[i].s}`, sdv: driverKeys[i].s,
          start, destination, fuel_cost_cfa: fuel, road_fees_cfa: roadSubTotal, total_expense_cfa: totalExpense,
          tonnage, total_gross_cfa: totalGross, total_net_cfa: totalGross - totalExpense,
          km, tripType: "Google Sheets", comments: `Synchronisé (${isoDate < "2026-01-01" ? '2025' : (isoDate < "2026-02-01" ? 'Jan 2026' : 'Standard')})`,
          month: parseInt(isoDate.slice(5, 7), 10), year: parseInt(isoDate.slice(0, 4), 10)
        }));
      });
    });

    setManualTrips(prev => {
      const isGoogleSheetsTrip = (t) => 
        t?.tripType === "Google Sheets" || 
        String(t?.id || "").startsWith("gs-") || 
        String(t?.comments || "").includes("Synchronisé");

      // 1. Conserver uniquement les saisies manuelles ou tickets IA locaux
      const manualOnly = (prev || []).filter(t => !isGoogleSheetsTrip(t));

      // 2. Dédupliquer les saisies manuelles locales si le trajet existe désormais dans le spreadsheet
      const newImportKeys = new Set(imported.map(t => `${t.date}-${t.chauffeur}`));
      const preservedManual = manualOnly.filter(t => !newImportKeys.has(`${t.date}-${t.chauffeur}`));

      // 3. Remplacer tous les trajets Google Sheets par l'état exact et actuel du Spreadsheet (les suppressions sont ainsi appliquées)
      const merged = [...preservedManual, ...imported];
      if (typeof window !== "undefined") window.__sdvLatestTrips = merged;
      return merged;
    });
    return imported.length;
  };

  const processMaintenanceData = (rowData) => {
    if (!rowData) return { maintenance: 0, expenses: 0 };

    const currentTrips = (typeof window !== "undefined" && window.__sdvLatestTrips) || manualTrips;
    const { transactions: parsedTx } = parseSpreadsheetAccounting(rowData, currentTrips);
    const analyzed = analyzeAllMaintenanceAndExpenses(parsedTx, [], language);

    const maintenanceList = analyzed
      .filter(item => item.domain === "maintenance")
      .map(item => ({
        id: item.id,
        date: item.date,
        vehicle: item.vehicle,
        driverLabel: item.vehicle,
        truckKey: item.truckKey,
        description: item.title,
        rawComment: item.rawComment,
        quantityNote: item.quantityNote,
        baseCost: item.baseCost,
        mountingCost: item.mountingCost,
        deliveryCost: item.deliveryCost,
        cost: item.totalCost,
        amount: item.totalCost,
        totalCost: item.totalCost,
        subType: item.subType,
        subTypeLabel: item.subTypeLabel,
        repairType: item.subTypeLabel,
        driveLink: item.driveLink,
        source: "Google Sheets",
        status: "Completed"
      }));

    const expensesList = analyzed
      .filter(item => item.domain === "expense")
      .map(item => ({
        id: item.id,
        date: item.date,
        driverLabel: item.vehicle,
        vehicle: item.vehicle,
        truckKey: item.truckKey,
        description: item.title,
        rawComment: item.rawComment,
        quantityNote: item.quantityNote,
        baseCost: item.baseCost,
        mountingCost: item.mountingCost,
        deliveryCost: item.deliveryCost,
        amount: item.totalCost,
        cost: item.totalCost,
        totalCost: item.totalCost,
        category: item.subType === "salaires" ? "Salaires & Rémunérations" : item.subTypeLabel,
        subCategory: item.subTypeLabel,
        subType: item.subType,
        subTypeLabel: item.subTypeLabel,
        driveLink: item.driveLink,
        source: "Google Sheets",
        type: "out"
      }));

    // Détection automatique de vidange dans les commentaires Spreedsheet avec l'année exacte
    let lastSeenDate = "2025-06-27";
    let lastSeenYear = "2025";
    rowData.forEach((row) => {
      const values = row.values || [];
      if (values.length === 0) return;
      const rowTexts = values.map(v => v?.formattedValue ? String(v.formattedValue) : "");
      const fullRowContent = rowTexts.join(" ").toLowerCase();
      const dateRaw = rowTexts[0] || "";
      if (dateRaw) {
        const parsed = parseFrenchDate(dateRaw, lastSeenYear);
        if (parsed) {
          lastSeenDate = sanitizeSpreadsheetDate(parsed);
          lastSeenYear = lastSeenDate.slice(0, 4);
        }
      }
      const isoDate = lastSeenDate;
      const commentM = rowTexts[12] || "";
      const commentN = rowTexts[13] || "";
      const bestComment = `${commentM} ${commentN}`.trim();

      const oilDetection = detectOilChangeFromComment(fullRowContent);
      if (oilDetection.isOilChange && oilDetection.trucks.length > 0) {
        const truckMeta = [
          { key: "AMARA TRUCK 76", name: "AMARA", num: "76", fallback: 125325 },
          { key: "BRAHIMA TRUCK 45", name: "BRAHIMA", num: "45", fallback: 120334 },
          { key: "SORO TRUCK 52", name: "SORO", num: "52", fallback: 114795 },
        ];
        const currentTrips = (typeof window !== "undefined" && window.__sdvLatestTrips) || manualTrips;
        setOilChanges(prev => {
          const updated = { ...prev };
          oilDetection.trucks.forEach(tName => {
            const meta = truckMeta.find(m => m.name === tName);
            if (!meta) return;
            const odom = getTruckOdometerAtDate(currentTrips, meta.name, meta.num, isoDate, meta.fallback);
            updated[meta.key] = {
              mileage: odom,
              date: isoDate,
              comment: bestComment || `Vidange effectuée le ${isoDate}`,
              interval: 10000,
              autoDetected: true,
            };
          });
          return updated;
        });
      }
    });

    const isSpreadsheetRecord = (r) => {
      if (!r) return false;
      return (
        r.source === "Google Sheets" ||
        String(r.id || "").startsWith("gs-") ||
        String(r.id || "").startsWith("tx-") ||
        r.subCategory === "Sync Spreadsheet" ||
        String(r.description || "").includes("(Spreedsheet)")
      );
    };

    setMaintenanceRecords(prev => [
      ...(prev || [])
        .filter(r => !isSpreadsheetRecord(r) && !isSalaryRecord(r))
        .map(r => ({ ...r, date: sanitizeSpreadsheetDate(r.date) })),
      ...maintenanceList
    ]);
    setExpenseRecords(prev => [
      ...(prev || [])
        .filter(r => !isSpreadsheetRecord(r))
        .map(r => ({ ...r, date: sanitizeSpreadsheetDate(r.date) })),
      ...expensesList
    ]);
    return { maintenance: maintenanceList.length, expenses: expensesList.length };
  };

  const processAccountingSpreadsheet = (rowData) => {
    if (!rowData) return 0;
    try {
      const currentTrips = (typeof window !== "undefined" && window.__sdvLatestTrips) || manualTrips;
      const { transactions: parsedTx } = parseSpreadsheetAccounting(rowData, currentTrips);
      if (parsedTx) {
        setAccountingTransactions(prev => {
          const waOrManual = (prev || []).filter(
            t => String(t?.id || "").startsWith("tx-wa-") || String(t?.id || "").startsWith("tx-manual-")
          );
          return [...waOrManual, ...parsedTx];
        });
        // Extraction et mise à jour des avances carburant détectées depuis le spreadsheet
        const detectedAdvances = extractFuelAdvancesFromTransactions(parsedTx);
        const isSpreadsheetAdvance = (a) => a?.source === "spreadsheet" || String(a?.id || "").startsWith("adv-auto-");

        setFuelAdvances(prev => {
          // Conserver uniquement les avances manuelles ajoutées localement
          const manualOnly = (prev || []).filter(a => !isSpreadsheetAdvance(a));
          return [...detectedAdvances, ...manualOnly];
        });
        return parsedTx.length;
      }
    } catch (err) {
      console.error("Error parsing accounting spreadsheet:", err);
    }
    return 0;
  };

  // Intégration des factures et images reçues via le Bot WhatsApp & Google Drive dans l'application
  const handleIntegrateWhatsAppItems = (waItems = []) => {
    if (!Array.isArray(waItems) || waItems.length === 0) return 0;

    const newInvoices = [];
    const newTxList = [];

    waItems.forEach((item) => {
      if (!item || !item.id) return;
      const isoDate = item.invoiceDate || item.addedDate || new Date().toISOString().slice(0, 10);
      const [yStr, mStr] = isoDate.split("-");
      const yearNum = parseInt(yStr, 10) || new Date().getFullYear();
      const monthNum = parseInt(mStr, 10) || new Date().getMonth() + 1;
      const effectiveLink = item.driveLink || item.localPreviewUrl || null;
      const amountVal = Number(item.amount) || 0;

      if (item.invoiceType === "FACTURE_CLIENT") {
        newInvoices.push({
          id: `inv-wa-${item.id}`,
          invoiceNumber: item.reference || `FAC-WA-${isoDate.replace(/-/g, "")}`,
          client: item.vendorOrClient || "Client Transport SDV",
          date: isoDate,
          dueDate: isoDate,
          period: `${monthNum.toString().padStart(2, "0")}/${yearNum}`,
          tonnage: Number(item.tonnage) || 0,
          ratePerTon: Number(item.unitPrice) || 15000,
          totalAmount: amountVal,
          paidAmount: 0,
          paymentMethod: "WhatsApp / Drive Sync",
          notes: `[WhatsApp ${item.addedDate}] ${item.description || item.fileName} (Dossier Drive: ${item.drivePath})`,
          driveLink: effectiveLink,
          createdAt: item.receivedAt || new Date().toISOString(),
        });
      }

      if (amountVal > 0 || item.invoiceType !== "FACTURE_CLIENT") {
        const isClient = item.invoiceType === "FACTURE_CLIENT";
        const isFuel = item.invoiceType === "CARBURANT";
        const isAbj = item.corridor === "ABIDJAN";
        newTxList.push({
          id: `tx-wa-${item.id}`,
          date: isoDate,
          rawDate: isoDate,
          type: isClient ? "in" : "out",
          category: item.accountingCategory || "Charges Générales & Divers",
          amount: amountVal,
          isCredit: isClient,
          comment: `[WhatsApp • ${item.invoiceTypeLabel}] ${item.description || item.fileName} (${item.truck || "FLOTTE"})`,
          commentColM: item.description || item.caption || item.fileName,
          commentColN: `Drive: ${item.drivePath}`,
          sanPedroFuel: isFuel && !isAbj ? amountVal : 0,
          abidjanFuel: isFuel && isAbj ? amountVal : 0,
          driveLink: effectiveLink,
          balance: 0,
          month: monthNum,
          year: yearNum,
        });
      }
    });

    if (newInvoices.length > 0) {
      setInvoices((prev) => {
        const existingIds = new Set((prev || []).map((i) => i.id));
        const toAdd = newInvoices.filter((i) => !existingIds.has(i.id));
        return [...toAdd, ...(prev || [])];
      });
    }

    if (newTxList.length > 0) {
      setAccountingTransactions((prev) => {
        const existingIds = new Set((prev || []).map((t) => t.id));
        const toAdd = newTxList.filter((t) => !existingIds.has(t.id));
        return [...toAdd, ...(prev || [])];
      });
    }

    return waItems.length;
  };

  const syncWhatsAppInboxSilently = async () => {
    try {
      const res = await fetch("/api/whatsapp/inbox");
      if (!res.ok) return 0;
      const data = await res.json();
      const unsynced = (data.items || []).filter((i) => !i.syncedToApp);
      if (unsynced.length > 0) {
        handleIntegrateWhatsAppItems(unsynced);
        await fetch("/api/whatsapp/mark-synced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unsynced.map((u) => u.id) }),
        }).catch(() => {});
        return unsynced.length;
      }
    } catch {}
    return 0;
  };

  // Fonction de synchronisation silencieuse (sans popup)
  const performSilentSync = async (showFeedback = false) => {
    if (isSyncing || isSyncingMaintenance) return false;
    setIsSyncing(true);
    setIsSyncingMaintenance(true);

    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    try {
      // 0. Synchroniser également les nouvelles factures déposées via le Bot WhatsApp & Drive
      const waSyncedCount = await syncWhatsAppInboxSilently();

      // 1. Tentative via le Backend (Service Account - Méthode la plus sûre)
      const backendRes = await fetch("/api/gsheets");
      if (backendRes.ok) {
        const data = await backendRes.json();
        const tripsCount = processTripsData(data.trips);
        const maintCount = processMaintenanceData(data.maintenance);
        const acctCount = processAccountingSpreadsheet(data.maintenance);
        console.log(`Auto-sync (Backend): ${tripsCount} trajets, ${maintCount.maintenance} maintenances, ${acctCount} écritures comptables, ${waSyncedCount} factures WhatsApp.`);
        const nowTs = Date.now();
        setLastSyncTime(nowTs);
        try { localStorage.setItem("sdv_last_sync_time", String(nowTs)); } catch(e) {}
        if (showFeedback) {
          alert(`Spreadsheet synchronisé avec succès : ${tripsCount} trajets et ${acctCount} écritures mis à jour !`);
        }
        setIsSyncing(false);
        setIsSyncingMaintenance(false);
        return true;
      }

      // 2. Fallback via API Key (Si le document est en "Tous les utilisateurs disposant du lien")
      if (apiKey) {
        console.log("Tentative de synchro via API Key...");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges='AMARA TRUCK 76'!A2:Z&ranges='BRAHIMA TRUCK 45'!A2:Z&ranges='SORO TRUCK 52'!A2:Z&ranges='Spreedsheet'!A2:Z&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // Conversion du format batchGet simple en format attendu par les helpers
          const tripsData = data.valueRanges.slice(0, 3);
          const maintenanceData = data.valueRanges[3]?.values?.map(row => ({ values: row.map(v => ({ formattedValue: v })) })) || [];
          
          const tripsCount = processTripsData(tripsData);
          processMaintenanceData(maintenanceData);
          const acctCount = processAccountingSpreadsheet(maintenanceData);
          console.log("Auto-sync (API Key) réussie.");
          const nowTs = Date.now();
          setLastSyncTime(nowTs);
          try { localStorage.setItem("sdv_last_sync_time", String(nowTs)); } catch(e) {}
          if (showFeedback) {
            alert(`Spreadsheet synchronisé avec succès : ${tripsCount} trajets et ${acctCount} écritures mis à jour !`);
          }
          setIsSyncing(false);
          setIsSyncingMaintenance(false);
          return true;
        }
      }

      console.warn("Silent sync failed. No backend response and API Key invalid or sheet private.");
    } catch (err) {
      console.error("Auto-sync error:", err);
    } finally {
      setIsSyncing(false);
      setIsSyncingMaintenance(false);
    }
    return false;
  };

  const handleRefreshSpreadsheet = async () => {
    const syncedSilently = await performSilentSync(true);
    if (!syncedSilently) {
      syncWithGoogleSheets();
    }
  };

  // 1. Auto-sync initial à la connexion
  useEffect(() => {
    if (authUser && !isSyncing && !isSyncingMaintenance) {
      performSilentSync();
    }
  }, [authUser]);

  // 2. Auto-sync périodique toutes les 30 minutes
  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      if (!isSyncing && !isSyncingMaintenance) {
        performSilentSync();
      }
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authUser, isSyncing, isSyncingMaintenance]);

  // 3. Auto-sync au retour sur l'onglet si plus de 10 minutes depuis la dernière synchronisation
  useEffect(() => {
    if (!authUser) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - (lastSyncTime || 0);
        if (elapsed > 10 * 60 * 1000 && !isSyncing && !isSyncingMaintenance) {
          performSilentSync();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [authUser, isSyncing, isSyncingMaintenance, lastSyncTime]);

  const handleLogout = () => { setAuthUser(null); localStorage.removeItem(APP_STORAGE_KEYS.auth); };

  const handleApproveAITicket = (ticketId, finalData) => {
    const dateObj = finalData.date ? new Date(finalData.date) : new Date();
    const gross = parseFloat(finalData.total_gross_cfa) || 0;
    const expense = parseFloat(finalData.total_expense_cfa) || 0;
    const tonnage = parseFloat(finalData.tonnage) || 0;
    const km = parseFloat(finalData.km) || 0;

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
      km: km
    };

    setManualTrips(prev => [...prev, newTrip]);
    setPendingTickets(prev => prev.filter(t => t.id !== ticketId));
    setAuditLogs(prev => [{ id: `log-${Date.now()}`, timestamp: new Date().toISOString(), type: "Validation IA", count: 1, batchId: 'ai-manual-validation' }, ...prev]);
  };

  const syncWithGoogleSheets = async () => {
    if (!window.google?.accounts?.oauth2) {
      alert("Le module de synchronisation Google n'est pas encore chargé.");
      return;
    }
    setIsSyncing(true);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        callback: async (tr) => {
          if (tr.access_token) {
            try {
              const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
              const res = await fetch(
                `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges='AMARA TRUCK 76'!A2:Z&ranges='BRAHIMA TRUCK 45'!A2:Z&ranges='SORO TRUCK 52'!A2:Z&ranges='Spreedsheet'!A2:Z`, 
                { headers: { 'Authorization': `Bearer ${tr.access_token}` } }
              );
              const data = await res.json();
              const tripsRanges = data.valueRanges ? data.valueRanges.slice(0, 3) : [];
              const count = processTripsData(tripsRanges);
              
              if (data.valueRanges && data.valueRanges[3]?.values) {
                const sheetRows = data.valueRanges[3].values.map(row => ({ values: row.map(v => ({ formattedValue: v })) }));
                processMaintenanceData(sheetRows);
                processAccountingSpreadsheet(sheetRows);
              }
              alert(`Synchronisation réussie : ${count} trajets et données financières synchronisés !`);
              setIsSyncing(false);
            } catch (err) {
              console.error(err);
              alert("Erreur lecture Google Sheets.");
              setIsSyncing(false);
            }
          }
        }
      });
      client.requestAccessToken();
    } catch (e) {
      console.error(e);
      setIsSyncing(false);
    }
  };

  const handlePurgeRange = (s, e, y) => {
    setManualTrips(prev => prev.filter(t => !(String(t.year) === String(y) && Number(t.month) >= s && Number(t.month) <= e)));
    alert("Période purgée.");
  };

  const onPurgeMaintenance = (targetYear, targetMonth, targetDay) => {
    if (!confirm(`Confirmer la suppression pour ${targetYear}-${targetMonth}-${targetDay} ?`)) return;
    
    setMaintenanceRecords(prev => prev.filter(m => {
      const [y, mStr, d] = m.date.split("-");
      const matchYear = String(y) === String(targetYear);
      const matchMonth = targetMonth === ALL_MONTHS || String(mStr) === String(targetMonth);
      const matchDay = targetDay === ALL_MONTHS || String(d) === String(targetDay);
      return !(matchYear && matchMonth && matchDay);
    }));
    
    setExpenseRecords(prev => prev.filter(e => {
      if (e.source !== "Google Sheets") return true;
      const [y, mStr, d] = e.date.split("-");
      const matchYear = String(y) === String(targetYear);
      const matchMonth = targetMonth === ALL_MONTHS || String(mStr) === String(targetMonth);
      const matchDay = targetDay === ALL_MONTHS || String(d) === String(targetDay);
      return !(matchYear && matchMonth && matchDay);
    }));
    alert("Maintenance purgée.");
  };

  if (!authUser) return <LoginScreen onLogin={(u) => { setAuthUser(u); saveJson(APP_STORAGE_KEYS.auth, u); }} />;
  const rolePermissions = getRolePermissions(authUser.role);

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#cf5d56]/30">
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#111] border-r border-white/5 transform transition-transform lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#cf5d56] flex items-center justify-center shadow-lg"><Truck className="size-5 text-white" /></div>
            <div><h1 className="text-lg font-black italic">SDV <span className="text-[#cf5d56] not-italic">LOGS</span></h1><p className="text-[9px] uppercase tracking-widest text-white/20 font-bold">{t.fleet}</p></div>
          </div>
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto text-white">
            {filteredMenu.map((item) => {
              const Icon = iconMap[item.id] || Grid2X2;
              return (
                <button key={item.id} onClick={() => { setActiveSection(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSection === item.id ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" : "text-white/40 hover:bg-white/5 hover:text-white"}`}>
                  <div className="flex items-center gap-3"><Icon className="size-4" />{item.label}</div><ChevronRight className="size-3 opacity-30" />
                </button>
              );
            })}
          </nav>
          <div className="p-4 mt-auto border-t border-white/5 bg-black/20 text-white">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5">
              <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center text-[#cf5d56] text-[10px] font-black">{authUser.username?.slice(0,2).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="text-[10px] font-black truncate uppercase">{authUser.username}</p></div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded-lg text-white/20"><LogOut className="size-3.5" /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col lg:pl-60 min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl bg-white/5 text-white"><Menu className="size-5" /></button>
          
          <div className="flex items-center gap-2.5 text-white">
           <div className="flex items-center gap-3">
            {/* SÉLECTEUR DE LANGUE */}
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setLanguage("FR")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${language === "FR" ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" : "text-white/40 hover:text-white/60"}`}
              >
                FR
              </button>
              <button 
                onClick={() => setLanguage("EN")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${language === "EN" ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" : "text-white/40 hover:text-white/60"}`}
              >
                EN
              </button>
            </div>

            {/* SÉLECTEUR DE DEVISE */}
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setCurrency("CFA")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${currency === "CFA" ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" : "text-white/40 hover:text-white/60"}`}
              >
                CFA
              </button>
              <button 
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${currency === "USD" ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" : "text-white/40 hover:text-white/60"}`}
              >
                USD
              </button>
            </div>

            <button onClick={syncWithGoogleSheets} disabled={isSyncing} className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-[#cf5d56]/10 hover:bg-[#cf5d56]/20 text-[#cf5d56] rounded-xl border border-[#cf5d56]/20 font-black text-[10px] uppercase tracking-widest transition-all">{isSyncing ? <Activity className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}{t.syncSheets}</button>
             
          </div>
        </div>
      </header>

        <div className="p-4 md:p-6 flex-1 overflow-x-hidden">
          <Suspense fallback={<div className="flex justify-center items-center h-full"><Activity className="animate-spin text-white/40 size-8" /></div>}>
          <ErrorBoundary resetKey={activeSection}>
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              
              {activeSection === "flotte" && (
                <FlotteHub 
                  tripsProps={{
                    trips: filteredData || trips,
                    drivers, expenses: expenseRecords, incomes: incomeRecords,
                    chauffeurs: chauffeurOptions, formatCurrency, formatTonnage,
                    canWrite: rolePermissions.canEdit,
                    onAddTrip: (t) => setManualTrips([...manualTrips, t]),
                    t, language
                  }}
                  driversProps={{
                    drivers, setDrivers: rolePermissions.canEdit ? setDrivers : null,
                    trips: filteredData || trips, expenses: expenseRecords, incomes: incomeRecords,
                    formatCurrency, t, language
                  }}
                  t={t} language={language}
                />
              )}
              {activeSection === "finances" && (
                <FinanceHub 
                  accountingProps={{
                    transactions: accountingTransactions, setTransactions: rolePermissions.canEdit ? setAccountingTransactions : null,
                    invoices, setInvoices: rolePermissions.canEdit ? setInvoices : null,
                    onSync: syncMaintenanceAndExpenses, isSyncing: isSyncingMaintenance,
                    formatCurrency, formatTonnage, canWrite: rolePermissions.canEdit,
                    t, language, fuelAdvances, setFuelAdvances: rolePermissions.canEdit ? setFuelAdvances : null,
                    allRecords: manualTrips
                  }}
                  expenseProps={{
                    expenses: expenseRecords, setExpenses: rolePermissions.canEdit ? setExpenseRecords : null,
                    maintenanceRecords: maintenanceRecords, trips: filteredData || trips,
                    drivers, formatCurrency, formatTonnage, canWrite: rolePermissions.canEdit, t, language
                  }}
                  incomeProps={{
                    type: "income", records: incomeRecords, setRecords: rolePermissions.canEdit ? setIncomeRecords : null,
                    categories, setCategories: rolePermissions.canEdit ? setCategories : null,
                    expenseRecords, incomeRecords, trips: filteredData || trips, formatCurrency,
                    canWrite: rolePermissions.canEdit, t, language
                  }}
                  closingProps={{
                    closings: dailyClosings, setClosings: rolePermissions.canEdit ? setDailyClosings : null,
                    trips: filteredData || trips, drivers, expenses: expenseRecords, incomes: incomeRecords,
                    formatCurrency, canWrite: rolePermissions.canEdit,
                    onCloseDay: (closing) => setDailyClosings(prev => [closing, ...(prev || [])]),
                    t, language
                  }}
                  t={t} language={language}
                />
              )}
              {activeSection === "whatsapp_bot" && (
                <WhatsAppDriveBotModule
                  onIntegrateItems={rolePermissions.canEdit ? handleIntegrateWhatsAppItems : undefined}
                  googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                  language={language}
                />
              )}
              {activeSection === "data_entry" && (
                <DataEntryHub 
                  manualEntryProps={{
                    setTrips: rolePermissions.canEdit ? setManualTrips : null, t, language
                  }}
                  importProps={{
                    setTrips: rolePermissions.canEdit ? setManualTrips : null,
                    setAuditLogs: rolePermissions.canEdit ? setAuditLogs : null, t, language
                  }}
                  aiTicketProps={{
                    pendingTickets, setPendingTickets: rolePermissions.canEdit ? setPendingTickets : null,
                    onApprove: rolePermissions.canEdit ? handleApproveAITicket : null,
                    drivers, t, language
                  }}
                  whatsappBotProps={{
                    onIntegrateItems: rolePermissions.canEdit ? handleIntegrateWhatsAppItems : undefined,
                    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    language
                  }}
                  t={t} language={language}
                />
              )}
              {activeSection === "reports_hub" && (
                <ReportsHub 
                  reportsProps={{
                    records: trips, manualTrips, setRecords: rolePermissions.canEdit ? setManualTrips : null,
                    chauffeurs: chauffeurOptions, canDelete: rolePermissions.canDelete, canEdit: rolePermissions.canEdit,
                    t, language
                  }}
                  auditProps={{
                    logs: auditLogs, t, language
                  }}
                  t={t} language={language}
                />
              )}

              {activeSection === "dashboard" && (
               <Dashboard
                 drivers={drivers}
                 filteredData={filteredData} calendarData={calendarData} formatCurrency={formatCurrency} formatCompactNumber={formatCompactNumber}
                 onSelectDriver={setChauffeur} selectedChauffeur={chauffeur} allTrips={trips}
                 onDateSelect={(selection) => { 
                   if (!selection) {
                       setSelectedDates([]);
                       setMonth([ALL_MONTHS]);
                       return;
                   }
                   if (selection.dates) setSelectedDates(selection.dates);
                   if (selection.months) setMonth(selection.months);
                   if (selection.years) setYear(selection.years);
                 }}                 onReset={() => { setSelectedDates([]); setChauffeur(ALL_CHAUFFEURS); setMonth([ALL_MONTHS]); setYear([new Date().getFullYear().toString()]); }}
                 filterProps={{
                   chauffeurs: chauffeurOptions, chauffeur, onChauffeurChange: setChauffeur,
                   months: monthOptions, month, onMonthChange: setMonth,
                   years: yearOptions, year, onYearChange: setYear,
                   destinations: destinationOptions, destination, onDestinationChange: setDestination,
                   onReset: () => { setChauffeur(ALL_CHAUFFEURS); setMonth([ALL_MONTHS]); setSelectedDates([]); }
                 }}
                 maintenanceRecords={maintenanceRecords} setMaintenanceRecords={rolePermissions.canEdit ? setMaintenanceRecords : null} expenseRecords={expenseRecords} oilChanges={oilChanges} setOilChanges={rolePermissions.canEdit ? setOilChanges : null}
                 selectedDates={selectedDates}
                 googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                 currency={currency}
                 t={t}
                 language={language}
                 allRecords={manualTrips}
                 fuelAdvances={fuelAdvances}
                 setFuelAdvances={rolePermissions.canEdit ? setFuelAdvances : null}
                 accountingTransactions={accountingTransactions}
                 cashBalance={accountingTransactions?.find(t => t.balance)?.balance || null}
                 onSyncTrips={handleRefreshSpreadsheet}
                 isSyncingTrips={isSyncing}
                 lastSyncAt={lastSyncTime}
                 />
                 )}
              
              
              
              
              
              
              
              {activeSection === "maintenance" && (
                <MaintenanceAdminModule
                  records={maintenanceRecords}
                  setRecords={rolePermissions.canEdit ? setMaintenanceRecords : null}
                  expenseRecords={expenseRecords}
                  accountingTransactions={accountingTransactions}
                  drivers={drivers}
                  googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                  oilChanges={oilChanges}
                  setOilChanges={rolePermissions.canEdit ? setOilChanges : null}
                  onSync={syncMaintenanceAndExpenses}
                  isSyncing={isSyncingMaintenance}
                  t={t}
                  language={language}
                />
              )}
              
              
              
              
              {activeSection === "settings" && (
                <SettingsModule 
                  drivers={drivers} setDrivers={rolePermissions.canEdit ? setDrivers : null} 
                  vehicles={vehicles} setVehicles={rolePermissions.canEdit ? setVehicles : null} 
                  destinationsList={destinationsList} setDestinationsList={rolePermissions.canEdit ? setDestinationsList : null} 
                  businessRules={businessRules} setBusinessRules={rolePermissions.canEdit ? setBusinessRules : null} 
                  uiConfig={uiConfig} setUiConfig={rolePermissions.canEdit ? setUiConfig : null} 
                  trips={trips} 
                  canDelete={rolePermissions.canDelete}
                  canEdit={rolePermissions.canEdit}
                  onClearAllStorage={rolePermissions.canDelete ? () => { localStorage.clear(); window.location.reload(); } : null} 
                  onPurgeTrips={rolePermissions.canDelete ? () => setManualTrips([]) : null} 
                  onPurgeRange={rolePermissions.canDelete ? handlePurgeRange : null}
                  onPurgeMaintenance={rolePermissions.canDelete ? handlePurgeMaintenance : null}
                  t={t}
                  language={language}
                />
              )}
            </div>
          </ErrorBoundary>
                        </Suspense>
        </div>
        </main>
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
}
