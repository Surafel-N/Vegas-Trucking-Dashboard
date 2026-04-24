import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, CalendarDays, ChevronUp, ChevronDown, TrendingUp, Grid2X2, Calendar as MonthIcon } from "lucide-react";

export function LogisticsCalendar({ 
  records, 
  viewDate, 
  onDayClick, 
  onMonthChange, 
  onResetDay,
  selectedChauffeur,
  onChauffeurChange,
  chauffeurOptions,
  year: selectedYears = [],
  month: selectedMonths = [],
  selectedDates = [],
  onSelection
}) {
  const [viewMode, setViewMode] = useState("month"); // "month", "year_months", "global_years"

  const currentViewYear = viewDate.getFullYear();
  const currentViewMonth = viewDate.getMonth();

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(viewDate);
  }, [viewDate]);

  const todayISO = new Date().toISOString().split('T')[0];

  // Filtrage des records par chauffeur
  const filteredRecords = useMemo(() => {
    return selectedChauffeur === "Tous les chauffeurs" || selectedChauffeur === "Tous"
      ? records 
      : records.filter(r => String(r.driverLabel || "").trim() === String(selectedChauffeur).trim());
  }, [records, selectedChauffeur]);

  // Activité pour la vue MENSUELLE
  const activityMap = useMemo(() => {
    const map = {};
    filteredRecords.forEach((record) => {
      const d = new Date(record.date);
      if (d.getFullYear() === currentViewYear && d.getMonth() === currentViewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = { tonnage: 0, profit: 0, date: record.date };
        map[day].tonnage += record.tonnage;
        map[day].profit += record.total_net_cfa || 0;
      }
    });
    return map;
  }, [filteredRecords, currentViewYear, currentViewMonth]);

  // Activité pour la vue MOIS de l'année en cours
  const monthsActivity = useMemo(() => {
    const months = Array(12).fill(0).map((_, i) => ({
      idx: i + 1,
      name: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(currentViewYear, i, 1)),
      tonnage: 0,
      trips: 0
    }));
    filteredRecords.forEach(r => {
      const d = new Date(r.date);
      if (d.getFullYear() === currentViewYear) {
        const m = d.getMonth();
        months[m].tonnage += r.tonnage || 0;
        if ((r.tonnage || 0) > 0) months[m].trips += (r.tonnage > 100 ? 2 : 1);
      }
    });
    return months;
  }, [filteredRecords, currentViewYear]);

  // Activité pour la vue GLOBALE ANNÉES
  const globalYearsActivity = useMemo(() => {
    const yearsMap = {};
    filteredRecords.forEach(r => {
        const y = String(r.year);
        if (!yearsMap[y]) yearsMap[y] = { name: y, tonnage: 0, trips: 0 };
        yearsMap[y].tonnage += r.tonnage || 0;
        if ((r.tonnage || 0) > 0) yearsMap[y].trips += (r.tonnage > 100 ? 2 : 1);
    });
    return Object.values(yearsMap).sort((a,b) => a.name.localeCompare(b.name));
  }, [filteredRecords]);

  const calendarGrid = useMemo(() => {
    const grid = [];
    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const padding = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentViewYear, currentViewMonth, 0).getDate();
    for (let i = padding - 1; i >= 0; i--) grid.push({ day: daysInPrevMonth - i, isCurrent: false });
    for (let i = 1; i <= daysInMonth; i++) grid.push({ day: i, isCurrent: true });
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) grid.push({ day: i, isCurrent: false });
    return grid;
  }, [currentViewYear, currentViewMonth]);

  const handleYearChange = (delta) => {
    const newDate = new Date(viewDate);
    newDate.setFullYear(currentViewYear + delta);
    onMonthChange(delta * 12);
  };

  const toggleMonthSelection = (mIdx) => {
      const val = String(mIdx);
      let newMonths;
      const current = selectedMonths.filter(v => v !== "Tous les mois");
      if (current.includes(val)) newMonths = current.filter(v => v !== val);
      else newMonths = [...current, val];
      if (newMonths.length === 0) newMonths = ["Tous les mois"];
      onSelection('month', newMonths);
  };

  const toggleYearSelection = (yStr) => {
      let newYears;
      const current = selectedYears.filter(v => v !== "Toutes les années");
      if (current.includes(yStr)) newYears = current.filter(v => v !== yStr);
      else newYears = [...current, yStr];
      if (newYears.length === 0) newYears = ["Toutes les années"];
      onSelection('year', newYears);
  };

  return (
    <div className="flex flex-col h-full w-full select-none font-sans relative">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black capitalize text-white tracking-tighter leading-none">
                {viewMode === "month" ? monthName : viewMode === "year_months" ? "Sélection Mois" : "Vue Annuelle"}
            </h2>
            <div className="flex flex-col items-center bg-white/5 rounded-lg px-1 ml-1">
                <button onClick={() => handleYearChange(1)} className="text-white/20 hover:text-white transition-all"><ChevronUp className="size-3" /></button>
                <span className="text-lg font-black text-[#00F2FF] leading-none my-0.5">{currentViewYear}</span>
                <button onClick={() => handleYearChange(-1)} className="text-white/20 hover:text-white transition-all"><ChevronDown className="size-3" /></button>
            </div>
          </div>
          <div className="flex gap-2.5 mt-2">
            <button onClick={() => setViewMode("month")} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${viewMode === 'month' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/40 hover:bg-white/5'}`}><CalendarIcon className="size-3" /> Jours</button>
            <button onClick={() => setViewMode("year_months")} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${viewMode === 'year_months' ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20' : 'text-white/40 hover:bg-white/5'}`}><MonthIcon className="size-3" /> Mois</button>
            <button onClick={() => setViewMode("global_years")} className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${viewMode === 'global_years' ? 'bg-[#BF5AF2] text-white shadow-lg shadow-[#BF5AF2]/20' : 'text-white/40 hover:bg-white/5'}`}><Grid2X2 className="size-3" /> Années</button>
          </div>
        </div>
        
        <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
          <button onClick={() => onMonthChange(-1)} className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all"><ChevronLeft className="size-5" /></button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => onMonthChange(1)} className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all"><ChevronRight className="size-5" /></button>
        </div>
      </div>

      {/* Sélecteur Chauffeur */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-4 bg-black/20 p-1 rounded-xl border border-white/5">
        {(chauffeurOptions || ["Tous"]).map((name) => {
          const isSelected = selectedChauffeur === name || (name === "Tous" && selectedChauffeur === "Tous les chauffeurs");
          return (
            <button key={name} onClick={() => onChauffeurChange(name === "Tous" ? "Tous les chauffeurs" : name)}
              className={`px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all ${isSelected ? "bg-[#cf5d56] text-white shadow-md" : "text-white/30 hover:bg-white/5"}`}>{name === "Tous" || name === "Tous les chauffeurs" ? "Flotte" : name.split(' ')[0]}</button>
          );
        })}
      </div>

      {/* CONTENU SELON LE MODE */}
      <div className="flex-1 flex flex-col min-h-0">
        {viewMode === "month" && (
           <>
            <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-black text-white/20 uppercase">{"LMMJVSD".split('').map((d,i) => <div key={i}>{d}</div>)}</div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5">
               {calendarGrid.map((item, index) => {
                 const data = item.isCurrent ? activityMap[item.day] : null;
                 const isSel = item.isCurrent && selectedDates.includes(data?.date);
                 const isActive = data?.tonnage > 0;
                 const colIdx = index % 7;

                 let tooltipPos = "left-1/2 -translate-x-1/2";
                 let arrowPos = "mx-auto";
                 if (colIdx < 2) { tooltipPos = "left-0 translate-x-0"; arrowPos = "ml-4"; }
                 if (colIdx > 4) { tooltipPos = "right-0 translate-x-0 left-auto"; arrowPos = "mr-4 ml-auto"; }

                 return (
                   <div key={index} className="relative group flex items-center justify-center h-full w-full">
                     {item.isCurrent && (
                       <>
                        <button onClick={() => onDayClick(data?.date || null)} 
                          className={`absolute inset-0 rounded-xl transition-all border ${isSel ? "bg-[#cf5d56] border-[#cf5d56] shadow-lg shadow-[#cf5d56]/40" : isActive ? "bg-[#61d2c0]/10 border-[#61d2c0]/30 hover:bg-[#61d2c0]/20" : "bg-[#ff8f84]/5 border-transparent hover:bg-[#ff8f84]/10"}`}>
                        </button>
                        {/* Bulle / Tooltip Apple Style */}
                        {data && !isSel && (
                          <div className={`pointer-events-none absolute bottom-full mb-4 w-48 ${tooltipPos} opacity-0 group-hover:opacity-100 transition-all duration-300 z-[100] transform group-hover:translate-y-0 translate-y-2`}>
                            <div className="rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 p-3 text-white shadow-2xl overflow-hidden">
                              <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
                                  <span className="text-[9px] font-black uppercase text-white/40">{item.day} {monthName.substring(0,3)}</span>
                                  <div className={`size-1.5 rounded-full ${isActive ? 'bg-[#61d2c0]' : 'bg-[#ff8f84]'}`} />
                              </div>
                              <div className="space-y-1 text-[10px]">
                                 <div className="flex justify-between"><span className="text-white/40 font-bold">Vol:</span><span className="font-black">{data.tonnage.toFixed(1)} T</span></div>
                                 <div className="flex justify-between"><span className="text-white/40 font-bold">Prof:</span><span className="font-black text-[#9fe3b9]">{Math.round(data.profit).toLocaleString()}</span></div>
                              </div>
                            </div>
                            <div className={`size-3 -translate-y-1.5 rotate-45 bg-[#1c1c1e] border-r border-b border-white/10 ${arrowPos}`} />
                          </div>
                        )}
                       </>
                     )}
                     <span className={`relative z-10 text-xs font-black pointer-events-none transition-colors ${!item.isCurrent ? "text-white/5" : isSel ? "text-white" : isActive ? "text-[#61d2c0]" : "text-[#ff8f84]/60"}`}>{item.day}</span>
                     {isActive && !isSel && (
                       <div className="absolute bottom-1.5 size-1 rounded-full bg-[#61d2c0]/40 shadow-[0_0_5px_#61d2c0]" />
                     )}
                   </div>
                 );
               })}
            </div>
           </>
        )}

        {viewMode === "year_months" && (
            <div className="grid grid-cols-3 gap-2 h-full">
                {monthsActivity.map(m => {
                    const isSel = selectedMonths.includes(String(m.idx));
                    return (
                        <button key={m.idx} onClick={() => toggleMonthSelection(m.idx)}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left ${isSel ? "bg-[#00F2FF]/20 border-[#00F2FF] shadow-lg shadow-[#00F2FF]/20" : m.trips > 0 ? "bg-[#61d2c0]/5 border-[#61d2c0]/20 hover:bg-[#61d2c0]/10" : "bg-white/2 border-white/5"}`}>
                            <span className="text-[10px] font-black uppercase text-white/40">{m.name}</span>
                            <div>
                                <p className={`text-sm font-black ${isSel ? 'text-[#00F2FF]' : 'text-white/80'}`}>{m.tonnage.toFixed(0)}T</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">{m.trips} voyages</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {viewMode === "global_years" && (
            <div className="grid grid-cols-2 gap-3 h-full">
                {globalYearsActivity.map(y => {
                    const isSel = selectedYears.includes(y.name);
                    return (
                        <button key={y.name} onClick={() => toggleYearSelection(y.name)}
                            className={`p-4 rounded-3xl border transition-all flex flex-col justify-between text-left ${isSel ? "bg-[#BF5AF2]/20 border-[#BF5AF2] shadow-lg shadow-[#BF5AF2]/20" : "bg-white/2 border-white/5 hover:bg-white/5"}`}>
                            <span className="text-xs font-black text-white/40">{y.name}</span>
                            <div>
                                <p className="text-lg font-black text-white">{y.tonnage.toFixed(0)}T</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase">{y.trips} voyages total</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}
