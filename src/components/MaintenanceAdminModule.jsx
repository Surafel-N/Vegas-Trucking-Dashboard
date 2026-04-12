import { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Calendar, 
  Truck, 
  Info,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Loader2,
  CheckCircle2,
  FolderOpen,
  Eye
} from 'lucide-react';

export function MaintenanceAdminModule({ records = [], setRecords, drivers = [], googleClientId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [debugKey, setDebugKey] = useState('');
  
  // File d'attente pour validation IA
  const [pendingAI, setPendingAI] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle: drivers[0]?.sdv ? `${drivers[0].sdv} (${drivers[0].name})` : '',
    description: '',
    cost: '',
    imageUrl: '',
    workPhotos: []
  });

  const extractFolderId = (url) => {
    const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleDriveFolderAnalysis = async () => {
    const folderId = extractFolderId(driveUrl);
    if (!folderId) {
      alert("Lien Google Drive invalide. Utilisez un lien de dossier (ex: .../folders/ID)");
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      alert("Bibliothèque Google non chargée.");
      return;
    }

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

      if (!tokenResponse.access_token) throw new Error("Accès refusé");

      const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`;
      const listRes = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
      });
      const listData = await listRes.json();
      const files = listData.files || [];
      const images = files.filter(f => f.mimeType.startsWith('image/')).slice(0, 10);

      if (images.length === 0) {
        alert("Aucune image trouvée.");
        setIsAnalyzing(false);
        return;
      }

      const imageDataArray = await Promise.all(images.map(async (img) => {
        const base64 = await getBase64FromDrive(img.id, tokenResponse.access_token);
        return { inline_data: { mime_type: "image/jpeg", data: base64 } };
      }));

      const geminiKey = debugKey || import.meta.env.VITE_GEMINI_API_KEY;
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const modelsData = await modelsRes.json();
      const flashModel = modelsData.models?.find(m => m.name.includes('1.5-flash'))?.name || 'models/gemini-1.5-flash';

      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${flashModel}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Identifie visuellement la facture parmi ces images et extrais au format JSON : { \"invoiceFileName\": \"nom\", \"date\": \"YYYY-MM-DD\", \"vehicle\": \"TRUCK NAME\", \"description\": \"...\", \"cost\": 0 }. Réponds UNIQUEMENT en JSON." },
              ...imageDataArray
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!aiResponse.ok) throw new Error("Erreur Google API");

      const aiData = await aiResponse.json();
      const rawText = aiData.candidates[0].content.parts[0].text;
      const extracted = JSON.parse(rawText.trim());

      const invoiceFile = images.find(img => img.name === extracted.invoiceFileName) || images[0];

      setPendingAI([{
        id: `pending-${Date.now()}`,
        ...extracted,
        invoiceUrl: invoiceFile.thumbnailLink?.replace('=s220', '=s1000') || invoiceFile.webContentLink,
        workPhotos: images.filter(f => f.id !== invoiceFile.id).map(f => f.thumbnailLink?.replace('=s220', '=s1000') || f.webContentLink),
        folderUrl: driveUrl
      }, ...pendingAI]);

      setDriveUrl('');
    } catch (err) {
      console.error("Erreur Analyse:", err);
      alert("Erreur lors de l'analyse : " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getBase64FromDrive = async (fileId, token) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
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
      imageUrl: item.invoiceUrl,
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

  const handleDelete = (id) => { if (window.confirm("Supprimer ?")) setRecords(records.filter(r => r.id !== id)); };

  const vehicleOptions = drivers.map(d => `${d.sdv} (${d.name})`);

  const checkModels = async () => {
    const geminiKey = debugKey || import.meta.env.VITE_GEMINI_API_KEY;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const data = await res.json();
      if (data.models) alert("Modèles trouvés ! Regardez la console.");
      else alert("Aucun modèle trouvé.");
    } catch (err) { alert("Erreur diagnostic."); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Wrench className="size-6" /></div>
            Maintenance Avancée
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-white/40 text-sm">Gestion manuelle ou via Drive.</p>
            <input type="password" placeholder="Debug Key..." value={debugKey} onChange={e => setDebugKey(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[9px] w-32 outline-none focus:border-orange-500/50" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={checkModels} className="bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-[10px] font-bold border border-white/5">Vérifier Clé</button>
          <button onClick={() => setIsAdding(true)} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10"><Plus className="size-4" /> Saisie manuelle</button>
        </div>
      </header>

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
                <img src={item.invoiceUrl} className="aspect-[3/4] w-full rounded-2xl object-cover border border-white/10" alt="Invoice" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase ml-1">Date</label>
                    <input type="date" value={item.date} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, date: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase ml-1">Véhicule</label>
                    <select value={item.vehicle} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, vehicle: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-blue-400 font-bold">
                      {vehicleOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-white/30 uppercase ml-1">Description</label>
                    <input type="text" value={item.description} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, description: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/30 uppercase ml-1">Coût (CFA)</label>
                    <input type="number" value={item.cost} onChange={e => setPendingAI(pendingAI.map(p => p.id === item.id ? {...p, cost: e.target.value} : p))} className="w-full h-10 bg-black/40 border border-white/5 rounded-xl px-3 text-xs text-white font-black" />
                  </div>
                </div>
                {item.workPhotos?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-white/30 uppercase mb-2">Photos des travaux ({item.workPhotos.length})</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {item.workPhotos.map((url, i) => <img key={i} src={url} className="size-14 rounded-lg object-cover border border-white/5 shrink-0" alt="Work" />)}
                    </div>
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
                  <button onClick={() => handleEdit(row)} className="p-2 text-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Edit2 className="size-4" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isAdding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <section className="w-full max-w-2xl panel-enter rounded-[40px] border border-white/10 bg-[#181818] p-8 shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white flex items-center gap-3"><Wrench className="size-5 text-orange-500" /> Saisie Manuelle</h3>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white" />
                <select required value={formData.vehicle} onChange={e => setFormData({...formData, vehicle: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white">
                  {vehicleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <input type="text" required placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="md:col-span-2 w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white" />
                <input type="number" required placeholder="Coût" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white font-bold" />
                <input type="url" placeholder="Lien photo" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="submit" className="bg-white text-black px-10 py-3 rounded-2xl text-sm font-black flex items-center gap-2"><Save className="size-4" /> Enregistrer</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
