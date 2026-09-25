import { BadgeCheck, Car, Phone, UserRound } from "lucide-react";
import { computeDriverPerformance } from "../utils/businessMetrics";

export function DriversModule({ 
  drivers = [], 
  trips = [], 
  expenses = [], 
  incomes = [], 
  formatCurrency, 
  t,
  language = "FR"
}) {
  const isEn = language === "EN";
  const format = typeof formatCurrency === "function"
    ? formatCurrency
    : (val) => Number(val || 0).toLocaleString(isEn ? "en-US" : "fr-FR") + " CFA";

  const performance = computeDriverPerformance({ 
    drivers: drivers || [], 
    trips: trips || [], 
    expenses: expenses || [], 
    incomes: incomes || [] 
  });

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
                {driver.status === "active" ? (t?.active || (isEn ? "Active" : "Actif")) : (t?.inactive || (isEn ? "Inactive" : "Inactif"))}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-white/62">
              <p className="flex items-center gap-2"><Phone className="size-4" /> {driver.phone || (isEn ? "No phone" : "Non renseigné")}</p>
              <p className="flex items-center gap-2"><BadgeCheck className="size-4" /> {driver.license || (isEn ? "Certified License" : "Permis certifié")}</p>
              <p className="flex items-center gap-2"><Car className="size-4" /> {driver.vehicle || (t?.noVehicle || (isEn ? "No vehicle assigned" : "Aucun véhicule"))}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">{t?.trips || (isEn ? "Trips" : "Trajets")}</p>
                <p className="mt-1 text-lg font-semibold">{driver.tripCount}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">{t?.revenue || (isEn ? "Revenue" : "Recettes")}</p>
                <p className="mt-1 text-lg font-semibold text-[#61d2c0]">{format(driver.income)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">{t?.expenses || t?.depenses || (isEn ? "Expenses" : "Dépenses")}</p>
                <p className="mt-1 text-lg font-semibold text-[#ff8f84]">{format(driver.expense)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs text-white/48">{t?.netProfit || (isEn ? "Net Profit" : "Bénéfice Net")}</p>
                <p className="mt-1 text-lg font-semibold text-[#9fe3b9]">{format(driver.net)}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white">
        <h3 className="text-xl font-semibold tracking-tight">{t?.detailedDriversList || (isEn ? "Detailed Drivers List" : "Liste détaillée des chauffeurs")}</h3>
        <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-black/70 text-left text-xs uppercase tracking-[0.18em] text-white/44">
              <tr>
                <th className="px-4 py-3">{t?.driver || (isEn ? "Driver" : "Chauffeur")}</th>
                <th className="px-4 py-3">{t?.status || (isEn ? "Status" : "Statut")}</th>
                <th className="px-4 py-3">{t?.phone || (isEn ? "Phone" : "Téléphone")}</th>
                <th className="px-4 py-3">{t?.license || (isEn ? "License" : "Permis")}</th>
                <th className="px-4 py-3">{t?.vehicle || (isEn ? "Vehicle" : "Véhicule")}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-white/72">
              {drivers.map((driver) => (
                <tr key={driver.id} className="border-t border-white/6 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">
                    <span className="inline-flex items-center gap-2"><UserRound className="size-4 text-[#cf5d56]" />{driver.name}</span>
                  </td>
                  <td className="px-4 py-3">{driver.status === "active" ? (t?.active || (isEn ? "Active" : "Actif")) : (t?.inactive || (isEn ? "Inactive" : "Inactif"))}</td>
                  <td className="px-4 py-3">{driver.phone || "-"}</td>
                  <td className="px-4 py-3">{driver.license || "-"}</td>
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
