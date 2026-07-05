import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, FileText, Printer, FileX, ShieldAlert, Award } from 'lucide-react';

function Sales() {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'shifts'
  const [invoices, setInvoices] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sales/invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await axios.get('/api/sales/shifts');
      setShifts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') fetchInvoices();
    if (activeTab === 'shifts') fetchShifts();
  }, [activeTab]);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Sales Register</h2>
          <p className="text-sm text-slate-500">Track all customer sales invoices, checkout logs, and cashier register shifts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Sales Invoices
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'shifts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Cashier Shifts Register
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Search className="text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number or customer name..."
              className="w-full bg-transparent text-slate-700 focus:outline-none placeholder-slate-400 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice list */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Amount (₹)</th>
                    <th className="p-4">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading invoices...</td></tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No invoices logged.</td></tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="p-4 font-mono font-bold text-indigo-750">{inv.invoiceNumber}</td>
                        <td className="p-4 font-semibold text-slate-750">{inv.customer?.name}</td>
                        <td className="p-4 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 font-black">₹{(inv.grandTotal / 100).toFixed(2)}</td>
                        <td className="p-4 text-xs font-semibold text-slate-500 capitalize">
                          {inv.payments?.map(p => p.mode).join(', ') || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Invoice detail panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              {selectedInvoice ? (
                <>
                  <div className="border-b border-slate-100 pb-4">
                    <strong className="text-lg font-black text-slate-800 font-mono">{selectedInvoice.invoiceNumber}</strong>
                    <p className="text-xs text-slate-450">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Billed Customer</span>
                    <p className="font-bold text-slate-800 text-sm">{selectedInvoice.customer?.name}</p>
                    <p className="text-xs font-mono text-slate-500">{selectedInvoice.customer?.phone}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Sales Agent (Staff)</span>
                    <p className="font-semibold text-slate-700 text-xs">{selectedInvoice.staff?.name || 'Cashier'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Billed Items</span>
                    <div className="space-y-2">
                      {selectedInvoice.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                          <div>
                            <p className="font-bold text-slate-700">{item.product?.name}</p>
                            <span className="text-[10px] text-slate-400">Qty: {item.quantity} | Sale: ₹{(item.price/100).toFixed(2)}</span>
                          </div>
                          <span className="font-extrabold text-slate-800 pt-1">₹{((item.price * item.quantity)/100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{(selectedInvoice.subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total Tax (GST Included)</span>
                      <span>₹{(selectedInvoice.taxAmount / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Discounts Applied</span>
                      <span className="text-rose-500">-₹{(selectedInvoice.discountTotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-850 pt-2 border-t border-slate-50">
                      <span>Grand Total</span>
                      <span className="text-indigo-750 text-base">₹{(selectedInvoice.grandTotal / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                  <FileText size={40} className="text-slate-300" />
                  <span>Select any invoice to inspect items list & checkout payment logs</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Cashier Shift Sessions */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                <th className="p-4">Shift ID</th>
                <th className="p-4">Cashier (Staff)</th>
                <th className="p-4">Opening Cash</th>
                <th className="p-4">Expected Cash</th>
                <th className="p-4">Reported Cash</th>
                <th className="p-4">Difference</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No shifts logged.</td></tr>
              ) : (
                shifts.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-600">Shift #{s.id}</td>
                    <td className="p-4 font-semibold text-slate-850">{s.staff?.name}</td>
                    <td className="p-4">₹{(s.openingCash / 100).toFixed(2)}</td>
                    <td className="p-4 font-bold">₹{((s.openingCash + (s.salesCount || 0)*2000)/100).toFixed(2)}</td>
                    <td className="p-4">₹{(s.closingCash ? s.closingCash / 100 : 0).toFixed(2)}</td>
                    <td className={`p-4 font-bold ${s.difference < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      ₹{(s.difference / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-xs">
                      <span className={`px-2.5 py-1 rounded-full font-black ${s.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Sales;
