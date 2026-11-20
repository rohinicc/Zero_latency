import React, { useState } from 'react';
import { Repeat, ShieldCheck, AlertCircle, X, ArrowRight, User } from 'lucide-react';

export default function ResaleModal({ 
  ticket, 
  currentUser, 
  onClose, 
  onProceedToResalePayment 
}) {
  const [recipientName, setRecipientName] = useState('Bob Patel');
  const [recipientEmail, setRecipientEmail] = useState('bob@example.com');
  const [resalePrice, setResalePrice] = useState(ticket.max_resale_price || ticket.face_price);
  const [errorMsg, setErrorMsg] = useState('');

  const facePrice = ticket.face_price || 0;
  const maxCap = ticket.max_resale_price || (facePrice * 1.1);
  const exceedsCap = Number(resalePrice) > maxCap;

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!recipientEmail.trim()) {
      setErrorMsg('Please enter the recipient demo email');
      return;
    }
    if (recipientEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      setErrorMsg('You cannot resell a ticket to yourself');
      return;
    }
    if (Number(resalePrice) <= 0) {
      setErrorMsg('Resale price must be positive');
      return;
    }
    if (exceedsCap) {
      setErrorMsg(`Anti-Scalping Violation: Price cannot exceed the ₹${maxCap.toLocaleString('en-IN')} cap!`);
      return;
    }

    // Hand off to Demo Payment Gateway
    onProceedToResalePayment({
      payment_type: 'RESALE',
      ticketId: ticket.id,
      event_id: ticket.event_id,
      event_name: ticket.event_name,
      sellerEmail: currentUser.email,
      sellerName: currentUser.name,
      user: {
        name: recipientName.trim(),
        email: recipientEmail.trim().toLowerCase()
      },
      amount: Number(resalePrice)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Fair Capped Resale
              </span>
              <h2 className="font-display font-bold text-base text-white mt-0.5">
                Resell Ticket #{ticket.id}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Readonly Event & Current Owner Details */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Event</span>
              <span className="font-semibold text-white truncate max-w-[200px]">{ticket.event_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Owner (You)</span>
              <span className="font-mono text-slate-300">{currentUser.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Original Face Price</span>
              <span className="font-semibold text-white">₹{facePrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/80">
              <span className="font-semibold text-emerald-400">Maximum Allowed Resale Cap</span>
              <span className="font-display font-bold text-emerald-400">₹{maxCap.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* New Owner Details Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Buyer Name
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Bob Patel"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Buyer Demo Email
              </label>
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. bob@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The buyer can log in using this email in the top persona menu to see their new ticket and QR code.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Resale Price (₹)
                </label>
                <span className={`text-[11px] font-mono ${exceedsCap ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                  Cap: ₹{maxCap.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="number"
                step="any"
                required
                value={resalePrice}
                onChange={(e) => setResalePrice(e.target.value)}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm font-semibold text-white focus:outline-none ${
                  exceedsCap ? 'border-rose-500 text-rose-300' : 'border-slate-700 focus:border-brand-500'
                }`}
              />
              {exceedsCap && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Violation: Cannot exceed mandatory 1.1× cap (₹{maxCap.toLocaleString('en-IN')})</span>
                </p>
              )}
            </div>
          </div>

          {/* Transfer Lifecycle Rules Notice */}
          <div className="p-3.5 rounded-xl bg-brand-950/30 border border-brand-500/20 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-brand-300">Resale Ownership Rules:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Ownership is permanently transferred upon simulated payment.</li>
              <li>Your old QR code token is immediately <strong>invalidated</strong>.</li>
              <li>A brand-new, unique QR token is generated for the new buyer.</li>
            </ul>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium">{errorMsg}</p>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={exceedsCap}
            className={`w-full py-3 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center justify-center gap-2 ${
              exceedsCap
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/30'
            }`}
          >
            <span>Proceed to Demo Payment (₹{Number(resalePrice || 0).toLocaleString('en-IN')})</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
}
