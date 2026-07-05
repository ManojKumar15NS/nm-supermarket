import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, UserPlus, Key, X, Lock, Check } from 'lucide-react';

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditPermissions, setShowEditPermissions] = useState(false);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  
  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/staff');
      setStaffList(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchRoles = async () => {
    try {
      const res = await axios.get('/api/staff/roles');
      setRoles(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);
  
  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/staff', { username, password, name, phone, roleId: parseInt(roleId) });
      setShowAddModal(false);
      setUsername(''); setPassword(''); setName(''); setPhone(''); setRoleId('');
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add staff');
    }
  };
  
  const handleToggleStatus = async (staff) => {
    const nextStatus = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await axios.put(`/api/staff/${staff.id}`, {
        ...staff,
        roleId: staff.roleId,
        status: nextStatus
      });
      fetchStaff();
    } catch (err) {
      alert('Failed to update status');
    }
  };
  
  const handleOpenPermissions = (role) => {
    setSelectedRole(role);
    // map current permissions
    const list = role.permissions.map(p => ({ module: p.module, action: p.action }));
    setRolePermissions(list);
    setShowEditPermissions(true);
  };
  
  const handleSavePermissions = async () => {
    try {
      await axios.put(`/api/staff/roles/${selectedRole.id}/permissions`, {
        permissions: rolePermissions
      });
      setShowEditPermissions(false);
      fetchRoles();
      fetchStaff();
    } catch (err) {
      alert('Failed to save permissions');
    }
  };
  
  const modulesList = ['POS/Billing', 'Inventory/Products', 'Customers', 'Purchases/Suppliers', 'Reports', 'Coupons/Loyalty', 'Staff Management', 'Settings/GST config'];
  const actionsList = ['view', 'add', 'edit', 'delete'];
  
  const togglePermission = (module, action) => {
    const exists = rolePermissions.some(p => p.module === module && p.action === action);
    if (exists) {
      setRolePermissions(rolePermissions.filter(p => !(p.module === module && p.action === action)));
    } else {
      setRolePermissions([...rolePermissions, { module, action }]);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Staff Control Panel</h2>
          <p className="text-sm text-slate-400">Configure operator logins, active shifts, and access rights matrix</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition-colors"
        >
          <UserPlus size={16} />
          Register Staff
        </button>
      </div>
      
      {/* Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Staff Directory */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-200">Active Operators</h3>
          <div className="space-y-3">
            {staffList.map(st => (
              <div key={st.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-200">{st.name}</h4>
                  <span className="text-xs text-indigo-400 font-mono">@{st.username}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-slate-400 rounded text-xs font-semibold uppercase">{st.role?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(st)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${st.status === 'ACTIVE' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border-rose-800 hover:bg-rose-900/30'}`}
                  >
                    {st.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right: Roles List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-200 font-sans">Access Roles</h3>
          <div className="space-y-3">
            {roles.map(r => (
              <div key={r.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-200">{r.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{r.permissions.length} actions enabled</p>
                </div>
                {r.name !== 'Admin' && (
                  <button
                    onClick={() => handleOpenPermissions(r)}
                    className="p-2 hover:bg-slate-900 rounded-lg text-indigo-400 transition-colors"
                  >
                    <ShieldCheck size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 1. Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-200">Register Staff Operator</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone</label>
                <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Role</label>
                <select required value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none">
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-950 text-slate-400 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 2. Edit Role Permissions Modal */}
      {showEditPermissions && selectedRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-200">Permissions Matrix: {selectedRole.name}</h3>
              <button onClick={() => setShowEditPermissions(false)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                      <th className="p-3">Module</th>
                      {actionsList.map(act => <th key={act} className="p-3 text-center capitalize">{act}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modulesList.map(mod => (
                      <tr key={mod} className="border-b border-slate-800 hover:bg-slate-800/10">
                        <td className="p-3 font-semibold text-slate-300">{mod}</td>
                        {actionsList.map(act => {
                          const isChecked = rolePermissions.some(p => p.module === mod && p.action === act);
                          return (
                            <td key={act} className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => togglePermission(mod, act)}
                                className={`h-6 w-6 rounded border flex items-center justify-center mx-auto transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-800 bg-slate-950 text-transparent'}`}
                              >
                                <Check size={14} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-950/50">
              <button type="button" onClick={() => setShowEditPermissions(false)} className="px-4 py-2 bg-slate-900 text-slate-400 rounded-lg text-sm">Cancel</button>
              <button type="button" onClick={handleSavePermissions} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white font-semibold">Save Access Matrix</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Staff;
