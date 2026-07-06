import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShoppingCart,
  FileText,
  Settings,
  Activity,
  CreditCard,
  UserCheck,
  Bell,
  HelpCircle,
  Search,
  HeartHandshake,
  FileCheck,
  Landmark,
  BookOpen
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Purchases from './pages/Purchases';
import CRM from './pages/CRM';
import Staff from './pages/Staff';
import LoyaltySettings from './pages/LoyaltySettings';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
// Newly created components
import Sales from './pages/Sales';
import Accounting from './pages/Accounting';
// Setup default auth headers for axios
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
function App() {
  const [authToken, setToken] = useState(token);
  
  const getPosUrl = () => {
    const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3001'
      : 'https://nm-pos-inky.vercel.app';
    const adminUrl = window.location.origin;
    if (authToken) {
      return `${baseUrl}/?token=${authToken}&adminUrl=${encodeURIComponent(adminUrl)}`;
    }
    return `${baseUrl}/?adminUrl=${encodeURIComponent(adminUrl)}`;
  };
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      axios.get('/api/auth/me')
        .then(res => setUser(res.data))
        .catch(err => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        });
    }
  }, [authToken]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };
  
  if (!authToken) {
    return <Router><Routes><Route path="*" element={<Login setToken={setToken} />} /></Routes></Router>;
  }
  
  if (!user) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div></div>;
  }
  
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm">
          <div>
            <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-slate-50/50">
              <span className="font-extrabold text-lg tracking-wider text-indigo-600">NM SUPERMARKET</span>
            </div>
            
            <nav className="p-4 space-y-0.5 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <SidebarLink to="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
              <SidebarLink to="/admin/customers" icon={<Users size={18} />} label="Contact" />
              <SidebarLink to="/admin/staff" icon={<UserCheck size={18} />} label="Employee" />
              <SidebarLink to="/admin/products" icon={<ShoppingBag size={18} />} label="Inventory" />
              <SidebarLink to="/admin/purchases" icon={<ShoppingCart size={18} />} label="Purchase" />
              <SidebarLink to="/admin/sales" icon={<FileCheck size={18} />} label="Sales" />
              
              <a
                href={getPosUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <CreditCard size={18} className="text-slate-400" />
                <span>POS</span>
              </a>
              
              <SidebarLink to="/admin/accounting" icon={<BookOpen size={18} />} label="Accounting" />
              <SidebarLink to="/admin/crm" icon={<HeartHandshake size={18} />} label="CRM" />
              <SidebarLink to="/admin/audit-log" icon={<Activity size={18} />} label="Utilities" />
              <SidebarLink to="/admin/reports" icon={<FileText size={18} />} label="Report" />
              <SidebarLink to="/admin/settings/loyalty" icon={<Settings size={18} />} label="Loyalty Program" />
            </nav>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-2"
            >
              Sign Out
            </button>
          </div>
        </aside>
        
        {/* Main Content Layout */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 w-96">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions, customers, or stock..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-slate-600">
              <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none">
                <option value="">Quick Action</option>
                <option value="billing">Open Billing Desk</option>
                <option value="stock">Setup Opening Stock</option>
                <option value="loyalty">Update Loyalty Settings</option>
              </select>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">FY:</span>
                <select className="px-2 py-1 bg-transparent border-0 rounded text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>
              
              <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={18} className="text-slate-500" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-600 rounded-full"></span>
              </button>
              
              <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <HelpCircle size={18} className="text-slate-500" />
              </button>
              
              <div className="h-8 w-8 bg-indigo-100 border border-indigo-200 rounded-full flex items-center justify-center font-bold text-indigo-700 text-sm">
                A
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-8 overflow-y-auto">
            <Routes>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/crm" element={<CRM />} />
              <Route path="/admin/purchases" element={<Purchases />} />
              <Route path="/admin/sales" element={<Sales />} />
              <Route path="/admin/accounting" element={<Accounting />} />
              <Route path="/admin/staff" element={<Staff />} />
              <Route path="/admin/settings/loyalty" element={<LoyaltySettings />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/audit-log" element={<AuditLog />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
function SidebarLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
    >
      <span className="text-slate-400">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
export default App;
