import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileDown, RefreshCw, Layers, TrendingUp, ShoppingBag, CreditCard, ChevronRight } from 'lucide-react';

function Reports() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'purchase', 'gst', 'stock', 'pl'
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  const [salesData, setSalesData] = useState(null);
  const [purchaseData, setPurchaseData] = useState([]);
  const [gstData, setGstData] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [plData, setPlData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'sales') {
        const res = await axios.get('/api/reports/sales', { params: { startDate, endDate } });
        setSalesData(res.data);
      } else if (activeReport === 'purchase') {
        const res = await axios.get('/api/purchases');
        setPurchaseData(res.data);
      } else if (activeReport === 'gst') {
        const res = await axios.get('/api/reports/gstr', { params: { startDate, endDate } });
        setGstData(res.data);
      } else if (activeReport === 'stock') {
        const res = await axios.get('/api/reports/stock');
        setStockData(res.data);
      } else if (activeReport === 'pl') {
        const res = await axios.get('/api/reports/pnl', { params: { startDate, endDate } });
        setPlData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate]);

  const exportToCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `${activeReport}_report.csv`;

    if (activeReport === 'sales' && salesData) {
      headers = ['Invoice Number', 'Customer', 'Subtotal (Rs)', 'Discount (Rs)', 'Tax (Rs)', 'Grand Total (Rs)'];
      rows = salesData.records.map(r => [r.invoiceNumber, r.customer, r.subtotal.toFixed(2), r.discount.toFixed(2), r.tax.toFixed(2), r.total.toFixed(2)]);
    } else if (activeReport === 'purchase') {
      headers = ['Bill Number', 'Date', 'Supplier', 'Items Count', 'Total Qty', 'Total Amount (Rs)'];
      rows = purchaseData.map(p => [p.billNumber, new Date(p.date).toLocaleDateString(), p.supplierName, p.items.length, p.totalQty, (p.totalAmount / 100).toFixed(2)]);
    } else if (activeReport === 'gst') {
      headers = ['HSN/Code', 'Tax rate (%)', 'Taxable value (Rs)', 'CGST (Rs)', 'SGST (Rs)', 'Total Tax (Rs)'];
      rows = gstData.map(g => [g.hsn, g.taxRate, g.taxableValue.toFixed(2), g.cgst.toFixed(2), g.sgst.toFixed(2), g.totalTax.toFixed(2)]);
    } else if (activeReport === 'stock' && stockData) {
      headers = ['Item Code', 'Product Name', 'Quantity', 'Valuation Cost (Rs)', 'Valuation MRP (Rs)', 'Status'];
      rows = stockData.ledger.map(s => [s.itemCode, s.name, s.qty, (s.costValue / 100).toFixed(2), (s.mrpValue / 100).toFixed(2), s.status]);
    } else if (activeReport === 'pl' && plData) {
      headers = ['Metric', 'Amount (Rs)'];
      rows = [
        ['Gross Sales Revenue', (plData.revenue / 100).toFixed(2)],
        ['Cost of Goods Sold (COGS)', (plData.cogs / 100).toFixed(2)],
        ['Discounts Issued', (plData.discount / 100).toFixed(2)],
        ['Operating Profit', (plData.grossProfit / 100).toFixed(2)]
      ];
    }

    if (headers.length === 0) return;
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans p-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Financial Reports & Audit Ledger</h2>
          <p className="text-sm text-slate-500">Run Sales summaries, GSTR tax returns, Stock ledgers, and Profit Statements</p>
        </div>
      </div>

      {/* Tabs list & Dates */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['sales', 'purchase', 'gst', 'stock', 'pl'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${activeReport === tab ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
            >
              {tab === 'sales' && 'Sales Ledger'}
              {tab === 'purchase' && 'Purchase Ledger'}
              {tab === 'gst' && 'GST Returns (GSTR-1)'}
              {tab === 'stock' && 'Stock Valuation'}
              {tab === 'pl' && 'Profit & Loss'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
          />
          <button
            onClick={fetchReport}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
            title="Export CSV"
          >
            <FileDown size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* View Reports */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between">
        {loading ? (
          <div className="flex items-center justify-center min-h-[250px] flex-1">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : activeReport === 'sales' && salesData ? (
          <div className="space-y-6 flex-1">
            {/* Sales KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Sales Invoices</span>
                <p className="text-2xl font-black mt-1 leading-none">{salesData.summary.count}</p>
              </div>
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-850">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Tax Collections</span>
                <p className="text-2xl font-black mt-1 leading-none">₹{(salesData.summary.totalTax / 100).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Net Sales Volume</span>
                <p className="text-2xl font-black mt-1 leading-none">₹{(salesData.summary.totalSales / 100).toFixed(2)}</p>
              </div>
            </div>
            {/* Sales table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3 text-rose-500">Discount</th>
                    <th className="p-3">Tax</th>
                    <th className="p-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.records.map((r, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-700">{r.invoiceNumber}</td>
                      <td className="p-3 font-semibold">{r.customer}</td>
                      <td className="p-3">₹{(r.subtotal / 100).toFixed(2)}</td>
                      <td className="p-3 text-rose-500 font-medium">-₹{(r.discount / 100).toFixed(2)}</td>
                      <td className="p-3">₹{(r.tax / 100).toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-indigo-650">₹{(r.total / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeReport === 'purchase' ? (
          <div className="space-y-4 flex-1">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Purchase Orders & Batch Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-3">Bill Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier Vendor</th>
                    <th className="p-3 text-center">Items Count</th>
                    <th className="p-3 text-right">Total Qty</th>
                    <th className="p-3 text-right">Total Purchase (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseData.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-slate-400">No purchases found.</td></tr>
                  ) : (
                    purchaseData.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700">{p.billNumber}</td>
                        <td className="p-3 text-slate-400">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="p-3 font-semibold">{p.supplierName}</td>
                        <td className="p-3 text-center font-bold text-slate-650">{p.items.length}</td>
                        <td className="p-3 text-right">{p.totalQty} items</td>
                        <td className="p-3 text-right font-black text-indigo-650">₹{(p.totalAmount / 100).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeReport === 'gst' ? (
          <div className="space-y-4 flex-1">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">GSTR-1 Tax Return splits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-3">Tax Slab Rate</th>
                    <th className="p-3">Taxable Sales Value</th>
                    <th className="p-3">CGST (Intra-state)</th>
                    <th className="p-3">SGST (Intra-state)</th>
                    <th className="p-3">IGST (Inter-state)</th>
                    <th className="p-3 text-right">Total GST Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-slate-400">No GST transactions found.</td></tr>
                  ) : (
                    gstData.map((g, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-extrabold text-amber-600">{g.taxRate}% Slab</td>
                        <td className="p-3">₹{(g.taxableValue / 105).toFixed(2)}</td> {/* stub */}
                        <td className="p-3">₹{(g.cgst / 100).toFixed(2)}</td>
                        <td className="p-3">₹{(g.sgst / 100).toFixed(2)}</td>
                        <td className="p-3">₹{0.00}</td>
                        <td className="p-3 text-right font-black text-indigo-600">₹{(g.totalTax / 100).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeReport === 'stock' && stockData ? (
          <div className="space-y-6 flex-1">
            {/* Stock Valuation summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-teal-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Valuation at Cost</span>
                <p className="text-2xl font-black mt-1 leading-none">₹{(stockData.valuationCost / 100).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-850">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Valuation at MRP</span>
                <p className="text-2xl font-black mt-1 leading-none">₹{(stockData.valuationMrp / 100).toFixed(2)}</p>
              </div>
            </div>
            {/* Stock table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Qty on Hand</th>
                    <th className="p-3">Cost Valuation</th>
                    <th className="p-3">MRP Valuation</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.ledger.map((s, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-semibold text-slate-500">{s.itemCode}</td>
                      <td className="p-3 font-bold text-slate-750">{s.name}</td>
                      <td className="p-3 text-center font-extrabold">{s.qty}</td>
                      <td className="p-3">₹{(s.costValue / 100).toFixed(2)}</td>
                      <td className="p-3">₹{(s.mrpValue / 100).toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'LOW' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeReport === 'pl' && plData ? (
          <div className="space-y-6 max-w-xl mx-auto flex-1 flex flex-col justify-center">
            <h3 className="text-lg font-black text-slate-800 text-center border-b border-slate-100 pb-3">Income & Profit Statement</h3>
            
            <div className="space-y-3.5 text-sm font-semibold">
              <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500">Gross Sales Revenue</span>
                <span className="font-bold text-slate-800">₹{(plData.revenue / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500">Cost of Goods Sold (COGS)</span>
                <span className="font-bold text-rose-500">-₹{(plData.cogs / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500">Discounts & Coupons</span>
                <span className="font-bold text-rose-500">-₹{(plData.discount / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-lg font-black mt-6 shadow-sm">
                <span>Net Operating Profit</span>
                <span>₹{(plData.grossProfit / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[250px] text-slate-400 flex-1">
            <span>Select parameters and click refresh to generate report</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
