import { Wrench, ExternalLink, Image as ImageIcon, X, FileText, Calendar, Truck, Banknote, MapPin, FolderOpen } from "lucide-react";
import { useState } from "react";

type MiniRepair = {
  id: string;
  date: string;
  vehicle: string;
  description: string;
  cost: number;
  imageUrl?: string;
  isPdf?: boolean;
  workPhotos?: string[];
  folderUrl?: string;
};

type MaintenanceLogProps = {
  records?: MiniRepair[];
};

export function MaintenanceLog({ records = [] }: MaintenanceLogProps) {
  const [selectedRepair, setSelectedRepair] = useState<MiniRepair | null>(null);
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] p-5 text-white shadow-xl h-full flex flex-col relative">
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
            <div 
              key={repair.id} 
              onClick={() => setSelectedRepair(repair)}
              className="group relative flex gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/[0.08] cursor-pointer"
            >
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                {repair.imageUrl ? (
                  repair.isPdf ? (
                    <FileText className="size-5 text-white/40" />
                  ) : (
                    <img src={repair.imageUrl} alt="Repair" className="h-full w-full object-cover transition group-hover:scale-110" />
                  )
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

      {/* MODAL APERÇU INTERACTIF */}
      {selectedRepair && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <section 
            className="w-full max-w-2xl rounded-[40px] border border-white/10 bg-[#141414] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
                  <Wrench className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Détails de l'intervention</h3>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold">{selectedRepair.vehicle}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRepair(null)}
                className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Colonne Gauche : Infos */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/60">
                    <Calendar className="size-4 text-orange-500" />
                    <span className="text-sm font-semibold">{new Date(selectedRepair.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/60">
                    <Banknote className="size-4 text-emerald-500" />
                    <span className="text-lg font-black text-white">{selectedRepair.cost.toLocaleString()} CFA</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Description des travaux</p>
                  <p className="text-sm text-white/80 leading-relaxed font-medium">{selectedRepair.description}</p>
                </div>

                {selectedRepair.folderUrl && (
                  <a 
                    href={selectedRepair.folderUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                  >
                    <FolderOpen className="size-4" /> Voir le dossier Drive complet
                  </a>
                )}
              </div>

              {/* Colonne Droite : Médias */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-white/20 tracking-widest ml-1">Facture & Preuves</p>
                
                {/* Image Principale */}
                <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden border border-white/10 bg-black group relative">
                  {selectedRepair.isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/20">
                      <FileText className="size-12" />
                      <span className="text-[10px] font-bold">DOCUMENT PDF</span>
                      <a 
                        href={selectedRepair.imageUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-2 px-4 py-2 rounded-lg bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 transition-all flex items-center gap-2"
                      >
                        <ExternalLink className="size-3" /> Ouvrir le PDF
                      </a>
                    </div>
                  ) : selectedRepair.imageUrl ? (
                    <img src={selectedRepair.imageUrl} className="w-full h-full object-cover" alt="Facture" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/5 italic text-xs">Aucune image</div>
                  )}
                  
                  {selectedRepair.imageUrl && !selectedRepair.isPdf && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={selectedRepair.imageUrl} target="_blank" rel="noreferrer" className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md">
                        <ExternalLink className="size-5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Photos secondaires */}
                {selectedRepair.workPhotos && selectedRepair.workPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {selectedRepair.workPhotos.map((photo, i) => (
                      <div key={i} className="size-16 shrink-0 rounded-xl overflow-hidden border border-white/5 bg-black">
                        <img src={photo} className="w-full h-full object-cover" alt={`Travaux ${i+1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
