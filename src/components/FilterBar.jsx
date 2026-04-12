import { CalendarRange, Filter, RotateCcw, UserRound, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function FilterBar({
  chauffeurs,
  chauffeur,
  months,
  month,
  years,
  year,
  destinations,
  destination,
  startDate,
  endDate,
  onChauffeurChange,
  onMonthChange,
  onYearChange,
  onDestinationChange,
  onStartDateChange,
  onEndDateChange,
  onReset,
  onClearAllStorage
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="panel-enter rounded-2xl md:rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-3 md:p-4 text-white shadow-lg shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#cf5d56]/10 text-[#cf5d56]">
            <Filter className="size-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-white/70">Control Deck</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/10"
          >
            {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {isOpen ? "Fermer" : "Filtres"}
          </button>

          <button
            type="button"
            onClick={onReset}
            title="Réinitialiser"
            className="rounded-lg border border-white/10 bg-white/4 p-1.5 text-white/74 transition hover:bg-white/8"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 ${isOpen ? 'grid' : 'hidden'}`}>
        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Chauffeur</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
            <select
              value={chauffeur}
              onChange={(e) => onChauffeurChange(e.target.value)}
              className="h-9 w-full appearance-none rounded-xl border border-white/8 bg-[#0d0d0d] pl-9 pr-4 text-xs text-white outline-none transition focus:border-[#cf5d56]"
            >
              {chauffeurs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Mois</span>
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-9 w-full appearance-none rounded-xl border border-white/8 bg-[#0d0d0d] px-3 text-xs text-white outline-none transition focus:border-[#cf5d56]"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Année</span>
          <select
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            className="h-9 w-full appearance-none rounded-xl border border-white/8 bg-[#0d0d0d] px-3 text-xs text-white outline-none transition focus:border-[#cf5d56]"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Destination</span>
          <select
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            className="h-9 w-full appearance-none rounded-xl border border-white/8 bg-[#0d0d0d] px-3 text-xs text-white outline-none transition focus:border-[#cf5d56]"
          >
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Début</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-white/8 bg-[#0d0d0d] px-3 text-xs text-white outline-none transition focus:border-[#cf5d56]"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Fin</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-white/8 bg-[#0d0d0d] px-3 text-xs text-white outline-none transition focus:border-[#cf5d56]"
          />
        </label>
      </div>
    </section>
  );
}
