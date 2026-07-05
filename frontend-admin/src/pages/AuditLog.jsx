import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/audit', { params: { search } });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLogs();
  }, [search]);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 font-sans">System Audit Logs</h2>
        <p className="text-sm text-slate-400">Immutable trail of updates, deletes, permissions changes, and sales checkouts</p>
      </div>
      
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by operator name or action details..."
          className="w-full bg-transparent text-slate-100 focus:outline-none placeholder-slate-500"
        />
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Module</th>
                <th className="p-4">Action</th>
                <th className="p-4">Before JSON</th>
                <th className="p-4">After JSON</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Loading trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No logs found.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/10">
                    <td className="p-4 text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-slate-200">{log.staffName || `Staff ID: ${log.staffId}`}</td>
                    <td className="p-4 uppercase tracking-wider font-semibold text-indigo-400">{log.module}</td>
                    <td className="p-4 font-medium">{log.action}</td>
                    <td className="p-4 max-w-xs truncate text-slate-500 font-mono" title={log.beforeJson}>{log.beforeJson || '-'}</td>
                    <td className="p-4 max-w-xs truncate text-slate-500 font-mono" title={log.afterJson}>{log.afterJson || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditLog;
