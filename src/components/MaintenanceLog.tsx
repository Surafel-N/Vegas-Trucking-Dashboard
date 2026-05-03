import { Wrench, ExternalLink, Image as ImageIcon, X, FileText, Calendar, Banknote, FolderOpen, Sparkles, Loader2, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";

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
  driveLink?: string;
  amount?: number;
  driverLabel?: string;
  source?: string;
};

type MaintenanceLogProps = {
  records?: MiniRepair[];
  expenseRecords?: any[];
  googleClientId?: string;
};

export function MaintenanceLog({ records = [], expenseRecords = [], googleClientId }: MaintenanceLogProps) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'expenses'>('maintenance');
  const [folderImages, setFolderImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const sortedMaint = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const sortedExpenses = [...expenseRecords].sort((a, b) => b.date.localeCompare(a.date));

  const displayList = activeTab === 'maintenance' ? sortedMaint : sortedExpenses;

  // Détection si c'est un dossier ou un fichier
  const isFolder = (link?: string) => link?.includes('/folders/');
  
  const getDriveId = (link?: string) => {
    if (!link) return null;
    const match = link.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const getDrivePreviewUrl = (link?: string) => {
    const id = getDriveId(link);
    if (!id || isFolder(link)) return null;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  };

  // Chargement des images du dossier via l'API Drive
  useEffect(() => {
    if (selectedRecord && isFolder(selectedRecord.driveLink) && googleClientId) {
      loadFolderContent(getDriveId(selectedRecord.driveLink));
    } else {
      setFolderImages([]);
    }
  }, [selectedRecord]);

  const loadFolderContent = async (folderId: string | null) => {
    if (!folderId || !googleClientId) return;
    setIsLoadingImages(true);
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: async (tokenRes: any) => {
          if (tokenRes.error) { setIsLoadingImages(false); return; }
          
          // On demande explicitement le thumbnailLink dans les champs
          const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,thumbnailLink)`;
          const res = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${tokenRes.access_token}` } });
          const data = await res.json();
          
          const images = (data.files || [])
            .filter((f: any) => f.mimeType.startsWith('image/') && f.thumbnailLink)
            .map((f: any) => {
              // On booste la résolution de la miniature fournie par Google (par défaut =s220)
              return f.thumbnailLink.replace(/=s\d+/, '=s1000');
            });
            
          setFolderImages(images);
          setIsLoadingImages(false);
        }
      });
      client.requestAccessToken();
    } catch (e) {
      setIsLoadingImages(false);
    }
  };

  return (
    <section className="panel-enter rounded-[40px] border border-white/5 bg-[#111] p-6 text-white shadow-2xl h-[500px] flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            <Wrench className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter">Atelier & Finances</h3>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-none mt-0.5">Historique Flux</p>
          </div>
        </div>

        <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
          {['maintenance', 'expenses'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/20 hover:text-white/40'}`}
            >
              {tab === 'maintenance' ? 'Maint.' : 'Dépenses'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/10 italic">
            <Wrench className="size-10 mb-2 opacity-50" />
            <p className="text-xs font-bold uppercase tracking-widest">Aucun relevé</p>
          </div>
        ) : (
          displayList.map((item) => {
            const preview = getDrivePreviewUrl(item.driveLink || item.imageUrl);
            const folder = isFolder(item.driveLink);
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedRecord(item)}
                className="group relative flex gap-4 rounded-3xl border border-white/5 bg-white/2 p-3.5 transition-all duration-300 hover:bg-white/5 hover:border-[#cf5d56]/30 cursor-pointer"
              >
                <div className="size-14 shrink-0 overflow-hidden rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 relative">
                  {folder ? (
                    <div className="flex flex-col items-center gap-1">
                      <LayoutGrid className="size-5 text-blue-400" />
                      <span className="text-[7px] font-black uppercase text-blue-400/50">Dossier</span>
                    </div>
                  ) : preview ? (
                    <img src={preview} alt="Preview" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                  ) : (
                    <ImageIcon className="size-6 text-white/10" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest truncate">{item.vehicle || item.driverLabel}</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase">{new Date(item.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <h4 className="text-xs font-black text-white truncate">{item.description}</h4>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs font-black text-[#9fe3b9]">{(item.cost || item.amount || 0).toLocaleString()} CFA</p>
                    {item.source === "Google Sheets" && <Sparkles className="size-3 text-amber-500/50" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <section 
            className="w-full max-w-4xl rounded-[40px] border border-white/10 bg-[#141414] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${activeTab === 'maintenance' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-400'}`}>
                  {activeTab === 'maintenance' ? <Wrench className="size-6" /> : <Banknote className="size-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{activeTab === 'maintenance' ? 'Intervention' : 'Dépense'}</h3>
                  <p className="text-white/40 text-xs uppercase tracking-widest font-bold">{selectedRecord.vehicle || selectedRecord.driverLabel}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
                <X className="size-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-4 bg-white/5 p-6 rounded-[32px] border border-white/5">
                  <div className="flex items-center gap-3 text-white/60">
                    <Calendar className="size-4 text-[#cf5d56]" />
                    <span className="text-sm font-bold">{new Date(selectedRecord.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Banknote className="size-5 text-[#9fe3b9]" />
                    <span className="text-2xl font-black text-white">{(selectedRecord.cost || selectedRecord.amount || 0).toLocaleString()} CFA</span>
                  </div>
                </div>

                <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-3">
                  <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Détails enregistrés</p>
                  <p className="text-base text-white/80 leading-relaxed font-medium italic">"{selectedRecord.description}"</p>
                </div>

                {selectedRecord.driveLink && (
                  <a href={selectedRecord.driveLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-blue-500/10 text-blue-400 text-sm font-black border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                    <FolderOpen className="size-5" /> Ouvrir sur Google Drive
                  </a>
                )}
              </div>

              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">Galerie Photos (Mosaïque)</p>
                  {isLoadingImages && <Loader2 className="size-4 animate-spin text-[#cf5d56]" />}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {isFolder(selectedRecord.driveLink) ? (
                    folderImages.length > 0 ? (
                      folderImages.map((img, i) => (
                        <div key={i} className="aspect-square rounded-[24px] overflow-hidden border border-white/10 bg-black group relative shadow-xl cursor-zoom-in" onClick={() => setZoomedImage(img.replace('sz=w1000', 'sz=w2000'))}>
                          <img src={img} className="size-full object-cover transition duration-500 group-hover:scale-110" alt="Preuve" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <LayoutGrid className="size-6 text-white" />
                          </div>
                        </div>
                      ))
                    ) : !isLoadingImages && (
                      <div className="col-span-2 py-12 flex flex-col items-center gap-3 bg-white/2 rounded-[32px] border border-dashed border-white/10">
                        <ImageIcon className="size-8 text-white/10" />
                        <p className="text-xs font-bold text-white/20">Aucune photo trouvée dans ce dossier</p>
                      </div>
                    )
                  ) : (
                    <div className="col-span-2 aspect-video rounded-[32px] overflow-hidden border border-white/10 bg-black relative group cursor-zoom-in" onClick={() => {
                        const url = getDrivePreviewUrl(selectedRecord.driveLink || selectedRecord.imageUrl);
                        if (url) setZoomedImage(url.replace('sz=w800', 'sz=w2000'));
                    }}>
                       {getDrivePreviewUrl(selectedRecord.driveLink || selectedRecord.imageUrl) ? (
                         <img src={getDrivePreviewUrl(selectedRecord.driveLink || selectedRecord.imageUrl)!} className="size-full object-cover transition duration-500 group-hover:scale-105" alt="Preuve unique" />
                       ) : (
                         <div className="size-full flex items-center justify-center text-white/5 italic">Aperçu indisponible</div>
                       )}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <LayoutGrid className="size-8 text-white" />
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Lightbox / Zoom Plein Écran */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[410]">
            <X className="size-8" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
