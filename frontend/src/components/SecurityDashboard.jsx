import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, Activity, AlertTriangle, 
  RefreshCw, Unlock, Zap, Clock, User, CheckCircle2, Sliders, Shield
} from 'lucide-react';

export default function SecurityDashboard({ onRefreshData }) {
  const [logs, setLogs] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [riskConfig, setRiskConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [targetSimEmail, setTargetSimEmail] = useState('spammer@botnet.io');
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  async function fetchSecurityData() {
    setLoading(true);
    try {
      const [logsRes, resRes, assessmentsRes, weightsRes] = await Promise.all([
        fetch('/api/admin/security/logs?limit=40'),
        fetch('/api/admin/security/restrictions'),
        fetch('/api/admin/security/risk-assessments?limit=30'),
        fetch('/api/admin/security/risk-weights')
      ]);
      const logsData = await logsRes.json();
      const resData = await resRes.json();
      const assessmentsData = await assessmentsRes.json();
      const weightsData = await weightsRes.json();

      setLogs(logsData);
      setRestrictions(resData);
      setRiskAssessments(assessmentsData);
      setRiskConfig(weightsData);
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

  async function handleSaveWeights(e) {
    e.preventDefault();
    if (!riskConfig) return;
    setSavingWeights(true);
    try {
      const res = await fetch('/api/admin/security/risk-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rapid_submit_weight: riskConfig.weights.rapid_submit_weight,
          burst_request_weight: riskConfig.weights.burst_request_weight,
          queue_anomaly_weight: riskConfig.weights.queue_anomaly_weight,
          bypass_attempt_weight: riskConfig.weights.bypass_attempt_weight,
          session_anomaly_weight: riskConfig.weights.session_anomaly_weight,
          medium_threshold: riskConfig.thresholds.medium,
          high_threshold: riskConfig.thresholds.high
        })
      });
      const data = await res.json();
      setActionMsg('Configurable Risk Weights & Thresholds updated successfully.');
      setRiskConfig({ weights: data.weights, thresholds: data.thresholds });
    } catch (err) {
      setActionMsg('Failed to update weights: ' + err.message);
    } finally {
      setSavingWeights(false);
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/60 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time Behavioral Risk Engine & Bot Shield</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            Security Shield & Risk Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Multi-signal behavioral risk scoring (timing, burst rate, queue anomalies, bypass attempts, session variations).
            Classifies requests into LOW (allow), MEDIUM (verification challenge), and HIGH (temporary restriction).
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <span>Risk Assessments</span>
            <Shield className="w-4 h-4 text-brand-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-brand-400">
            {riskAssessments.length}
          </span>
          <p className="text-[11px] text-slate-400">Telemetry evaluations logged</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Burst Threshold</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-amber-300">
            50 reqs / 60s
          </span>
          <p className="text-[11px] text-slate-400">Lockout duration: 5 mins</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Audit Events</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-display font-extrabold text-3xl text-white">
            {logs.length}
          </span>
          <p className="text-[11px] text-slate-400">Recorded audit events</p>
        </div>
      </div>

      {/* Configurable Behavioral Risk Engine Weights & Thresholds */}
      {riskConfig && (
        <div className="p-6 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-400" />
                <span>Configurable Behavioral Risk Weights & Thresholds</span>
              </h3>
              <p className="text-xs text-slate-400">
                Tune signal weights and classification thresholds. Changes take effect dynamically without restarting the server.
              </p>
            </div>
            <button
              onClick={handleSaveWeights}
              disabled={savingWeights}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {savingWeights ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Rapid Submit Weight</span>
                <span className="font-mono text-brand-400 font-bold">{riskConfig.weights.rapid_submit_weight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={riskConfig.weights.rapid_submit_weight}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  weights: { ...riskConfig.weights, rapid_submit_weight: parseFloat(e.target.value) }
                })}
                className="w-full accent-brand-500"
              />
              <span className="text-[10px] text-slate-500 block">Triggered when submit &lt; 200ms</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Burst Rate Weight</span>
                <span className="font-mono text-rose-400 font-bold">{riskConfig.weights.burst_request_weight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={riskConfig.weights.burst_request_weight}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  weights: { ...riskConfig.weights, burst_request_weight: parseFloat(e.target.value) }
                })}
                className="w-full accent-rose-500"
              />
              <span className="text-[10px] text-slate-500 block">Triggered on high rolling access bursts</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Queue Anomaly Weight</span>
                <span className="font-mono text-amber-400 font-bold">{riskConfig.weights.queue_anomaly_weight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={riskConfig.weights.queue_anomaly_weight}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  weights: { ...riskConfig.weights, queue_anomaly_weight: parseFloat(e.target.value) }
                })}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500 block">Triggered on excessive queue entries</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Bypass Attempt Weight</span>
                <span className="font-mono text-rose-400 font-bold">{riskConfig.weights.bypass_attempt_weight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={riskConfig.weights.bypass_attempt_weight}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  weights: { ...riskConfig.weights, bypass_attempt_weight: parseFloat(e.target.value) }
                })}
                className="w-full accent-rose-500"
              />
              <span className="text-[10px] text-slate-500 block">Triggered on direct API queue bypass</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Medium Challenge Threshold</span>
                <span className="font-mono text-amber-400 font-bold">{riskConfig.thresholds.medium}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.7"
                step="0.05"
                value={riskConfig.thresholds.medium}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  thresholds: { ...riskConfig.thresholds, medium: parseFloat(e.target.value) }
                })}
                className="w-full accent-amber-500"
              />
              <span className="text-[10px] text-slate-500 block">Score &ge; Medium &rarr; Puzzle Challenge</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">High Lockout Threshold</span>
                <span className="font-mono text-rose-400 font-bold">{riskConfig.thresholds.high}</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.0"
                step="0.05"
                value={riskConfig.thresholds.high}
                onChange={(e) => setRiskConfig({
                  ...riskConfig,
                  thresholds: { ...riskConfig.thresholds, high: parseFloat(e.target.value) }
                })}
                className="w-full accent-rose-500"
              />
              <span className="text-[10px] text-slate-500 block">Score &ge; High &rarr; 5-min Lockout</span>
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Risk Engine Telemetry Table */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-lg text-white flex items-center justify-between">
          <span>Behavioral Risk Engine Telemetry ({riskAssessments.length})</span>
          <span className="text-xs text-slate-400 font-normal">Real-time signal classifications</span>
        </h3>

        {riskAssessments.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            <ShieldCheck className="w-8 h-8 text-brand-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No behavioral assessments recorded yet</p>
            <p className="text-slate-400 mt-0.5">Interact with event restricted access windows to generate behavioral telemetry.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden max-h-[420px] overflow-y-auto">
            {riskAssessments.map((a) => {
              const isHigh = a.classification === 'HIGH';
              const isMedium = a.classification === 'MEDIUM';
              return (
                <div key={a.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isHigh ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        isMedium ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {a.classification} RISK (Score: {a.risk_score.toFixed(2)})
                      </span>
                      <span className="font-mono text-white font-semibold">{a.identifier}</span>
                      <span className="text-[11px] text-slate-400 font-mono">Event #{a.event_id}</span>
                      {a.session_id && (
                        <span className="text-[10px] text-slate-500 font-mono">Sess: {a.session_id.substring(0, 10)}...</span>
                      )}
                    </div>

                    {/* Triggered Signals Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">Signals:</span>
                      {a.signals && a.signals.length > 0 ? (
                        a.signals.map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-mono">Normal human pattern</span>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-end justify-between md:justify-center gap-1 shrink-0 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.action_taken === 'RESTRICT_SESSION' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      a.action_taken === 'REQUIRE_CHALLENGE' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {a.action_taken}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
