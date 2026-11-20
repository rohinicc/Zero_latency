import React, { useState } from 'react';
import { 
  CreditCard, Smartphone, Building2, CheckCircle2, 
  XCircle, Loader2, AlertCircle, Shield, X, ArrowRight
} from 'lucide-react';

export default function DemoPaymentModal({ 
  paymentData, 
  onSuccess, 
  onCancel 
}) {
  const [method, setMethod] = useState('UPI'); // UPI, CARD, NETBANKING
  const [upiId, setUpiId] = useState('fan@oksbi');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('739');
  const [bank, setBank] = useState('HDFC Bank');
  
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isResale = paymentData.payment_type === 'RESALE';
  const amount = paymentData.totalAmount || paymentData.amount || 0;

  async function executePayment(simulateFailure = false) {
    setProcessing(true);
    setErrorMsg('');

    try {
      if (isResale) {
        // Call execute resale endpoint
        const res = await fetch('/api/resale/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticket_id: paymentData.ticketId,
            seller_email: paymentData.sellerEmail,
            buyer_email: paymentData.user.email,
            buyer_name: paymentData.user.name,
            resale_price: amount,
            payment_method: method,
            simulate_failure: simulateFailure
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Resale transaction declined');

        onSuccess({
          type: 'RESALE',
          message: data.message,
          tx_ref: data.tx_ref,
          ticket: data.new_ticket
        });
      } else {
        // Call primary booking endpoint
        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: paymentData.event.id,
            email: paymentData.user.email,
            name: paymentData.user.name,
            quantity: paymentData.quantity,
            payment_method: method,
            simulate_failure: simulateFailure
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Booking transaction declined');

        onSuccess({
          type: 'PRIMARY_BOOKING',
          message: data.message,
          tx_ref: data.tx_ref,
          quantity: data.quantity,
          tokens: data.tokens,
          tickets: data.tickets
        });
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-white">
                  Demo Payment Gateway
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isResale ? 'Capped Ticket Resale Transfer' : 'Direct Face Value Ticket Purchase'}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={processing}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Order Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Transaction Item</span>
              <span className="font-semibold text-white">
                {isResale ? `Resale Ticket #${paymentData.ticketId}` : paymentData.event.name}
              </span>
            </div>
            {!isResale && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Quantity</span>
                <span className="text-slate-200">{paymentData.quantity} tickets</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Payer Name</span>
              <span className="text-slate-200">{paymentData.user.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Payer Demo Email</span>
              <span className="text-slate-400 font-mono">{paymentData.user.email}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-300">Total Payable</span>
              <span className="font-display font-extrabold text-xl text-white">
                ₹{amount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Select Simulated Payment Option
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'NETBANKING', label: 'Net Banking', icon: Building2 },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-brand-600/20 border-brand-500 text-brand-300 shadow-lg shadow-brand-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Payment Details */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
            {method === 'UPI' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Virtual Payment Address (VPA / UPI ID)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <div className="flex gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Google Pay</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">PhonePe</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Paytm</span>
                </div>
              </div>
            )}

            {method === 'CARD' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Demo Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">CVV</label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'NETBANKING' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Select Bank</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra">Kotak Mahindra Bank</option>
                </select>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons: Simulated Success vs Failure */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => executePayment(false)}
              disabled={processing}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Demo Transaction...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate Successful Payment (₹{amount.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>

            <button
              onClick={() => executePayment(true)}
              disabled={processing}
              className="w-full py-2.5 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Simulate Payment Failure (Test Rollback Behavior)</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            🔒 Sandbox Demo Gateway. No real bank charges or credit cards are involved.
          </p>

        </div>

      </div>
    </div>
  );
}
