import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Activity, AlertTriangle, 
  RefreshCw, Unlock, Zap, Clock, User, CheckCircle2
} from 'lucide-react';

export default function SecurityDashboard({ onRefreshData }) {
  const [logs, setLogs] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [targetSimEmail, setTargetSimEmail] = useState('spammer@botnet.io');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  async function fetchSecurityData() {
    setLoading(true);
    try {
      const [logsRes, resRes] = await Promise.all([
        fetch('/api/admin/security/logs?limit=40'),
        fetch('/api/admin/security/restrictions')
      ]);
      const logsData = await logsRes.json();
      const resData = await resRes.json();
      setLogs(logsData);
      setRestrictions(resData);
    } catch (err) {
      console.error('Failed to load security logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnblock(identifier) {
    try {
      const res = await fetch('/api/admin/security/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      setActionMsg(data.message || `Unblocked ${identifier}`);
      await fetchSecurityData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  async function handleSimulateAttack() {
    try {
      const res = await fetch('/api/admin/security/simulate-attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 1,
          target_email: targetSimEmail,
          burst_count: 55
        })
      });
      const data = await res.json();
      setActionMsg(data.message);
      await fetchSecurityData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      setActionMsg(err.message);
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/60 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time Bot & Abuse Monitor</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            Security Shield & Behavioral Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitors interaction timing, rapid request spikes, and enforces automated 50-request burst lockouts.
            All security logs are recorded directly in the backend audit database.
          </p>
        </div>

        <button
          onClick={fetchSecurityData}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Logs</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
          <button onClick={() => setActionMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Lockouts</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-white">
            {restrictions.length}
          </span>
          <p className="text-[11px] text-slate-400">Temporary accounts restricted</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Threshold Setting</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-amber-300">
            50 reqs / 60s
          </span>
          <p className="text-[11px] text-slate-400">Burst lockout window: 5 mins</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Logged Events</span>
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-white">
            {logs.length}
          </span>
          <p className="text-[11px] text-slate-400">Recorded audit events</p>
        </div>
      </div>

      {/* Hackathon Demo Simulator Control */}
      <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simulate 50+ Request Burst Attack (Demo Tool)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly simulates 55 automated rapid requests within seconds to demonstrate the 50-request lockout threshold in real-time.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={targetSimEmail}
              onChange={(e) => setTargetSimEmail(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono w-44"
              placeholder="Target demo email"
            />
            <button
              onClick={handleSimulateAttack}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fire 55 Requests</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Restrictions Table */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-lg text-white">
          Active Temporary Bot Restrictions ({restrictions.length})
        </h3>

        {restrictions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No accounts currently restricted</p>
            <p className="text-slate-400 mt-0.5">All incoming client traffic is verified healthy and below rate limit thresholds.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
            {restrictions.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-300 font-mono">{r.identifier}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                      LOCKED OUT
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{r.reason}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Enforced at: {new Date(r.created_at).toLocaleString()} • Remaining: ~{Math.ceil(r.remaining_seconds / 60)} mins
                  </p>
                </div>

                <button
                  onClick={() => handleUnblock(r.identifier)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lift Restriction</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Audit Logs */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-lg text-white">
          Recent Security Audit Logs ({logs.length})
        </h3>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden max-h-[450px] overflow-y-auto">
          {logs.map((log) => {
            const isCritical = log.severity === 'CRITICAL';
            const isWarning = log.severity === 'WARNING';

            return (
              <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-rose-400 animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-brand-400'
                    }`} />
                    <span className="font-bold text-white font-mono">{log.log_type}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isCritical ? 'bg-rose-500/20 text-rose-300' : isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {log.severity}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Target: {log.identifier}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{log.details}</p>
                </div>

                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap shrink-0 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
