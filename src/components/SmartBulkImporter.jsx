import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  ClipboardPaste, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Settings2,
  Table as TableIcon,
  Zap,
  Undo2,
  User,
  Info,
  Anchor,
  PlusCircle
} from 'lucide-react';

const OFFICIAL_DRIVERS = [
  { id: "AMARA TRUCK 76", label: "AMARA TRUCK 76" },
  { id: "BRAHIMA TRUCK 45", label: "BRAHIMA TRUCK 45" },
  { id: "SORO TRUCK 52", label: "SORO TRUCK 52" }
];

const MAPPING_OPTIONS = [
  { value: 'ignore', label: 'Ignorer' },
  { value: 'date', label: 'Date (Support 2026)' },
  { value: 'chauffeur', label: 'Driver’s Name' },
  { value: 'start', label: 'Start' },
  { value: 'destination', label: 'Destination' },
  { value: 'fuel', label: 'Fuel Cost (CFA)' },
  { value: 'road', label: 'Road Fees (CFA)' },
  { value: 'port', label: 'Port Access (CFA)' },
  { value: 'police', label: 'Police' },
  { value: 'food', label: 'Food' },
  { value: 'expense', label: 'Extra Bonus' },
  { value: 'total_expense', label: 'Total Expense (CFA)' },
  { value: 'tonnage', label: 'Tonnage (T)' },
  { value: 'revenue', label: 'Total Gross (CFA)' },
  { value: 'total_net_cfa', label: 'Total Net (CFA)' },
  { value: 'km', label: 'Kilométrage (Km)' },
  { value: 'comments', label: 'Comments' },
];

const KEYWORDS = {
  date: ["date", "jour"],
  chauffeur: ["driver", "chauffeur", "nom", "conducteur"],
  start: ["départ", "start", "origine"],
  destination: ["destination", "dest", "arrivée", "trajet"],
  fuel: ["fuel", "carburant", "gasoil"],
  road: ["fees", "péage", "route", "toll"],
  port: ["port", "accès port"],
  police: ["police", "contrôle"],
  food: ["food", "repas", "manger"],
  expense: ["bonus", "extra", "prime"],
  total_expense: ["total expense", "dépenses totales", "total frais"],
  total_net_cfa: ["net", "bénéfice", "profit"],
  km: ["km", "kilométrage", "distance"],
  tonnage: ["ton", "poids", "tonnage"],
  revenue: ["gross", "brut", "ca", "chiffre", "revenu"],
  comments: ["comments", "commentaires", "note"]
};

