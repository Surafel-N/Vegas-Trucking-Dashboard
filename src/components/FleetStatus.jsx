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
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-6 text-white shadow-[0_30px_90px_-52px_rgba(0,0,0,0.92)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#cf5d56]">Statut flotte</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">{driverLabel}</h3>
          <p className="mt-1 text-sm text-white/44">Vue dynamique basee sur le fichier SDV associe au chauffeur selectionne.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/56">
          Marge {profitMargin}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-[24px] border border-white/8 bg-black/18 p-4">
              <div className={`inline-flex rounded-2xl p-3 ${item.accent}`}>
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-sm text-white/42">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-[#cf5d56]/16 bg-[#cf5d56]/8 p-4 text-sm text-white/78">
        <Activity className="size-4 text-[#ff8f84]" />
        Affectation active: <span className="font-semibold">{driverLabel}</span>.
      </div>
    </section>
  );
}
