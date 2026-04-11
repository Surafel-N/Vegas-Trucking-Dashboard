import { formatDate } from "../lib/dashboard";

export function TransportTable({
  rows,
  highlightedDate,
  formatCurrency,
  formatTonnage,
}) {
  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white shadow-[0_28px_90px_-56px_rgba(0,0,0,0.95)] backdrop-blur xl:p-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">Journal des trajets</h3>
          <p className="mt-1 text-sm text-white/44">Les lignes suivent le chauffeur, le mois et la plage de dates selectionnes.</p>
        </div>
        <p className="text-sm text-white/44">{rows.length} lignes</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8 bg-[#0d0d0d]">
        <div className="w-full max-h-[560px] overflow-auto">
          <table className="min-w-max border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-black/70 text-left text-xs uppercase tracking-[0.18em] text-white/44 backdrop-blur">
              <tr>
                {[
                  "Date",
                  "Driver",
                  "Start",
                  "Destination",
                  "Fuel Cost",
                  "Road Fees",
                  "Total Expense",
                  "Tonnage",
                  "Voyages",
                  "Total Gross",
                  "Net Profit",
                ].map((column) => (
                  <th key={column} className="px-4 py-4 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-transparent text-sm text-white/72">
              {rows.map((row) => {
                const isHighlighted = row.date === highlightedDate;

                return (
                  <tr
                    key={row.id}
                    className={`transition hover:bg-white/[0.04] ${
                      isHighlighted ? "bg-[#cf5d56]/10 ring-1 ring-inset ring-[#cf5d56]/22" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-white">{formatDate(row.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.driverLabel}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.start}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.destination}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatCurrency(row.fuel_cost_cfa)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatCurrency(row.road_fees_cfa)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#ff8f84]">{formatCurrency(row.total_expense_cfa)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatTonnage(row.tonnage)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-indigo-400">{row.voyages || 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#61d2c0]">{formatCurrency(row.total_gross_cfa)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#9fe3b9]">{formatCurrency(row.total_net_cfa)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
