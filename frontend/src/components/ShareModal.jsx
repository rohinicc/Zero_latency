import React, { useState } from 'react';
import { Share2, Shield, User, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ShareModal({ 
  ticket, 
  currentUser, 
  onClose, 
  onShareSuccess 
}) {
  const [recipientName, setRecipientName] = useState('Charlie Rao');
  const [recipientEmail, setRecipientEmail] = useState('charlie@example.com');
  const [note, setNote] = useState('Enjoy the concert!');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleShare(e) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    if (recipientEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setErrorMsg('Cannot share a ticket with yourself');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/tickets/${ticket.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticket.id,
          owner_email: currentUser.email,
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim().toLowerCase(),
          note: note.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to share ticket');

      onShareSuccess(data.message);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-brand-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Non-Permanent Delegation
              </span>
              <h2 className="font-display font-bold text-base text-white mt-0.5">
                Share Ticket #{ticket.id}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleShare} className="p-6 space-y-5">
          
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Event</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{ticket.event_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Permanent Owner</span>
              <span className="font-mono text-slate-300">{currentUser.email} (You)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transfer Type</span>
              <span className="text-indigo-400 font-semibold">Shared Guest Pass (Free)</span>
            </div>
          </div>

          {/* Recipient info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Friend / Guest Name
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Charlie Rao"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Friend / Guest Demo Email
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. charlie@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Personal Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Have fun tonight!"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Controlled Sharing Guarantee */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-indigo-300">How Ticket Sharing Works:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Permanent ownership <strong>remains with you</strong>.</li>
              <li>No payment or money transfer takes place.</li>
              <li>You can <strong>revoke access at any time</strong> with 1 click.</li>
              <li>Prevents duplicate redemption: once scanned at the gate, the ticket is consumed.</li>
            </ul>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Generating Guest Pass...' : 'Send Shared Guest Pass'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
}
