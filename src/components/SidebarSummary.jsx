import {
  ArrowUpRight,
  BarChart3,
  FileCheck2,
  GanttChartSquare,
  Gauge,
  ReceiptText,
  Rows4,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";

const sectionLabels = {
  admin: "Accueil admin",
  dashboard: "Dashboard",
  analytics: "Analytics",
  drivers: "Chauffeurs",
  trips: "Trajets",
  chauffeur: "Chauffeur",
  depenses: "Depenses",
  encaissements: "Encaissements",
  documents: "Documents recus",
  closing: "Cloture jour",
  reports: "Rapports",
  audit: "Audit",
  settings: "Reglages",
};

const menuItems = [
  { id: "admin", label: "Accueil admin", icon: Truck },
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "drivers", label: "Chauffeurs", icon: Users },
  { id: "trips", label: "Trajets", icon: Rows4 },
  { id: "chauffeur", label: "Chauffeur", icon: UserRound },
  { id: "depenses", label: "Depenses", icon: ReceiptText },
  { id: "encaissements", label: "Encaissements", icon: ArrowUpRight },
  { id: "documents", label: "Documents recus", icon: FileCheck2 },
  { id: "closing", label: "Cloture jour", icon: GanttChartSquare },
  { id: "reports", label: "Rapports", icon: ScrollText },
  { id: "audit", label: "Audit", icon: UserCog },
  { id: "settings", label: "Reglages", icon: Settings },
];

function MenuButton({ item, activeSection, onSectionChange }) {
  const Icon = item.icon;
  const isActive = item.id === activeSection;

  return (
    <button
      type="button"
      onClick={() => onSectionChange(item.id)}
      aria-pressed={isActive}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
        isActive
          ? "border-[#cf5d56]/40 bg-[#cf5d56]/16 text-white shadow-[0_16px_30px_-24px_rgba(207,93,86,0.85)]"
          : "border-white/8 bg-white/[0.02] text-white/70 hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <span className={`inline-flex rounded-xl p-2 ${isActive ? "bg-[#cf5d56]/28 text-[#ffb1a9]" : "bg-white/[0.05] text-white/58"}`}>
        <Icon className="size-4" />
      </span>
      {item.label}
    </button>
  );
}

export function SidebarSummary({
  metrics,
  selectedRange,
  destination,
  chauffeurLabel,
  fileStats,
  activeSection,
  onSectionChange,
  uiConfig,
}) {
  const isItemEnabled = (id) => {
    return uiConfig?.menu?.find((m) => m.id === id)?.enabled ?? true;
  };

  const enabledMenuItems = menuItems.filter((item) => isItemEnabled(item.id));

  const compactStats = [
    { label: "Revenue", value: metrics.totalRevenue, tone: "text-[#61d2c0]" },
    { label: "Costs", value: metrics.totalCosts, tone: "text-[#ff8f84]" },
    { label: "Profit", value: metrics.totalProfit, tone: "text-[#9fe3b9]" },
  ];

  return (
    <>
      <aside className="panel-enter mb-5 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#141414_0%,#0d0d0d_100%)] p-4 text-white shadow-[0_24px_64px_-44px_rgba(0,0,0,0.9)] xl:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#cf5d56]">Trucklink</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{sectionLabels[activeSection] || "Dashboard"}</h2>
            <p className="mt-1 text-xs text-white/48">{selectedRange}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/56">2025</div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {enabledMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition ${
                  isActive
                    ? "border-[#cf5d56]/45 bg-[#cf5d56]/18 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/62 hover:border-white/20 hover:text-white"
                }`}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>

      <aside className="panel-enter hidden rounded-[30px] border border-white/6 bg-[linear-gradient(180deg,#121111_0%,#090909_100%)] p-4 text-white shadow-[0_45px_110px_-58px_rgba(0,0,0,1)] xl:fixed xl:left-6 xl:top-6 xl:flex xl:h-[calc(100svh-3rem)] xl:w-[300px] xl:flex-col">
        <div className="rounded-2xl border border-white/8 bg-[#171616] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.24em] text-[#cf5d56]">Trucklink</p>
            <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-white/54">2025</span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{sectionLabels[activeSection] || "Dashboard"}</h2>
          <div className="mt-3 space-y-1 text-xs text-white/52">
            <p>{chauffeurLabel}</p>
            <p>{destination}</p>
            <p>{selectedRange}</p>
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {enabledMenuItems.map((item) => (
            <MenuButton key={item.id} item={item} activeSection={activeSection} onSectionChange={onSectionChange} />
          ))}
        </nav>

        <div className="mt-3 grid gap-2">
          {compactStats.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-xs text-white/42">{item.label}</p>
              <p className={`mt-1 text-base font-semibold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-white/8 bg-black/18 px-3 py-2 text-xs text-white/52">
          {fileStats.map((stat) => (
            <p key={stat.sourceFile} className="truncate">
              {stat.sdv}: {stat.validRows} valides
            </p>
          ))}
        </div>
      </aside>
    </>
  );
}
