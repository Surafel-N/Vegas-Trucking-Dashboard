import React, { useState } from 'react';
import { ReceiptText, Wallet, Banknote, Activity, Handshake } from 'lucide-react';
import AccountingModule from './AccountingModule';
import ExpenseModule from './ExpenseModule';
import { FinanceWorkspace } from './FinanceWorkspace';
import { DailyClosingModule } from './DailyClosingModule';
import { CMLPartnerReconciliation } from './CMLPartnerReconciliation';

export function FinanceHub({ accountingProps, expenseProps, incomeProps, closingProps, t, language = "FR" }) {
  const [activeTab, setActiveTab] = useState('accounting');
  const isEn = language === "EN";

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('accounting')} 
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'accounting' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <ReceiptText className="size-4" /> {isEn ? "Accounting" : "Comptabilité"}
        </button>
        <button 
          onClick={() => setActiveTab('cml')} 
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'cml' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Handshake className="size-4 text-emerald-400" /> {isEn ? "CML Partner" : "Partenaire CML"}
        </button>
        <button 
          onClick={() => setActiveTab('expenses')} 
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'expenses' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Wallet className="size-4" /> {isEn ? "Expenses" : "Dépenses"}
        </button>
        <button 
          onClick={() => setActiveTab('incomes')} 
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'incomes' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Banknote className="size-4" /> {isEn ? "Incomes" : "Encaissements"}
        </button>
        <button 
          onClick={() => setActiveTab('closing')} 
          className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'closing' ? 'bg-[#cf5d56] text-white shadow-lg shadow-[#cf5d56]/20' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Activity className="size-4" /> {isEn ? "Daily Closing" : "Clôture jour"}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'accounting' && <AccountingModule {...accountingProps} />}
        {activeTab === 'cml' && (
          <CMLPartnerReconciliation 
            trips={accountingProps?.allRecords || []}
            transactions={accountingProps?.transactions || []}
            formatCurrency={accountingProps?.formatCurrency}
            formatTonnage={accountingProps?.formatTonnage}
            t={t}
            language={language}
          />
        )}
        {activeTab === 'expenses' && <ExpenseModule {...expenseProps} />}
        {activeTab === 'incomes' && <FinanceWorkspace {...incomeProps} />}
        {activeTab === 'closing' && <DailyClosingModule {...closingProps} />}
      </div>
    </div>
  );
}
