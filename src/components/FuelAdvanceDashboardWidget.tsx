import React, { useState, useMemo } from 'react';
import { 
  Fuel, 
  Wallet, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Building2, 
  Clock, 
  ArrowRight, 
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { 
  FuelAdvance, 
  FuelCashSummary, 
  computeFuelReconciliation 
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

  // Formulaire d'ajout rapide
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState("4000000");
  const [formStation, setFormStation] = useState("Shell San Pedro");
  const [formNotes, setFormNotes] = useState("Paiement avance carburant station");

  // Formatage monétaire
  const formatMoney = (val: number) => {
    if (formatCurrency) return formatCurrency(val, currency);
    return `${Math.round(val).toLocaleString()} ${currency}`;
  };

  // Calcul du résumé du décompte
  const summary: FuelCashSummary = useMemo(() => {
    return computeFuelReconciliation(advances, transactions, rawCashBalance);
  }, [advances, transactions, rawCashBalance]);

  const activeRecon = summary.reconciliations[0];
  const percentUsed = activeRecon ? activeRecon.percentUsed : 0;
  const isOverdrawn = summary.totalAmountDue > 0;

  const handleCreateAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddAdvance) return;

    const amt = parseFloat(formAmount.replace(/\s/g, '')) || 0;
    if (amt <= 0) return;

    const newAdv: FuelAdvance = {
      id: `adv-manual-${Date.now()}`,
      date: formDate,
      amount: amt,
      station: formStation.trim() || "Shell San Pedro",
      paymentMethod: "Virement Bancaire",
      notes: formNotes.trim(),
      source: "manual",
      status: "active"
    };

    onAddAdvance(newAdv);
    setIsAddFormOpen(false);
    setFormNotes("Paiement avance carburant station");
  };

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-6 shadow-2xl relative overflow-hidden group">
      {/* Halo d'ambiance d'arrière-plan */}
      <div className={`absolute top-0 right-0 w-80 h-80 ${isOverdrawn ? 'bg-red-500/5' : 'bg-amber-500/5'} rounded-full blur-3xl pointer-events-none transition-all`} />

      {/* EN-TÊTE DU WIDGET */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Fuel className="size-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
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
                ? "Live drawdown based on daily truck fuel consumed vs prepaid deposits"
                : "Décompte au jour le jour du carburant consommé face aux acomptes versés")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : formatMoney(summary.currentDepositBalance)}
              </p>
            </div>

            {/* BARRE DE PROGRESSION DU DÉCOMPTE */}
            {activeRecon && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>
                    {isEn ? "Drawn down:" : "Consommé :"}{" "}
                    <strong className="text-white">{formatMoney(activeRecon.fuelConsumed)}</strong> / {formatMoney(activeRecon.totalAdvanceAmount)}
                  </span>
                  <span className="font-bold text-white">{Math.round(percentUsed)}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      percentUsed >= 100 ? 'bg-red-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, percentUsed)}%` }}
                  />
                </div>
              </div>
            )}
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
                <Wallet className="size-4 text-[#00F2FF]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white/70">
                  {isEn ? "Cash Balance Breakdown & Free Liquidity" : "Réconciliation Balance Cash & Trésorerie"}
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
                  {isEn ? "Gross balance" : "Solde brut en compte"}
                </p>
              </div>

              {/* NIVEAU 2 : DÉPÔT CARBURANT IMMOBILISÉ */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  {isOverdrawn 
                    ? (isEn ? "2. Station Due" : "2. Dette Station")
                    : (isEn ? "2. Fuel Deposit" : "2. Dépôt Carburant")}
                </p>
                <p className={`text-base font-black mt-1 ${isOverdrawn ? 'text-red-400' : 'text-amber-400'}`}>
                  {isOverdrawn ? `-${formatMoney(summary.totalAmountDue)}` : formatMoney(summary.fuelDepositCommitted)}
                </p>
                <p className="text-[9px] text-white/40 mt-0.5">
                  {isOverdrawn ? (isEn ? "To pay to station" : "Reste à régler") : (isEn ? "Blocked for fuel" : "Immobilisé station")}
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

          {/* BANDEAU PÉDAGOGIQUE EXPLICATIF */}
          <div className="mt-3 p-2.5 rounded-xl bg-white/2 border border-white/5 flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
            <p className="leading-tight text-[11px]">
              {isEn ? (
                <>
                  <strong className="text-white">Treasury Reality:</strong> You have {formatMoney(summary.grossCashBalance)} on account, but only{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> free cash because{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> is reserved at the fuel station.
                </>
              ) : (
                <>
                  <strong className="text-white">Réalité de Trésorerie :</strong> Vous avez {formatMoney(summary.grossCashBalance)} sur le compte, mais réellement{" "}
                  <strong className="text-[#00F2FF]">{formatMoney(summary.netAvailableCash)}</strong> disponibles car{" "}
                  <strong className="text-amber-300">{formatMoney(summary.fuelDepositCommitted)}</strong> sont en dépôt carburant.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL COMPLET DU GRAND LIVRE DE DÉCOMPTE & GESTION DES AVANCES            */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#161618] border border-white/10 rounded-[32px] p-6 sm:p-8 flex flex-col shadow-2xl overflow-hidden">
            {/* EN-TÊTE MODAL */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Fuel className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isEn ? "Detailed Fuel Drawdown & Advances Ledger" : "Grand Livre du Décompte & Avances Carburant"}
                  </h3>
                  <p className="text-xs text-white/50">
                    {summary.activeStation} • {summary.recentAdvances.length} {isEn ? "recorded advances" : "avances enregistrées"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && onAddAdvance && !isAddFormOpen && (
                  <button
                    onClick={() => setIsAddFormOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all"
                  >
                    <Plus className="size-3.5" />
                    <span>{isEn ? "+ Add Advance" : "+ Ajouter une Avance"}</span>
                  </button>
                )}
                <button
                  onClick={() => { setIsModalOpen(false); setIsAddFormOpen(false); }}
                  className="size-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all"
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
                    {isEn ? "Record New Station Prepayment" : "Enregistrer un Nouveau Versement Avance Station"}
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
                      {isEn ? "Fuel Station" : "Station-Service"}
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

            {/* LISTE DÉROULANTE DES CYCLES D'AVANCES & RELEVÉ DU DÉCOMPTE */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {summary.reconciliations.map((recon, idx) => (
                <div key={recon.advance.id} className="p-4 rounded-2xl bg-white/3 border border-white/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-400">{recon.advance.station}</span>
                        <span className="text-xs text-white/40">•</span>
                        <span className="text-xs text-white/60">{recon.advance.date}</span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {isEn ? "Active Cycle" : "Cycle Actif"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">{recon.advance.notes}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-white">{formatMoney(recon.totalAdvanceAmount)}</p>
                      <p className="text-[11px] text-white/40">
                        {isEn ? "Consumed: " : "Consommé : "}
                        <strong className="text-amber-300">{formatMoney(recon.fuelConsumed)}</strong>
                        {" • "}
                        {recon.remainingCredit > 0 ? (
                          <span className="text-emerald-400 font-bold">
                            {isEn ? "Left: " : "Reste : "}
                            {formatMoney(recon.remainingCredit)}
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold">
                            {isEn ? "Overdrawn: " : "Dépassement : "}
                            -{formatMoney(recon.amountDue)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* MINI-TABLEAU DU DÉCOMPTE JOURNALIER DE CE CYCLE */}
                  {recon.dailyLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-black">
                            <th className="py-1.5">{isEn ? "Date" : "Date"}</th>
                            <th className="py-1.5">{isEn ? "Note / Refuel" : "Ravitaillement"}</th>
                            <th className="py-1.5 text-right">{isEn ? "Daily Fuel" : "Gasoil du Jour"}</th>
                            <th className="py-1.5 text-right">{isEn ? "Advance Balance" : "Solde de l'Avance"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {recon.dailyLogs.slice(0, 10).map((log) => (
                            <tr key={log.id} className="hover:bg-white/2 transition-colors">
                              <td className="py-1.5 text-white/70 font-mono text-[11px]">{log.date}</td>
                              <td className="py-1.5 text-white/60 truncate max-w-xs">{log.comment}</td>
                              <td className="py-1.5 text-right font-bold text-white">-{formatMoney(log.amount)}</td>
                              <td className={`py-1.5 text-right font-black ${
                                log.remainingAdvanceBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {formatMoney(log.remainingAdvanceBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic py-2">
                      {isEn ? "No daily fuel logged against this period." : "Aucun ravitaillement journalier enregistré sur cette période."}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* PIED DE MODAL */}
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between text-xs text-white/40">
              <span>{summary.reconciliations.length} {isEn ? "cycles tracked" : "cycles réconciliés"}</span>
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
