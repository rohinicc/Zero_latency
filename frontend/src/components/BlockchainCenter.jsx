import React, { useState, useEffect } from 'react';
import { 
  Coins, Wallet, CheckCircle2, AlertCircle, 
  ExternalLink, ArrowRight, ShieldCheck, RefreshCw, Copy, Check
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

export default function BlockchainCenter({ currentUser }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState(getSavedContractAddress());
  const [txLog, setTxLog] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedAbi, setCopiedAbi] = useState(false);

  // Mint / Resell simulation inputs
  const [mintEventId, setMintEventId] = useState(1);
  const [mintFacePrice, setMintFacePrice] = useState('0.05');
  const [resellTicketId, setResellTicketId] = useState(1);
  const [resellBuyerAddr, setResellBuyerAddr] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [resellPrice, setResalePrice] = useState('0.055');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Check if ethereum is already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      handleConnect();
    }
  }, []);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5" />
            <span>Web3 Smart Contract Layer</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl text-white">
            Blockchain Ticketing & Solidity Contract
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            FairPass pairs high-performance Web2 SQLite databases for sub-second check-in with 
            Solidity smart contracts on Ethereum/Polygon for verifiable on-chain ownership, 1.1× resale price caps, and redemption.
          </p>
        </div>

        {/* MetaMask Connect Button */}
        <div>
          {!wallet ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/30 flex items-center gap-2.5 transition-all"
            >
              <Wallet className="w-4 h-4" />
              <span>{connecting ? 'Connecting...' : 'Connect MetaMask'}</span>
            </button>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/40 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white font-mono">
                  {wallet.account.substring(0, 6)}...{wallet.account.slice(-4)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Chain ID: {wallet.chainId} • Balance: {wallet.balance} ETH
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Distinction Notice (Requirement: Clearly distinguish database ticket operations from blockchain-confirmed operations) */}
      <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Architecture Transparency: Web2 SQLite Database vs. Web3 Blockchain</span>
        </div>
        <p className="text-slate-400">
          • <strong>Fast Web2 SQLite Database:</strong> Powers the instant live ticketing, rapid gate scanning, bot protection rate limits, and 50-burst lockout.<br />
          • <strong>Solidity Smart Contract (FairPass.sol):</strong> Provides decentralized, immutable proof of ownership, smart-contract enforced 1.1× resale price cap, and on-chain redemption.
        </p>
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
            Executes `resell` or `redeem` in the smart contract with Solidity-enforced 1.1× cap check.
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
  );
}
