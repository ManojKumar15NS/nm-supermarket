import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw } from 'lucide-react';

function LoyaltySettings() {
  const [earnRate, setEarnRate] = useState('0.01');
  const [redemptionRate, setRedemptionRate] = useState('100');
  const [minPointsToRedeem, setMinPointsToRedeem] = useState('10');
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState('365');
  const [minBillValue, setMinBillValue] = useState('0');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/coupons/loyalty-settings');
      setEarnRate(res.data.earnRate.toString());
      setRedemptionRate(res.data.redemptionRate.toString());
      setMinPointsToRedeem(res.data.minPointsToRedeem.toString());
      setEnableExpiry(res.data.enableExpiry);
      setExpiryDays(res.data.expiryDays.toString());
      setMinBillValue((res.data.minBillValue / 100).toString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const minBillPaise = Math.round(parseFloat(minBillValue || 0) * 100);
      await axios.put('/api/coupons/loyalty-settings', {
        earnRate: parseFloat(earnRate),
        redemptionRate: parseInt(redemptionRate),
        minPointsToRedeem: parseInt(minPointsToRedeem),
        enableExpiry,
        expiryDays: parseInt(expiryDays),
        minBillValue: minBillPaise
      });
      alert('Loyalty settings updated successfully!');
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 font-sans">Loyalty & Reward Rules</h2>
        <p className="text-sm text-slate-400">Configure point conversion ratios, expiry gates, and checkout constraints</p>
      </div>
      
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Earn Rate (Points per ₹1 Spent)</label>
            <input
              type="number"
              step="0.0001"
              required
              value={earnRate}
              onChange={e => setEarnRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
              placeholder="e.g. 0.01 for 1 point per 100 Rs"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">0.01 = 1 point per ₹100 spend.</span>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Redemption Value (Paise per Point)</label>
            <input
              type="number"
              required
              value={redemptionRate}
              onChange={e => setRedemptionRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
              placeholder="e.g. 100 paise = 1 Rs value"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">100 paise = ₹1.00 discount per point.</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Points to Redeem</label>
            <input
              type="number"
              required
              value={minPointsToRedeem}
              onChange={e => setMinPointsToRedeem(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Bill Value to Earn Points (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={minBillValue}
              onChange={e => setMinBillValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-6 space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={enableExpiry}
              onChange={e => setEnableExpiry(e.target.checked)}
              className="h-4 w-4 bg-slate-950 border-slate-850 rounded text-indigo-600 focus:ring-0"
            />
            <span>Enable Points Expiry Cycle</span>
          </label>
          
          {enableExpiry && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expiry Window (Days)</label>
              <input
                type="number"
                required={enableExpiry}
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
              />
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold shadow-lg transition-colors"
          >
            <Save size={16} />
            {saving ? 'Updating...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LoyaltySettings;
