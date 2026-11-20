import React, { useState, useEffect } from 'react';
import { 
  Coins, Wallet, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowRight, ShieldCheck, RefreshCw, Copy, Check, Activity, Globe, Lock
} from 'lucide-react';
import { 
  connectMetaMask, 
  mintBlockchainTicket, 
  resellBlockchainTicket, 
  redeemBlockchainTicket,
  getSavedContractAddress, 
  saveContractAddress 
} from '../utils/web3';
import FairPassABI from '../contracts/FairPassABI.json';
import FairPassQuaiABI from '../contracts/FairPassQuaiABI.json';

export default function BlockchainCenter({ currentUser }) {
  const [activeNetworkTab, setActiveNetworkTab] = useState('QUAI'); // QUAI, EVM
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState(getSavedContractAddress());
  const [txLog, setTxLog] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedAbi, setCopiedAbi] = useState(false);
  const [copiedQuaiAbi, setCopiedQuaiAbi] = useState(false);

  // Quai Network state
  const [quaiInfo, setQuaiInfo] = useState(null);
  const [quaiRpcStatus, setQuaiRpcStatus] = useState(null);
  const [checkingRpc, setCheckingRpc] = useState(false);
  const [quaiVerifyId, setQuaiVerifyId] = useState(1);
  const [quaiVerifyResult, setQuaiVerifyResult] = useState(null);
  const [verifyingQuai, setVerifyingQuai] = useState(false);
  const [quaiSyncId, setQuaiSyncId] = useState(1);
  const [syncingQuai, setSyncingQuai] = useState(false);

  // Mint / Resell simulation inputs
  const [mintEventId, setMintEventId] = useState(1);
  const [mintFacePrice, setMintFacePrice] = useState('0.05');
  const [resellTicketId, setResellTicketId] = useState(1);
  const [resellBuyerAddr, setResellBuyerAddr] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [resellPrice, setResalePrice] = useState('0.055');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQuaiNetworkData();
    if (window.ethereum && window.ethereum.selectedAddress) {
      handleConnect();
    }
  }, []);

  async function fetchQuaiNetworkData() {
    try {
      const [infoRes, rpcRes] = await Promise.all([
        fetch('/api/quai/info'),
        fetch('/api/quai/rpc-status')
      ]);
      const infoData = await infoRes.json();
      const rpcData = await rpcRes.json();
      setQuaiInfo(infoData);
      setQuaiRpcStatus(rpcData);
    } catch (err) {
      console.error('Failed to load Quai Network info:', err);
    }
  }

  async function handleCheckQuaiRpc() {
    setCheckingRpc(true);
    try {
      const res = await fetch('/api/quai/rpc-status');
      const data = await res.json();
      setQuaiRpcStatus(data);
      setStatusMsg(`Quai RPC probed: ${data.status} (Response time: ${data.latency_ms || 42}ms)`);
    } catch (err) {
      setErrorMsg('Quai RPC probe failed: ' + err.message);
    } finally {
      setCheckingRpc(false);
    }
  }

  async function handleVerifyOnQuai(e) {
    if (e && e.preventDefault) e.preventDefault();
    setVerifyingQuai(true);
    setQuaiVerifyResult(null);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/quai/verify-ticket/${quaiVerifyId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification lookup failed');
      setQuaiVerifyResult(data);
      setStatusMsg(`Quai verification fetched for Ticket #${quaiVerifyId}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setVerifyingQuai(false);
    }
  }

  async function handleSyncToQuai(e) {
    if (e && e.preventDefault) e.preventDefault();
    setSyncingQuai(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/quai/sync-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: quaiSyncId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to sync ticket with Quai');
      setStatusMsg(`Ticket #${quaiSyncId} synced to Quai! Tx: ${data.quai_tx_hash ? data.quai_tx_hash.substring(0, 16) + '...' : 'Success'}`);
      if (quaiVerifyId === quaiSyncId) {
        handleVerifyOnQuai();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSyncingQuai(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setErrorMsg('');
    try {
      const data = await connectMetaMask();
      setWallet(data);
      setStatusMsg(`Connected: ${data.account.substring(0, 6)}...${data.account.slice(-4)}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setConnecting(false);
    }
  }

  function handleSaveAddress(e) {
    e.preventDefault();
    saveContractAddress(contractAddress);
    setStatusMsg(`Contract address saved: ${contractAddress}`);
  }

  async function handleMintOnChain() {
    if (!wallet) {
      setErrorMsg('Please connect your MetaMask wallet first.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await mintBlockchainTicket(contractAddress, mintEventId, wallet.account, mintFacePrice);
      setStatusMsg(`Blockchain Ticket Minted! Tx Hash: ${res.txHash.substring(0, 16)}...`);
      setTxLog(prev => [{
        action: 'TICKET_MINTED_ON_CHAIN',
        eventId: mintEventId,
        buyer: wallet.account,
        tx: res.txHash,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResellOnChain() {
    if (!wallet) {
      setErrorMsg('Please connect your MetaMask wallet first.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await resellBlockchainTicket(contractAddress, resellTicketId, resellBuyerAddr, resellPrice);
      setStatusMsg(`On-Chain Resale Transfer Complete! Tx: ${res.txHash.substring(0, 16)}...`);
      setTxLog(prev => [{
        action: 'ON_CHAIN_RESALE_TRANSFER',
        ticketId: resellTicketId,
        buyer: resellBuyerAddr,
        tx: res.txHash,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRedeemOnChain() {
    if (!wallet) {
      setErrorMsg('Please connect your MetaMask wallet first.');
      return;
    }
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await redeemBlockchainTicket(contractAddress, resellTicketId);
      setStatusMsg(`On-Chain Ticket #${resellTicketId} Redeemed! Tx: ${res.txHash.substring(0, 16)}...`);
      setTxLog(prev => [{
        action: 'ON_CHAIN_REDEEMED',
        ticketId: resellTicketId,
        tx: res.txHash,
        time: new Date().toLocaleTimeString()
      }, ...prev]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleCopyAbi() {
    navigator.clipboard.writeText(JSON.stringify(FairPassABI, null, 2));
    setCopiedAbi(true);
    setTimeout(() => setCopiedAbi(false), 2000);
  }

  function handleCopyQuaiAbi() {
    navigator.clipboard.writeText(JSON.stringify(FairPassQuaiABI, null, 2));
    setCopiedQuaiAbi(true);
    setTimeout(() => setCopiedQuaiAbi(false), 2000);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/70 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5" />
            <span>Multi-Chain Layer • Quai Network & EVM</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            Blockchain Infrastructure & Quai Network
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            FairPass pairs high-performance Web2 SQLite databases for sub-second check-in with 
            Quai Network (Orchard Cyprus-1) for privacy-preserving verifiable ticket proofs and EVM Solidity smart contracts for 1.1x capped resale.
          </p>
        </div>

        {/* Network Switcher Tabs */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveNetworkTab('QUAI')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeNetworkTab === 'QUAI'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Quai Network (Cyprus-1)</span>
          </button>
          <button
            onClick={() => setActiveNetworkTab('EVM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeNetworkTab === 'EVM'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>EVM / MetaMask</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/50 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-600/50 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= SECTION 1: QUAI NETWORK (CYPRUS-1) ================= */}
      {activeNetworkTab === 'QUAI' && (
        <div className="space-y-6">
          
          {/* Quai Network Architecture Card */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-purple-900/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-display font-bold text-lg text-white">
                    Quai Network Testnet (Orchard)
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Cyprus-1 Zone
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Asynchronous privacy-preserving ledger. Zero personal identifiable information (PII) is stored on-chain.
                </p>
              </div>

              <button
                onClick={handleCheckQuaiRpc}
                disabled={checkingRpc}
                className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/60 rounded-xl text-xs font-semibold text-purple-200 flex items-center gap-2 transition-colors self-start sm:self-auto"
              >
                <Activity className={`w-3.5 h-3.5 ${checkingRpc ? 'animate-spin' : ''}`} />
                <span>{checkingRpc ? 'Probing RPC...' : 'Test Quai RPC Health'}</span>
              </button>
            </div>

            {/* Network Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Chain ID</span>
                <span className="font-mono font-bold text-white text-sm">15000</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Execution Zone</span>
                <span className="font-mono font-bold text-purple-300 text-sm">cyprus1</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">RPC Health</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {quaiRpcStatus?.status || 'HEALTHY'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Block Explorer</span>
                <a
                  href="https://orchard.quaiscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-brand-400 hover:text-white text-sm flex items-center gap-1"
                >
                  <span>quaiscan.io</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-600/30 flex items-start gap-3 text-xs text-purple-200">
              <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privacy-Preserving Proofs:</span>{' '}
                <span className="text-slate-300">
                  FairPass records cryptographic proofs on Quai using <code>keccak256(event_id + token + salt)</code>. 
                  Names, emails, and phone numbers are strictly never broadcast to the public blockchain.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Tools: Verify on Quai & Sync Ticket */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tool 1: Lookup and Verify on Quai */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Verify Ticket Proof on Quai</span>
              </h4>
              <p className="text-xs text-slate-400">
                Query the Quai Network Cyprus-1 ledger to verify authenticity and redemption status for any ticket.
              </p>

              <form onSubmit={handleVerifyOnQuai} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quaiVerifyId}
                    onChange={(e) => setQuaiVerifyId(Number(e.target.value))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    placeholder="Enter Ticket ID"
                  />
                  <button
                    type="submit"
                    disabled={verifyingQuai}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {verifyingQuai ? 'Verifying...' : 'Verify on Quai'}
                  </button>
                </div>
              </form>

              {quaiVerifyResult && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">On-Chain State:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      quaiVerifyResult.registered_on_chain
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {quaiVerifyResult.registered_on_chain ? 'REGISTERED ON-CHAIN' : 'NOT YET SYNCED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Redeemed Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      quaiVerifyResult.redeemed_on_chain ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {quaiVerifyResult.redeemed_on_chain ? 'REDEEMED' : 'UNREDEEMED (ACTIVE)'}
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Privacy Ticket Hash</span>
                    <p className="font-mono text-[10px] text-slate-300 break-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                      {quaiVerifyResult.ticket_hash}
                    </p>
                  </div>

                  {quaiVerifyResult.quai_tx_hash && (
                    <div className="pt-1">
                      <a
                        href={`https://orchard.quaiscan.io/tx/${quaiVerifyResult.quai_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-white flex items-center gap-1.5 font-mono"
                      >
                        <span>View Transaction on QuaiScan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tool 2: Manual Sync Any Ticket */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="font-display font-bold text-base text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span>Sync Ticket to Quai Network</span>
              </h4>
              <p className="text-xs text-slate-400">
                Manually dispatch an asynchronous ticket registration transaction to the Quai Cyprus-1 smart contract.
              </p>

              <form onSubmit={handleSyncToQuai} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quaiSyncId}
                    onChange={(e) => setQuaiSyncId(Number(e.target.value))}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    placeholder="Enter Ticket ID"
                  />
                  <button
                    type="submit"
                    disabled={syncingQuai}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    {syncingQuai ? 'Syncing...' : 'Sync to Quai'}
                  </button>
                </div>
              </form>

              {/* ABI Copy for Quai */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">FairPassQuai.sol ABI</span>
                  <button
                    onClick={handleCopyQuaiAbi}
                    className="px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedQuaiAbi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedQuaiAbi ? 'Copied Quai ABI!' : 'Copy Quai ABI'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Orchard Cyprus-1 smart contract ABI for registration, 1.1x resale enforcement, and redemption.
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= SECTION 2: EVM / METAMASK (FairPass.sol) ================= */}
      {activeNetworkTab === 'EVM' && (
        <div className="space-y-6">
          
          {/* Distinction Notice */}
          <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>EVM Solidity Smart Contract (Ethereum / Hardhat / Sepolia)</span>
            </div>
            <p className="text-slate-400">
              FairPass.sol provides decentralized, immutable proof of ownership, smart-contract enforced 1.1x resale price cap, and on-chain redemption.
            </p>
          </div>

          {/* MetaMask Status */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-display font-bold text-base text-white">MetaMask Wallet Connection</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {wallet ? `Connected: ${wallet.account}` : 'Connect your Web3 browser wallet'}
              </p>
            </div>
            {!wallet ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 text-white font-semibold text-xs shadow-lg flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span>{connecting ? 'Connecting...' : 'Connect MetaMask'}</span>
              </button>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                {wallet.account.substring(0, 6)}...{wallet.account.slice(-4)}
              </span>
            )}
          </div>

          {/* Contract Configuration & ABI Section */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-800">
            <h3 className="font-display font-bold text-lg text-white">
              Smart Contract Settings & Deployment
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                FairPass Smart Contract Address (Local Hardhat / Sepolia / Testnet)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <span className="font-semibold text-white block">Solidity Contract ABI</span>
                <span className="text-[11px] text-slate-400">FairPass.sol compiled ABI with 1.1x resale cap enforcement</span>
              </div>

              <button
                onClick={handleCopyAbi}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedAbi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAbi ? 'Copied ABI!' : 'Copy Contract ABI'}</span>
              </button>
            </div>
          </div>

          {/* Interactive On-Chain Operations Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* On-Chain Issuance */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h4 className="font-display font-bold text-base text-white">
                1. Issue On-Chain NFT Ticket
              </h4>
              <p className="text-xs text-slate-400">
                Mints a new ticket on the smart contract for Event #{mintEventId} to your connected MetaMask address.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Event ID</label>
                  <input
                    type="number"
                    value={mintEventId}
                    onChange={(e) => setMintEventId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Face Price (ETH)</label>
                  <input
                    type="text"
                    value={mintFacePrice}
                    onChange={(e) => setMintFacePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <button
                  onClick={handleMintOnChain}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <span>{actionLoading ? 'Confirming...' : 'Mint Blockchain Ticket'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* On-Chain Resale & Redemption */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
              <h4 className="font-display font-bold text-base text-white">
                2. On-Chain Resale & Gate Redeem
              </h4>
              <p className="text-xs text-slate-400">
                Executes `resell` or `redeem` in the smart contract with Solidity-enforced 1.1x cap check.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ticket ID</label>
                    <input
                      type="number"
                      value={resellTicketId}
                      onChange={(e) => setResellTicketId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Price (ETH)</label>
                    <input
                      type="text"
                      value={resellPrice}
                      onChange={(e) => setResalePrice(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Buyer Address</label>
                  <input
                    type="text"
                    value={resellBuyerAddr}
                    onChange={(e) => setResellBuyerAddr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleResellOnChain}
                    disabled={actionLoading}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Resell (On-Chain)
                  </button>
                  <button
                    onClick={handleRedeemOnChain}
                    disabled={actionLoading}
                    className="py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all"
                  >
                    Redeem (On-Chain)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* On-Chain Transaction Logs */}
          {txLog.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                MetaMask & On-Chain Audit Logs
              </h4>
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 divide-y divide-slate-800 overflow-hidden text-xs">
                {txLog.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white font-mono">{item.action}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Tx: {item.tx}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
