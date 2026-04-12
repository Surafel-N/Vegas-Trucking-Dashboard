import { Wrench, ExternalLink, Image as ImageIcon } from "lucide-react";

type MiniRepair = {
  id: string;
  date: string;
  vehicle: string;
  description: string;
  cost: number;
  imageUrl?: string;
};

type MaintenanceLogProps = {
  records?: MiniRepair[];
};

export function MaintenanceLog({ records = [] }: MaintenanceLogProps) {
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] p-5 text-white shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <Wrench className="size-4" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Maintenance & Réparations</h3>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {sortedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/10 italic">
            <Wrench className="size-8 mb-2" />
            <p className="text-xs">Aucune maintenance enregistrée</p>
          </div>
        ) : (
          sortedRecords.map((repair) => (
            <div key={repair.id} className="group relative flex gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                {repair.imageUrl ? (
                  <img src={repair.imageUrl} alt="Repair" className="h-full w-full object-cover transition group-hover:scale-110" />
                ) : (
                  <ImageIcon className="size-5 text-white/20" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold text-orange-500/80 uppercase">{repair.vehicle}</p>
                  <p className="text-[10px] text-white/30">{new Date(repair.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <h4 className="text-xs font-semibold text-white truncate mt-0.5">{repair.description}</h4>
                <p className="text-xs font-bold text-white/60 mt-1">{repair.cost.toLocaleString()} CFA</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
