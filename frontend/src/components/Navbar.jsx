import React, { useState } from 'react';
import { 
  Ticket, Shield, Repeat, ScanLine, PlusCircle, Activity, 
  Coins, User, ChevronDown, Check, Sparkles, RefreshCw
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setTab, 
  identity, 
  setIdentity, 
  demoUsers, 
  ticketCount = 0, 
  listingCount = 0,
  activeRestrictionsCount = 0,
  onResetDemo
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  const navItems = [
    { id: 'events', label: 'Explore Events', icon: Ticket },
    { id: 'tickets', label: 'My Tickets', icon: Ticket, badge: ticketCount > 0 ? ticketCount : null },
    { id: 'resale', label: 'Resale Market', icon: Repeat, badge: listingCount > 0 ? listingCount : null },
    { id: 'verify', label: 'Gate Scanner', icon: ScanLine },
    { id: 'organizer', label: 'Organizer Hub', icon: PlusCircle },
    { id: 'security', label: 'Security Shield', icon: Activity, alert: activeRestrictionsCount > 0 },
    { id: 'blockchain', label: 'Web3 & Contract', icon: Coins },
  ];

  const handleSelectUser = (u) => {
    setIdentity({ name: u.name, email: u.email, role: u.role, badge: u.badge });
    setDropdownOpen(false);
    setCustomInputOpen(false);
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    if (customEmail.trim()) {
      setIdentity({
        name: customName.trim() || 'Demo User',
        email: customEmail.trim().toLowerCase(),
        role: 'Custom User',
        badge: 'Custom'
      });
      setDropdownOpen(false);
      setCustomInputOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div 
            onClick={() => setTab('events')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-brand-300 transition-colors">
                  FairPass
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  MVP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Anti-Scalping • Capped Resale • Verified Entry
              </p>
            </div>
          </div>

          {/* Mobile Identity Button */}
          <div className="md:hidden">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            >
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span className="max-w-[100px] truncate font-medium">{identity.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-1 ring-brand-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-brand-700' : 'bg-brand-500/20 text-brand-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.alert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Demo Persona Switcher & Reset */}
        <div className="hidden md:flex items-center gap-3 relative">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 transition-all text-xs text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors">
                    {identity.name}
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-800 text-brand-300 border border-slate-700">
                    {identity.badge || 'Persona'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {identity.email}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1 group-hover:text-slate-200 transition-colors" />
            </button>

            {/* Persona Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Demo Personas (1-Click Switch)
                  </span>
                  <span className="text-[10px] text-brand-400 font-mono">Demo Identity</span>
                </div>

                <div className="space-y-1">
                  {demoUsers.map((u) => {
                    const isSelected = identity.email === u.email;
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected 
                            ? 'bg-brand-950/70 border border-brand-500/40 text-white' 
                            : 'hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 shrink-0 ${
                          isSelected ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-100 truncate">{u.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {u.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{u.description}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-brand-400 shrink-0 mt-1" />}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Identity Input Form */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  {!customInputOpen ? (
                    <button
                      onClick={() => setCustomInputOpen(true)}
                      className="w-full text-center py-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      + Use Custom Name / Email
                    </button>
                  ) : (
                    <form onSubmit={handleApplyCustom} className="space-y-2 p-1">
                      <input
                        type="text"
                        placeholder="Your name"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                      <input
                        type="email"
                        placeholder="Demo email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Switch
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomInputOpen(false)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Reset DB to clean demo */}
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      if (window.confirm("Reset demo database back to clean hackathon state?")) {
                        onResetDemo();
                        setDropdownOpen(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Database to Clean Demo State</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
