import React, { useState } from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import { ReportsModule } from './ReportsModule';
import { AuditLogModule } from './AuditLogModule';

export function ReportsHub({ reportsProps, auditProps, t, language }) {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
        <button onClick={() => setActiveTab('reports')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'reports' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <Database className="size-4" /> Rapports & Exports
        </button>
        <button onClick={() => setActiveTab('audit')} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${activeTab === 'audit' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <ShieldCheck className="size-4" /> Journal d'Audit
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === 'reports' && <ReportsModule {...reportsProps} />}
        {activeTab === 'audit' && <AuditLogModule {...auditProps} />}
      </div>
    </div>
  );
}
