import { useState, useMemo } from 'react';
import { 
  Wrench, Plus, Trash2, Edit2, Save, X, Calendar, Truck, Info,
  Image as ImageIcon, ExternalLink, Sparkles, Loader2, CheckCircle2,
  FolderOpen, Eye, FileText, RotateCcw
} from 'lucide-react';
import { ALL_CHAUFFEURS } from '../lib/dashboard';
import { translateComment } from '../utils/i18n';
import { isSalaryRecord } from '../utils/salaryFilter';
import { MaintenanceLog } from './MaintenanceLog';


// Helper extraction Google Drive
function getDriveId(link) {
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

function getDriveEmbedUrl(link) {
  if (!link) return null;
  if (link.includes("/folders/")) return null;
  const id = getDriveId(link);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function MaintenanceAdminModule({ 
  records = [], 
  setRecords, 
  expenseRecords = [],
  accountingTransactions = [],
  drivers = [], 
  googleClientId, 
  oilChanges = {}, 
  setOilChanges, 
  onSync, 
  isSyncing,
  t, // Ajout des traductions
  language = 'FR'
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [debugKey, setDebugKey] = useState('');
  const [pendingAI, setPendingAI] = useState([]);
  const [activeTab, setActiveTab] = useState('maintenance');

  // Filtres fluides et recherche
  const [selectedTruck, setSelectedTruck] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState(null);

  // État du formulaire de saisie manuelle (évite tout crash ReferenceError)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle: 'AMARA TRUCK 76',
    description: '',
    cost: '',
    imageUrl: '',
    workPhotos: []
  });

  // Local state for oil change inputs to allow explicit saving
  const [oilChangeInputs, setOilChangeInputs] = useState({});

  const extractFolderId = (url) => {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    const fileMatch = url.match(/[-\w]{25,}/);
    return match ? match[1] : (fileMatch ? fileMatch[0] : null);
  };

  const getBase64FromDrive = async (fileId, token) => {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch (e) { return null; }
  };

  const handleDriveFolderAnalysis = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) { alert("Lien Drive invalide."); return; }
    setIsAnalyzing(true);

    try {
      const tokenResponse = await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/drive.readonly",
          callback: (res) => resolve(res),
          error_callback: (err) => reject(err)
        });
        client.requestAccessToken();
      });

      const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`;
      const listRes = await fetch(listUrl, { headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` } });
      const listData = await listRes.json();
      const files = listData.files || [];
      
      const validFiles = files.filter(f => f.mimeType.startsWith('image/') || f.mimeType === 'application/pdf').slice(0, 5);
      if (validFiles.length === 0) throw new Error("Aucune image ou PDF trouvé.");

      const imageDataArray = (await Promise.all(validFiles.map(async (f) => {
        const b64 = await getBase64FromDrive(f.id, tokenResponse.access_token);
        if (!b64) return null;
        return { 
          id: f.id, name: f.name, mime: f.mimeType, b64, 
          display: `data:${f.mimeType};base64,${b64}` 
        };
      }))).filter(Boolean);

      const promptText = "Voici des fichiers (images ou PDF) d'un dossier de maintenance. L'un d'eux est la facture. Identifie-le et extrais en JSON : { \"invoiceFileName\": \"nom\", \"date\": \"YYYY-MM-DD\", \"vehicle\": \"AMARA TRUCK 76, BRAHIMA TRUCK 45 ou SORO TRUCK 52\", \"description\": \"...\", \"cost\": 0 }. Réponds uniquement en JSON.";

      const aiResponse = await fetch('http://localhost:8787/api/analyze-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: imageDataArray,
          prompt: promptText
        })
      });

      if (!aiResponse.ok) throw new Error("Erreur IA");

      const aiData = await aiResponse.json();
      const extracted = aiData.parsed || JSON.parse(aiData.text.trim());
      const usedImage = imageDataArray.find(img => img.name === extracted.invoiceFileName) || imageDataArray[0];

      setPendingAI([{
        id: `pending-${Date.now()}`,
        ...extracted,
        invoiceUrl: usedImage.display,
        isPdf: usedImage.mime === 'application/pdf',
        workPhotos: imageDataArray.filter(img => img.id !== usedImage.id).map(img => img.display),
        folderUrl: driveUrl
      }, ...pendingAI]);

      setDriveUrl('');
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const approveAI = (id) => {
    const item = pendingAI.find(p => p.id === id);
    if (!item) return;
    if (isSalaryRecord(item)) {
      alert(language === 'EN' 
        ? "This invoice is detected as a salary payment. It must be recorded under Expenses > Salaries & Wages, not under Workshop Maintenance." 
        : "Cette facture correspond à une dépense salariale. Elle doit être enregistrée dans les Dépenses sous Salaires & Rémunérations, et non en Maintenance Atelier.");
      return;
    }
    setRecords([{
      id: `maint-${Date.now()}`,
      date: item.date,
      vehicle: item.vehicle,
      description: item.description,
      cost: parseFloat(item.cost) || 0,
      imageUrl: item.invoiceUrl === 'pdf' ? null : item.invoiceUrl,
      isPdf: item.isPdf,
      workPhotos: item.workPhotos || [],
      folderUrl: item.folderUrl
    }, ...records]);
    setPendingAI(pendingAI.filter(p => p.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'maintenance' && isSalaryRecord(formData)) {
      alert(language === 'EN' 
        ? "Salaries must not be entered under maintenance, but under Salary Expenses (Frais Salariaux)." 
        : "Les dépenses salariales ne doivent pas être saisies en maintenance, mais dans les Frais Salariaux (Salaires & Rémunérations).");
      return;
    }
    const record = { ...formData, id: editingId || `maint-${Date.now()}`, cost: parseFloat(formData.cost) || 0 };
    if (editingId) { setRecords(records.map(r => r.id === editingId ? record : r)); setEditingId(null); }
    else { setRecords([record, ...records]); setIsAdding(false); }
    setFormData({ date: new Date().toISOString().split('T')[0], vehicle: vehicleOptions[0], description: '', cost: '', imageUrl: '', workPhotos: [] });
  };

  const handleEdit = (record) => {
    setFormData({ date: record.date, vehicle: record.vehicle, description: record.description, cost: record.cost.toString(), imageUrl: record.imageUrl || '', workPhotos: record.workPhotos || [] });
    setEditingId(record.id); setIsAdding(true);
  };

  const handleOilChangeUpdate = (truck, mileage) => {
    if (!setOilChanges) return;
    const val = parseFloat(mileage) || 0;
    setOilChanges({
      ...oilChanges,
      [truck]: { 
        mileage: val,
        date: new Date().toISOString().split('T')[0]
      }
    });
    alert(`${t?.oilChangeUpdated || "Vidange mise à jour"} : ${truck}`);
  };

  const handleDelete = (id) => { if (window.confirm(t?.confirmDelete || "Supprimer ?")) setRecords(records.filter(r => r.id !== id)); };

  const vehicleOptions = drivers.map(d => `${d.name} ${d.sdv}`);

  const baseRecords = activeTab === 'maintenance' 
    ? (records || []).filter(r => !isSalaryRecord(r)) 
    : expenseRecords;

  const filteredRecords = useMemo(() => {
    return (baseRecords || []).filter(row => {
      // Filtre camion
      if (selectedTruck !== 'ALL') {
        const v = String(row.vehicle || row.driverLabel || "").toUpperCase();
        if (!v.includes(selectedTruck)) return false;
      }
      // Filtre catégorie
      if (categoryFilter !== 'ALL') {
        const desc = String(row.description || "").toLowerCase();
        if (categoryFilter === 'salaires' && !isSalaryRecord(row)) return false;
        if (categoryFilter === 'vidange' && !desc.includes('vidange') && !desc.includes('huile')) return false;
        if (categoryFilter === 'pneu' && !desc.includes('pneu') && !desc.includes('roue')) return false;
        if (categoryFilter === 'mecanique' && !desc.includes('pièce') && !desc.includes('disque') && !desc.includes('frein') && !desc.includes('moteur') && !desc.includes('filtre')) return false;
        if (categoryFilter === 'drive' && !row.driveLink && !row.imageUrl && (!row.workPhotos || row.workPhotos.length === 0)) return false;
      }
      // Filtre recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const v = String(row.vehicle || row.driverLabel || "").toLowerCase();
        const d = String(row.description || "").toLowerCase();
        const cost = String(row.cost || row.amount || "");
        const date = String(row.date || "");
        if (!v.includes(q) && !d.includes(q) && !cost.includes(q) && !date.includes(q)) return false;
      }
      return true;
    });
  }, [baseRecords, selectedTruck, categoryFilter, searchQuery]);

  const totalCost = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.cost || r.amount) || 0), 0);
  }, [filteredRecords]);

  const displayRecords = filteredRecords;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Wrench className="size-6" /></div>
            {t?.workshopFinances || "Atelier & Finances"}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-white/40 text-sm">{t?.iaDriveExplorer || "Gestion IA & Drive Explorer"}</p>
            <input type="password" placeholder="Debug Key..." value={debugKey} onChange={e => setDebugKey(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[9px] w-32 outline-none focus:border-orange-500/50" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-black/40 border border-white/5 p-1 rounded-2xl mr-4">
            <button 
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'maintenance' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/20 hover:text-white/40'}`}
            >
              {t?.maintenance || "Maintenances"}
            </button>
            <button 
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'expenses' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/20 hover:text-white/40'}`}
            >
              {t?.expenses || "Dépenses"}
            </button>
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2.5 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
          >
            {isSyncing ? <RotateCcw className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            {isSyncing ? (t?.syncing || "Synchronisation...") : "Sync Spreadsheet"}
          </button>
          
          <button onClick={() => setIsAdding(true)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10">
            <Plus className="size-4" /> 
            {t?.manualEntry || "Saisie manuelle"}
          </button>
        </div>
      </header>

      {/* CONFIGURATION VIDANGE */}
      {activeTab === 'maintenance' && (
        <section className="panel-enter rounded-[30px] border border-orange-500/20 bg-[#111] p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><RotateCcw className="size-5" /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">{t?.oilChangeTracking || "Suivi des Vidanges (Intervalle 10,000 KM)"}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {drivers.map(d => {
              const truckLabel = `${d.name} ${d.sdv}`;
              const current = oilChanges[truckLabel] || { mileage: 0, date: null };
              const currentInput = oilChangeInputs[truckLabel] !== undefined ? oilChangeInputs[truckLabel] : current.mileage;

              return (
                <div key={d.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-white/70">{truckLabel}</p>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-white/20 uppercase">{t?.lastService || "Dernier Service"}</p>
                      <p className="text-[8px] font-bold text-orange-500/50">{current.date ? new Date(current.date).toLocaleDateString('fr-FR') : '---'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="KM..." 
                      value={currentInput || ''}
                      onChange={(e) => setOilChangeInputs({...oilChangeInputs, [truckLabel]: e.target.value})}
                      className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all font-bold"
                    />
                    <button 
                      onClick={() => handleOilChangeUpdate(truckLabel, currentInput)}
                      className="h-10 px-3 flex items-center justify-center rounded-xl bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-lg shadow-orange-500/5 font-black text-[10px] uppercase"
                    >
                      {t?.save || "OK"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel-enter rounded-[30px] border border-blue-500/20 bg-[#111] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><FolderOpen className="size-5" /></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">
            {language === 'EN' ? "Explore Drive Folder (AI)" : "Explorer un dossier Drive (IA)"}
          </h3>
        </div>
        <div className="flex gap-3">
          <input 
            type="url" 
            placeholder={language === 'EN' ? "Google Drive folder link..." : "Lien dossier Google Drive..."} 
            value={driveUrl} 
            onChange={(e) => setDriveUrl(e.target.value)} 
            className="flex-1 h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-blue-500/50" 
          />
          <button onClick={handleDriveFolderAnalysis} disabled={isAnalyzing || !driveUrl} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white px-6 rounded-2xl text-sm font-black transition-all flex items-center gap-2">
            {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {language === 'EN' ? "Explore" : "Explorer"}
          </button>
        </div>

        {pendingAI.map((item) => (
          <div key={item.id} className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-[24px] p-5 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-48 shrink-0">
                <p className="text-[9px] font-bold text-white/30 uppercase mb-2">
                  {language === 'EN' ? "Identified Invoice" : "Facture identifiée"}
                </p>
                {item.isPdf ? (
                  <div className="aspect-[3/4] w-full rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-white/40">
                    <FileText className="size-12" />
                    <span className="text-[10px] font-bold uppercase">{language === 'EN' ? "PDF Document" : "Document PDF"}</span>
                  </div>
                ) : (
                  <img src={item.invoiceUrl} className="aspect-[3/4] w-full rounded-2xl object-cover border border-white/10 shadow-2xl" alt="Invoice" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="date" value={item.date} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, date: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white" />
                  <select value={item.vehicle} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, vehicle: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-blue-400 font-bold">
                    {vehicleOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <input type="text" value={item.description} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, description: e.target.value} : p))} className="sm:col-span-2 w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white" />
                  <input type="number" value={item.cost} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, cost: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white font-black" />
                </div>
                {item.workPhotos?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {item.workPhotos.map((url, i) => (
                      url === 'pdf' ? <div key={i} className="size-14 rounded-lg bg-white/5 flex items-center justify-center"><FileText className="size-6 text-white/20" /></div>
                      : <img key={i} src={url} className="size-14 rounded-lg object-cover border border-white/5 shrink-0" alt="Work" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-row lg:flex-col gap-2 justify-end">
                <button onClick={() => setPendingAI(pendingAI.filter(p => p.id !== item.id))} className="p-3 text-white/20 hover:text-red-500 rounded-2xl transition-all"><X className="size-5" /></button>
                <button onClick={() => approveAI(item.id)} className="bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> {language === 'EN' ? "Validate" : "Valider"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ANALYSE DÉTAILLÉE MAINTENANCE & DÉPENSES (PAR DATE, SEMAINE, MOIS, CHAUFFEUR) */}
      <MaintenanceLog
        records={records}
        expenseRecords={expenseRecords}
        accountingTransactions={accountingTransactions}
        googleClientId={googleClientId}
        oilChanges={oilChanges}
        t={t}
        language={language}
      />

      {isAdding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <section className="w-full max-w-xl panel-enter rounded-[40px] border border-white/10 bg-[#181818] p-8 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white flex items-center gap-3"><Wrench className="size-5 text-orange-500" /> {language === 'EN' ? "Manual Entry" : "Saisie Manuelle"}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white focus:border-orange-500/50" />
                <select required value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white focus:border-orange-500/50">
                  <option value="">{language === 'EN' ? "Select..." : "Choisir..."}</option>
                  {vehicleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <input type="text" required placeholder={language === 'EN' ? "Description" : "Description"} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50" />
              <input type="number" required placeholder={language === 'EN' ? "Cost (CFA)" : "Coût (CFA)"} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50 font-bold" />
              <input type="url" placeholder={language === 'EN' ? "Photo URL" : "Lien photo"} value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50" />
              <button type="submit" className="w-full bg-white text-black hover:bg-orange-500 hover:text-white h-14 rounded-2xl text-base font-black transition-all flex items-center justify-center gap-3">
                <Save className="size-5" /> {language === 'EN' ? "Save" : "Enregistrer"}
              </button>
            </form>
          </section>
        </div>
      )}
    
      {/* MODAL APERÇU DIRECT DRIVE / JUSTIFICATIF */}
      {previewDoc && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-white/10 rounded-[32px] w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 px-6 border-b border-white/5 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Eye className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{translateComment(previewDoc.description, language) || (language === 'EN' ? 'Workshop & Finance Receipt' : 'Justificatif Atelier & Finances')}</h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase">{previewDoc.vehicle || previewDoc.driverLabel} • {previewDoc.date} • {Number(previewDoc.cost || previewDoc.amount || 0).toLocaleString(language === 'EN' ? 'en-US' : 'fr-FR')} CFA</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(previewDoc.driveLink || previewDoc.imageUrl) && (
                  <a
                    href={previewDoc.driveLink || previewDoc.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                  >
                    <ExternalLink className="size-3.5" /> {language === 'EN' ? "Open Drive" : "Ouvrir Drive"}
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-white/40 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-black/60 p-4 flex items-center justify-center overflow-hidden">
              {getDriveEmbedUrl(previewDoc.driveLink) ? (
                <iframe
                  src={getDriveEmbedUrl(previewDoc.driveLink)}
                  className="w-full h-full rounded-2xl border border-white/5"
                  title="Aperçu Google Drive"
                  allow="autoplay"
                />
              ) : previewDoc.imageUrl ? (
                <img
                  src={previewDoc.imageUrl}
                  alt="Preuve"
                  className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                />
              ) : previewDoc.driveLink ? (
                <div className="text-center p-8 space-y-4">
                  <FolderOpen className="size-16 text-blue-400 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-white">{language === 'EN' ? "Google Drive Folder" : "Dossier Google Drive"}</p>
                    <p className="text-xs text-white/40 max-w-md mx-auto mt-1">
                      {language === 'EN' 
                        ? "This link corresponds to a folder of photos or multiple documents." 
                        : "Ce lien correspond à un dossier de photos ou de documents multiples."}
                    </p>
                  </div>
                  <a
                    href={previewDoc.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20"
                  >
                    <ExternalLink className="size-4" /> {language === 'EN' ? "Explore folder on Drive" : "Explorer le dossier sur Drive"}
                  </a>
                </div>
              ) : (
                <p className="text-sm text-white/40 font-bold">{language === 'EN' ? "No preview available." : "Aucun aperçu disponible."}</p>
              )}
            </div>
          </div>
        </div>
      )}
</div>
  );
}
