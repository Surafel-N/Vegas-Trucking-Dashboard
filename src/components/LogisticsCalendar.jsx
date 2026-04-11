import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function LogisticsCalendar({ records, onDateSelect, onReset, isDateFiltered, globalMonth, onMonthChange }) {
  const chauffeurOptions = useMemo(() => {
    const options = ["Tous"];
    const labels = [...new Set((records || []).map(r => r.driverLabel))].filter(Boolean).sort();
    return [...options, ...labels];
  }, [records]);

  const [selectedPicker, setSelectedPicker] = useState("Tous");
  const [currentDate, setCurrentDate] = useState(() => {
    if (globalMonth && globalMonth !== "Tous les mois") {
      const now = new Date();
      return new Date(now.getFullYear(), Number(globalMonth) - 1, 1);
    }
    if (records && records.length > 0) {
      const last = new Date(records[records.length - 1].date);
      return new Date(last.getFullYear(), last.getMonth(), 1);
    }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // Sync internal state when globalMonth changes (Control Deck -> Calendar)
  useEffect(() => {
    if (globalMonth && globalMonth !== "Tous les mois") {
      const m = Number(globalMonth) - 1;
      if (m !== currentDate.getMonth()) {
        setCurrentDate(new Date(currentDate.getFullYear(), m, 1));
      }
    }
  }, [globalMonth]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(currentDate);
  }, [currentDate]);

  const activityMap = useMemo(() => {
    const map = {};
    const filtered = selectedPicker === "Tous" 
      ? records 
      : records.filter(r => r.driverLabel === selectedPicker);

    filtered.forEach((record) => {
      const d = new Date(record.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) {
          map[day] = { tonnage: 0, profit: 0, date: record.date };
        }
        map[day].tonnage += record.tonnage;
        map[day].profit += record.total_net_cfa || record.totalNetCFA || 0;
      }
    });
    return map;
  }, [records, year, month, selectedPicker]);

  const calendarGrid = useMemo(() => {
    const grid = [];
    const firstDay = new Date(year, month, 1).getDay();
    const padding = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = padding - 1; i >= 0; i--) grid.push({ day: daysInPrevMonth - i, isCurrent: false });
    for (let i = 1; i <= daysInMonth; i++) grid.push({ day: i, isCurrent: true });
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) grid.push({ day: i, isCurrent: false });
    return grid;
  }, [year, month]);

  const changeMonth = (offset) => {
    const nextDate = new Date(year, month + offset, 1);
    setCurrentDate(nextDate);
    // Sync Calendar -> Control Deck
    if (onMonthChange) {
      onMonthChange(String(nextDate.getMonth() + 1));
    }
  };

  const daysOfWeek = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <div className="panel-enter w-full max-w-[640px] rounded-[48px] bg-[#181818] p-[48px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.5)] transition-all mx-auto select-none border border-white/5">
      <div className="mb-[32px] flex flex-col items-center border-b border-white/5 pb-[32px]">
        <div className="inline-flex bg-white/5 p-1 rounded-full mb-8 overflow-x-auto max-w-full no-scrollbar border border-white/5">
          {chauffeurOptions.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedPicker(name)}
              className={`px-6 py-1.5 text-[14px] font-semibold rounded-full transition-all whitespace-nowrap ${
                selectedPicker === name 
                  ? "bg-white text-black shadow-sm" 
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {name.includes("(") ? name.split("(")[1].replace(")", "") : name}
            </button>
          ))}
        </div>

        <div className="w-full flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-[16px]">
              <h2 className="text-[60px] font-extrabold capitalize tracking-tighter text-white leading-none">
                {monthName}
              </h2>
              <span className="text-[28px] font-medium text-white/30">{year}</span>
            </div>
            
            {isDateFiltered && (
              <button 
                onClick={onReset}
                className="flex items-center gap-1 text-[18px] font-medium text-[#007AFF] hover:opacity-70 transition active:scale-95"
              >
                <X className="size-[20px]" />
                Voir tout le mois
              </button>
            )}
          </div>

          <div className="flex items-center gap-[8px]">
            <button onClick={() => changeMonth(-1)} className="p-[8px] text-white/20 hover:text-white/60 transition">
              <ChevronLeft className="size-[40px]" />
            </button>
            <button onClick={() => changeMonth(1)} className="p-[8px] text-white/20 hover:text-white/60 transition">
              <ChevronRight className="size-[40px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-[16px] pb-[16px]">
        {daysOfWeek.map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-[20px] font-bold text-white/20">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7" onDoubleClick={onReset}>
        {calendarGrid.map((item, index) => {
          const rowLine = index >= 7 ? "border-t-[2px] border-white/5" : "";
          const data = item.isCurrent ? activityMap[item.day] : null;
          const hasData = !!data;
          const isActive = hasData && data.tonnage > 0;

          return (
            <div key={index} className={`relative h-[80px] flex items-center justify-center ${rowLine} hover:z-[50] transition-none`}>
              {hasData && (
                <button
                  onClick={() => onDateSelect && onDateSelect(data.date)}
                  className={`group absolute size-[64px] rounded-full transition-all duration-300 z-0 flex items-center justify-center ${
                    isActive 
                      ? "bg-[#61d2c0] shadow-[0_8px_24px_-4px_rgba(97,210,192,0.45)]" 
                      : "bg-[#ff8f84] shadow-[0_8px_24px_-4px_rgba(255,143,132,0.45)]"
                  } hover:scale-110 active:scale-95`}
                >
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-[24px] w-[240px] -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-[9999]">
                    <div className="rounded-[16px] bg-[#0f172a] opacity-100 border border-white/10 px-[20px] py-[16px] text-[18px] text-white shadow-2xl">
                      <p className="mb-[10px] font-bold border-b border-white/10 pb-[8px] text-white">
                        {item.day} {monthName}
                      </p>
                      <div className="flex justify-between items-center gap-[8px] mb-1">
                        <span className="text-white/40 text-[16px]">Tonnage:</span>
                        <span className="font-bold text-blue-400">{data.tonnage.toFixed(1)}t</span>
                      </div>
                      <div className="flex justify-between items-center gap-[8px]">
                        <span className="text-white/40 text-[16px]">Bénéfice:</span>
                        <span className="font-bold text-green-400">
                          {new Intl.NumberFormat('fr-FR').format(Math.round(data.profit))}
                        </span>
                      </div>
                    </div>
                    <div className="mx-auto size-[16px] -translate-y-[8px] rotate-45 bg-[#0f172a] border-r border-b border-white/10" />
                  </div>
                </button>
              )}
              <span className={`relative z-10 text-[24px] font-bold pointer-events-none ${
                item.isCurrent ? (hasData ? "text-white" : "text-white") : "text-white/10"
              }`}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
