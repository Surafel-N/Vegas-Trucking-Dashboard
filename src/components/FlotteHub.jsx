import React, { useState } from 'react';
import { Truck, Users } from 'lucide-react';
import { TripsModule } from './TripsModule';
import { DriversModule } from './DriversModule';

export function FlotteHub({ tripsProps, driversProps, t, language }) {
  const [activeTab, setActiveTab] = useState('trips');

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
        <button onClick={() => setActiveTab('trips')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'trips' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <Truck className="size-4" /> Trajets
        </button>
        <button onClick={() => setActiveTab('drivers')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'drivers' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <Users className="size-4" /> Chauffeurs
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === 'trips' && <TripsModule {...tripsProps} />}
        {activeTab === 'drivers' && <DriversModule {...driversProps} />}
      </div>
    </div>
  );
}
