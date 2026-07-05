import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Landmark, BookOpen, UserPlus, CreditCard } from 'lucide-react';

function Accounting() {
  const [activeTab, setActiveTab] = useState('daybook'); // 'daybook', 'bankbook', 'ledgers'
  const [daybook, setDaybook] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchDaybook = async () => {
    setLoading(true);
    try {
      // Fetch combined journal of all cash flow activities (sales invoices, purchases bills, shift registers)
      const invRes = await axios.get('/api/sales/invoices');
      const purRes = await axios.get('/api/purchases');
      
      const journal = [];
      invRes.data.forEach(inv => {
        journal.push({
          date: inv.createdAt,
          ref: inv.invoiceNumber,
          account: `Sales / Customer: ${inv.customer?.name}`,
          type: 'CREDIT (INFLOW)',
          amount: inv.grandTotal,
          mode: inv.payments?.map(p => p.mode).join(', ') || 'CASH'
        });
      });

      purRes.data.forEach(bill => {
        journal.push({
          date: bill.createdAt,
          ref: bill.billNumber,
          account: `Purchase / Supplier: ${bill.supplier?.name}`,
          type: 'DEBIT (OUTFLOW)',
          amount: bill.grandTotal,
          mode: 'CASH / ACC_PAYABLE'
        });
      });

      // Sort by date newest first
      journal.sort((a, b) => new Date(b.date) - new Date(a.date));
      setDaybook(journal);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaybook();
  }, []);

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Double-Entry Accounting</h2>
          <p className="text-sm text-slate-500">Day book ledger, Cash/Bank ledgers, and Supplier/Customer credit registers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('daybook')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'daybook' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          General Day Book
        </button>
        <button
          onClick={() => setActiveTab('bankbook')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'bankbook' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Cash & Bank Accounts
        </button>
      </div>

      {activeTab === 'daybook' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                <th className="p-4">Date</th>
                <th className="p-4">Reference No</th>
                <th className="p-4">Ledger Account</th>
                <th className="p-4">Type</th>
                <th className="p-4">Payment Mode</th>
                <th className="p-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading day book...</td></tr>
              ) : daybook.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No accounting entries recorded.</td></tr>
              ) : (
                daybook.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{entry.ref}</td>
                    <td className="p-4 font-semibold text-slate-800">{entry.account}</td>
                    <td className="p-4 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded ${entry.type.includes('CREDIT') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{entry.mode}</td>
                    <td className={`p-4 font-black text-right ${entry.type.includes('CREDIT') ? 'text-emerald-600' : 'text-rose-500'}`}>
                      ₹{(entry.amount / 100).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cash & Bank ledgers summary card */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <strong className="text-slate-800 text-lg font-bold flex items-center gap-2">
                <BookOpen className="text-indigo-600" />
                Cash Account Ledger
              </strong>
              <span className="text-xs px-2.5 py-1 bg-slate-100 rounded text-slate-500">Asset</span>
            </div>
            <p className="text-2xl font-black text-slate-800">₹{(daybook.reduce((sum, e) => e.mode.includes('CASH') ? (e.type.includes('INFLOW') ? sum + e.amount : sum - e.amount) : sum, 0) / 100).toFixed(2)}</p>
            <span className="text-[10px] text-slate-400 block uppercase">Liquid cash balance in drawer register</span>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <strong className="text-slate-800 text-lg font-bold flex items-center gap-2">
                <Landmark className="text-indigo-600" />
                Bank Card / UPI Account
              </strong>
              <span className="text-xs px-2.5 py-1 bg-slate-100 rounded text-slate-500">Asset</span>
            </div>
            <p className="text-2xl font-black text-slate-800">₹{(daybook.reduce((sum, e) => (e.mode.includes('CARD') || e.mode.includes('UPI')) ? (e.type.includes('INFLOW') ? sum + e.amount : sum - e.amount) : sum, 0) / 100).toFixed(2)}</p>
            <span className="text-[10px] text-slate-400 block uppercase">Electronic settlements in bank merchant account</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accounting;
