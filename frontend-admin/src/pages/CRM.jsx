import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Award, UserCheck, AlertTriangle, AlertOctagon, User, BookOpen, CreditCard, Layers, X, Save } from 'lucide-react';

function CRM() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Credit payment
  const [payAmount, setPayAmount] = useState('');
  
  // Merging state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [sourceIds, setSourceIds] = useState([]);
  const [targetId, setTargetId] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/customers', { params: { search } });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    try {
      const res = await axios.get(`/api/customers/${id}`);
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handlePayCredit = async (e) => {
    e.preventDefault();
    if (!payAmount || !selectedCustomer) return;
    try {
      const paise = Math.round(parseFloat(payAmount) * 100);
      const res = await axios.post(`/api/customers/${selectedCustomer.id}/pay-credit`, { amount: paise });
      alert('Credit payment received and outstanding balance updated!');
      setPayAmount('');
      fetchDetail(selectedCustomer.id);
      fetchCustomers();
    } catch (err) {
      alert('Failed to process payment');
    }
  };

  const handleMerge = async (e) => {
    e.preventDefault();
    if (sourceIds.length === 0 || !targetId) return alert('Select source and target profiles');
    try {
      await axios.post('/api/customers/merge', {
        sourceIds,
        targetId: parseInt(targetId)
      });
      alert('Duplicate profiles merged successfully!');
      setShowMergeModal(false);
      setSourceIds([]); setTargetId('');
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert('Failed to merge customers');
    }
  };

  // Segmentation logic
  const segments = { vip: 0, regular: 0, atRisk: 0, lost: 0 };
  customers.forEach(c => {
    if (c.loyaltyPoints >= 500) segments.vip++;
    else if (c.loyaltyPoints >= 100) segments.regular++;
    else if (c.loyaltyPoints > 0) segments.atRisk++;
    else segments.lost++;
  });

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div>
        <h2 className="text-2xl font-black text-slate-800">Customer Relationship Management (CRM)</h2>
        <p className="text-sm text-slate-500">Manage store credit accounts, loyalty tiers, and merge duplicates</p>
      </div>

      {/* Segmentation stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SegmentWidget title="VIP Tiers" count={segments.vip} icon={<Award size={18} className="text-amber-600" />} bgClass="bg-amber-50 border-amber-200" />
        <SegmentWidget title="Regular Tiers" count={segments.regular} icon={<UserCheck size={18} className="text-teal-600" />} bgClass="bg-teal-50 border-teal-200" />
        <SegmentWidget title="At-Risk Contacts" count={segments.atRisk} icon={<AlertTriangle size={18} className="text-orange-600" />} bgClass="bg-orange-50 border-orange-200" />
        <SegmentWidget title="Lost Contacts" count={segments.lost} icon={<AlertOctagon size={18} className="text-rose-600" />} bgClass="bg-rose-50 border-rose-200" />
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex-1 max-w-md">
          <Search className="text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer by name or phone..."
            className="w-full bg-transparent text-slate-700 focus:outline-none placeholder-slate-400 text-sm"
          />
        </div>
        <button
          onClick={() => setShowMergeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          <Layers size={16} />
          Merge Duplicates
        </button>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Customer list table */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4 text-center">Loyalty Points</th>
                  <th className="p-4 text-right">Outstanding Credit</th>
                  <th className="p-4 text-center">Tier</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center p-8">Loading CRM...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8">No customer accounts.</td></tr>
                ) : (
                  customers.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => fetchDetail(c.id)}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : ''}`}
                    >
                      <td className="p-4 font-bold text-slate-800">{c.name}</td>
                      <td className="p-4 font-mono text-slate-650">{c.phone}</td>
                      <td className="p-4 text-center font-extrabold text-amber-600">{c.loyaltyPoints}</td>
                      <td className="p-4 text-right font-black text-rose-500">₹{(c.openingBalance / 100).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.loyaltyPoints >= 500 ? 'bg-amber-100 text-amber-800' : c.loyaltyPoints >= 100 ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'}`}>
                          {c.loyaltyPoints >= 500 ? 'VIP' : c.loyaltyPoints >= 100 ? 'Regular' : 'Basic'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Detail Card Drawer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
          <h3 className="text-sm font-black border-b border-slate-100 pb-2.5 uppercase tracking-wider text-slate-800">Customer Dossier</h3>
          
          {selectedCustomer ? (
            <div className="space-y-6 text-xs">
              {/* Header profile info */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-full text-indigo-700"><User size={24} /></div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 leading-none">{selectedCustomer.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">{selectedCustomer.phone}</span>
                </div>
              </div>

              {/* Pay store credit balance form */}
              <form onSubmit={handlePayCredit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Pay Outstanding Credit</span>
                <div className="flex justify-between items-center text-sm font-black text-rose-500">
                  <span>Balance Due:</span>
                  <span>₹{(selectedCustomer.openingBalance / 100).toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount (₹)"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none text-xs"
                  />
                  <button type="submit" className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow-sm shrink-0">Pay</button>
                </div>
              </form>

              {/* Loyalty Ledger log */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Loyalty Point Ledger</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedCustomer.loyaltyTransactions?.length === 0 ? (
                    <p className="text-center text-slate-400 py-3">No points ledger records.</p>
                  ) : (
                    selectedCustomer.loyaltyTransactions?.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50/50 border border-slate-100 rounded-lg text-[10px]">
                        <div>
                          <strong className="text-slate-700 capitalize">{t.type}</strong>
                          <span className="text-slate-400 block text-[9px]">{new Date(t.timestamp).toLocaleDateString()}</span>
                        </div>
                        <span className={`font-black ${t.type === 'EARN' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {t.type === 'EARN' ? '+' : '-'}{t.points} pts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Invoice History */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Purchase Invoices ({selectedCustomer.invoices?.length})</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedCustomer.invoices?.length === 0 ? (
                    <p className="text-center text-slate-400 py-3">No orders placed.</p>
                  ) : (
                    selectedCustomer.invoices?.map((inv, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-slate-50/50 border border-slate-100 rounded-lg text-[10px]">
                        <span className="font-mono font-bold text-slate-650">{inv.invoiceNumber}</span>
                        <span className="font-black text-indigo-600">₹{(inv.grandTotal / 100).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <p className="text-center text-slate-400 py-12 text-xs">Select a customer profile from the left table to inspect ledger data.</p>
          )}
        </div>

      </div>

      {/* Merge Duplicate profiles Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Merge Duplicate Customers</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleMerge} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold rounded-lg">
                WARNING: Merging profiles combines loyalty points, transfers invoice records, and permanently deletes duplicate records.
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Duplicate Source Profiles (Select multiple)</label>
                <select
                  multiple
                  required
                  value={sourceIds}
                  onChange={e => setSourceIds(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none min-h-[120px]"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone} | {c.loyaltyPoints} pts)</option>
                  ))}
                </select>
                <span className="text-[9px] text-slate-450 mt-1 block">Hold Ctrl (Windows) / Cmd (Mac) to select multiple.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Target Profile (The primary profile to keep)</label>
                <select
                  required
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none font-semibold text-slate-700"
                >
                  <option value="">Select primary profile...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowMergeModal(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-semibold">Merge Profiles</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentWidget({ title, count, icon, bgClass }) {
  return (
    <div className={`p-4 rounded-xl flex items-center justify-between border shadow-sm ${bgClass}`}>
      <div>
        <span className="text-[10px] font-semibold text-slate-500">{title}</span>
        <h4 className="text-xl font-extrabold text-slate-800 mt-1 leading-none">{count}</h4>
      </div>
      <div className="p-2 bg-white rounded-lg border border-slate-150 shadow-sm">{icon}</div>
    </div>
  );
}

export default CRM;
