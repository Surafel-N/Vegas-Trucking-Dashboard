import { useState, useMemo } from 'react';
import { 
  Trash2, Filter, AlertCircle, CheckSquare, Square, 
  Edit3, Plus, X, Check, Save, Copy, Zap, 
  Fuel, ShieldCheck, Utensils, Banknote, Anchor, Route
} from 'lucide-react';

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export function ReportsModule({ records = [], manualTrips = [], setRecords, chauffeurs = [], canDelete = false, canEdit = true }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterMonth, setFilterMonth] = useState("Tous");
  const [filterYear, setFilterYear] = useState("Toutes");
  const [filterDriver, setFilterDriver] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous"); // Filtre par source (Excel vs Dashboard)
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const years = useMemo(() => {
    const y = new Set(records.map(r => r.year).filter(Boolean));
    return ["Toutes", ...Array.from(y).sort((a, b) => b - a)];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(t => {
      const matchDriver = filterDriver === "Tous" || String(t.driverLabel || "").trim() === String(filterDriver).trim();
      const matchMonth = filterMonth === "Tous" || String(t.month) === String(filterMonth);
      const matchYear = filterYear === "Toutes" || String(t.year) === String(filterYear);
      const matchType = filterType === "Tous" || (filterType === "Excel" ? t.tripType === "Régulier" : t.tripType !== "Régulier");
      return matchDriver && matchMonth && matchYear && matchType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, filterDriver, filterMonth, filterYear, filterType]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // --- ACTIONS ---

  const handleAddToDashboard = (record) => {
    // Vérifier si déjà présent pour éviter les doublons
    const isDuplicate = manualTrips.some(m => m.date === record.date && m.driverLabel === record.driverLabel && m.total_gross_cfa === record.total_gross_cfa);
    if (isDuplicate) {
      if (!window.confirm("Ce trajet semble déjà présent dans le Dashboard. L'ajouter quand même ?")) return;
    }

    const newTrip = {
      ...record,
      id: `integrated-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tripType: "Intégré depuis Excel",
      importDate: new Date().toISOString()
    };
    setRecords(prev => [newTrip, ...prev]);
  };

  const handleAddSelectionToDashboard = () => {
    const toIntegrate = filteredRecords.filter(r => selectedIds.has(r.id));
    const newTrips = toIntegrate.map(r => ({
      ...r,
      id: `integrated-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tripType: "Intégré en masse"
    }));
    setRecords(prev => [...newTrips, ...prev]);
    setSelectedIds(new Set());
    alert(`${newTrips.length} trajets ajoutés au Dashboard !`);
  };

  const handleDeleteSingle = (id) => {
    if (window.confirm("Supprimer ce trajet du Dashboard ? (Note: Les trajets 'Régulier' Excel ne peuvent pas être supprimés ici, seulement masqués)")) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Supprimer DÉFINITIVEMENT les ${selectedIds.size} trajets sélectionnés du Dashboard ?`)) {
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    }
  };

  const startEdit = (record) => {
    setEditingId(record.id);
    setEditForm({ ...record });
  };

  const handleSaveEdit = () => {
    const gross = parseFloat(editForm.total_gross_cfa) || 0;
    const fuel = parseFloat(editForm.fuel_cost_cfa) || 0;
    const police = parseFloat(editForm.police_fees_cfa) || 0;
    const food = parseFloat(editForm.food_fees_cfa) || 0;
    const extra = parseFloat(editForm.other_expenses_cfa) || 0;
    const road = parseFloat(editForm.road_fees_cfa) || 0;
    const tonnage = parseFloat(editForm.tonnage) || 0;
    const dateObj = new Date(editForm.date);

    const totalExpense = fuel + road + police + food + extra;

    const updated = {
      ...editForm,
      tonnage,
      fuel_cost_cfa: fuel,
      road_fees_cfa: road,
      police_fees_cfa: police,
      food_fees_cfa: food,
      other_expenses_cfa: extra,
      total_gross_cfa: gross,
      total_expense_cfa: totalExpense,
      total_net_cfa: gross - totalExpense,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      km: parseFloat(editForm.km) || 0
    };

    setRecords(prev => prev.map(r => r.id === editingId ? updated : r));
    setEditingId(null);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditForm({
      id: `manual-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      driverLabel: chauffeurs[1] || "",
      start: "",
      destination: "",
      tonnage: 0,
      total_gross_cfa: 0,
      fuel_cost_cfa: 0,
      road_fees_cfa: 0,
      police_fees_cfa: 0,
      food_fees_cfa: 0,
      other_expenses_cfa: 0,
      km: 0,
      tripType: "Saisie Rapide"
    });
  };

  const handleSaveAdd = () => {
    const gross = parseFloat(editForm.total_gross_cfa) || 0;
    const fuel = parseFloat(editForm.fuel_cost_cfa) || 0;
    const police = parseFloat(editForm.police_fees_cfa) || 0;
    const food = parseFloat(editForm.food_fees_cfa) || 0;
    const extra = parseFloat(editForm.other_expenses_cfa) || 0;
    const road = parseFloat(editForm.road_fees_cfa) || 0;
    const tonnage = parseFloat(editForm.tonnage) || 0;
    const dateObj = new Date(editForm.date);

    const totalExpense = fuel + road + police + food + extra;

    const newTrip = {
      ...editForm,
      tonnage,
      total_gross_cfa: gross,
      total_expense_cfa: totalExpense,
      total_net_cfa: gross - totalExpense,
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear(),
      km: parseFloat(editForm.km) || 0
    };

    setRecords(prev => [...prev, newTrip]);
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] rounded-[30px] border border-white/5 overflow-hidden font-sans">
      
      {/* HEADER & FILTRES */}
      <header className="p-6 border-b border-white/5 bg-[#111] flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Zap className="size-5 text-[#cf5d56]" /> 
            Data & Inventory Manager
          </h2>
          <p className="text-xs text-white/40 mt-1">Gérez tout l'historique et ajoutez des trajets au Dashboard.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer">
            <option value="Tous">Sources (Toutes)</option>
            <option value="Excel">Fichiers Excel uniquement</option>
            <option value="Dashboard">Dashboard uniquement</option>
          </select>

          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer">
            <option value="Tous">Mois (Tous)</option>
            {MONTHS_FR.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
          </select>

          <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#cf5d56] font-bold outline-none cursor-pointer">
            <option value="Tous">Chauffeur (Tous)</option>
            {chauffeurs.filter(c => c !== "Tous les chauffeurs").map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {canEdit && (
            <button 
              onClick={startAdd}
              className="bg-[#cf5d56] hover:brightness-110 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-[#cf5d56]/20 transition-all flex items-center gap-2"
            >
              <Plus className="size-4" /> NOUVEAU TRAJET
            </button>
          )}
        </div>
      </header>

      {/* FORMULAIRE D'AJOUT DÉTAILLÉ */}
      {isAdding && (
        <div className="p-6 border-b border-[#cf5d56]/20 bg-[#cf5d56]/5 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Date</label>
              <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Chauffeur</label>
              <select value={editForm.driverLabel} onChange={e => setEditForm({...editForm, driverLabel: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white">
                {chauffeurs.filter(c => c !== "Tous les chauffeurs").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Départ</label>
              <input placeholder="Lauzoua" value={editForm.start} onChange={e => setEditForm({...editForm, start: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Arrivée</label>
              <input placeholder="San Pedro" value={editForm.destination} onChange={e => setEditForm({...editForm, destination: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Tonnage (T)</label>
              <input type="number" value={editForm.tonnage} onChange={e => setEditForm({...editForm, tonnage: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Recette (CFA)</label>
              <input type="number" value={editForm.total_gross_cfa} onChange={e => setEditForm({...editForm, total_gross_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-bold text-green-400" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1"><Fuel className="size-3"/> Fuel</label>
              <input type="number" value={editForm.fuel_cost_cfa} onChange={e => setEditForm({...editForm, fuel_cost_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1"><Anchor className="size-3"/> Route/Péage</label>
              <input type="number" value={editForm.road_fees_cfa} onChange={e => setEditForm({...editForm, road_fees_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1"><ShieldCheck className="size-3"/> Police</label>
              <input type="number" value={editForm.police_fees_cfa} onChange={e => setEditForm({...editForm, police_fees_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40 flex items-center gap-1"><Utensils className="size-3"/> Food</label>
              <input type="number" value={editForm.food_fees_cfa} onChange={e => setEditForm({...editForm, food_fees_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-white/40">Bonus/Extra</label>
              <input type="number" value={editForm.other_expenses_cfa} onChange={e => setEditForm({...editForm, other_expenses_cfa: e.target.value})} className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSaveAdd} className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-lg h-10 font-bold flex items-center justify-center gap-2">
                <Check className="size-4" /> Sauvegarder
              </button>
              <button onClick={() => setIsAdding(false)} className="px-3 bg-white/10 text-white rounded-lg h-10 flex items-center justify-center hover:bg-white/20">
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRE D'ACTION MULTIPLE */}
      {selectedIds.size > 0 && (
        <div className="bg-[#cf5d56]/10 border-b border-[#cf5d56]/20 px-6 py-3 flex items-center justify-between shrink-0 animate-in slide-in-from-top-2">
          <span className="text-[#cf5d56] font-bold text-sm flex items-center gap-2">
            <AlertCircle className="size-4" /> {selectedIds.size} trajet(s) sélectionné(s)
          </span>
          <div className="flex gap-3">
            <button onClick={handleAddSelectionToDashboard} className="bg-emerald-500 hover:brightness-110 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
              <Plus className="size-4" /> Ajouter au Dashboard
            </button>
            <button onClick={handleDeleteSelected} className="bg-[#cf5d56] hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#cf5d56]/20 transition-all flex items-center gap-2">
              <Trash2 className="size-4" /> Supprimer du Dashboard
            </button>
          </div>
        </div>
      )}

      {/* TABLEAU DES DONNÉES */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="w-full min-w-max">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#111] z-10 shadow-md">
              <tr className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                <th className="p-4 border-b border-white/5 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-white/40 hover:text-white transition-colors">
                    {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? <CheckSquare className="size-5 text-[#cf5d56]" /> : <Square className="size-5" />}
                  </button>
                </th>
                <th className="p-4 border-b border-white/5">Date</th>
                <th className="p-4 border-b border-white/5">Chauffeur</th>
                <th className="p-4 border-b border-white/5">Itinéraire</th>
                <th className="p-4 border-b border-white/5 text-center">KM</th>
                <th className="p-4 border-b border-white/5 text-center">Tonnage</th>
                <th className="p-4 border-b border-white/5 text-right">Recette</th>
                <th className="p-4 border-b border-white/5 text-center">Source</th>
                <th className="p-4 border-b border-white/5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-white/30 font-medium italic">Aucune donnée trouvée.</td>
                </tr>
              ) : (
                filteredRecords.map(row => {
                  const isEditing = editingId === row.id;
                  const isManual = row.tripType !== "Régulier";
                  
                  if (isEditing) {
                    return (
                      <tr key={row.id} className="bg-white/5">
                        <td className="p-4 text-center">---</td>
                        <td className="p-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white" /></td>
                        <td className="p-2">
                          <select value={editForm.driverLabel} onChange={e => setEditForm({...editForm, driverLabel: e.target.value})} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-white">
                            {chauffeurs.filter(c => c !== "Tous les chauffeurs").map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <input value={editForm.start} onChange={e => setEditForm({...editForm, start: e.target.value})} className="w-1/2 bg-black border border-white/20 rounded p-1 text-xs text-white" />
                            <input value={editForm.destination} onChange={e => setEditForm({...editForm, destination: e.target.value})} className="w-1/2 bg-black border border-white/20 rounded p-1 text-xs text-white" />
                          </div>
                        </td>
                        <td className="p-2"><input type="number" value={editForm.km} onChange={e => setEditForm({...editForm, km: e.target.value})} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-center text-white" /></td>
                        <td className="p-2"><input type="number" value={editForm.tonnage} onChange={e => setEditForm({...editForm, tonnage: e.target.value})} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-center text-white" /></td>
                        <td className="p-2"><input type="number" value={editForm.total_gross_cfa} onChange={e => setEditForm({...editForm, total_gross_cfa: e.target.value})} className="w-full bg-black border border-white/20 rounded p-1 text-xs text-right text-white font-bold text-green-400" /></td>
                        <td className="p-4 text-center text-[9px] uppercase font-bold text-white/20">En édition</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={handleSaveEdit} className="p-1.5 bg-green-500/20 text-green-500 rounded-md hover:bg-green-500 hover:text-white transition-all"><Save className="size-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-white/10 text-white rounded-md hover:bg-white/20 transition-all"><X className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id} className={`hover:bg-white/[0.02] transition-colors ${selectedIds.has(row.id) ? 'bg-[#cf5d56]/5' : ''}`}>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelect(row.id)} className="text-white/40 hover:text-[#cf5d56] transition-colors">
                          {selectedIds.has(row.id) ? <CheckSquare className="size-5 text-[#cf5d56]" /> : <Square className="size-5" />}
                        </button>
                      </td>
                      <td className="p-4 text-xs font-bold text-white">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 text-xs text-[#cf5d56] font-black tracking-wide">{row.driverLabel}</td>
                      <td className="p-4 text-xs text-white/70">{row.start} &rarr; {row.destination}</td>
                      <td className="p-4 text-xs font-mono text-center text-white/40">{row.km || '-'} Km</td>
                      <td className="p-4 text-xs font-mono text-white/50 bg-white/[0.02] text-center">{row.tonnage ? `${row.tonnage} T` : '-'}</td>
                      <td className="p-4 text-xs font-black text-white text-right bg-white/[0.02]">{(row.total_gross_cfa)?.toLocaleString('fr-FR')} CFA</td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isManual ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/30'}`}>
                          {isManual ? 'Dashboard' : 'Excel'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          {!isManual ? (
                            <button onClick={() => handleAddToDashboard(row)} title="Ajouter au Dashboard" className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                              <Plus className="size-4" />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => startEdit(row)} title="Modifier" className="p-2 text-white/20 hover:text-[#61d2c0] hover:bg-[#61d2c0]/10 rounded-lg transition-all">
                                <Edit3 className="size-4" />
                              </button>
                              <button onClick={() => handleDuplicateSingle(row)} title="Dupliquer" className="p-2 text-white/20 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all">
                                <Copy className="size-4" />
                              </button>
                              {canDelete && (
                                <button onClick={() => handleDeleteSingle(row.id)} title="Supprimer" className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
