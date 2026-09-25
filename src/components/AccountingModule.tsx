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
  driveLink?: string;
  createdAt: string;
}

export const INITIAL_INVOICES: Invoice[] = [];

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
  onSync,
  isSyncing = false,
  formatCurrency,
  canWrite = true,
}: AccountingModuleProps) {
  const formatMoney = typeof formatCurrency === "function" 
    ? formatCurrency 
    : (val: number) => Number(val || 0).toLocaleString("fr-FR") + " CFA";

  // Données de base
  const allTx = useMemo(() => {
    if (transactions && transactions.length > 0) return transactions;
    return INITIAL_ACCOUNTING_TRANSACTIONS;
  }, [transactions]);

  // --- FILTRES & ÉTATS ---
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<"ALL" | "in" | "out">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [onlyDriveReceipts, setOnlyDriveReceipts] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- MODALS & PREVIEWS ---
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

  // Années disponibles dans le dataset
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    allTx.forEach(t => {
      if (t.date) set.add(t.date.slice(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [allTx]);

  // Catégories disponibles avec leurs comptes et montants
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

  // Filtrage des transactions
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

  // KPIs financiers calculés sur le filtrage actif
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

    // Dernier solde disponible
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

  // Données mensuelles agrégées pour le graphique Recharts
  const monthlyChartData = useMemo(() => {
    const map = new Map<string, { monthKey: string; label: string; in: number; out: number; net: number }>();
    
    // Regrouper par année-mois
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) {
        const [yr, mo] = key.split("-");
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
        const label = `${monthNames[parseInt(mo, 10) - 1]} ${yr.slice(2)}`;
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

  // Export CSV complet
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
    link.setAttribute("download", `comptabilite_spreedsheet_${selectedYear}_${Date.now()}.csv`);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/8 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-[#10B981]/20 via-[#00F2FF]/10 to-transparent border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-lg shadow-[#10B981]/10">
              <Receipt className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Comptabilité & Grand Livre Flotte</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  <span className="size-1.5 rounded-full bg-[#10B981] animate-ping" />
                  Feuille 'Spreedsheet' Connectée
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Extraction sémantique certifiée de l'historique bancaire et d'exploitation • {allTx.length} écritures analysées
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Synchroniser immédiatement avec Google Sheets"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin text-[#00F2FF]' : ''}`} />
              <span>{isSyncing ? "Synchronisation..." : "Actualiser Spreedsheet"}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Download className="size-3.5" /> Exporter Grand Livre (CSV)
          </button>

          {canWrite && (
            <button
              onClick={() => setIsNewTxModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#10B981]/20 active:scale-95"
            >
              <Plus className="size-4" /> Nouvelle Écriture
            </button>
          )}
        </div>
      </div>

      {/* 4 TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL ENTRÉES RÉELLES */}
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#10B981]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Total Entrées Réelles</span>
            <div className="size-8 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center text-[#10B981]">
              <ArrowDownRight className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-[#10B981]">{formatMoney(metrics.totalIn)}</p>
            <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
              <span>Clients, 20% Retenue, Apports</span>
              <span className="font-bold text-white/80">{filteredTransactions.filter(t => t.type === 'in').length} encaissements</span>
            </div>
          </div>
        </div>

        {/* CARD 2: TOTAL DÉPENSES RÉELLES */}
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#CF5D56]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#CF5D56]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Total Dépenses Réelles</span>
            <div className="size-8 rounded-xl bg-[#CF5D56]/10 border border-[#CF5D56]/25 flex items-center justify-center text-[#CF5D56]">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-[#CF5D56]">{formatMoney(metrics.totalOut)}</p>
            <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
              <span>Carburant, Péages, Salaires, Pièces</span>
              <span className="font-bold text-white/80">{filteredTransactions.filter(t => t.type === 'out').length} décaissements</span>
            </div>
          </div>
        </div>

        {/* CARD 3: RÉSULTAT NET DE TRÉSORERIE */}
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-32 h-32 ${metrics.net >= 0 ? 'bg-[#00F2FF]/5' : 'bg-red-500/5'} rounded-full blur-3xl pointer-events-none`}></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Flux Net de Trésorerie</span>
            <div className={`size-8 rounded-xl ${metrics.net >= 0 ? 'bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/25' : 'bg-red-500/10 text-red-400 border-red-500/25'} border flex items-center justify-center`}>
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl lg:text-3xl font-black tracking-tight ${metrics.net >= 0 ? 'text-[#00F2FF]' : 'text-red-400'}`}>
              {metrics.net >= 0 ? `+${formatMoney(metrics.net)}` : formatMoney(metrics.net)}
            </p>
            <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
              <span>Marge de couverture</span>
              <span className="font-black text-white/80">{metrics.ratio.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* CARD 4: SOLDE DE TRÉSORERIE ACTUEL */}
        <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F59E0B]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Dernier Solde (BALANCE)</span>
            <div className="size-8 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B]">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-white">{formatMoney(metrics.balance)}</p>
            <div className="mt-2.5 flex items-center justify-between text-xs text-white/50 font-medium">
              <span>Solde en caisse & banque</span>
              <span className="font-bold text-[#F59E0B] flex items-center gap-1">
                <Check className="size-3" /> Certifié Spreedsheet
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : VISUAL ANALYTICS & RÉPARTITIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPHIQUE CASHFLOW MENSUEL */}
        <div className="lg:col-span-8 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <BarChart2 className="size-4 text-[#00F2FF]" />
                Évolution Mensuelle des Flux de Trésorerie
              </h2>
              <p className="text-xs text-white/40 mt-0.5">Comparatif des encaissements clients vs décaissements opérationnels</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#10B981]">
                <span className="size-2 rounded-full bg-[#10B981]"></span> Entrées
              </span>
              <span className="flex items-center gap-1.5 text-[#CF5D56]">
                <span className="size-2 rounded-full bg-[#CF5D56]"></span> Dépenses
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
                  formatter={(val: any, name: any) => [formatMoney(val), name === "in" ? "Entrées (+)" : "Dépenses (-)"]}
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
                Top Dépenses par Catégorie
              </h2>
              <span className="text-[10px] font-bold text-white/40">Cliquez pour filtrer</span>
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
                          {cat.name}
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
              Réinitialiser le filtre de catégorie
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3 : BARRE DE FILTRAGE AVANCÉE */}
      <div className="rounded-[24px] border border-white/8 bg-[#141414] p-4 lg:p-5 shadow-lg space-y-4">
        {/* LIGNE 1 : SÉLECTEUR ANNÉE & TYPE & RECHERCHE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Années */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button
              onClick={() => setSelectedYear("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                selectedYear === "ALL" ? 'bg-[#00F2FF] text-black shadow-md shadow-[#00F2FF]/20' : 'text-white/60 hover:text-white'
              }`}
            >
              Toutes Années
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
              Tous les Flux
            </button>
            <button
              onClick={() => setSelectedType("in")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedType === "in" ? 'bg-[#10B981] text-black' : 'text-[#10B981] hover:bg-[#10B981]/10'
              }`}
            >
              <span className="size-1.5 rounded-full bg-current"></span>
              Entrées Seules
            </button>
            <button
              onClick={() => setSelectedType("out")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedType === "out" ? 'bg-[#CF5D56] text-white' : 'text-[#CF5D56] hover:bg-[#CF5D56]/10'
              }`}
            >
              <span className="size-1.5 rounded-full bg-current"></span>
              Dépenses Seules
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
            <span>Justificatifs Drive</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-black">
              {metrics.driveCount}
            </span>
          </button>
        </div>

        {/* LIGNE 2 : MOIS + CATÉGORIES + RECHERCHE TEXTE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Sélection Mois */}
          <div className="lg:col-span-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="ALL">Tous les mois (1 à 12)</option>
              <option value="1">Janvier</option>
              <option value="2">Février</option>
              <option value="3">Mars</option>
              <option value="4">Avril</option>
              <option value="5">Mai</option>
              <option value="6">Juin</option>
              <option value="7">Juillet</option>
              <option value="8">Août</option>
              <option value="9">Septembre</option>
              <option value="10">Octobre</option>
              <option value="11">Novembre</option>
              <option value="12">Décembre</option>
            </select>
          </div>

          {/* Sélection Catégorie */}
          <div className="lg:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="ALL">Toutes les catégories ({availableCategories.length})</option>
              <optgroup label="Entrées d'argent">
                {availableCategories.filter(c => c.type === 'in').map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.count} op. - {formatMoney(c.total)})</option>
                ))}
              </optgroup>
              <optgroup label="Dépenses & Charges">
                {availableCategories.filter(c => c.type === 'out').map(c => (
                  <option key={c.name} value={c.name}>{c.name} ({c.count} op. - {formatMoney(c.total)})</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Recherche libre */}
          <div className="lg:col-span-5 relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher par mot-clé, date, montant, commentaire..."
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

        {/* Compteur d'écritures affichées */}
        <div className="flex items-center justify-between text-xs text-white/40 pt-1 border-t border-white/5">
          <span>{filteredTransactions.length} écriture(s) trouvée(s)</span>
          {(selectedYear !== "ALL" || selectedMonth !== "ALL" || selectedType !== "ALL" || selectedCategory !== "ALL" || onlyDriveReceipts || searchQuery) && (
            <button
              onClick={() => {
                setSelectedYear("ALL");
                setSelectedMonth("ALL");
                setSelectedType("ALL");
                setSelectedCategory("ALL");
                setOnlyDriveReceipts(false);
                setSearchQuery("");
              }}
              className="text-[#00F2FF] hover:underline font-bold"
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      </div>

      {/* SECTION 4 : GRAND LIVRE COMPTABLE (TABLEAU) */}
      <div className="rounded-[28px] border border-white/8 bg-[#181818] shadow-2xl overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-white/8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="size-5 text-[#10B981]" />
              Journal Général des Écritures Comptables
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              Extrait direct de la feuille Spreedsheet avec analyse sémantique et solde certifié
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white/50">Trier par:</span>
            <button
              onClick={() => {
                if (sortField === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                else { setSortField("date"); setSortOrder("desc"); }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                sortField === "date" ? 'bg-white/10 text-white border-white/20' : 'text-white/40 border-transparent hover:text-white'
              }`}
            >
              Date {sortField === "date" && (sortOrder === "desc" ? "↓" : "↑")}
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
              Montant {sortField === "amount" && (sortOrder === "desc" ? "↓" : "↑")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Flux</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Libellé / Commentaire (Spreedsheet)</th>
                <th className="py-3 px-4 text-right">Montant (CFA)</th>
                <th className="py-3 px-4 text-right">Solde Caisse</th>
                <th className="py-3 px-4 text-center">Justificatif</th>
                {canWrite && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-white/40 font-bold">
                    Aucune écriture comptable ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const style = CATEGORY_STYLES[tx.category] || CATEGORY_STYLES["Charges Générales & Divers"];
                  const Icon = style.icon || FileText;

                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-white/90">{tx.date}</div>
                        {tx.rawDate && tx.rawDate !== tx.date && (
                          <div className="text-[10px] text-white/40 truncate max-w-[130px]" title={tx.rawDate}>
                            {tx.rawDate}
                          </div>
                        )}
                      </td>

                      {/* Sens / Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.type === "in" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            <ArrowDownRight className="size-3" /> ENTRÉE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#CF5D56]/15 text-[#CF5D56] border border-[#CF5D56]/30">
                            <ArrowUpRight className="size-3" /> DÉPENSE
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
                          <span>{tx.category}</span>
                        </span>
                      </td>

                      {/* Commentaire / Libellé */}
                      <td className="py-3 px-4">
                        <div className="text-white/80 font-medium max-w-[340px] truncate" title={tx.comment}>
                          {tx.comment || <span className="text-white/20 italic">Sans commentaire</span>}
                        </div>
                      </td>

                      {/* Montant CFA */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-mono font-black text-sm ${tx.type === 'in' ? 'text-[#10B981]' : 'text-[#CF5D56]'}`}>
                          {tx.type === 'in' ? `+${formatMoney(tx.amount)}` : `-${formatMoney(tx.amount)}`}
                        </span>
                      </td>

                      {/* Solde Trésorerie */}
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
                            title="Ouvrir le justificatif Google Drive"
                          >
                            <Eye className="size-3" />
                            <span>Voir Justificatif</span>
                          </button>
                        ) : (
                          <span className="text-white/20 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      {canWrite && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {tx.id.startsWith("manual-") ? (
                            <button
                              onClick={() => handleDeleteTx(tx.id)}
                              className="size-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                              title="Supprimer cette écriture"
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

      {/* MODAL : VISUALISEUR JUSTIFICATIF GOOGLE DRIVE */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#161616] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FolderOpen className="size-4 text-[#3B82F6]" />
                  Justificatif de Dépense • {previewDoc.category}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Date : {previewDoc.date} • Montant : <span className="font-bold text-white">{formatMoney(previewDoc.amount)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                >
                  <ExternalLink className="size-3.5" /> Ouvrir dans Drive
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Corps du document ou avertissement dossier */}
            <div className="flex-1 min-h-[420px] rounded-2xl bg-black/50 border border-white/5 overflow-hidden flex items-center justify-center relative">
              {getDriveEmbedUrl(previewDoc.driveLink) ? (
                <iframe
                  src={getDriveEmbedUrl(previewDoc.driveLink)!}
                  className="w-full h-full min-h-[420px] border-0"
                  allow="autoplay"
                  title="Aperçu Google Drive"
                />
              ) : (
                <div className="text-center p-8 space-y-4 max-w-md">
                  <div className="size-16 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] mx-auto">
                    <FolderOpen className="size-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Dossier Google Drive</h4>
                    <p className="text-xs text-white/50 mt-1">
                      Ce justificatif est un dossier contenant plusieurs pièces (factures, reçus, bons de commande). Les dossiers ne peuvent pas être intégrés directement dans un cadre sécurisé.
                    </p>
                  </div>
                  <a
                    href={previewDoc.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#3B82F6]/25"
                  >
                    <ExternalLink className="size-4" /> Consulter le dossier complet
                  </a>
                </div>
              )}
            </div>

            {previewDoc.comment && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
                <span className="font-bold text-white/90">Commentaire associé :</span> {previewDoc.comment}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL : NOUVELLE ÉCRITURE MANUELLE */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#181818] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="size-5 text-[#10B981]" />
                Ajouter une Écriture Comptable
              </h3>
              <button
                onClick={() => setIsNewTxModalOpen(false)}
                className="size-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="space-y-4">
              {/* Type d'opération */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Type de Flux
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewTxType("out"); setNewTxCategory("Charges Générales & Divers"); }}
                    className={`py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                      newTxType === "out" ? 'bg-[#CF5D56] text-white border-[#CF5D56]' : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                  >
                    <ArrowUpRight className="size-4" /> Dépense (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewTxType("in"); setNewTxCategory("Paiements Clients & Factures"); }}
                    className={`py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                      newTxType === "in" ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                  >
                    <ArrowDownRight className="size-4" /> Entrée (+)
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Date de l'opération
                </label>
                <input
                  type="date"
                  required
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Catégorie Comptable
                </label>
                <select
                  value={newTxCategory}
                  onChange={(e) => setNewTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00F2FF]"
                >
                  {newTxType === "in" ? (
                    <>
                      <option value="Paiements Clients & Factures">Paiements Clients & Factures</option>
                      <option value="Remboursement Retenue (20%)">Remboursement Retenue (20%)</option>
                      <option value="Apports & Avances Associés">Apports & Avances Associés</option>
                      <option value="Régularisation / Rejet Chèque">Régularisation / Rejet Chèque</option>
                    </>
                  ) : (
                    <>
                      <option value="Carburant (Gasoil)">Carburant (Gasoil)</option>
                      <option value="Frais de Route & Péages">Frais de Route & Péages</option>
                      <option value="Salaires & Rémunérations">Salaires & Rémunérations</option>
                      <option value="Pneus & Train Roulant">Pneus & Train Roulant</option>
                      <option value="Maintenance & Vidanges">Maintenance & Vidanges</option>
                      <option value="Mécanique & Pièces de Rechange">Mécanique & Pièces de Rechange</option>
                      <option value="Loyer & Logement Flotte">Loyer & Logement Flotte</option>
                      <option value="Assurances Flotte">Assurances Flotte</option>
                      <option value="Cartes de Transport & Régularisations">Cartes de Transport & Régularisations</option>
                      <option value="Transport Urbain (Yango)">Transport Urbain (Yango)</option>
                      <option value="Frais Bancaires & Wave">Frais Bancaires & Wave</option>
                      <option value="GPS, Télécoms & Énergie">GPS, Télécoms & Énergie</option>
                      <option value="Lavage & Entretien Flotte">Lavage & Entretien Flotte</option>
                      <option value="Dépenses Personnelles">Dépenses Personnelles</option>
                      <option value="Charges Générales & Divers">Charges Générales & Divers</option>
                    </>
                  )}
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Montant en CFA
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

              {/* Commentaire */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Description / Commentaire
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Paiement facture révision camion ou acompte client..."
                  value={newTxComment}
                  onChange={(e) => setNewTxComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-[#00F2FF]"
                />
              </div>

              {/* Lien Google Drive */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                  Lien Justificatif Google Drive (Optionnel)
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
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#10B981]/25"
                >
                  Enregistrer l'Écriture
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
