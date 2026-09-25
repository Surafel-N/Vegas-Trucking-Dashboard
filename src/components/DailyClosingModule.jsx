import { useMemo, useState } from "react";
import { summarizeFinance } from "../utils/businessMetrics";
import { translateComment } from "../utils/i18n";

export function DailyClosingModule({
  trips = [],
  drivers = [],
  expenses = [],
  incomes = [],
  closings = [],
  canWrite = false,
  canReopenClosing = false,
  onCloseDay = () => {},
  onReopenDay = () => {},
  formatCurrency,
  t,
  language = "FR"
}) {
  const isEn = language === "EN";
  const locale = isEn ? "en-US" : "fr-FR";
  const format = typeof formatCurrency === "function" ? formatCurrency : (val) => Number(val || 0).toLocaleString(locale) + " CFA";
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");
  const [declared, setDeclared] = useState("");

  const safeTrips = trips || [];
  const safeDrivers = drivers || [];
  const safeExpenses = expenses || [];
  const safeIncomes = incomes || [];
  const safeClosings = closings || [];

  const summary = useMemo(() => summarizeFinance({ expenses: safeExpenses, incomes: safeIncomes, mode: "day", anchorDate: date }), [safeExpenses, safeIncomes, date]);
  const tripsCount = useMemo(() => safeTrips.filter((trip) => trip.date === date).length, [safeTrips, date]);

  const byDriver = useMemo(
    () =>
      safeDrivers.map((driver) => {
        const driverIncome = safeIncomes
          .filter((item) => item && item.driverId === driver.id && item.date === date)
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        const driverExpense = safeExpenses
          .filter((item) => item && item.driverId === driver.id && item.date === date)
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        return { driverId: driver.id, driverName: driver.name, income: driverIncome, expense: driverExpense };
      }),
    [safeDrivers, safeIncomes, safeExpenses, date],
  );

  const existing = safeClosings.find((item) => item.date === date);
  const declaredAmount = Number(declared || 0);
  const theoretical = summary.totalIncome - summary.totalExpense;
  const gap = declared ? declaredAmount - theoretical : 0;

  function handleClose() {
    if (!canWrite || existing) return;
    onCloseDay({
      date,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      balance: theoretical,
      tripsCount,
      byDriver,
      declaredAmount: declared ? declaredAmount : theoretical,
      gap,
      comment,
      status: "closed",
    });
    setComment("");
    setDeclared("");
  }

  function handleReopen() {
    if (!canReopenClosing || !existing) return;
    onReopenDay(existing.id);
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">{t?.closing || (isEn ? "Daily Closing" : "Clôture journalière")}</h3>
            <p className="mt-1 text-sm text-white/50">{isEn ? "Auto calculation: inflows - expenses + declared variance." : "Calcul auto: encaissement - dépense + écart déclaré."}</p>
          </div>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none focus:border-[#cf5d56]" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-black/18 p-4">
            <p className="text-sm text-white/46">{isEn ? "Total Collected" : "Total encaissé"}</p>
            <p className="mt-2 text-2xl font-semibold text-[#61d2c0]">{format(summary.totalIncome)}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-4">
            <p className="text-sm text-white/46">{isEn ? "Total Expenses" : "Total dépensé"}</p>
            <p className="mt-2 text-2xl font-semibold text-[#ff8f84]">{format(summary.totalExpense)}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-4">
            <p className="text-sm text-white/46">{isEn ? "Theoretical Balance" : "Solde théorique"}</p>
            <p className="mt-2 text-2xl font-semibold text-[#9fe3b9]">{format(theoretical)}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-4">
            <p className="text-sm text-white/46">{isEn ? "Trips Today" : "Trajets du jour"}</p>
            <p className="mt-2 text-2xl font-semibold">{tripsCount}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr,1fr,auto]">
          <input type="number" value={declared} onChange={(event) => setDeclared(event.target.value)} placeholder={isEn ? "Declared cash amount" : "Montant déclaré caisse"} className="h-11 rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none focus:border-[#cf5d56]" />
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isEn ? "Closing notes" : "Commentaire de clôture"} className="h-11 rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none focus:border-[#cf5d56]" />
          <button type="button" disabled={!canWrite || Boolean(existing)} onClick={handleClose} className="h-11 rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55">{isEn ? "Close the Day" : "Clôturer la journée"}</button>
        </div>

        {existing ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-[#9fe3b9]/25 bg-[#9fe3b9]/12 px-3 py-1 text-[#9fe3b9]">{isEn ? "Day Closed" : "Journée clôturée"}</span>
            <button type="button" disabled={!canReopenClosing} onClick={handleReopen} className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1 text-white/72 disabled:cursor-not-allowed disabled:opacity-45">{isEn ? "Reopen Day" : "Rouvrir la journée"}</button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white">
        <h3 className="text-xl font-semibold tracking-tight">{t?.closingHistory || (isEn ? "Closing History" : "Historique clôtures")}</h3>
        <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-black/72 text-left text-xs uppercase tracking-[0.18em] text-white/44">
              <tr>
                <th className="px-4 py-3">{t?.date || "Date"}</th>
                <th className="px-4 py-3">{isEn ? "Collected" : "Encaissé"}</th>
                <th className="px-4 py-3">{isEn ? "Expense" : "Dépense"}</th>
                <th className="px-4 py-3">{isEn ? "Balance" : "Solde"}</th>
                <th className="px-4 py-3">{t?.variance || (isEn ? "Variance" : "Écart")}</th>
                <th className="px-4 py-3">{t?.comments || (isEn ? "Notes" : "Commentaire")}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-white/72">
              {safeClosings.map((item) => (
                <tr key={item.id} className="border-t border-white/6">
                  <td className="px-4 py-3 text-white">{item.date}</td>
                  <td className="px-4 py-3 text-[#61d2c0]">{format(item.totalIncome)}</td>
                  <td className="px-4 py-3 text-[#ff8f84]">{format(item.totalExpense)}</td>
                  <td className="px-4 py-3 text-[#9fe3b9]">{format(item.balance)}</td>
                  <td className="px-4 py-3">{format(item.gap || 0)}</td>
                  <td className="px-4 py-3">{translateComment(item.comment, language) || "-"}</td>
                </tr>
              ))}
              {!closings.length ? (
                <tr>
                  <td className="px-4 py-4 text-center text-white/46" colSpan={6}>{t?.noClosingYet || (isEn ? "No daily closings recorded yet." : "Aucune clôture pour le moment.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
