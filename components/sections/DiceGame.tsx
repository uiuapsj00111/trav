"use client";

import { Shield } from "lucide-react";
import { useCurrency, COIN_ICONS } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useState } from "react";
import FairModal from "./FairModal";

// --- AUDIO ENGINE ---
let diceAudioCtx: AudioContext | null = null;

function getDiceCtx(): AudioContext {
  if (!diceAudioCtx || diceAudioCtx.state === "closed")
    diceAudioCtx = new AudioContext();
  if (diceAudioCtx.state === "suspended") diceAudioCtx.resume();
  return diceAudioCtx;
}

function playClick() {
  try {
    const ctx = getDiceCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  } catch {}
}

function playTick() {
  try {
    const ctx = getDiceCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  } catch {}
}

function playWin() {
  try {
    const ctx = getDiceCtx();
    const t = ctx.currentTime;
    // Triumphant major chord sweep
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(
        freq * 1.2,
        t + i * 0.08 + 0.2,
      );
      gain.gain.setValueAtTime(0.1, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.35);
    });
  } catch {}
}

function playLoss() {
  try {
    const ctx = getDiceCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  } catch {}
}

const COIN_IMG =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772297776282.png?width=400&height=400&resize=contain";

export default function DiceGame() {
  const {
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
  } = useCurrency();
  const { fairData } = useFair();

  // Game State
  const [betAmount, setBetAmount] = useState<string>("100");
  const [targetValue] = useState<number>(50.0);
  const [mode, setMode] = useState<"under" | "over">("under");

  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [winStatus, setWinStatus] = useState<"win" | "lose" | null>(null);
  const [showFairModal, setShowFairModal] = useState(false);
  const [fairLastResult, setFairLastResult] = useState<any>(null);

  // Animation values
  const resultX = useMotionValue(0);
  const springX = useSpring(resultX, { stiffness: 80, damping: 20 });

  // Derived values (Fixed 50/50)
  const winChance = 50;
  const multiplier = 1.98; // 99 / 50
  const profitOnWin = Number(betAmount) * multiplier - Number(betAmount);

  const handleRoll = async () => {
    const amount = Number(betAmount);
    const user = getStorageItem("mm2dice_user");
    if (!user) {
      window.dispatchEvent(new CustomEvent("openLogin"));
      return;
    }

    const balance =
      selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
    if (amount <= 0 || amount > balance || isRolling) {
      if (amount > balance) alert("Insufficient balance.");
      return;
    }

    const intermediateBalance = balance - amount;
    const balanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
    
    setStorageItem(balanceKey, intermediateBalance.toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());
    setStorageItem("mm2dice_balance_lock", (Date.now() + 120000).toString());

    if (selectedCurrency === "coins") setCoinsBalance(intermediateBalance);
    else setFunCoinsBalance(intermediateBalance);

    setIsRolling(true);
    setWinStatus(null);
    setLastResult(null);
    playClick();

    // Trigger a series of fast ticks during the \"rolling\" phase
    const tickInterval = setInterval(() => {
      playTick();
    }, 100);

    resultX.set(Math.random() * 100);

    setTimeout(() => {
      clearInterval(tickInterval);
      const outcome = Math.random() * 100;
      // Fixed 50/50 Logic (Mode locked while rolling)
      const isWin =
        mode === "under" ? outcome < 50.0 : outcome >= 50.0;

      setLastResult(outcome);
      resultX.set(outcome);

      // Store tech data for FairModal
      setFairLastResult({
        hash: "Simulated_HMAC_Hash",
        float: outcome / 100,
        nonce: 0,
        won: isWin,
      });

      setTimeout(() => {
        setWinStatus(isWin ? "win" : "lose");
        if (isWin) playWin();
        else playLoss();

        // Calculate final balance (Wager was already deducted)
        const winnings = isWin ? amount * multiplier : 0;
        const finalBalance = balance - amount + winnings;
        const balanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
        
        // Refresh lock for 15s to allow server to catch up
        setStorageItem("mm2dice_balance_lock", (Date.now() + 15000).toString());
        setStorageItem("mm2dice_balance_ts", Date.now().toString());
        setStorageItem(balanceKey, finalBalance.toString());

        if (selectedCurrency === "coins") {
          setCoinsBalance(finalBalance);
        } else {
          setFunCoinsBalance(finalBalance);
        }
        window.dispatchEvent(new Event("balanceUpdate"));
        window.dispatchEvent(new CustomEvent("balanceAnimate", {
           detail: { from: intermediateBalance, to: finalBalance }
        }));

        setTimeout(() => {
          setIsRolling(false);
          setWinStatus(null);
        }, 1500);
      }, 400);

      const profit = isWin ? amount * multiplier - amount : -amount;
      recordGameResult(amount, profit, {
        game_type: "dice",
        currency: selectedCurrency,
        multiplier: multiplier,
        result: isWin ? "win" : "loss",
      });
    }, 600);
  };

  return (
    <div
      className="dice-game mx-auto flex gap-12 w-full min-h-[850px] bg-[#0d0b1a]"
      style={{ maxWidth: "100%", padding: "120px 24px 24px 24px" }}
    >
      {/* Left Control Panel - Mirroring Blackjack Style */}
      <div className="w-[400px] shrink-0 bg-[#110f21]/90 backdrop-blur-xl rounded-[32px] p-8 flex flex-col gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[60%] bg-[#be30ff] blur-[100px] rounded-full opacity-30" />
        </div>

        <div className="relative z-10 flex flex-col gap-8 h-full">
          {/* Bet Amount Card */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">
              Bet Amount
            </div>
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3 mb-4 group transition-all shadow-2xl">
              <img src={COIN_IMG} className="w-6 h-6 flex-shrink-0 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-transform group-hover:scale-110" alt="coin" />
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={isRolling}
                className="flex-1 bg-transparent text-white font-[900] text-lg outline-none border-none focus:ring-0 disabled:opacity-50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setBetAmount(String(Math.floor(Number(betAmount) / 2)))
                }
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white font-black text-[10px] transition-all uppercase tracking-widest"
              >
                1/2
              </button>
              <button
                onClick={() => setBetAmount(String(Number(betAmount) * 2))}
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white font-black text-[10px] transition-all uppercase tracking-widest"
              >
                2X
              </button>
              <button
                onClick={() => setBetAmount(balance.toString())}
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white font-black text-[10px] transition-all uppercase tracking-widest"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Mode Selector Card */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">
              Game Mode
            </div>
            <div className="flex gap-2">
              <button
                disabled={isRolling}
                onClick={() => {
                  setMode("under");
                  playClick();
                }}
                className={`flex-1 py-3.5 rounded-xl font-black text-[11px] transition-all uppercase tracking-[0.15em] ${mode === "under" ? "bg-[#be30ff] text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)]" : "bg-black/30 text-white/20 hover:text-white/40"} ${isRolling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Under
              </button>
              <button
                disabled={isRolling}
                onClick={() => {
                  setMode("over");
                  playClick();
                }}
                className={`flex-1 py-3.5 rounded-xl font-black text-[11px] transition-all uppercase tracking-[0.15em] ${mode === "over" ? "bg-[#be30ff] text-white shadow-[0_4px_15px_rgba(168,85,247,0.4)]" : "bg-black/30 text-white/20 hover:text-white/40"} ${isRolling ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Over
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 transition-all hover:bg-white/[0.05]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                Multiplier
              </span>
              <span className="text-white font-black text-sm tracking-tight">
                x{multiplier.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                Win Chance
              </span>
              <span className="text-white font-black text-sm tracking-tight">
                {winChance.toFixed(2)}%
              </span>
            </div>
            <div className="pt-4 mt-2 flex justify-between items-center bg-transparent">
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                Profit
              </span>
              <span className="text-[#be30ff] font-black text-sm drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                +{profitOnWin.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={handleRoll}
            disabled={isRolling}
            className="w-full py-5 rounded-2xl bg-[#be30ff] hover:bg-[#7e22ce] text-white font-black text-[18px] uppercase tracking-[0.2em] shadow-[0_6px_0_0_#7c3aed,0_15px_40px_rgba(168,85,247,0.2)] hover:translate-y-[1px] hover:shadow-[0_5px_0_0_#7c3aed,0_15px_30px_rgba(168,85,247,0.2)] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none mt-auto"
          >
            {isRolling ? "ROLLING..." : "ROLL DICE"}
          </button>

          {/* Provably Fair */}
          <button
            onClick={() => setShowFairModal(true)}
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black tracking-[0.2em] text-white/10 hover:text-white/30 transition-all uppercase group py-2"
          >
            <Shield size={14} className="group-hover:text-[#be30ff] transition-colors" />
            Provably Fair
          </button>
        </div>
      </div>

      {/* Right Game Area - Mirroring Blackjack/Mines Style */}
      <div className="bg-[#110f21]/40 backdrop-blur-sm rounded-[32px] p-8 flex-1 flex justify-center items-center relative overflow-hidden h-[620px] shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        {/* Decorative Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.05)_0%,_transparent_70%)]" />

        <div className="relative z-10 w-full max-w-[850px]">
          {/* Inner Slider Arena - Matching Blackjack Inner Card */}
          <div className="bg-[#15132b]/80 backdrop-blur-md rounded-[32px] p-16 shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all hover:bg-[#15132b]/90">
            {/* Slider Interface */}
            <div className="relative pt-12">
              <div className="absolute top-[32px] left-0 right-0 h-[8px] bg-[#0d0d0d] rounded-full z-0" />

              <div className="relative h-[70px] flex items-center mb-8">
                <div
                  className="h-[8px] rounded-l-full transition-all duration-300 relative"
                  style={{
                    width: `${targetValue}%`,
                    background: mode === "under" ? "#be30ff" : "#1c1c24",
                    boxShadow:
                      mode === "under"
                        ? "0 0 25px rgba(168,85,247,0.4)"
                        : "none",
                  }}
                />
                <div
                  className="h-[8px] flex-1 rounded-r-full transition-all duration-300 relative"
                  style={{
                    background: mode === "over" ? "#be30ff" : "#1c1c24",
                    boxShadow:
                      mode === "over"
                        ? "0 0 25px rgba(168,85,247,0.4)"
                        : "none",
                  }}
                />

                {/* Fixed Target Marker at 50 */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-[4px] h-[36px] bg-white shadow-[0_0_15px_rgba(255,255,255,1)] z-30 pointer-events-none rounded-full"
                  style={{ left: `50%`, translateX: "-50%" }}
                >
                  <div className="absolute top-[-28px] left-1/2 -translate-x-1/2 bg-white text-black text-[12px] font-[900] px-2.5 py-0.5 rounded shadow-xl">
                    50.00
                  </div>
                </div>

                {/* Rolling Indicator */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 z-40 flex flex-col items-center"
                  style={{
                    left: useTransform(springX, (v) => `${v}%`),
                    translateX: "-50%",
                    y: -12,
                  }}
                >
                  <div className="w-16 h-16 bg-white rounded-[16px] shadow-[0_15px_60px_rgba(0,0,0,0.9)] flex flex-col items-center justify-center relative border-none">
                    <span className="text-[#0d0d0d] font-black text-[16px]">
                      {lastResult !== null ? lastResult.toFixed(2) : ""}
                    </span>
                    <div className="absolute bottom-[-16px] w-0 h-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-white" />
                  </div>
                </motion.div>
              </div>

              {/* Ruler */}
              <div className="flex justify-between px-0 text-[12px] font-black text-gray-600 uppercase tracking-widest mt-2 grayscale opacity-60">
                <span>0</span>
                <span className="ml-4">25</span>
                <span>50</span>
                <span className="mr-4">75</span>
                <span>100</span>
              </div>
            </div>

            {/* Win/Loss Overlay */}
            {winStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className={`absolute inset-0 z-[100] flex items-center justify-center backdrop-blur-[2px] rounded-[32px]`}
              >
                <div className={`px-12 py-6 rounded-3xl flex flex-col items-center gap-2 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-2 ${winStatus === 'win' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <span className={`text-6xl font-[1000] tracking-tighter ${winStatus === 'win' ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}>
                    {winStatus === 'win' ? 'WINNER!' : 'LOST'}
                  </span>
                  {winStatus === 'win' && (
                    <span className="text-white font-black text-xl italic uppercase font-sans">
                       +{(Number(betAmount) * multiplier).toFixed(2)}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </div>

        </div>
      </div>

      <FairModal
        open={showFairModal}
        onClose={() => setShowFairModal(false)}
        gameName="Dice"
        lastResult={fairLastResult}
      />
    </div>
  );
}
