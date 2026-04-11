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
  MousePointer2
} from 'lucide-react';

const CATEGORIES = {
  "Entretien": ["Pneus", "Vidange", "Freins", "Moteur", "Carrosserie"],
  "Administratif": ["Assurance", "Visite Technique", "Patente", "Taxes"],
  "Sinistres": ["Accrochage", "Dépannage", "Vol"]
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

export default function ExpenseModule({ expenses, setExpenses, drivers, formatCurrency }) {
  // Global States
  const [formData, setFormData] = useState(initialFormState);
  const [file, setFile] = useState(null);
  const [justificationType, setJustificationType] = useState('upload'); // 'upload' | 'manual'
  const [isUploading, setIsUploading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
            console.log("GAPI Client initialized");
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

  // 2. Google Drive Engine (Auth + Upload)
  const handleCloudUpload = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!file) {
      alert("Veuillez d'abord sélectionner un fichier.");
      return;
    }

    if (!isApiConfigured) {
      setError("API Google non configurée dans le fichier .env");
      return;
    }

    setIsUploading(true);

    try {
      // Step A: Get Access Token via GIS
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            
            // Step B: Multipart Upload to Drive
            const metadata = {
              name: `Facture_${formData.category || 'SansCat'}_${formData.date}_${Date.now()}`,
              mimeType: file.type,
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
              method: 'POST',
              headers: new Headers({ 'Authorization': 'Bearer ' + response.access_token }),
              body: form
            });

            if (!uploadResponse.ok) throw new Error("Échec de l'envoi vers Google Drive.");

            const driveData = await uploadResponse.json();
            
            // Step C: Update Form State with the new link
            setFormData(prev => ({ ...prev, manualDriveLink: driveData.webViewLink }));
            setSuccess("Justificatif uploader avec succès sur le Cloud !");
            setTimeout(() => setSuccess(null), 3000);
            setIsUploading(false);
          } else {
            throw new Error("Authentification Google annulée ou échouée.");
          }
        },
      });
      client.requestAccessToken();
    } catch (err) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  // 3. Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.manualDriveLink && justificationType === 'manual') {
      setError("Veuillez fournir un lien vers le justificatif.");
      return;
    }

    const newExpense = {
      id: crypto.randomUUID(),
      ...formData,
      amount: parseFloat(formData.amount) || 0,
      justificationType,
      createdAt: new Date().toISOString()
    };

    setExpenses([newExpense, ...expenses]);
    
    // RESET STRICT
    setFormData(initialFormState);
    setFile(null);
    setSuccess("Dépense enregistrée dans le système.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // 4. Filters & Logic
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterDriver, setFilterDriver] = useState('ALL');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchMonth = filterMonth === 'ALL' || (e.date && e.date.startsWith(filterMonth));
      const matchDriver = filterDriver === 'ALL' || e.driverLabel === filterDriver;
      return matchMonth && matchDriver;
    });
  }, [expenses, filterMonth, filterDriver]);

  const months = useMemo(() => {
    const m = new Set();
    expenses.forEach(e => e.date && m.add(e.date.substring(0, 7)));
    return Array.from(m).sort().reverse();
  }, [expenses]);

  return (
    <div className="space-y-6 text-white animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818]/50 p-6 rounded-[30px] border border-white/5 backdrop-blur-xl">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Wallet className="size-8 text-[#cf5d56]" />
            GESTION DES DÉPENSES <span className="text-[#cf5d56]">CLOUD</span>
          </h2>
          <p className="text-white/40 text-sm font-medium uppercase tracking-widest">G.E.D & Archivage Numérique v3.0</p>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-full border border-white/5">
          <div className={`size-2 rounded-full ${accessToken ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
          <span className="text-[10px] font-bold uppercase tracking-tighter text-white/60">
            {accessToken ? "Moteur Cloud Connecté" : "Moteur Cloud Prêt"}
          </span>
        </div>
      </div>

      {/* FEEDBACKS */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertCircle className="size-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="size-5" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#181818] border border-white/5 rounded-[30px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <CloudUpload className="size-32" />
            </div>

            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Plus className="text-[#cf5d56]" />
              Saisie Dépense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ""}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Montant (CFA)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={formData.amount || ""}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Chauffeur Responsable</label>
                <select
                  required
                  value={formData.driverLabel || ""}
                  onChange={e => setFormData({ ...formData, driverLabel: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all appearance-none"
                >
                  <option value="">Choisir un chauffeur...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={`${d.sdv} (${d.name})`}>{d.sdv} - {d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Catégorie</label>
                  <select
                    required
                    value={formData.category || ""}
                    onChange={e => setFormData({ ...formData, category: e.target.value, subCategory: "" })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all"
                  >
                    <option value="">Sélection...</option>
                    {Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Sous-Type</label>
                  <select
                    required
                    disabled={!formData.category}
                    value={formData.subCategory || ""}
                    onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all disabled:opacity-20"
                  >
                    <option value="">Sélection...</option>
                    {formData.category && CATEGORIES[formData.category].map(sc => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/30 uppercase ml-1">Notes / Description</label>
                <textarea
                  placeholder="Détails de l'intervention..."
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:border-[#cf5d56] outline-none transition-all min-h-[100px] resize-none"
                />
              </div>

              {/* JUSTIFICATION SYSTEM */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setJustificationType('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${
                      justificationType === 'upload' ? "bg-[#cf5d56] text-white shadow-lg" : "text-white/30 hover:text-white"
                    }`}
                  >
                    <CloudUpload className="size-4" />
                    Upload Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setJustificationType('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${
                      justificationType === 'manual' ? "bg-[#cf5d56] text-white shadow-lg" : "text-white/30 hover:text-white"
                    }`}
                  >
                    <LinkIcon className="size-4" />
                    Lien Manuel
                  </button>
                </div>

                {justificationType === 'upload' ? (
                  <div className="space-y-3 p-4 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={e => setFile(e.target.files[0])}
                      className="block w-full text-xs text-white/40 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#cf5d56]/10 file:text-[#cf5d56] hover:file:bg-[#cf5d56]/20 cursor-pointer"
                    />
                    
                    <button
                      type="button"
                      disabled={isUploading || !file}
                      onClick={handleCloudUpload}
                      className="w-full relative z-20 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
                    >
                      {isUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Cloud className="size-4" />
                      )}
                      {isUploading ? "Transfert en cours..." : "Lancer l'Upload Google Drive"}
                    </button>

                    {formData.manualDriveLink && (
                      <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Fichier lié avec succès
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={formData.manualDriveLink || ""}
                      onChange={e => setFormData({ ...formData, manualDriveLink: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[#cf5d56] outline-none transition-all"
                    />
                    <p className="text-[9px] text-white/20 italic px-2 italic">Collez l'URL de partage Google Drive ici.</p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-white text-black hover:bg-[#cf5d56] hover:text-white font-black py-5 rounded-[20px] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-tighter"
              >
                <Plus className="size-5" />
                Valider la Dépense
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: LIST */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#181818] border border-white/5 rounded-[30px] p-8 shadow-2xl min-h-[600px] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <h3 className="text-xl font-bold">Historique Archivé</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#cf5d56]" />
                  <select
                    value={filterMonth || ""}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#cf5d56] transition-all"
                  >
                    <option value="ALL">Tous les mois</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#cf5d56]" />
                  <select
                    value={filterDriver || ""}
                    onChange={e => setFilterDriver(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#cf5d56] transition-all"
                  >
                    <option value="ALL">Tous les chauffeurs</option>
                    {drivers.map(d => (
                      <option key={d.id} value={`${d.sdv} (${d.name})`}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-[0.2em] text-white/20">
                    <th className="pb-4 pl-6">Identification</th>
                    <th className="pb-4">Classification</th>
                    <th className="pb-4 text-right">Montant</th>
                    <th className="pb-4 text-center">G.E.D</th>
                    <th className="pb-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="group bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                      <td className="py-5 pl-6 rounded-l-[20px] border-y border-l border-white/5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black tracking-tight">{expense.date}</span>
                          <span className="text-[10px] font-bold text-white/30 uppercase">{expense.driverLabel}</span>
                        </div>
                      </td>
                      <td className="py-5 border-y border-white/5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-[#cf5d56] uppercase tracking-widest">{expense.category}</span>
                          <span className="text-[10px] font-medium text-white/40 italic">{expense.subCategory}</span>
                        </div>
                      </td>
                      <td className="py-5 border-y border-white/5 text-right font-mono font-black text-white/90">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-5 border-y border-white/5 text-center">
                        {expense.manualDriveLink ? (
                          <a
                            href={expense.manualDriveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-10 rounded-2xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                            title="Ouvrir le justificatif Drive"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : (
                          <div className="size-10 mx-auto rounded-2xl bg-white/5 flex items-center justify-center opacity-20">
                            <FileText className="size-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-5 pr-6 rounded-r-[20px] border-y border-r border-white/5 text-right">
                        <button
                          onClick={() => { if(confirm("Supprimer cette archive ?")) setExpenses(expenses.filter(e => e.id !== expense.id)); }}
                          className="p-3 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-32 text-center opacity-20">
                        <Wallet className="size-16 mx-auto mb-6" />
                        <p className="text-xs font-black uppercase tracking-[0.3em]">Aucun enregistrement</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MINI SUMMARY WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
              <div className="bg-black/40 border border-white/5 rounded-[25px] p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Consommé</p>
                  <h4 className="text-2xl font-black text-[#cf5d56]">
                    {formatCurrency(filteredExpenses.reduce((sum, e) => sum + e.amount, 0))}
                  </h4>
                </div>
                <div className="size-12 bg-[#cf5d56]/10 rounded-2xl flex items-center justify-center text-[#cf5d56]">
                  <Wallet className="size-6" />
                </div>
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-[25px] p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Taux Archivage</p>
                  <h4 className="text-2xl font-black text-blue-400">
                    {filteredExpenses.filter(e => e.manualDriveLink).length} / {filteredExpenses.length} <span className="text-[10px] text-white/20">Docs</span>
                  </h4>
                </div>
                <div className="size-12 bg-blue-400/10 rounded-2xl flex items-center justify-center text-blue-400">
                  <Cloud className="size-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
