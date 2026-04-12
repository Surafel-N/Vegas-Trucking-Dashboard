import { useState } from 'react';
import { 
  Wrench, Plus, Trash2, Edit2, Save, X, Calendar, Truck, Info,
  Image as ImageIcon, ExternalLink, Sparkles, Loader2, CheckCircle2,
  FolderOpen, Eye, FileText, RotateCcw
} from 'lucide-react';

export function MaintenanceAdminModule({ records = [], setRecords, drivers = [], googleClientId, oilChanges = {}, setOilChanges }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [debugKey, setDebugKey] = useState('');
  const [pendingAI, setPendingAI] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle: '',
    description: '',
    cost: '',
    imageUrl: '',
    workPhotos: []
  });

  const extractFolderId = (url) => {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
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

      const geminiKey = debugKey || import.meta.env.VITE_GEMINI_API_KEY;
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const modelsData = await modelsRes.json();
      const flashModel = modelsData.models?.find(m => m.name.includes('flash'))?.name || 'models/gemini-1.5-flash';

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${flashModel}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Voici des fichiers (images ou PDF) d'un dossier de maintenance. L'un d'eux est la facture. Identifie-le et extrais en JSON : { \"invoiceFileName\": \"nom\", \"date\": \"YYYY-MM-DD\", \"vehicle\": \"AMARA TRUCK 76, BRAHIMA TRUCK 45 ou SORO TRUCK 52\", \"description\": \"...\", \"cost\": 0 }. Réponds uniquement en JSON." },
              ...imageDataArray.map(img => ({ inline_data: { mime_type: img.mime, data: img.b64 } }))
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!aiResponse.ok) throw new Error("Erreur IA");

      const aiData = await aiResponse.json();
      const extracted = JSON.parse(aiData.candidates[0].content.parts[0].text.trim());
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
    setOilChanges({
      ...oilChanges,
      [truck]: { 
        mileage: parseFloat(mileage) || 0,
        date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleDelete = (id) => { if (window.confirm("Supprimer ?")) setRecords(records.filter(r => r.id !== id)); };

  const vehicleOptions = drivers.map(d => `${d.name} ${d.sdv}`);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Wrench className="size-6" /></div>
            Maintenance Avancée
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-white/40 text-sm">Gestion IA & Drive Explorer</p>
            <input type="password" placeholder="Debug Key..." value={debugKey} onChange={e => setDebugKey(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[9px] w-32 outline-none focus:border-orange-500/50" />
          </div>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"><Plus className="size-4" /> Saisie manuelle</button>
      </header>

      {/* CONFIGURATION VIDANGE */}
      <section className="panel-enter rounded-[30px] border border-orange-500/20 bg-[#111] p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><RotateCcw className="size-5" /></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-orange-500">Suivi des Vidanges (Intervalle 10,000 KM)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {drivers.map(d => {
            const truckLabel = `${d.name} ${d.sdv}`;
            const current = oilChanges[truckLabel] || { mileage: 0 };
            return (
              <div key={d.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-white/70">{truckLabel}</p>
                  <span className="text-[9px] font-bold text-white/20">KM Dernier Service</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Kilométrage..." 
                    defaultValue={current.mileage || ''}
                    onBlur={(e) => handleOilChangeUpdate(truckLabel, e.target.value)}
                    className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-orange-500/50 transition-all"
                  />
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/5">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel-enter rounded-[30px] border border-blue-500/20 bg-[#111] p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><FolderOpen className="size-5" /></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Explorer un dossier Drive (IA)</h3>
        </div>
        <div className="flex gap-3">
          <input type="url" placeholder="Lien dossier Google Drive..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} className="flex-1 h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-blue-500/50" />
          <button onClick={handleDriveFolderAnalysis} disabled={isAnalyzing || !driveUrl} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white px-6 rounded-2xl text-sm font-black transition-all flex items-center gap-2">
            {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Explorer
          </button>
        </div>

        {pendingAI.map((item) => (
          <div key={item.id} className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-[24px] p-5 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-48 shrink-0">
                <p className="text-[9px] font-bold text-white/30 uppercase mb-2">Facture identifiée</p>
                {item.isPdf ? (
                  <div className="aspect-[3/4] w-full rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-white/40">
                    <FileText className="size-12" />
                    <span className="text-[10px] font-bold uppercase">Document PDF</span>
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
                <button onClick={() => approveAI(item.id)} className="bg-blue-500 text-white px-6 py-3 rounded-2xl text-sm font-black hover:scale-105 transition-all flex items-center gap-2"><CheckCircle2 className="size-4" /> Valider</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel-enter rounded-[30px] border border-white/7 bg-[#111] overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.01]">
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Véhicule</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Coût</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest">Photos</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {records.sort((a,b) => b.date.localeCompare(a.date)).map(row => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 text-xs font-bold text-white/70">{new Date(row.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-6 py-4 text-xs font-black text-orange-500">{row.vehicle}</td>
                <td className="px-6 py-4 text-xs text-white/50">{row.description}</td>
                <td className="px-6 py-4 text-xs font-black text-white">{row.cost.toLocaleString()} CFA</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {row.imageUrl && <a href={row.imageUrl} target="_blank" rel="noreferrer" className="size-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500/20"><ImageIcon className="size-3.5" /></a>}
                    {row.workPhotos?.length > 0 && <div className="px-2 h-7 rounded-lg bg-white/5 text-white/40 text-[9px] font-black flex items-center gap-1"><Eye className="size-3" /> {row.workPhotos.length}</div>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleDelete(row.id)} className="p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isAdding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <section className="w-full max-w-xl panel-enter rounded-[40px] border border-white/10 bg-[#181818] p-8 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white flex items-center gap-3"><Wrench className="size-5 text-orange-500" /> Saisie Manuelle</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white focus:border-orange-500/50" />
                <select required value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white focus:border-orange-500/50">
                  <option value="">Choisir...</option>
                  {vehicleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <input type="text" required placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50" />
              <input type="number" required placeholder="Coût (CFA)" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50 font-bold" />
              <input type="url" placeholder="Lien photo" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white outline-none focus:border-orange-500/50" />
              <button type="submit" className="w-full bg-white text-black hover:bg-orange-500 hover:text-white h-14 rounded-2xl text-base font-black transition-all flex items-center justify-center gap-3"><Save className="size-5" /> Enregistrer</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
