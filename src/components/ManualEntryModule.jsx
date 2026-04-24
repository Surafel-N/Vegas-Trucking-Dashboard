import React, { useState, useMemo } from 'react';
import { 
  User, 
  Calendar, 
  MapPin, 
  Weight, 
  Route,
  Fuel, 
  ReceiptText, 
  ShieldCheck, 
  Utensils, 
  Banknote, 
  ClipboardPaste, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Table as TableIcon,
  Zap,
  Undo2,
  ArrowRight,
  Info,
  Anchor
} from 'lucide-react';

const CHAUFFEURS = [
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
  tonnage: ["ton", "poids", "tonnage"],
  km: ["km", "kilométrage", "distance"],
  revenue: ["gross", "brut", "ca", "chiffre", "revenu"],
  comments: ["comments", "commentaires", "note"]
};

export default function ManualEntryModule({ setTrips }) {
  const [mode, setMode] = useState('manual'); // 'manual' or 'paste'
  const [status, setStatus] = useState(null);
  
  // --- INDIVIDUAL MANUAL FORM ---
  const [formData, setFormData] = useState({
    driverLabel: CHAUFFEURS[0].id,
    date: new Date().toISOString().split('T')[0],
    destination: '',
    tonnage: '',
    km: '',
    fuel: '',
    toll: '',
    port: '',
    police: '',
    food: '',
    extra: '',
    revenue: ''
  });

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
    const f = String(val || "").trim().toUpperCase();
    if (f.includes('AMARA') || f.includes('SDV 1')) return 'AMARA TRUCK 76';
    if (f.includes('BRAHIMA') || f.includes('SDV 2')) return 'BRAHIMA TRUCK 45';
    if (f.includes('SORO') || f.includes('SDV 3')) return 'SORO TRUCK 52';
    return null;
  };

  const formatTrip = (data) => {
    // Use UTC to avoid timezone issues with date extraction
    const dateObj = new Date(data.date + 'T00:00:00');
    const fuelCost = cleanNumber(data.fuel);
    const tollCost = cleanNumber(data.toll);
    const portAccess = cleanNumber(data.port);
    const policeCost = cleanNumber(data.police);
    const foodCost = cleanNumber(data.food);
    const extraBonus = cleanNumber(data.extra);
    const revenue = cleanNumber(data.revenue);
    const tonnage = cleanNumber(data.tonnage);
    const km = cleanNumber(data.km);

    // SECURED CALCULATION FORMULAS
    const roadFees = (tollCost || 0) + (portAccess || 0) + (foodCost || 0) + (extraBonus || 0) + (policeCost || 0);
    const totalExpense = roadFees + (fuelCost || 0);
    const netRevenue = (revenue || 0) - totalExpense;

    let driverLabel = String(data.driverLabel || "").trim();
    if (driverLabel.toUpperCase().includes("BRAHIMA")) {
      driverLabel = "SDV 2 (BRAHIMA)";
    }
    
    const sdv = driverLabel.split(' ')[1] || "SDV";
    const chauffeur = driverLabel.split('(')[1]?.replace(')', '') || "Chauffeur";
    
    const isoDate = data.date; // already YYYY-MM-DD from input type="date"

    return {
      id: crypto.randomUUID(),
      date: isoDate,
      month: dateObj.getMonth() + 1, // January is 1
      year: dateObj.getFullYear(),
      driverLabel,
      sdv,
      chauffeur,
      destination: data.destination || "Non renseignée",
      title: `${driverLabel} - ${data.destination || "Non renseignée"}`,
      fuel_cost_cfa: fuelCost, 
      road_fees_cfa: roadFees, // standardized grouping
      tollCost, portAccess, food_fees_cfa: foodCost, police_fees_cfa: policeCost,
      other_expenses_cfa: extraBonus, 
      total_gross_cfa: revenue,
      total_expense_cfa: totalExpense, total_net_cfa: netRevenue,
      km,
      voyages: tonnage > 100 ? 2 : (tonnage > 0 ? 1 : 0), tripType: "Saisie Manuelle"
      };
      };
  const handleManualSubmit = (e) => {
    e.preventDefault();
    setTrips(prev => [...prev, formatTrip(formData)]);
    setStatus({ success: "Trajet ajouté avec succès !" });
    setFormData({ ...formData, destination: '', tonnage: '', fuel: '', toll: '', port: '', police: '', food: '', extra: '', revenue: '' });
    setTimeout(() => setStatus(null), 3000);
  };

  // --- SMART PASTE ---
  const [pasteContent, setPasteContent] = useState('');
  const [rawRows, setRawRows] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [globalDriver, setGlobalDriver] = useState('none');
  const [uniqueNamesMap, setUniqueNamesMap] = useState({});

  const autoDetectColumns = (rows) => {
    const header = rows[0];
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
    return { mapping: newMapping, detected: autoDetected };
  };

  const handlePasteProcess = () => {
    if (!pasteContent.trim()) return;
    const rows = pasteContent.trim().split('\n').map(line => line.split(/\t|;/).map(c => c.trim()));
    if (rows.length > 0) {
      const { mapping: detectedMapping, detected } = autoDetectColumns(rows);
      setRawRows(rows);
      setMapping(detectedMapping);
      setDetectedColumns(detected);
      setGlobalDriver('none');
      setUniqueNamesMap({});
    }
  };

  useMemo(() => {
    if (!rawRows || !mapping.includes('chauffeur')) return;
    const colIdx = mapping.indexOf('chauffeur');
    const names = [...new Set(rawRows.map(r => r[colIdx]).filter(Boolean))];
    const newMap = { ...uniqueNamesMap };
    names.forEach(name => { if (!newMap[name]) newMap[name] = mapChauffeurValue(name) || CHAUFFEURS[0].id; });
    setUniqueNamesMap(newMap);
  }, [rawRows, mapping]);

  const handleValidateMapping = () => {
    if (!rawRows) return;
    const totalLines = rawRows.length;
    let successCount = 0;
    try {
      const newTrips = rawRows.map((row, rowIndex) => {
        if (row.every(c => !c)) return null;
        const trip = { id: crypto.randomUUID(), status: "Chargé", tripType: "Smart Paste" };
        let parsedDate = null;
        let driverNameRaw = null;
        
        let fuel = 0, toll = 0, port = 0, police = 0, food = 0, extra = 0, revenue = 0, tonnage = 0, km = 0, mappedTotalExpense = null;

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
            case 'tonnage': tonnage = cleanNumber(val); break;
            case 'km': km = cleanNumber(val); break;
            case 'revenue': revenue = cleanNumber(val); break;
            case 'comments': trip.comments = val || ""; break;
          }
        });

        if (!parsedDate) parsedDate = "2026-01-01";
        let finalDriver = globalDriver !== 'none' ? globalDriver : (driverNameRaw ? (uniqueNamesMap[driverNameRaw] || mapChauffeurValue(driverNameRaw) || CHAUFFEURS[0].id) : CHAUFFEURS[0].id);
        const dateObj = new Date(parsedDate);
        
        const roadFees = (toll || 0) + (port || 0) + (food || 0) + (extra || 0) + (police || 0);
        const totalExpense = mappedTotalExpense !== null ? mappedTotalExpense : (roadFees + (fuel || 0));
        const netRevenue = (revenue || 0) - totalExpense;
        
        const isoDate = new Date(parsedDate).toISOString().split('T')[0];

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
        trip.voyages = tonnage > 100 ? 2 : (tonnage > 0 ? 1 : 0);
        
        successCount++;
        return trip;
      }).filter(t => t !== null);

      if (newTrips.length > 0) {
        setTrips(prev => [...prev, ...newTrips]);
        alert("IMPORTATION RÉUSSIE :\n\nLignes lues : " + totalLines + "\nIntégrés : " + successCount);
        setRawRows(null); setPasteContent(''); setMapping([]); setDetectedColumns([]);
      }
    } catch (e) { alert("Erreur critique d'importation."); }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-[#181818] rounded-[30px] border border-white/5 shadow-2xl text-white">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3"><PlusCircle className="text-[#cf5d56]" /> Saisie Rapide</h2>
          <p className="text-white/40 mt-1 text-sm">Ajoutez vos trajets manuellement ou par copier-coller.</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
          <button onClick={() => setMode('manual')} className={`px-6 py-2 rounded-xl text-sm font-medium transition ${mode === 'manual' ? 'bg-[#cf5d56] text-white' : 'text-white/40 hover:text-white'}`}>Formulaire</button>
          <button onClick={() => setMode('paste')} className={`px-6 py-2 rounded-xl text-sm font-medium transition ${mode === 'paste' ? 'bg-[#cf5d56] text-white' : 'text-white/40 hover:text-white'}`}>Smart Paste</button>
        </div>
      </header>

      {status && <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>{status.error ? <AlertCircle className="size-5" /> : <CheckCircle2 className="size-5" />}<span className="text-sm font-medium">{status.error || status.success}</span></div>}

      {mode === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">Chauffeur</span><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" /><select value={formData.driverLabel} onChange={e => setFormData({...formData, driverLabel: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#cf5d56] outline-none transition">{CHAUFFEURS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">Date du trajet</span><div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" /><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#cf5d56] outline-none transition" /></div></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">Destination</span><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" /><input type="text" placeholder="Ex: San Pedro" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#cf5d56] outline-none transition" /></div></label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">Tonnage</span><div className="relative"><Weight className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" /><input type="number" placeholder="0.00" value={formData.tonnage} onChange={e => setFormData({...formData, tonnage: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#cf5d56] outline-none transition" /></div></label>
              <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">Kilométrage</span><div className="relative"><Route className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/20" /><input type="number" placeholder="Km" value={formData.km} onChange={e => setFormData({...formData, km: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#cf5d56] outline-none transition" /></div></label>
            </div>
          </div>
          <div className="space-y-4 bg-white/[0.02] p-6 rounded-[24px] border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#cf5d56] mb-4">Finances (CFA)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative"><Fuel className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Gasoil" value={formData.fuel} onChange={e => setFormData({...formData, fuel: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
              <div className="relative"><ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Péage" value={formData.toll} onChange={e => setFormData({...formData, toll: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
              <div className="relative"><Anchor className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Port" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
              <div className="relative"><ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Police" value={formData.police} onChange={e => setFormData({...formData, police: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
              <div className="relative"><Utensils className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Repas" value={formData.food} onChange={e => setFormData({...formData, food: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
              <div className="relative"><PlusCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-white/20" /><input type="text" placeholder="Extra" value={formData.extra} onChange={e => setFormData({...formData, extra: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-3 text-sm focus:border-[#cf5d56] outline-none" /></div>
            </div>
            <label className="block mt-6"><span className="text-xs text-white/30 block mb-2">Revenu Brut Total</span><div className="relative"><Banknote className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#61d2c0]" /><input type="text" placeholder="0 CFA" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} className="w-full bg-black/60 border border-[#61d2c0]/20 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-[#61d2c0] focus:border-[#61d2c0] outline-none transition" /></div></label>
            <button type="submit" className="w-full bg-[#cf5d56] hover:bg-[#cf5d56]/90 text-white font-bold py-4 rounded-2xl mt-4 transition shadow-lg shadow-[#cf5d56]/20">Enregistrer le trajet</button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {!rawRows ? (
            <>
              <div className="p-6 bg-[#cf5d56]/5 border border-[#cf5d56]/10 rounded-[24px]">
                <h4 className="flex items-center gap-2 text-[#ff8f84] font-bold mb-2"><ClipboardPaste className="size-4" /> Smart Paste Engine</h4>
                <p className="text-sm text-[#ff8f84]/60 leading-relaxed">Collez vos lignes Excel/Sheets ici. La détection des colonnes est désormais automatique.</p>
              </div>
              <textarea placeholder="Collez vos données ici..." value={pasteContent} onChange={e => setPasteContent(e.target.value)} className="w-full h-64 bg-black/40 border border-white/10 rounded-[24px] p-6 text-sm font-mono focus:border-[#cf5d56] outline-none transition resize-none no-scrollbar" />
              <div className="flex justify-end"><button onClick={handlePasteProcess} disabled={!pasteContent.trim()} className="bg-[#cf5d56] disabled:opacity-30 hover:bg-[#cf5d56]/90 text-white font-bold px-10 py-4 rounded-2xl transition shadow-lg shadow-[#cf5d56]/20 flex items-center gap-2">Suivant <ArrowRight className="size-4" /></button></div>
            </>
          ) : (
            <div className="animate-in fade-in duration-500 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2"><TableIcon className="text-[#cf5d56]" /> Mapping Intelligent</h3>
                <div className="flex gap-3">
                    <button onClick={() => {setRawRows(null); setDetectedColumns([]);}} className="px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white transition flex items-center gap-2"><Undo2 className="size-4" /> Annuler</button>
                    <button onClick={handleValidateMapping} className="bg-[#cf5d56] text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-[#cf5d56]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition"><Zap className="size-4" /> Valider l'Import</button>
                </div>
              </div>
              <div className="bg-white/[0.02] p-6 rounded-[24px] border border-white/5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-[#cf5d56]/10 p-2 rounded-lg"><User className="size-5 text-[#cf5d56]" /></div>
                  <div className="flex-1">
                    <p className="text-xs uppercase font-bold text-white/30 tracking-widest mb-1">Attribuer à quel chauffeur ?</p>
                    <select value={globalDriver} onChange={e => setGlobalDriver(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-[#cf5d56]"><option value="none">Utiliser la colonne Driver's Name du texte</option>{CHAUFFEURS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                  </div>
                </div>
                {mapping.includes('chauffeur') && globalDriver === 'none' && Object.keys(uniqueNamesMap).length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] uppercase font-bold text-white/20 mb-3 flex items-center gap-2"><Info className="size-3" /> Mapper les noms détectés :</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Object.keys(uniqueNamesMap).map(name => (<div key={name} className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5"><span className="text-xs text-white/60 font-mono truncate max-w-[120px]">{name}</span><select value={uniqueNamesMap[name]} onChange={e => setUniqueNamesMap({...uniqueNamesMap, [name]: e.target.value})} className="bg-transparent text-[10px] font-bold text-[#ff8f84] outline-none">{CHAUFFEURS.map(c => <option key={c.id} value={c.id} className="bg-[#181818]">{c.label}</option>)}</select></div>))}</div>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1800px]">
                    <thead>
                        <tr className="bg-white/[0.03]">
                            {mapping.map((field, i) => (
                                <th key={i} className="p-4 border-r border-white/5">
                                    <div className={`p-1 rounded-xl transition ${detectedColumns.includes(i) ? 'bg-[#cf5d56]/10 border border-[#cf5d56]/30' : ''}`}>
                                        <select value={field} onChange={e => {const newMap = [...mapping]; newMap[i] = e.target.value; setMapping(newMap);}} className={`w-full bg-black/60 border rounded-xl px-3 py-2 text-xs font-bold outline-none transition ${field !== 'ignore' ? 'border-[#cf5d56] text-[#ff8f84]' : 'border-white/10 text-white/40'}`}>
                                            {MAPPING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rawRows.slice(0, 10).map((row, rowIndex) => (<tr key={rowIndex} className="hover:bg-white/[0.01] transition">{row.map((cell, cellIndex) => (<td key={cellIndex} className="p-4 text-xs text-white/40 border-r border-white/5 truncate max-w-[200px]">{cell}</td>))}</tr>))}
                    </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
