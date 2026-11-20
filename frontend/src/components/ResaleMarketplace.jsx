import React, { useState } from 'react';
import { Repeat, ShieldCheck, Tag, ArrowRight, RefreshCw, ShoppingCart } from 'lucide-react';

export default function ResaleMarketplace({ 
  listings, 
  currentUser, 
  onBuyListing, 
  onRefresh,
  loading 
}) {
  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-brand-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anti-Scalping Resale Marketplace</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            100% Capped Secondary Tickets
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            No 500% scalping markup. Every resale transaction is capped at a maximum of 1.1× face value.
            When you purchase, the previous owner's QR code is permanently invalidated and a new QR code is issued to your wallet.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Listings</span>
        </button>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
          <Repeat className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-semibold text-lg text-slate-200">No active resale listings at the moment</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tickets listed for resale by other fans will show up here. You can also list one of your own tickets from the <strong>My Tickets</strong> wallet tab!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => {
            const isOwnListing = item.seller_email.toLowerCase() === currentUser.email.toLowerCase();

            return (
              <div 
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Capped Resale
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ticket #{item.ticket_id}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">
                      {item.event_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.venue} • {item.date}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seller</span>
                      <span className="font-mono text-slate-300 truncate max-w-[150px]">{item.seller_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original Face Price</span>
                      <span className="text-slate-200">₹{item.face_price?.toLocaleString('en-IN') || item.price}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800">
                      <span className="text-slate-400 font-semibold">Resale Price</span>
                      <span className="font-display font-bold text-base text-emerald-400">
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Mandatory Cap:</span>
                      <span className="font-mono text-slate-400">₹{item.cap.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Buy Action Button */}
                <div className="p-4 bg-slate-950/80 border-t border-slate-800">
                  <button
                    onClick={() => onBuyListing(item)}
                    disabled={isOwnListing}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isOwnListing
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{isOwnListing ? 'Your Own Listing' : `Buy Resale Ticket (₹${item.price.toLocaleString('en-IN')})`}</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
