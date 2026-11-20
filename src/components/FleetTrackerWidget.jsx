import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Maximize, 
  Minimize, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  ExternalLink 
} from 'lucide-react';

export function FleetTrackerWidget({ 
  records = [], 
  drivers = [], 
  t, 
  isExpanded = false, 
  onToggleExpand 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Gérer le verrouillage du scroll et la touche Échap pour le mode plein écran
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  const dynamicFleetInfo = useMemo(() => {
    const info = {};
    const defaultColors = [
      { color: "text-blue-400", bg: "bg-blue-400/20", border: "border-blue-500/30" },
      { color: "text-emerald-400", bg: "bg-emerald-400/20", border: "border-emerald-500/30" },
      { color: "text-amber-400", bg: "bg-amber-400/20", border: "border-amber-500/30" },
      { color: "text-purple-400", bg: "bg-purple-400/20", border: "border-purple-500/30" },
      { color: "text-[#cf5d56]", bg: "bg-[#cf5d56]/20", border: "border-[#cf5d56]/30" },
    ];
    
    drivers.forEach((d, i) => {
      const key = d.name.toUpperCase();
      const style = defaultColors[i % defaultColors.length];
      info[key] = {
        driver: key,
        plate: d.vehicle || "N/A",
        truckNum: d.sdv || "TRUCK",
        color: style.color,
        bg: style.bg,
        border: style.border
      };
    });
    
    // Add fallback for SORRO / SORO
    if (info["SORO"] && !info["SORRO"]) {
      info["SORRO"] = { ...info["SORRO"], driver: "SORRO" };
    }
    
    return info;
  }, [drivers]);

  return (
    <>
      {/* 1. CARTE GPS DANS LA PAGE */}
      <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-white/5 bg-[#0f0f12]">
        {/* Iframe du tracking GPS FNIOT */}
        <iframe 
          key={`inline-${refreshKey}`}
          src="https://fniot.cc/monitor" 
          className="w-full h-full border-0 object-cover"
          title="FNIOT Live Tracker"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          allow="geolocation"
        />
        
        {/* Barre de contrôle supérieure */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none gap-2">
          {/* Gauche : Indicateur En Direct & Badges Véhicules */}
          <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 shadow-lg">
              <div className="size-2 rounded-full bg-[#cf5d56] animate-pulse shadow-[0_0_8px_#cf5d56]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                {t?.fleetLive || "Flotte en Direct"}
              </span>
              <span className="text-[9px] font-mono text-[#cf5d56] px-1.5 py-0.5 rounded bg-[#cf5d56]/15 border border-[#cf5d56]/30 font-semibold">
                FNIOT GPS
              </span>
            </div>

            {/* Badges Chauffeurs & Camions */}
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[9px] font-mono text-blue-300 border border-blue-500/30">
                TRUCK 76 • AMARA
              </span>
              <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[9px] font-mono text-emerald-300 border border-emerald-500/30">
                TRUCK 45 • BRAHIMA
              </span>
              <span className="px-2 py-1 rounded-lg bg-black/65 backdrop-blur-md text-[9px] font-mono text-amber-300 border border-amber-500/30">
                TRUCK 52 • SORO
              </span>
            </div>
          </div>

          {/* Droite : Actions */}
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            {/* Bouton Rafraîchir l'Iframe */}
            <button 
              type="button"
              onClick={() => setRefreshKey(k => k + 1)}
              title={t?.refresh || "Actualiser la carte GPS"}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-black/75 hover:bg-black/95 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <RotateCw className="size-3.5" />
              <span className="hidden xl:inline">{t?.refresh || "Actualiser"}</span>
            </button>

            {/* Bouton Ouvrir dans un nouvel onglet */}
            <a 
              href="https://fniot.cc/monitor" 
              target="_blank" 
              rel="noopener noreferrer"
              title="Ouvrir dans un nouvel onglet"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-black/75 hover:bg-black/95 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden xl:inline">Ouvrir</span>
            </a>

            {/* Bouton Agrandir / Réduire (Focus Mode) */}
            {onToggleExpand && (
              <button 
                type="button"
                onClick={onToggleExpand}
                title={isExpanded ? (t?.reduce || "Réduire dans la page") : (t?.focusMode || "Agrandir dans la page")}
                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[#cf5d56] backdrop-blur-md border border-white/10 hover:border-[#cf5d56] text-white text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
              >
                {isExpanded ? (
                  <>
                    <Minimize className="size-3.5" />
                    <span>{t?.reduce || "Réduire"}</span>
                  </>
                ) : (
                  <>
                    <Maximize className="size-3.5" />
                    <span>{t?.focusMode || "Focus Mode"}</span>
                  </>
                )}
              </button>
            )}

            {/* Bouton Plein Écran Total (Modal Portal) */}
            <button 
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Plein écran complet"
              className="px-2.5 py-1 rounded-xl bg-[#cf5d56] hover:bg-[#b84e47] backdrop-blur-md border border-[#cf5d56] text-white text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 shadow-lg shadow-[#cf5d56]/20 active:scale-95"
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">Plein Écran</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. VRAI PLEIN ÉCRAN VIA REACT PORTAL */}
      {isFullscreen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-[#0c0c0e] flex flex-col text-white animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="FNIOT Satellite Live Tracker Plein Écran"
        >
          {/* En-tête Plein Écran */}
          <div className="h-14 bg-[#141417]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-[#cf5d56]/40 shadow-inner">
                <div className="size-2 rounded-full bg-[#cf5d56] animate-pulse shadow-[0_0_8px_#cf5d56]" />
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  {t?.fleetLive || "Flotte en Direct"}
                </span>
                <span className="text-[10px] font-mono text-[#cf5d56] px-1.5 py-0.5 rounded bg-[#cf5d56]/15 font-semibold">
                  FNIOT SATELLITE
                </span>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-xs font-mono text-blue-300 border border-blue-500/30">
                  TRUCK 76 • AMARA
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-mono text-emerald-300 border border-emerald-500/30">
                  TRUCK 45 • BRAHIMA
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs font-mono text-amber-300 border border-amber-500/30">
                  TRUCK 52 • SORO
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey(k => k + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold border border-white/10 transition-colors active:scale-95"
                title="Recharger le suivi GPS"
              >
                <RotateCw className="size-3.5" />
                <span className="hidden sm:inline">{t?.refresh || "Actualiser"}</span>
              </button>

              <a
                href="https://fniot.cc/monitor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold border border-white/10 transition-colors active:scale-95"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Nouvel onglet</span>
              </a>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#cf5d56] hover:bg-[#b84e47] text-white text-xs font-bold transition-all shadow-lg shadow-[#cf5d56]/30 active:scale-95 ml-1"
                title="Quitter le plein écran (Échap)"
              >
                <Minimize2 className="size-4" />
                <span>Fermer</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] bg-black/40 rounded border border-white/20 uppercase font-mono">
                  Échap
                </kbd>
              </button>
            </div>
          </div>

          {/* Iframe GPS Plein Écran */}
          <div className="flex-1 w-full relative bg-[#0f0f12]">
            <iframe
              key={`fs-${refreshKey}`}
              src="https://fniot.cc/monitor"
              className="w-full h-full border-0"
              title="FNIOT Live Tracker Fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              allow="geolocation"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
