import { Sparkles } from "lucide-react";

export function MostProfitableDay({ day, formatCurrency, formatDate, formatTonnage }) {
  if (!day) {
    return null;
  }

  return (
    <section className="panel-enter overflow-hidden rounded-[30px] border border-white/7 bg-[radial-gradient(circle_at_top_left,rgba(207,93,86,0.22),transparent_34%),linear-gradient(180deg,#181818_0%,#101010_100%)] p-6 text-white shadow-[0_28px_90px_-56px_rgba(0,0,0,0.95)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/20 bg-[#cf5d56]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff8f84]">
            <Sparkles className="size-3.5" />
            Jour le plus rentable
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{formatDate(day.date)}</h3>
          <p className="mt-1 text-sm text-white/50">
            {day.driverLabel} | {day.start} vers {day.destination}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-5 py-4 backdrop-blur">
          <p className="text-sm text-white/44">Benefice net</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#9fe3b9]">{formatCurrency(day.total_net_cfa)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[22px] border border-white/8 bg-black/18 p-4">
          <p className="text-sm text-white/42">Revenu</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(day.total_gross_cfa)}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/18 p-4">
          <p className="text-sm text-white/42">Couts</p>
          <p className="mt-2 text-xl font-semibold text-[#ff8f84]">{formatCurrency(day.total_expense_cfa)}</p>
        </div>
        <div className="rounded-[22px] border border-white/8 bg-black/18 p-4">
          <p className="text-sm text-white/42">Tonnage</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatTonnage(day.tonnage)}</p>
        </div>
      </div>
    </section>
  );
}
