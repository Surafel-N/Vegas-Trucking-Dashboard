import { useMemo, useState } from "react";
import { computeTripProfit } from "../utils/businessMetrics";

const EMPTY_TRIP = {
  date: "",
  driverId: "",
  start: "",
  destination: "",
  tripType: "Régulier",
  distanceKm: "",
  volume: "",
  amount: "",
  directExpense: "",
  comment: "",
};

export function TripsModule({ trips = [], drivers = [], expenses = [], incomes = [], formatCurrency, formatTonnage, canWrite, onCreateTrip }) {
  const [form, setForm] = useState(EMPTY_TRIP);

  const enrichedTrips = useMemo(
    () =>
      (trips || []).map((trip) => ({
        ...trip,
        summary: computeTripProfit(trip, expenses, incomes),
      })),
    [trips, expenses, incomes],
  );

  // Dynamic Columns Detection from metadata (customExpenses)
  const dynamicKeys = useMemo(() => {
    const keys = new Set();
    enrichedTrips.forEach(t => {
      if (t.customExpenses) {
        Object.keys(t.customExpenses).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [enrichedTrips]);

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function submitTrip(event) {
    event.preventDefault();
    if (!canWrite) return;
    if (!form.date || !form.driverId || !form.start || !form.destination || !form.amount) return;

    const tonnage = Number(form.volume || 0);
    onCreateTrip({
      date: form.date,
      driverId: form.driverId,
      start: form.start,
      destination: form.destination,
      tripType: form.tripType,
      distanceKm: Number(form.distanceKm || 0),
      volume: tonnage,
      total_gross_cfa: Number(form.amount || 0),
      total_expense_cfa: Number(form.directExpense || 0),
      total_net_cfa: Number(form.amount || 0) - Number(form.directExpense || 0),
      tonnage: tonnage,
      voyages: tonnage > 100 ? 2 : (tonnage > 0 ? 1 : 0),
      comment: form.comment,
    });
    setForm(EMPTY_TRIP);
  }

  return (
    <section className="space-y-6">
      {canWrite && (
        <section className="rounded-[30px] border border-white/8 bg-[#161616] p-6 text-white shadow-xl">
          <h3 className="text-xl font-semibold tracking-tight">Ajouter un trajet manuel</h3>
          <form onSubmit={submitTrip} className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <input type="date" value={form.date} onChange={e => updateField("date", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <select value={form.driverId} onChange={e => updateField("driverId", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]">
              <option value="">Chauffeur...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input placeholder="Départ" value={form.start} onChange={e => updateField("start", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <input placeholder="Destination" value={form.destination} onChange={e => updateField("destination", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <input placeholder="Volume (T)" type="number" value={form.volume} onChange={e => updateField("volume", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <input placeholder="Revenu" type="number" value={form.amount} onChange={e => updateField("amount", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <input placeholder="Dépenses directes" type="number" value={form.directExpense} onChange={e => updateField("directExpense", e.target.value)} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
            <button type="submit" className="md:col-span-3 xl:col-span-1 rounded-xl bg-[#cf5d56] font-bold text-white transition hover:brightness-110">Ajouter</button>
          </form>
        </section>
      )}

      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold tracking-tight">Journal de Bord & Comptabilité Dynamique</h3>
          <span className="text-[10px] uppercase tracking-widest text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/10">Colonnes intelligentes actives</span>
        </div>
        
        <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="min-w-max border-separate border-spacing-0 table-fixed">
              <thead className="sticky top-0 bg-black/80 backdrop-blur-md text-left text-[10px] uppercase tracking-widest text-white/40">
                <tr>
                  <th className="px-4 py-4 w-28 sticky left-0 bg-black z-10 border-r border-white/5">Date</th>
                  <th className="px-4 py-4 w-40">Chauffeur</th>
                  <th className="px-4 py-4 w-60">Trajet</th>
                  <th className="px-4 py-4 w-24 text-center">Tonnage</th>
                  <th className="px-4 py-4 w-24 text-center">KM</th>
                  
                  {/* Core Base Column */}
                  <th className="px-4 py-4 w-32 text-right">Fuel (Base)</th>
                  
                  {/* Dynamic Columns from Custom Expenses */}
                  {dynamicKeys.map(key => (
                    <th key={key} className="px-4 py-4 w-32 text-right text-[#61d2c0] bg-white/[0.02] italic">{key}</th>
                  ))}

                  <th className="px-4 py-4 w-32 text-right bg-white/5 font-bold text-white border-l border-white/10">Total Exp</th>
                  <th className="px-4 py-4 w-32 text-right bg-[#61d2c0]/10 font-bold text-[#61d2c0]">Brut (CA)</th>
                  <th className="px-4 py-4 w-32 text-right bg-[#9fe3b9]/10 font-bold text-[#9fe3b9]">Net (Profit)</th>
                  <th className="px-4 py-4 w-80">Commentaires</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-white/70">
                {enrichedTrips.map((trip) => {
                  const format = (v) => {
                    if (typeof v !== "number") return v || "-";
                    return v.toLocaleString('fr-FR');
                  };
                  return (
                    <tr key={trip.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 py-3 sticky left-0 bg-[#121212] group-hover:bg-[#1a1a1a] z-10 border-r border-white/5 font-mono text-white font-medium">{trip.date}</td>
                      <td className="px-4 py-3 truncate">{trip.driverLabel || drivers.find((d) => d.id === trip.driverId)?.name || "-"}</td>
                      <td className="px-4 py-3 truncate text-white/50"><span className="text-white">{trip.start}</span> → <span className="text-white">{trip.destination}</span></td>
                      <td className="px-4 py-3 text-center font-bold text-indigo-400">{trip.tonnage || 0} t</td>
                      <td className="px-4 py-3 text-center">{trip.km || trip.distanceKm || 0}</td>
                      
                      <td className="px-4 py-3 text-right">{format(trip.fuelCostCFA || trip.total_expense_cfa)}</td>

                      {/* Dynamic Cells */}
                      {dynamicKeys.map(key => (
                        <td key={key} className="px-4 py-3 text-right bg-white/[0.01] text-white/40">
                          {format(trip.customExpenses?.[key])}
                        </td>
                      ))}

                      <td className="px-4 py-3 text-right bg-white/[0.02] font-bold text-[#ff8f84] border-l border-white/10">{format(trip.summary?.expense)}</td>
                      <td className="px-4 py-3 text-right bg-[#61d2c0]/5 font-bold text-[#61d2c0]">{format(trip.summary?.income)}</td>
                      <td className="px-4 py-3 text-right bg-[#9fe3b9]/5 font-bold text-[#9fe3b9]">{format(trip.summary?.net)}</td>
                      <td className="px-4 py-3 truncate italic text-white/40">{trip.commentaires || trip.comment || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  );
}
