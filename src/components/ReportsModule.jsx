import { useState, useMemo } from 'react';
import { Trash2, Filter, AlertCircle, CheckSquare, Square } from 'lucide-react';

export function ReportsModule({ records = [], setRecords, chauffeurs = [], canDelete = false }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterMonth, setFilterMonth] = useState("Tous");
  const [filterYear, setFilterYear] = useState("Toutes");
  const [filterDriver, setFilterDriver] = useState("Tous");

  // Extraire les années uniques
  const years = useMemo(() => {
    const y = new Set(records.map(r => r.year).filter(Boolean));
    return ["Toutes", ...Array.from(y).sort((a, b) => b - a)];
  }, [records]);

  // Filtrage robuste (La variable qui causait le bug est fixée ici)
  const filteredRecords = useMemo(() => {
    return records.filter(t => {
      const matchDriver = filterDriver === "Tous" || String(t.driverLabel || "").trim() === String(filterDriver).trim();
      const matchMonth = filterMonth === "Tous" || String(t.month) === String(filterMonth);
      const matchYear = filterYear === "Toutes" || String(t.year) === String(filterYear);
      return matchDriver && matchMonth && matchYear;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [records, filterDriver, filterMonth, filterYear]);

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

  const handleDeleteSingle = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce trajet ? Le Dashboard sera mis à jour.")) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Supprimer DÉFINITIVEMENT les ${selectedIds.size} trajets sélectionnés ?`)) {
      setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] rounded-[30px] border border-white/5 overflow-hidden font-sans">
      
      {/* HEADER & FILTRES */}
      <header className="p-6 border-b border-white/5 bg-[#111] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Filter className="size-5 text-[#cf5d56]" /> 
            Data Control Center
          </h2>
          <p className="text-xs text-white/40 mt-1">Gérez, filtrez et supprimez vos données. {filteredRecords.length} trajets affichés.</p>
        </div>

        <div className="flex items-center gap-3">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none cursor-pointer">
            <option value="Tous">Mois (Tous)</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>

          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y === "Toutes" ? "Années (Toutes)" : y}</option>)}
          </select>

          <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#cf5d56] font-bold outline-none cursor-pointer">
            <option value="Tous">Chauffeurs (Tous)</option>
            {chauffeurs.filter(c => c !== "Tous les chauffeurs").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </header>

      {/* BARRE D'ACTION MULTIPLE */}
      {canDelete && selectedIds.size > 0 && (
        <div className="bg-[#cf5d56]/10 border-b border-[#cf5d56]/20 px-6 py-3 flex items-center justify-between shrink-0 animate-in slide-in-from-top-2">
          <span className="text-[#cf5d56] font-bold text-sm flex items-center gap-2">
            <AlertCircle className="size-4" /> {selectedIds.size} trajet(s) sélectionné(s)
          </span>
          <button onClick={handleDeleteSelected} className="bg-[#cf5d56] hover:bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#cf5d56]/20 transition-all flex items-center gap-2">
            <Trash2 className="size-4" /> Supprimer la sélection
          </button>
        </div>
      )}

      {/* TABLEAU DES DONNÉES */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="w-full min-w-max">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#111] z-10 shadow-md">
              <tr>
                {canDelete && (
                  <th className="p-4 border-b border-white/5 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-white/40 hover:text-white transition-colors">
                      {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? <CheckSquare className="size-5 text-[#cf5d56]" /> : <Square className="size-5" />}
                    </button>
                  </th>
                )}
                <th className="p-4 border-b border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">Date</th>
                <th className="p-4 border-b border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">Chauffeur</th>
                <th className="p-4 border-b border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">Itinéraire</th>
                <th className="p-4 border-b border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest">Tonnage</th>
                <th className="p-4 border-b border-white/5 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Montant Brut</th>
                {canDelete && <th className="p-4 border-b border-white/5 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 5} className="p-12 text-center text-white/30 font-medium">Aucun trajet ne correspond à vos critères.</td>
                </tr>
              ) : (
                filteredRecords.map(row => (
                  <tr key={row.id} className={`hover:bg-white/[0.02] transition-colors ${selectedIds.has(row.id) ? 'bg-[#cf5d56]/5' : ''}`}>
                    {canDelete && (
                      <td className="p-4 text-center">
                        <button onClick={() => toggleSelect(row.id)} className="text-white/40 hover:text-[#cf5d56] transition-colors">
                          {selectedIds.has(row.id) ? <CheckSquare className="size-5 text-[#cf5d56]" /> : <Square className="size-5" />}
                        </button>
                      </td>
                    )}
                    <td className="p-4 text-xs font-bold text-white">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-xs text-[#cf5d56] font-black tracking-wide">{row.driverLabel}</td>
                    <td className="p-4 text-xs text-white/70">{row.start} &rarr; {row.destination}</td>
                    <td className="p-4 text-xs font-mono text-white/50 bg-white/[0.02]">{row.tonnage ? `${row.tonnage} T` : '-'}</td>
                    <td className="p-4 text-xs font-black text-white text-right bg-white/[0.02]">{(row.total_gross_cfa)?.toLocaleString('fr-FR')} CFA</td>
                    {canDelete && (
                      <td className="p-4 text-center">
                        <button onClick={() => handleDeleteSingle(row.id)} className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
