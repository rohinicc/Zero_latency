import React, { useState } from 'react';
import { 
  ScanLine, ShieldCheck, ShieldAlert, CheckCircle2, 
  XCircle, AlertTriangle, ArrowRight, RefreshCw, Sparkles, User
} from 'lucide-react';

export default function GateVerification({ onRefreshAllData }) {
  const [tokenInput, setTokenInput] = useState('');
  const [gateOperator, setGateOperator] = useState('North Gate - Scanner 1');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  async function handleVerify(e) {
    if (e) e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    setVerifying(true);
    setResult(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          gate_operator: gateOperator
        })
      });
      const data = await res.json();
      setResult(data);

      // Add to recent audit scans
      setRecentScans(prev => [{
        token,
        status: data.status,
        badge: data.badge,
        message: data.message,
        event_name: data.event_name,
        time: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 7)]);

      if (onRefreshAllData) onRefreshAllData();
    } catch (err) {
      setResult({
        status: 'ERROR',
        badge: 'SYSTEM ERROR',
        valid: false,
        message: err.message
      });
    } finally {
      setVerifying(false);
    }
  }

  function handleQuickPaste(token) {
    setTokenInput(token);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <ScanLine className="w-4 h-4" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Venue Gate Verification & Redemption
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Server-side one-time redemption check. Detects counterfeit, resold/invalidated, and duplicate tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Gate:</span>
          <select
            value={gateOperator}
            onChange={(e) => setGateOperator(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="North Gate - Scanner 1">North Gate - Scanner 1</option>
            <option value="VIP Turnstile A">VIP Turnstile A</option>
            <option value="East Gate - Scanner 3">East Gate - Scanner 3</option>
          </select>
        </div>
      </div>

      {/* Scanner Input Panel */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-800">
        
        <form onSubmit={handleVerify} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Enter or Scan Ticket Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. FP-EV1-TKT... or paste QR token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-mono text-white focus:outline-none focus:border-brand-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={verifying}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2 shrink-0"
            >
              <ScanLine className="w-4 h-4" />
              <span>{verifying ? 'Scanning...' : 'Verify & Redeem'}</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Token Presets for Hackathon Testing */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Hackathon Gate Test Scenarios (1-Click Paste)
          </span>
          <p className="text-xs text-slate-400">
            Click any button below to instantly populate tokens for different security outcomes:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickPaste('FP-TKT101-VALID')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors"
            >
              <span className="text-emerald-400 font-semibold block">Valid Pass</span>
              <span className="text-[10px] text-slate-400">Use any active ticket token</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPaste('FP-COUNTERFEIT-TOKEN-999')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors"
            >
              <span className="text-rose-400 font-semibold block">Counterfeit Token</span>
              <span className="text-[10px] text-slate-400">Triggers INVALID state</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPaste('FP-GUEST-1-SAMPLE')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors"
            >
              <span className="text-indigo-400 font-semibold block">Guest Pass</span>
              <span className="text-[10px] text-slate-400">Shared token test</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (tokenInput) handleVerify();
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left text-xs transition-colors"
            >
              <span className="text-amber-400 font-semibold block">Re-scan Token</span>
              <span className="text-[10px] text-slate-400">Tests ALREADY REDEEMED</span>
            </button>
          </div>
        </div>

        {/* Verification Result Card */}
        {result && (
          <div className="pt-4">
            {result.status === 'VALID' && (
              <div className="p-6 rounded-3xl bg-emerald-950/40 border-2 border-emerald-500/70 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                    {result.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-white mt-2">
                    Entry Approved!
                  </h3>
                  <p className="text-sm text-emerald-200/90 mt-1">{result.message}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 max-w-lg mx-auto text-xs text-left">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-800/40">
                    <span className="text-[10px] uppercase text-slate-400 block">Attendee</span>
                    <span className="font-semibold text-white truncate block">{result.owner_name}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-800/40">
                    <span className="text-[10px] uppercase text-slate-400 block">Event</span>
                    <span className="font-semibold text-white truncate block">{result.event_name}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-800/40">
                    <span className="text-[10px] uppercase text-slate-400 block">Ticket ID</span>
                    <span className="font-semibold text-white">#{result.ticket_id}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-800/40">
                    <span className="text-[10px] uppercase text-slate-400 block">Status</span>
                    <span className="font-bold text-emerald-400">REDEEMED</span>
                  </div>
                </div>
              </div>
            )}

            {result.status === 'ALREADY_REDEEMED' && (
              <div className="p-6 rounded-3xl bg-amber-950/40 border-2 border-amber-500/70 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/40">
                    {result.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-amber-200 mt-2">
                    Entry Rejected — Duplicate Usage Detected
                  </h3>
                  <p className="text-sm text-amber-300/90 mt-1 max-w-md mx-auto">{result.message}</p>
                </div>
              </div>
            )}

            {result.status === 'TRANSFERRED' && (
              <div className="p-6 rounded-3xl bg-rose-950/40 border-2 border-rose-500/70 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                  <XCircle className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/40">
                    {result.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-rose-200 mt-2">
                    Invalidated Token — Ticket Resold
                  </h3>
                  <p className="text-sm text-rose-300/90 mt-1 max-w-md mx-auto">{result.message}</p>
                </div>
              </div>
            )}

            {result.status === 'REVOKED' && (
              <div className="p-6 rounded-3xl bg-slate-900 border-2 border-slate-700 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                  <XCircle className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                    {result.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-white mt-2">
                    Guest Pass Revoked
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{result.message}</p>
                </div>
              </div>
            )}

            {result.status === 'INVALID' && (
              <div className="p-6 rounded-3xl bg-rose-950/40 border-2 border-rose-500/70 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                  <XCircle className="w-9 h-9" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/40">
                    {result.badge}
                  </span>
                  <h3 className="font-display font-extrabold text-2xl text-rose-200 mt-2">
                    Invalid / Counterfeit Token
                  </h3>
                  <p className="text-sm text-rose-300/90 mt-1 max-w-md mx-auto">{result.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Recent Gate Scan Audit Trail */}
      {recentScans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Recent Gate Operator Scan Logs
          </h3>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden">
            {recentScans.map((s, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    s.status === 'VALID' ? 'bg-emerald-400' : s.status === 'ALREADY_REDEEMED' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  <div>
                    <span className="font-mono text-slate-300 text-xs">{s.token}</span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-sm">{s.message}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    s.status === 'VALID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {s.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
