import { useMemo, useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CalendarDays, 
  ChevronUp, 
  ChevronDown, 
  Grid2X2, 
  Calendar as MonthIcon,
  HelpCircle,
  X,
  Check,
  Truck,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { ALL_CHAUFFEURS, ALL_MONTHS, ALL_YEARS } from "../lib/dashboard";
import type { Language } from "../utils/i18n";

interface LogisticsCalendarProps {
  records: any[];
  viewDate: Date;
  onDayClick: (date: string | null) => void;
  onMonthChange: (delta: number) => void;
  onResetDay?: () => void;
  selectedChauffeur?: string;
  onChauffeurChange?: (chauffeur: string) => void;
  chauffeurOptions?: string[];
  year?: string[];
  month?: string[];
  selectedDates?: string[];
  onSelection?: (type: 'month' | 'year', values: string[]) => void;
  onPresetPeriod?: (presetKey: string) => void;
  onReset?: () => void;
  currency?: string;
  t?: any;
  language?: Language;
}

export function LogisticsCalendar({ 
  records = [], 
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
  onSelection,
  onPresetPeriod,
  onReset,
  currency = "CFA",
  t,
  language = "FR"
}: LogisticsCalendarProps) {
  const isEn = language === "EN";

  // Mode de vue : "simple" (nouveau, par défaut) ou "expert" (vue classique 3 onglets)
  const [calendarMode, setCalendarMode] = useState<"simple" | "expert">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sdv_calendar_mode");
      if (saved === "expert" || saved === "simple") return saved;
    }
    return "simple";
  });

  const handleSetMode = (mode: "simple" | "expert") => {
    setCalendarMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("sdv_calendar_mode", mode);
    }
  };

  // Sous-mode pour la vue expert ("month" = Jours, "year_months" = Mois, "global_years" = Années)
  const [expertViewMode, setExpertViewMode] = useState<"month" | "year_months" | "global_years">("month");

  // Raccourci actif en mode simple ("today" | "week" | "month" | "lastmonth" | "year" | "all" | "custom")
  const [activePreset, setActivePreset] = useState<string>("month");

  // Guide modal d'utilisation pour débutant / visiteur
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const CFA_TO_USD_RATE = 560;

  const formatProf = (val: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val / CFA_TO_USD_RATE);
    }
    return Math.round(val).toLocaleString(isEn ? "en-US" : "fr-FR") + (currency === "CFA" ? " CFA" : "");
  };

  const formatShortAmount = (val: number) => {
    if (!val || val === 0) return "0";
    if (Math.abs(val) >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2).replace(".", ",")}M`;
    }
    if (Math.abs(val) >= 1_000) {
      return `${Math.round(val / 1_000)}k`;
    }
    return Math.round(val).toString();
  };

  const currentViewYear = viewDate.getFullYear();
  const currentViewMonth = viewDate.getMonth();

  const monthName = useMemo(() => {
    if (t?.months) return t.months[currentViewMonth];
    return new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", { month: "long" }).format(viewDate);
  }, [viewDate, t, isEn, currentViewMonth]);

  const todayDate = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => todayDate.toISOString().split('T')[0], [todayDate]);

  // Filtrage des records par chauffeur sélectionné
  const filteredRecords = useMemo(() => {
    const chauffeurVal = String(selectedChauffeur || "").trim();
    return chauffeurVal === ALL_CHAUFFEURS || !chauffeurVal
      ? records 
      : records.filter(r => String(r.driverLabel || "").trim() === chauffeurVal);
  }, [records, selectedChauffeur]);

  // Activité pour la vue MENSUELLE (par jour du mois en cours de visualisation)
  const activityMap = useMemo(() => {
    const map: Record<number, { tonnage: number; profit: number; gross: number; date: string; trips: number }> = {};
    filteredRecords.forEach((record) => {
      const d = new Date(record.date);
      if (d.getFullYear() === currentViewYear && d.getMonth() === currentViewMonth) {
        const day = d.getDate();
        if (!map[day]) {
          map[day] = { tonnage: 0, profit: 0, gross: 0, date: record.date, trips: 0 };
        }
        const t = Number(record.tonnage) || 0;
        const g = Number(record.total_gross_cfa || record.totalGrossCFA) || 0;
        const n = Number(record.total_net_cfa || record.totalNetCFA) || 0;

        map[day].tonnage += t;
        map[day].profit += n;
        map[day].gross += g;
        if (t > 0) {
          map[day].trips += (t > 100 ? 2 : 1);
        }
      }
    });
    return map;
  }, [filteredRecords, currentViewYear, currentViewMonth]);

  // Montant max du CA journalier pour doser l'intensité des couleurs des cases
  const maxDailyGross = useMemo(() => {
    let max = 0;
    Object.values(activityMap).forEach(v => {
      if (v.gross > max) max = v.gross;
    });
    return max > 0 ? max : 1_500_000;
  }, [activityMap]);

  // Activité pour la vue MOIS de l'année en cours (Mode Expert)
  const monthsActivity = useMemo(() => {
    const months = Array(12).fill(0).map((_, i) => ({
      idx: i + 1,
      name: t?.months ? t.months[i].substring(0,3) : new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", { month: "short" }).format(new Date(currentViewYear, i, 1)),
      tonnage: 0,
      trips: 0
    }));
    filteredRecords.forEach(r => {
      const d = new Date(r.date);
      if (d.getFullYear() === currentViewYear) {
        const m = d.getMonth();
        const tVal = Number(r.tonnage) || 0;
        months[m].tonnage += tVal;
        if (tVal > 0) months[m].trips += (tVal > 100 ? 2 : 1);
      }
    });
    return months;
  }, [filteredRecords, currentViewYear, t, isEn]);

  // Activité pour la vue GLOBALE ANNÉES (Mode Expert)
  const globalYearsActivity = useMemo(() => {
    const yearsMap: Record<string, { name: string; tonnage: number; trips: number }> = {};
    filteredRecords.forEach(r => {
        const y = String(r.year);
        if (!yearsMap[y]) yearsMap[y] = { name: y, tonnage: 0, trips: 0 };
        const tVal = Number(r.tonnage) || 0;
        yearsMap[y].tonnage += tVal;
        if (tVal > 0) yearsMap[y].trips += (tVal > 100 ? 2 : 1);
    });
    return Object.values(yearsMap).sort((a,b) => (a.name).localeCompare(b.name));
  }, [filteredRecords]);

  // Grille 7x6 de 42 jours
  const calendarGrid = useMemo(() => {
    const grid: Array<{ day: number; isCurrent: boolean; dateString: string }> = [];
    const firstDay = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const padding = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentViewYear, currentViewMonth, 0).getDate();

    // Jours du mois précédent
    for (let i = padding - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = currentViewMonth === 0 ? 11 : currentViewMonth - 1;
      const prevY = currentViewMonth === 0 ? currentViewYear - 1 : currentViewYear;
      const dateString = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      grid.push({ day: d, isCurrent: false, dateString });
    }

    // Jours du mois en cours
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${currentViewYear}-${String(currentViewMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      grid.push({ day: i, isCurrent: true, dateString });
    }

    // Jours du mois suivant
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentViewMonth === 11 ? 0 : currentViewMonth + 1;
      const nextY = currentViewMonth === 11 ? currentViewYear + 1 : currentViewYear;
      const dateString = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      grid.push({ day: i, isCurrent: false, dateString });
    }

    return grid;
  }, [currentViewYear, currentViewMonth]);

  // Totaux de la sélection active (pour le bandeau "Vous regardez :")
  const bannerStats = useMemo(() => {
    let title = "";
    let tonnage = 0;
    let gross = 0;
    let net = 0;
    let note = "";

    const driverLabel = !selectedChauffeur || selectedChauffeur === ALL_CHAUFFEURS 
      ? (isEn ? "Entire Fleet" : "Flotte entière")
      : selectedChauffeur.split(" ")[0];

    // Cas 1 : Jours précis sélectionnés (ex: clic sur 1 ou plusieurs cases)
    if (selectedDates && selectedDates.length > 0) {
      selectedDates.forEach(dStr => {
        const matching = filteredRecords.filter(r => r.date === dStr);
        matching.forEach(r => {
          tonnage += Number(r.tonnage) || 0;
          gross += Number(r.total_gross_cfa || r.totalGrossCFA) || 0;
          net += Number(r.total_net_cfa || r.totalNetCFA) || 0;
        });
      });

      if (selectedDates.length === 1) {
        const dObj = new Date(selectedDates[0]);
        const dayFormatted = dObj.toLocaleDateString(isEn ? "en-US" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
        title = `${dayFormatted} · ${driverLabel}`;
      } else {
        title = `${selectedDates.length} ${isEn ? "selected days" : "jours sélectionnés"} · ${driverLabel}`;
      }
      note = isEn ? "Specific day filter active" : "Filtre par jours précis actif sur tout le dashboard";
    } 
    // Cas 2 : Période globale (mois ou année)
    else {
      // Filtrer les records du mois ou de l'année visualisés
      const hasSpecificMonth = selectedMonths.length > 0 && !selectedMonths.includes(ALL_MONTHS);
      const hasSpecificYear = selectedYears.length > 0 && !selectedYears.includes(ALL_YEARS);

      if (hasSpecificMonth) {
        title = `${monthName} ${currentViewYear} · ${driverLabel}`;
      } else if (hasSpecificYear) {
        title = `${currentViewYear} · ${driverLabel}`;
      } else {
        title = `${monthName} ${currentViewYear} · ${driverLabel}`;
      }

      // Calcul des totaux sur le mois visualisé
      Object.values(activityMap).forEach(v => {
        tonnage += v.tonnage;
        gross += v.gross;
        net += v.profit;
      });

      note = isEn 
        ? "Quantum and categories follow this active view" 
        : "Tout le tableau de bord (Quantum, catégories…) suit cette sélection";
    }

    return { title, tonnage, gross, net, note };
  }, [selectedDates, filteredRecords, selectedChauffeur, isEn, monthName, currentViewYear, selectedMonths, selectedYears, activityMap]);

  // Navigation mois & années
  const handleYearChange = (delta: number) => {
    onMonthChange(delta * 12);
  };

  const handleSelectMonth = (mIdx: number) => {
    const diff = mIdx - currentViewMonth;
    if (diff !== 0) {
      onMonthChange(diff);
      if (onSelection) {
        onSelection("month", [String(mIdx + 1)]);
      }
    }
  };

  const handleSelectYear = (yNum: number) => {
    const diff = (yNum - currentViewYear) * 12;
    if (diff !== 0) {
      onMonthChange(diff);
      if (onSelection) {
        onSelection("year", [String(yNum)]);
      }
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    const diffMonth = (today.getFullYear() - currentViewYear) * 12 + (today.getMonth() - currentViewMonth);
    if (diffMonth !== 0) {
      onMonthChange(diffMonth);
    }
    if (onDayClick) {
      onDayClick(todayISO);
    }
    setActivePreset("today");
  };

  // Gestion des raccourcis de période
  const handlePresetClick = (presetKey: string) => {
    setActivePreset(presetKey);
    if (onPresetPeriod) {
      onPresetPeriod(presetKey);
      return;
    }

    // Comportement par défaut si onPresetPeriod n'est pas fourni
    if (presetKey === "today") {
      handleJumpToToday();
    } else if (presetKey === "month") {
      if (onResetDay) onResetDay();
      if (onSelection) onSelection("month", [String(currentViewMonth + 1)]);
    } else if (presetKey === "lastmonth") {
      onMonthChange(-1);
    } else if (presetKey === "year") {
      if (onResetDay) onResetDay();
      if (onSelection) {
        onSelection("month", [ALL_MONTHS]);
        onSelection("year", [String(currentViewYear)]);
      }
    } else if (presetKey === "all") {
      if (onResetDay) onResetDay();
      if (onSelection) {
        onSelection("month", [ALL_MONTHS]);
        onSelection("year", [ALL_YEARS]);
      }
      if (onChauffeurChange) onChauffeurChange(ALL_CHAUFFEURS);
    }
  };

  const handleClearSelection = () => {
    if (onResetDay) onResetDay();
    if (onReset) onReset();
    setActivePreset("month");
  };

  // Liste des mois pour le sélecteur dropdown
  const monthOptionsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentViewYear, i, 1);
      const name = new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", { month: "long" }).format(d);
      return { index: i, name: name.charAt(0).toUpperCase() + name.slice(1) };
    });
  }, [currentViewYear, isEn]);

  // Liste des chauffeurs avec badge coloré
  const DRIVERS_LIST = useMemo(() => [
    { key: ALL_CHAUFFEURS, label: t?.fleet || (isEn ? "Entire Fleet" : "Flotte entière"), short: isEn ? "Fleet" : "Flotte", color: "#cf5d56" },
    { key: "AMARA TRUCK 76", label: "AMARA · 76", short: "AMARA", color: "#cf5d56" },
    { key: "BRAHIMA TRUCK 45", label: "BRAHIMA · 45", short: "BRAHIMA", color: "#00F2FF" },
    { key: "SORO TRUCK 52", label: "SORO · 52", short: "SORO", color: "#BF5AF2" }
  ], [t, isEn]);

  const PRESETS_LIST = [
    { key: "today", label: isEn ? "Today" : "Aujourd'hui" },
    { key: "week", label: isEn ? "This Week" : "Cette semaine" },
    { key: "month", label: isEn ? "This Month" : "Ce mois" },
    { key: "lastmonth", label: isEn ? "Last Month" : "Mois dernier" },
    { key: "year", label: isEn ? "This Year" : "Cette année" },
    { key: "all", label: isEn ? "All Time" : "Tout" }
  ];

  const daysLabels = isEn ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : (t?.daysShort || ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]);

  return (
    <div className="flex flex-col h-full w-full select-none font-sans relative">
      
      {/* 1. BARRE SUPÉRIEURE : TITRE + BASCULE SIMPLE / EXPERT + AIDE (?) */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-[#00F2FF]" />
          <span className="text-xs font-black uppercase tracking-widest text-white/80">
            {t?.calendar || (isEn ? "Logistics Calendar" : "Calendrier")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Interrupteur Simple / Expert */}
          <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/10 shadow-inner">
            <button
              onClick={() => handleSetMode("simple")}
              className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                calendarMode === "simple"
                  ? "bg-[#61d2c0] text-black shadow-md shadow-[#61d2c0]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {isEn ? "Simple" : "Simple"}
            </button>
            <button
              onClick={() => handleSetMode("expert")}
              className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                calendarMode === "expert"
                  ? "bg-[#BF5AF2] text-white shadow-md shadow-[#BF5AF2]/20"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {isEn ? "Expert" : "Expert"}
            </button>
          </div>

          {/* Bouton Guide / Aide (?) */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="size-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white text-xs font-black flex items-center justify-center transition-all cursor-pointer"
            title={isEn ? "Help: How to use the calendar" : "Aide : comment utiliser le calendrier"}
          >
            <HelpCircle className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ===================== VUE SIMPLE (PAR DÉFAUT) ===================== */}
      {calendarMode === "simple" && (
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* A. RACCOURCIS DE PÉRIODE EN 1 CLIC */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS_LIST.map((p) => {
              const isSelected = activePreset === p.key && (!selectedDates || selectedDates.length === 0);
              return (
                <button
                  key={p.key}
                  onClick={() => handlePresetClick(p.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black tracking-wide border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#00F2FF] text-black border-[#00F2FF] shadow-lg shadow-[#00F2FF]/20"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* B. NAVIGATION MENSUELLE CLAIRE PAR DROPDOWNS & BOUTON AUJOURD'HUI */}
          <div className="flex items-center gap-2 mb-3 bg-black/20 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => onMonthChange(-1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer"
              title={isEn ? "Previous month" : "Mois précédent"}
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Sélecteur Mois */}
            <select
              value={currentViewMonth}
              onChange={(e) => handleSelectMonth(Number(e.target.value))}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-white capitalize flex-1 outline-none cursor-pointer"
            >
              {monthOptionsList.map((m) => (
                <option key={m.index} value={m.index} className="bg-[#1c1c1e] text-white">
                  {m.name}
                </option>
              ))}
            </select>

            {/* Sélecteur Année */}
            <select
              value={currentViewYear}
              onChange={(e) => handleSelectYear(Number(e.target.value))}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-black text-[#00F2FF] outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-[#1c1c1e] text-white">
                  {y}
                </option>
              ))}
            </select>

            <button
              onClick={() => onMonthChange(1)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer"
              title={isEn ? "Next month" : "Mois suivant"}
            >
              <ChevronRight className="size-4" />
            </button>

            {/* Bouton Aujourd'hui */}
            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1.5 rounded-xl bg-[#cf5d56]/15 hover:bg-[#cf5d56]/25 border border-[#cf5d56]/30 text-[#ff8f84] text-[11px] font-black active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {isEn ? "Today" : "Aujourd'hui"}
            </button>
          </div>

          {/* C. SÉLECTEUR CHAUFFEURS ERGONOMIQUE */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3 bg-black/25 p-1 rounded-xl border border-white/5">
            {DRIVERS_LIST.map((d) => {
              const isSelected = selectedChauffeur === d.key || (!selectedChauffeur && d.key === ALL_CHAUFFEURS);
              return (
                <button
                  key={d.key}
                  onClick={() => onChauffeurChange && onChauffeurChange(d.key)}
                  className={`flex-1 min-w-[70px] px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "text-black shadow-md"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                  style={isSelected ? { backgroundColor: d.color } : {}}
                >
                  {d.key !== ALL_CHAUFFEURS && (
                    <span 
                      className="size-2 rounded-full shrink-0" 
                      style={{ backgroundColor: isSelected ? "#000" : d.color }} 
                    />
                  )}
                  <span className="truncate">{d.short}</span>
                </button>
              );
            })}
          </div>

          {/* D. GRILLE CALENDRIER AVEC CHIFFRES DIRECTS DANS LES CASES */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Jours de la semaine */}
            <div className="grid grid-cols-7 mb-1.5 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">
              {daysLabels.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            {/* Cases des jours */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarGrid.map((item, index) => {
                const data = item.isCurrent ? activityMap[item.day] : null;
                const isSelected = item.isCurrent && selectedDates.includes(item.dateString);
                const hasActivity = data && data.tonnage > 0;
                const isToday = item.dateString === todayISO;

                // Calcul du ratio d'intensité de couleur de fond (vert mint transparent)
                const intensity = hasActivity ? Math.min(0.65, 0.12 + (data.gross / maxDailyGross) * 0.5) : 0;

                const colIdx = index % 7;
                let tooltipPos = "left-1/2 -translate-x-1/2";
                if (colIdx < 2) tooltipPos = "left-0 translate-x-0";
                if (colIdx > 4) tooltipPos = "right-0 translate-x-0 left-auto";

                return (
                  <div key={index} className="relative group flex flex-col justify-between h-[52px] w-full">
                    {item.isCurrent ? (
                      <button
                        onClick={() => onDayClick(data?.date || item.dateString)}
                        className={`h-full w-full rounded-xl p-1 text-left flex flex-col justify-between transition-all border cursor-pointer ${
                          isSelected
                            ? "bg-[#cf5d56] border-[#cf5d56] shadow-lg shadow-[#cf5d56]/40 text-white z-10"
                            : hasActivity
                            ? "border-[#61d2c0]/30 hover:border-[#61d2c0] text-white"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-white/30"
                        } ${isToday && !isSelected ? "ring-2 ring-yellow-400" : ""}`}
                        style={hasActivity && !isSelected ? { backgroundColor: `rgba(97, 210, 192, ${intensity})` } : {}}
                      >
                        {/* Numéro du jour */}
                        <div className="flex justify-between items-center leading-none">
                          <span className={`text-[11px] font-black ${isSelected ? "text-white" : hasActivity ? "text-white" : "text-white/40"}`}>
                            {item.day}
                          </span>
                          {hasActivity && !isSelected && (
                            <span className="size-1 rounded-full bg-[#61d2c0] shadow-[0_0_4px_#61d2c0]" />
                          )}
                        </div>

                        {/* Montant et Tonnage affichés DIRECTEMENT dans la case */}
                        {hasActivity ? (
                          <div className="leading-tight">
                            <span className={`block text-[10px] font-black truncate ${isSelected ? "text-white" : "text-white/95"}`}>
                              {formatShortAmount(data.gross)}
                            </span>
                            <span className={`block text-[8.5px] font-bold truncate ${isSelected ? "text-white/80" : "text-white/55"}`}>
                              {Math.round(data.tonnage)}T
                            </span>
                          </div>
                        ) : data && data.profit < 0 ? (
                          <span className="text-[8px] font-bold text-red-300/70 truncate leading-none">
                            frais
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <div className="h-full w-full rounded-xl bg-white/[0.01] border border-transparent p-1 flex items-start opacity-15">
                        <span className="text-[10px] font-bold text-white/20">{item.day}</span>
                      </div>
                    )}

                    {/* Tooltip Apple Style au survol */}
                    {item.isCurrent && data && !isSelected && (
                      <div className={`pointer-events-none absolute bottom-full mb-2 w-48 ${tooltipPos} opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 transform group-hover:translate-y-0 translate-y-1`}>
                        <div className="rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 p-3 text-white shadow-2xl overflow-hidden">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-1.5">
                            <span className="text-[10px] font-black uppercase text-white/50">
                              {item.day} {monthName} {currentViewYear}
                            </span>
                            <div className="size-1.5 rounded-full bg-[#61d2c0]" />
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-white/40">{t?.volume || "Volume"} :</span>
                              <span className="font-black text-white">{data.tonnage.toFixed(1)} T</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">{t?.revenue || "CA"} :</span>
                              <span className="font-black text-[#00F2FF]">{formatProf(data.gross)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/40">{t?.netProfit || "Net"} :</span>
                              <span className="font-black text-[#9fe3b9]">{formatProf(data.profit)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* E. LÉGENDE COMPACTE */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-white/50 px-1">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-[#61d2c0]/60 border border-[#61d2c0]" />
                {isEn ? "Activity (intensity = turnover)" : "Jour avec chargement"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-white/5 border border-white/10" />
                {isEn ? "No activity" : "Sans chargement"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-[#cf5d56]" />
                {isEn ? "Selected" : "Sélectionné"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded border-2 border-yellow-400" />
                {isEn ? "Today" : "Aujourd'hui"}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ===================== VUE EXPERT (CONSERVÉE À L'IDENTIQUE) ===================== */}
      {calendarMode === "expert" && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Navigation Expert */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black capitalize text-white tracking-tighter leading-none">
                  {expertViewMode === "month" 
                    ? monthName 
                    : expertViewMode === "year_months" 
                    ? (t?.monthSelection || "Sélection Mois") 
                    : (t?.annualView || "Vue Annuelle")}
                </h2>
                <div className="flex flex-col items-center bg-white/5 rounded-lg px-1 ml-1">
                  <button onClick={() => handleYearChange(1)} className="text-white/20 hover:text-white transition-all cursor-pointer">
                    <ChevronUp className="size-3" />
                  </button>
                  <span className="text-lg font-black text-[#00F2FF] leading-none my-0.5">{currentViewYear}</span>
                  <button onClick={() => handleYearChange(-1)} className="text-white/20 hover:text-white transition-all cursor-pointer">
                    <ChevronDown className="size-3" />
                  </button>
                </div>
              </div>

              {/* 3 Onglets Classiques Expert */}
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setExpertViewMode("month")} 
                  className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all cursor-pointer ${
                    expertViewMode === 'month' 
                      ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' 
                      : 'text-white/40 hover:bg-white/5'
                  }`}
                >
                  <CalendarIcon className="size-3" /> {t?.days || (isEn ? "Days" : "Jours")}
                </button>

                <button 
                  onClick={() => setExpertViewMode("year_months")} 
                  className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all cursor-pointer ${
                    expertViewMode === 'year_months' 
                      ? 'bg-[#00F2FF] text-black shadow-lg shadow-[#00F2FF]/20' 
                      : 'text-white/40 hover:bg-white/5'
                  }`}
                >
                  <MonthIcon className="size-3" /> {t?.month || (isEn ? "Months" : "Mois")}
                </button>

                <button 
                  onClick={() => setExpertViewMode("global_years")} 
                  className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all cursor-pointer ${
                    expertViewMode === 'global_years' 
                      ? 'bg-[#BF5AF2] text-white shadow-lg shadow-[#BF5AF2]/20' 
                      : 'text-white/40 hover:bg-white/5'
                  }`}
                >
                  <Grid2X2 className="size-3" /> {t?.year || (isEn ? "Years" : "Années")}
                </button>
              </div>
            </div>

            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
              <button onClick={() => onMonthChange(-1)} className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all cursor-pointer">
                <ChevronLeft className="size-5" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button onClick={() => onMonthChange(1)} className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all cursor-pointer">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {/* Sélecteur Chauffeur Expert */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar mb-4 bg-black/20 p-1 rounded-xl border border-white/5">
            {(chauffeurOptions || [ALL_CHAUFFEURS]).map((name) => {
              const isSelected = selectedChauffeur === name;
              return (
                <button 
                  key={name} 
                  onClick={() => onChauffeurChange && onChauffeurChange(name)}
                  className={`px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer ${
                    isSelected ? "bg-[#cf5d56] text-white shadow-md" : "text-white/30 hover:bg-white/5"
                  }`}
                >
                  {name === ALL_CHAUFFEURS ? (t?.fleet || "Flotte") : name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Grille Jours Expert */}
          {expertViewMode === "month" && (
            <>
              <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-black text-white/20 uppercase">
                {daysLabels.map((d, i) => <div key={i}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarGrid.map((item, index) => {
                  const data = item.isCurrent ? activityMap[item.day] : null;
                  const isSel = item.isCurrent && selectedDates.includes(item.dateString);
                  const isActive = data && data.tonnage > 0;

                  return (
                    <div key={index} className="relative group flex items-center justify-center h-10 w-full">
                      {item.isCurrent && (
                        <button 
                          onClick={() => onDayClick(data?.date || item.dateString)} 
                          className={`absolute inset-0 rounded-xl transition-all border cursor-pointer ${
                            isSel 
                              ? "bg-[#cf5d56] border-[#cf5d56] shadow-lg shadow-[#cf5d56]/40 text-white" 
                              : isActive 
                              ? "bg-[#61d2c0]/10 border-[#61d2c0]/30 hover:bg-[#61d2c0]/20 text-[#61d2c0]" 
                              : "bg-[#ff8f84]/5 border-transparent hover:bg-[#ff8f84]/10 text-[#ff8f84]/60"
                          }`}
                        >
                          <span className={`text-xs font-black ${isSel ? "text-white" : isActive ? "text-[#61d2c0]" : "text-[#ff8f84]/60"}`}>
                            {item.day}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Vue Mois Expert */}
          {expertViewMode === "year_months" && (
            <div className="grid grid-cols-3 gap-2 h-full">
              {monthsActivity.map(m => {
                const isSel = selectedMonths.includes(String(m.idx));
                return (
                  <button 
                    key={m.idx} 
                    onClick={() => {
                      if (onSelection) {
                        const current = selectedMonths.filter(v => v !== ALL_MONTHS);
                        const val = String(m.idx);
                        const newM = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                        onSelection('month', newM.length === 0 ? [ALL_MONTHS] : newM);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left cursor-pointer ${
                      isSel 
                        ? "bg-[#00F2FF]/20 border-[#00F2FF] shadow-lg shadow-[#00F2FF]/20" 
                        : m.trips > 0 
                        ? "bg-[#61d2c0]/5 border-[#61d2c0]/20 hover:bg-[#61d2c0]/10" 
                        : "bg-white/2 border-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-white/40">{m.name}</span>
                    <div>
                      <p className={`text-sm font-black ${isSel ? 'text-[#00F2FF]' : 'text-white/80'}`}>{m.tonnage.toFixed(0)}T</p>
                      <p className="text-[8px] font-bold text-white/20 uppercase">{m.trips} {t?.voyages || "trips"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Vue Années Expert */}
          {expertViewMode === "global_years" && (
            <div className="grid grid-cols-2 gap-3 h-full">
              {globalYearsActivity.map(y => {
                const isSel = selectedYears.includes(y.name);
                return (
                  <button 
                    key={y.name} 
                    onClick={() => {
                      if (onSelection) {
                        const current = selectedYears.filter(v => v !== ALL_YEARS);
                        const val = String(y.name);
                        const newY = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                        onSelection('year', newY.length === 0 ? [ALL_YEARS] : newY);
                      }
                    }}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between text-left cursor-pointer ${
                      isSel 
                        ? "bg-[#BF5AF2]/20 border-[#BF5AF2] shadow-lg shadow-[#BF5AF2]/20" 
                        : "bg-white/2 border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-xs font-black text-white/40">{y.name}</span>
                    <div>
                      <p className="text-lg font-black text-white">{y.tonnage.toFixed(0)}T</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase">{y.trips} {t?.totalTripsCount || "voyages total"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== BANDEAU DYNAMIQUE « VOUS REGARDEZ » (COMMUN) ===================== */}
      <div className="mt-4 rounded-2xl bg-[#00F2FF]/[0.06] border border-[#00F2FF]/20 p-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#00F2FF]/80 flex items-center gap-1">
              <Sparkles className="size-3" />
              {isEn ? "You are viewing:" : "Vous regardez :"}
            </span>
            <p className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
              {bannerStats.title}
            </p>
          </div>

          {/* Bouton Effacer le filtre pour revenir à la vue complète */}
          {(selectedDates && selectedDates.length > 0) && (
            <button
              onClick={handleClearSelection}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-black transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <X className="size-3" />
              {isEn ? "Clear" : "Effacer"}
            </button>
          )}
        </div>

        {/* 3 indicateurs synthétiques de ce qui est filtré */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-black/35 border border-white/5 p-2 text-left">
            <span className="text-[8.5px] uppercase font-black text-white/40 block leading-tight">
              {isEn ? "Tonnage" : "Chargement"}
            </span>
            <p className="text-xs font-black text-white mt-0.5 truncate">
              {bannerStats.tonnage.toFixed(1)} <span className="text-[9px] text-white/40">T</span>
            </p>
          </div>

          <div className="rounded-xl bg-black/35 border border-white/5 p-2 text-left">
            <span className="text-[8.5px] uppercase font-black text-white/40 block leading-tight">
              {isEn ? "Gross Turnover" : "Chiffre d'Affaires"}
            </span>
            <p className="text-xs font-black text-[#00F2FF] mt-0.5 truncate">
              {formatProf(bannerStats.gross)}
            </p>
          </div>

          <div className="rounded-xl bg-black/35 border border-white/5 p-2 text-left">
            <span className="text-[8.5px] uppercase font-black text-white/40 block leading-tight">
              {isEn ? "Net Profit" : "CA Net"}
            </span>
            <p className="text-xs font-black text-[#9fe3b9] mt-0.5 truncate">
              {formatProf(bannerStats.net)}
            </p>
          </div>
        </div>

        <p className="text-[9px] text-white/35 mt-1.5 italic">
          {bannerStats.note}
        </p>
      </div>

      {/* ===================== MODAL GUIDE / AIDE EN 3 ÉTAPES ===================== */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border border-white/10 bg-[#1c1c1e] p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5 text-[#00F2FF]" />
                <h3 className="font-black text-base text-white">
                  {isEn ? "How to use the calendar" : "Comment utiliser le calendrier ?"}
                </h3>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="size-7 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <ol className="space-y-3.5 text-xs text-white/80">
              <li className="flex gap-3 items-start">
                <span className="size-6 shrink-0 rounded-full bg-[#00F2FF] text-black font-black flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <strong className="text-white block font-black">
                    {isEn ? "Choose a period" : "Choisissez une période"}
                  </strong>
                  <span className="text-white/60">
                    {isEn 
                      ? "Use the quick buttons (This Month, Last Month, This Year) or dropdowns." 
                      : "Cliquez sur un bouton rapide (Ce mois, Mois dernier, Cette année) ou changez de mois."}
                  </span>
                </div>
              </li>

              <li className="flex gap-3 items-start">
                <span className="size-6 shrink-0 rounded-full bg-[#00F2FF] text-black font-black flex items-center justify-center text-xs">
                  2
                </span>
                <div>
                  <strong className="text-white block font-black">
                    {isEn ? "Click any day for details" : "Cliquez sur un jour pour le détailler"}
                  </strong>
                  <span className="text-white/60">
                    {isEn 
                      ? "Click one or multiple days to filter the entire dashboard to those specific dates." 
                      : "Les montants sont visibles directement dans les cases. Cliquez sur un jour pour filtrer tout le dashboard."}
                  </span>
                </div>
              </li>

              <li className="flex gap-3 items-start">
                <span className="size-6 shrink-0 rounded-full bg-[#00F2FF] text-black font-black flex items-center justify-center text-xs">
                  3
                </span>
                <div>
                  <strong className="text-white block font-black">
                    {isEn ? "Clear anytime" : "Effacez à tout moment"}
                  </strong>
                  <span className="text-white/60">
                    {isEn 
                      ? "Click [Clear] on the bottom banner to restore the full view." 
                      : "Cliquez sur le bouton « Effacer » dans le bandeau du bas pour revenir à la vue complète."}
                  </span>
                </div>
              </li>
            </ol>

            <button
              onClick={() => setIsGuideOpen(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#cf5d56] hover:bg-[#cf5d56]/90 font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-[#cf5d56]/30 transition-all cursor-pointer"
            >
              {isEn ? "Got it" : "J'ai compris"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
