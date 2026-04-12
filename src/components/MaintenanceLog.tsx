import { Wrench, ExternalLink, Image as ImageIcon } from "lucide-react";

type Repair = {
  id: string;
  date: string;
  vehicle: string;
  description: string;
  cost: number;
  imageUrl?: string;
};

const MOCK_REPAIRS: Repair[] = [
  { id: "1", date: "2026-04-05", vehicle: "AMARA TRUCK 76", description: "Changement de 4 pneus Michelin", cost: 450000, imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=200" },
  { id: "2", date: "2026-03-28", vehicle: "BRAHIMA TRUCK 45", description: "Révision complète + Vidange", cost: 125000, imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200" },
  { id: "3", date: "2026-03-15", vehicle: "SORO TRUCK 52", description: "Réparation circuit freinage", cost: 85000 },
];

export function MaintenanceLog() {
  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] p-5 text-white shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <Wrench className="size-4" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Maintenance & Réparations</h3>
        </div>
        <button className="text-[10px] uppercase font-bold text-white/30 hover:text-white transition-colors flex items-center gap-1">
          Voir tout <ExternalLink className="size-3" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {MOCK_REPAIRS.map((repair) => (
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
        ))}
      </div>
    </section>
  );
}
