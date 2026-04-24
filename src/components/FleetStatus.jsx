import { Activity, CalendarDays, CircleDollarSign, Truck } from "lucide-react";

export function FleetStatus({ totalTrips, activeDays, profitableTrips, driverLabel, profitMargin }) {
  const items = [
    {
      label: "Jours d'Activité",
      value: activeDays,
      icon: CalendarDays,
      accent: "bg-white/5 text-white/60",
    },
    {
      label: "Voyages Profitables",
      value: profitableTrips,
      icon: CircleDollarSign,
      accent: "bg-[#9fe3b9]/10 text-[#9fe3b9]",
    },
  ];

  return (
    <section className="panel-enter rounded-[40px] border border-white/5 bg-[#111] p-6 text-white shadow-2xl h-full flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-2.5 rounded-2xl bg-[#cf5d56]/10 text-[#cf5d56]">
              <Truck className="size-5" />
           </div>
           <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#cf5d56] leading-none mb-1">Résumé Flotte</p>
              <h3 className="text-xl font-black tracking-tighter uppercase italic">{driverLabel}</h3>
           </div>
        </div>
        <div className="inline-block w-fit rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/40">
          Marge Opérationnelle: <span className="text-white ml-1">{profitMargin}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-[30px] border border-white/5 bg-black/40 p-5 group hover:border-[#cf5d56]/20 transition-all duration-300">
              <div className={`inline-flex rounded-2xl p-3 ${item.accent} group-hover:scale-110 transition-transform`}>
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-[25px] border border-[#cf5d56]/10 bg-[#cf5d56]/5 p-4 text-[11px] font-medium text-white/40">
        <div className="size-2 rounded-full bg-[#cf5d56] animate-pulse" />
        Focus Actuel: <span className="font-black text-white uppercase tracking-tighter">{driverLabel}</span>
      </div>
    </section>
  );
}
