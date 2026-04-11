import {
  Activity,
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  FolderKanban,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";

function QuickAction({ icon: Icon, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-left text-white shadow-[0_24px_80px_-52px_rgba(0,0,0,0.95)] transition hover:-translate-y-1 hover:border-[#cf5d56]/24 hover:shadow-[0_28px_90px_-50px_rgba(207,93,86,0.2)]"
    >
      <div className="inline-flex rounded-2xl bg-[#cf5d56]/12 p-3 text-[#ff8f84]">
        <Icon className="size-5" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{label}</h3>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>
        <ArrowRight className="mt-1 size-4 text-white/36" />
      </div>
    </button>
  );
}

export function AdminHome({
  metrics,
  loadedRows,
  selectedRange,
  destination,
  chauffeurLabel,
  fileStats,
  onOpenDashboard,
  onOpenAnalytics,
  onOpenChauffeur,
}) {
  const validFiles = fileStats.filter((stat) => stat.invalidDateRows === 0).length;

  return (
    <section className="space-y-6">
      <section className="panel-enter overflow-hidden rounded-[34px] border border-white/7 bg-[radial-gradient(circle_at_top_left,rgba(207,93,86,0.18),transparent_28%),linear-gradient(180deg,#181818_0%,#101010_100%)] p-6 text-white shadow-[0_30px_90px_-56px_rgba(0,0,0,0.96)] xl:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#cf5d56]">
              <ShieldCheck className="size-3.5" />
              Admin Home
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">Accueil admin</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Poste central pour piloter les fichiers SDV, suivre la performance reseau et ouvrir rapidement les vues
              chauffeur ou analytics.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/18 px-5 py-4">
            <p className="text-sm text-white/42">Periode active</p>
            <p className="mt-2 text-lg font-semibold">{selectedRange}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[26px] border border-white/8 bg-black/18 p-4">
            <div className="flex items-center gap-2 text-sm text-white/44">
              <CircleDollarSign className="size-4 text-[#9fe3b9]" />
              Profit global
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#9fe3b9]">{metrics.totalProfit}</p>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-black/18 p-4">
            <div className="flex items-center gap-2 text-sm text-white/44">
              <Truck className="size-4 text-[#61d2c0]" />
              Expeditions
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{metrics.totalShipments}</p>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-black/18 p-4">
            <div className="flex items-center gap-2 text-sm text-white/44">
              <FolderKanban className="size-4 text-[#ff8f84]" />
              Lignes chargees
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{loadedRows}</p>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-black/18 p-4">
            <div className="flex items-center gap-2 text-sm text-white/44">
              <Activity className="size-4 text-[#cf5d56]" />
              Fichiers stables
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{validFiles}/{fileStats.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <QuickAction
          icon={Truck}
          label="Vue dashboard"
          description="Acceder au panorama global des depenses et des KPI."
          onClick={onOpenDashboard}
        />
        <QuickAction
          icon={BarChart3}
          label="Vue analytics"
          description="Ouvrir les graphiques et la comparaison mensuelle."
          onClick={onOpenAnalytics}
        />
        <QuickAction
          icon={UserRound}
          label="Vue chauffeur"
          description="Basculer sur les details operationnels par chauffeur."
          onClick={onOpenChauffeur}
        />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.15fr,0.85fr]">
        <article className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-6 text-white shadow-[0_28px_80px_-52px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Etat du reseau SDV</h3>
              <p className="mt-1 text-sm text-white/46">Suivi direct des fichiers importes et de la qualite de chargement.</p>
            </div>
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/46">
              Temps reel
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {fileStats.map((stat) => (
              <div key={stat.sourceFile} className="rounded-[24px] border border-white/8 bg-black/18 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{stat.sdv}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/36">{stat.sourceFile}</p>
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-white/58">
                    {stat.validRows} valides
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/54">
                  <span>Chauffeur: {stat.chauffeur}</span>
                  <span>{stat.invalidDateRows} dates ignorees</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-6 text-white shadow-[0_28px_80px_-52px_rgba(0,0,0,0.95)]">
          <h3 className="text-xl font-semibold tracking-tight">Contexte actif</h3>
          <p className="mt-1 text-sm text-white/46">Repere rapide pour savoir ce que l'admin supervise en ce moment.</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
              <p className="text-sm text-white/42">Chauffeur cible</p>
              <p className="mt-2 text-xl font-semibold">{chauffeurLabel}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
              <p className="text-sm text-white/42">Destination active</p>
              <p className="mt-2 text-xl font-semibold">{destination}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
              <p className="text-sm text-white/42">Moyenne tonnage</p>
              <p className="mt-2 text-xl font-semibold">{metrics.averageTonnage}</p>
            </div>
            <div className="rounded-[24px] border border-[#cf5d56]/16 bg-[#cf5d56]/8 p-4">
              <p className="text-sm text-white/56">Revenue surveille</p>
              <p className="mt-2 text-2xl font-semibold text-[#61d2c0]">{metrics.totalRevenue}</p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
