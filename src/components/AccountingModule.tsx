import React, { useState, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Filter, Calendar, 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Download, 
  ExternalLink, Eye, Trash2, Edit3, Scale, Building2, 
  CreditCard, ArrowUpDown, FileText, Check, X, 
  DollarSign, Percent, ArrowUpRight, ShieldCheck, RefreshCw,
  FolderOpen
} from 'lucide-react';

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
  attachmentData?: string; // Data URL for preview
  driveLink?: string; // Lien Google Drive de la facture
  createdAt: string;
}

// Extraction de l'ID d'un fichier Google Drive
export function getDriveId(link?: string): string | null {
  if (!link) return null;
  const matchD = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchD && matchD[1]) return matchD[1];
  const matchId = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchId && matchId[1]) return matchId[1];
  const fallback = link.match(/[-\w]{25,}/);
  return fallback ? fallback[0] : null;
}

// URL d'intégration sécurisée pour iframe Google Drive
export function getDriveEmbedUrl(link?: string): string | null {
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

interface AccountingModuleProps {
  invoices?: Invoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<Invoice[]>> | null;
  formatCurrency?: (val: number, curr?: string) => string;
  formatTonnage?: (val: number) => string;
  canWrite?: boolean;
  t?: any;
}

// Jeu de données initial réaliste pour la flotte SDV
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

export function AccountingModule({
  invoices = [],
  setInvoices,
  formatCurrency,
  formatTonnage,
  canWrite = true,
  t
}: AccountingModuleProps) {
  const formatMoney = typeof formatCurrency === "function" 
    ? formatCurrency 
    : (val: number) => Number(val || 0).toLocaleString("fr-FR") + " CFA";

  const formatTon = typeof formatTonnage === "function"
    ? formatTonnage
    : (val: number) => Number(val || 0).toLocaleString("fr-FR") + " T";

  // --- FILTRES & ÉTATS ---
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedClient, setSelectedClient] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "tonnage" | "totalAmount" | "remaining">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- MODALS ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>("");
  const [paymentMethodInput, setPaymentMethodInput] = useState<string>("Virement bancaire");
  const [previewDoc, setPreviewDoc] = useState<{ 
    name: string; 
    data?: string; 
    driveLink?: string; 
    isDrive?: boolean; 
  } | null>(null);

  // Formulaire d'ajout / édition
  const [formNumber, setFormNumber] = useState("");
  const [formClient, setFormClient] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDueDate, setFormDueDate] = useState("");
  const [formPeriod, setFormPeriod] = useState("");
  const [formTonnage, setFormTonnage] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [formPaid, setFormPaid] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Virement bancaire");
  const [formNotes, setFormNotes] = useState("");
  const [formDriveLink, setFormDriveLink] = useState("");
  const [formFile, setFormFile] = useState<{ name: string; data: string } | null>(null);

  const safeInvoices = invoices && invoices.length > 0 ? invoices : INITIAL_INVOICES;

  // Calcul du statut dynamique d'une facture
  function getInvoiceStatus(inv: Invoice): "paid" | "partial" | "pending" | "overdue" {
    const total = inv.totalAmount || 0;
    const paid = inv.paidAmount || 0;
    const remaining = total - paid;

    if (remaining <= 0 && total > 0) return "paid";
    if (paid > 0 && remaining > 0) return "partial";

    // Impayée : vérifier si échéance dépassée
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) return "overdue";
    }

    return "pending";
  }

  // Années disponibles
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    safeInvoices.forEach(inv => {
      if (inv.date) {
        set.add(inv.date.slice(0, 4));
      }
    });
    return Array.from(set).sort().reverse();
  }, [safeInvoices]);

  // Clients uniques
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    safeInvoices.forEach(inv => {
      if (inv.client) set.add(inv.client.trim());
    });
    return Array.from(set).sort();
  }, [safeInvoices]);

  // Filtrage des factures
  const filteredInvoices = useMemo(() => {
    return safeInvoices.filter(inv => {
      const invYear = inv.date ? inv.date.slice(0, 4) : "";
      const invMonth = inv.date ? inv.date.slice(5, 7) : "";
      const status = getInvoiceStatus(inv);

      if (selectedYear !== "ALL" && invYear !== selectedYear) return false;
      if (selectedMonth !== "ALL" && invMonth !== selectedMonth) return false;
      if (selectedStatus !== "ALL" && status !== selectedStatus) return false;
      if (selectedClient !== "ALL" && inv.client !== selectedClient) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchClient = inv.client?.toLowerCase().includes(q);
        const matchPeriod = inv.period?.toLowerCase().includes(q);
        const matchNotes = inv.notes?.toLowerCase().includes(q);
        if (!matchNum && !matchClient && !matchPeriod && !matchNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === "date") {
        valA = new Date(a.date).getTime() || 0;
        valB = new Date(b.date).getTime() || 0;
      } else if (sortField === "tonnage") {
        valA = a.tonnage || 0;
        valB = b.tonnage || 0;
      } else if (sortField === "totalAmount") {
        valA = a.totalAmount || 0;
        valB = b.totalAmount || 0;
      } else if (sortField === "remaining") {
        valA = (a.totalAmount || 0) - (a.paidAmount || 0);
        valB = (b.totalAmount || 0) - (b.paidAmount || 0);
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [safeInvoices, selectedYear, selectedMonth, selectedStatus, selectedClient, searchQuery, sortField, sortOrder]);

  // KPIs financiers calculés sur la sélection active
  const metrics = useMemo(() => {
    let totalBudget = 0;
    let totalTonnage = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    filteredInvoices.forEach(inv => {
      const tot = inv.totalAmount || 0;
      const pd = inv.paidAmount || 0;
      const rem = Math.max(0, tot - pd);
      const st = getInvoiceStatus(inv);

      totalBudget += tot;
      totalTonnage += inv.tonnage || 0;
      totalPaid += pd;
      totalRemaining += rem;

      if (st === "overdue") {
        overdueCount += 1;
        overdueAmount += rem;
      }
    });

    const recoveryRate = totalBudget > 0 ? (totalPaid / totalBudget) * 100 : 0;
    const avgRatePerTon = totalTonnage > 0 ? totalBudget / totalTonnage : 0;

    return {
      totalBudget,
      totalTonnage,
      totalPaid,
      totalRemaining,
      recoveryRate,
      avgRatePerTon,
      overdueCount,
      overdueAmount,
      count: filteredInvoices.length
    };
  }, [filteredInvoices]);

  // --- ACTIONS CRUD ---
  function openCreateModal(invoiceToEdit?: Invoice) {
    if (invoiceToEdit) {
      setEditingInvoice(invoiceToEdit);
      setFormNumber(invoiceToEdit.invoiceNumber);
      setFormClient(invoiceToEdit.client);
      setFormDate(invoiceToEdit.date);
      setFormDueDate(invoiceToEdit.dueDate || "");
      setFormPeriod(invoiceToEdit.period || "");
      setFormTonnage(String(invoiceToEdit.tonnage || ""));
      setFormRate(String(invoiceToEdit.ratePerTon || ""));
      setFormTotal(String(invoiceToEdit.totalAmount || ""));
      setFormPaid(String(invoiceToEdit.paidAmount || 0));
      setFormPaymentMethod(invoiceToEdit.paymentMethod || "Virement bancaire");
      setFormNotes(invoiceToEdit.notes || "");
      setFormDriveLink(invoiceToEdit.driveLink || "");
      setFormFile(invoiceToEdit.attachmentData ? { name: invoiceToEdit.attachmentName || "justificatif", data: invoiceToEdit.attachmentData } : null);
    } else {
      setEditingInvoice(null);
      const nextNum = `FAC-SDV-${new Date().getFullYear()}-${String(safeInvoices.length + 1).padStart(2, "0")}`;
      setFormNumber(nextNum);
      setFormClient("SDV Logistique");
      setFormDate(new Date().toISOString().slice(0, 10));
      setFormDueDate(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      setFormPeriod(`Mois de ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`);
      setFormTonnage("");
      setFormRate("15000");
      setFormTotal("");
      setFormPaid("0");
      setFormPaymentMethod("Virement bancaire");
      setFormNotes("");
      setFormDriveLink("");
      setFormFile(null);
    }
    setIsCreateOpen(true);
  }

  // Calcul auto du total si on modifie tonnage ou prix/tonne
  function handleTonnageChange(val: string) {
    setFormTonnage(val);
    const ton = parseFloat(val);
    const rate = parseFloat(formRate);
    if (!isNaN(ton) && !isNaN(rate) && ton > 0 && rate > 0) {
      setFormTotal(String(Math.round(ton * rate)));
    }
  }

  function handleRateChange(val: string) {
    setFormRate(val);
    const ton = parseFloat(formTonnage);
    const rate = parseFloat(val);
    if (!isNaN(ton) && !isNaN(rate) && ton > 0 && rate > 0) {
      setFormTotal(String(Math.round(ton * rate)));
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormFile({
        name: file.name,
        data: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  }

  function handleSaveInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    const ton = parseFloat(formTonnage) || 0;
    const rate = parseFloat(formRate) || undefined;
    const tot = parseFloat(formTotal) || 0;
    const pd = parseFloat(formPaid) || 0;

    const payload: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv-${Date.now()}`,
      invoiceNumber: formNumber.trim() || `FAC-${Date.now()}`,
      client: formClient.trim() || "Client Inconnu",
      date: formDate,
      dueDate: formDueDate,
      period: formPeriod.trim(),
      tonnage: ton,
      ratePerTon: rate,
      totalAmount: tot,
      paidAmount: pd,
      paymentMethod: formPaymentMethod,
      notes: formNotes.trim(),
      driveLink: formDriveLink.trim() || undefined,
      attachmentName: formFile?.name,
      attachmentData: formFile?.data,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString()
    };

    if (setInvoices) {
      if (editingInvoice) {
        setInvoices(prev => (prev || []).map(item => item.id === editingInvoice.id ? payload : item));
      } else {
        setInvoices(prev => [payload, ...(prev || [])]);
      }
    }

    setIsCreateOpen(false);
  }

  function handleDelete(id: string) {
    if (!canWrite) return;
    if (confirm("Supprimer cette facture définitivement ?")) {
      if (setInvoices) {
        setInvoices(prev => (prev || []).filter(item => item.id !== id));
      }
    }
  }

  function handleMarkAsPaid(inv: Invoice) {
    if (!canWrite) return;
    if (setInvoices) {
      setInvoices(prev => (prev || []).map(item => {
        if (item.id === inv.id) {
          return {
            ...item,
            paidAmount: item.totalAmount,
            notes: (item.notes ? item.notes + " | " : "") + `Soldé le ${new Date().toLocaleDateString("fr-FR")}`
          };
        }
        return item;
      }));
    }
  }

  function handleAddPaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !paymentModalInvoice) return;

    const added = parseFloat(paymentAmountInput) || 0;
    if (added <= 0) return;

    if (setInvoices) {
      setInvoices(prev => (prev || []).map(item => {
        if (item.id === paymentModalInvoice.id) {
          const newPaid = (item.paidAmount || 0) + added;
          return {
            ...item,
            paidAmount: Math.min(item.totalAmount, newPaid),
            paymentMethod: paymentMethodInput,
            notes: (item.notes ? item.notes + " | " : "") + `Versement de ${formatMoney(added)} (${paymentMethodInput}) le ${new Date().toLocaleDateString("fr-FR")}`
          };
        }
        return item;
      }));
    }

    setPaymentModalInvoice(null);
    setPaymentAmountInput("");
  }

  // Export CSV
  function handleExportCSV() {
    const headers = ["N° Facture", "Client / Donneur d'ordre", "Date", "Echeance", "Periode", "Tonnage (T)", "Taux/T (CFA)", "Total Facture (CFA)", "Montant Paye (CFA)", "Reste a Payer (CFA)", "Statut", "Mode Paiement", "Lien Google Drive", "Commentaires"];
    const rows = filteredInvoices.map(inv => {
      const rem = Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
      const st = getInvoiceStatus(inv);
      const stLabel = st === "paid" ? "Payee" : st === "partial" ? "Partielle" : st === "overdue" ? "En Retard" : "En attente";
      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.client}"`,
        `"${inv.date}"`,
        `"${inv.dueDate || ''}"`,
        `"${inv.period || ''}"`,
        inv.tonnage || 0,
        inv.ratePerTon || "",
        inv.totalAmount || 0,
        inv.paidAmount || 0,
        rem,
        `"${stLabel}"`,
        `"${inv.paymentMethod || ''}"`,
        `"${inv.driveLink || ''}"`,
        `"${(inv.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comptabilite_factures_${selectedYear}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-[#cf5d56]/15 border border-[#cf5d56]/30 flex items-center justify-center text-[#cf5d56] shadow-lg shadow-[#cf5d56]/10">
              <Receipt className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Comptabilité & Facturation Globale</h1>
              <p className="text-xs text-white/50 mt-0.5">
                Suivi des factures au tonnage transporté, des encaissements réels et des créances restantes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm"
          >
            <Download className="size-3.5" /> Exporter Excel/CSV
          </button>

          {canWrite && (
            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#cf5d56] to-[#b34842] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#cf5d56]/20 active:scale-95"
            >
              <Plus className="size-4" /> Nouvelle Facture
            </button>
          )}
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: BUDGET TOTAL */}
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111_100%)] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#4285F4]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#4285F4]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Budget Total Facturé</span>
            <div className="size-8 rounded-xl bg-[#4285F4]/10 border border-[#4285F4]/20 flex items-center justify-center text-[#4285F4]">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-white">{formatMoney(metrics.totalBudget)}</p>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white/50">
              <Scale className="size-3.5 text-[#4285F4]" />
              <span>{formatTon(metrics.totalTonnage)} transportées</span>
            </div>
          </div>
        </div>

        {/* CARD 2: RÉELLEMENT PAYÉ */}
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111_100%)] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9fe3b9]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#9fe3b9]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Total Réellement Payé</span>
            <div className="size-8 rounded-xl bg-[#9fe3b9]/10 border border-[#9fe3b9]/20 flex items-center justify-center text-[#9fe3b9]">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl lg:text-3xl font-black tracking-tight text-[#9fe3b9]">{formatMoney(metrics.totalPaid)}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-white/50 font-bold">Taux d'encaissement</span>
              <span className="font-black text-[#9fe3b9]">{metrics.recoveryRate.toFixed(1)}%</span>
            </div>
            {/* Progress Bar */}
            <div className="mt-1.5 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#61d2c0] to-[#9fe3b9] rounded-full transition-all duration-700" 
                style={{ width: `${Math.min(100, metrics.recoveryRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* CARD 3: RESTE À PAYER */}
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111_100%)] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#cf5d56]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#cf5d56]/10 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Reste à Payer (Créance)</span>
            <div className="size-8 rounded-xl bg-[#cf5d56]/10 border border-[#cf5d56]/20 flex items-center justify-center text-[#cf5d56]">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className={`text-2xl lg:text-3xl font-black tracking-tight ${metrics.totalRemaining > 0 ? "text-[#ff8f84]" : "text-white/80"}`}>
              {formatMoney(metrics.totalRemaining)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white/50">
              <span className={`inline-block size-2 rounded-full ${metrics.totalRemaining > 0 ? "bg-[#ff8f84] animate-pulse" : "bg-[#9fe3b9]"}`}></span>
              <span>{metrics.totalRemaining > 0 ? "En attente de virement" : "Toutes créances soldées"}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: RETARDS & ALERTES */}
        <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111_100%)] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Factures en Retard</span>
            <div className={`size-8 rounded-xl flex items-center justify-center ${metrics.overdueCount > 0 ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-white/5 text-white/30"}`}>
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className={`text-2xl lg:text-3xl font-black tracking-tight ${metrics.overdueCount > 0 ? "text-red-400" : "text-white"}`}>
              {metrics.overdueCount} <span className="text-sm font-bold text-white/40">facture(s)</span>
            </p>
            <div className="mt-3 text-xs font-bold text-white/50 truncate">
              {metrics.overdueCount > 0 ? (
                <span className="text-red-400">Montant échu: {formatMoney(metrics.overdueAmount)}</span>
              ) : (
                <span className="text-white/40">Aucun retard de paiement</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="rounded-[24px] border border-white/8 bg-[#141414] p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* SEARCH */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher par N° facture, client, période..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#cf5d56] transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* SELECTORS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* ANNEE */}
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-black uppercase text-white/30">Année :</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181818]">Toutes</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-[#181818]">{yr}</option>
                ))}
              </select>
            </div>

            {/* MOIS */}
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-black uppercase text-white/30">Mois :</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181818]">Tous</option>
                <option value="01" className="bg-[#181818]">Janvier</option>
                <option value="02" className="bg-[#181818]">Février</option>
                <option value="03" className="bg-[#181818]">Mars</option>
                <option value="04" className="bg-[#181818]">Avril</option>
                <option value="05" className="bg-[#181818]">Mai</option>
                <option value="06" className="bg-[#181818]">Juin</option>
                <option value="07" className="bg-[#181818]">Juillet</option>
                <option value="08" className="bg-[#181818]">Août</option>
                <option value="09" className="bg-[#181818]">Septembre</option>
                <option value="10" className="bg-[#181818]">Octobre</option>
                <option value="11" className="bg-[#181818]">Novembre</option>
                <option value="12" className="bg-[#181818]">Décembre</option>
              </select>
            </div>

            {/* STATUT */}
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="text-[10px] font-black uppercase text-white/30">Statut :</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181818]">Tous</option>
                <option value="paid" className="bg-[#181818]">Payées (Soldées)</option>
                <option value="partial" className="bg-[#181818]">Partielles (Acomptes)</option>
                <option value="pending" className="bg-[#181818]">En attente</option>
                <option value="overdue" className="bg-[#181818]">En retard (Échues)</option>
              </select>
            </div>

            {/* CLIENT */}
            {uniqueClients.length > 0 && (
              <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-black uppercase text-white/30">Client :</span>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="ALL" className="bg-[#181818]">Tous</option>
                  {uniqueClients.map(c => (
                    <option key={c} value={c} className="bg-[#181818]">{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* RESET BUTTON */}
            {(selectedYear !== "ALL" || selectedMonth !== "ALL" || selectedStatus !== "ALL" || selectedClient !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedYear("ALL");
                  setSelectedMonth("ALL");
                  setSelectedStatus("ALL");
                  setSelectedClient("ALL");
                  setSearchQuery("");
                }}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                title="Réinitialiser filtres"
              >
                <RefreshCw className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* SORT TOGGLES */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-white/40">
          <span className="font-bold flex items-center gap-1">
            <ArrowUpDown className="size-3" /> Trier par :
          </span>
          <button
            onClick={() => {
              if (sortField === "date") setSortOrder(prev => prev === "asc" ? "desc" : "asc");
              else { setSortField("date"); setSortOrder("desc"); }
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all ${sortField === "date" ? "border-[#cf5d56]/40 bg-[#cf5d56]/10 text-white font-bold" : "border-transparent hover:bg-white/5"}`}
          >
            Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>

          <button
            onClick={() => {
              if (sortField === "tonnage") setSortOrder(prev => prev === "asc" ? "desc" : "asc");
              else { setSortField("tonnage"); setSortOrder("desc"); }
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all ${sortField === "tonnage" ? "border-[#cf5d56]/40 bg-[#cf5d56]/10 text-white font-bold" : "border-transparent hover:bg-white/5"}`}
          >
            Tonnage {sortField === "tonnage" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>

          <button
            onClick={() => {
              if (sortField === "totalAmount") setSortOrder(prev => prev === "asc" ? "desc" : "asc");
              else { setSortField("totalAmount"); setSortOrder("desc"); }
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all ${sortField === "totalAmount" ? "border-[#cf5d56]/40 bg-[#cf5d56]/10 text-white font-bold" : "border-transparent hover:bg-white/5"}`}
          >
            Montant Facturé {sortField === "totalAmount" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>

          <button
            onClick={() => {
              if (sortField === "remaining") setSortOrder(prev => prev === "asc" ? "desc" : "asc");
              else { setSortField("remaining"); setSortOrder("desc"); }
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all ${sortField === "remaining" ? "border-[#cf5d56]/40 bg-[#cf5d56]/10 text-white font-bold" : "border-transparent hover:bg-white/5"}`}
          >
            Reste à Payer {sortField === "remaining" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>

          <span className="ml-auto text-white/30 font-medium">
            {filteredInvoices.length} facture(s) trouvée(s)
          </span>
        </div>
      </div>

      {/* INVOICES TABLE */}
      <div className="rounded-[28px] border border-white/8 bg-[#161616] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/8 bg-black/40 text-[10px] uppercase font-black tracking-widest text-white/40">
                <th className="py-4 px-5">N° Facture & Date</th>
                <th className="py-4 px-5">Client / Période</th>
                <th className="py-4 px-5 text-right">Tonnage Transporté</th>
                <th className="py-4 px-5 text-right">Montant Total Facturé</th>
                <th className="py-4 px-5 text-right">Montant Payé</th>
                <th className="py-4 px-5 text-right">Reste à Payer</th>
                <th className="py-4 px-5 text-center">Statut</th>
                <th className="py-4 px-5 text-center">Facture & Drive</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {filteredInvoices.map((inv) => {
                const total = inv.totalAmount || 0;
                const paid = inv.paidAmount || 0;
                const remaining = Math.max(0, total - paid);
                const status = getInvoiceStatus(inv);

                return (
                  <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors group">
                    {/* N° FACTURE & DATE */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-white font-mono group-hover:text-[#cf5d56] transition-colors">
                          {inv.invoiceNumber}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-white/40">
                          <span>Émise le {inv.date}</span>
                          {inv.dueDate && (
                            <>
                              <span>•</span>
                              <span className={status === "overdue" ? "text-red-400 font-bold" : ""}>
                                Éch. {inv.dueDate}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CLIENT / PÉRIODE */}
                    <td className="py-4 px-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Building2 className="size-3 text-white/40" /> {inv.client}
                        </span>
                        <span className="text-[11px] text-white/40 mt-0.5">{inv.period || "-"}</span>
                      </div>
                    </td>

                    {/* TONNAGE */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-sm text-indigo-400 font-mono">
                          {formatTon(inv.tonnage)}
                        </span>
                        {inv.ratePerTon && (
                          <span className="text-[10px] text-white/30">
                            @{formatMoney(inv.ratePerTon)}/T
                          </span>
                        )}
                      </div>
                    </td>

                    {/* MONTANT TOTAL */}
                    <td className="py-4 px-5 text-right font-black text-sm text-white font-mono">
                      {formatMoney(total)}
                    </td>

                    {/* MONTANT PAYE */}
                    <td className="py-4 px-5 text-right font-bold text-sm text-[#9fe3b9] font-mono">
                      {formatMoney(paid)}
                    </td>

                    {/* RESTE A PAYER */}
                    <td className="py-4 px-5 text-right">
                      <span className={`font-black text-sm font-mono ${remaining > 0 ? "text-[#ff8f84]" : "text-white/30"}`}>
                        {formatMoney(remaining)}
                      </span>
                    </td>

                    {/* STATUT */}
                    <td className="py-4 px-5 text-center">
                      {status === "paid" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#9fe3b9]/10 text-[#9fe3b9] border border-[#9fe3b9]/25">
                          <CheckCircle2 className="size-3" /> Payée
                        </span>
                      )}
                      {status === "partial" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          <Clock className="size-3" /> Partielle
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          <Clock className="size-3" /> En attente
                        </span>
                      )}
                      {status === "overdue" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                          <AlertTriangle className="size-3" /> En retard
                        </span>
                      )}
                    </td>

                    {/* PIÈCE JOINTE / GOOGLE DRIVE */}
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {inv.driveLink ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setPreviewDoc({
                                  name: `${inv.invoiceNumber} - ${inv.client}`,
                                  driveLink: inv.driveLink,
                                  isDrive: true
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 text-[11px] font-bold transition-all shadow-sm"
                              title="Aperçu Google Drive de la facture"
                            >
                              <FolderOpen className="size-3.5 text-blue-400" />
                              <span>Drive</span>
                            </button>
                            <a
                              href={inv.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-blue-400 border border-white/10 transition-all"
                              title="Ouvrir directement dans Google Drive (nouvel onglet)"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        ) : inv.attachmentData ? (
                          <button
                            onClick={() => setPreviewDoc({ name: inv.attachmentName || inv.invoiceNumber, data: inv.attachmentData! })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-bold border border-white/10 transition-all"
                            title="Aperçu du justificatif local"
                          >
                            <Eye className="size-3.5 text-[#4285F4]" /> Aperçu
                          </button>
                        ) : (
                          <span className="text-white/20 text-xs">-</span>
                        )}
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWrite && remaining > 0 && (
                          <>
                            <button
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setPaymentAmountInput(String(remaining));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#9fe3b9]/20 text-[#9fe3b9] border border-[#9fe3b9]/30 text-[11px] font-bold transition-all"
                              title="Enregistrer un acompte ou règlement"
                            >
                              + Payer
                            </button>
                            <button
                              onClick={() => handleMarkAsPaid(inv)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#9fe3b9]/15 text-white/50 hover:text-[#9fe3b9] transition-all"
                              title="Marquer comme totalement payée"
                            >
                              <Check className="size-3.5" />
                            </button>
                          </>
                        )}

                        {canWrite && (
                          <button
                            onClick={() => openCreateModal(inv)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                            title="Modifier"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                        )}

                        {canWrite && (
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredInvoices.length && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-white/40">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="size-10 text-white/20 stroke-[1.5]" />
                      <p className="font-bold text-sm">Aucune facture ne correspond aux critères sélectionnés.</p>
                      <button
                        onClick={() => {
                          setSelectedYear("ALL");
                          setSelectedMonth("ALL");
                          setSelectedStatus("ALL");
                          setSelectedClient("ALL");
                          setSearchQuery("");
                        }}
                        className="text-xs text-[#cf5d56] hover:underline mt-1"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CRÉER / MODIFIER FACTURE */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#141414] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#cf5d56]/20 border border-[#cf5d56]/30 flex items-center justify-center text-[#cf5d56]">
                  <Receipt className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingInvoice ? "Modifier la Facture" : "Enregistrer une Nouvelle Facture"}
                  </h3>
                  <p className="text-xs text-white/40">Facturation globale basée sur le tonnage transporté</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 text-white/40 hover:text-white rounded-lg">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">N° Facture *</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="ex: FAC-SDV-2026-04"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Client / Donneur d'ordre *</label>
                  <input
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    placeholder="ex: SDV Logistique, CIMAF..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Date d'émission *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Date d'échéance</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Période de transport</label>
                  <input
                    type="text"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="ex: Mars 2026"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  />
                </div>
              </div>

              {/* SECTION CALCUL TONNAGE & TARIF */}
              <div className="p-4 rounded-2xl bg-black/30 border border-white/8 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#4285F4] flex items-center gap-1.5">
                  <Scale className="size-3.5" /> Calcul au Tonnage Global Transporté
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Tonnage Global (Tonnes) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formTonnage}
                      onChange={(e) => handleTonnageChange(e.target.value)}
                      placeholder="ex: 1250.5"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-[#cf5d56]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Tarif / Tonne (CFA)</label>
                    <input
                      type="number"
                      step="1"
                      value={formRate}
                      onChange={(e) => handleRateChange(e.target.value)}
                      placeholder="ex: 15000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-[#cf5d56]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Montant Total Facturé (CFA) *</label>
                    <input
                      type="number"
                      required
                      value={formTotal}
                      onChange={(e) => setFormTotal(e.target.value)}
                      placeholder="ex: 18757500"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-black text-[#9fe3b9] outline-none focus:border-[#cf5d56]"
                    />
                  </div>
                </div>
              </div>

              {/* RÈGLEMENT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Montant déjà payé (CFA)</label>
                  <input
                    type="number"
                    value={formPaid}
                    onChange={(e) => setFormPaid(e.target.value)}
                    placeholder="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-[#cf5d56]"
                  />
                  {parseFloat(formTotal) > 0 && (
                    <p className="mt-1 text-[10px] text-white/40">
                      Reste dû : <span className="font-bold text-[#ff8f84]">{formatMoney(Math.max(0, (parseFloat(formTotal) || 0) - (parseFloat(formPaid) || 0)))}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Mode de Paiement</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                  >
                    <option value="Virement bancaire" className="bg-[#181818]">Virement bancaire</option>
                    <option value="Chèque" className="bg-[#181818]">Chèque</option>
                    <option value="Traite / Effet" className="bg-[#181818]">Traite / Effet de commerce</option>
                    <option value="Espèces" className="bg-[#181818]">Espèces</option>
                    <option value="Mobile Money" className="bg-[#181818]">Mobile Money</option>
                  </select>
                </div>
              </div>

              {/* FICHIER JUSTIFICATIF & LIEN GOOGLE DRIVE */}
              <div className="space-y-4 p-4 rounded-2xl bg-black/30 border border-white/8">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <FolderOpen className="size-3.5" /> Justificatif & Facture Numérisée
                  </span>
                  <span className="text-[10px] text-white/40">Drive ou Fichier Local</span>
                </div>

                {/* Lien Google Drive */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                    Lien Google Drive (PDF / Image de la Facture)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={formDriveLink}
                      onChange={(e) => setFormDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56] pr-28"
                    />
                    {formDriveLink.trim() && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {getDriveId(formDriveLink) ? (
                          <span className="text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-green-500/25">
                            <Check className="size-2.5" /> Drive Valide
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-amber-500/25">
                            Lien direct
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-white/30">
                    Collez le lien de partage Google Drive de la facture globale. L'aperçu intégré sera immédiatement accessible.
                  </p>
                </div>

                {/* Ou Fichier Local */}
                <div className="pt-2 border-t border-white/5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">
                    Ou importer un fichier local (PDF, Image)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      id="invoice-upload-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="invoice-upload-input"
                      className="cursor-pointer px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 transition-all flex items-center gap-2"
                    >
                      <FileText className="size-3.5 text-[#4285F4]" />
                      {formFile ? "Changer le document" : "Sélectionner un fichier..."}
                    </label>
                    {formFile && (
                      <span className="text-xs text-[#9fe3b9] font-bold truncate max-w-xs flex items-center gap-1">
                        <Check className="size-3" /> {formFile.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1.5">Commentaires & Références</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes internes, références de virement..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                />
              </div>

              <div className="pt-4 border-t border-white/8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/60 text-xs font-bold transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#cf5d56] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#cf5d56]/20 transition-all"
                >
                  {editingInvoice ? "Enregistrer les modifications" : "Créer la Facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RÈGLEMENT RAPIDE (ACOMPTE) */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div>
                <h3 className="text-base font-bold text-white">Enregistrer un Règlement</h3>
                <p className="text-xs text-white/40 mt-0.5">Facture {paymentModalInvoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setPaymentModalInvoice(null)} className="p-1.5 text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="mt-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>Montant Total :</span>
                  <span className="font-mono text-white font-bold">{formatMoney(paymentModalInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Déjà Réglé :</span>
                  <span className="font-mono text-[#9fe3b9] font-bold">{formatMoney(paymentModalInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-white/5 text-white">
                  <span>Reste Dû :</span>
                  <span className="font-mono text-[#ff8f84]">{formatMoney(paymentModalInvoice.totalAmount - paymentModalInvoice.paidAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">Montant du versement (CFA) *</label>
                <input
                  type="number"
                  required
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-black text-[#9fe3b9] outline-none focus:border-[#cf5d56]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">Mode de Règlement</label>
                <select
                  value={paymentMethodInput}
                  onChange={(e) => setPaymentMethodInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#cf5d56]"
                >
                  <option value="Virement bancaire" className="bg-[#181818]">Virement bancaire</option>
                  <option value="Chèque" className="bg-[#181818]">Chèque</option>
                  <option value="Espèces" className="bg-[#181818]">Espèces</option>
                  <option value="Traite / Effet" className="bg-[#181818]">Traite / Effet</option>
                  <option value="Mobile Money" className="bg-[#181818]">Mobile Money</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/8 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9fe3b9] text-black text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-[#9fe3b9]/20"
                >
                  Valider le Règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: APERÇU DOCUMENT */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl bg-[#141414] border border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${previewDoc.isDrive ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "bg-[#cf5d56]/15 text-[#cf5d56] border border-[#cf5d56]/20"}`}>
                  {previewDoc.isDrive ? <FolderOpen className="size-5" /> : <FileText className="size-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {previewDoc.name}
                  </h3>
                  <p className="text-[11px] text-white/40">
                    {previewDoc.isDrive ? "Visualisation intégrée Google Drive" : "Aperçu du justificatif local"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)} 
                className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-2 flex items-center justify-center bg-black/50 rounded-2xl my-4 min-h-[520px]">
              {previewDoc.isDrive && previewDoc.driveLink ? (
                <iframe
                  src={getDriveEmbedUrl(previewDoc.driveLink) || previewDoc.driveLink}
                  title={previewDoc.name}
                  className="w-full h-[70vh] rounded-xl border border-white/5 bg-[#1a1a1a]"
                  allow="autoplay; encrypted-media; fullscreen"
                />
              ) : previewDoc.data?.startsWith("data:image") ? (
                <img src={previewDoc.data} alt={previewDoc.name} className="max-h-[70vh] object-contain rounded-lg" />
              ) : previewDoc.data ? (
                <iframe src={previewDoc.data} title={previewDoc.name} className="w-full h-[70vh] rounded-lg border border-white/5" />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/30 p-8">
                  <p>Aperçu indisponible</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/8">
              <span className="text-xs text-white/40">
                {previewDoc.isDrive ? "Lecteur officiel Google Drive" : "Document justificatif numérisé"}
              </span>
              <div className="flex items-center gap-2">
                {previewDoc.isDrive && previewDoc.driveLink && (
                  <a
                    href={previewDoc.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all shadow-sm"
                  >
                    <ExternalLink className="size-3.5" /> Ouvrir sur Google Drive
                  </a>
                )}
                {previewDoc.data && (
                  <a
                    href={previewDoc.data}
                    download={previewDoc.name}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                  >
                    <Download className="size-3.5" /> Télécharger
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountingModule;

