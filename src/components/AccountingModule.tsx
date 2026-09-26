import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Filter, Calendar, 
  CheckCircle2, AlertTriangle, TrendingUp, Download, 
  ExternalLink, Eye, Trash2, Edit3, Scale, Building2, 
  CreditCard, ArrowUpDown, FileText, Check, X, 
  DollarSign, Percent, ArrowUpRight, ArrowDownRight, ShieldCheck, RefreshCw,
  FolderOpen, Fuel, Wrench, Users, Truck, Sparkles,
  PieChart as PieIcon, BarChart2, Layers, CheckSquare,
  HelpCircle, ChevronRight, Hash, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, Cell 
} from 'recharts';
import { AccountingTransaction, AccountingCategory } from '../utils/accountingParser';
import { INITIAL_ACCOUNTING_TRANSACTIONS } from '../utils/accountingInitialData';
import { FuelAdvance, FuelCashSummary, computeFuelReconciliation, DEFAULT_FUEL_ADVANCES } from '../utils/fuelAdvanceTracker';
import { Language, translateCategory, translateComment, translateStatus, translatePaymentMethod, TRANSLATIONS } from '../utils/i18n';

// Extraction de l'ID d'un fichier Google Drive
export function getDriveId(link?: string): string | null {
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

// URL d'intégration sécurisée pour iframe Google Drive
export function getDriveEmbedUrl(link?: string): string | null {
  if (!link) return null;
  if (link.includes("/folders/")) return null; // Les dossiers s'ouvrent dans un nouvel onglet
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: string;
  date: string;
  dueDate: string;
  period: string;
  tonnage: number;
  ratePerTon?: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string;
  attachmentName?: string;
  attachmentData?: string;
  driveLink?: string;
  createdAt: string;
}

// Factures d'exemple basées sur le transport au tonnage
export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv-2026-003",
    invoiceNumber: "FAC-SDV-2026-03",
    client: "CIMAF Côte d'Ivoire",
    date: "2026-03-15",
    dueDate: "2026-04-15",
    period: "Mars 2026",
    tonnage: 1120.5,
    ratePerTon: 15500,
    totalAmount: 17367750,
    paidAmount: 10000000,
    paymentMethod: "Virement bancaire",
    notes: "Acompte de 10M reçu le 20/03. Solde prévu à 30 jours.",
    driveLink: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
    createdAt: "2026-03-15T10:00:00Z"
  },
  {
    id: "inv-2026-002",
    invoiceNumber: "FAC-SDV-2026-02",
    client: "SDV Logistique & Transit",
    date: "2026-02-28",
    dueDate: "2026-03-31",
    period: "Février 2026",
    tonnage: 1340.0,
    ratePerTon: 15000,
    totalAmount: 20100000,
    paidAmount: 20100000,
    paymentMethod: "Virement bancaire",
    notes: "Règlement complet reçu par virement BOA.",
    createdAt: "2026-02-28T14:30:00Z"
  },
  {
    id: "inv-2026-001",
    invoiceNumber: "FAC-SDV-2026-01",
    client: "SDV Logistique & Transit",
    date: "2026-01-31",
    dueDate: "2026-02-28",
    period: "Janvier 2026",
    tonnage: 1425.8,
    ratePerTon: 15000,
    totalAmount: 21387000,
    paidAmount: 21387000,
    paymentMethod: "Virement bancaire",
    notes: "Facturation mensuelle globale Janvier. Soldé.",
    createdAt: "2026-01-31T09:00:00Z"
  },
  {
    id: "inv-2025-012",
    invoiceNumber: "FAC-SDV-2025-12",
    client: "SGS Minerais & Vrac",
    date: "2025-12-30",
    dueDate: "2026-01-30",
    period: "Décembre 2025",
    tonnage: 1280.0,
    ratePerTon: 14800,
    totalAmount: 18944000,
    paidAmount: 18944000,
    paymentMethod: "Virement bancaire",
    notes: "Campagne cacao & pondéreux fin 2025. Soldé.",
    createdAt: "2025-12-30T16:00:00Z"
  },
  {
    id: "inv-2025-011",
    invoiceNumber: "FAC-SDV-2025-11",
    client: "CIMAF Côte d'Ivoire",
    date: "2025-11-30",
    dueDate: "2025-12-31",
    period: "Novembre 2025",
    tonnage: 1190.2,
    ratePerTon: 15000,
    totalAmount: 17853000,
    paidAmount: 15000000,
    paymentMethod: "Chèque",
    notes: "Reste un reliquat de 2.85M CFA en attente de validation comptable.",
    createdAt: "2025-11-30T11:00:00Z"
  }
];

interface AccountingModuleProps {
  transactions?: AccountingTransaction[];
  setTransactions?: React.Dispatch<React.SetStateAction<AccountingTransaction[]>> | null;
  invoices?: Invoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<Invoice[]>> | null;
  onSync?: () => void;
  isSyncing?: boolean;
  formatCurrency?: (val: number, curr?: string) => string;
  formatTonnage?: (val: number) => string;
  canWrite?: boolean;
  t?: any;
  language?: Language;
  fuelAdvances?: FuelAdvance[];
  setFuelAdvances?: React.Dispatch<React.SetStateAction<FuelAdvance[]>> | null;
}

