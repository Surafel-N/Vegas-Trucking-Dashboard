import {
  FileCheck2,
  FileDown,
  HandCoins,
  ReceiptText,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { buildFinanceTimeline, validateUploadFile } from "../utils/financeRecords";

function formatBytes(value) {
  if (!value) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#cf5d56]">
        <Icon className="size-3.5" />
        {title}
      </div>
      <p className="mt-2 text-sm text-white/52">{description}</p>
    </div>
  );
}

function FinanceItem({ item, formatCurrency, onDelete }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/18 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{item.reference}</p>
          <p className="mt-1 text-xs text-white/46">{item.date}</p>
        </div>
        <p className={`text-sm font-semibold ${item.amountTone || "text-[#9fe3b9]"}`}>
          {typeof item.amount === "number" ? formatCurrency(item.amount) : "--"}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/52">
        <span className="truncate">{item.fileName}</span>
        <div className="flex items-center gap-2">
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 transition hover:bg-white/[0.08]"
          >
            <FileDown className="size-3.5" />
            Voir
          </a>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="inline-flex items-center gap-1 rounded-full border border-[#cf5d56]/22 bg-[#cf5d56]/10 px-2.5 py-1 text-[#ff8f84] transition hover:bg-[#cf5d56]/18"
          >
            <Trash2 className="size-3.5" />
            Suppr.
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinanceWorkspace({
  activeSection,
  expenseRecords,
  incomeRecords,
  drivers,
  trips,
  expenseCategories,
  incomeCategories,
  documentRecords,
  formatCurrency,
  onAddExpense,
  onAddIncome,
  canWrite,
  onDeleteExpense,
  onDeleteIncome,
  onDeleteDocument,
  onClearAllFinance,
}) {
  const [expenseReference, setExpenseReference] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDriverId, setExpenseDriverId] = useState("");
  const [expenseTripId, setExpenseTripId] = useState("");
  const [expensePaymentMode, setExpensePaymentMode] = useState("Cash");
  const [expenseFile, setExpenseFile] = useState(null);

  const [incomeReference, setIncomeReference] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("");
  const [incomeDriverId, setIncomeDriverId] = useState("");
  const [incomeTripId, setIncomeTripId] = useState("");
  const [incomePaymentMode, setIncomePaymentMode] = useState("Cash");
  const [incomeFile, setIncomeFile] = useState(null);

  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const expenseFileRef = useRef(null);
  const incomeFileRef = useRef(null);

  const totals = useMemo(
    () => ({
      expenses: expenseRecords.reduce((sum, item) => sum + item.amount, 0),
      incomes: incomeRecords.reduce((sum, item) => sum + item.amount, 0),
      docs: documentRecords.length,
    }),
    [expenseRecords, incomeRecords, documentRecords],
  );

  const timelineRows = useMemo(
    () => buildFinanceTimeline(expenseRecords, incomeRecords, documentRecords),
    [expenseRecords, incomeRecords, documentRecords],
  );

  const filteredTimeline = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return timelineRows;
    return timelineRows.filter((item) => {
      const text = `${item.category} ${item.reference} ${item.fileName} ${item.date}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [timelineRows, query]);

  function resetExpenseForm() {
    setExpenseReference("");
    setExpenseDate("");
    setExpenseAmount("");
    setExpenseCategory("");
    setExpenseDriverId("");
    setExpenseTripId("");
    setExpensePaymentMode("Cash");
    setExpenseFile(null);
    if (expenseFileRef.current) expenseFileRef.current.value = "";
  }

  function resetIncomeForm() {
    setIncomeReference("");
    setIncomeDate("");
    setIncomeAmount("");
    setIncomeCategory("");
    setIncomeDriverId("");
    setIncomeTripId("");
    setIncomePaymentMode("Cash");
    setIncomeFile(null);
    if (incomeFileRef.current) incomeFileRef.current.value = "";
  }

  async function submitExpense(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!expenseReference || !expenseDate || !expenseAmount || !expenseFile) return;
    const validation = validateUploadFile(expenseFile);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await onAddExpense({
        reference: expenseReference,
        date: expenseDate,
        amount: Number(expenseAmount),
        category: expenseCategory || "Autres charges",
        driverId: expenseDriverId,
        tripId: expenseTripId,
        paymentMode: expensePaymentMode,
        file: expenseFile,
      });
      resetExpenseForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur lors de l'ajout de la depense.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitIncome(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!incomeReference || !incomeDate || !incomeAmount || !incomeFile) return;
    const validation = validateUploadFile(incomeFile);
    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      await onAddIncome({
        reference: incomeReference,
        date: incomeDate,
        amount: Number(incomeAmount),
        category: incomeCategory || "Recette trajet",
        driverId: incomeDriverId,
        tripId: incomeTripId,
        paymentMode: incomePaymentMode,
        file: incomeFile,
      });
      resetIncomeForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur lors de l'ajout de l'encaissement.");
    } finally {
      setIsSaving(false);
    }
  }

  const cardFocusClass = (key) =>
    activeSection === key
      ? "border-[#cf5d56]/24 shadow-[0_30px_80px_-50px_rgba(207,93,86,0.24)]"
      : "border-white/7 shadow-[0_26px_70px_-54px_rgba(0,0,0,0.95)]";

  return (
    <section className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-4 text-white">
          <p className="text-sm text-white/46">Total depenses saisies</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#ff8f84]">{formatCurrency(totals.expenses)}</p>
        </div>
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-4 text-white">
          <p className="text-sm text-white/46">Total encaissements saisis</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#9fe3b9]">{formatCurrency(totals.incomes)}</p>
        </div>
        <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-4 text-white">
          <p className="text-sm text-white/46">Documents recus</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{totals.docs}</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-[24px] border border-[#cf5d56]/26 bg-[#cf5d56]/10 px-4 py-3 text-sm text-[#ffb2ab]">
          {error}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-3">
        <article className={`rounded-[30px] bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white ${cardFocusClass("depenses")}`}>
          <SectionTitle icon={Wallet} title="Depenses" description="Deposer les factures depensees avec montant et justificatif." />
          <form className="mt-4 space-y-3" onSubmit={submitExpense}>
            <input
              value={expenseReference}
              onChange={(event) => setExpenseReference(event.target.value)}
              placeholder="Reference facture"
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              placeholder="Montant CFA"
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Categorie depense</option>
              {expenseCategories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select value={expenseDriverId} onChange={(event) => setExpenseDriverId(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Chauffeur (optionnel)</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <select value={expenseTripId} onChange={(event) => setExpenseTripId(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Trajet (optionnel)</option>
              {trips.slice(0, 120).map((trip) => (
                <option key={trip.id} value={trip.id}>{trip.date} | {trip.start} to {trip.destination}</option>
              ))}
            </select>
            <select value={expensePaymentMode} onChange={(event) => setExpensePaymentMode(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option>Cash</option>
              <option>Virement</option>
              <option>Mobile Money</option>
              <option>Cheque</option>
            </select>
            <input
              ref={expenseFileRef}
              type="file"
              onChange={(event) => setExpenseFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border file:border-white/12 file:bg-white/[0.05] file:px-3 file:py-2 file:text-white/78"
            />
            <button
              type="submit"
              disabled={!canWrite || isSaving}
              className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ReceiptText className="size-4" />
              Ajouter depense
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {expenseRecords.slice(0, 5).map((item) => (
              <FinanceItem key={item.id} item={{ ...item, amountTone: "text-[#ff8f84]" }} formatCurrency={formatCurrency} onDelete={onDeleteExpense} />
            ))}
          </div>
        </article>

        <article className={`rounded-[30px] bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white ${cardFocusClass("encaissements")}`}>
          <SectionTitle icon={HandCoins} title="Encaissements" description="Saisir les factures encaissees et charger la preuve." />
          <form className="mt-4 space-y-3" onSubmit={submitIncome}>
            <input
              value={incomeReference}
              onChange={(event) => setIncomeReference(event.target.value)}
              placeholder="Reference facture encaissee"
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <input
              type="date"
              value={incomeDate}
              onChange={(event) => setIncomeDate(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={incomeAmount}
              onChange={(event) => setIncomeAmount(event.target.value)}
              placeholder="Montant encaisse CFA"
              className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]"
            />
            <select value={incomeCategory} onChange={(event) => setIncomeCategory(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Categorie encaissement</option>
              {incomeCategories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select value={incomeDriverId} onChange={(event) => setIncomeDriverId(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Chauffeur (optionnel)</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
            <select value={incomeTripId} onChange={(event) => setIncomeTripId(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option value="">Trajet (optionnel)</option>
              {trips.slice(0, 120).map((trip) => (
                <option key={trip.id} value={trip.id}>{trip.date} | {trip.start} to {trip.destination}</option>
              ))}
            </select>
            <select value={incomePaymentMode} onChange={(event) => setIncomePaymentMode(event.target.value)} className="h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none transition focus:border-[#cf5d56]">
              <option>Cash</option>
              <option>Virement</option>
              <option>Mobile Money</option>
              <option>Cheque</option>
            </select>
            <input
              ref={incomeFileRef}
              type="file"
              onChange={(event) => setIncomeFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs text-white/60 file:mr-3 file:rounded-lg file:border file:border-white/12 file:bg-white/[0.05] file:px-3 file:py-2 file:text-white/78"
            />
            <button
              type="submit"
              disabled={!canWrite || isSaving}
              className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <HandCoins className="size-4" />
              Ajouter encaissement
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {incomeRecords.slice(0, 5).map((item) => (
              <FinanceItem key={item.id} item={{ ...item, amountTone: "text-[#9fe3b9]" }} formatCurrency={formatCurrency} onDelete={onDeleteIncome} />
            ))}
          </div>
        </article>

        <article className={`rounded-[30px] bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white ${cardFocusClass("documents")}`}>
          <SectionTitle icon={FileCheck2} title="Documents lies" description="Documents crees depuis OCR ou import comptable." />
          <div className="mt-4 space-y-2">
            {documentRecords.slice(0, 8).map((item) => (
              <FinanceItem key={item.id} item={item} formatCurrency={formatCurrency} onDelete={onDeleteDocument} />
            ))}
            {!documentRecords.length ? <p className="text-sm text-white/45">Aucun document lie.</p> : null}
          </div>
        </article>
      </section>

      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#0f0f0f_100%)] p-5 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Historique consolide</h3>
            <p className="mt-1 text-sm text-white/50">
              Recherche un document, une facture de depense ou une facture encaissee.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/38" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Recherche reference, type ou fichier"
                className="h-11 w-full min-w-[260px] rounded-xl border border-white/8 bg-black/25 pl-10 pr-3 text-sm outline-none transition focus:border-[#cf5d56]"
              />
            </label>
            <button
              type="button"
              disabled={!canWrite}
              onClick={onClearAllFinance}
              className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/26 bg-[#cf5d56]/10 px-4 py-2 text-sm font-medium text-[#ff8f84] transition hover:bg-[#cf5d56]/18 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 className="size-4" />
              Vider tout
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8">
          <div className="max-h-[340px] overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 bg-black/72 text-left text-xs uppercase tracking-[0.18em] text-white/44 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 font-medium">Categorie</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Fichier</th>
                </tr>
              </thead>
              <tbody className="text-sm text-white/72">
                {filteredTimeline.map((item) => (
                  <tr key={item.id} className="border-t border-white/6 hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-3">{item.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white">{item.reference}</td>
                    <td className="whitespace-nowrap px-4 py-3">{item.date}</td>
                    <td className={`whitespace-nowrap px-4 py-3 ${item.amountTone}`}>
                      {typeof item.displayAmount === "number" ? formatCurrency(item.displayAmount) : "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-[#61d2c0] hover:underline">
                        {item.fileName} ({formatBytes(item.fileSize)})
                      </a>
                    </td>
                  </tr>
                ))}
                {!filteredTimeline.length ? (
                  <tr>
                    <td className="px-4 py-5 text-center text-sm text-white/45" colSpan={5}>
                      Aucun resultat avec ce filtre.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}
