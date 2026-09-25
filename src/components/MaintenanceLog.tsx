import { 
  Wrench, ExternalLink, Image as ImageIcon, X, FileText, 
  Calendar, Banknote, FolderOpen, Sparkles, Loader2, 
  LayoutGrid, Search, Filter, Truck, Layers, Droplet, 
  CheckCircle2, ArrowUpRight, ChevronRight, Eye 
} from "lucide-react";
import { useState, useMemo } from "react";

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
  repairType?: string;
};

type MaintenanceLogProps = {
  records?: MiniRepair[];
  expenseRecords?: any[];
  googleClientId?: string;
  t?: any;
};

// Extraction de l'ID Google Drive
function getDriveId(link?: string): string | null {
  if (!link) return null;
  const matchD = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchD && matchD[1]) return matchD[1];
  const matchId = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchId && matchId[1]) return matchId[1];
  const matchFolder = link.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
  if (matchFolder && matchFolder[1]) return matchFolder[1];
  const fallback = link.match(/[-\w]{25,}/);
  return fallback ? fallback[0] : null;
}

// URL iframe preview Google Drive sécurisée
function getDriveEmbedUrl(link?: string): string | null {
  if (!link || link.includes("/folders/")) return null;
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function MaintenanceLog({ records = [], expenseRecords = [], t }: MaintenanceLogProps) {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'maintenance' | 'expenses'>('maintenance');
  const [selectedTruck, setSelectedTruck] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyDrive, setOnlyDrive] = useState<boolean>(false);

  const trucksConfig = [
    { label: "AMARA 76", key: "AMARA", color: "#3B82F6", border: "rgba(59, 130, 246, 0.3)" },
    { label: "BRAHIMA 45", key: "BRAHIMA", color: "#10B981", border: "rgba(16, 185, 129, 0.3)" },
    { label: "SORO 52", key: "SORO", color: "#CF5D56", border: "rgba(207, 93, 86, 0.3)" }
  ];

  const rawList = activeTab === 'maintenance' ? records : expenseRecords;

  // Filtrage combiné : Camion + Catégorie + Recherche + Justificatif
  const filteredList = useMemo(() => {
    return rawList.filter(item => {
      const vehicle = String(item.vehicle || item.driverLabel || "").toUpperCase();
      const desc = String(item.description || item.category || "").toLowerCase();
      const drive = item.driveLink || item.imageUrl;

      // Filtre Camion
      if (selectedTruck !== 'ALL') {
        if (!vehicle.includes(selectedTruck)) return false;
      }

      // Filtre Catégorie rapide
      if (selectedCategory === 'vidange') {
        if (!/oil|vidange|filtre|filter/i.test(desc)) return false;
      } else if (selectedCategory === 'pneu') {
        if (!/tire|pneu|roue/i.test(desc)) return false;
      } else if (selectedCategory === 'mecanique') {
        if (!/brake|frein|pump|pompe|cable|repair|reparation|mecanic|drum/i.test(desc)) return false;
      }

      // Filtre Drive uniquement
      if (onlyDrive && !drive) return false;

      // Recherche libre
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = desc.includes(q);
        const matchVeh = vehicle.toLowerCase().includes(q);
        const matchCost = String(item.cost || item.amount || "").includes(q);
        const matchDate = String(item.date || "").includes(q);
        if (!matchDesc && !matchVeh && !matchCost && !matchDate) return false;
      }

      return true;
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [rawList, selectedTruck, selectedCategory, searchQuery, onlyDrive]);

  // Statistiques financières de la sélection active
  const stats = useMemo(() => {
    let totalCost = 0;
    let driveCount = 0;

    filteredList.forEach(item => {
      totalCost += Number(item.cost || item.amount || 0);
      if (item.driveLink || item.imageUrl) driveCount += 1;
    });

    const avgCost = filteredList.length > 0 ? Math.round(totalCost / filteredList.length) : 0;
    return { totalCost, count: filteredList.length, avgCost, driveCount };
  }, [filteredList]);

  const locale = t?.months?.[0] === "January" ? "en-US" : "fr-FR";
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Détection du camion pour attribution couleur
  const getTruckBadge = (text?: string) => {
    const upper = String(text || "").toUpperCase();
    if (upper.includes("AMARA") || upper.includes("76")) {
      return { label: "AMARA TRUCK 76", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)" };
    }
    if (upper.includes("BRAHIMA") || upper.includes("45")) {
      return { label: "BRAHIMA TRUCK 45", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)" };
    }
    if (upper.includes("SORO") || upper.includes("52")) {
      return { label: "SORO TRUCK 52", color: "#CF5D56", bg: "rgba(207, 93, 86, 0.12)", border: "rgba(207, 93, 86, 0.25)" };
    }
    return { label: "Flotte Générale", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)" };
  };

  // Détection du tag d'intervention
  const getRepairBadge = (desc?: string) => {
    const d = String(desc || "").toLowerCase();
    if (/vidange|oil change/i.test(d)) return { label: "Vidange Moteur", icon: Droplet, color: "#00F2FF" };
    if (/tire|pneu/i.test(d)) return { label: "Pneus & Train", icon: Layers, color: "#EC4899" };
    if (/brake|frein|drum/i.test(d)) return { label: "Système Freinage", icon: Wrench, color: "#F59E0B" };
    if (/pump|pompe|cable|hose|tuyau/i.test(d)) return { label: "Pièce & Hydraulique", icon: Wrench, color: "#A855F7" };
    return { label: "Intervention Atelier", icon: Wrench, color: "#3B82F6" };
  };

  return (
    <section className="panel-enter rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#111111_100%)] p-6 text-white shadow-2xl h-full flex flex-col relative overflow-hidden">
      {/* GLOW DE FOND */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* EN-TÊTE DU MODULE AVEC TOTAL FINANCIER DÉPENSÉ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10">
            <Wrench className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-tight">{t?.workshopFinances || "Atelier & Finances Flotte"}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-400 border border-orange-500/30">
                {stats.count} Interventions
              </span>
            </div>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">
              Historique des réparations, pièces mécaniques et dépenses d'exploitation
            </p>
          </div>
        </div>

        {/* Total financier de la sélection active */}
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/8 px-4 py-2 rounded-2xl">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-white/40 block">Total Dépenses Atelier</span>
            <span className="text-lg font-black text-[#9fe3b9] font-mono leading-none">{stats.totalCost.toLocaleString("fr-FR")} CFA</span>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR DE MODE & FILTRE PAR CAMION */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Mode : Maintenance vs Dépenses */}
          <div className="flex bg-white/5 border border-white/8 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'maintenance' 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Wrench className="size-3" />
              <span>Interventions Atelier</span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'expenses' 
                  ? 'bg-gradient-to-r from-[#CF5D56] to-[#b34842] text-white shadow-md shadow-[#CF5D56]/20' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Banknote className="size-3" />
              <span>Toutes Dépenses</span>
            </button>
          </div>

          {/* Filtre par Camion */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-1 rounded-xl">
            <button
              onClick={() => setSelectedTruck('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                selectedTruck === 'ALL' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              Tous Camions
            </button>
            {trucksConfig.map(t => (
              <button
                key={t.key}
                onClick={() => setSelectedTruck(selectedTruck === t.key ? 'ALL' : t.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                  selectedTruck === t.key 
                    ? 'text-white shadow-sm' 
                    : 'text-white/40 hover:text-white'
                }`}
                style={selectedTruck === t.key ? { backgroundColor: t.color } : {}}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }}></span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* BARRE DE RECHERCHE ET CHIPS CATÉGORIE */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6 relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher par mot-clé (pneu, vidange, frein, Shell...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-xs font-medium focus:outline-none focus:border-orange-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="sm:col-span-6 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'vidange' ? 'ALL' : 'vidange')}
              className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'vidange' ? 'bg-[#00F2FF] text-black font-black' : 'bg-white/5 text-[#00F2FF]'
              }`}
            >
              <Droplet className="size-3" /> Vidanges
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'pneu' ? 'ALL' : 'pneu')}
              className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'pneu' ? 'bg-[#EC4899] text-white font-black' : 'bg-white/5 text-[#EC4899]'
              }`}
            >
              <Layers className="size-3" /> Pneus
            </button>
            <button
              onClick={() => setSelectedCategory(selectedCategory === 'mecanique' ? 'ALL' : 'mecanique')}
              className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === 'mecanique' ? 'bg-orange-500 text-white font-black' : 'bg-white/5 text-orange-400'
              }`}
            >
              <Wrench className="size-3" /> Mécanique
            </button>
            <button
              onClick={() => setOnlyDrive(!onlyDrive)}
              className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1 ${
                onlyDrive ? 'bg-[#3B82F6] text-white font-black' : 'bg-white/5 text-[#3B82F6]'
              }`}
            >
              <FolderOpen className="size-3" /> Justificatifs ({stats.driveCount})
            </button>
          </div>
        </div>
      </div>

      {/* FEED OPÉRATIONNEL DES INTERVENTIONS */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar min-h-[220px]">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-white/30">
            <Wrench className="size-10 mb-2 opacity-30" />
            <p className="text-xs font-black uppercase tracking-wider">Aucune opération trouvée</p>
            <p className="text-[11px] text-white/20 mt-0.5">Essayez de réinitialiser vos filtres ou votre recherche</p>
          </div>
        ) : (
          filteredList.map((item) => {
            const truckBadge = getTruckBadge(item.vehicle || item.driverLabel);
            const repairBadge = getRepairBadge(item.description || item.repairType);
            const RepairIcon = repairBadge.icon;
            const cost = Number(item.cost || item.amount || 0);

            return (
              <div 
                key={item.id}
                onClick={() => setSelectedRecord(item)}
                className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icône de type */}
                  <div 
                    className="size-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ 
                      backgroundColor: `${repairBadge.color}15`, 
                      borderColor: `${repairBadge.color}30`, 
                      color: repairBadge.color 
                    }}
                  >
                    <RepairIcon className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Badge Camion */}
                      <span 
                        className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border"
                        style={{ 
                          color: truckBadge.color, 
                          backgroundColor: truckBadge.bg, 
                          borderColor: truckBadge.border 
                        }}
                      >
                        {truckBadge.label}
                      </span>

                      {/* Badge Type */}
                      <span 
                        className="text-[10px] font-bold"
                        style={{ color: repairBadge.color }}
                      >
                        {repairBadge.label}
                      </span>

                      <span className="text-[10px] text-white/30 font-mono">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white/90 truncate max-w-[280px] sm:max-w-md group-hover:text-white">
                      {item.description || "Intervention atelier"}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#9fe3b9] font-mono block">
                      {cost.toLocaleString("fr-FR")} CFA
                    </span>
                    {item.driveLink && (
                      <span className="text-[9px] font-bold text-[#3B82F6] flex items-center gap-0.5 justify-end">
                        <FolderOpen className="size-2.5" /> Justificatif
                      </span>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-white/20 group-hover:text-white transition-all group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL : DÉTAIL DE L'INTERVENTION & APERÇU GOOGLE DRIVE SANS ERREUR */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#161616] p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <Wrench className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Détail de l'Intervention Atelier</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-0.5">
                    {selectedRecord.vehicle || selectedRecord.driverLabel || "Camion Flotte"}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Cartouches Infos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Date de l'opération</span>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="size-4 text-orange-400" />
                  {formatDate(selectedRecord.date)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Montant Décaissé</span>
                <p className="text-lg font-black text-[#9fe3b9] font-mono flex items-center gap-2">
                  <Banknote className="size-5 text-[#9fe3b9]" />
                  {Number(selectedRecord.cost || selectedRecord.amount || 0).toLocaleString("fr-FR")} CFA
                </p>
              </div>
            </div>

            {/* Description complète */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Libellé / Travaux Effectués</span>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                "{selectedRecord.description || "Aucune description enregistrée"}"
              </p>
            </div>

            {/* Visualiseur Justificatif Google Drive */}
            {selectedRecord.driveLink ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white/60 flex items-center gap-1.5">
                    <FolderOpen className="size-4 text-[#3B82F6]" />
                    Pièce Justificative Associée
                  </span>
                  <a
                    href={selectedRecord.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3B82F6] hover:underline font-bold flex items-center gap-1"
                  >
                    Ouvrir dans Drive <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="min-h-[300px] rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center relative">
                  {getDriveEmbedUrl(selectedRecord.driveLink) ? (
                    <iframe
                      src={getDriveEmbedUrl(selectedRecord.driveLink)!}
                      className="w-full h-[360px] border-0"
                      allow="autoplay"
                      title="Justificatif Drive"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="size-12 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] mx-auto">
                        <FolderOpen className="size-6" />
                      </div>
                      <p className="text-xs text-white/60 max-w-sm">
                        Ce justificatif est un dossier contenant des photos d'atelier et factures. Cliquez ci-dessous pour le consulter directement.
                      </p>
                      <a
                        href={selectedRecord.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider"
                      >
                        <ExternalLink className="size-3.5" /> Ouvrir le dossier complet
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 text-center text-xs text-white/30 italic">
                Aucun lien de justificatif Google Drive rattaché à cette intervention
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MaintenanceLog;
