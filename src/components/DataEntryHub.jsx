import React, { useState } from 'react';
import { PlusCircle, RefreshCcw, Sparkles, MessageSquare } from 'lucide-react';
import ManualEntryModule from './ManualEntryModule';
import SmartBulkImporter from './SmartBulkImporter';
import AITicketValidationModule from './AITicketValidationModule';
import WhatsAppDriveBotModule from './WhatsAppDriveBotModule';

export function DataEntryHub({ manualEntryProps, importProps, aiTicketProps, whatsappBotProps, t, language }) {
  const [activeTab, setActiveTab] = useState('whatsapp');

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20 overflow-x-auto">
        <button onClick={() => setActiveTab('whatsapp')} className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${activeTab === 'whatsapp' ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
          <MessageSquare className="size-4" /> Bot WhatsApp & Drive
        </button>
        <button onClick={() => setActiveTab('manual')} className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${activeTab === 'manual' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <PlusCircle className="size-4" /> Saisie Rapide
        </button>
        <button onClick={() => setActiveTab('import')} className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${activeTab === 'import' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <RefreshCcw className="size-4" /> Importation
        </button>
        <button onClick={() => setActiveTab('ai')} className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${activeTab === 'ai' ? 'bg-[#cf5d56] text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
          <Sparkles className="size-4" /> Validation IA
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {activeTab === 'whatsapp' && <WhatsAppDriveBotModule {...whatsappBotProps} language={language} />}
        {activeTab === 'manual' && <ManualEntryModule {...manualEntryProps} />}
        {activeTab === 'import' && <SmartBulkImporter {...importProps} />}
        {activeTab === 'ai' && <AITicketValidationModule {...aiTicketProps} />}
      </div>
    </div>
  );
}
