import { BadgeCheck, Car, Phone, UserRound } from "lucide-react";
import { computeDriverPerformance } from "../utils/businessMetrics";

export function DriversModule({ drivers, trips, expenses, incomes, formatCurrency }) {
  const performance = computeDriverPerformance({ drivers, trips, expenses, incomes });

  return (
    <section className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {performance.map((driver) => (
          <article key={driver.id} className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#cf5d56]">{driver.sdv}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{driver.name}</h3>
              </div>
              <div className={`rounded-full border px-2.5 py-1 text-xs ${driver.status === "active" ? "border-[#9fe3b9]/25 bg-[#9fe3b9]/12 text-[#9fe3b9]" : "border-white/12 bg-white/[0.03] text-white/60"}`}>
                {driver.status === "active" ? "Actif" : "Inactif"}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-white/62">
              <p className="flex items-center gap-2"><Phone className="size-4" /> {driver.phone}</p>
              <p className="flex items-center gap-2"><BadgeCheck className="size-4" /> {driver.license}</p>
              <p className="flex items-center gap-2"><Car className="size-4" /> {driver.vehicle || "Aucun vehicule"}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">Trajets</p>
                <p className="mt-1 text-lg font-semibold">{driver.tripCount}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">Recettes</p>
                <p className="mt-1 text-lg font-semibold text-[#61d2c0]">{formatCurrency(driver.income)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">Depenses</p>
                <p className="mt-1 text-lg font-semibold text-[#ff8f84]">{formatCurrency(driver.expense)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">Benefice net</p>
                <p className="mt-1 text-lg font-semibold text-[#9fe3b9]">{formatCurrency(driver.net)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white">
        <h3 className="text-xl font-semibold tracking-tight">Liste detaillee des chauffeurs</h3>
        <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-black/70 text-left text-xs uppercase tracking-[0.18em] text-white/44">
              <tr>
                <th className="px-4 py-3">Chauffeur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Telephone</th>
                <th className="px-4 py-3">Permis</th>
                <th className="px-4 py-3">Vehicule</th>
              </tr>
            </thead>
            <tbody className="text-sm text-white/72">
              {drivers.map((driver) => (
                <tr key={driver.id} className="border-t border-white/6 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">
                    <span className="inline-flex items-center gap-2"><UserRound className="size-4 text-[#cf5d56]" />{driver.name}</span>
                  </td>
                  <td className="px-4 py-3">{driver.status}</td>
                  <td className="px-4 py-3">{driver.phone}</td>
                  <td className="px-4 py-3">{driver.license}</td>
                  <td className="px-4 py-3">{driver.vehicle || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
