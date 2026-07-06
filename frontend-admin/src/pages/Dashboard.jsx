import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, ZoomIn, ZoomOut, Download, Award, UserCheck, AlertTriangle, AlertOctagon, Landmark } from 'lucide-react';

function Dashboard() {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  
  // Dedicated chart date pickers
  const [chart1Start, setChart1Start] = useState(todayStr);
  const [chart1End, setChart1End] = useState(todayStr);
  const [chart2Start, setChart2Start] = useState(todayStr);
  const [chart2End, setChart2End] = useState(todayStr);
  
  const [location, setLocation] = useState('All Locations');
  const [channel, setChannel] = useState('All Channels');
  const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString());
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchStats = async () => {
    setLoading(true);
    try {
      const startLocal = new Date(startDate + 'T00:00:00').toISOString();
      const endLocal = new Date(endDate + 'T23:59:59.999').toISOString();
      const res = await axios.get('/api/dashboard/stats', {
        params: { startDate: startLocal, endDate: endLocal, locationId: location !== 'All Locations' ? location : undefined, channel: channel !== 'All Channels' ? channel : undefined }
      });
      setStats(res.data);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStats();
  }, [startDate, endDate, location, channel]);
  
  const handleRefresh = () => {
    fetchStats();
  };
  
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  const { kpis, customerSegmentation, paymentModeData, salesPurchaseChart, topCustomers, categorySales, bestSelling, leastSelling } = stats;
  
  return (
    <div className="space-y-6 bg-slate-50 min-h-screen text-slate-700 font-sans">
      
      {/* Date Filter & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none"
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Location:</span>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
            >
              <option value="All Locations">All Locations</option>
              <option value="L001">Main Counter</option>
              <option value="L002">Backstore Depot</option>
            </select>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Channel:</span>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
            >
              <option value="All Channels">All Channels</option>
              <option value="COUNTER_1">Counter 1</option>
              <option value="DELIVERY">Delivery Channel</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
          <span className="text-xs text-slate-400">Last Synced: <strong className="text-slate-600">{lastSynced}</strong></span>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all text-slate-500"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      
      {/* 6-Column KPI Grid Grouped by Colors */}
      <div className="space-y-4">
        {/* Teal Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiTile title="Total Sales" value={`₹${kpis.totalSales.toLocaleString()}`} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
          <KpiTile title="Total Invoice" value={kpis.totalInvoices} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
          <KpiTile title="Sold Qty" value={kpis.soldQty} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
          <KpiTile title="Total Customers" value={kpis.totalCustomers} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
          <KpiTile title="To Receive" value={`₹${kpis.toReceive.toLocaleString()}`} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
          <KpiTile title="Total Sales Return" value={`₹${kpis.salesReturn.toLocaleString()}`} colorClass="bg-teal-50 border-teal-200 text-teal-800" labelColor="text-teal-500" />
        </div>
        
        {/* Light Blue Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiTile title="Total Purchase" value={`₹${(kpis.totalPurchase || 0).toLocaleString()}`} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
          <KpiTile title="Total Bills" value={kpis.totalPurchaseBills || 0} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
          <KpiTile title="Purchase Qty" value={kpis.purchaseQty || 0} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
          <KpiTile title="Total Suppliers" value={kpis.totalSuppliers || 0} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
          <KpiTile title="To Pay" value={`₹${(kpis.toPay || 0).toLocaleString()}`} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
          <KpiTile title="Total Purchase Return" value={`₹${(kpis.totalPurchaseReturn || 0).toLocaleString()}`} colorClass="bg-sky-50 border-sky-200 text-sky-800" labelColor="text-sky-500" />
        </div>
        
        {/* Purple Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiTile title="Total Paid" value={`₹${kpis.totalSales.toLocaleString()}`} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
          <KpiTile title="Total Expense" value={`₹${(kpis.totalExpense || 0).toLocaleString()}`} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
          <KpiTile title="Total Products" value={kpis.totalProducts} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
          <KpiTile title="Stock Qty" value={kpis.stockQty} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
          <KpiTile title="Stock Value" value={`₹${kpis.stockValue.toLocaleString()}`} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
          <KpiTile title="Cash in Hand" value={`₹${kpis.cashInHand.toLocaleString()}`} colorClass="bg-purple-50 border-purple-200 text-purple-800" labelColor="text-purple-500" />
        </div>
        
        {/* Pink Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiTile title="Gross Profit" value={`₹${kpis.grossProfit.toLocaleString()}`} colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
          <KpiTile title="Avg Profit Margin" value={`₹${(kpis.grossProfit / kpis.totalInvoices).toFixed(2)}`} colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
          <KpiTile title="Avg Profit Margin %" value={`${kpis.avgProfitMarginPct}%`} colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
          <KpiTile title="Avg Cart Value" value={`₹${kpis.avgCartValue.toFixed(2)}`} colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
          <KpiTile title="Avg Bills" value={`${kpis.avgBillsPerDay}/day`} colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
          <KpiTile title="Bank Accounts" value="3 accounts" colorClass="bg-pink-50 border-pink-200 text-pink-800" labelColor="text-pink-500" />
        </div>
      </div>
      
      {/* Side-by-Side Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Sales vs Purchase */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Sales vs Purchase</h3>
            <div className="flex items-center gap-1.5 text-[10px]">
              <input type="date" value={chart1Start} onChange={e => setChart1Start(e.target.value)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none" />
              <span>to</span>
              <input type="date" value={chart1End} onChange={e => setChart1End(e.target.value)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none" />
              <button className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500"><ZoomIn size={12} /></button>
              <button className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500"><Download size={12} /></button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesPurchaseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sales" fill="#0ea5e9" name="Sales" />
                <Bar dataKey="purchase" fill="#cbd5e1" name="Purchase" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Chart 2: Transaction by Payment Mode */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-bold text-slate-800 text-sm">Transaction by Payment Mode</h3>
            <div className="flex items-center gap-1.5 text-[10px]">
              <input type="date" value={chart2Start} onChange={e => setChart2Start(e.target.value)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none" />
              <span>to</span>
              <input type="date" value={chart2End} onChange={e => setChart2End(e.target.value)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none" />
              <button className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500"><ZoomIn size={12} /></button>
              <button className="p-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-500"><Download size={12} /></button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentModeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" fill="#818cf8" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Customers, Segments, Categories layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top 20 Customers Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-850 text-sm border-b border-slate-100 pb-2">Top 20 Customers</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/50 sticky top-0">
                  <th className="p-2 w-12 text-center">Rank</th>
                  <th className="p-2">Name</th>
                  <th className="p-2 text-center">Bills</th>
                  <th className="p-2 text-right">Sales Value</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 text-center text-slate-500 font-semibold">{index + 1}</td>
                    <td className="p-2 font-medium">{c.name}</td>
                    <td className="p-2 text-center">{c.bills}</td>
                    <td className="p-2 text-right font-bold text-indigo-600">₹{c.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Segmentation Counter panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-855 text-sm border-b border-slate-100 pb-2">Customer Segmentation</h3>
          <div className="grid grid-cols-2 gap-4">
            <SegmentWidget title="VIP Customer" count={customerSegmentation.vip} icon={<Award size={16} className="text-amber-600" />} bgClass="bg-amber-50" />
            <SegmentWidget title="Regular Customer" count={customerSegmentation.regular} icon={<UserCheck size={16} className="text-teal-600" />} bgClass="bg-teal-50" />
            <SegmentWidget title="Risk Customer" count={customerSegmentation.atRisk} icon={<AlertTriangle size={16} className="text-orange-600" />} bgClass="bg-orange-50" />
            <SegmentWidget title="Lost Customer" count={customerSegmentation.lost} icon={<AlertOctagon size={16} className="text-rose-600" />} bgClass="bg-rose-50" />
          </div>
        </div>
        
        {/* Category Sales Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-855 text-sm border-b border-slate-100 pb-2">Category Sales</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 bg-slate-50/50 sticky top-0">
                  <th className="p-2">Category</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Sales Amount</th>
                  <th className="p-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {categorySales.map((cs, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 font-medium">{cs.category}</td>
                    <td className="p-2 text-center">{cs.qty}</td>
                    <td className="p-2 text-right">₹{cs.amount.toLocaleString()}</td>
                    <td className="p-2 text-right text-emerald-600 font-bold">₹{cs.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Best & Least Selling Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-855 text-sm border-b border-slate-100 pb-2 text-teal-700">Best Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="p-2">Product</th>
                  <th className="p-2 text-center">Bills</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {bestSelling.slice(0, 5).map((p, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 font-medium text-slate-800">{p.name}</td>
                    <td className="p-2 text-center">{p.bills}</td>
                    <td className="p-2 text-center">{p.qty}</td>
                    <td className="p-2 text-right">₹{p.amount.toLocaleString()}</td>
                    <td className="p-2 text-right text-emerald-600 font-bold">₹{p.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Least Selling */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-855 text-sm border-b border-slate-100 pb-2 text-rose-700">Least Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="p-2">Product</th>
                  <th className="p-2 text-center">Bills</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {leastSelling.slice(0, 5).map((p, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 font-medium text-slate-800">{p.name}</td>
                    <td className="p-2 text-center">{p.bills}</td>
                    <td className="p-2 text-center">{p.qty}</td>
                    <td className="p-2 text-right">₹{p.amount.toLocaleString()}</td>
                    <td className="p-2 text-right text-rose-600 font-bold">₹{p.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ title, value, colorClass, labelColor }) {
  return (
    <div className={`p-4 border rounded-xl flex flex-col justify-between shadow-sm transition-all hover:scale-[1.01] ${colorClass}`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}>{title}</span>
      <h4 className="text-lg font-black mt-2 leading-none">{value}</h4>
    </div>
  );
}

function SegmentWidget({ title, count, icon, bgClass }) {
  return (
    <div className={`p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm ${bgClass}`}>
      <div>
        <span className="text-[10px] font-semibold text-slate-500">{title}</span>
        <h4 className="text-xl font-extrabold text-slate-800 mt-1 leading-none">{count}</h4>
      </div>
      <div className="p-2 bg-white rounded-lg border border-slate-150">{icon}</div>
    </div>
  );
}

export default Dashboard;
