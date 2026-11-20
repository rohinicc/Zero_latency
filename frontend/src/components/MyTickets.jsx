import React, { useState } from 'react';
import { 
  Ticket, QrCode, Repeat, Share2, Shield, Calendar, 
  MapPin, CheckCircle2, AlertCircle, Ban, Eye, X, RefreshCw, ExternalLink
} from 'lucide-react';

export default function MyTickets({ 
  tickets, 
  sharedTickets = [], 
  currentUser, 
  onOpenResell, 
  onOpenShare, 
  onRevokeShare, 
  onRefresh,
  loading 
}) {
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, SHARED, RESOLD
  const [selectedTicketModal, setSelectedTicketModal] = useState(null);
  const [syncingQuaiId, setSyncingQuaiId] = useState(null);
  const [quaiMsg, setQuaiMsg] = useState('');

  const activeTickets = tickets.filter(t => t.status === 'ACTIVE' && !t.redeemed);
  const redeemedTickets = tickets.filter(t => t.redeemed || t.status === 'REDEEMED');
  const resoldTickets = tickets.filter(t => t.status === 'RESOLD');

  async function handleSyncToQuai(ticketId) {
    setSyncingQuaiId(ticketId);
    setQuaiMsg('');
    try {
      const res = await fetch('/api/quai/sync-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to sync with Quai Network');
      setQuaiMsg(`Ticket #${ticketId} synced to Quai Network! Tx: ${data.quai_tx_hash.substring(0, 16)}...`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setQuaiMsg(`Quai sync error: ${err.message}`);
    } finally {
      setSyncingQuaiId(null);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Page Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Digital Ticket Wallet
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {currentUser.email}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-proof verifiable passes. Capped resale and non-permanent sharing enabled.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Wallet</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'ACTIVE'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Active Tickets ({activeTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SHARED')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'SHARED'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Shared With Me ({sharedTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REDEEMED')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'REDEEMED'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Redeemed ({redeemedTickets.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE TICKETS */}
      {activeTab === 'ACTIVE' && (
        <div className="space-y-4">
          {activeTickets.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
              <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No active tickets found for {currentUser.name}</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Head to Explore Events to book tickets at face value or switch personas to view other demo wallets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTickets.map((t) => {
                const isShared = t.active_share && t.active_share.status === 'ACTIVE';

                return (
                  <div 
                    key={t.id}
                    className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between"
                  >
                    {/* Header Banner */}
                    <div className="p-4 bg-gradient-to-r from-brand-950/70 to-slate-900 border-b border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-display font-bold text-xs uppercase tracking-wider text-emerald-400">
                          VALID TICKET
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        #{t.id}
                      </span>
                    </div>

                    {/* Middle Body */}
                    <div className="p-5 space-y-4 flex-1">
                      <div>
                        <h3 className="font-display font-bold text-lg text-white line-clamp-1">
                          {t.event_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Attendee: {t.owner_name}</p>
                      </div>

                      {/* QR Display */}
                      <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center gap-2 shadow-inner">
                        <img 
                          src={t.qr_url} 
                          alt="Ticket QR Code" 
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-700 truncate max-w-[200px]">
                          {t.token}
                        </span>
                      </div>

                      {/* Pricing Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Face Price</span>
                          <span className="font-semibold text-white">₹{t.face_price.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">1.1× Resale Cap</span>
                          <span className="font-semibold text-brand-300">₹{t.max_resale_price.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Quai Network Sync Status */}
                      {t.quai_status === 'CONFIRMED' ? (
                        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-600/40 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                            <span className="text-purple-200 font-semibold text-[11px]">Quai Cyprus-1 Confirmed</span>
                          </div>
                          {t.quai_tx_hash && (
                            <a
                              href={`https://orchard.quaiscan.io/tx/${t.quai_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-purple-300 hover:text-white flex items-center gap-1 font-mono shrink-0 ml-1"
                            >
                              <span>QuaiScan</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400">Quai: Not Synced</span>
                          <button
                            onClick={() => handleSyncToQuai(t.id)}
                            disabled={syncingQuaiId === t.id}
                            className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-700 text-purple-200 text-[10px] font-semibold transition-colors"
                          >
                            {syncingQuaiId === t.id ? 'Syncing...' : 'Sync to Quai'}
                          </button>
                        </div>
                      )}

                      {/* Sharing Status if currently shared */}
                      {isShared && (
                        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-600/40 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 block">
                              Active Guest Pass
                            </span>
                            <span className="text-slate-300 text-xs truncate max-w-[140px] block">
                              {t.active_share.recipient_name}
                            </span>
                          </div>
                          <button
                            onClick={() => onRevokeShare(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-[11px] font-semibold text-rose-300 transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons Bar */}
                    <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedTicketModal(t)}
                        className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => onOpenResell(t)}
                        className="py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Resell</span>
                      </button>

                      <button
                        onClick={() => onOpenShare(t)}
                        className="py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Share</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHARED TICKETS (GUEST PASSES) */}
      {activeTab === 'SHARED' && (
        <div className="space-y-4">
          {sharedTickets.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
              <Share2 className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No shared guest passes for {currentUser.name}</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When another fan (like Alice) shares a guest pass to {currentUser.email}, it will appear here ready for gate entry.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedTickets.map((st) => (
                <div 
                  key={st.share_id}
                  className="glass-card rounded-2xl overflow-hidden border border-indigo-900/50 flex flex-col justify-between"
                >
                  <div className="p-4 bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-indigo-900/50 flex items-center justify-between">
                    <span className="font-display font-bold text-xs uppercase tracking-wider text-indigo-400">
                      GUEST PASS • SHARED BY {st.owner_name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Ticket #{st.ticket_id}</span>
                  </div>

                  <div className="p-5 space-y-4 flex-1">
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">{st.event_name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{st.venue} • {st.date}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center gap-2 shadow-inner">
                      <img src={st.qr_url} alt="Guest Pass QR" className="w-36 h-36 object-contain" />
                      <span className="text-[10px] font-mono font-bold text-slate-700 truncate max-w-[200px]">
                        {st.share_token}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                      <p>✨ Free guest pass authorization provided by {st.owner_email}. Scan at venue gate for entry.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-center">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Gate Verification
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REDEEMED TICKETS */}
      {activeTab === 'REDEEMED' && (
        <div className="space-y-4">
          {redeemedTickets.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No redeemed tickets yet</p>
              <p className="text-xs text-slate-400">Scan your active ticket at the Gate Scanner tab to see redemption logs here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {redeemedTickets.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 opacity-75">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                      REDEEMED AT GATE
                    </span>
                    <span className="text-xs font-mono text-slate-500">#{t.id}</span>
                  </div>
                  <h4 className="font-bold text-white text-base">{t.event_name}</h4>
                  <p className="text-xs text-slate-400">Redeemed At: {t.redeemed_at || 'Earlier'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED TICKET PASS MODAL ("VIEW TICKET") */}
      {selectedTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
            
            {/* Ticket Header Notch */}
            <div className="p-6 bg-gradient-to-br from-brand-900 via-slate-900 to-indigo-950 text-white relative border-b border-dashed border-slate-700">
              <button
                onClick={() => setSelectedTicketModal(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/30 text-brand-200">
                Official FairPass
              </span>
              <h3 className="font-display font-extrabold text-xl text-white mt-2 leading-tight">
                {selectedTicketModal.event_name}
              </h3>
              <p className="text-xs text-slate-300 mt-1">Ticket ID #{selectedTicketModal.id}</p>
            </div>

            {/* Ticket Pass Body */}
            <div className="p-6 space-y-5 bg-slate-900">
              <div className="p-5 rounded-2xl bg-white flex flex-col items-center justify-center gap-2 shadow-lg">
                <img src={selectedTicketModal.qr_url} alt="QR Code" className="w-44 h-44 object-contain" />
                <span className="text-xs font-mono font-bold text-slate-800 truncate max-w-[240px]">
                  {selectedTicketModal.token}
                </span>
              </div>

              {/* Barcode simulation */}
              <div className="space-y-1">
                <div className="barcode-lines rounded opacity-80" />
                <p className="text-[10px] text-center font-mono text-slate-500">
                  SECURE CRYPTOGRAPHIC TOKEN • ONE-TIME REDEMPTION
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Attendee Name</span>
                  <span className="font-semibold text-white">{selectedTicketModal.owner_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account</span>
                  <span className="font-mono text-slate-300">{selectedTicketModal.owner_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Face Value</span>
                  <span className="font-semibold text-white">₹{selectedTicketModal.face_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resale Price Cap</span>
                  <span className="font-semibold text-brand-300">₹{selectedTicketModal.max_resale_price}</span>
                </div>
              </div>

              {selectedTicketModal.quai_status === 'CONFIRMED' && (
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-600/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-purple-200 font-semibold text-[11px]">
                    <span>Quai Network Proof (Cyprus-1)</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-[10px] text-purple-300">CONFIRMED</span>
                  </div>
                  {selectedTicketModal.quai_record?.ticket_hash && (
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      Hash: {selectedTicketModal.quai_record.ticket_hash}
                    </div>
                  )}
                  {selectedTicketModal.quai_tx_hash && (
                    <a
                      href={`https://orchard.quaiscan.io/tx/${selectedTicketModal.quai_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-400 hover:text-white flex items-center gap-1 font-mono pt-1"
                    >
                      <span>View On QuaiScan Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={() => setSelectedTicketModal(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Ticket
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
