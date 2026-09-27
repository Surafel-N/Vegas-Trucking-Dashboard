import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Clock, 
  X,
  ShieldCheck,
  Download,
  Info,
  Layers,
  ArrowDownRight
} from 'lucide-react';
import { WalletIcon } from './WalletIcon';
import { 
  FuelAdvance, 
  FuelCashSummary, 
  computeFuelReconciliation,
  RUNNING_ACCOUNT_ID
} from '../utils/fuelAdvanceTracker';
import { AccountingTransaction } from '../utils/accountingParser';
import { Language } from '../utils/i18n';

interface FuelAdvanceDashboardWidgetProps {
  advances: FuelAdvance[];
  transactions: AccountingTransaction[];
  rawCashBalance?: number;
  onAddAdvance?: (advance: FuelAdvance) => void;
  formatCurrency?: (val: number, curr?: string) => string;
  currency?: string;
  t?: any;
  language?: Language;
  canEdit?: boolean;
}

export function FuelAdvanceDashboardWidget({
  advances,
  transactions,
  rawCashBalance,
  onAddAdvance,
  formatCurrency,
  currency = "CFA",
  t,
  language = "FR",
  canEdit = true
}: FuelAdvanceDashboardWidgetProps) {
  const isEn = language === "EN";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Sélection de l'avance suivie : par défaut l'avance de 4 000 000 CFA
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>("adv-auto-465");

  // Formulaire d'ajout rapide d'avance
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState("4000000");
  const [formStation, setFormStation] = useState("Shell San Pedro");
  const [formNotes, setFormNotes] = useState("Paiement avance carburant station");

  // Formatage monétaire
  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${Math.round(val).toLocaleString()} ${currency}`;
  };

  // Calcul du résumé du décompte en fonction de l'avance sélectionnée
  const summary: FuelCashSummary = useMemo(() => {
    return computeFuelReconciliation(advances, transactions, rawCashBalance, selectedAdvanceId);
  }, [advances, transactions, rawCashBalance, selectedAdvanceId]);

  const isOverdrawn = summary.totalAmountDue > 0;

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAdvance) return;

    const amt = parseFloat(formAmount.replace(/\s/g, '')) || 0;
    if (amt <= 0) return;

    const newAdvId = `adv-manual-${Date.now()}`;
    const newAdv: FuelAdvance = {
      id: newAdvId,
      date: formDate,
      amount: amt,
      station: formStation.trim() || "Shell San Pedro",
      paymentMethod: "Virement Bancaire",
      notes: formNotes.trim(),
      source: "manual",
      status: "active"
    };

    onAddAdvance(newAdv);
    setSelectedAdvanceId(newAdvId);
    setIsAddFormOpen(false);
    setFormNotes("Paiement avance carburant station");
  };

  const handleExportCSV = () => {
    const headers = [
      isEn ? "Date" : "Date",
      isEn ? "Truck Refuel / Comment" : "Ravitaillement / Commentaire",
      isEn ? "Daily Fuel (CFA)" : "Gasoil du Jour (CFA)",
      isEn ? "Advance Balance (CFA)" : "Solde de l'Avance (CFA)",
      isEn ? "Status" : "Statut"
    ];

    const rows = summary.dailyDrawdownLedger.map(log => [
      `"${log.date}"`,
      `"${(log.comment || '').replace(/"/g, '""')}"`,
      log.amount,
      log.remainingAdvanceBalance,
      `"${log.status === 'covered' ? 'Couvert' : log.status === 'low_credit' ? 'Crédit Faible' : 'Dépassement / Reste à payer'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `decompte_${summary.selectedAdvanceId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl relative overflow-hidden group">
      {/* Halo d'ambiance d'arrière-plan */}
      <div className={`absolute top-0 right-0 w-80 h-80 ${isOverdrawn ? 'bg-red-500/5' : 'bg-amber-500/5'} rounded-full blur-3xl pointer-events-none transition-all`} />

      {/* EN-TÊTE DU WIDGET */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Fuel className="size-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                {t?.fuelAdvanceTitle || (isEn ? "Fuel Advances & Station Prepayments" : "Avances & Dépôts Carburant Station")}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                {summary.activeStation}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {t?.fuelAdvanceSubtitle || (isEn 
                ? "Live day-by-day drawdown of truck fuel against prepaid station advances"
                : "Décompte au jour le jour du carburant consommé face aux acomptes versés")}
            </p>
          </div>
        </div>

        {/* SÉLECTEUR D'AVANCE & ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur déroulant de l'avance à décompter */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-1.5 text-xs shadow-inner">
            <Layers className="size-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white/50 whitespace-nowrap">
              {t?.selectAdvanceToTrack || (isEn ? "Advance:" : "Suivi :")}
            </span>
            <select
              value={summary.selectedAdvanceId}
              onChange={(e) => setSelectedAdvanceId(e.target.value)}
              className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="adv-auto-465" className="bg-[#1c1c1e] text-white">
                ⭐ {isEn ? "Advance 4,000,000 CFA — Shell San Pedro (15/09/2026)" : "Avance 4 000 000 CFA — Shell San Pedro (15/09/2026)"}
              </option>
              <option value="adv-auto-472" className="bg-[#1c1c1e] text-white">
                {isEn ? "Advance 2,500,000 CFA — Shell San Pedro (22/09/2026)" : "Avance 2 500 000 CFA — Shell San Pedro (22/09/2026)"}
              </option>
              <option value={RUNNING_ACCOUNT_ID} className="bg-[#1c1c1e] text-white">
                {t?.runningAccountSeptember || (isEn ? "🔄 Shell San Pedro Running Account (Sept. 2026 — 6.5M CFA)" : "🔄 Compte Courant Shell San Pedro (Sept. 2026 — 6,5M CFA)")}
              </option>
              {summary.recentAdvances
                .filter(a => a.id !== "adv-auto-465" && a.id !== "adv-auto-472")
                .map(a => (
                  <option key={a.id} value={a.id} className="bg-[#1c1c1e] text-white">
                    {a.amount.toLocaleString()} CFA — {a.station} ({a.date})
                  </option>
                ))}
            </select>
          </div>

          {canEdit && onAddAdvance && (
            <button
              onClick={() => { setIsAddFormOpen(true); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="size-3.5" />
              <span>{isEn ? "+ New Advance" : "+ Nouvelle Avance"}</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <span>{t?.viewDetailedDrawdown || (isEn ? "View Drawdown" : "Voir Décompte")}</span>
            <ChevronRight className="size-3.5 text-white/40" />
          </button>
        </div>
      </div>

      {/* GRILLE PRINCIPALE DU WIDGET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* CARTE 1 (GAUCHE) : SOLDE RESTANT DU DÉPÔT / AVANCE & AUTONOMIE */}
        <div className="lg:col-span-5 rounded-2xl bg-white/3 border border-white/5 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {isOverdrawn 
                  ? (t?.amountDueStation || (isEn ? "Amount Due to Station" : "Reste à Régler à la Station"))
                  : (t?.fuelDepositBalance || (isEn ? "Remaining Fuel Deposit" : "Solde Dépôt Carburant Restant"))}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isOverdrawn
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isOverdrawn 
                  ? (isEn ? "Overdrawn / Due" : "Dépassement / À régler")
                  : (isEn ? "Prepaid Credit Active" : "Crédit Disponible en Station")}
              </span>
            </div>

            <div className="mt-3">
              <p className={`text-2xl sm:text-3xl font-black tracking-tight ${isOverdrawn ? 'text-red-400' : 'text-emerald-400'}`}>
                {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : `+${formatMoney(summary.currentDepositBalance)}`}
              </p>
            </div>

            {/* BARRE DE PROGRESSION DU DÉCOMPTE */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>
                  {t?.drawdownProgress || (isEn ? "Drawdown consumed:" : "Décompte consommé :")}{" "}
                  <strong className="text-white">{formatMoney(summary.fuelConsumed)}</strong> / {formatMoney(summary.advanceAmount)}
                </span>
                <span className="font-bold text-white">{Math.round(summary.percentUsed)}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    summary.percentUsed >= 100 ? 'bg-red-500' : summary.percentUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary.percentUsed)}%` }}
                />
              </div>
            </div>
          </div>

          {/* INDICATEUR D'AUTONOMIE */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-white/50">
              <Clock className="size-3.5 text-amber-400" />
              <span>{t?.daysOfFuelReserve || (isEn ? "Estimated fuel coverage:" : "Autonomie carburant estimée :")}</span>
            </div>
            <span className="font-black text-amber-300">
              {summary.estimatedDaysCoverage} {isEn ? "days of operations" : "jours d'activité"}
            </span>
          </div>
        </div>

        {/* CARTE 2 (DROITE) : RÉCONCILIATION CASH BALANCE (DEMANDE SPÉCIFIQUE UTILISATEUR) */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-white/4 via-white/2 to-transparent border border-white/8 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <WalletIcon className="size-4 text-[#00F2FF]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white/70">
                  {isEn ? "Cash Balance Breakdown & Real Free Liquidity" : "Réconciliation Balance Cash & Trésorerie"}
                </span>
              </div>
              <span className="text-[10px] text-white/40 italic flex items-center gap-1">
                <Info className="size-3" /> {isEn ? "Prepayment Impact" : "Impact des Dépôts"}
              </span>
            </div>

            {/* GRILLE DES 3 NIVEAUX DE TRÉSORERIE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* NIVEAU 1 : SOLDE EN COMPTE (BRUT) */}
              <div className="rounded-xl bg-white/3 border border-white/5 p-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  {isEn ? "1. Bank / Cash" : "1. Solde en Compte"}
                </p>
                <p className="text-base font-black text-white mt-1">
                  {formatMoney(summary.grossCashBalance)}
                </p>
                <p className="text-[9px] text-white/30 mt-0.5">
                  {isEn ? "Gross ledger balance" : "Solde brut en compte"}
                </p>
              </div>

              {/* NIVEAU 2 : DÉPÔT CARBURANT IMMOBILISÉ OU DETTE STATION */}
              <div className={`rounded-xl ${isOverdrawn ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'} border p-3`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isOverdrawn ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdrawn 
                    ? (isEn ? "2. Station Due" : "2. Dette Station")
                    : (isEn ? "2. Fuel Deposit" : "2. Dépôt Carburant")}
                </p>
                <p className={`text-base font-black mt-1 ${isOverdrawn ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : formatMoney(summary.fuelDepositCommitted)}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {isOverdrawn ? (isEn ? "To pay to station" : "Reste à régler") : (isEn ? "Blocked in station" : "Immobilisé station")}
                </p>
              </div>

              {/* NIVEAU 3 : CASH RÉELLEMENT DISPONIBLE (NET) */}
              <div className="rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/25 p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-12 h-12 bg-[#00F2FF]/10 rounded-full blur-xl pointer-events-none" />
                <p className="text-[10px] font-bold text-[#00F2FF] uppercase tracking-wider">
                  {isEn ? "3. Real Free Cash" : "3. Cash Libre Réel"}
                </p>
                <p className="text-base font-black text-[#00F2FF] mt-1">
                  {formatMoney(summary.netAvailableCash)}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {isEn ? "Truly spendable" : "Réellement disponible"}
                </p>
              </div>
            </div>
          </div>

          {/* BANDEAU PÉDAGOGIQUE EXPLICATIF DE TRÉSORERIE */}
          <div className="mt-3 p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <p className="leading-tight text-[11px]">
              {isEn ? (
                <>
                  <strong className="text-white">Treasury Reality:</strong> You have {formatMoney(summary.grossCashBalance)} on account, but actually{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> spendable free cash because{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> is reserved at the fuel station.
                </>
              ) : (
                <>
                  <strong className="text-white">Réalité de Trésorerie :</strong> Vous avez {formatMoney(summary.grossCashBalance)} sur le compte, mais réellement{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> de cash disponible car{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> sont en dépôt chez {summary.activeStation}.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DU GRAND LIVRE DE DÉCOMPTE & GESTION DES AVANCES                    */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161618] border border-white/10 rounded-[32px] p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
            {/* EN-TÊTE MODAL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Fuel className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isEn ? "Detailed Fuel Drawdown Ledger" : "Grand Livre du Décompte Journalier"}
                  </h3>
                  <p className="text-xs text-white/50">
                    {summary.activeStation} • {summary.dailyDrawdownLedger.length} {isEn ? "daily refuels logged" : "ravitaillements décomptés"}
                  </p>
                </div>
              </div>

              {/* SÉLECTEUR DIRECT DANS LE MODAL */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
                  <select
                    value={summary.selectedAdvanceId}
                    onChange={(e) => setSelectedAdvanceId(e.target.value)}
                    className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="adv-auto-465" className="bg-[#1c1c1e] text-white">
                      ⭐ {isEn ? "Advance 4,000,000 CFA (15/09)" : "Avance 4 000 000 CFA (15/09)"}
                    </option>
                    <option value="adv-auto-472" className="bg-[#1c1c1e] text-white">
                      {isEn ? "Advance 2,500,000 CFA (22/09)" : "Avance 2 500 000 CFA (22/09)"}
                    </option>
                    <option value={RUNNING_ACCOUNT_ID} className="bg-[#1c1c1e] text-white">
                      {isEn ? "🔄 Running Account (Sept. 6.5M)" : "🔄 Compte Courant (Sept. 6,5M)"}
                    </option>
                    {summary.recentAdvances
                      .filter(a => a.id !== "adv-auto-465" && a.id !== "adv-auto-472")
                      .map(a => (
                        <option key={a.id} value={a.id} className="bg-[#1c1c1e] text-white">
                          {a.amount.toLocaleString()} CFA ({a.date})
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                  title={isEn ? "Export Drawdown CSV" : "Exporter le décompte en CSV"}
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">{isEn ? "CSV" : "CSV"}</span>
                </button>

                {canEdit && onAddAdvance && !isAddFormOpen && (
                  <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all"
                  >
                    <Plus className="size-3.5" />
                    <span>{isEn ? "+ Add" : "+ Ajouter"}</span>
                  </button>
                )}

                <button
                  onClick={() => { setIsModalOpen(false); setIsAddFormOpen(false); }}
                  className="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all shrink-0"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* FORMULAIRE RAPIDE D'AJOUT D'AVANCE */}
            {isAddFormOpen && (
              <form onSubmit={handleCreateAdvance} className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Plus className="size-3.5" />
                    {isEn ? "Record New Fuel Advance Prepayment" : "Enregistrer un Nouveau Versement Avance Station"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="text-xs text-white/40 hover:text-white"
                  >
                    {isEn ? "Cancel" : "Annuler"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Date" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Amount (CFA)" : "Montant (CFA)"}
                    </label>
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="Ex: 4000000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Station" : "Station-Service"}
                    </label>
                    <input
                      type="text"
                      value={formStation}
                      onChange={(e) => setFormStation(e.target.value)}
                      placeholder="Ex: Shell San Pedro"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase block mb-1">
                      {isEn ? "Reference / Note" : "Libellé / Note"}
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ex: Virement 4M San Pedro"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    {isEn ? "Save Fuel Advance" : "Enregistrer l'Avance"}
                  </button>
                </div>
              </form>
            )}

            {/* BANDEAU SYNTHÈSE DU DÉCOMPTE SÉLECTIONNÉ */}
            <div className="p-4 rounded-2xl bg-white/3 border border-white/5 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Advance Amount" : "Montant Avance"}</p>
                <p className="text-lg font-black text-amber-400">{formatMoney(summary.advanceAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">{isEn ? "Consumed Fuel" : "Carburant Décompté"}</p>
                <p className="text-lg font-black text-white">{formatMoney(summary.fuelConsumed)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase">
                  {isOverdrawn ? (isEn ? "Remaining Due" : "Reste à Régler") : (isEn ? "Available Balance" : "Solde Restant")}
                </p>
                <p className={`text-lg font-black ${isOverdrawn ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : `+${formatMoney(summary.currentDepositBalance)}`}
                </p>
              </div>
            </div>

            {/* TABLEAU EXACT DU DÉCOMPTE JOUR PAR JOUR */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#161618] z-10">
                    <tr className="border-b border-white/8 text-white/40 text-[10px] uppercase font-black">
                      <th className="py-2.5 px-3">{isEn ? "Date" : "Date"}</th>
                      <th className="py-2.5 px-3">{isEn ? "Refuel Description" : "Ravitaillement Flotte"}</th>
                      <th className="py-2.5 px-3 text-right">{isEn ? "Daily Fuel" : "Gasoil du Jour"}</th>
                      <th className="py-2.5 px-3 text-right">{isEn ? "Advance Balance" : "Solde de l'Avance"}</th>
                      <th className="py-2.5 px-3 text-center">{isEn ? "Status" : "Statut"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {summary.dailyDrawdownLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-white/30 italic">
                          {isEn ? "No daily fuel logs recorded." : "Aucun ravitaillement journalier enregistré."}
                        </td>
                      </tr>
                    ) : (
                      summary.dailyDrawdownLedger.map((log) => (
                        <tr key={log.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3 text-white/70 font-mono text-[11px] whitespace-nowrap">{log.date}</td>
                          <td className="py-2.5 px-3 text-white/80 max-w-sm truncate">{log.comment}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-orange-400 whitespace-nowrap">
                            -{formatMoney(log.amount)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${
                            log.remainingAdvanceBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {formatMoney(log.remainingAdvanceBalance)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
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
                                : (isEn ? "Due / Overdrawn" : "Reste à régler")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PIED DE MODAL */}
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs text-white/40">
              <span>{summary.dailyDrawdownLedger.length} {isEn ? "operations in drawdown" : "opérations décomptées"}</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
              >
                {isEn ? "Close" : "Fermer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
