"use client";

import React, { useState } from "react";
import { useFair } from "@/contexts/FairContext";
import { verifyOutcome } from "@/lib/provablyFair";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, RefreshCw, CheckCircle2, Copy, Search } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  gameName: string;
  winChance?: number; 
  lastResult?: { hash: string; float: number; nonce: number; won: boolean } | null;
  disableRotation?: boolean;
}

export default function FairModal({ open, onClose, gameName, lastResult, disableRotation }: Props) {
  const { state, setClientSeed, revealAndRotate } = useFair();
  const [tab, setTab] = useState<"seeds" | "verify">("seeds");
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);
  const [newClientSeed, setNewClientSeed] = useState("");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Verify tab state
  const [vServerSeed, setVServerSeed] = useState("");
  const [vClientSeed, setVClientSeed] = useState("");
  const [vNonce, setVNonce] = useState("0");
  const [vResult, setVResult] = useState<{ hash: string; float: number; serverSeedHash: string } | null>(null);

  if (!open || !state) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleReveal = async () => {
    const old = await revealAndRotate();
    setRevealedSeed(old);
  };

  const handleChangeClientSeed = () => {
    if (newClientSeed.trim()) {
      setClientSeed(newClientSeed.trim());
      setNewClientSeed("");
      setRevealedSeed(null);
    }
  };

  const handleVerify = async () => {
    if (!vServerSeed || !vClientSeed) return;
    const result = await verifyOutcome(vServerSeed, vClientSeed, parseInt(vNonce) || 0);
    setVResult(result);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#111023] rounded-xl w-full max-w-[580px] shadow-[0_0_80px_rgba(168,85,247,0.15)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-7 pb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-white font-black text-xl uppercase tracking-tight">Provably Fair</h2>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{gameName} Session</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Premium Segmented Tabs */}
            <div className="px-7 mb-4">
              <div className="bg-black/40 p-1.5 rounded-lg flex relative gap-1">
                <button 
                  onClick={() => setTab("seeds")}
                  className={`flex-1 py-3 px-4 rounded-md text-xs font-black uppercase tracking-widest relative z-10 transition-all ${tab === "seeds" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Active Seeds
                </button>
                <button 
                  onClick={() => setTab("verify")}
                  className={`flex-1 py-3 px-4 rounded-md text-xs font-black uppercase tracking-widest relative z-10 transition-all ${tab === "verify" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Technical Verify
                </button>
                <motion.div 
                  initial={false}
                  animate={{ x: tab === "seeds" ? "0%" : "100%", left: tab === "seeds" ? 0 : -6 }}
                  className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-b from-[#be30ff] to-[#7e22ce] rounded-md z-0 shadow-lg shadow-purple-500/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            </div>

            <div className="p-7 pt-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {tab === "seeds" ? (
                  <motion.div 
                    key="seeds"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    {/* Server Seed Hash */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Server Seed (Hashed)</label>
                        <button onClick={() => handleCopy(state.serverSeedHash, 'ssh')} className="text-[#be30ff] hover:brightness-125 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all">
                          {copySuccess === 'ssh' ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                          {copySuccess === 'ssh' ? 'Copied' : 'Copy Hash'}
                        </button>
                      </div>
                      <div className="bg-black/60 rounded-lg p-4 text-[11px] text-gray-300 font-mono break-all leading-relaxed shadow-inner">
                        {state.serverSeedHash}
                      </div>
                      <p className="text-[10px] text-gray-500 italic leading-relaxed">
                        This SHA-256 hash was generated before your game session. It guarantees that the server hasn't changed the outcome of your rolls.
                      </p>
                    </div>

                    {/* Client Seed */}
                    <div className="space-y-3">
                      <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Client Seed</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative group">
                          <input
                            type="text"
                            value={newClientSeed || state.clientSeed}
                            onChange={(e) => setNewClientSeed(e.target.value)}
                            className="w-full bg-black/60 rounded-lg p-4 text-xs text-white font-black tracking-wider focus:outline-none transition-all placeholder:text-gray-700"
                            placeholder="Enter new seed..."
                          />
                        </div>
                        <button 
                          onClick={handleChangeClientSeed}
                          className="px-6 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                    {/* Nonce & Games Played */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/60 p-5 rounded-lg">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Current Nonce</span>
                        <span className="text-white font-black text-xl tracking-tight">{state.nonce}</span>
                      </div>
                      <div className="bg-black/60 p-5 rounded-lg">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Status</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                          <span className="text-white font-black text-xs uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Reveal Section */}
                    <div className="pt-4">
                        <button 
                          onClick={handleReveal}
                          disabled={disableRotation}
                          className={`w-full py-5 rounded-lg font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${disableRotation ? 'bg-white/5 text-gray-600 grayscale' : 'bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99]'}`}
                        >
                          <RefreshCw size={14} className={disableRotation ? "" : "animate-spin-slow"} />
                          {disableRotation ? "LOCKED DURING GAME" : "Reveal & Rotate Seeds"}
                        </button>
                    </div>

                    {revealedSeed && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-green-500/5 rounded-lg space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Revealed Server Seed</span>
                          <CheckCircle2 className="text-green-500" size={14} />
                        </div>
                        <div className="text-[11px] text-green-300 font-mono break-all leading-relaxed">
                          {revealedSeed}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="verify"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Server Seed</label>
                        <input type="text" value={vServerSeed} onChange={(e) => setVServerSeed(e.target.value)} placeholder="Enter the revealed seed" className="w-full bg-black/60 rounded-lg p-4 text-xs text-white font-mono focus:outline-none transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Client Seed</label>
                        <input type="text" value={vClientSeed} onChange={(e) => setVClientSeed(e.target.value)} placeholder="Enter client seed" className="w-full bg-black/60 rounded-lg p-4 text-xs text-white font-mono focus:outline-none transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nonce</label>
                        <input type="number" value={vNonce} onChange={(e) => setVNonce(e.target.value)} className="w-full bg-black/60 rounded-lg p-4 text-xs text-white font-mono focus:outline-none transition-all" />
                      </div>
                    </div>

                    <button onClick={handleVerify} className="w-full py-5 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] shadow-lg shadow-purple-500/20 text-white text-xs font-black uppercase tracking-[0.2em] rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3">
                      <Search size={14} />
                      Verify Result
                    </button>

                    {vResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4 pt-4"
                      >
                        <div className="bg-black/60 p-5 rounded-lg space-y-3">
                          <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Hashed Result (HMAC-SHA256)</label>
                          <div className="text-[11px] text-[#be30ff] font-mono break-all leading-relaxed font-bold">
                            {vResult.hash}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/60 p-5 rounded-lg">
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Final Float</span>
                            <span className="text-white font-black text-lg tracking-tight">{vResult.float.toFixed(10)}</span>
                          </div>
                          <div className="bg-black/60 p-5 rounded-lg">
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-2">Outcome</span>
                            <span className="text-white font-black text-lg tracking-tight">{Math.floor(vResult.float * 10001) / 100}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
