import React, { useState, useMemo, useEffect } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  ExternalLink, 
  Filter, 
  Loader2, 
  Plus, 
  Search, 
  Trash2, 
  Wallet,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  MousePointer2,
  RefreshCcw,
  Sparkles,
  CheckSquare,
  Square,
  XCircle,
  Settings2
} from 'lucide-react';
import { ALL_CHAUFFEURS, ALL_MONTHS } from '../lib/dashboard';

const CATEGORIES = {
  "Entretien": ["Pneus", "Vidange", "Freins", "Moteur", "Carrosserie"],
  "Administratif": ["Assurance", "Visite Technique", "Patente", "Taxes"],
  "Sinistres": ["Accrochage", "Dépannage", "Vol"],
  "Dépenses Bureau": ["Loyer", "Électricité", "Internet"],
  "Dépenses Administratives": ["Impôt", "Assurance", "Document administratif", "Comptabilité"]
};

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const initialFormState = {
  date: new Date().toISOString().split('T')[0],
  driverLabel: "",
  amount: "",
  category: "",
  subCategory: "",
  description: "",
  manualDriveLink: ""
};

export default function ExpenseModule({ expenses, setExpenses, drivers, formatCurrency, onSync, isSyncing, t }) {
  // Global States
  const [formData, setFormData] = useState(initialFormState);
  const [file, setFile] = useState(null);
  const [justificationType, setJustificationType] = useState('upload'); // 'upload' | 'manual'
  const [isUploading, setIsUploading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // MISSION 2: Multi-select State
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  // 1. GAPI & GIS Initialization
  useEffect(() => {
    const loadScripts = () => {
      const script = document.createElement('script');
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
          } catch (err) {
            console.error("GAPI init error:", err);
          }
        });
      };
      document.head.appendChild(script);
    };

    if (CLIENT_ID && API_KEY) loadScripts();
  }, []);

  const isApiConfigured = !!(CLIENT_ID && API_KEY);

  // 2. Google Drive Engine
  const handleCloudUpload = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    if (!file) { alert("Veuillez d'abord sélectionner un fichier."); return; }
    if (!isApiConfigured) { setError("API Google non configurée."); return; }
    setIsUploading(true);

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            const metadata = { name: `Facture_${formData.category}_${formData.date}`, mimeType: file.type };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
              method: 'POST',
              headers: new Headers({ 'Authorization': 'Bearer ' + response.access_token }),
              body: form
            });

            const driveData = await uploadResponse.json();
            setFormData(prev => ({ ...prev, manualDriveLink: driveData.webViewLink }));
            setSuccess("Justificatif uploadé !");
            setTimeout(() => setSuccess(null), 3000);
            setIsUploading(false);
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newExpense = {
      id: crypto.randomUUID(),
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      justificationType,
      createdAt: new Date().toISOString()
    };
    setExpenses([newExpense, ...expenses]);
    setFormData(initialFormState);
    setFile(null);
    setSuccess("Dépense enregistrée.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // 4. Filters
  const [filterMonth, setFilterMonth] = useState(ALL_MONTHS);
  const [filterDriver, setFilterDriver] = useState(ALL_CHAUFFEURS);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchMonth = filterMonth === ALL_MONTHS || (e.date && e.date.startsWith(filterMonth));
      const matchDriver = filterDriver === ALL_CHAUFFEURS || e.driverLabel === filterDriver;
      return matchMonth && matchDriver;
    });
  }, [expenses, filterMonth, filterDriver]);

  const months = useMemo(() => {
    const m = new Set();
    expenses.forEach(e => e.date && m.add(e.date.substring(0, 7)));
    return Array.from(m).sort().reverse();
  }, [expenses]);

  // MISSION 2: Bulk Actions Logic
  const handleToggleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedExpenses(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Supprimer les ${selectedExpenses.length} dépenses sélectionnées ?`)) {
      setExpenses(expenses.filter(e => !selectedExpenses.includes(e.id)));
      setSelectedExpenses([]);
      setSuccess("Suppression de masse effectuée.");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleBulkEdit = () => {
    console.log("Bulk Edit for:", selectedExpenses);
    alert("Fonctionnalité d'édition groupée en cours de développement.");
  };

  return (
    <div className="space-y-6 text-white animate-in fade-in duration-700 relative">
      
      {/* MISSION 2: CONTEXTUAL TOOLBAR */}
      {selectedExpenses.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] border border-[#cf5d56]/30 px-8 py-4 rounded-[25px] shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-10 backdrop-blur-2xl">
          <div className="flex items-center gap-3 pr-8 border-r border-white/10">
            <div className="size-8 bg-[#cf5d56] rounded-full flex items-center justify-center text-white font-black text-xs">
              {selectedExpenses.length}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Éléments sélectionnés</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBulkEdit}
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl text-[10px] font-bold uppercase transition-all text-blue-400"
            >
              <Settings2 className="size-4" /> Modifier
            </button>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all border border-red-500/20"
            >
              <Trash2 className="size-4" /> Supprimer la sélection
            </button>
            <button 
              onClick={() => setSelectedExpenses([])}
              className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all"
            >
              <XCircle className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818]/50 p-6 rounded-[30px] border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-[#cf5d56]/10 flex items-center justify-center border border-[#cf5d56]/20">
            <Wallet className="size-8 text-[#cf5d56]" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 uppercase">
              {t?.cloudExpenses || "Dépenses Cloud"}
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{t?.gedArchiving || "G.E.D & Archivage Numérique"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-3 px-6 py-3 bg-[#cf5d56] hover:bg-[#cf5d56]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#cf5d56]/20 transition-all active:scale-95"
          >
            {isSyncing ? <RefreshCcw className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            {isSyncing ? (t?.syncingInProgress || "Sync en cours...") : (t?.syncMaintenance || "Sync Maintenance")}
          </button>
          <div className="flex items-center gap-3 px-4 py-3 bg-black/40 rounded-2xl border border-white/5">
            <div className={`size-2 rounded-full ${accessToken ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-white/60">Cloud {accessToken ? "OK" : "Ready"}</span>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3"><AlertCircle className="size-5" /><p className="text-sm font-medium">{error}</p></div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3"><CheckCircle2 className="size-5" /><p className="text-sm font-medium">{success}</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORM */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#181818] border border-white/5 rounded-[30px] p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2"><Plus className="text-[#cf5d56]" /> {t?.expenseEntry || "Saisie Dépense"}</h3>
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
                <input type="number" required placeholder={t?.amount || "Montant"} value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#cf5d56]" />
              </div>
              <select required value={formData.driverLabel} onChange={e => setFormData({ ...formData, driverLabel: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#cf5d56]">
                <option value="">{t?.driver || "Chauffeur"}...</option>
                {drivers.map(d => <option key={d.id} value={`${d.sdv} (${d.name})`}>{d.sdv} - {d.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <select 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: "" })} 
                  className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#cf5d56]"
                >
                  <option value="">{t?.category || "Catégorie"}...</option>
                  {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <select 
                  required 
                  disabled={!formData.category}
                  value={formData.subCategory} 
                  onChange={e => setFormData({ ...formData, subCategory: e.target.value })} 
                  className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#cf5d56] disabled:opacity-30"
                >
                  <option value="">{t?.subCategory || "Sous-catégorie"}...</option>
                  {formData.category && CATEGORIES[formData.category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>

              <textarea placeholder="Description..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm outline-none focus:border-[#cf5d56] min-h-[80px]" />
              <button type="submit" className="w-full bg-white text-black hover:bg-[#cf5d56] hover:text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest">{t?.validate || "Valider"}</button>
            </form>
          </div>
        </div>

        {/* LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#181818] border border-white/5 rounded-[30px] p-8 shadow-2xl min-h-[600px] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <h3 className="text-xl font-bold">{t?.archivedHistory || "Historique Archivé"}</h3>
              <div className="flex items-center gap-3">
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none"><option value={ALL_MONTHS}>{t?.allMonths || "Tous les mois"}</option>{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none"><option value={ALL_CHAUFFEURS}>{t?.allDrivers || "Tous les chauffeurs"}</option>{drivers.map(d => <option key={d.id} value={`${d.sdv} (${d.name})`}>{d.name}</option>)}</select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20">
                    <th className="pb-4 pl-6 w-10">
                      <button onClick={handleToggleSelectAll} className="p-1 hover:bg-white/5 rounded transition-all">
                        {selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0 ? <CheckSquare className="size-4 text-[#cf5d56]" /> : <Square className="size-4" />}
                      </button>
                    </th>
                    <th className="pb-4">{t?.identification || "Identification"}</th>
                    <th className="pb-4">{t?.comments || "Description"}</th>
                    <th className="pb-4 text-right">{t?.amount || "Montant"}</th>
                    <th className="pb-4 text-center">G.E.D</th>
                    <th className="pb-4 pr-6 text-right">{t?.actions || "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className={`group ${selectedExpenses.includes(expense.id) ? "bg-[#cf5d56]/5 border-[#cf5d56]/20" : "bg-white/[0.02]"} hover:bg-white/[0.05] transition-all`}>
                      <td className="py-5 pl-6 rounded-l-[20px] border-y border-l border-white/5">
                        <button onClick={() => handleToggleSelect(expense.id)} className="p-1 hover:bg-white/5 rounded transition-all">
                          {selectedExpenses.includes(expense.id) ? <CheckSquare className="size-4 text-[#cf5d56]" /> : <Square className="size-4 opacity-30 group-hover:opacity-100" />}
                        </button>
                      </td>
                      <td className="py-5 border-y border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black">{expense.date}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-[#cf5d56] uppercase bg-[#cf5d56]/10 px-1.5 py-0.5 rounded-md">{expense.category}</span>
                            <span className="text-[10px] font-bold text-white/30 uppercase">{expense.subCategory}</span>
                          </div>
                          <span className="text-[10px] font-bold text-white/20 uppercase mt-0.5">{expense.driverLabel}</span>
                        </div>
                      </td>
                      <td className="py-5 border-y border-white/5 max-w-[200px]">
                        <p className="text-[10px] text-white/60 line-clamp-2 italic">{expense.description}</p>
                      </td>
                      <td className="py-5 border-y border-white/5 text-right font-mono font-black text-white/90">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-5 border-y border-white/5 text-center">
                        {expense.driveLink ? (
                          <a href={expense.driveLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center size-9 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"><ExternalLink className="size-4" /></a>
                        ) : <FileText className="size-4 opacity-10 mx-auto" />}
                      </td>
                      <td className="py-5 pr-6 rounded-r-[20px] border-y border-r border-white/5 text-right">
                        <button onClick={() => { if(confirm("Supprimer ?")) setExpenses(expenses.filter(e => e.id !== expense.id)); }} className="p-2 text-white/10 hover:text-red-500 rounded-lg transition-all"><Trash2 className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
