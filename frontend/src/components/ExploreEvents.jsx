import React, { useState } from 'react';
import { 
  Search, Calendar, MapPin, Ticket, ShieldCheck, 
  Sparkles, Users, Lock, ArrowRight, Music, Zap, Filter
} from 'lucide-react';

export default function ExploreEvents({ events, onSelectEvent, loading }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Music', 'Tech', 'Comedy', 'Sports', 'Cultural'];

  const filteredEvents = events.filter((e) => {
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesSearch = 
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-10">
      
      {/* Modern Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-950/70 to-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Generation Anti-Scalping Platform</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Fair Tickets. <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-300">Capped Resale.</span> Zero Scalpers.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal max-w-2xl">
            FairPass stops ticket fraud and scalping with event-specific restricted access, 
            behavioral bot protection, mandatory 1.1× resale price caps, and single-redemption gate QR tokens.
          </p>

          {/* Key Trust Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">1.1× Resale Price Cap</p>
                <p className="text-[11px] text-slate-400">Strict backend-enforced ceiling</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Event Bot Shield</p>
                <p className="text-[11px] text-slate-400">50-attempt burst lockout</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Single Gate Entry</p>
                <p className="text-[11px] text-slate-400">Old QR revoked on transfer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by event, artist, or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Upcoming Live Events
            </h2>
            <p className="text-xs text-slate-400">
              Select an event to enter its verified restricted access window.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing {filteredEvents.length} events
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl bg-slate-900/60 border border-slate-800 h-96 animate-pulse p-4 space-y-4">
                <div className="h-44 bg-slate-800 rounded-xl" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-4 bg-slate-800 rounded w-1/2" />
                <div className="h-10 bg-slate-800 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
            <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="font-semibold text-lg text-slate-200">No events matched your search</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search terms or filter categories.
            </p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('All'); }}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-500 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => {
              const available = ev.available;
              const isSoldOut = available <= 0;
              const percentSold = Math.min(100, Math.round((ev.sold / ev.quantity) * 100));

              return (
                <div
                  key={ev.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col group border border-slate-800/90"
                >
                  {/* Poster Image Container */}
                  <div className="relative h-48 overflow-hidden bg-slate-950">
                    <img
                      src={ev.poster_url}
                      alt={ev.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-brand-300 border border-slate-700">
                        {ev.category}
                      </span>
                      {ev.resale_enabled && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-600/40">
                          {ev.resale_cap_multiplier}× Resale Cap
                        </span>
                      )}
                      {ev.bot_protection_enabled && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 backdrop-blur-md text-indigo-300 border border-indigo-600/40">
                          Bot Protected
                        </span>
                      )}
                    </div>

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-right">
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold leading-none">Face Price</span>
                      <span className="font-display font-extrabold text-base text-white">
                        ₹{ev.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-lg text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                        {ev.name}
                      </h3>
                      
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                          <span>{ev.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ev.venue}</span>
                        </div>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 pt-1">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Ticket Availability Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Availability</span>
                        <span className={`font-semibold ${isSoldOut ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isSoldOut ? 'Sold Out' : `${available} tickets left`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSoldOut ? 'bg-rose-500' : percentSold > 80 ? 'bg-amber-500' : 'bg-brand-500'
                          }`}
                          style={{ width: `${percentSold}%` }}
                        />
                      </div>
                    </div>

                    {/* Book Tickets CTA Button */}
                    <button
                      onClick={() => onSelectEvent(ev)}
                      disabled={isSoldOut}
                      className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                        isSoldOut
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/20 hover:scale-[1.01]'
                      }`}
                    >
                      <span>{isSoldOut ? 'Sold Out' : 'Enter Booking Portal'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
