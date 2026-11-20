import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ExploreEvents from './components/ExploreEvents';
import RestrictedAccessModal from './components/RestrictedAccessModal';
import DemoPaymentModal from './components/DemoPaymentModal';
import MyTickets from './components/MyTickets';
import ResaleMarketplace from './components/ResaleMarketplace';
import ResaleModal from './components/ResaleModal';
import ShareModal from './components/ShareModal';
import GateVerification from './components/GateVerification';
import OrganizerDashboard from './components/OrganizerDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import BlockchainCenter from './components/BlockchainCenter';
import { ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [tab, setTab] = useState('events');
  const [identity, setIdentity] = useState({
    name: 'Alice Sharma',
    email: 'alice@example.com',
    role: 'Fan & Ticket Buyer',
    badge: 'Fan'
  });
  const [demoUsers, setDemoUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sharedTickets, setSharedTickets] = useState([]);
  const [listings, setListings] = useState([]);
  const [activeRestrictionsCount, setActiveRestrictionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Active Modals
  const [restrictedEventModal, setRestrictedEventModal] = useState(null);
  const [demoPaymentData, setDemoPaymentData] = useState(null);
  const [resaleModalTicket, setResaleModalTicket] = useState(null);
  const [shareModalTicket, setShareModalTicket] = useState(null);

  useEffect(() => {
    fetchDemoUsers();
    refreshData();
  }, [identity.email]);

  async function fetchDemoUsers() {
    try {
      const res = await fetch('/api/demo/users');
      const data = await res.json();
      setDemoUsers(data);
    } catch (err) {
      console.error('Failed to load demo users:', err);
    }
  }

  async function refreshData() {
    setLoading(true);
    try {
      const [eventsRes, ticketsRes, sharedRes, listingsRes, restrictionsRes] = await Promise.all([
        fetch('/api/events'),
        fetch(`/api/tickets?email=${encodeURIComponent(identity.email)}`),
        fetch(`/api/tickets/shared-with-me?email=${encodeURIComponent(identity.email)}`),
        fetch('/api/resale/listings'),
        fetch('/api/admin/security/restrictions')
      ]);

      const eventsData = await eventsRes.json();
      const ticketsData = await ticketsRes.json();
      const sharedData = await sharedRes.json();
      const listingsData = await listingsRes.json();
      const restrictionsData = await restrictionsRes.json();

      setEvents(eventsData || []);
      setTickets(ticketsData || []);
      setSharedTickets(sharedData || []);
      setListings(listingsData || []);
      setActiveRestrictionsCount(restrictionsData?.length || 0);
    } catch (err) {
      console.error('Refresh data error:', err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }

  // Handle Event Selection -> Open Event-Specific Restricted Access Window
  function handleSelectEvent(event) {
    setRestrictedEventModal(event);
  }

  // Handle Proceed to Demo Payment Gateway
  function handleProceedToPayment(paymentData) {
    setRestrictedEventModal(null);
    setResaleModalTicket(null);
    setDemoPaymentData(paymentData);
  }

  // Handle Payment Gateway Success
  function handlePaymentSuccess(result) {
    setDemoPaymentData(null);
    showToast(result.message, 'success');
    refreshData();
    // Navigate user to their tickets wallet
    setTab('tickets');
  }

  // Handle Resale Trigger
  function handleOpenResell(ticket) {
    setResaleModalTicket(ticket);
  }

  // Handle Share Trigger
  function handleOpenShare(ticket) {
    setShareModalTicket(ticket);
  }

  // Handle Revoke Share
  async function handleRevokeShare(ticketId) {
    if (!window.confirm('Revoke guest pass access for this ticket?')) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}/revoke-share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId,
          owner_email: identity.email
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to revoke share');
      showToast(data.message, 'success');
      refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Handle Buy Resale Listing from Marketplace
  function handleBuyListing(listing) {
    setDemoPaymentData({
      payment_type: 'RESALE',
      ticketId: listing.ticket_id,
      listingId: listing.id,
      event_id: listing.event_id,
      event_name: listing.event_name,
      sellerEmail: listing.seller_email,
      sellerName: listing.seller_name,
      amount: listing.price,
      user: identity
    });
  }

  // Reset Demo Database
  async function handleResetDemo() {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      showToast(data.message, 'success');
      await refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        currentTab={tab}
        setTab={setTab}
        identity={identity}
        setIdentity={setIdentity}
        demoUsers={demoUsers}
        ticketCount={tickets.filter(t => t.status === 'ACTIVE' && !t.redeemed).length}
        listingCount={listings.length}
        activeRestrictionsCount={activeRestrictionsCount}
        onResetDemo={handleResetDemo}
      />

      {/* Global Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-bounce-short">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-600 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            )}
            <p className="text-xs font-semibold flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        
        {/* Explore Events Tab */}
        {tab === 'events' && (
          <ExploreEvents
            events={events}
            onSelectEvent={handleSelectEvent}
            loading={loading}
          />
        )}

        {/* My Tickets Wallet Tab */}
        {tab === 'tickets' && (
          <MyTickets
            tickets={tickets}
            sharedTickets={sharedTickets}
            currentUser={identity}
            onOpenResell={handleOpenResell}
            onOpenShare={handleOpenShare}
            onRevokeShare={handleRevokeShare}
            onRefresh={refreshData}
            loading={loading}
          />
        )}

        {/* Resale Marketplace Tab */}
        {tab === 'resale' && (
          <ResaleMarketplace
            listings={listings}
            currentUser={identity}
            onBuyListing={handleBuyListing}
            onRefresh={refreshData}
            loading={loading}
          />
        )}

        {/* Venue Gate Verification Tab */}
        {tab === 'verify' && (
          <GateVerification
            onRefreshAllData={refreshData}
          />
        )}

        {/* Organizer Hub Tab */}
        {tab === 'organizer' && (
          <OrganizerDashboard
            events={events}
            currentUser={identity}
            onRefresh={refreshData}
            loading={loading}
          />
        )}

        {/* Security Shield Tab */}
        {tab === 'security' && (
          <SecurityDashboard
            onRefreshData={refreshData}
          />
        )}

        {/* Web3 Blockchain Tab */}
        {tab === 'blockchain' && (
          <BlockchainCenter
            currentUser={identity}
          />
        )}

      </main>

      {/* Modals */}
      {restrictedEventModal && (
        <RestrictedAccessModal
          event={restrictedEventModal}
          user={identity}
          onClose={() => setRestrictedEventModal(null)}
          onProceedToPayment={handleProceedToPayment}
          onRefreshData={refreshData}
        />
      )}

      {demoPaymentData && (
        <DemoPaymentModal
          paymentData={demoPaymentData}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setDemoPaymentData(null)}
        />
      )}

      {resaleModalTicket && (
        <ResaleModal
          ticket={resaleModalTicket}
          currentUser={identity}
          onClose={() => setResaleModalTicket(null)}
          onProceedToResalePayment={handleProceedToPayment}
        />
      )}

      {shareModalTicket && (
        <ShareModal
          ticket={shareModalTicket}
          currentUser={identity}
          onClose={() => setShareModalTicket(null)}
          onShareSuccess={(msg) => {
            showToast(msg, 'success');
            refreshData();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 lg:px-8 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span className="font-semibold text-slate-300">FairPass MVP</span>
            <span>— Capped Resale • Anti-Scalp Behavioral Shield • Verifiable Entry</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Demo Prototype</span>
            <span>•</span>
            <span className="text-brand-400 font-mono">SQLite + FastAPI + React + Solidity</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
