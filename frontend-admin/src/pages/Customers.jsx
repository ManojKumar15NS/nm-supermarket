import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, Edit, X, Save, Eye, Users, Layers } from 'lucide-react';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  
  // Merge duplicates state
  const [mergeSources, setMergeSources] = useState([]);
  const [mergeTarget, setMergeTarget] = useState('');

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

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const balancePaise = Math.round(parseFloat(openingBalance || 0) * 100);
      if (selectedCustomer && selectedCustomer.id) {
        // Edit mode
        await axios.put(`/api/customers/${selectedCustomer.id}`, { name, phone, email });
        alert('Customer updated successfully!');
      } else {
        // Add mode
        await axios.post('/api/customers', { name, phone, email, openingBalance: balancePaise });
        alert('Customer registered successfully!');
      }
      setShowAddModal(false);
      setName(''); setPhone(''); setEmail(''); setOpeningBalance('0'); setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save customer');
    }
  };

  const handleEditClick = (cust) => {
    setSelectedCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setOpeningBalance((cust.openingBalance / 100).toString());
    setShowAddModal(true);
  };

  const handleViewClick = async (cust) => {
    try {
      const res = await axios.get(`/api/customers/${cust.id}`);
      setSelectedCustomer(res.data);
      setShowViewModal(true);
    } catch (err) {
      alert('Failed to retrieve customer details');
    }
  };

  const handleMergeCustomers = async (e) => {
    e.preventDefault();
    if (mergeSources.length === 0 || !mergeTarget) {
      return alert('Select duplicate source profiles and a main target profile!');
    }
    try {
      await axios.post('/api/customers/merge', {
        sourceIds: mergeSources,
        targetId: parseInt(mergeTarget)
      });
      alert('Duplicate profiles merged successfully!');
      setShowMergeModal(false);
      setMergeSources([]);
      setMergeTarget('');
      fetchCustomers();
    } catch (err) {
      alert('Merge failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleSourceSelection = (id) => {
    if (mergeSources.includes(id)) {
      setMergeSources(mergeSources.filter(sid => sid !== id));
    } else {
      setMergeSources([...mergeSources, id]);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Customer Book (CRM)</h2>
          <p className="text-sm text-slate-500">Manage customer records, credit accounts, duplicate mergers, and loyalty settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-700 shadow-sm transition-colors"
          >
            <Layers size={16} className="text-slate-400" />
            Merge Duplicates
          </button>
          
          <button
            onClick={() => { setSelectedCustomer(null); clearForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
        <Search className="text-slate-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, phone, or email..."
          className="w-full bg-transparent text-slate-700 focus:outline-none placeholder-slate-400 text-sm"
        />
      </div>

      {/* Customer Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Loyalty Balance</th>
                <th className="p-4">Credit Due (₹)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-450">Loading customer database...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-450">No customer records found.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{c.name}</td>
                    <td className="p-4 text-slate-600 font-mono">{c.phone}</td>
                    <td className="p-4 text-slate-500">{c.email || '—'}</td>
                    <td className="p-4 text-amber-600 font-bold">{c.loyaltyPoints} points</td>
                    <td className={`p-4 font-black ${c.openingBalance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      ₹{(c.openingBalance / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleViewClick(c)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors"
                        title="View Customer Book"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditClick(c)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Edit Customer Profile"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{selectedCustomer ? 'Edit Customer Profile' : 'New Customer Profile'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-650"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {!selectedCustomer && (
                <div>
                  <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Opening Credit Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-bold text-rose-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-semibold shadow-sm">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ledger Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Customer Book: {selectedCustomer.name}</h3>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                  <p className="font-semibold text-slate-700 font-mono">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Email</span>
                  <p className="font-semibold text-slate-700">{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Points Balance</span>
                  <p className="font-extrabold text-amber-600">{selectedCustomer.loyaltyPoints} points</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Credit Due</span>
                  <p className="font-extrabold text-rose-500">₹{(selectedCustomer.openingBalance / 100).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Sales Invoices</h4>
                  {selectedCustomer.invoices?.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No invoices logged</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                      {selectedCustomer.invoices?.map(inv => (
                        <div key={inv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-700">{inv.invoiceNumber}</span>
                            <p className="text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-indigo-700">₹{(inv.grandTotal / 100).toFixed(2)}</span>
                            <p className="text-slate-400 capitalize">{inv.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-bold text-slate-700 border-b border-slate-200 pb-2">Points Statement</h4>
                  {selectedCustomer.loyaltyTransactions?.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No transactions logged</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                      {selectedCustomer.loyaltyTransactions?.map(lt => (
                        <div key={lt.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-700">{lt.type}</span>
                            <p className="text-slate-400 font-mono text-[10px]">{lt.referenceId}</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-black ${lt.points > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {lt.points > 0 ? `+${lt.points}` : lt.points}
                            </span>
                            <p className="text-slate-400">{new Date(lt.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Merge Duplicate Profiles</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-650"><X size={20} /></button>
            </div>
            <form onSubmit={handleMergeCustomers} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Select duplicate profiles (To delete)</label>
                <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {customers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 text-xs text-slate-600 cursor-pointer p-1 rounded hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={mergeSources.includes(c.id)}
                        onChange={() => toggleSourceSelection(c.id)}
                        className="rounded text-indigo-600 focus:ring-0 bg-white"
                      />
                      <span>{c.name} ({c.phone})</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase mb-2">Select main profile (To keep)</label>
                <select
                  required
                  value={mergeTarget}
                  onChange={e => setMergeTarget(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                >
                  <option value="">-- Choose Target --</option>
                  {customers
                    .filter(c => !mergeSources.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                </select>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowMergeModal(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm text-white font-semibold">Perform Merge</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function clearForm() {
  // stub helper to reset in window scope if needed
}

export default Customers;
