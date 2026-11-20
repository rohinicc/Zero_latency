import React, { useState } from 'react';
import { 
  PlusCircle, Edit3, Trash2, Calendar, MapPin, 
  DollarSign, Users, Shield, CheckCircle2, AlertCircle, RefreshCw, BarChart3, X
} from 'lucide-react';

const SAMPLE_POSTERS = [
  { name: 'Festival / Stage', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80' },
  { name: 'Rock / Indie', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80' },
  { name: 'Tech Summit', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80' },
  { name: 'Comedy Show', url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80' },
  { name: 'EDM Rave', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80' },
];

export default function OrganizerDashboard({ 
  events, 
  currentUser, 
  onRefresh, 
  loading 
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    poster_url: SAMPLE_POSTERS[0].url,
    venue: '',
    date: '2026-12-25 19:00',
    category: 'Music',
    sales_start: '2026-11-20 10:00',
    sales_end: '2026-12-25 18:00',
    quantity: 100,
    price: 1500,
    max_per_user: 2,
    resale_enabled: true,
    resale_cap_multiplier: 1.1,
    restricted_window_enabled: true,
    queue_enabled: true,
    bot_protection_enabled: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  function resetForm() {
    setForm({
      name: '',
      description: '',
      poster_url: SAMPLE_POSTERS[0].url,
      venue: '',
      date: '2026-12-25 19:00',
      category: 'Music',
      sales_start: '2026-11-20 10:00',
      sales_end: '2026-12-25 18:00',
      quantity: 100,
      price: 1500,
      max_per_user: 2,
      resale_enabled: true,
      resale_cap_multiplier: 1.1,
      restricted_window_enabled: true,
      queue_enabled: true,
      bot_protection_enabled: true,
    });
    setEditingEvent(null);
    setErrorMsg('');
    setStatusMsg('');
  }

  function handleStartEdit(ev) {
    setEditingEvent(ev);
    setForm({
      name: ev.name,
      description: ev.description || '',
      poster_url: ev.poster_url || SAMPLE_POSTERS[0].url,
      venue: ev.venue,
      date: ev.date,
      category: ev.category || 'Music',
      sales_start: ev.sales_start || '',
      sales_end: ev.sales_end || '',
      quantity: ev.quantity,
      price: ev.price,
      max_per_user: ev.max_per_user || 2,
      resale_enabled: ev.resale_enabled ?? true,
      resale_cap_multiplier: ev.resale_cap_multiplier || 1.1,
      restricted_window_enabled: ev.restricted_window_enabled ?? true,
      queue_enabled: ev.queue_enabled ?? true,
      bot_protection_enabled: ev.bot_protection_enabled ?? true,
    });
    setShowCreateModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setSubmitting(true);

    // Form validation
    if (!form.name.trim() || !form.venue.trim()) {
      setErrorMsg('Event title and venue are required');
      setSubmitting(false);
      return;
    }
    if (Number(form.price) <= 0 || Number(form.quantity) <= 0) {
      setErrorMsg('Ticket price and quantity must be positive');
      setSubmitting(false);
      return;
    }
    if (Number(form.max_per_user) < 1 || Number(form.max_per_user) > 10) {
      setErrorMsg('Max tickets per user must be between 1 and 10');
      setSubmitting(false);
      return;
    }
    if (Number(form.resale_cap_multiplier) < 1.0 || Number(form.resale_cap_multiplier) > 2.0) {
      setErrorMsg('Resale cap multiplier must be between 1.0x and 2.0x');
      setSubmitting(false);
      return;
    }

    try {
      if (editingEvent) {
        // PUT update
        const res = await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            quantity: Number(form.quantity),
            price: Number(form.price),
            max_per_user: Number(form.max_per_user),
            resale_cap_multiplier: Number(form.resale_cap_multiplier)
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update event');
        setStatusMsg(data.message || 'Event updated successfully');
      } else {
        // POST create
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            quantity: Number(form.quantity),
            price: Number(form.price),
            max_per_user: Number(form.max_per_user),
            resale_cap_multiplier: Number(form.resale_cap_multiplier),
            organizer_email: currentUser.email
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to create event');
        setStatusMsg(data.message || 'Event published successfully!');
      }

      await onRefresh();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Organizer Command Center</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            Event Creation & Ticket Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Configure fair ticketing policies, ticket quotas, 1.1× capped resale rules, 
            behavioral bot protection, and independent waiting room queues.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-3 bg-slate-900 border border-slate-700 rounded-2xl text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Events Management Table / Cards */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xl text-white">
          Active Managed Events ({events.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((ev) => {
            const revenue = ev.sold * ev.price;
            const percentSold = Math.min(100, Math.round((ev.sold / ev.quantity) * 100));

            return (
              <div 
                key={ev.id}
                className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                        <img src={ev.poster_url} alt={ev.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                          {ev.category}
                        </span>
                        <h4 className="font-display font-bold text-base text-white truncate max-w-xs">
                          {ev.name}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartEdit(ev)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ev.date}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{ev.venue}</span>
                    </p>
                  </div>

                  {/* Revenue & Ticket Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Sold / Total</span>
                      <span className="font-semibold text-white">{ev.sold} / {ev.quantity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Face Price</span>
                      <span className="font-semibold text-white">₹{ev.price}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Gross Sales</span>
                      <span className="font-bold text-emerald-400">₹{revenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Availability Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Inventory Sold:</span>
                      <span className="text-white font-mono">{percentSold}% ({ev.available} remaining)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${percentSold}%` }} />
                    </div>
                  </div>

                  {/* Policy Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      Max {ev.max_per_user}/User
                    </span>
                    {ev.resale_enabled ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                        {ev.resale_cap_multiplier}× Resale Cap
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        Resale Disabled
                      </span>
                    )}
                    {ev.queue_enabled && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                        Queue Active
                      </span>
                    )}
                    {ev.bot_protection_enabled && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-brand-950/60 text-brand-300 border border-brand-800/40">
                        Bot Shield
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Organizer: {ev.organizer_email}</span>
                  <span className="text-emerald-400 font-semibold">Active On Sale</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
            
            <div className="p-6 bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/20 text-brand-300">
                  {editingEvent ? 'Edit Event Configuration' : 'Publish New Event'}
                </span>
                <h3 className="font-display font-extrabold text-xl text-white mt-1">
                  {editingEvent ? `Editing '${editingEvent.name}'` : 'Event Details & Policy Controls'}
                </h3>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Event Identity & Venue
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neon Horizon Festival 2026"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="Music">Music</option>
                      <option value="Tech">Tech</option>
                      <option value="Comedy">Comedy</option>
                      <option value="Sports">Sports</option>
                      <option value="Cultural">Cultural</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Venue Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Palace Grounds, Bengaluru"
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Date & Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-12-25 19:30"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of performers, schedule, and attendee guidelines..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Poster URL presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Event Poster Image URL</label>
                  <input
                    type="text"
                    value={form.poster_url}
                    onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    <span className="text-[10px] text-slate-400 mr-1 self-center">Presets:</span>
                    {SAMPLE_POSTERS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setForm({ ...form, poster_url: p.url })}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ticketing & Anti-Scalp Rules */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Pricing & Anti-Scalping Constraints
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Ticket Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Face Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Max / User *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={form.max_per_user}
                      onChange={(e) => setForm({ ...form, max_per_user: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Resale Cap Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min={1.0}
                      max={2.0}
                      value={form.resale_cap_multiplier}
                      onChange={(e) => setForm({ ...form, resale_cap_multiplier: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      1.1 = 110% maximum price ceiling on resale (₹{(form.price * form.resale_cap_multiplier).toFixed(2)})
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Allow Secondary Resale?</label>
                    <select
                      value={form.resale_enabled ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, resale_enabled: e.target.value === 'true' })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="true">Enabled (Capped at {form.resale_cap_multiplier}×)</option>
                      <option value="false">Disabled (Strictly Non-Transferable)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bot Shield & Queue Toggles */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  3. Queue & Abuse Protection Toggles
                </h4>

                <div className="space-y-2">
                  <label className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-white block">Restricted Access Window</span>
                      <span className="text-[11px] text-slate-400">Enforces security verification before ticket booking room</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.restricted_window_enabled}
                      onChange={(e) => setForm({ ...form, restricted_window_enabled: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded bg-slate-900 border-slate-700"
                    />
                  </label>

                  <label className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-white block">Event Waiting Room Queue</span>
                      <span className="text-[11px] text-slate-400">Independent queue specific to this event only</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.queue_enabled}
                      onChange={(e) => setForm({ ...form, queue_enabled: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded bg-slate-900 border-slate-700"
                    />
                  </label>

                  <label className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold text-white block">Anti-Bot Timing & 50-Burst Lockout</span>
                      <span className="text-[11px] text-slate-400">Detects rapid interaction & automatically restricts 50+ burst attempts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.bot_protection_enabled}
                      onChange={(e) => setForm({ ...form, bot_protection_enabled: e.target.checked })}
                      className="w-4 h-4 text-brand-600 rounded bg-slate-900 border-slate-700"
                    />
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/50 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Publish Event Live'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
