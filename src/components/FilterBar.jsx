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

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Mois</span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-white/8 bg-[#0d0d0d] min-h-[36px]">
            {months.map((m) => {
              const isSelected = Array.isArray(month) ? month.includes(String(m.value)) : month === String(m.value);
              return (
                <button
                  key={m.value}
                  onClick={() => {
                    let newMonths;
                    const val = String(m.value);
                    if (val === "Tous les mois") {
                      newMonths = ["Tous les mois"];
                    } else {
                      const current = Array.isArray(month) ? month.filter(v => v !== "Tous les mois") : [];
                      if (current.includes(val)) {
                        newMonths = current.filter(v => v !== val);
                      } else {
                        newMonths = [...current, val];
                      }
                      if (newMonths.length === 0) newMonths = ["Tous les mois"];
                    }
                    onMonthChange(newMonths);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${
                    isSelected 
                      ? "bg-[#cf5d56] border-[#cf5d56] text-white shadow-[0_0_10px_rgba(207,93,86,0.3)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {m.label.length > 3 ? m.label.substring(0, 3) : m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-white/40 ml-1">Années</span>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-white/8 bg-[#0d0d0d] min-h-[36px]">
            {years.map((y) => {
              const isSelected = Array.isArray(year) ? year.includes(y) : year === y;
              return (
                <button
                  key={y}
                  onClick={() => {
                    let newYears;
                    if (y === "Toutes les années") {
                      newYears = ["Toutes les années"];
                    } else {
                      const current = Array.isArray(year) ? year.filter(v => v !== "Toutes les années") : [];
                      if (current.includes(y)) {
                        newYears = current.filter(v => v !== y);
                      } else {
                        newYears = [...current, y];
                      }
                      if (newYears.length === 0) newYears = ["Toutes les années"];
                    }
                    onYearChange(newYears);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border ${
                    isSelected 
                      ? "bg-[#00F2FF] border-[#00F2FF] text-black shadow-[0_0_10px_rgba(0,242,255,0.3)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {y === "Toutes les années" ? "ALL" : y}
                </button>
              );
            })}
          </div>
        </div>

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