export default function SmartBulkImporter({ setTrips, setAuditLogs }) {
  const [loading, setLoading] = useState(false);
  const [rawRows, setRawRows] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [globalDriver, setGlobalDriver] = useState('none');
  const [uniqueNamesMap, setUniqueNamesMap] = useState({});
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState(null);
  const [pasteContent, setPasteContent] = useState("");

  const cleanNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let cleaned = String(val).replace(/[a-zA-Z]/g, '').replace(/\s/g, '').replace(/\u00a0/g, '').replace(',', '.');
    cleaned = cleaned.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseRobustDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'number' && val > 40000) {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    let str = String(val).trim().toLowerCase();
    const monthsFR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    const monthRegex = new RegExp(`(${monthsFR.join('|')})`, 'i');
    const monthMatch = str.match(monthRegex);
    if (monthMatch) {
        const monthIndex = monthsFR.indexOf(monthMatch[0]) + 1;
        const numbers = str.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            let day = numbers[0].padStart(2, '0');
            let year = numbers[numbers.length - 1];
            if (year.length === 2) year = '20' + year;
            return `${year}-${String(monthIndex).padStart(2, '0')}-${day}`;
        }
    }
    const parts = str.split(/[\/\-.]/);
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    return str.includes('-') && str.length >= 8 ? str : null;
  };

  const mapChauffeurValue = (val) => {
    const f = String(val || "").toUpperCase();
    if (f.includes('AMARA') || f.includes('SDV 1')) return 'AMARA TRUCK 76';
    if (f.includes('BRAHIMA') || f.includes('SDV 2')) return 'BRAHIMA TRUCK 45';
    if (f.includes('SORO') || f.includes('SDV 3')) return 'SORO TRUCK 52';
    return null;
  };

  const autoDetectColumns = (rows) => {
    const header = rows[0];
    const nextRows = rows.slice(1, 6);
    const newMapping = new Array(header.length).fill('ignore');
    const autoDetected = [];

    header.forEach((cell, i) => {
      const val = String(cell || "").toLowerCase();
      for (const [field, keys] of Object.entries(KEYWORDS)) {
        // Special rule for port and food: only if strictly detected
        if ((field === 'port' || field === 'food') && !keys.some(k => val.includes(k))) continue;
        if (keys.some(k => val.includes(k))) {
          newMapping[i] = field;
          autoDetected.push(i);
          break;
        }
      }
    });

    // Content Fallback
    newMapping.forEach((field, i) => {
      if (field !== 'ignore') return;
      const content = nextRows.map(r => String(r[i] || "")).join(" ");
      if (content.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
        newMapping[i] = 'date';
        autoDetected.push(i);
      } else if (content.includes("CFA") || content.includes(" F")) {
        // Guess financial
      }
    });

    return { mapping: newMapping, detected: autoDetected };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        if (rows.length > 0) {
          const { mapping: detMapping, detected } = autoDetectColumns(rows);
          setRawRows(rows);
          setMapping(detMapping);
          setDetectedColumns(detected);
          setGlobalDriver('none');
          setUniqueNamesMap({});
        }
      } catch (err) { setStatus({ error: "Erreur lecture Excel" }); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasteProcess = () => {
    if (!pasteContent.trim()) return;
    const rows = pasteContent.trim().split('\n').map(line => line.split(/\t|;/).map(c => c.trim()));
    if (rows.length > 0) {
      const { mapping: detMapping, detected } = autoDetectColumns(rows);
      setRawRows(rows);
      setMapping(detMapping);
      setDetectedColumns(detected);
      setGlobalDriver('none');
      setUniqueNamesMap({});
      setFileName("Smart Paste Data");
    }
  };

  useMemo(() => {
    if (!rawRows || !mapping.includes('chauffeur')) return;
    const colIdx = mapping.indexOf('chauffeur');
    const names = [...new Set(rawRows.map(r => r[colIdx]).filter(Boolean))];
    const newMap = { ...uniqueNamesMap };
    names.forEach(name => { if (!newMap[name]) newMap[name] = mapChauffeurValue(name) || OFFICIAL_DRIVERS[0].id; });
    setUniqueNamesMap(newMap);
  }, [rawRows, mapping]);

  const handleValidateMapping = () => {
    if (!rawRows) return;
    const totalLines = rawRows.length;
    let successCount = 0;
    const batchId = `excel-${new Date().toISOString().replace(/[:.]/g, "-")}`;

    try {
      const newTrips = rawRows.slice(1).map((row, rowIndex) => {
        if (row.every(c => !c)) return null;
        const trip = { id: crypto.randomUUID(), status: "Chargé", tripType: "Bulk Import", batchId, importDate: new Date().toISOString() };
        let parsedDate = null;
        let driverNameRaw = null;
        let fuel = 0, toll = 0, port = 0, police = 0, food = 0, extra = 0, revenue = 0, tonnage = 0, km = 0;
        let mappedTotalExpense = null, mappedTotalNet = null;

        mapping.forEach((field, idx) => {
          const val = row[idx];
          if (field === 'ignore') return;
          switch(field) {
            case 'date': parsedDate = parseRobustDate(val); break;
            case 'chauffeur': driverNameRaw = val; break;
            case 'start': trip.start = val || ""; break;
            case 'destination': trip.destination = val || "Non renseignée"; break;
            case 'fuel': fuel = cleanNumber(val); break;
            case 'road': toll = cleanNumber(val); break;
            case 'port': port = cleanNumber(val); break;
            case 'police': police = cleanNumber(val); break;
            case 'food': food = cleanNumber(val); break;
            case 'expense': extra = cleanNumber(val); break;
            case 'total_expense': mappedTotalExpense = cleanNumber(val); break;
            case 'total_net_cfa': mappedTotalNet = cleanNumber(val); break;
            case 'tonnage': tonnage = cleanNumber(val); break;
            case 'revenue': revenue = cleanNumber(val); break;
            case 'km': km = cleanNumber(val); break;
            case 'comments': trip.comments = val || ""; break;
          }
        });

        if (!parsedDate) parsedDate = "2026-01-01";
        
        // Use local ISO-compatible construction to avoid timezone jumps
        const dateObj = new Date(parsedDate + 'T00:00:00');
        
        // SECURED FINANCIAL FORMULAS
        const roadFees = (toll || 0) + (port || 0) + (food || 0) + (extra || 0) + (police || 0);
        const totalExpense = mappedTotalExpense !== null ? mappedTotalExpense : (roadFees + (fuel || 0));
        const netRevenue = mappedTotalNet !== null ? mappedTotalNet : ((revenue || 0) - totalExpense);

        let finalDriver = globalDriver !== 'none' ? globalDriver : (driverNameRaw ? (uniqueNamesMap[driverNameRaw] || mapChauffeurValue(driverNameRaw) || OFFICIAL_DRIVERS[0].id) : OFFICIAL_DRIVERS[0].id);
        
        finalDriver = String(finalDriver).trim();
        if (finalDriver.toUpperCase().includes("BRAHIMA")) {
          finalDriver = "SDV 2 (BRAHIMA)";
        }

        const isoDate = parsedDate; // standardized YYYY-MM-DD from parser

        trip.date = isoDate; trip.month = dateObj.getMonth() + 1; trip.year = dateObj.getFullYear();
        trip.driverLabel = finalDriver; trip.sdv = finalDriver.split(' ')[1] || "SDV";
        trip.chauffeur = finalDriver.split('(')[1]?.replace(')', '') || "Chauffeur";
        trip.title = `${finalDriver} - ${trip.destination || "Non renseignée"}`;
        
        trip.fuel_cost_cfa = fuel;
        trip.road_fees_cfa = roadFees;
        trip.tollCost = toll;
        trip.portAccess = port;
        trip.food_fees_cfa = food;
        trip.police_fees_cfa = police;
        trip.other_expenses_cfa = extra;
        trip.tonnage = tonnage;
        trip.km = km;
        trip.total_gross_cfa = revenue;
        trip.total_expense_cfa = totalExpense;
        trip.total_net_cfa = netRevenue;
        trip.voyages = tonnage >= 100 ? 2 : 1;
        
        successCount++;
        return trip;
      }).filter(t => t !== null);

      if (newTrips.length > 0) {
        setTrips(prev => {
          const importedKeys = new Set(newTrips.map(t => t.date + '_' + t.driverLabel));
          const hasOverlap = prev.some(t => importedKeys.has(t.date + '_' + t.driverLabel));
          
          let finalTrips = [...prev];
          let proceed = true;

          if (hasOverlap) {
            const overwrite = window.confirm(
              "⚠️ CONFLIT DÉTECTÉ : Des données existent déjà pour ces dates et chauffeurs.\n\n" +
              "Voulez-vous ÉCRASER les anciennes données avec cet import ?"
            );
            if (overwrite) {
              finalTrips = prev.filter(t => !importedKeys.has(t.date + '_' + t.driverLabel));
            } else {
              proceed = false;
            }
          }

          if (proceed) {
            // Success logic moved inside setTrips functional update or handled via a side effect
            // But since we need to call setAuditLogs and alert, let's restructure slightly to be cleaner
            setTimeout(() => {
              setAuditLogs(prevLogs => [{
                id: `log-${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: "Bulk Import (Excel)",
                count: newTrips.length,
                batchId: batchId
              }, ...prevLogs]);
              alert("IMPORTATION RÉUSSIE :\n\nTrajets intégrés : " + newTrips.length);
              setRawRows(null); setPasteContent(""); setMapping([]); setDetectedColumns([]);
            }, 0);
            return [...finalTrips, ...newTrips];
          }
          return prev;
        });
      }
    } catch (e) { alert("Erreur critique d'importation."); }
  };

  return (
    <div className="max-w-7xl mx-auto bg-[#181818] rounded-[30px] border border-white/5 shadow-2xl overflow-hidden text-white font-sans">
      {!rawRows ? (
        <div className="p-10 animate-in fade-in duration-500">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold tracking-tight mb-2 italic">SmartBulk <span className="text-[#cf5d56] not-italic">Station</span></h2>
            <p className="text-white/40 text-sm tracking-widest uppercase">Hybrid Data Processing Engine</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative group">
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="border-2 border-dashed border-white/10 group-hover:border-[#cf5d56]/40 rounded-[30px] p-12 text-center bg-white/[0.02] transition-all flex flex-col items-center justify-center h-64">
                <FileSpreadsheet className="size-16 text-[#cf5d56] mb-4" />
                <h3 className="text-xl font-bold">Importer Excel</h3>
                <p className="text-sm text-white/30 mt-2">Cliquez ou glissez votre .xlsx</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <textarea placeholder="Collez vos lignes Excel ici..." value={pasteContent} onChange={e => setPasteContent(e.target.value)} className="w-full h-full min-h-[200px] bg-black/40 border border-white/10 rounded-[30px] p-6 text-sm font-mono outline-none focus:border-[#cf5d56] transition resize-none no-scrollbar" />
                <ClipboardPaste className="absolute right-6 bottom-6 size-6 text-white/10" />
              </div>
              <button onClick={handlePasteProcess} disabled={!pasteContent.trim()} className="bg-[#cf5d56] hover:bg-[#cf5d56]/90 py-4 rounded-[20px] font-bold flex items-center justify-center gap-3 transition disabled:opacity-20 shadow-lg shadow-[#cf5d56]/10">Traiter le collage <ArrowRight className="size-4" /></button>
            </div>
          </div>
          {status && <div className={`mt-10 p-5 rounded-[24px] flex items-center gap-4 animate-in slide-in-from-bottom-4 ${status.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>{status.error ? <AlertCircle className="size-6" /> : <CheckCircle2 className="size-6" />}<span className="font-bold tracking-tight">{status.error || status.success}</span></div>}
        </div>
      ) : (
        <div className="flex flex-col h-[85vh]">
          <header className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/20">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><Settings2 className="text-[#cf5d56] size-7" /> Visual Mapping Engine</h2>
              <p className="text-white/30 text-xs mt-1">Configurez les colonnes pour l'intégration 2026.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5">
                <User className="size-4 text-[#cf5d56]" />
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Chauffeur :</span>
                <select value={globalDriver} onChange={e => setGlobalDriver(e.target.value)} className="bg-transparent text-sm font-black text-[#ff8f84] outline-none cursor-pointer">
                  <option value="none" className="bg-[#181818]">Utiliser colonne Driver's Name</option>
                  {OFFICIAL_DRIVERS.map(d => <option key={d.id} value={d.id} className="bg-[#181818]">{d.label}</option>)}
                </select>
              </div>
              <button onClick={() => {setRawRows(null); setDetectedColumns([]);}} className="p-3 hover:bg-white/5 rounded-2xl transition text-white/40"><Undo2 className="size-5" /></button>
              <button onClick={handleValidateMapping} className="flex items-center gap-3 px-10 py-3.5 rounded-2xl font-black bg-[#cf5d56] text-white shadow-xl shadow-[#cf5d56]/20 hover:scale-105 active:scale-95 transition-all"><Zap className="size-5" /> INTÉGRER AU DASHBOARD</button>
            </div>
          </header>

          {mapping.includes('chauffeur') && globalDriver === 'none' && Object.keys(uniqueNamesMap).length > 0 && (
            <div className="mx-8 mt-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
              <p className="text-[10px] uppercase font-bold text-white/20 mb-3 flex items-center gap-2"><Info className="size-3" /> Mapper les noms détectés :</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.keys(uniqueNamesMap).map(name => (
                  <div key={name} className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-xs text-white/60 font-mono truncate max-w-[100px]">{name}</span>
                    <select value={uniqueNamesMap[name]} onChange={e => setUniqueNamesMap({...uniqueNamesMap, [name]: e.target.value})} className="bg-transparent text-[10px] font-bold text-[#ff8f84] outline-none">
                      {OFFICIAL_DRIVERS.map(c => <option key={c.id} value={c.id} className="bg-[#181818]">{c.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <table className="min-w-max w-full border-collapse border border-white/10 bg-black/40 rounded-[30px] overflow-hidden shadow-2xl">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white/[0.03] backdrop-blur-md">
                    {mapping.map((field, i) => (
                      <th key={i} className="p-5 border-r border-b border-white/5 text-left">
                        <div className={`p-1 rounded-xl transition ${detectedColumns.includes(i) ? 'bg-[#cf5d56]/10 border border-[#cf5d56]/30' : ''}`}>
                          <select value={field} onChange={e => {const newMap = [...mapping]; newMap[i] = e.target.value; setMapping(newMap);}} className={`w-full bg-[#181818] border rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-wider outline-none transition appearance-none cursor-pointer ${field !== 'ignore' ? 'border-[#cf5d56] text-[#ff8f84] shadow-lg shadow-[#cf5d56]/10' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                            {MAPPING_OPTIONS.map(opt => (<option key={opt.value} value={opt.value} className="bg-[#181818]">{opt.label}</option>))}
                          </select>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rawRows.slice(0, 30).map((row, rowIndex) => (
                    <tr key={rowIndex} className={`${rowIndex === 0 ? 'bg-white/[0.05] font-black text-white' : 'hover:bg-white/[0.01] text-white/40'} transition`}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-5 text-xs border-r border-white/5 truncate max-w-[250px]">{cell === undefined || cell === null ? "" : String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <footer className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-[10px] text-white/20 uppercase tracking-[0.3em] font-black"><TableIcon className="size-4" /> <span>Prévisualisation</span><span className="bg-white/5 px-3 py-1.5 rounded-lg text-white/40 border border-white/10">Fichier: {fileName}</span></div>
            <div className="text-[10px] text-[#cf5d56] font-black italic tracking-widest uppercase">REQUIS : Date, Destination, Total Gross</div>
          </footer>
        </div>
      )}
    </div>
  );
}
