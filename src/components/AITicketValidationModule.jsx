import React, { useState } from 'react';
import { Check, X, Edit3, Image as ImageIcon, AlertCircle, Route } from 'lucide-react';

export default function AITicketValidationModule({ pendingTickets, setPendingTickets, onApprove, drivers }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [formData, setFormData] = useState({});

  const handleSelect = (ticket) => {
    setSelectedTicket(ticket);
    setFormData(ticket.aiData); // Charge les données détectées par l'IA dans le formulaire
  };

  const handleApprove = () => {
    // On envoie le ticket corrigé/validé vers le Dashboard principal
    onApprove({ ...selectedTicket, finalData: formData });
    // On le retire de la file d'attente
    setPendingTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
    setSelectedTicket(null);
  };

  const handleReject = () => {
    if (window.confirm("Voulez-vous vraiment supprimer ce ticket sans l'intégrer ?")) {
      setPendingTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
      setSelectedTicket(null);
    }
  };

  if (pendingTickets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-white/50">
        <div className="rounded-full bg-white/5 p-6 mb-4">
          <Check className="size-12 text-green-500/50" />
        </div>
        <h2 className="text-xl font-bold text-white">Tout est à jour !</h2>
        <p className="text-sm">Aucun ticket en attente de validation IA.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Colonne de gauche : La file d'attente */}
      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <AlertCircle className="size-5 text-[#4285F4]" />
          En attente de validation ({pendingTickets.length})
        </h2>
        {pendingTickets.map(ticket => (
          <button
            key={ticket.id}
            onClick={() => handleSelect(ticket)}
            className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
              selectedTicket?.id === ticket.id 
                ? 'border-[#4285F4] bg-[#4285F4]/10' 
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-bold text-sm text-white">Reçu le {new Date(ticket.receivedAt).toLocaleDateString()}</span>
              <span className="text-xs bg-white/10 px-2 py-1 rounded-md text-white/70">{ticket.source}</span>
            </div>
            <p className="text-xs text-white/50 truncate">Détails IA: Camion {ticket.aiData.chauffeur || '?'}, {ticket.aiData.tonnage || '?'}T</p>
          </button>
        ))}
      </div>

      {/* Colonne de droite : L'espace de validation */}
      <div className="w-2/3 rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center text-white/30 flex-col gap-4">
            <Edit3 className="size-12" />
            <p>Sélectionnez un ticket à gauche pour le vérifier</p>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold">Vérification du ticket</h3>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
              {/* L'image scannée */}
              <div className="w-1/2 bg-black/50 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group">
                {selectedTicket.imageUrl ? (
                  <img src={selectedTicket.imageUrl} alt="Ticket Scanné" className="object-contain w-full h-full" />
                ) : (
                  <div className="text-center text-white/30 flex flex-col items-center">
                    <ImageIcon className="size-10 mb-2" />
                    <p className="text-sm">Aperçu du scan</p>
                  </div>
                )}
              </div>

              {/* Le Formulaire d'édition */}
              <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Chauffeur détecté</label>
                  <select 
                    value={formData.driverLabel || ''} 
                    onChange={e => setFormData({...formData, driverLabel: e.target.value})}
                    className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                  >
                    <option value="">-- Choisir --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={`${d.sdv} (${d.name})`}>{d.sdv} ({d.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Date du ticket</label>
                  <input 
                    type="date" 
                    value={formData.date || ''} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/50 mb-1">Tonnage (T)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.tonnage || ''} 
                      onChange={e => setFormData({...formData, tonnage: e.target.value})}
                      className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/50 mb-1">Montant Brut (CFA)</label>
                    <input 
                      type="number" 
                      value={formData.total_gross_cfa || ''} 
                      onChange={e => setFormData({...formData, total_gross_cfa: e.target.value})}
                      className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/50 mb-1">Frais / Dépenses (CFA)</label>
                    <input 
                      type="number" 
                      value={formData.total_expense_cfa || ''} 
                      onChange={e => setFormData({...formData, total_expense_cfa: e.target.value})}
                      className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-white/50 mb-1">Kilométrage (KM)</label>
                    <input 
                      type="number" 
                      value={formData.km || ''} 
                      onChange={e => setFormData({...formData, km: e.target.value})}
                      className="w-full rounded-lg bg-black/50 border border-white/10 p-2.5 text-sm text-white focus:border-[#4285F4] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Les boutons d'action */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-auto">
              <button 
                onClick={handleReject}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-red-500/20 text-red-400 transition-colors flex items-center gap-2"
              >
                <X className="size-4" /> Rejeter
              </button>
              <button 
                onClick={handleApprove}
                className="px-6 py-2 rounded-lg text-sm font-bold bg-[#4285F4] text-white hover:bg-[#3367d6] transition-all flex items-center gap-2"
              >
                <Check className="size-4" /> Valider et Intégrer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}