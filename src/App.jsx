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
  ChevronRight
} from "lucide-react";
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
import AITicketValidationModule from "./components/AITicketValidationModule";
import AccountingModule, { INITIAL_INVOICES } from "./components/AccountingModule";
import { parseSpreadsheetAccounting } from "./utils/accountingParser";
import { INITIAL_ACCOUNTING_TRANSACTIONS } from "./utils/accountingInitialData";
import { TRANSLATIONS, translateCategory, translateComment } from "./utils/i18n";

const APP_STORAGE_KEYS = {
  auth: "sdv_auth_session_v1",
  trips: "sdv_manual_trips_v1",
  invoices: "sdv_invoices_v1",
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
  maintenance: "sdv_maintenance_v1",
  oil_changes: "sdv_oil_changes_v1",
  accounting_transactions: "sdv_accounting_transactions_v2",
  language: "sdv_language_pref_v1"
};

// Données initiales certifiées de dernière vidange (extraites des commentaires Spreedsheet)
export const INITIAL_OIL_CHANGES = {
  "AMARA TRUCK 76": {
    mileage: 100312,
    date: "2026-04-16",
    comment: "Vidange effectuée le 16/04/2026 (Spreedsheet row 326)",
    interval: 10000
  },
  "BRAHIMA TRUCK 45": {
    mileage: 93962,
    date: "2026-04-16",
    comment: "Vidange effectuée le 16/04/2026 (Spreedsheet row 326)",
    interval: 10000
  },
  "SORO TRUCK 52": {
    mileage: 91000,
    date: "2026-04-24",
    comment: "Vidange effectuée le 24/04/2026 (Spreedsheet row 334)",
    interval: 10000
  }
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
    { id: "drivers", label: "Chauffeurs", enabled: true },
    { id: "trips", label: "Trajets", enabled: true },
    { id: "comptabilite", label: "Comptabilité", enabled: true },
    { id: "depenses", label: "Dépenses", enabled: true },
    { id: "encaissements", label: "Encaissements", enabled: true },
    { id: "documents", label: "Validation IA", enabled: true },
    { id: "closing", label: "Clôture jour", enabled: true },
    { id: "reports", label: "Rapports", enabled: true },
    { id: "audit", label: "Audit Log", enabled: true },
    { id: "maintenance", label: "Maintenance", enabled: true },
    { id: "quick-entry", label: "Saisie Rapide", enabled: true },
    { id: "admin", label: "Importation", enabled: true },
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
  const [manualTrips, setManualTrips] = useState(() => loadJson(APP_STORAGE_KEYS.trips, []));
  const [maintenanceRecords, setMaintenanceRecords] = useState(() => loadJson(APP_STORAGE_KEYS.maintenance, []));
  const [oilChanges, setOilChanges] = useState(() => {
    const saved = loadJson(APP_STORAGE_KEYS.oil_changes, {});
    return {
      "AMARA TRUCK 76": saved["AMARA TRUCK 76"]?.mileage ? saved["AMARA TRUCK 76"] : INITIAL_OIL_CHANGES["AMARA TRUCK 76"],
      "BRAHIMA TRUCK 45": saved["BRAHIMA TRUCK 45"]?.mileage ? saved["BRAHIMA TRUCK 45"] : INITIAL_OIL_CHANGES["BRAHIMA TRUCK 45"],
      "SORO TRUCK 52": saved["SORO TRUCK 52"]?.mileage ? saved["SORO TRUCK 52"] : INITIAL_OIL_CHANGES["SORO TRUCK 52"],
      ...saved
    };
  });
  const [pendingTickets, setPendingTickets] = useState(() => loadJson(APP_STORAGE_KEYS.pending_ai_tickets, []));
  const [auditLogs, setAuditLogs] = useState(() => loadJson(APP_STORAGE_KEYS.audit, []));
  const [categories, setCategories] = useState(() => loadJson(APP_STORAGE_KEYS.categories, { expense: ["Carburant", "Péage", "Police", "Repas"], income: ["Recette trajet"] }));
  const [expenseRecords, setExpenseRecords] = useState(() => loadFinanceRecords("expenses"));
  const [incomeRecords, setIncomeRecords] = useState(() => loadFinanceRecords("incomes"));
  const [dailyClosings, setDailyClosings] = useState(() => loadJson(APP_STORAGE_KEYS.closings, []));
  const [invoices, setInvoices] = useState(() => loadJson(APP_STORAGE_KEYS.invoices, INITIAL_INVOICES));
  const [accountingTransactions, setAccountingTransactions] = useState(() => loadJson(APP_STORAGE_KEYS.accounting_transactions, INITIAL_ACCOUNTING_TRANSACTIONS));

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.invoices, invoices);
  }, [invoices]);

  useEffect(() => {
    saveJson(APP_STORAGE_KEYS.accounting_transactions, accountingTransactions);
  }, [accountingTransactions]);

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
    dashboard: LayoutDashboard, drivers: Users, trips: Truck, comptabilite: ReceiptText, depenses: Wallet,
    encaissements: Banknote, documents: Sparkles, closing: Activity,
    reports: Database, maintenance: Settings2, settings: Settings,
    audit: ShieldCheck, "quick-entry": PlusCircle, admin: RefreshCcw
  };

  const isEn = language === "EN";
  const menuLabels = {
    dashboard: t.dashboard || (isEn ? "Dashboard" : "Tableau de Bord"),
    drivers: t.drivers || (isEn ? "Drivers" : "Chauffeurs"),
    trips: t.trips || (isEn ? "Trips" : "Trajets"),
    comptabilite: t.comptabilite || t.accounting || (isEn ? "Accounting" : "Comptabilité"),
    depenses: t.depenses || t.expenses || (isEn ? "Expenses" : "Dépenses"),
    encaissements: t.encaissements || t.income || t.incomes || (isEn ? "Receivables" : "Encaissements"),
    documents: t.documents || t.validation || (isEn ? "AI Validation" : "Validation IA"),
    closing: t.closing || t.dailyClosing || (isEn ? "Daily Closing" : "Clôture jour"),
    reports: t.reports || (isEn ? "Reports" : "Rapports"),
    audit: t.audit || (isEn ? "Audit Log" : "Audit Log"),
    maintenance: t.maintenance || (isEn ? "Maintenance" : "Maintenance"),
    "quick-entry": t.quickEntry || (isEn ? "Quick Entry" : "Saisie Rapide"),
    admin: t.import || (isEn ? "Import Data" : "Importation"),
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
        if (authUser?.role === "viewer") return ["dashboard", "reports", "comptabilite"].includes(item.id);
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
      (vr.values || []).forEach(row => {
        let isoDate = "";
        if (row[0]) {
          const cleanDate = String(row[0]).replace(/^[a-z]+\s+/i, "").toLowerCase();
          if (cleanDate.includes("/") || cleanDate.includes("-")) {
            const parts = cleanDate.split(/[\/\-]/);
            if (parts.length === 3) {
              let [d, m, y] = parts[0].length === 4 ? [parts[2], parts[1], parts[0]] : [parts[0], parts[1], parts[2]];
              if (y.length === 2) y = "20" + y;
              isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
          } else {
            const monthsFr = ["janv", "févr", "mars", "avril", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
            const parts = cleanDate.split(/\s+/);
            if (parts.length >= 2) {
              const d = parts[0].padStart(2, '0');
              let m = "01";
              const monthStr = parts[1];
              monthsFr.forEach((name, idx) => { if (monthStr.startsWith(name)) m = String(idx + 1).padStart(2, '0'); });
              let y = parts[2] || "2026";
              if (y.length === 2) y = "20" + y;
              isoDate = `${y}-${m}-${d}`;
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
        let fuel = 0, roadSubTotal = 0, totalExpense = 0, km = 0, tonnage = 0, totalGross = 0;
        let start = row[1] || "";
        let destination = row[2] || "";

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
        if (rawKm === 712827) rawKm = 71283; // SORO typo du 04/01/2026
        else if (rawKm === 196266) rawKm = 106266; // BRAHIMA typo d'août 2026
        else if (rawKm === 10492) rawKm = 107492; // BRAHIMA typo du 13/09/2026
        else if (rawKm === 59757 && isoDate < "2025-10-01") rawKm = 50757; // SORO typo du 26/09/2025
        else if (rawKm > 200000) rawKm = 0; // Outlier excessif ignoré
        else if (rawKm < 1000) rawKm = 0; // Distance de trajet isolée ignorée

        km = rawKm;

        imported.push({
          id: `gs-${chauffeur}-${isoDate}-${Math.random()}`,
          date: isoDate, chauffeur, driverLabel: `${chauffeur} ${driverKeys[i].s}`, sdv: driverKeys[i].s,
          start, destination, fuel_cost_cfa: fuel, road_fees_cfa: roadSubTotal, total_expense_cfa: totalExpense,
          tonnage, total_gross_cfa: totalGross, total_net_cfa: totalGross - totalExpense,
          km, tripType: "Google Sheets", comments: `Synchronisé (${isoDate < "2026-01-01" ? '2025' : (isoDate < "2026-02-01" ? 'Jan 2026' : 'Standard')})`,
          month: new Date(isoDate).getMonth() + 1, year: new Date(isoDate).getFullYear()
        });
      });
    });

    setManualTrips(prev => {
      const newImportKeys = new Set(imported.map(t => `${t.date}-${t.chauffeur}`));
      const filteredPrev = prev.filter(t => !newImportKeys.has(`${t.date}-${t.chauffeur}`));
      return [...filteredPrev, ...imported];
    });
    return imported.length;
  };

  const processMaintenanceData = (rowData) => {
    if (!rowData) return;
    let maintenanceList = [];
    let expensesList = [];

    rowData.forEach((row) => {
      const values = row.values || [];
      if (values.length === 0) return;
      const rowTexts = values.map(v => v?.formattedValue ? String(v.formattedValue) : "");
      const fullRowContent = rowTexts.join(" ").toLowerCase();
      const dateRaw = rowTexts[0] || "";
      const amountRaw = rowTexts[8] || "";
      const driveLink = values[8]?.hyperlink || null;
      
      const parseNum = (v) => {
        let s = String(v).replace(/\s/g, "");
        const match = s.match(/[\d,.]+/);
        if (!match) return 0;
        s = match[0];
        if (s.includes(".") && !s.includes(",")) { if (s.split(".").pop().length === 3 || s.length > 5) s = s.replace(/\./g, ""); }
        return parseFloat(s.replace(/,/g, ".").replace(/[^0-9.-]/g, "")) || 0;
      };
      
      const amount = parseNum(amountRaw);
      if (amount === 0) return;

      const commentM = rowTexts[12] || "";
      const commentN = rowTexts[13] || "";
      let bestComment = `${commentM} ${commentN}`.trim();
      if (!bestComment) {
        const possible = rowTexts.slice(2).filter(t => t.length > 3 && t !== amountRaw && t !== dateRaw);
        bestComment = possible.sort((a, b) => b.length - a.length)[0] || "";
      }
      if (!bestComment) return;

      const maintenanceKeywords = ['tire', 'oil', 'repair', 'rod', 'maint', 'spare', 'change', 'garage', 'mechanic', 'mecanic', 'frein', 'brake', 'tube', 'labor', 'filter', 'battery', 'bearing', 'suspension', 'clutch', 'joint', 'gasket', 'alternator', 'starter', 'belt', 'pump', 'radiator', 'shock', 'rim', 'pneu', 'vidange', 'moteur', 'batterie', 'roulement', 'amortisseur', 'embrayage', 'boite', 'pont', 'transmission', 'alternateur', 'demarreur', 'courroie', 'pompe', 'radiateur', 'huil', 'entretien', 'révision', 'revision', 'facture', 'pièce', 'mecanicien', 'main d', 'lavage', 'graissage', 'parallélisme', 'équilibrage', 'valve', 'durite', 'soufflet', 'disque', 'plaquette', 'étrier', 'injecteur'];
      const isMaintenance = maintenanceKeywords.some(keyword => fullRowContent.includes(keyword)) || fullRowContent.includes('km') || !!driveLink || fullRowContent.includes('http') || fullRowContent.includes('drive.google');

      let isoDate = "2026-01-01";
      const p = dateRaw.toLowerCase().split(" ");
      if (p.length >= 3) {
        const day = p[1].padStart(2, '0');
        const monthsFr = ["janv", "févr", "mars", "avril", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
        let m = "01";
        monthsFr.forEach((name, idx) => { if (p[2].startsWith(name)) m = String(idx + 1).padStart(2, '0'); });
        isoDate = `2026-${m}-${day}`;
      }

      const driverNames = ["AMARA", "BRAHIMA", "SORO"];
      let detectedDriver = { c: "AMARA", s: "76" };
      driverNames.forEach(name => {
        if (fullRowContent.includes(name.toLowerCase())) {
          if (name === "AMARA") detectedDriver = { c: "AMARA", s: "76" };
          if (name === "BRAHIMA") detectedDriver = { c: "BRAHIMA", s: "45" };
          if (name === "SORO") detectedDriver = { c: "SORO", s: "52" };
        }
      });

      const detectedRepairType = maintenanceKeywords.find(kw => fullRowContent.includes(kw)) || "Réparation";
      const driveLinkRegex = /(https?:\/\/(?:drive|docs)\.google\.com\/[^\s]+)/;
      const foundLink = fullRowContent.match(driveLinkRegex);
      const finalDriveLink = driveLink || (foundLink ? foundLink[0] : null);

      const payload = {
        id: `gs-${detectedDriver.c}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        date: isoDate, amount: amount, description: bestComment || `Maintenance ${detectedRepairType}`,
        driveLink: finalDriveLink, source: "Google Sheets"
      };

      if (isMaintenance) {
        maintenanceList.push({ ...payload, vehicle: `${detectedDriver.c} TRUCK ${detectedDriver.s}`, cost: amount, status: "Completed", repairType: detectedRepairType });
      } else {
        expensesList.push({ ...payload, driverLabel: `${detectedDriver.c} TRUCK ${detectedDriver.s}`, category: "Dépense Opérationnelle", subCategory: "Sync Spreadsheet" });
      }

      // Détection automatique de vidange dans les commentaires Spreedsheet
      if (/oil\s*change|vidange/i.test(fullRowContent)) {
        const text = fullRowContent.toLowerCase();
        setOilChanges(prev => {
          const updated = { ...prev };
          if (text.includes("amara")) {
            updated["AMARA TRUCK 76"] = {
              mileage: updated["AMARA TRUCK 76"]?.mileage || 100312,
              date: isoDate,
              comment: bestComment || "Vidange (Spreedsheet)",
              interval: 10000
            };
          }
          if (text.includes("brahima")) {
            updated["BRAHIMA TRUCK 45"] = {
              mileage: updated["BRAHIMA TRUCK 45"]?.mileage || 93962,
              date: isoDate,
              comment: bestComment || "Vidange (Spreedsheet)",
              interval: 10000
            };
          }
          if (text.includes("soro")) {
            updated["SORO TRUCK 52"] = {
              mileage: updated["SORO TRUCK 52"]?.mileage || 91000,
              date: isoDate,
              comment: bestComment || "Vidange (Spreedsheet)",
              interval: 10000
            };
          }
          return updated;
        });
      }
    });

    setMaintenanceRecords(prev => [...prev.filter(r => r.source !== "Google Sheets"), ...maintenanceList]);
    setExpenseRecords(prev => [...prev.filter(r => r.source !== "Google Sheets"), ...expensesList]);
    return { maintenance: maintenanceList.length, expenses: expensesList.length };
  };

  const processAccountingSpreadsheet = (rowData) => {
    if (!rowData) return 0;
    try {
      const { transactions: parsedTx } = parseSpreadsheetAccounting(rowData);
      if (parsedTx && parsedTx.length > 0) {
        setAccountingTransactions(parsedTx);
        return parsedTx.length;
      }
    } catch (err) {
      console.error("Error parsing accounting spreadsheet:", err);
    }
    return 0;
  };

  // Fonction de synchronisation silencieuse (sans popup)
  const performSilentSync = async () => {
    if (isSyncing || isSyncingMaintenance) return;
    setIsSyncing(true);
    setIsSyncingMaintenance(true);

    const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID || "1KPYlBT30GdzFMPsYjvWwZzsGU6p30o5JanLPB6_HyuY";
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    try {
      // 1. Tentative via le Backend (Service Account - Méthode la plus sûre)
      const backendRes = await fetch("/api/gsheets");
      if (backendRes.ok) {
        const data = await backendRes.json();
        const tripsCount = processTripsData(data.trips);
        const maintCount = processMaintenanceData(data.maintenance);
        const acctCount = processAccountingSpreadsheet(data.maintenance);
        console.log(`Auto-sync (Backend): ${tripsCount} trajets, ${maintCount.maintenance} maintenances, ${acctCount} écritures comptables.`);
        setIsSyncing(false);
        setIsSyncingMaintenance(false);
        return;
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
          
          processTripsData(tripsData);
          processMaintenanceData(maintenanceData);
          processAccountingSpreadsheet(maintenanceData);
          console.log("Auto-sync (API Key) réussie.");
          setIsSyncing(false);
          setIsSyncingMaintenance(false);
          return;
        }
      }

      console.warn("Silent sync failed. No backend response and API Key invalid or sheet private.");
    } catch (err) {
      console.error("Auto-sync error:", err);
    } finally {
      setIsSyncing(false);
      setIsSyncingMaintenance(false);
    }
  };

  useEffect(() => {
    if (authUser && !isSyncing && !isSyncingMaintenance) {
      performSilentSync();
    }
  }, [authUser]);

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
              const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges='AMARA TRUCK 76'!A2:O&ranges='BRAHIMA TRUCK 45'!A2:O&ranges='SORO TRUCK 52'!A2:O`, { headers: { 'Authorization': `Bearer ${tr.access_token}` } });
              const data = await res.json();
              const count = processTripsData(data.valueRanges);
              alert(`${count} trajets synchronisés !`);
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
          <div className="hidden md:flex items-center gap-2.5 bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-white">
            <Search className="size-3.5 text-white/20" /><input type="text" placeholder={t.search} className="bg-transparent border-none outline-none text-[11px] text-white/60 w-48 font-medium" />
          </div>
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
             <button onClick={() => alert("IA Sync non configurée")} className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20"><ShieldCheck className="size-3.5" />{t.iaSync}</button>
          </div>
        </div>
      </header>

        <div className="p-4 md:p-6 flex-1 overflow-x-hidden">
          <ErrorBoundary resetKey={activeSection}>
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              {activeSection === "dashboard" && (
               <Dashboard
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
                 maintenanceRecords={maintenanceRecords} setMaintenanceRecords={rolePermissions.canEdit ? setMaintenanceRecords : null} oilChanges={oilChanges} setOilChanges={rolePermissions.canEdit ? setOilChanges : null}
                 selectedDates={selectedDates}
                 googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                 currency={currency}
                 t={t}
                 language={language}
                 allRecords={manualTrips}
                 />
                 )}
              {activeSection === "drivers" && (
                <DriversModule 
                  drivers={drivers} 
                  setDrivers={rolePermissions.canEdit ? setDrivers : null} 
                  trips={filteredData || trips} 
                  expenses={expenseRecords} 
                  incomes={incomeRecords} 
                  formatCurrency={formatCurrency} 
                  t={t} 
                  language={language}
                />
              )}
              {activeSection === "trips" && (
                <TripsModule 
                  trips={filteredData || trips} 
                  drivers={drivers} 
                  expenses={expenseRecords} 
                  incomes={incomeRecords} 
                  chauffeurs={chauffeurOptions} 
                  formatCurrency={formatCurrency} 
                  formatTonnage={formatTonnage} 
                  canWrite={rolePermissions.canEdit} 
                  onAddTrip={(t) => setManualTrips([...manualTrips, t])} 
                  t={t} 
                  language={language}
                />
              )}
              {activeSection === "comptabilite" && (
                <AccountingModule 
                  transactions={accountingTransactions}
                  setTransactions={rolePermissions.canEdit ? setAccountingTransactions : null}
                  invoices={invoices} 
                  setInvoices={rolePermissions.canEdit ? setInvoices : null} 
                  onSync={syncMaintenanceAndExpenses}
                  isSyncing={isSyncingMaintenance}
                  formatCurrency={formatCurrency} 
                  formatTonnage={formatTonnage} 
                  canWrite={rolePermissions.canEdit} 
                  t={t} 
                  language={language}
                />
              )}
              {activeSection === "depenses" && (
                <ExpenseModule 
                  expenses={expenseRecords} 
                  setExpenses={rolePermissions.canEdit ? setExpenseRecords : null} 
                  drivers={drivers} 
                  formatCurrency={formatCurrency}
                  onSync={syncMaintenanceAndExpenses}
                  isSyncing={isSyncingMaintenance}
                  t={t}
                  language={language}
                />
              )}
              {activeSection === "encaissements" && (
                <FinanceWorkspace 
                  activeSection="encaissements" 
                  type="income" 
                  records={incomeRecords} 
                  setRecords={rolePermissions.canEdit ? setIncomeRecords : null} 
                  categories={categories} 
                  setCategories={rolePermissions.canEdit ? setCategories : null}
                  expenseRecords={expenseRecords}
                  incomeRecords={incomeRecords}
                  drivers={drivers}
                  trips={filteredData || trips}
                  formatCurrency={formatCurrency}
                  canWrite={rolePermissions.canEdit}
                  t={t}
                  language={language}
                />
              )}
              {activeSection === "documents" && (
                <AITicketValidationModule 
                  pendingTickets={pendingTickets} 
                  setPendingTickets={rolePermissions.canEdit ? setPendingTickets : null} 
                  onApprove={rolePermissions.canEdit ? handleApproveAITicket : null} 
                  drivers={drivers} 
                  t={t}
                  language={language}
                />
              )}
              {activeSection === "closing" && (
                <DailyClosingModule 
                  closings={dailyClosings} 
                  setClosings={rolePermissions.canEdit ? setDailyClosings : null} 
                  trips={filteredData || trips} 
                  drivers={drivers} 
                  expenses={expenseRecords} 
                  incomes={incomeRecords} 
                  formatCurrency={formatCurrency} 
                  canWrite={rolePermissions.canEdit} 
                  onCloseDay={(closing) => setDailyClosings(prev => [closing, ...(prev || [])])} 
                  t={t}
                  language={language}
                />
              )}
              {activeSection === "maintenance" && (
                <MaintenanceAdminModule
                  records={maintenanceRecords}
                  setRecords={rolePermissions.canEdit ? setMaintenanceRecords : null}
                  expenseRecords={expenseRecords}
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
              {activeSection === "reports" && (
                <ReportsModule 
                  records={trips} 
                  manualTrips={manualTrips} 
                  setRecords={setManualTrips} 
                  chauffeurs={chauffeurOptions} 
                  canDelete={true} 
                  canEdit={true} 
                  t={t} 
                  language={language}
                />
              )}
              {activeSection === "audit" && <AuditLogModule logs={auditLogs} t={t} language={language} />}
              {activeSection === "quick-entry" && <ManualEntryModule setTrips={rolePermissions.canEdit ? setManualTrips : null} t={t} language={language} />}
              {activeSection === "admin" && <SmartBulkImporter setTrips={rolePermissions.canEdit ? setManualTrips : null} setAuditLogs={rolePermissions.canEdit ? setAuditLogs : null} t={t} language={language} />}
              {activeSection === "settings" && (
                <SettingsModule 
                  drivers={drivers} setDrivers={setDrivers} 
                  vehicles={vehicles} setVehicles={setVehicles} 
                  destinationsList={destinationsList} setDestinationsList={setDestinationsList} 
                  businessRules={businessRules} setBusinessRules={setBusinessRules} 
                  uiConfig={uiConfig} setUiConfig={setUiConfig} 
                  trips={trips} 
                  onClearAllStorage={() => { localStorage.clear(); window.location.reload(); }} 
                  onPurgeTrips={() => setManualTrips([])} 
                  onPurgeRange={handlePurgeRange}
                  onPurgeMaintenance={handlePurgeMaintenance}
                  t={t}
                  language={language}
                />
              )}
            </div>
          </ErrorBoundary>
        </div>
      </main>
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
}
