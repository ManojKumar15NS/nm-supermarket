import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, List, FolderPlus, CreditCard, ChevronRight, Save, Trash2, X } from 'lucide-react';

function Purchases() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'suppliers', 'new-entry'
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New Supplier Form
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supOpening, setSupOpening] = useState('0');
  
  // New Purchase Entry Form
  const [billNumber, setBillNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([{ productId: '', qty: 1 }]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await axios.get('/api/purchases');
      setPurchases(pRes.data);
      const sRes = await axios.get('/api/purchases/suppliers');
      setSuppliers(sRes.data);
      const prodRes = await axios.get('/api/products');
      setProducts(prodRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const paise = Math.round(parseFloat(supOpening || 0) * 100);
      await axios.post('/api/purchases/suppliers', {
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        gstin: supGstin,
        address: supAddress,
        openingBalance: paise
      });
      setShowAddSupplierModal(false);
      setSupName(''); setSupContact(''); setSupPhone(''); setSupEmail(''); setSupGstin(''); setSupAddress(''); setSupOpening('0');
      fetchData();
    } catch (err) {
      alert('Failed to register vendor');
    }
  };

  const handleAddRow = () => {
    setPurchaseItems([...purchaseItems, { productId: '', qty: 1 }]);
  };

  const handleRemoveRow = (idx) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx, field, val) => {
    const updated = [...purchaseItems];
    updated[idx][field] = val;
    setPurchaseItems(updated);
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!billNumber || !selectedSupplier || purchaseItems.some(i => !i.productId)) {
      return alert('Fill all purchase header and items fields');
    }
    try {
      await axios.post('/api/purchases', {
        billNumber,
        supplierId: parseInt(selectedSupplier),
        items: purchaseItems.map(i => ({ productId: parseInt(i.productId), qty: parseInt(i.qty) }))
      });
      alert('Purchase invoice registered successfully!');
      setBillNumber('');
      setSelectedSupplier('');
      setPurchaseItems([{ productId: '', qty: 1 }]);
      setActiveTab('orders');
      fetchData();
    } catch (err) {
      alert('Failed to log purchase order');
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Procurement & Purchases</h2>
          <p className="text-sm text-slate-500">Track vendor suppliers, import stock batches, and log purchase bills</p>
        </div>
      </div>

      {/* Tab controls */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          Purchase Bills Log
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'suppliers' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          Vendors / Suppliers
        </button>
        <button
          onClick={() => setActiveTab('new-entry')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'new-entry' ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-450 hover:text-slate-700'}`}
        >
          + Add Purchase Bill
        </button>
      </div>

      {/* View layouts */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>
      ) : activeTab === 'orders' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                  <th className="p-4">Bill Number</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-center">Items Count</th>
                  <th className="p-4 text-right">Total Quantity</th>
                  <th className="p-4 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">No purchase records registered yet.</td>
                  </tr>
                ) : (
                  purchases.map((p, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-slate-700">{p.billNumber}</td>
                      <td className="p-4 text-xs text-slate-500">{new Date(p.date).toLocaleString()}</td>
                      <td className="p-4 font-semibold">{p.supplierName}</td>
                      <td className="p-4 text-center font-bold text-slate-600">{p.items.length}</td>
                      <td className="p-4 text-right">{p.totalQty} items</td>
                      <td className="p-4 text-right font-black text-indigo-600">₹{(p.totalAmount / 100).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'suppliers' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-bold shadow-sm"
            >
              + Add Supplier Profile
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                  <th className="p-4">Vendor Name</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">GSTIN</th>
                  <th className="p-4 text-right">Credit balance</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">No supplier profiles saved.</td>
                  </tr>
                ) : (
                  suppliers.map(s => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-4 font-semibold text-slate-750">{s.name}</td>
                      <td className="p-4 text-slate-500">{s.contactPerson || '-'}</td>
                      <td className="p-4 font-mono">{s.phone || '-'}</td>
                      <td className="p-4 text-xs text-slate-400">{s.email || '-'}</td>
                      <td className="p-4 font-mono uppercase text-slate-500">{s.gstin || '-'}</td>
                      <td className="p-4 text-right font-bold text-rose-500">₹{(s.openingBalance / 100).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* New Purchase entry form */
        <form onSubmit={handleSavePurchase} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 max-w-4xl">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2.5">Procurement Stock Receipt Form</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Purchase Bill Number</label>
              <input
                type="text"
                required
                value={billNumber}
                onChange={e => setBillNumber(e.target.value)}
                placeholder="e.g. PO-789012"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Supplier / Vendor</label>
              <select
                required
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-650 text-sm focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="">Select Vendor...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.gstin || 'No GSTIN'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Items Grid</label>
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-750 border border-indigo-250 hover:bg-indigo-100 rounded font-black transition-colors"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {purchaseItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-center bg-slate-50/50 p-3 border border-slate-200 rounded-xl">
                  <div className="flex-1">
                    <select
                      required
                      value={item.productId}
                      onChange={e => handleRowChange(index, 'productId', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold"
                    >
                      <option value="">Select Product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Barcode: {p.itemCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => handleRowChange(index, 'qty', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    disabled={purchaseItems.length === 1}
                    className="text-rose-500 hover:text-rose-650 disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-black shadow-sm"
            >
              <Save size={16} />
              Register Purchase & Import Stock
            </button>
          </div>
        </form>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Add Supplier Profile</h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Vendor Name</label>
                <input type="text" required value={supName} onChange={e => setSupName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Contact Person</label>
                  <input type="text" value={supContact} onChange={e => setSupContact(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Phone</label>
                  <input type="text" value={supPhone} onChange={e => setSupPhone(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email</label>
                  <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">GSTIN</label>
                  <input type="text" value={supGstin} onChange={e => setSupGstin(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Address</label>
                <input type="text" value={supAddress} onChange={e => setSupAddress(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Opening Outstanding Balance (₹)</label>
                <input type="number" step="0.01" value={supOpening} onChange={e => setSupOpening(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none font-bold" />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-semibold">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Purchases;
