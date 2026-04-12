import { Activity, CalendarDays, CircleDollarSign, Truck } from "lucide-react";

export function FleetStatus({ totalTrips, activeDays, profitableTrips, driverLabel, profitMargin }) {
  const items = [
    {
      label: "Jours d'Activité",
      value: activeDays,
      icon: CalendarDays,
      accent: "bg-white/8 text-white/78",
    },
    {
      label: "Voyages Profitables",
      value: profitableTrips,
      icon: CircleDollarSign,
      accent: "bg-[#9fe3b9]/14 text-[#9fe3b9]",
    },
  ];

  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-4 text-white shadow-lg">
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#cf5d56]">Statut flotte</p>
          <h3 className="mt-1 text-xl font-bold tracking-tight">{driverLabel}</h3>
        </div>
        <div className="inline-block w-fit rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/50">
          Marge {profitMargin}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl border border-white/8 bg-black/18 p-3">
              <div className={`inline-flex rounded-xl p-2 ${item.accent}`}>
                <Icon className="size-4" />
              </div>
              <p className="mt-2 text-[11px] text-white/40">{item.label}</p>
              <p className="mt-1 text-xl font-bold tracking-tight">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#cf5d56]/10 bg-[#cf5d56]/5 p-3 text-[11px] text-white/60">
        <Activity className="size-3.5 text-[#ff8f84]" />
        Affectation: <span className="font-bold text-white">{driverLabel}</span>
      </div>
    </section>
  );
}