// Configuration visuelle des catégories comptables
const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  // Entrées
  "Paiements Clients & Factures": { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", icon: DollarSign },
  "Remboursement Retenue (20%)": { color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.25)", icon: ShieldCheck },
  "Apports & Avances Associés": { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.12)", border: "rgba(139, 92, 246, 0.25)", icon: Users },
  "Régularisation / Rejet Chèque": { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", icon: AlertTriangle },
  // Dépenses
  "Carburant (Gasoil)": { color: "#00F2FF", bg: "rgba(0, 242, 255, 0.12)", border: "rgba(0, 242, 255, 0.25)", icon: Fuel },
  "Frais de Route & Péages": { color: "#F97316", bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.25)", icon: Truck },
  "Salaires & Rémunérations": { color: "#A855F7", bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.25)", icon: Users },
  "Pneus & Train Roulant": { color: "#EC4899", bg: "rgba(236, 72, 153, 0.12)", border: "rgba(236, 72, 153, 0.25)", icon: Layers },
  "Maintenance & Vidanges": { color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", icon: Wrench },
  "Mécanique & Pièces de Rechange": { color: "#6366F1", bg: "rgba(99, 102, 241, 0.12)", border: "rgba(99, 102, 241, 0.25)", icon: Wrench },
  "Loyer & Logement Flotte": { color: "#EAB308", bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.25)", icon: Building2 },
  "Assurances Flotte": { color: "#14B8A6", bg: "rgba(20, 184, 166, 0.12)", border: "rgba(20, 184, 166, 0.25)", icon: ShieldCheck },
  "Cartes de Transport & Régularisations": { color: "#84CC16", bg: "rgba(132, 204, 22, 0.12)", border: "rgba(132, 204, 22, 0.25)", icon: FileText },
  "Impôts & Taxes d’État": { color: "#EF4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", icon: Scale },
  "Transport Urbain (Yango)": { color: "#F43F5E", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.25)", icon: Truck },
  "Frais Bancaires & Wave": { color: "#0284C7", bg: "rgba(2, 132, 199, 0.12)", border: "rgba(2, 132, 199, 0.25)", icon: CreditCard },
  "GPS, Télécoms & Énergie": { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", icon: Sparkles },
  "Lavage & Entretien Flotte": { color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.25)", icon: Wrench },
  "Dépenses Personnelles": { color: "#D946EF", bg: "rgba(217, 70, 239, 0.12)", border: "rgba(217, 70, 239, 0.25)", icon: Users },
  "Charges Générales & Divers": { color: "#94A3B8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.25)", icon: HelpCircle }
};

export function AccountingModule({
  transactions,
  setTransactions,
  invoices = [],
  setInvoices,
  onSync,
  isSyncing = false,
  formatCurrency,
  formatTonnage,
  canWrite = true,
  t,
  language = "FR",
  fuelAdvances,
  setFuelAdvances,
}: AccountingModuleProps) {
  const isEn = language === "EN";
  const text = t || (isEn ? TRANSLATIONS.EN : TRANSLATIONS.FR);
  const formatMoney = typeof formatCurrency === "function" 
    ? formatCurrency 
    : (val: number) => Number(val || 0).toLocaleString("fr-FR") + " CFA";

  const formatTon = typeof formatTonnage === "function"
    ? formatTonnage
    : (val: number) => Number(val || 0).toLocaleString("fr-FR") + " T";

  // --- ONGLET ACTIF : SPREEDSHEET vs FACTURES CLIENTS vs AVANCES CARBURANT ---
  const [viewTab, setViewTab] = useState<"spreedsheet" | "invoices" | "fuel_advances">("spreedsheet");

  // États Dépôts & Avances Carburant
  const [fuelStationFilter, setFuelStationFilter] = useState<string>("ALL");
  const [fuelSearchQuery, setFuelSearchQuery] = useState<string>("");
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [editingFuelAdvance, setEditingFuelAdvance] = useState<FuelAdvance | null>(null);
  const [fuelFormDate, setFuelFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [fuelFormAmount, setFuelFormAmount] = useState("4000000");
  const [fuelFormStation, setFuelFormStation] = useState("Shell San Pedro");
  const [fuelFormPaymentMethod, setFuelFormPaymentMethod] = useState("Virement Bancaire");
  const [fuelFormNotes, setFuelFormNotes] = useState("");

  // ==========================================
  // PARTIE 1 : DONNÉES SPREEDSHEET (GRAND LIVRE)
  // ==========================================
  const allTx = useMemo(() => {
    if (transactions && transactions.length > 0) return transactions;
    return INITIAL_ACCOUNTING_TRANSACTIONS;
  }, [transactions]);

  // Filtres Spreedsheet
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "in" | "out">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [onlyDriveReceipts, setOnlyDriveReceipts] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals Spreedsheet
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    date: string;
    amount: number;
    category: string;
    comment: string;
    driveLink: string;
  } | null>(null);

  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxType, setNewTxType] = useState<"in" | "out">("out");
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTxCategory, setNewTxCategory] = useState<string>("Charges Générales & Divers");
  const [newTxAmount, setNewTxAmount] = useState<string>("");
  const [newTxComment, setNewTxComment] = useState<string>("");
  const [newTxDriveLink, setNewTxDriveLink] = useState<string>("");

  // Années disponibles dans le dataset Spreedsheet
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    allTx.forEach(t => {
      if (t.date) set.add(t.date.slice(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [allTx]);

  // Catégories Spreedsheet
  const availableCategories = useMemo(() => {
    const map = new Map<string, { count: number; total: number; type: "in" | "out" }>();
    allTx.forEach(t => {
      const entry = map.get(t.category) || { count: 0, total: 0, type: t.type };
      entry.count += 1;
      entry.total += t.amount;
      map.set(t.category, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [allTx]);

  // Filtrage des transactions Spreedsheet
  const filteredTransactions = useMemo(() => {
    return allTx.filter(t => {
      const yr = t.date ? t.date.slice(0, 4) : "";
      const mo = t.date ? String(parseInt(t.date.slice(5, 7), 10)) : "";

      if (selectedYear !== "ALL" && yr !== selectedYear) return false;
      if (selectedMonth !== "ALL" && mo !== selectedMonth) return false;
      if (selectedType !== "ALL" && t.type !== selectedType) return false;
      if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false;
      if (onlyDriveReceipts && !t.driveLink) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchComment = t.comment?.toLowerCase().includes(q);
        const matchCategory = t.category?.toLowerCase().includes(q);
        const matchDate = t.date?.includes(q) || t.rawDate?.toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        if (!matchComment && !matchCategory && !matchDate && !matchAmount) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === "date") {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortField === "category") {
        return sortOrder === "asc" 
          ? a.category.localeCompare(b.category) 
          : b.category.localeCompare(a.category);
      }
      return 0;
    });
  }, [allTx, selectedYear, selectedMonth, selectedType, selectedCategory, onlyDriveReceipts, searchQuery, sortField, sortOrder]);

  // Métriques Spreedsheet
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let driveCount = 0;

    filteredTransactions.forEach(t => {
      if (t.type === "in") {
        totalIn += t.amount;
      } else {
        totalOut += t.amount;
      }
      if (t.driveLink) driveCount += 1;
    });

    const net = totalIn - totalOut;
    const ratio = totalOut > 0 ? (totalIn / totalOut) * 100 : 0;

    const latestWithBalance = filteredTransactions.find(t => t.balance !== undefined && t.balance !== null && t.balance !== 0);
    const balance = latestWithBalance?.balance || 0;

    return {
      totalIn,
      totalOut,
      net,
      ratio,
      balance,
      count: filteredTransactions.length,
      driveCount
    };
  }, [filteredTransactions]);

  // Calcul du résumé du décompte carburant et de la réconciliation de trésorerie
  const fuelSummary: FuelCashSummary = useMemo(() => {
    return computeFuelReconciliation(
      fuelAdvances || DEFAULT_FUEL_ADVANCES,
      allTx,
      metrics.balance
    );
  }, [fuelAdvances, allTx, metrics.balance]);

  // Avances filtrées par station et recherche
  const filteredFuelAdvances = useMemo(() => {
    const list = fuelSummary.recentAdvances;
    return list.filter(adv => {
      if (fuelStationFilter !== "ALL" && adv.station !== fuelStationFilter) return false;
      if (fuelSearchQuery.trim()) {
        const q = fuelSearchQuery.toLowerCase();
        const matchStation = adv.station.toLowerCase().includes(q);
        const matchNotes = (adv.notes || "").toLowerCase().includes(q);
        const matchDate = adv.date.includes(q);
        if (!matchStation && !matchNotes && !matchDate) return false;
      }
      return true;
    });
  }, [fuelSummary.recentAdvances, fuelStationFilter, fuelSearchQuery]);

  // Handlers de gestion des avances carburant
  const handleOpenAddFuelAdvance = () => {
    setEditingFuelAdvance(null);
    setFuelFormDate(new Date().toISOString().slice(0, 10));
    setFuelFormAmount("4000000");
    setFuelFormStation("Shell San Pedro");
    setFuelFormPaymentMethod("Virement Bancaire");
    setFuelFormNotes("");
    setIsFuelModalOpen(true);
  };

  const handleOpenEditFuelAdvance = (adv: FuelAdvance) => {
    setEditingFuelAdvance(adv);
    setFuelFormDate(adv.date);
    setFuelFormAmount(String(adv.amount));
    setFuelFormStation(adv.station);
    setFuelFormPaymentMethod(adv.paymentMethod || "Virement Bancaire");
    setFuelFormNotes(adv.notes || "");
    setIsFuelModalOpen(true);
  };

  const handleSaveFuelAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setFuelAdvances) return;
    const amt = parseFloat(fuelFormAmount.replace(/\s/g, '')) || 0;
    if (amt <= 0) return;

    if (editingFuelAdvance) {
      setFuelAdvances(prev => (prev || DEFAULT_FUEL_ADVANCES).map(item => {
        if (item.id === editingFuelAdvance.id) {
          return {
            ...item,
            date: fuelFormDate,
            amount: amt,
            station: fuelFormStation.trim() || "Shell San Pedro",
            paymentMethod: fuelFormPaymentMethod,
            notes: fuelFormNotes.trim()
          };
        }
        return item;
      }));
    } else {
      const newAdv: FuelAdvance = {
        id: `adv-manual-${Date.now()}`,
        date: fuelFormDate,
        amount: amt,
        station: fuelFormStation.trim() || "Shell San Pedro",
        paymentMethod: fuelFormPaymentMethod,
        notes: fuelFormNotes.trim(),
        source: "manual",
        status: "active"
      };
      setFuelAdvances(prev => [newAdv, ...(prev || DEFAULT_FUEL_ADVANCES)]);
    }
    setIsFuelModalOpen(false);
  };

  const handleDeleteFuelAdvance = (id: string) => {
    if (!setFuelAdvances) return;
    if (window.confirm(isEn ? "Are you sure you want to delete this fuel advance?" : "Confirmer la suppression de cette avance carburant ?")) {
      setFuelAdvances(prev => (prev || DEFAULT_FUEL_ADVANCES).filter(a => a.id !== id));
    }
  };

  const handleExportFuelDrawdownCSV = () => {
    const headers = ["Date", "Station", "Commentaire / Ravitaillement", "Montant Carburant du Jour (CFA)", "Solde Avance Restant (CFA)", "Statut"];
    const rows = fuelSummary.dailyDrawdownLedger.map(log => [
      `"${log.date}"`,
      `"${fuelSummary.activeStation}"`,
      `"${(log.comment || '').replace(/"/g, '""')}"`,
      log.amount,
      log.remainingAdvanceBalance,
      `"${log.status === 'covered' ? 'Couvert' : log.status === 'low_credit' ? 'Crédit Faible' : 'Dépassement / Reste à payer'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `decompte_carburant_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Données mensuelles Recharts
  const monthlyChartData = useMemo(() => {
    const map = new Map<string, { monthKey: string; label: string; in: number; out: number; net: number }>();
    
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const key = t.date.slice(0, 7);
      if (!map.has(key)) {
        const [yr, mo] = key.split("-");
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
        const label = `${monthNames[parseInt(mo, 10) - 1]} ${yr?.slice(2) || ''}`;
        map.set(key, { monthKey: key, label, in: 0, out: 0, net: 0 });
      }
      const entry = map.get(key)!;
      if (t.type === "in") {
        entry.in += t.amount;
      } else {
        entry.out += t.amount;
      }
      entry.net = entry.in - entry.out;
    });

    return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredTransactions]);

  // Export CSV Grand Livre Spreedsheet
  const handleExportCSV = () => {
    const headers = ["Date ISO", "Date Brute", "Sens Flux", "Categorie", "Montant (CFA)", "Solde Apres Operation (CFA)", "Libelle / Commentaire", "Lien Google Drive"];
    const rows = filteredTransactions.map(t => [
      `"${t.date}"`,
      `"${t.rawDate || t.date}"`,
      `"${t.type === 'in' ? 'ENTREE (+)' : 'DEPENSE (-)'}"`,
      `"${t.category}"`,
      t.amount,
      t.balance || "",
      `"${(t.comment || '').replace(/"/g, '""')}"`,
      `"${t.driveLink || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `grand_livre_spreedsheet_${selectedYear}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ajout manuel d'une écriture comptable
  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const amt = parseFloat(newTxAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Veuillez saisir un montant valide.");
      return;
    }

    const payload: AccountingTransaction = {
      id: `manual-tx-${Date.now()}`,
      date: newTxDate,
      rawDate: newTxDate,
      type: newTxType,
      category: newTxCategory as AccountingCategory,
      amount: amt,
      isCredit: newTxType === "in",
      comment: newTxComment.trim() || (newTxType === "in" ? "Encaissement Manuel" : "Dépense Manuelle"),
      driveLink: newTxDriveLink.trim() || null,
      balance: metrics.balance + (newTxType === "in" ? amt : -amt),
      sourceRow: 9999,
      month: new Date(newTxDate).getMonth() + 1,
      year: new Date(newTxDate).getFullYear()
    };

    if (setTransactions) {
      setTransactions(prev => [payload, ...(prev || [])]);
    }

    setIsNewTxModalOpen(false);
    setNewTxAmount("");
    setNewTxComment("");
    setNewTxDriveLink("");
  };

  const handleDeleteTx = (id: string) => {
    if (!canWrite) return;
    if (confirm("Supprimer cette écriture comptable ?")) {
      if (setTransactions) {
        setTransactions(prev => (prev || []).filter(item => item.id !== id));
      }
    }
  };

  // ==========================================
  // PARTIE 2 : FACTURES CLIENTS (AU TONNAGE)
  // ==========================================
  const safeInvoices = invoices && invoices.length > 0 ? invoices : INITIAL_INVOICES;

  const [invoiceYear, setInvoiceYear] = useState<string>("ALL");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("ALL");
  const [invoiceClient, setInvoiceClient] = useState<string>("ALL");
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Formulaire facture
  const [formNumber, setFormNumber] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState("");
  const [formPeriod, setFormPeriod] = useState("");
  const [formTonnage, setFormTonnage] = useState("");
  const [formRate, setFormRate] = useState("15000");
  const [formTotal, setFormTotal] = useState("");
  const [formPaid, setFormPaid] = useState("0");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Virement bancaire");
  const [formNotes, setFormNotes] = useState("");
  const [formDriveLink, setFormDriveLink] = useState("");

  function getInvoiceStatus(inv: Invoice): "paid" | "partial" | "pending" | "overdue" {
    const total = inv.totalAmount || 0;
    const paid = inv.paidAmount || 0;
    const remaining = total - paid;
    if (remaining <= 0 && total > 0) return "paid";
    if (paid > 0 && remaining > 0) return "partial";
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) return "overdue";
    }
    return "pending";
  }

  const invoiceMetrics = useMemo(() => {
    let totalBudget = 0;
    let totalTonnage = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;

    safeInvoices.forEach(inv => {
      const tot = inv.totalAmount || 0;
      const pd = inv.paidAmount || 0;
      const rem = Math.max(0, tot - pd);
      const st = getInvoiceStatus(inv);

      totalBudget += tot;
      totalTonnage += inv.tonnage || 0;
      totalPaid += pd;
      totalRemaining += rem;
      if (st === "overdue") overdueCount += 1;
    });

    const recoveryRate = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0;
    return { totalBudget, totalTonnage, totalPaid, totalRemaining, overdueCount, recoveryRate, count: safeInvoices.length };
  }, [safeInvoices]);

  const filteredInvoices = useMemo(() => {
    return safeInvoices.filter(inv => {
      const yr = inv.date ? inv.date.slice(0, 4) : "";
      const st = getInvoiceStatus(inv);

      if (invoiceYear !== "ALL" && yr !== invoiceYear) return false;
      if (invoiceStatus !== "ALL" && st !== invoiceStatus) return false;
      if (invoiceClient !== "ALL" && inv.client !== invoiceClient) return false;

      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchClient = inv.client?.toLowerCase().includes(q);
        const matchNotes = inv.notes?.toLowerCase().includes(q);
        if (!matchNum && !matchClient && !matchNotes) return false;
      }
      return true;
    });
  }, [safeInvoices, invoiceYear, invoiceStatus, invoiceClient, invoiceSearch]);

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    const payload: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv-${Date.now()}`,
      invoiceNumber: formNumber.trim() || `FAC-${Date.now()}`,
      client: formClient.trim() || "Client",
      date: formDate,
      dueDate: formDueDate,
      period: formPeriod.trim(),
      tonnage: parseFloat(formTonnage) || 0,
      ratePerTon: parseFloat(formRate) || undefined,
      totalAmount: parseFloat(formTotal) || 0,
      paidAmount: parseFloat(formPaid) || 0,
      paymentMethod: formPaymentMethod,
      notes: formNotes.trim(),
      driveLink: formDriveLink.trim() || undefined,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString()
    };

    if (setInvoices) {
      if (editingInvoice) {
        setInvoices(prev => (prev || []).map(item => item.id === editingInvoice.id ? payload : item));
      } else {
        setInvoices(prev => [payload, ...(prev || [])]);
      }
    }
    setIsInvoiceModalOpen(false);
  };

  const handleExportInvoicesCSV = () => {
    const headers = ["N° Facture", "Client", "Date", "Echeance", "Periode", "Tonnage (T)", "Total Facture (CFA)", "Paye (CFA)", "Reste a Payer (CFA)", "Statut", "Lien Drive"];
    const rows = filteredInvoices.map(inv => {
      const rem = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
      const st = getInvoiceStatus(inv);
      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.client}"`,
        `"${inv.date}"`,
        `"${inv.dueDate || ''}"`,
        `"${inv.period || ''}"`,
        inv.tonnage || 0,
        inv.totalAmount || 0,
        inv.paidAmount || 0,
        rem,
        `"${st}"`,
        `"${inv.driveLink || ''}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `factures_clients_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* HEADER SECTION & BANNIÈRE SÉLECTEUR DE VUE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-[#10B981]/20 via-[#00F2FF]/10 to-transparent border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-lg shadow-[#10B981]/10">
              <Receipt className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {isEn ? "Accounting & Fleet Cash Flow" : "Comptabilité & Trésorerie Flotte"}
                </h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  <span className="size-1.5 rounded-full bg-[#10B981] animate-ping" />
                  {isEn ? "'Spreedsheet' Sheet Connected" : "Feuille 'Spreedsheet' Connectée"}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                {isEn 
                  ? `Semantic cash flow ledger (${allTx.length} flows) & client tonnage billing` 
                  : `Grand livre sémantique de trésorerie (${allTx.length} flux) et facturation clients au tonnage`}
              </p>
            </div>
          </div>
        </div>

        {/* SWITCHER DE VUES ENTRE GRAND LIVRE SPREEDSHEET ET FACTURES */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
            <button
              onClick={() => setViewTab("spreedsheet")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewTab === "spreedsheet"
                  ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg shadow-[#10B981]/25'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="size-3.5" />
              <span>{isEn ? `Spreedsheet Ledger (${allTx.length})` : `Grand Livre Spreedsheet (${allTx.length})`}</span>
            </button>

            <button
              onClick={() => setViewTab("invoices")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewTab === "invoices"
                  ? 'bg-gradient-to-r from-[#CF5D56] to-[#b34842] text-white shadow-lg shadow-[#CF5D56]/25'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Receipt className="size-3.5" />
              <span>{isEn ? `Client Invoices (${safeInvoices.length})` : `Factures Clients (${safeInvoices.length})`}</span>
            </button>

            <button
              onClick={() => setViewTab("fuel_advances")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                viewTab === "fuel_advances"
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg shadow-amber-500/25 font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Fuel className="size-3.5 text-amber-400" />
              <span>{t?.fuelAdvancesTab || (isEn ? `Fuel Prepayments (${fuelSummary.recentAdvances.length})` : `Dépôts Carburant (${fuelSummary.recentAdvances.length})`)}</span>
            </button>
          </div>

          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title={isEn ? "Sync with Google Sheets" : "Synchroniser avec Google Sheets"}
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin text-[#00F2FF]' : ''}`} />
              <span>{isSyncing ? (isEn ? "Syncing..." : "Synchro...") : (isEn ? "Refresh" : "Actualiser")}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : GRAND LIVRE SPREEDSHEET (650 FLUX AVEC ANALYSE SÉMANTIQUE)        */}
      {/* ========================================================================= */}
      {viewTab === "spreedsheet" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 4 TOP KPI CARDS SPREEDSHEET */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* CARD 1: TOTAL ENTRÉES RÉELLES */}
            <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#10B981]/10 transition-all"></div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {isEn ? "Total Real Inflows" : "Total Entrées Réelles"}
                </span>
                <div className="size-8 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center text-[#10B981]">
                  <ArrowDownRight className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-black tracking-tight text-[#10B981]">{formatMoney(metrics.totalIn)}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Client Payments & Withholdings" : "Paiements Clients & Retenues"}</span>
                  <span className="font-bold text-white/80">
                    {filteredTransactions.filter(t => t.type === 'in').length} {isEn ? "inflows" : "encaissements"}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: TOTAL DÉPENSES RÉELLES */}
            <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#CF5D56]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#CF5D56]/10 transition-all"></div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {isEn ? "Total Real Expenses" : "Total Dépenses Réelles"}
                </span>
                <div className="size-8 rounded-xl bg-[#CF5D56]/10 border border-[#CF5D56]/25 flex items-center justify-center text-[#CF5D56]">
                  <ArrowUpRight className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-black tracking-tight text-[#CF5D56]">{formatMoney(metrics.totalOut)}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Fuel, Salaries, Parts" : "Carburant, Salaires, Pièces"}</span>
                  <span className="font-bold text-white/80">
                    {filteredTransactions.filter(t => t.type === 'out').length} {isEn ? "outflows" : "décaissements"}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: RÉSULTAT NET DE TRÉSORERIE */}
            <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 ${metrics.net >= 0 ? 'bg-[#00F2FF]/5' : 'bg-red-500/5'} rounded-full blur-3xl pointer-events-none`}></div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {isEn ? "Net Cash Flow" : "Flux Net de Trésorerie"}
                </span>
                <div className={`size-8 rounded-xl ${metrics.net >= 0 ? 'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/25' : 'bg-red-500/10 text-red-400 border-red-500/25'} border flex items-center justify-center`}>
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-2xl lg:text-3xl font-black tracking-tight ${metrics.net >= 0 ? 'text-[#00F2FF]' : 'text-red-400'}`}>
                  {metrics.net >= 0 ? `+${formatMoney(metrics.net)}` : formatMoney(metrics.net)}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Coverage Margin" : "Marge de couverture"}</span>
                  <span className="font-black text-white/80">{metrics.ratio.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* CARD 4: SOLDE DE TRÉSORERIE ACTUEL & VENTILATION DÉPÔT CARBURANT */}
            <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F59E0B]/10 transition-all"></div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {isEn ? "Last Balance (CASH)" : "Dernier Solde (BALANCE)"}
                </span>
                <div className="size-8 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B]">
                  <Building2 className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl lg:text-3xl font-black tracking-tight text-white">{formatMoney(metrics.balance)}</p>
                  <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
                    {isEn ? "Gross Balance" : "Solde Brut"}
                  </span>
                </div>

                {/* VENTILATION DÉPÔT CARBURANT / NET DISPONIBLE */}
                <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1 text-xs">
                  {fuelSummary.currentDepositBalance > 0 ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <Fuel className="size-3" /> {isEn ? "incl. fuel deposit:" : "dont dépôt carburant :"}
                      </span>
                      <span className="font-bold text-amber-300">-{formatMoney(fuelSummary.fuelDepositCommitted)}</span>
                    </div>
                  ) : fuelSummary.totalAmountDue > 0 ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-red-400 font-medium flex items-center gap-1">
                        <Fuel className="size-3" /> {isEn ? "Due to fuel station:" : "Dette station à régler :"}
                      </span>
                      <span className="font-bold text-red-400">-{formatMoney(fuelSummary.totalAmountDue)}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[#00F2FF] font-black text-xs flex items-center gap-1">
                      <Wallet className="size-3" /> {isEn ? "Net Free Cash:" : "Cash Libre Réel :"}
                    </span>
                    <span className="font-black text-[#00F2FF] text-sm">
                      {formatMoney(fuelSummary.netAvailableCash)}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/50">
                  <button
                    onClick={() => setViewTab("fuel_advances")}
                    className="text-amber-400 hover:text-amber-300 font-bold underline decoration-amber-400/30 flex items-center gap-0.5 transition-colors"
                  >
                    <span>{isEn ? "Inspect prepayments →" : "Détails dépôts →"}</span>
                  </button>
                  <span className="font-bold text-white/60 flex items-center gap-1">
                    <Check className="size-3 text-emerald-400" /> {isEn ? "Certified" : "Certifié"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* VISUAL ANALYTICS & RÉPARTITIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GRAPHIQUE CASHFLOW MENSUEL */}
            <div className="lg:col-span-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <BarChart2 className="size-4 text-[#00F2FF]" />
                    {isEn ? "Monthly Cash Flow Evolution" : "Évolution Mensuelle des Flux de Trésorerie"}
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {isEn ? "Comparison of operational inflows vs outflows" : "Comparatif des encaissements vs décaissements opérationnels"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-[#10B981]">
                    <span className="size-2 rounded-full bg-[#10B981]"></span> {isEn ? "Inflows" : "Entrées"}
                  </span>
                  <span className="flex items-center gap-1.5 text-[#CF5D56]">
                    <span className="size-2 rounded-full bg-[#CF5D56]"></span> {isEn ? "Expenses" : "Dépenses"}
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="rgba(255,255,255,0.4)" 
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} 
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.4)" 
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} 
                      tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#181818", 
                        borderColor: "rgba(255,255,255,0.15)", 
                        borderRadius: "12px", 
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                        fontSize: "12px"
                      }}
                      formatter={(val: any, name: any) => [
                        formatMoney(val), 
                        name === "in" ? (isEn ? "Inflows (+)" : "Entrées (+)") : (isEn ? "Expenses (-)" : "Dépenses (-)")
                      ]}
                      labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: "4px" }}
                    />
                    <Bar dataKey="in" name="in" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="out" name="out" fill="#CF5D56" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TOP DÉPENSES PAR CATÉGORIE */}
            <div className="lg:col-span-4 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <PieIcon className="size-4 text-[#F59E0B]" />
                    {isEn ? "Top Expenses by Category" : "Top Dépenses par Catégorie"}
                  </h2>
                  <span className="text-[10px] font-bold text-white/40">
                    {isEn ? "Click to filter" : "Cliquez pour filtrer"}
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
                  {availableCategories
                    .filter(c => c.type === "out")
                    .slice(0, 6)
                    .map((cat, idx) => {
                      const percent = metrics.totalOut > 0 ? (cat.total / metrics.totalOut) * 100 : 0;
                      const style = CATEGORY_STYLES[cat.name] || CATEGORY_STYLES["Charges Générales & Divers"];
                      const isSelected = selectedCategory === cat.name;

                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedCategory(isSelected ? "ALL" : cat.name)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#00F2FF] bg-[#00F2FF]/10 shadow-lg shadow-[#00F2FF]/5' 
                              : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-white/80 truncate max-w-[160px] flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ backgroundColor: style.color }}></span>
                              {translateCategory(cat.name, language)}
                            </span>
                            <span className="font-black text-white text-[11px]">{formatMoney(cat.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, percent)}%`, backgroundColor: style.color }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-white/40 min-w-[32px] text-right">{percent.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {selectedCategory !== "ALL" && (
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className="mt-3 w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] font-bold transition-all text-center"
                >
                  {isEn ? "Reset category filter" : "Réinitialiser le filtre de catégorie"}
                </button>
              )}
            </div>
          </div>

          {/* BARRE DE FILTRAGE SPREEDSHEET */}
          <div className="rounded-[24px] border border-white/8 bg-[#141414] p-4 lg:p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Années */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
                <button
                  onClick={() => setSelectedYear("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    selectedYear === "ALL" ? 'bg-[#00F2FF] text-black shadow-md shadow-[#00F2FF]/20' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isEn ? "All Years" : "Toutes Années"}
                </button>
                {availableYears.map(yr => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      selectedYear === yr ? 'bg-[#00F2FF] text-black shadow-md shadow-[#00F2FF]/20' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>

              {/* Type : Tous / Entrées / Dépenses */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
                <button
                  onClick={() => setSelectedType("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedType === "ALL" ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isEn ? "All Flows" : "Tous les Flux"}
                </button>
                <button
                  onClick={() => setSelectedType("in")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedType === "in" ? 'bg-[#10B981] text-black' : 'text-[#10B981] hover:bg-[#10B981]/10'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current"></span>
                  {isEn ? "Inflows Only" : "Entrées Seules"}
                </button>
                <button
                  onClick={() => setSelectedType("out")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedType === "out" ? 'bg-[#CF5D56] text-white' : 'text-[#CF5D56] hover:bg-[#CF5D56]/10'
                  }`}
                >
                  <span className="size-1.5 rounded-full bg-current"></span>
                  {isEn ? "Expenses Only" : "Dépenses Seules"}
                </button>
              </div>

              {/* Filtre Justificatifs Drive uniquement */}
              <button
                onClick={() => setOnlyDriveReceipts(!onlyDriveReceipts)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  onlyDriveReceipts 
                    ? 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-lg shadow-[#3B82F6]/20' 
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <FolderOpen className="size-3.5" />
                <span>{isEn ? "Drive Receipts" : "Justificatifs Drive"}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">
                  {metrics.driveCount}
                </span>
              </button>
            </div>

            {/* Ligne 2 : Mois + Catégories + Recherche */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                >
                  <option value="ALL">{isEn ? "All months (1 to 12)" : "Tous les mois (1 à 12)"}</option>
                  <option value="1">{isEn ? "January" : "Janvier"}</option>
                  <option value="2">{isEn ? "February" : "Février"}</option>
                  <option value="3">{isEn ? "March" : "Mars"}</option>
                  <option value="4">{isEn ? "April" : "Avril"}</option>
                  <option value="5">{isEn ? "May" : "Mai"}</option>
                  <option value="6">{isEn ? "June" : "Juin"}</option>
                  <option value="7">{isEn ? "July" : "Juillet"}</option>
                  <option value="8">{isEn ? "August" : "Août"}</option>
                  <option value="9">{isEn ? "September" : "Septembre"}</option>
                  <option value="10">{isEn ? "October" : "Octobre"}</option>
                  <option value="11">{isEn ? "November" : "Novembre"}</option>
                  <option value="12">{isEn ? "December" : "Décembre"}</option>
                </select>
              </div>

              <div className="lg:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                >
                  <option value="ALL">
                    {isEn 
                      ? `All categories (${availableCategories.length})` 
                      : `Toutes les catégories (${availableCategories.length})`}
                  </option>
                  <optgroup label={isEn ? "Cash Inflows" : "Entrées d'argent"}>
                    {availableCategories.filter(c => c.type === 'in').map(c => (
                      <option key={c.name} value={c.name}>
                        {translateCategory(c.name, language)} ({c.count} {isEn ? "ops" : "op."} - {formatMoney(c.total)})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={isEn ? "Expenses & Charges" : "Dépenses & Charges"}>
                    {availableCategories.filter(c => c.type === 'out').map(c => (
                      <option key={c.name} value={c.name}>
                        {translateCategory(c.name, language)} ({c.count} {isEn ? "ops" : "op."} - {formatMoney(c.total)})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="lg:col-span-5 relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder={isEn ? "Search by keyword, date, amount, comment..." : "Rechercher par mot-clé, date, montant, commentaire..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-medium focus:outline-none focus:border-[#00F2FF]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/40 pt-1 border-t border-white/5">
              <span>
                {isEn 
                  ? `${filteredTransactions.length} transaction(s) displayed` 
                  : `${filteredTransactions.length} écriture(s) affichée(s)`}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="text-white/60 hover:text-white font-bold flex items-center gap-1"
                >
                  <Download className="size-3" /> {isEn ? "Export CSV" : "Exporter CSV"}
                </button>
                {canWrite && (
                  <button
                    onClick={() => setIsNewTxModalOpen(true)}
                    className="text-[#10B981] hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="size-3" /> {isEn ? "New Entry" : "Nouvelle Écriture"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLEAU GRAND LIVRE COMPTABLE */}
          <div className="rounded-[28px] border border-white/8 bg-[#181818] shadow-2xl overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-white/8 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FileText className="size-5 text-[#10B981]" />
                  {isEn ? "General Ledger • 'Spreedsheet' Tab" : "Grand Livre des Écritures • Feuille 'Spreedsheet'"}
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  {isEn 
                    ? "Bank and operational flows with semantic comment analysis & certified balances" 
                    : "Flux bancaires et opérationnels avec analyse sémantique des commentaires et soldes certifiés"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/50">{isEn ? "Sort:" : "Trier:"}</span>
                <button
                  onClick={() => {
                    if (sortField === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortField("date"); setSortOrder("desc"); }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    sortField === "date" ? 'bg-white/10 text-white border-white/20' : 'text-white/40 border-transparent hover:text-white'
                  }`}
                >
                  {isEn ? "Date" : "Date"} {sortField === "date" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => {
                    if (sortField === "amount") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortField("amount"); setSortOrder("desc"); }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    sortField === "amount" ? 'bg-white/10 text-white border-white/20' : 'text-white/40 border-transparent hover:text-white'
                  }`}
                >
                  {isEn ? "Amount" : "Montant"} {sortField === "amount" && (sortOrder === "desc" ? "↓" : "↑")}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="py-3 px-4">{isEn ? "Date" : "Date"}</th>
                    <th className="py-3 px-4">{isEn ? "Flow" : "Flux"}</th>
                    <th className="py-3 px-4">{isEn ? "Category" : "Catégorie"}</th>
                    <th className="py-3 px-4">{isEn ? "Description / Comment (Spreedsheet)" : "Libellé / Commentaire (Spreedsheet)"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Amount (CFA)" : "Montant (CFA)"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Cash Balance" : "Solde Caisse"}</th>
                    <th className="py-3 px-4 text-center">{isEn ? "Receipt" : "Justificatif"}</th>
                    {canWrite && <th className="py-3 px-4 text-center">{isEn ? "Action" : "Action"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-white/40 font-bold">
                        {isEn ? "No accounting records match the selected criteria." : "Aucune écriture comptable ne correspond aux critères sélectionnés."}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const style = CATEGORY_STYLES[tx.category] || CATEGORY_STYLES["Charges Générales & Divers"];
                      const Icon = style.icon || FileText;

                      return (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Date */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-white/90">{tx.date}</div>
                            {tx.rawDate && tx.rawDate !== tx.date && (
                              <div className="text-[10px] text-white/40 truncate max-w-[130px]" title={tx.rawDate}>
                                {tx.rawDate}
                              </div>
                            )}
                          </td>

                          {/* Sens */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {tx.type === "in" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                                <ArrowDownRight className="size-3" /> {isEn ? "INFLOW" : "ENTRÉE"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#CF5D56]/15 text-[#CF5D56] border border-[#CF5D56]/30">
                                <ArrowUpRight className="size-3" /> {isEn ? "EXPENSE" : "DÉPENSE"}
                              </span>
                            )}
                          </td>

                          {/* Catégorie */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span 
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                              style={{ 
                                color: style.color, 
                                backgroundColor: style.bg, 
                                borderColor: style.border 
                              }}
                            >
                              <Icon className="size-3" />
                              <span>{translateCategory(tx.category, language)}</span>
                            </span>
                          </td>

                          {/* Commentaire */}
                          <td className="py-3 px-4">
                            <div className="text-white/80 font-medium max-w-[340px] truncate" title={tx.comment}>
                              {tx.comment ? translateComment(tx.comment, language) : <span className="text-white/20 italic">{isEn ? "No comment" : "Sans commentaire"}</span>}
                            </div>
                          </td>

                          {/* Montant */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-black text-sm ${tx.type === 'in' ? 'text-[#10B981]' : 'text-[#CF5D56]'}`}>
                              {tx.type === 'in' ? `+${formatMoney(tx.amount)}` : `-${formatMoney(tx.amount)}`}
                            </span>
                          </td>

                          {/* Solde */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {tx.balance ? (
                              <span className="font-mono text-white/50 text-xs">
                                {formatMoney(tx.balance)}
                              </span>
                            ) : (
                              <span className="text-white/20">-</span>
                            )}
                          </td>

                          {/* Justificatif Drive */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {tx.driveLink ? (
                              <button
                                onClick={() => setPreviewDoc({
                                  title: tx.comment || tx.category,
                                  date: tx.date,
                                  amount: tx.amount,
                                  category: tx.category,
                                  comment: tx.comment,
                                  driveLink: tx.driveLink!
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] border border-[#3B82F6]/30 text-[11px] font-bold transition-all shadow-sm active:scale-95"
                                title={isEn ? "View invoice or Drive receipt" : "Voir la facture ou le reçu Drive"}
                              >
                                <Eye className="size-3" />
                                <span>{isEn ? "View Receipt" : "Voir Justificatif"}</span>
                              </button>
                            ) : (
                              <span className="text-white/20 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Action */}
                          {canWrite && (
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {tx.id.startsWith("manual-") ? (
                                <button
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="size-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all mx-auto"
                                  title={isEn ? "Delete" : "Supprimer"}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              ) : (
                                <span className="text-white/20 text-[10px]" title="Synchronisé depuis Google Sheets">Spreedsheet</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : FACTURES CLIENTS (AU TONNAGE GLOBAL)                               */}
      {/* ========================================================================= */}
      {viewTab === "invoices" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 4 CARDS KPIS FACTURATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isEn ? "Total Invoiced Budget" : "Budget Total Facturé"}
              </span>
              <p className="text-2xl lg:text-3xl font-black text-white mt-2">{formatMoney(invoiceMetrics.totalBudget)}</p>
              <p className="text-xs text-white/50 mt-1 font-bold">
                {formatTon(invoiceMetrics.totalTonnage)} {isEn ? "transported" : "transportées"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isEn ? "Total Actually Paid" : "Total Réellement Payé"}
              </span>
              <p className="text-2xl lg:text-3xl font-black text-[#10B981] mt-2">{formatMoney(invoiceMetrics.totalPaid)}</p>
              <p className="text-xs text-white/50 mt-1 font-bold">
                {invoiceMetrics.recoveryRate.toFixed(1)}% {isEn ? "collected" : "d'encaissement"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isEn ? "Outstanding Balance (Receivables)" : "Reste à Payer (Créance)"}
              </span>
              <p className="text-2xl lg:text-3xl font-black text-[#CF5D56] mt-2">{formatMoney(invoiceMetrics.totalRemaining)}</p>
              <p className="text-xs text-white/50 mt-1 font-bold">
                {isEn ? "Pending client balances" : "Reliquats clients en attente"}
              </p>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isEn ? "Overdue Invoices" : "Factures en Retard"}
              </span>
              <p className={`text-2xl lg:text-3xl font-black mt-2 ${invoiceMetrics.overdueCount > 0 ? 'text-[#EF4444]' : 'text-white'}`}>
                {invoiceMetrics.overdueCount}
              </p>
              <p className="text-xs text-white/50 mt-1 font-bold">
                {isEn ? "Past due date" : "Échéance dépassée"}
              </p>
            </div>
          </div>

          {/* BARRE DE RECHERCHE ET ACTIONS FACTURES */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#141414] border border-white/8">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  placeholder={isEn ? "Search invoice..." : "Rechercher facture..."}
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none"
                />
              </div>
              <select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold"
              >
                <option value="ALL">{isEn ? "All statuses" : "Tous statuts"}</option>
                <option value="paid">{isEn ? "Paid" : "Payées"}</option>
                <option value="partial">{isEn ? "Partial" : "Partielles"}</option>
                <option value="pending">{isEn ? "Pending" : "En attente"}</option>
                <option value="overdue">{isEn ? "Overdue" : "En retard"}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInvoicesCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold"
              >
                <Download className="size-3.5" /> {isEn ? "Export CSV" : "Exporter CSV"}
              </button>
              {canWrite && (
                <button
                  onClick={() => {
                    setEditingInvoice(null);
                    setFormNumber(`FAC-${Date.now().toString().slice(-4)}`);
                    setFormClient("CIMAF");
                    setFormTonnage("1000");
                    setFormRate("15000");
                    setFormTotal("15000000");
                    setFormPaid("0");
                    setIsInvoiceModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CF5D56] text-white text-xs font-black uppercase"
                >
                  <Plus className="size-3.5" /> {isEn ? "New Invoice" : "Nouvelle Facture"}
                </button>
              )}
            </div>
          </div>

          {/* TABLEAU DES FACTURES CLIENTS */}
          <div className="rounded-[28px] border border-white/8 bg-[#181818] shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="py-3 px-4">{isEn ? "Invoice #" : "N° Facture"}</th>
                    <th className="py-3 px-4">{isEn ? "Client" : "Client"}</th>
                    <th className="py-3 px-4">{isEn ? "Date" : "Date"}</th>
                    <th className="py-3 px-4">{isEn ? "Due Date" : "Échéance"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Tonnage" : "Tonnage"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Total Invoiced" : "Total Facturé"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Paid" : "Payé"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Remaining" : "Reste à Payer"}</th>
                    <th className="py-3 px-4 text-center">{isEn ? "Status" : "Statut"}</th>
                    <th className="py-3 px-4 text-center">{isEn ? "Receipt" : "Justificatif"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredInvoices.map((inv) => {
                    const status = getInvoiceStatus(inv);
                    const remaining = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));

                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 font-bold text-white/90">{inv.client}</td>
                        <td className="py-3 px-4 text-white/60">{inv.date}</td>
                        <td className="py-3 px-4 text-white/60">{inv.dueDate || '-'}</td>
                        <td className="py-3 px-4 text-right font-bold text-white/80">{formatTon(inv.tonnage)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">{formatMoney(inv.totalAmount)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#10B981]">{formatMoney(inv.paidAmount)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#CF5D56]">{formatMoney(remaining)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            status === "paid" ? 'bg-[#10B981]/20 text-[#10B981]' :
                            status === "partial" ? 'bg-[#00F2FF]/20 text-[#00F2FF]' :
                            status === "overdue" ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'
                          }`}>
                            {translateStatus(status, language)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {inv.driveLink ? (
                            <button
                              onClick={() => setPreviewDoc({
                                title: inv.invoiceNumber,
                                date: inv.date,
                                amount: inv.totalAmount,
                                category: isEn ? "Client Invoice" : "Facture Client",
                                comment: inv.notes || inv.client,
                                driveLink: inv.driveLink!
                              })}
                              className="px-2 py-1 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 text-[#3B82F6] font-bold text-[10px]"
                            >
                              {isEn ? "Preview" : "Aperçu"}
                            </button>
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : DÉPÔTS & AVANCES CARBURANT (DRAWDOWN & RÉCONCILIATION CASH)       */}
      {/* ========================================================================= */}
      {viewTab === "fuel_advances" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* BANDEAU TOP : 4 CARDS KPIS DÉPÔTS CARBURANT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* CARD 1: TOTAL AVANCES VERSÉES */}
            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {t?.totalAdvancesDeposited || (isEn ? "Total Advances Deposited" : "Total Avances Versées")}
                </span>
                <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <Fuel className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-black text-amber-400">{formatMoney(fuelSummary.totalAdvancesDeposited)}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Recorded prepayments" : "Paiements stations enregistrés"}</span>
                  <span className="font-bold text-white/80">
                    {fuelSummary.recentAdvances.length} {isEn ? "advances" : "avances"}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: CARBURANT CONSOMMÉ DÉCOMPTÉ */}
            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/10 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {t?.totalFuelConsumedDrawdown || (isEn ? "Fuel Consumed (Drawdown)" : "Carburant Consommé Décompté")}
                </span>
                <div className="size-8 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
                  <ArrowUpRight className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-black text-white">{formatMoney(fuelSummary.totalFuelConsumedAgainstAdvances)}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Fleet daily consumption" : "Conso journalière flotte"}</span>
                  <span className="font-bold text-orange-300">
                    ~{formatMoney(fuelSummary.burnRatePerDay)}/j
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: SOLDE RESTANT EN DÉPÔT / RESTE À RÉGLER */}
            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 ${fuelSummary.totalAmountDue > 0 ? 'bg-red-500/5' : 'bg-emerald-500/5'} rounded-full blur-3xl pointer-events-none group-hover:opacity-100 transition-all`} />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {fuelSummary.totalAmountDue > 0 
                    ? (t?.amountDueStation || (isEn ? "Amount Due to Station" : "Reste à Régler à la Station"))
                    : (t?.fuelDepositBalance || (isEn ? "Remaining Deposit Balance" : "Solde Dépôt Restant"))}
                </span>
                <div className={`size-8 rounded-xl ${fuelSummary.totalAmountDue > 0 ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'} border flex items-center justify-center`}>
                  {fuelSummary.totalAmountDue > 0 ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-2xl lg:text-3xl font-black ${fuelSummary.totalAmountDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {fuelSummary.totalAmountDue > 0 
                    ? `-${formatMoney(fuelSummary.totalAmountDue)}` 
                    : formatMoney(fuelSummary.currentDepositBalance)}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Estimated fuel coverage" : "Autonomie carburant"}</span>
                  <span className="font-bold text-amber-300">
                    {fuelSummary.estimatedDaysCoverage} {isEn ? "days" : "jours"}
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 4: TRÉSORERIE NETTE RÉELLE / NET FREE CASH */}
            <div className="rounded-[24px] border border-white/8 bg-[#181818] p-5 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00F2FF]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#00F2FF]/10 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                  {t?.netAvailableCash || (isEn ? "Net Available Free Cash" : "Cash Libre Réellement Disponible")}
                </span>
                <div className="size-8 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/25 flex items-center justify-center text-[#00F2FF]">
                  <Wallet className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl lg:text-3xl font-black text-[#00F2FF]">{formatMoney(fuelSummary.netAvailableCash)}</p>
                <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
                  <span>{isEn ? "Account minus deposit" : "Solde compte déduit du dépôt"}</span>
                  <span className="font-bold text-white/80">
                    {formatMoney(fuelSummary.grossCashBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BANDEAU PÉDAGOGIQUE RÉCONCILIATION CASH */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/3 to-[#00F2FF]/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {isEn ? "Treasury Reconciliation Principle" : "Principe de Réconciliation de Trésorerie"}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {isEn ? (
                    <>
                      Account Balance ({formatMoney(fuelSummary.grossCashBalance)}) − Immobilized Fuel Deposit ({formatMoney(fuelSummary.fuelDepositCommitted)}) = <strong className="text-[#00F2FF]">{formatMoney(fuelSummary.netAvailableCash)}</strong> Net Free Cash.
                    </>
                  ) : (
                    <>
                      Solde en Compte ({formatMoney(fuelSummary.grossCashBalance)}) − Dépôt Carburant Immobilisé ({formatMoney(fuelSummary.fuelDepositCommitted)}) = <strong className="text-[#00F2FF]">{formatMoney(fuelSummary.netAvailableCash)}</strong> de Cash Libre Réel.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleExportFuelDrawdownCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Download className="size-3.5" />
                <span>{isEn ? "Export Drawdown CSV" : "Exporter Décompte CSV"}</span>
              </button>
              {canWrite && (
                <button
                  onClick={handleOpenAddFuelAdvance}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <Plus className="size-3.5" />
                  <span>{isEn ? "+ New Fuel Advance" : "+ Nouveau Dépôt Avance"}</span>
                </button>
              )}
            </div>
          </div>

          {/* TABLEAU 1 : LISTE DES AVANCES ENREGISTRÉES */}
          <div className="rounded-[28px] border border-white/8 bg-[#181818] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Fuel className="size-4 text-amber-400" />
                  {isEn ? "Recorded Station Advances & Prepayments" : "Historique des Versements d'Avances Carburant"}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {isEn ? "Prepayments to fuel stations (Shell San Pedro, Total...)" : "Acomptes versés aux stations-service (Shell San Pedro, Total...)"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filtre Station */}
                <select
                  value={fuelStationFilter}
                  onChange={(e) => setFuelStationFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">{t?.allStations || (isEn ? "All Stations" : "Toutes les stations")}</option>
                  <option value="Shell San Pedro">Shell San Pedro</option>
                  <option value="Total">Total</option>
                  <option value="Petroci">Petroci</option>
                </select>

                {/* Recherche */}
                <div className="relative">
                  <Search className="size-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fuelSearchQuery}
                    onChange={(e) => setFuelSearchQuery(e.target.value)}
                    placeholder={isEn ? "Search advance, notes..." : "Rechercher avance, note..."}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-amber-400 w-48"
                  />
                </div>
              </div>
            </div>

            {/* TABLE DES AVANCES */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-white/40 text-[10px] uppercase font-black tracking-wider">
                    <th className="py-3 px-4">{isEn ? "Date" : "Date"}</th>
                    <th className="py-3 px-4">{isEn ? "Station" : "Station"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Advance Amount" : "Montant Avance"}</th>
                    <th className="py-3 px-4">{isEn ? "Payment Method" : "Règlement"}</th>
                    <th className="py-3 px-4">{isEn ? "Reference / Spreadsheet Note" : "Libellé / Note Spreedsheet"}</th>
                    <th className="py-3 px-4 text-center">{isEn ? "Source" : "Source"}</th>
                    {canWrite && <th className="py-3 px-4 text-center">{isEn ? "Actions" : "Actions"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredFuelAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/30 italic">
                        {isEn ? "No fuel advances match your filters." : "Aucune avance carburant ne correspond à vos critères."}
                      </td>
                    </tr>
                  ) : (
                    filteredFuelAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 px-4 text-white font-mono text-[11px] whitespace-nowrap">
                          {adv.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold text-[11px]">
                            {adv.station}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-amber-400 text-sm whitespace-nowrap">
                          {formatMoney(adv.amount)}
                        </td>
                        <td className="py-3 px-4 text-white/60 whitespace-nowrap">
                          {adv.paymentMethod || "Virement Bancaire"}
                        </td>
                        <td className="py-3 px-4 text-white/70 max-w-md truncate">
                          {adv.notes || (isEn ? "Fuel prepayment" : "Acompte carburant")}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adv.source === 'spreadsheet' 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {adv.source === 'spreadsheet' ? 'Spreedsheet' : 'Manuel'}
                          </span>
                        </td>
                        {canWrite && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditFuelAdvance(adv)}
                                className="size-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
                                title={isEn ? "Edit" : "Modifier"}
                              >
                                <Edit3 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFuelAdvance(adv.id)}
                                className="size-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                                title={isEn ? "Delete" : "Supprimer"}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLEAU 2 : GRAND LIVRE DU DÉCOMPTE JOURNALIER (DAILY FUEL DRAWDOWN LEDGER) */}
          <div className="rounded-[28px] border border-white/8 bg-[#181818] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="size-4 text-[#00F2FF]" />
                  {t?.fuelDrawdownLedger || (isEn ? "Daily Fuel Drawdown Ledger" : "Grand Livre du Décompte Journalier")}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {isEn 
                    ? "Deduction of daily truck fuel consumption from prepaid station deposits"
                    : "Déduction chronologique de chaque ravitaillement journalier sur l'avance en cours"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 font-bold">
                  {fuelSummary.dailyDrawdownLedger.length} {isEn ? "operations" : "ravitaillements"}
                </span>
              </div>
            </div>

            {/* TABLE DU DÉCOMPTE JOURNALIER */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#181818] z-10">
                  <tr className="border-b border-white/8 text-white/40 text-[10px] uppercase font-black tracking-wider">
                    <th className="py-3 px-4">{isEn ? "Date" : "Date"}</th>
                    <th className="py-3 px-4">{isEn ? "Truck Refuel / Note" : "Ravitaillement / Commentaire"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Fuel Consumed (CFA)" : "Gasoil Consommé (CFA)"}</th>
                    <th className="py-3 px-4 text-right">{isEn ? "Advance Balance" : "Solde de l'Avance"}</th>
                    <th className="py-3 px-4 text-center">{isEn ? "Status" : "Statut"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fuelSummary.dailyDrawdownLedger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/30 italic">
                        {isEn ? "No daily fuel logs recorded." : "Aucun ravitaillement journalier enregistré."}
                      </td>
                    </tr>
                  ) : (
                    fuelSummary.dailyDrawdownLedger.map((log) => (
                      <tr key={log.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 px-4 text-white font-mono text-[11px] whitespace-nowrap">
                          {log.date}
                        </td>
                        <td className="py-3 px-4 text-white/80 max-w-md truncate">
                          {log.comment || (isEn ? "Fleet Fuel Refuel" : "Ravitaillement Carburant Flotte")}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-orange-400 whitespace-nowrap">
                          -{formatMoney(log.amount)}
                        </td>
                        <td className={`py-3 px-4 text-right font-black text-sm whitespace-nowrap ${
                          log.remainingAdvanceBalance > 500000 
                            ? 'text-emerald-400' 
                            : log.remainingAdvanceBalance >= 0 
                            ? 'text-amber-400' 
                            : 'text-red-400'
                        }`}>
                          {formatMoney(log.remainingAdvanceBalance)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            log.status === 'covered'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : log.status === 'low_credit'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}>
                            {log.status === 'covered' 
                              ? (isEn ? "Covered" : "Couvert") 
                              : log.status === 'low_credit'
                              ? (isEn ? "Low Credit" : "Crédit Faible")
                              : (isEn ? "Overdrawn / Due" : "Dépassement / Reste à régler")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : VISUALISEUR JUSTIFICATIF GOOGLE DRIVE */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#161616] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FolderOpen className="size-4 text-[#3B82F6]" />
                  {isEn ? "Receipt • " : "Justificatif • "} {translateCategory(previewDoc.category, language)}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {isEn ? "Date: " : "Date : "} {previewDoc.date} • {isEn ? "Amount: " : "Montant : "} <span className="font-bold text-white">{formatMoney(previewDoc.amount)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                >
                  <ExternalLink className="size-3.5" /> {isEn ? "Open in Drive" : "Ouvrir dans Drive"}
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[420px] rounded-2xl bg-black/50 border border-white/5 overflow-hidden flex items-center justify-center relative">
              {getDriveEmbedUrl(previewDoc.driveLink) ? (
                <iframe
                  src={getDriveEmbedUrl(previewDoc.driveLink)!}
                  className="w-full h-full min-h-[420px] border-0"
                  allow="autoplay"
                  title={isEn ? "Google Drive Preview" : "Aperçu Google Drive"}
                />
              ) : (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="size-16 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] mx-auto">
                    <FolderOpen className="size-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      {isEn ? "Google Drive Folder" : "Dossier Google Drive"}
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      {isEn 
                        ? "This receipt is a folder containing accounting documents (invoices, receipts, vouchers). Click below to view it directly." 
                        : "Ce justificatif est un dossier contenant des pièces comptables (factures, reçus, bons). Cliquez ci-dessous pour le consulter directement."}
                    </p>
                  </div>
                  <a
                    href={previewDoc.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#3B82F6]/25"
                  >
                    <ExternalLink className="size-4" /> {isEn ? "View Complete Folder" : "Consulter le dossier complet"}
                  </a>
                </div>
              )}
            </div>

            {previewDoc.comment && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
                <span className="font-bold text-white/90">{isEn ? "Associated Comment:" : "Commentaire associé :"}</span> {translateComment(previewDoc.comment, language)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE ÉCRITURE GRAND LIVRE */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#181818] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="size-5 text-[#10B981]" />
                {isEn ? "Add Entry to General Ledger" : "Ajouter une Écriture au Grand Livre"}
              </h3>
              <button
                onClick={() => setIsNewTxModalOpen(false)}
                className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Flow Type" : "Type de Flux"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewTxType("out"); setNewTxCategory("Charges Générales & Divers"); }}
                    className={`py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                      newTxType === "out" ? 'bg-[#CF5D56] text-white border-[#CF5D56]' : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                  >
                    <ArrowUpRight className="size-4" /> {isEn ? "Expense (-)" : "Dépense (-)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewTxType("in"); setNewTxCategory("Paiements Clients & Factures"); }}
                    className={`py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                      newTxType === "in" ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                  >
                    <ArrowDownRight className="size-4" /> {isEn ? "Inflow (+)" : "Entrée (+)"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Transaction Date" : "Date de l'opération"}
                </label>
                <input
                  type="date"
                  required
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Accounting Category" : "Catégorie Comptable"}
                </label>
                <select
                  value={newTxCategory}
                  onChange={(e) => setNewTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                >
                  {newTxType === "in" ? (
                    <>
                      <option value="Paiements Clients & Factures">{translateCategory("Paiements Clients & Factures", language)}</option>
                      <option value="Remboursement Retenue (20%)">{translateCategory("Remboursement Retenue (20%)", language)}</option>
                      <option value="Apports & Avances Associés">{translateCategory("Apports & Avances Associés", language)}</option>
                      <option value="Régularisation / Rejet Chèque">{translateCategory("Régularisation / Rejet Chèque", language)}</option>
                    </>
                  ) : (
                    <>
                      <option value="Carburant (Gasoil)">{translateCategory("Carburant (Gasoil)", language)}</option>
                      <option value="Frais de Route & Péages">{translateCategory("Frais de Route & Péages", language)}</option>
                      <option value="Salaires & Rémunérations">{translateCategory("Salaires & Rémunérations", language)}</option>
                      <option value="Pneus & Train Roulant">{translateCategory("Pneus & Train Roulant", language)}</option>
                      <option value="Maintenance & Vidanges">{translateCategory("Maintenance & Vidanges", language)}</option>
                      <option value="Mécanique & Pièces de Rechange">{translateCategory("Mécanique & Pièces de Rechange", language)}</option>
                      <option value="Loyer & Logement Flotte">{translateCategory("Loyer & Logement Flotte", language)}</option>
                      <option value="Assurances Flotte">{translateCategory("Assurances Flotte", language)}</option>
                      <option value="Cartes de Transport & Régularisations">{translateCategory("Cartes de Transport & Régularisations", language)}</option>
                      <option value="Impôts & Taxes d’État">{translateCategory("Impôts & Taxes d’État", language)}</option>
                      <option value="Transport Urbain (Yango)">{translateCategory("Transport Urbain (Yango)", language)}</option>
                      <option value="Frais Bancaires & Wave">{translateCategory("Frais Bancaires & Wave", language)}</option>
                      <option value="GPS, Télécoms & Énergie">{translateCategory("GPS, Télécoms & Énergie", language)}</option>
                      <option value="Lavage & Entretien Flotte">{translateCategory("Lavage & Entretien Flotte", language)}</option>
                      <option value="Dépenses Personnelles">{translateCategory("Dépenses Personnelles", language)}</option>
                      <option value="Charges Générales & Divers">{translateCategory("Charges Générales & Divers", language)}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Amount in CFA" : "Montant en CFA"}
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 500000"
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm font-bold focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Description / Comment" : "Description / Commentaire"}
                </label>
                <textarea
                  rows={2}
                  placeholder={isEn ? "Ex: Maintenance invoice or collection..." : "Ex: Facture révision ou encaissement..."}
                  value={newTxComment}
                  onChange={(e) => setNewTxComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  {isEn ? "Google Drive Link (Optional)" : "Lien Google Drive (Optionnel)"}
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={newTxDriveLink}
                  onChange={(e) => setNewTxDriveLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs font-bold"
                >
                  {isEn ? "Cancel" : "Annuler"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#10B981]/25"
                >
                  {isEn ? "Save" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE FACTURE CLIENT */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#181818] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-base font-black text-white">
                {isEn ? "Add Client Invoice" : "Ajouter une Facture Client"}
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleSaveInvoice} className="space-y-3 text-xs">
              <div>
                <label className="text-white/40 font-bold block mb-1">{isEn ? "Invoice #" : "N° Facture"}</label>
                <input value={formNumber} onChange={(e) => setFormNumber(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
              </div>
              <div>
                <label className="text-white/40 font-bold block mb-1">{isEn ? "Client" : "Client"}</label>
                <input value={formClient} onChange={(e) => setFormClient(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Date" : "Date"}</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Due Date" : "Échéance"}</label>
                  <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Tonnage (T)" : "Tonnage (T)"}</label>
                  <input type="number" value={formTonnage} onChange={(e) => {
                    setFormTonnage(e.target.value);
                    const t = parseFloat(e.target.value) || 0;
                    const r = parseFloat(formRate) || 0;
                    setFormTotal(String(Math.round(t * r)));
                  }} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Rate/Ton (CFA)" : "Taux/Tonne (CFA)"}</label>
                  <input type="number" value={formRate} onChange={(e) => {
                    setFormRate(e.target.value);
                    const r = parseFloat(e.target.value) || 0;
                    const t = parseFloat(formTonnage) || 0;
                    setFormTotal(String(Math.round(t * r)));
                  }} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Total Invoiced (CFA)" : "Total Facturé (CFA)"}</label>
                  <input type="number" value={formTotal} onChange={(e) => setFormTotal(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-white/40 font-bold block mb-1">{isEn ? "Already Paid Amount (CFA)" : "Montant Déjà Payé (CFA)"}</label>
                  <input type="number" value={formPaid} onChange={(e) => setFormPaid(e.target.value)} className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                </div>
              </div>
              <div>
                <label className="text-white/40 font-bold block mb-1">{isEn ? "Google Drive Link" : "Lien Google Drive"}</label>
                <input type="url" value={formDriveLink} onChange={(e) => setFormDriveLink(e.target.value)} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-xl bg-white/5 border border-white/10 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-white/10 text-white/60">
                  {isEn ? "Cancel" : "Annuler"}
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-[#CF5D56] text-white font-bold">
                  {isEn ? "Save" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : NOUVEAU / MODIFIER UN DÉPÔT D'AVANCE CARBURANT */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#181818] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Fuel className="size-4" />
                </div>
                <h3 className="text-base font-black text-white">
                  {editingFuelAdvance 
                    ? (t?.editFuelAdvance || (isEn ? "Edit Fuel Advance" : "Modifier l'Avance Carburant"))
                    : (t?.newFuelAdvance || (isEn ? "New Fuel Prepayment" : "Nouveau Dépôt / Paiement Avance"))}
                </h3>
              </div>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFuelAdvance} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 font-bold block mb-1 uppercase text-[10px]">
                    {isEn ? "Date" : "Date"}
                  </label>
                  <input
                    type="date"
                    required
                    value={fuelFormDate}
                    onChange={(e) => setFuelFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-white/50 font-bold block mb-1 uppercase text-[10px]">
                    {isEn ? "Advance Amount (CFA)" : "Montant Avance (CFA)"}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 4000000"
                    value={fuelFormAmount}
                    onChange={(e) => setFuelFormAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 font-bold block mb-1 uppercase text-[10px]">
                    {isEn ? "Station" : "Station-Service"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Shell San Pedro"
                    value={fuelFormStation}
                    onChange={(e) => setFuelFormStation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-white/50 font-bold block mb-1 uppercase text-[10px]">
                    {isEn ? "Payment Method" : "Mode de Règlement"}
                  </label>
                  <select
                    value={fuelFormPaymentMethod}
                    onChange={(e) => setFuelFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="Virement Bancaire">{isEn ? "Bank Wire Transfer" : "Virement Bancaire"}</option>
                    <option value="Chèque">{isEn ? "Bank Cheque" : "Chèque Bancaire"}</option>
                    <option value="Wave / Mobile Money">Wave / Mobile Money</option>
                    <option value="Espèces (Cash)">{isEn ? "Cash" : "Espèces (Cash)"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/50 font-bold block mb-1 uppercase text-[10px]">
                  {isEn ? "Reference / Spreadsheet Note" : "Libellé / Note de Rapprochement"}
                </label>
                <textarea
                  rows={2}
                  placeholder={isEn ? "Ex: 4000000 payed to san pedro Shell" : "Ex: Virement 4M pour approvisionnement Shell San Pedro"}
                  value={fuelFormNotes}
                  onChange={(e) => setFuelFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white font-bold"
                >
                  {isEn ? "Cancel" : "Annuler"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  {isEn ? "Save Advance" : "Enregistrer l'Avance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountingModule;
