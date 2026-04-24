import { useState } from "react";
import { 
  Users, 
  Truck, 
  MapPin, 
  Settings2, 
  LayoutTemplate, 
  Plus, 
  Trash2, 
  Save, 
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Database,
  AlertTriangle
} from "lucide-react";

export function SettingsModule({
  drivers,
  setDrivers,
  vehicles,
  setVehicles,
  destinationsList,
  setDestinationsList,
  businessRules,
  setBusinessRules,
  uiConfig,
  setUiConfig,
  canManageCategories,
  categories,
  setCategories,
  trips,
  onBulkImport,
  onClearAllStorage,
  onPurgeTrips,
  onPurgeRange
}) {
  const [activeTab, setActiveSection] = useState("drivers");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [purgeRange, setPurgeRange] = useState({ start: 1, end: 1, year: "2026" });

  const onDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newWidgets = [...uiConfig.widgets];
    const item = newWidgets.splice(draggedIndex, 1)[0];
    newWidgets.splice(index, 0, item);
    setDraggedIndex(index);
    setUiConfig({ ...uiConfig, widgets: newWidgets });
  };

  const addDriver = () => {
    const name = prompt("Nom du chauffeur ?");
    if (!name) return;
    const sdv = prompt("SDV (ex: SDV 4) ?");
    setDrivers([...drivers, { 
      id: `drv-${Date.now()}`, 
      name: name.toUpperCase(), 
      sdv: sdv || "SDV", 
      status: "active",
      phone: "",
      license: "",
      vehicle: ""
    }]);
  };

  const removeDriver = (id) => {
    if (confirm("Supprimer ce chauffeur ?")) {
      setDrivers(drivers.filter(d => d.id !== id));
    }
  };

  const addVehicle = () => {
    const plate = prompt("Plaque d'immatriculation ?");
    if (!plate) return;
    setVehicles([...vehicles, { id: `veh-${Date.now()}`, plate, model: "Nouveau", status: "active" }]);
  };

  const removeVehicle = (id) => {
    if (confirm("Supprimer ce véhicule ?")) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const addDestination = () => {
    const dest = prompt("Nouvelle destination ?");
    if (dest) setDestinationsList([...destinationsList, dest]);
  };

  const removeDestination = (name) => {
    setDestinationsList(destinationsList.filter(d => d !== name));
  };

  const toggleWidget = (id) => {
    setUiConfig({
      ...uiConfig,
      widgets: uiConfig.widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    });
  };

  const toggleMenuItem = (id) => {
    setUiConfig({
      ...uiConfig,
      menu: uiConfig.menu.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
    });
  };

  const moveWidget = (index, direction) => {
    const newWidgets = [...uiConfig.widgets];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newWidgets.length) return;
    [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
    setUiConfig({ ...uiConfig, widgets: newWidgets });
  };

  const updateRule = (key, value) => {
    setBusinessRules({ ...businessRules, [key]: Number(value) });
  };

  const sidebarItems = [
    { id: "drivers", label: "Chauffeurs", icon: Users },
    { id: "vehicles", label: "Véhicules", icon: Truck },
    { id: "destinations", label: "Destinations", icon: MapPin },
    { id: "rules", label: "Règles Métier", icon: Settings2 },
    { id: "ui", label: "Personnalisation UI", icon: LayoutTemplate },
    { id: "import", label: "Importation Massive", icon: Database },
    { id: "advanced", label: "Avancé", icon: Trash2 },
  ];

  return (
    <section className="panel-enter rounded-[32px] border border-white/5 bg-[#121212] overflow-hidden flex h-[700px] shadow-2xl">
      <aside className="w-64 border-r border-white/5 bg-black/20 p-6 flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-[0.2em] text-white/30 mb-6 px-3">Administration CMS</h3>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
              activeTab === item.id 
                ? "bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20" 
                : "text-white/40 hover:bg-white/5"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 p-8 overflow-auto text-white">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold capitalize">{activeTab}</h2>
            <p className="text-sm text-white/40 mt-1">Gère les données et la configuration dynamique du site.</p>
          </div>
          {["drivers", "vehicles", "destinations"].includes(activeTab) && (
            <button 
              onClick={activeTab === "drivers" ? addDriver : activeTab === "vehicles" ? addVehicle : addDestination}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full border border-white/10 text-sm transition"
            >
              <Plus className="size-4" /> Ajouter
            </button>
          )}
        </header>

        {activeTab === "drivers" && (
          <div className="grid gap-3">
            {drivers.map(driver => (
              <div key={driver.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-gradient-to-br from-[#cf5d56] to-[#f6b36f] flex items-center justify-center text-xs font-bold text-black">
                    {driver.name.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold">{driver.name}</p>
                    <p className="text-xs text-white/30">{driver.sdv}</p>
                  </div>
                </div>
                <button onClick={() => removeDriver(driver.id)} className="p-2 text-white/20 hover:text-red-400 transition">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="grid gap-3">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-4">
                  <Truck className="size-5 text-white/20" />
                  <div>
                    <p className="font-bold">{v.plate}</p>
                    <p className="text-xs text-white/30">{v.model}</p>
                  </div>
                </div>
                <button onClick={() => removeVehicle(v.id)} className="p-2 text-white/20 hover:text-red-400 transition">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "destinations" && (
          <div className="grid grid-cols-2 gap-3">
            {destinationsList.map(dest => (
              <div key={dest} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="font-medium">{dest}</span>
                <button onClick={() => removeDestination(dest)} className="text-white/20 hover:text-red-400 transition">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-6 max-w-md">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
              <label className="block">
                <span className="text-sm text-white/40 block mb-2 font-medium">Seuil tonnage pour 2 voyages</span>
                <input 
                  type="number" 
                  value={businessRules.voyageThreshold} 
                  onChange={(e) => updateRule("voyageThreshold", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#cf5d56]"
                />
              </label>
              <label className="block">
                <span className="text-sm text-white/40 block mb-2 font-medium">Objectif Marge Bénéficiaire (%)</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={businessRules.targetMargin} 
                  onChange={(e) => updateRule("targetMargin", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#cf5d56]"
                />
              </label>
            </div>
            <p className="text-xs text-[#61d2c0]/60 flex items-center gap-2 px-2">
              <Save className="size-3" /> Les modifications s'appliquent instantanément au Dashboard.
            </p>
          </div>
        )}

        {activeTab === "ui" && (
          <div className="grid gap-8">
            <section>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#cf5d56]">
                <GripVertical className="size-5" />
                Drag & Drop Widgets (Ordre & Visibilité)
              </h3>
              <p className="text-xs text-white/30 mb-4 px-1">Fais glisser les cartes pour réorganiser l'ordre d'affichage sur le Dashboard.</p>
              <div className="grid gap-3">
                {uiConfig.widgets.map((widget, index) => (
                  <div 
                    key={widget.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      draggedIndex === index ? "opacity-50 scale-[0.98] border-[#cf5d56] border-dashed bg-[#cf5d56]/5" : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    } ${!widget.enabled && "opacity-40 grayscale"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-8 flex items-center justify-center rounded-lg bg-white/5 cursor-grab active:cursor-grabbing">
                        <GripVertical className="size-4 text-white/20" />
                      </div>
                      <button onClick={() => toggleWidget(widget.id)} className="flex items-center gap-3">
                        {widget.enabled ? <ToggleRight className="size-6 text-[#cf5d56]" /> : <ToggleLeft className="size-6 text-white/20" />}
                        <span className="font-bold tracking-tight">{widget.label}</span>
                      </button>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase tracking-widest opacity-20 font-mono italic">ID: {widget.id}</span>
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => moveWidget(index, -1)} disabled={index === 0} className="p-1 hover:bg-white/10 rounded disabled:opacity-0"><ChevronRight className="size-3 -rotate-90" /></button>
                        <button onClick={() => moveWidget(index, 1)} disabled={index === uiConfig.widgets.length - 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-0"><ChevronRight className="size-3 rotate-90" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-6 border-t border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-[#61d2c0]">
                <LayoutTemplate className="size-6" />
                Personnalisation du Menu Latéral (Navigation)
              </h3>
              <p className="text-sm text-white/40 mb-6">Active ou désactive les sections visibles dans le menu de navigation principal.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uiConfig.menu.map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => toggleMenuItem(item.id)}
                    className={`flex items-center justify-between p-5 rounded-[24px] border transition-all duration-300 ${
                      item.enabled 
                        ? "bg-white/[0.04] border-white/10 text-white shadow-lg shadow-black/20" 
                        : "bg-white/[0.01] border-white/5 text-white/20"
                    }`}
                  >
                    <span className="text-sm font-bold tracking-tight">{item.label}</span>
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${item.enabled ? "bg-[#61d2c0]" : "bg-white/10"}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${item.enabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="space-y-8 max-w-lg">
            <section className="p-8 rounded-[40px] border border-red-500/20 bg-red-500/5">
              <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-3">
                <AlertTriangle className="size-6" />
                Zone de Danger
              </h3>
              <p className="text-sm text-white/40 mb-6">
                Ces actions sont irréversibles. Elles supprimeront toutes les données locales stockées dans votre navigateur.
              </p>

              <div className="p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10 mb-6">
                <h4 className="text-[10px] font-black uppercase text-orange-500 mb-4 tracking-[0.2em] flex items-center gap-2">
                  <Database className="size-3.5" /> Purge par plage
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-white/20 uppercase">Année</label>
                    <select value={purgeRange.year} onChange={e => setPurgeRange({...purgeRange, year: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] text-white outline-none">
                       <option value="2026">2026</option>
                       <option value="2025">2025</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-white/20 uppercase">Mois Début</label>
                    <select value={purgeRange.start} onChange={e => setPurgeRange({...purgeRange, start: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] text-white outline-none">
                       {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Mois {m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-white/20 uppercase">Mois Fin</label>
                    <select value={purgeRange.end} onChange={e => setPurgeRange({...purgeRange, end: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] text-white outline-none">
                       {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Mois {m}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => onPurgeRange(purgeRange.start, purgeRange.end, purgeRange.year)}
                  className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all"
                >
                  Purger cette période
                </button>
              </div>
              
              <button 
                onClick={onPurgeTrips}
                className="w-full py-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-3 mb-4"
              >
                <Database className="size-5" />
                PURGER UNIQUEMENT LES TRAJETS (2026)
              </button>

              <button 
                onClick={onClearAllStorage}
                className="w-full py-4 rounded-2xl bg-red-500 text-white font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-3"
              >
                <Trash2 className="size-5" />
                RÉINITIALISER TOUTES LES DONNÉES
              </button>
            </section>

            <section className="p-8 rounded-[40px] border border-white/5 bg-white/[0.02]">
              <h3 className="text-lg font-bold mb-2">Support Technique</h3>
              <p className="text-xs text-white/30 leading-relaxed">
                Version logicielle : 1.4.2-2026<br/>
                Moteur de synchronisation : Sheets v4 Native Fetch<br/>
                ID Système : {Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </section>
          </div>
        )}
      </main>
    </section>
  );
}
