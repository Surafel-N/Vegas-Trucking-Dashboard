import React, { useState, useMemo } from 'react';
import {
  Handshake,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  Truck,
  Layers,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  Info,
  Building2,
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  computeCMLReconciliation,
  CMLPaymentRecord,
  CFA_TO_USD_RATE
} from '../utils/cmlReconciliation';
import { generateCMLStatement } from '../utils/generateCMLStatement';
import { type Language } from '../utils/i18n';

interface CMLPartnerReconciliationProps {
  trips?: any[];
  transactions?: any[];
  formatCurrency?: (val: number, curr?: string) => string;
  formatTonnage?: (val: number) => string;
  t?: any;
  language?: Language;
}

export function CMLPartnerReconciliation({
  trips = [],
  transactions = [],
  formatCurrency,
  formatTonnage,
  t,
  language = "FR"
}: CMLPartnerReconciliationProps) {
  const isEn = language === "EN";

  // Filtres
  const [periodFilter, setPeriodFilter] = useState<"ALL" | "2026" | "2025">("ALL");
  const [corridorFilter, setCorridorFilter] = useState<"ALL" | "SAN_PEDRO" | "ABIDJAN">("ALL");
  const [activeSection, setActiveSection] = useState<"summary" | "payments" | "corridors" | "monthly">("summary");

  // Paiements personnalisés ou surcharges locales
  const [customPayments, setCustomPayments] = useState<CMLPaymentRecord[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sdv_cml_custom_payments_v1");
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load custom CML payments:", e);
      }
    }
    return [];
  });

  const saveCustomPayments = (updated: CMLPaymentRecord[]) => {
    setCustomPayments(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sdv_cml_custom_payments_v1", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save custom CML payments:", e);
      }
    }
  };

  // Bascule de statut d'un encaissement (Encaissé <-> Annulé / Canceled)
  const handleTogglePaymentStatus = (payment: CMLPaymentRecord) => {
    const nextStatus = payment.status === "paid" ? "canceled" : "paid";
    const nextComment = nextStatus === "canceled" 
      ? (payment.comment.includes("canceled") ? payment.comment : `${payment.comment} (canceled)`)
      : payment.comment.replace(/\s*\(canceled\)/gi, "").trim();

    const updatedPayment: CMLPaymentRecord = {
      ...payment,
      status: nextStatus,
      comment: nextComment
    };

    const existingIdx = customPayments.findIndex(p => p.id === payment.id || (p.sourceRow && p.sourceRow === payment.sourceRow));
    let nextList: CMLPaymentRecord[];
    if (existingIdx >= 0) {
      nextList = [...customPayments];
      nextList[existingIdx] = updatedPayment;
    } else {
      nextList = [...customPayments, updatedPayment];
    }
    saveCustomPayments(nextList);
  };

  // Calcul haute-précision réactif
  const recon = useMemo(() => {
    return computeCMLReconciliation(trips, transactions, periodFilter, corridorFilter, customPayments);
  }, [trips, transactions, periodFilter, corridorFilter, customPayments]);

  // Formatage des montants
  const fmtCfa = (val: number) => {
    return Number(val || 0).toLocaleString(isEn ? "en-US" : "fr-FR") + " CFA";
  };

  const fmtUsd = (val: number) => {
    return "$" + Number(val || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " USD";
  };

  const fmtTon = (val: number) => {
    return Number(val || 0).toLocaleString(isEn ? "en-US" : "fr-FR") + " T";
  };

  // Déclencheur téléchargement relevé PDF mensuel
  const handleDownloadStatement = (month: number, year: number) => {
    generateCMLStatement(trips, month, year, t);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-white pb-12 animate-in fade-in duration-500 font-sans">
      
      {/* 1. EN-TÊTE PRINCIPAL : TITRE & FILTRES RAPIDES */}
      <div className="bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-[#cf5d56]/10 text-[#cf5d56] border border-[#cf5d56]/20">
              <Handshake className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  {isEn ? "CML Partner Financial Reconciliation" : "Réconciliation Financière Partenaire CML"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Lauzua Mining Hub
                </span>
              </div>
              <p className="text-xs text-white/50">
                {isEn 
                  ? "Exclusive tracking of Lauzua -> San Pedro & Lauzua -> Abidjan manganese hauls" 
                  : "Suivi exclusif des rotations de manganèse Lauzua -> San Pedro & Lauzua -> Abidjan"}
              </p>
            </div>
          </div>
        </div>

        {/* Barre de contrôles & Sélecteurs */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Sélecteur de Période */}
          <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl">
            <button
              onClick={() => setPeriodFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodFilter === "ALL"
                  ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {isEn ? "Cumul 2025 + 2026" : "Cumul 2025 + 2026"}
            </button>
            <button
              onClick={() => setPeriodFilter("2026")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodFilter === "2026"
                  ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              2026
            </button>
            <button
              onClick={() => setPeriodFilter("2025")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                periodFilter === "2025"
                  ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              2025
            </button>
          </div>

          {/* Sélecteur de Corridor */}
          <div className="flex bg-black/40 border border-white/10 p-1 rounded-2xl">
            <button
              onClick={() => setCorridorFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                corridorFilter === "ALL"
                  ? "bg-white/10 text-white border border-white/10"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {isEn ? "All Corridors" : "Tous Corridors"}
            </button>
            <button
              onClick={() => setCorridorFilter("SAN_PEDRO")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                corridorFilter === "SAN_PEDRO"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-white/40 hover:text-white"
              }`}
            >
              San Pedro
            </button>
            <button
              onClick={() => setCorridorFilter("ABIDJAN")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                corridorFilter === "ABIDJAN"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Abidjan
            </button>
          </div>

          {/* Badge Taux Fixe USD */}
          <div className="px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-emerald-400" />
            <span>1 USD = {CFA_TO_USD_RATE} CFA</span>
          </div>
        </div>
      </div>

      {/* 2. LES 3 MASTER CARTES KPI (DUAL CURRENCY CFA & USD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARTE 1 : TOTAL FACTURÉ CML */}
        <div className="bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {isEn ? "Total CML Transport Billed" : "Total Transport Facturé CML"}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="size-4" />
            </div>
          </div>

          {/* Montant CFA & USD */}
          <div className="space-y-1 mb-4">
            <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {fmtCfa(recon.totalGrossCfa)}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-blue-400">
                {fmtUsd(recon.totalGrossUsd)}
              </span>
              <span className="text-white/30 text-xs">•</span>
              <span className="text-xs font-semibold text-white/50">
                {recon.loadedTrips} {isEn ? "loaded trips" : "voyages chargés"} ({fmtTon(recon.totalTonnage)})
              </span>
            </div>
          </div>

          {/* Décomposition Déposé vs Restant à déposer */}
          <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-white/70">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                {isEn ? "Submitted / Deposited invoices" : "Factures déposées"} :
              </span>
              <span className="font-bold text-white">
                {fmtCfa(recon.depositedGrossCfa)}
              </span>
            </div>
            {recon.ongoingMonthGrossCfa > 0 && (
              <div className="flex justify-between items-center text-amber-400 font-semibold bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-amber-400" />
                  {isEn ? "Oct 2026 (Pending submission)" : "Octobre 2026 (Restant à déposer)"} :
                </span>
                <span className="font-bold">
                  {fmtCfa(recon.ongoingMonthGrossCfa)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARTE 2 : TOTAL ENCAISSÉ CML */}
        <div className="bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {isEn ? "Total Collected / Paid by CML" : "Total Encaissé / Payé par CML"}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="size-4" />
            </div>
          </div>

          {/* Montant CFA & USD */}
          <div className="space-y-1 mb-4">
            <h3 className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight">
              {fmtCfa(recon.totalPaidCfa)}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-emerald-300">
                {fmtUsd(recon.totalPaidUsd)}
              </span>
              <span className="text-white/30 text-xs">•</span>
              <span className="text-xs font-semibold text-emerald-400/70">
                {recon.paidPaymentsCount} {isEn ? "validated payments" : "règlements validés"}
              </span>
            </div>
          </div>

          {/* Taux de recouvrement & Annulations */}
          <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-white/70">
              <span>{isEn ? "Recovery Rate" : "Taux d'encaissement"} :</span>
              <span className="font-black text-emerald-400">
                {recon.recoveryRate}% {isEn ? "of total billed" : "du total facturé"}
              </span>
            </div>
            {recon.canceledAmountCfa > 0 && (
              <div className="flex justify-between items-center text-red-400/80 text-[11px]">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="size-3 text-red-400" />
                  {isEn ? "Canceled / Bounced check deducted" : "Chèque impayé annulé déduit"} :
                </span>
                <span className="font-bold line-through">
                  {fmtCfa(recon.canceledAmountCfa)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARTE 3 : RESTE À PAYER (CRÉANCE CML AVEC MOIS EN COURS ENTRE PARENTHÈSES) */}
        <div className="bg-[#181818] border border-[#cf5d56]/30 bg-gradient-to-b from-[#cf5d56]/5 to-transparent rounded-[28px] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#cf5d56]/10 rounded-full blur-2xl group-hover:bg-[#cf5d56]/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#cf5d56]">
              {isEn ? "Outstanding Balance Due from CML" : "Reste à Payer / Créance CML"}
            </span>
            <div className="p-2 rounded-xl bg-[#cf5d56]/20 text-[#cf5d56] border border-[#cf5d56]/30">
              <Clock className="size-4" />
            </div>
          </div>

          {/* Montant Total Reste à Payer */}
          <div className="space-y-1 mb-3">
            <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              {fmtCfa(recon.remainingTotalCfa)}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#cf5d56]">
                {fmtUsd(recon.remainingTotalUsd)}
              </span>
              <span className="text-white/30 text-xs">•</span>
              <span className="text-xs font-semibold text-white/50">
                {isEn ? "Total remaining to collect" : "Solde total à percevoir"}
              </span>
            </div>
          </div>

          {/* MENTION EXACTE REQUISE : MOIS EN COURS ENTRE PARENTHÈSES */}
          <div className="pt-3 border-t border-[#cf5d56]/20 space-y-2 text-xs">
            {recon.ongoingMonthGrossCfa > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <p className="text-[11px] font-black tracking-wide leading-tight">
                  (dont {fmtCfa(recon.ongoingMonthGrossCfa)} / {fmtUsd(recon.ongoingMonthGrossUsd)} facture restant à déposer - Octobre 2026)
                </p>
                <div className="mt-1 pt-1 border-t border-amber-500/20 flex justify-between items-center text-[10px] text-white/70">
                  <span>{isEn ? "Due on submitted invoices" : "Solde échu factures déposées"} :</span>
                  <span className="font-black text-white">{fmtCfa(recon.remainingDepositedCfa)} ({fmtUsd(recon.remainingDepositedUsd)})</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-white/70">
                <span>{isEn ? "Status" : "Statut"} :</span>
                <span className="font-bold text-white">{isEn ? "All invoices submitted" : "Toutes factures déposées"}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. NAVIGATION PAR ONGLETS INTERACTIFS */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSection("summary")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "summary"
              ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Building2 className="size-4" />
          {isEn ? "Summary & Breakdown" : "Synthèse & Rapprochement"}
        </button>
        <button
          onClick={() => setActiveSection("payments")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "payments"
              ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <DollarSign className="size-4" />
          {isEn ? "Spreadsheet Receipts Journal" : "Journal des Règlements (Spreadsheet)"}
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
            {recon.payments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection("corridors")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "corridors"
              ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Truck className="size-4" />
          {isEn ? "San Pedro vs Abidjan Corridors" : "Corridors San Pedro vs Abidjan"}
        </button>
        <button
          onClick={() => setActiveSection("monthly")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSection === "monthly"
              ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20"
              : "text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Calendar className="size-4" />
          {isEn ? "Monthly Invoicing & PDF Statements" : "Décompte Mensuel & Relevés PDF"}
        </button>
      </div>

      {/* 4. CONTENU DE L'ONGLET SÉLECTIONNÉ */}

      {/* SECTION A : SYNTHÈSE GLOBALE & RAPPROCHEMENT */}
      {activeSection === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Bloc Gauche : Équation financière détaillée */}
          <div className="lg:col-span-7 bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-tight text-white">
                  {isEn ? "CML Partner Balance Reconciliation Equation" : "Équation de Réconciliation Partenaire CML"}
                </h4>
                <p className="text-xs text-white/40">
                  {isEn ? "Contractual balance breakdown in CFA and US Dollars" : "Décomposition contractuelle du solde en CFA et Dollars"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Ligne 1 : Transport Réalisé */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">
                    1. {isEn ? "Total Transport Billed (2025 + 2026)" : "Total Transport Réalisé (2025 + 2026)"}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {recon.loadedTrips} {isEn ? "trips" : "rotations"} • {fmtTon(recon.totalTonnage)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{fmtCfa(recon.totalGrossCfa)}</p>
                  <p className="text-xs font-bold text-blue-400">{fmtUsd(recon.totalGrossUsd)}</p>
                </div>
              </div>

              {/* Ligne 2 : Déduction des Factures Déposées vs Octobre */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">
                    • {isEn ? "Invoices submitted to client" : "Factures déposées auprès de CML"} :
                  </span>
                  <span className="font-bold text-white">
                    {fmtCfa(recon.depositedGrossCfa)} ({fmtUsd(recon.depositedGrossUsd)})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-amber-300">
                  <span>
                    • {isEn ? "October 2026 (Pending submission)" : "Octobre 2026 (Facture restant à déposer)"} :
                  </span>
                  <span className="font-black">
                    {fmtCfa(recon.ongoingMonthGrossCfa)} ({fmtUsd(recon.ongoingMonthGrossUsd)})
                  </span>
                </div>
              </div>

              {/* Ligne 3 : Total Encaissé */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-emerald-300">
                    2. {isEn ? "Total Collected / Paid by CML (Spreadsheet)" : "Total Encaissé par CML (Spreadsheet)"}
                  </p>
                  <p className="text-[11px] text-emerald-400/60">
                    {recon.paidPaymentsCount} {isEn ? "receipts processed" : "encaissements enregistrés"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">- {fmtCfa(recon.totalPaidCfa)}</p>
                  <p className="text-xs font-bold text-emerald-300">- {fmtUsd(recon.totalPaidUsd)}</p>
                </div>
              </div>

              {/* Ligne 4 : Reste à Payer Résultant */}
              <div className="p-4 rounded-2xl bg-[#cf5d56]/10 border border-[#cf5d56]/30 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-[#cf5d56]">
                    = {isEn ? "Net Outstanding Due" : "Reste à Payer Net (Créance Partenaire)"}
                  </p>
                  <p className="text-[11px] text-amber-300 font-bold">
                    (dont {fmtCfa(recon.ongoingMonthGrossCfa)} / {fmtUsd(recon.ongoingMonthGrossUsd)} facture restant à déposer - Octobre 2026)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-white">{fmtCfa(recon.remainingTotalCfa)}</p>
                  <p className="text-xs font-bold text-[#cf5d56]">{fmtUsd(recon.remainingTotalUsd)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bloc Droit : Corridors et répartition */}
          <div className="lg:col-span-5 bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Truck className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-white">
                    {isEn ? "Volume by Corridor" : "Répartition par Corridor"}
                  </h4>
                  <p className="text-xs text-white/40">San Pedro vs Abidjan</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* San Pedro */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-sky-400">Mine de Lauzua &rarr; San Pedro</span>
                    <span className="font-black text-white">{recon.sanPedro.sharePercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-400 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${recon.sanPedro.sharePercent}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-white/50 pt-1">
                    <span>{recon.sanPedro.trips} voyages • {fmtTon(recon.sanPedro.tonnage)}</span>
                    <span className="font-bold text-white">{fmtCfa(recon.sanPedro.grossCfa)} ({fmtUsd(recon.sanPedro.grossUsd)})</span>
                  </div>
                </div>

                {/* Abidjan */}
                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-400">Mine de Lauzua &rarr; Abidjan</span>
                    <span className="font-black text-white">{recon.abidjan.sharePercent}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${recon.abidjan.sharePercent}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-white/50 pt-1">
                    <span>{recon.abidjan.trips} voyages • {fmtTon(recon.abidjan.tonnage)}</span>
                    <span className="font-bold text-white">{fmtCfa(recon.abidjan.grossCfa)} ({fmtUsd(recon.abidjan.grossUsd)})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note informative */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/60 flex items-start gap-2.5">
              <Info className="size-4 text-[#cf5d56] shrink-0 mt-0.5" />
              <span>
                {isEn 
                  ? "Payments recorded with 'payed by cml' in Spreadsheet Col M/N are automatically captured. Unpaid or bounced checks marked 'canceled' are deducted."
                  : "Les écritures mentionnant 'payed by cml' dans les commentaires du Spreadsheet sont automatiquement comptabilisées. Les chèques impayés avec la mention 'canceled' sont déduits."}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* SECTION B : JOURNAL DES RÈGLEMENTS (SPREADSHEET PAYED BY CML / CANCELED) */}
      {activeSection === "payments" && (
        <div className="bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-400" />
                {isEn ? "CML Payments & Bank Transfers (Spreadsheet Col B / M / N)" : "Journal des Règlements CML (Spreadsheet Col B / M / N)"}
              </h3>
              <p className="text-xs text-white/40">
                {isEn 
                  ? "Detection of 'payed by cml' inflows and deductions for 'canceled' returned checks"
                  : "Détection automatique des mentions 'payed by cml' et déduction des annulations 'canceled'"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-white/40">{isEn ? "Total collected" : "Total encaissé"} :</span>
              <p className="text-lg font-black text-emerald-400">{fmtCfa(recon.totalPaidCfa)} ({fmtUsd(recon.totalPaidUsd)})</p>
            </div>
          </div>

          {/* Tableau des Règlements */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">{isEn ? "Spreadsheet Row" : "Ligne Spreadsheet"}</th>
                  <th className="py-3 px-4">{isEn ? "Description / Comment" : "Commentaire / Libellé"}</th>
                  <th className="py-3 px-4 text-right">{isEn ? "Amount (CFA)" : "Montant (CFA)"}</th>
                  <th className="py-3 px-4 text-right">{isEn ? "Amount (USD)" : "Montant (USD)"}</th>
                  <th className="py-3 px-4 text-center">{isEn ? "Status" : "Statut"}</th>
                  <th className="py-3 px-4 text-center">{isEn ? "Action" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {recon.payments.map((p) => {
                  const isPaid = p.status === "paid";
                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-white/[0.02] transition-colors ${!isPaid ? "opacity-60 bg-red-500/[0.03]" : ""}`}
                    >
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        {p.date}
                      </td>
                      <td className="py-3.5 px-4 text-white/50 whitespace-nowrap">
                        {p.sourceRow ? `Row ${p.sourceRow}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-white/80 max-w-md truncate">
                        <span className={!isPaid ? "line-through text-white/40" : ""}>
                          {p.comment}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black whitespace-nowrap ${isPaid ? "text-emerald-400" : "text-red-400 line-through"}`}>
                        {fmtCfa(p.amount)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${isPaid ? "text-emerald-300" : "text-red-300/70 line-through"}`}>
                        {fmtUsd(p.amountUsd)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isPaid ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3" />
                            {isEn ? "Paid / Encaissé" : "Encaissé"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 inline-flex items-center gap-1">
                            <X className="size-3" />
                            {isEn ? "Canceled" : "Annulé (canceled)"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePaymentStatus(p)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/70 hover:text-white transition-all border border-white/5"
                          title={isPaid ? "Marquer comme annulé" : "Rétablir comme encaissé"}
                        >
                          <RotateCcw className="size-3 inline mr-1" />
                          {isPaid ? (isEn ? "Cancel" : "Annuler") : (isEn ? "Restore" : "Rétablir")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION C : VENTILATION DÉTAILLÉE PAR CORRIDOR */}
      {activeSection === "corridors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Corridor San Pedro */}
          <div className="bg-[#181818] border border-sky-500/20 rounded-[28px] p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Truck className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Mine de Lauzua &rarr; San Pedro
                  </h3>
                  <p className="text-xs text-sky-400/80 font-bold">
                    {isEn ? "San Pedro Port Transit Route" : "Corridor Portuaire San Pedro"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {recon.sanPedro.sharePercent}% {isEn ? "of volume" : "du volume"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Loaded Trips" : "Rotations Chargées"}</span>
                <p className="text-xl font-black text-white mt-1">{recon.sanPedro.trips}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Total Tonnage" : "Tonnage Transporté"}</span>
                <p className="text-xl font-black text-white mt-1">{fmtTon(recon.sanPedro.tonnage)}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-1">
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                {isEn ? "Total Corridor Revenue" : "Chiffre d'Affaires Corridor"}
              </span>
              <p className="text-2xl font-black text-white">{fmtCfa(recon.sanPedro.grossCfa)}</p>
              <p className="text-sm font-bold text-sky-400">{fmtUsd(recon.sanPedro.grossUsd)}</p>
            </div>
          </div>

          {/* Corridor Abidjan */}
          <div className="bg-[#181818] border border-amber-500/20 rounded-[28px] p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Truck className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    Mine de Lauzua &rarr; Abidjan
                  </h3>
                  <p className="text-xs text-amber-400/80 font-bold">
                    {isEn ? "Abidjan Port Transit Route" : "Corridor Portuaire Abidjan"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {recon.abidjan.sharePercent}% {isEn ? "of volume" : "du volume"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Loaded Trips" : "Rotations Chargées"}</span>
                <p className="text-xl font-black text-white mt-1">{recon.abidjan.trips}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Total Tonnage" : "Tonnage Transporté"}</span>
                <p className="text-xl font-black text-white mt-1">{fmtTon(recon.abidjan.tonnage)}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-1">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                {isEn ? "Total Corridor Revenue" : "Chiffre d'Affaires Corridor"}
              </span>
              <p className="text-2xl font-black text-white">{fmtCfa(recon.abidjan.grossCfa)}</p>
              <p className="text-sm font-bold text-amber-400">{fmtUsd(recon.abidjan.grossUsd)}</p>
            </div>
          </div>

        </div>
      )}

      {/* SECTION D : DÉCOMPTE MENSUEL & TÉLÉCHARGEMENT RELEVÉ PDF */}
      {activeSection === "monthly" && (
        <div className="bg-[#181818] border border-white/10 rounded-[28px] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Calendar className="size-4 text-blue-400" />
                {isEn ? "Monthly Invoicing & PDF Statements" : "Historique Mensuel & Téléchargement Relevés PDF"}
              </h3>
              <p className="text-xs text-white/40">
                {isEn 
                  ? "Track billing month-by-month and download official statements for partner CML" 
                  : "Suivez la facturation mois par mois et téléchargez les relevés officiels pour le partenaire CML"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-white/40">
                  <th className="py-3 px-4">{isEn ? "Month" : "Mois"}</th>
                  <th className="py-3 px-4 text-center">{isEn ? "Trips" : "Voyages"}</th>
                  <th className="py-3 px-4 text-right">{isEn ? "Tonnage" : "Tonnage"}</th>
                  <th className="py-3 px-4 text-right">{isEn ? "Billed (CFA)" : "Facturé (CFA)"}</th>
                  <th className="py-3 px-4 text-right">{isEn ? "Billed (USD)" : "Facturé (USD)"}</th>
                  <th className="py-3 px-4 text-center">{isEn ? "Invoice Status" : "Statut Facturation"}</th>
                  <th className="py-3 px-4 text-center">{isEn ? "PDF Statement" : "Relevé PDF"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {recon.monthlyStats.map((st) => {
                  const isOct = st.year === 2026 && st.month === 10;
                  return (
                    <tr 
                      key={`${st.year}-${st.month}`}
                      className={`hover:bg-white/[0.02] transition-colors ${isOct ? "bg-amber-500/[0.04]" : ""}`}
                    >
                      <td className="py-3.5 px-4 font-black text-white whitespace-nowrap">
                        {st.label}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white/80 whitespace-nowrap">
                        {st.tripsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white/80 whitespace-nowrap">
                        {fmtTon(st.tonnage)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-white whitespace-nowrap">
                        {fmtCfa(st.grossCfa)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-blue-400 whitespace-nowrap">
                        {fmtUsd(st.grossUsd)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {st.isDeposited ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {isEn ? "Invoice Submitted" : "Facture Déposée"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {isEn ? "Pending Submission" : "Facture Restant à Déposer"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadStatement(st.month, st.year)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#cf5d56] text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 border border-white/10"
                        >
                          <Download className="size-3" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
