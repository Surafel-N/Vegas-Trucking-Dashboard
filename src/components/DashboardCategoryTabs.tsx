import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface DashboardCategory {
  id: string;
  icon: React.ReactNode;
  label: string;
  /** Chiffre clé affiché dans l'onglet, même lorsqu'il est replié */
  kpi: string;
  /** Ligne secondaire courte (ex: répartition, nombre d'interventions) */
  subKpi?: string;
  /** Couleur d'accent Tailwind (ex: "amber", "rose", "sky") */
  accent: "amber" | "rose" | "sky" | "emerald" | "violet";
  /** Badge d'alerte optionnel (ex: nombre d'anomalies) */
  badge?: number;
  content: React.ReactNode;
}

interface DashboardCategoryTabsProps {
  categories: DashboardCategory[];
  storageKey?: string;
  language?: "FR" | "EN";
}

const ACCENTS: Record<DashboardCategory["accent"], { active: string; text: string; ring: string }> = {
  amber: { active: "bg-amber-500/15 border-amber-400/50", text: "text-amber-300", ring: "shadow-amber-500/10" },
  rose: { active: "bg-rose-500/15 border-rose-400/50", text: "text-rose-300", ring: "shadow-rose-500/10" },
  sky: { active: "bg-sky-500/15 border-sky-400/50", text: "text-sky-300", ring: "shadow-sky-500/10" },
  emerald: { active: "bg-emerald-500/15 border-emerald-400/50", text: "text-emerald-300", ring: "shadow-emerald-500/10" },
  violet: { active: "bg-violet-500/15 border-violet-400/50", text: "text-violet-300", ring: "shadow-violet-500/10" },
};

const XL_COLS: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
};

/**
 * Hybride Onglets + Accordéon :
 * - Chaque onglet affiche son chiffre clé en permanence (lecture d'un coup d'œil).
 * - Un clic ouvre la catégorie ; un second clic sur l'onglet actif la replie.
 * - Une seule catégorie ouverte à la fois → tableau de bord épuré.
 * - Le dernier état (onglet ouvert / tout replié) est mémorisé dans le localStorage.
 */
export function DashboardCategoryTabs({
  categories,
  storageKey = "vtc_dashboard_category",
  language = "FR",
}: DashboardCategoryTabsProps) {
  const isEn = language === "EN";

  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && categories.some((c) => c.id === saved)) return saved;
    } catch {
      /* localStorage indisponible */
    }
    return null; // Tout replié par défaut
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, activeId ?? "");
    } catch {
      /* localStorage indisponible */
    }
  }, [activeId, storageKey]);

  const active = categories.find((c) => c.id === activeId) || null;

  return (
    <section className="panel-enter rounded-[32px] border border-white/10 bg-[#1c1c1e] p-3 sm:p-4 shadow-2xl">
      {/* BARRE D'ONGLETS AVEC MINI-KPI */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${XL_COLS[Math.min(categories.length, 4)] || "xl:grid-cols-4"} gap-3`}>
        {categories.map((cat) => {
          const isActive = cat.id === activeId;
          const accent = ACCENTS[cat.accent];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveId(isActive ? null : cat.id)}
              aria-expanded={isActive}
              className={`group relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 cursor-pointer ${
                isActive
                  ? `${accent.active} shadow-lg ${accent.ring}`
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
              }`}
            >
              <div
                className={`size-10 shrink-0 rounded-xl flex items-center justify-center bg-black/40 border border-white/10 ${accent.text}`}
              >
                {cat.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 truncate">
                  {cat.label}
                </p>
                <p className={`text-base font-black font-mono tabular-nums leading-tight truncate ${accent.text}`}>
                  {cat.kpi}
                </p>
                {cat.subKpi && (
                  <p className="text-[10px] font-bold text-white/40 truncate">{cat.subKpi}</p>
                )}
              </div>

              {typeof cat.badge === "number" && cat.badge > 0 && (
                <span className="absolute top-2 right-9 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30">
                  {cat.badge}
                </span>
              )}

              <ChevronDown
                className={`size-4 shrink-0 transition-transform duration-300 ${
                  isActive ? `rotate-180 ${accent.text}` : "text-white/30 group-hover:text-white/60"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* CONTENU DE LA CATÉGORIE OUVERTE */}
      {active ? (
        <div key={active.id} className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {active.content}
        </div>
      ) : (
        <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/25">
          {isEn ? "Click a category to open it" : "Cliquez sur une catégorie pour l'ouvrir"}
        </p>
      )}
    </section>
  );
}
