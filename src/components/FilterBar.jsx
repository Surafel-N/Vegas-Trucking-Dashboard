import { CalendarRange, Filter, RotateCcw, UserRound, AlertTriangle } from "lucide-react";

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
  return (
    <section className="panel-enter rounded-2xl md:rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-4 md:p-6 text-white shadow-[0_28px_80px_-50px_rgba(0,0,0,0.9)] shrink-0">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/46">
            <Filter className="size-4" />
            Filtres
          </div>
          <h2 className="mt-1 md:mt-2 text-xl md:text-2xl font-semibold tracking-tight text-white">Control deck</h2>
          <p className="mt-1 text-xs md:text-sm text-white/44">Le chauffeur, le mois et la plage de dates pilotent tout le dashboard.</p>
        </div>

        <div className="flex gap-2 md:gap-3">
          {onClearAllStorage && (
            <button
              type="button"
              onClick={onClearAllStorage}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <AlertTriangle className="size-3 md:size-4" />
              <span className="hidden sm:inline">Purger tout</span>
              <span className="sm:hidden">Purger</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white/74 transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/8"
          >
            <RotateCcw className="size-3 md:size-4" />
            <span className="hidden sm:inline">Reinitialiser</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </div>

      <div className="mt-4 md:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Chauffeur</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <select
              value={chauffeur}
              onChange={(event) => onChauffeurChange(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] pl-11 pr-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
            >
              {chauffeurs.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Mois</span>
          <select
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
          >
            {months.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Annee</span>
          <select
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Destination</span>
          <select
            value={destination}
            onChange={(event) => onDestinationChange(event.target.value)}
            className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] px-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
          >
            {destinations.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Date debut</span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] pl-11 pr-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-white/58">Date fin</span>
          <div className="relative">
            <CalendarRange className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/35" />
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/8 bg-[#0d0d0d] pl-11 pr-4 text-white outline-none transition focus:border-[#cf5d56] focus:ring-4 focus:ring-[#cf5d56]/12"
            />
          </div>
        </label>
      </div>
    </section>
  );
}
