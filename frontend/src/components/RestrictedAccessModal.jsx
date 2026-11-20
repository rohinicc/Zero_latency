import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, Lock, Clock, AlertTriangle, 
  Users, CheckCircle2, ArrowRight, X, Sparkles, RefreshCw, Zap
} from 'lucide-react';

export default function RestrictedAccessModal({ 
  event, 
  user, 
  onClose, 
  onProceedToPayment,
  onRefreshData
}) {
  const [stage, setStage] = useState('SECURITY'); // SECURITY, QUEUE, BOOKING, RESTRICTED
  const [securityStatus, setSecurityStatus] = useState('CHECKING'); // CHECKING, GRANTED, CHALLENGE_REQUIRED, RESTRICTED
  const [securityMsg, setSecurityMsg] = useState('Analyzing interaction timing and request behavioral signals...');
  const [riskScore, setRiskScore] = useState(0.0);
  const [riskClassification, setRiskClassification] = useState('LOW');
  const [triggeredSignals, setTriggeredSignals] = useState([]);
  const [queueAuthToken, setQueueAuthToken] = useState(null);
  const [restrictionDetails, setRestrictionDetails] = useState(null);
  const [remainingLockout, setRemainingLockout] = useState(0);

  // Interactive challenge state
  const [challengeQuestion, setChallengeQuestion] = useState(null);
  const [challengeToken, setChallengeToken] = useState(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeError, setChallengeError] = useState('');

  // Queue state
  const [queuePosition, setQueuePosition] = useState(1);
  const [totalInQueue, setTotalInQueue] = useState(1);
  const [estimatedWait, setEstimatedWait] = useState(15);
  const [queueAdmitted, setQueueAdmitted] = useState(false);

  // Booking state
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Track timing
  const openTimeRef = useRef(Date.now());

  // Run security access check on modal mount
  useEffect(() => {
    openTimeRef.current = Date.now();
    runAccessCheck(1200); // Normal realistic human timing
  }, [event.id, user.email]);

  // Countdown timer for lockout
  useEffect(() => {
    if (remainingLockout <= 0) return;
    const interval = setInterval(() => {
      setRemainingLockout((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Re-check access
          runAccessCheck(1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingLockout]);

  async function runAccessCheck(overrideDuration = null) {
    setSecurityStatus('CHECKING');
    setSecurityMsg('Verifying behavioral signals against FairPass Bot Shield...');
    setBookingError('');

    const elapsed = overrideDuration !== null ? overrideDuration : (Date.now() - openTimeRef.current);

    try {
      const res = await fetch(`/api/events/${event.id}/access-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          email: user.email,
          duration_ms: elapsed,
          session_id: 'sess_' + Math.random().toString(36).substring(7)
        })
      });
      const data = await res.json();
      setRiskClassification(data.classification || 'LOW');
      setTriggeredSignals(data.signals || []);

      if (data.status === 'RESTRICTED') {
        setSecurityStatus('RESTRICTED');
        setStage('RESTRICTED');
        setSecurityMsg(data.reason);
        setRiskScore(data.risk_score || 1.0);
        setRestrictionDetails(data);
        setRemainingLockout(data.remaining_seconds || 300);
      } else if (data.status === 'CHALLENGE_REQUIRED') {
        setSecurityStatus('CHALLENGE_REQUIRED');
        setSecurityMsg(data.reason);
        setRiskScore(data.risk_score);
        setChallengeQuestion(data.challenge_question);
        setChallengeToken(data.challenge_token);
      } else {
        // GRANTED
        setSecurityStatus('GRANTED');
        setRiskScore(data.risk_score || 0.0);
        setSecurityMsg('Human presence and behavioral signals verified!');
        if (data.queue_auth_token) {
          setQueueAuthToken(data.queue_auth_token);
        }
        
        // Next: check if queue is enabled
        if (event.queue_enabled) {
          setStage('QUEUE');
          joinEventQueue();
        } else {
          setStage('BOOKING');
        }
      }
    } catch (err) {
      setSecurityStatus('ERROR');
      setSecurityMsg(err.message || 'Security check failed. Try again.');
    }
  }

  async function submitChallenge(e) {
    e.preventDefault();
    setChallengeError('');
    try {
      const res = await fetch(`/api/events/${event.id}/challenge-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          email: user.email,
          challenge_token: challengeToken,
          solution: challengeAnswer
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Incorrect answer');

      setSecurityStatus('GRANTED');
      setChallengeQuestion(null);
      if (data.queue_auth_token) {
        setQueueAuthToken(data.queue_auth_token);
      }
      if (event.queue_enabled) {
        setStage('QUEUE');
        joinEventQueue();
      } else {
        setStage('BOOKING');
      }
    } catch (err) {
      setChallengeError(err.message);
    }
  }

  async function joinEventQueue() {
    try {
      const res = await fetch(`/api/events/${event.id}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          email: user.email,
          name: user.name
        })
      });
      const data = await res.json();
      setQueuePosition(data.position || 1);
      setTotalInQueue(data.total_in_queue || 1);
      setEstimatedWait(data.estimated_wait_seconds || 15);
    } catch (err) {
      console.error('Queue join error:', err);
    }
  }

  async function handleAdmitFromQueue() {
    try {
      const res = await fetch(`/api/events/${event.id}/queue/admit?email=${encodeURIComponent(user.email)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.queue_auth_token) {
        setQueueAuthToken(data.queue_auth_token);
      }
      setQueueAdmitted(true);
      setStage('BOOKING');
    } catch (err) {
      console.error(err);
      setStage('BOOKING');
    }
  }

  // Demo: Simulate 50+ rapid requests burst to trigger threshold lockout
  async function handleSimulateBotAttack() {
    try {
      await fetch(`/api/admin/security/simulate-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          target_email: user.email,
          burst_count: 55
        })
      });
      // Re-run access check to immediately show restricted screen!
      await runAccessCheck(50);
    } catch (err) {
      console.error(err);
    }
  }

  // Demo: Simulate rapid submission (< 200ms) to trigger challenge
  function handleSimulateFastBot() {
    runAccessCheck(150); // 150ms triggers challenge
  }

  function handleStartBooking() {
    if (quantity < 1 || quantity > event.max_per_user) {
      setBookingError(`You can book between 1 and ${event.max_per_user} tickets`);
      return;
    }
    // Launch Demo Payment Gateway with cryptographic queue auth token
    onProceedToPayment({
      event,
      quantity,
      unitPrice: event.price,
      totalAmount: event.price * quantity,
      user,
      queueAuthToken
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Top Header Banner */}
        <div className="relative h-28 bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 p-6 flex items-end justify-between border-b border-slate-800">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
              <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Restricted Access Window
              </span>
              <h2 className="font-display font-bold text-lg text-white leading-tight truncate max-w-sm mt-0.5">
                {event.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors relative z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              stage === 'SECURITY' ? 'bg-brand-600 text-white' : 'bg-emerald-500 text-white'
            }`}>
              1
            </span>
            <span className={stage === 'SECURITY' ? 'text-white' : 'text-slate-400'}>Security Check</span>
          </div>
          
          <div className="h-0.5 w-6 bg-slate-800" />

          {event.queue_enabled && (
            <>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  stage === 'QUEUE' ? 'bg-brand-600 text-white' : stage === 'BOOKING' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  2
                </span>
                <span className={stage === 'QUEUE' ? 'text-white' : 'text-slate-400'}>Event Queue</span>
              </div>
              <div className="h-0.5 w-6 bg-slate-800" />
            </>
          )}

          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              stage === 'BOOKING' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}>
              {event.queue_enabled ? '3' : '2'}
            </span>
            <span className={stage === 'BOOKING' ? 'text-white' : 'text-slate-400'}>Ticket Selection</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">

          {/* ================= STAGE 1: SECURITY & BOT CHECK ================= */}
          {stage === 'SECURITY' && (
            <div className="space-y-5">
              
              {securityStatus === 'CHECKING' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mx-auto animate-pulse">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">Verifying Request Integrity</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">{securityMsg}</p>
                  </div>
                </div>
              )}

              {securityStatus === 'CHALLENGE_REQUIRED' && (
                <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-600/40 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-amber-200">
                        Human Verification Required
                      </h4>
                      <p className="text-xs text-amber-300/80 mt-0.5">
                        Rapid interaction detected. Solve this quick verification challenge to unlock booking.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={submitChallenge} className="space-y-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-200">
                      {challengeQuestion}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        autoFocus
                        placeholder="Enter answer"
                        value={challengeAnswer}
                        onChange={(e) => setChallengeAnswer(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                    {challengeError && (
                      <p className="text-xs text-rose-400">{challengeError}</p>
                    )}
                  </form>
                </div>
              )}

              {/* Bot Simulation Quick Buttons for Hackathon Demo */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hackathon Security Testing Tools
                </span>
                <p className="text-xs text-slate-400">
                  Simulate bot abuse scenarios to demonstrate backend security rules:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSimulateFastBot}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate Rapid Bot (&lt;200ms)</span>
                  </button>

                  <button
                    onClick={handleSimulateBotAttack}
                    className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-rose-800/40"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Simulate 50+ Burst Lockout</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================= STAGE: RESTRICTED LOCKOUT SCREEN ================= */}
          {stage === 'RESTRICTED' && (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-600/40 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-rose-200">
                  Access Temporarily Restricted
                </h3>
                <p className="text-xs text-rose-300/80 max-w-sm mx-auto">
                  {securityMsg}
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/50 inline-block font-mono">
                <span className="text-xs text-slate-400 block">Lockout Timer</span>
                <span className="text-2xl font-bold text-rose-400">
                  {Math.floor(remainingLockout / 60)}:{(remainingLockout % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <div className="text-xs text-slate-400 max-w-sm mx-auto space-y-1">
                <p>FairPass Anti-Scalp Protection prevents automated scalper scripts.</p>
                <p className="text-slate-400">
                  You can also switch to the <strong>Organizer / Admin</strong> persona in the top bar to review security logs and manually lift this restriction.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {/* ================= STAGE 2: EVENT QUEUE ================= */}
          {stage === 'QUEUE' && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 mx-auto">
                <Users className="w-8 h-8" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Event Waiting Room
                </span>
                <h3 className="font-display font-bold text-xl text-white mt-2">
                  You are #{queuePosition} in line
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Queue for {event.name}. Total waiting: {totalInQueue} fans.
                </p>
              </div>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Estimated Wait:</span>
                  <span className="text-white font-semibold">~{estimatedWait}s</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-600 to-indigo-400 rounded-full w-2/3 animate-pulse" />
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleAdmitFromQueue}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <span>Enter Ticket Booking Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STAGE 3: TICKET BOOKING ================= */}
          {stage === 'BOOKING' && (
            <div className="space-y-5">
              
              {queueAuthToken && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <div className="truncate">
                    <span className="font-semibold text-emerald-300">Queue Authorization Verified:</span>{' '}
                    <span className="font-mono text-[11px] text-slate-300">Signed HMAC-SHA256 Token Active</span>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Event</span>
                  <span className="text-xs font-semibold text-white">{event.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Date & Venue</span>
                  <span className="text-xs text-slate-300">{event.date} • {event.venue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Face Value</span>
                  <span className="text-xs font-semibold text-white">₹{event.price.toLocaleString('en-IN')} per ticket</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Max Per User Limit</span>
                  <span className="text-xs text-brand-400 font-semibold">{event.max_per_user} tickets</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  Select Quantity
                </label>
                <div className="flex items-center gap-3">
                  {[...Array(event.max_per_user)].map((_, i) => {
                    const q = i + 1;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          quantity === q
                            ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {q} {q === 1 ? 'Ticket' : 'Tickets'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-2xl bg-brand-950/40 border border-brand-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-brand-300 font-medium">Total Amount</span>
                  <p className="text-[11px] text-slate-400 font-mono">₹{event.price} × {quantity}</p>
                </div>
                <span className="font-display font-extrabold text-2xl text-white">
                  ₹{(event.price * quantity).toLocaleString('en-IN')}
                </span>
              </div>

              {bookingError && (
                <p className="text-xs text-rose-400 text-center">{bookingError}</p>
              )}

              {/* Next Step: Demo Payment Gateway */}
              <button
                onClick={handleStartBooking}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Demo Payment Gateway</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
