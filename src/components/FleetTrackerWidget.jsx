import { useMemo, useState } from 'react';
import { Route, Truck, Maximize2, Minimize2 } from 'lucide-react';

const FLEET_INFO = {
  "AMARA": { driver: "AMARA", plate: "AA-672-PS", truckNum: "TRUCK 76", color: "text-blue-400", bg: "bg-blue-400" },
  "BRAHIMA": { driver: "BRAHIMA", plate: "AA-736-PK", truckNum: "TRUCK 45", color: "text-emerald-400", bg: "bg-emerald-400" },
  "SORO": { driver: "SORRO", plate: "AA-579-PJ", truckNum: "TRUCK 52", color: "text-[#cf5d56]", bg: "bg-[#cf5d56]" },
  "SORRO": { driver: "SORRO", plate: "AA-579-PJ", truckNum: "TRUCK 52", color: "text-[#cf5d56]", bg: "bg-[#cf5d56]" }
};

export function FleetTrackerWidget({ records }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const trackerData = useMemo(() => {
    const data = {};
    // Trier les records par date (du plus ancien au plus récent)
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedRecords.forEach(t => {
      if (!t.driverLabel) return;
      
      const labelUpper = t.driverLabel.toUpperCase();
      let driverKey = null;
      if (labelUpper.includes("AMARA")) driverKey = "AMARA";
      else if (labelUpper.includes("BRAHIMA")) driverKey = "BRAHIMA";
      else if (labelUpper.includes("SORO") || labelUpper.includes("SORRO")) driverKey = "SORRO";
      else return;

      if (!data[driverKey]) {
        // On ajoute un champ lastDate pour l'affichage
        data[driverKey] = { km: 0, info: FLEET_INFO[driverKey], lastDate: null };
      }
      
      // 💡 LE SECRET EST ICI : Au lieu de +=, on utilise =
      // Si la ligne contient un kilométrage valide, il ÉCRASE le précédent.
      // À la fin de la boucle, il ne restera que le chiffre de la date la plus récente.
      const kmValue = Number(t.km || t.distanceKm || 0);
      if (kmValue > 0) {
        data[driverKey].km = kmValue;
        data[driverKey].lastDate = t.date; // On garde la date du relevé
      }
    });

    // Trier la liste par kilométrage décroissant pour l'affichage
    const sortedList = Object.values(data).sort((a, b) => b.km - a.km);
    const maxKm = Math.max(...sortedList.map(d => d.km), 1);
    
    return { list: sortedList, maxKm };
  }, [records]);

  if (trackerData.list.length === 0) return null;

  return (
    <div className={`relative transition-all duration-500 rounded-[30px] overflow-hidden border border-white/5 ${isFullscreen ? 'fixed inset-0 z-[500] m-4' : 'h-full w-full min-h-[500px] md:min-h-[600px]'}`}>
      
      {/* PARTIE 1 : LA CARTE GPS FNIOT (Iframe) en plein écran */}
      <div className="absolute inset-0 w-full h-full bg-[#111] overflow-hidden">
        <iframe 
          src="https://fniot.cc/monitor" 
          className="w-full h-full border-0 object-cover"
          title="FNIOT Live Tracker"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
        
        {/* Badge Satellite & Bouton Agrandir */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#cf5d56]/30 shadow-lg pointer-events-none">
            <div className="size-1.5 rounded-full bg-[#cf5d56] animate-pulse"></div>
            <span className="text-[9px] font-black text-[#cf5d56] tracking-widest uppercase">FNIOT Satellite Link</span>
          </div>

          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-white hover:bg-[#cf5d56] hover:border-[#cf5d56] transition-all shadow-2xl"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
