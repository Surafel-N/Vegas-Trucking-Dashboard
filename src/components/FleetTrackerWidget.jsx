import { useMemo } from 'react';
import { Route, Truck } from 'lucide-react';

const FLEET_INFO = {
  "AMARA": { driver: "AMARA", plate: "AA-672-PS", truckNum: "TRUCK 76", color: "text-blue-400", bg: "bg-blue-400" },
  "BRAHIMA": { driver: "BRAHIMA", plate: "AA-736-PK", truckNum: "TRUCK 45", color: "text-emerald-400", bg: "bg-emerald-400" },
  "SORO": { driver: "SORRO", plate: "AA-579-PJ", truckNum: "TRUCK 52", color: "text-[#cf5d56]", bg: "bg-[#cf5d56]" },
  "SORRO": { driver: "SORRO", plate: "AA-579-PJ", truckNum: "TRUCK 52", color: "text-[#cf5d56]", bg: "bg-[#cf5d56]" }
};

export function FleetTrackerWidget({ records }) {
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
      if (t.km && Number(t.km) > 0) {
        data[driverKey].km = Number(t.km);
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
    <div className="relative h-full w-full min-h-[500px] md:min-h-[600px] rounded-[30px] overflow-hidden border border-white/5">
      
      {/* PARTIE 1 : LA CARTE GPS FNIOT (Iframe) en plein écran */}
      <div className="absolute inset-0 w-full h-full bg-[#111] overflow-hidden">
        <iframe 
          src="https://fniot.cc/monitor" 
          className="w-full h-full border-0 object-cover"
          title="FNIOT Live Tracker"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
        
        {/* Badge Satellite (Maintenu mais ajusté) */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#cf5d56]/30 z-20 shadow-lg pointer-events-none">
          <div className="size-1.5 rounded-full bg-[#cf5d56] animate-pulse"></div>
          <span className="text-[9px] font-black text-[#cf5d56] tracking-widest uppercase">FNIOT Satellite Link</span>
        </div>
      </div>

      {/* PARTIE 2 : LE PANNEAU FLOTTANT (Overlay Kilométrage) */}
      <div className="absolute bottom-4 left-4 z-10 w-[280px] max-h-[350px] overflow-y-auto bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-2xl custom-scrollbar transition-all hover:bg-black/80">
        <div className="flex items-center gap-2 mb-3">
          <Route className="size-3 text-white/40" />
          <h3 className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Distance Parcourue</h3>
        </div>

        <div className="space-y-4">
          {trackerData.list.map((item, idx) => {
            const fillPercentage = Math.min((item.km / trackerData.maxKm) * 100, 100);
            return (
              <div key={idx} className="group relative">
                <div className="flex justify-between items-start mb-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Truck className={`size-3 ${item.info.color}`} />
                      <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[120px]">
                        {item.info.truckNum} <span className="text-white/30 font-normal">| {item.info.plate}</span>
                      </h4>
                    </div>
                    <p className="text-[9px] text-white/40 font-bold tracking-wider uppercase mt-0.5">
                      {item.info.driver}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-sm font-black text-white">{item.km.toLocaleString('fr-FR')}</span>
                      <span className="text-[9px] text-white/40 font-medium">Km</span>
                    </div>
                    <p className="text-[8px] text-[#cf5d56]/60 font-bold uppercase tracking-tighter">
                      {item.lastDate ? new Date(item.lastDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Barre de progression miniaturisée (h-1) */}
                <div className="relative">
                  <div className="overflow-hidden h-1 text-xs flex rounded-full bg-white/5">
                    <div 
                      style={{ width: `${fillPercentage}%` }} 
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${item.info.bg} transition-all duration-1000 ease-out opacity-80`}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
