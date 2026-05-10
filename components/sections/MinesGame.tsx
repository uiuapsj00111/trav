"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { minesOutcome } from "@/lib/provablyFair";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import FairModal from "./FairModal";
import WinConfetti from "@/components/ui/WinConfetti";

let minesAudioCtx: AudioContext | null = null;

function getMinesCtx(): AudioContext {
  if (!minesAudioCtx || minesAudioCtx.state === "closed")
    minesAudioCtx = new AudioContext();
  if (minesAudioCtx.state === "suspended") minesAudioCtx.resume();
  return minesAudioCtx;
}

function playClickSound() {
  try {
    const ctx = getMinesCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 600 + Math.random() * 100;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch { }
}

function playSafeSound() {
  try {
    const ctx = getMinesCtx();
    const t = ctx.currentTime;
    // Two note chime for safe tile
    const notes = [523, 659]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.2);
    });
  } catch { }
}

function playWinSound() {
  try {
    const ctx = getMinesCtx();
    const t = ctx.currentTime;

    // Rising triumphant sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(400, t);
    sweep.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
    sweepGain.gain.setValueAtTime(0.18, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sweep.connect(sweepGain).connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.55);

    // Double harmonic for richness
    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonic.type = "triangle";
    harmonic.frequency.setValueAtTime(800, t);
    harmonic.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    harmonicGain.gain.setValueAtTime(0.1, t);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    harmonic.connect(harmonicGain).connect(ctx.destination);
    harmonic.start(t);
    harmonic.stop(t + 0.55);

    // Deep bass punch
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(150, t);
    bass.frequency.exponentialRampToValueAtTime(80, t + 0.3);
    bassGain.gain.setValueAtTime(0.2, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(t);
    bass.stop(t + 0.4);
  } catch { }
}

function playMineSound() {
  try {
    const ctx = getMinesCtx();
    const t = ctx.currentTime;
    // Sharp descending tone for mine hit
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    // Add a second harmonic for depth
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(400, t);
    osc2.frequency.exponentialRampToValueAtTime(100, t + 0.3);
    gain2.gain.setValueAtTime(0.1, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.4);
  } catch { }
}

export default function MinesGame() {
  const {
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
    selectedCurrency
  } = useCurrency();

  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  
  const [mineCount, setMineCount] = useState(3); // Default to 3 mines
  const [betAmount, setBetAmount] = useState("");
  const [gameActive, setGameActive] = useState(false);
  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const { state: fairState, incrementNonce } = useFair();
  const [activeMineCount, setActiveMineCount] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [multiplier, setMultiplier] = useState(1.01);
  const [gridSize, setGridSize] = useState(5); // Default to 5x5
  const TOTAL_TILES = gridSize * gridSize;
  const [mines, setMines] = useState<number[]>([]);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  
  const [profit, setProfit] = useState(0);
  const [lastRevealed, setLastRevealed] = useState<number | null>(null);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [animatingTile, setAnimatingTile] = useState<number | null>(null);
  const [currentBet, setCurrentBet] = useState(0);

  const calculateMultiplier = useCallback(
    (revealed: number, minesSelected: number) => {
      let mult = 1.0;
      const edge = 0.6;
      for (let i = 0; i < revealed; i++) {
        mult *= (TOTAL_TILES - i) / (TOTAL_TILES - minesSelected - i);
      }
      // Cap at 1,000,000x for safety
      return Math.min(
        1000000,
        Math.max(1.01, Math.floor(mult * edge * 100) / 100),
      );
    },
    [TOTAL_TILES],
  );

  const [previewMultiplier, setPreviewMultiplier] = useState(1.01);
  const [previewProfit, setPreviewProfit] = useState(0);

  // Update preview stats when mineCount or betAmount changes
  useEffect(() => {
    if (!gameActive) {
      const nextMult = calculateMultiplier(1, mineCount);
      setPreviewMultiplier(nextMult);
      const bet = parseFloat(betAmount || "0");
      setPreviewProfit(bet > 0 ? bet * nextMult - bet : 0);
    }
  }, [mineCount, betAmount, gameActive, calculateMultiplier]);

  const startGame = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0 || !fairState || gameActive)
      return;
    const bet = parseFloat(betAmount);

    // Add bet limits to prevent excessive profit/farming
    if (bet < 0.1) {
      alert("Minimum bet is 0.10 coins");
      return;
    }
    if (bet > 100000) {
      alert("Maximum bet is 100,000 coins");
      return;
    }

    const currentBalance = balance;
    if (bet > currentBalance) {
      alert("Insufficient balance.");
      return;
    }

    // Safety check for mineCount range
    const maxMines = TOTAL_TILES - 1;
    const currentMines = Math.min(maxMines, Math.max(1, mineCount));

    const activeBalanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
    const newBalance = currentBalance - bet;
    
    // 1. Set pending state
    setStorageItem("mm2dice_mines_pending_game", JSON.stringify({
      betAmount: bet,
      currency: selectedCurrency,
      timestamp: Date.now()
    }));

    // 2. Deduct bet
    if (selectedCurrency === "coins") setCoinsBalance(newBalance);
    else setFunCoinsBalance(newBalance);

    setStorageItem(activeBalanceKey, newBalance.toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());
    
    // 3. Lock balance
    setStorageItem(
      "mm2dice_balance_lock",
      (Date.now() + 120000).toString(),
    );

    setGameOver(false);
    setWon(false);
    setMines([]);
    setRevealedTiles(new Set());
    setProfit(0);
    setMultiplier(1.0);
    setCurrentBet(bet);
    setActiveMineCount(currentMines);
    playClickSound();

    window.dispatchEvent(
      new CustomEvent("balanceAnimate", {
        detail: { from: currentBalance, to: newBalance, currency: selectedCurrency },
      }),
    );

    // 4. Server bet
    const username = getStorageItem("mm2dice_user") || "";
    const sessionToken = getStorageItem("mm2dice_session_token") || "";
    fetch("/api/games/mines/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        username,
        betAmount: bet,
        currency: selectedCurrency
      })
    }).then(res => res.json()).then(data => {
      if (data.success && data.newBal !== undefined) {
        if (selectedCurrency === "coins") setCoinsBalance(data.newBal);
        else setFunCoinsBalance(data.newBal);
      }
    }).catch(err => console.error("Mines bet error:", err));

    const { minePositions } = await minesOutcome(
      fairState,
      currentMines,
      TOTAL_TILES,
    );
    incrementNonce();
    setMines(Array.from(minePositions));
    setGameActive(true);
    setProfit(0);
    setLastRevealed(null);
    setShakeGrid(false);
    setCurrentBet(bet);
  };

  const handleTileClick = (tileIndex: number) => {
    if (!gameActive || gameOver || revealedTiles.has(tileIndex)) return;

    const isMine = mines.includes(tileIndex);
    const newRevealed = new Set(revealedTiles);
    newRevealed.add(tileIndex);

    if (isMine) {
      // Hit a mine - game over, loss
      setRevealedTiles(prev => {
        const next = new Set(prev);
        next.add(tileIndex);
        return next;
      });
      setGameActive(false);
      setGameOver(true);
      setWon(false);
      setProfit(0);
      setLastRevealed(tileIndex);
      setShakeGrid(true);
      playMineSound();
      
      // Permanently record the loss in history
      recordGameResult(currentBet, -currentBet, {
        game_type: "mines",
        currency: selectedCurrency,
        result: "loss",
        multiplier: 0,
        payout: 0,
        meta: { mineCount: activeMineCount, gridSize, revealed: newRevealed.size }
      });

      removeStorageItem("mm2dice_balance_lock");
      removeStorageItem("mm2dice_mines_pending_game");
      setTimeout(() => setShakeGrid(false), 500);
    } else {
      // Safe tile - update multiplier and profit
      const newMultiplier = calculateMultiplier(newRevealed.size, activeMineCount);
      setMultiplier(newMultiplier);
      const newProfit = currentBet * newMultiplier - currentBet;
      setProfit(newProfit);
      setRevealedTiles(prev => {
        const next = new Set(prev);
        next.add(tileIndex);
        return next;
      });
      setLastRevealed(tileIndex);
      setAnimatingTile(tileIndex);
      playSafeSound();
      setTimeout(() => setAnimatingTile(null), 600);
    }
  };

  const handleCashOut = () => {
    if (!gameActive || gameOver) return;

    // Add payout to balance
    const payout = currentBet * multiplier;
    const newBalance = balance + payout;
    const activeBalanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

    if (selectedCurrency === "coins") setCoinsBalance(newBalance);
    else setFunCoinsBalance(newBalance);

    setStorageItem(activeBalanceKey, newBalance.toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());

    // Securely credit payout on server
    const username = getStorageItem("mm2dice_user") || "";
    const sessionToken = getStorageItem("mm2dice_session_token") || "";
    fetch("/api/games/mines/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        username,
        payoutAmount: payout,
        currency: selectedCurrency
      })
    }).then(res => res.json()).then(data => {
      if (data.success && data.newBal !== undefined) {
        if (selectedCurrency === "coins") setCoinsBalance(data.newBal);
        else setFunCoinsBalance(data.newBal);
      }
    }).catch(err => console.error("Mines payout error:", err));

    // Record win in history
    recordGameResult(currentBet, payout - currentBet, {
      game_type: "mines",
      currency: selectedCurrency,
      result: "win",
      multiplier: multiplier,
      payout: payout,
      meta: { mineCount: activeMineCount, gridSize, revealed: revealedTiles.size }
    });

    // Release balance lock immediately upon cashout
    removeStorageItem("mm2dice_balance_lock");
    removeStorageItem("mm2dice_mines_pending_game");

    // End game
    setGameActive(false);
    setGameOver(true);
    setWon(true);
    setProfit(currentBet * multiplier - currentBet);
    playWinSound();
  };

  // Win overlay logic (show if game is completed and payout > 0)
  const showWin = gameOver && profit > 0;
  const winMultiplier = multiplier;
  const payoutAmount = profit;

  return (
    <div
      className="mines-game mx-auto flex flex-col lg:flex-row gap-4 lg:gap-12 p-3 lg:p-6 animate-fadeIn w-full max-w-[1600px]"
    >
      {won && <WinConfetti />}
      {/* Left Control Panel Container */}
      <div
        className="w-full lg:w-96 order-2 lg:order-1 shrink-0 bg-[#110f21]/80 backdrop-blur-xl rounded-[2.5rem] p-5 lg:p-6 flex flex-col gap-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        {/* Animated background ambient glow */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[60%] bg-[#8B5CF6] blur-[100px] rounded-full opacity-30" />
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          {/* Bet Amount */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 shadow-inner transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
              Bet amount
            </div>
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3 mb-4 group transition-all">
              <img
                src={COIN_ICONS[selectedCurrency]}
                alt="coin"
                className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110"
              />
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                placeholder="0"
                disabled={gameActive}
                className="flex-1 bg-transparent text-white font-black text-lg outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-white/10"
              />
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              value={betAmount || "0"}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={gameActive}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((parseFloat(betAmount) || 0) / 10000) * 100}%, #444 ${((parseFloat(betAmount) || 0) / 10000) * 100}%, #444 100%)`,
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setBetAmount((Math.max(0.1, parseFloat(betAmount || "0") / 2)).toString())}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm"
              >
                1/2
              </button>
              <button
                onClick={() => setBetAmount((parseFloat(betAmount || "0") * 2).toString())}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm"
              >
                2x
              </button>
              <button
                onClick={() => setBetAmount(balance.toString())}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm"
              >
                Max
              </button>
            </div>
          </div>

          {/* Number of Mines */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 shadow-inner transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
              Number of mines
            </div>
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3 mb-4 font-black text-white group">
              <input
                type="number"
                min="1"
                max={TOTAL_TILES - 1}
                value={mineCount}
                onChange={(e) =>
                  setMineCount(
                    Math.min(TOTAL_TILES - 1, Math.max(1, parseInt(e.target.value) || 1)),
                  )
                }
                className="flex-1 bg-transparent text-white font-black text-lg outline-none border-none"
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 3, 5, 10, 24].filter(num => num < TOTAL_TILES).map((num) => (
                <button
                  key={num}
                  onClick={() => setMineCount(num)}
                  className={`py-2 px-1 rounded-lg font-black text-[10px] transition-all duration-200 ${mineCount === num
                    ? "bg-[#8B5CF6] text-white shadow-[0_3px_0_0_#5b21b6] scale-105"
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Size Selector */}
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 shadow-inner transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
              Grid Size
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 7].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setGridSize(size);
                    const newTotal = size * size;
                    if (mineCount >= newTotal) {
                      setMineCount(newTotal - 1);
                    }
                  }}
                  disabled={gameActive}
                  className={`py-2 rounded-lg font-black text-[10px] transition-all duration-200 ${gridSize === size
                    ? "bg-[#8B5CF6] text-white shadow-[0_3px_0_0_#5b21b6] scale-105"
                    : "bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-50"
                    }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={startGame}
            disabled={!betAmount || gameActive}
            className="w-full py-4 rounded-xl bg-[#8B5CF6] hover:brightness-110 disabled:grayscale disabled:opacity-50 text-white font-black text-lg transition-all shadow-[0_4px_0_0_#5b21b6] active:translate-y-[2px] active:shadow-none uppercase tracking-widest relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            Place bet
          </button>

          {/* Cash Out Button */}
          {gameActive && !gameOver && (
            <button
              onClick={handleCashOut}
              className="w-full py-4 rounded-xl bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] hover:brightness-110 text-white font-black text-lg transition-all shadow-[0_4px_0_0_#5b21b6] active:translate-y-[2px] active:shadow-none uppercase tracking-widest relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              Cash Out - {(currentBet * multiplier).toFixed(2)}
            </button>
          )}


        </div>
      </div>

      {/* Right Game Grid Container */}
      <div
        className="order-1 lg:order-2 flex-1 min-h-[450px] lg:min-h-0 rounded-[32px] lg:rounded-[40px] p-4 lg:p-12 flex flex-col justify-center items-center relative overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] group bg-[#110f21]/80 backdrop-blur-xl"
      >
        {/* Provably Fair Shield - Top Left */}
        <div className="absolute top-6 lg:top-10 left-6 lg:left-10 z-20 flex items-center gap-3">
           <button 
              onClick={() => setIsFairModalOpen(true)}
              className="text-white/20 hover:text-[#be30ff] transition-all duration-300 transform hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(168,85,247,0)] hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
           >
              <Shield className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
           </button>
        </div>

        <FairModal 
          open={isFairModalOpen} 
          onClose={() => setIsFairModalOpen(false)} 
          gameName="Mines"
          disableRotation={gameActive}
        />

        {/* Background atmospheric orbs - MUCH more vibrant */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#8B5CF6]/20 blur-[150px] rounded-full animate-pulse opacity-40" />
          <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-[#7C3AED]/15 blur-[150px] rounded-full animate-pulse opacity-30" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" />
        </div>
        <div className="relative z-10 w-full flex justify-center items-center">
          <div className="relative w-full flex justify-center items-center">
            {/* Win Overlay */}
            {showWin && (
              <div
                className="game-win absolute top-1/2 left-1/2 flex justify-center items-center z-10 w-full max-w-[320px] lg:max-w-[400px]"
                style={{ transform: "translate(-50%, -50%)" }}
              >
                <div className="win-inner w-full p-6 lg:p-8 rounded-2xl bg-[#0a0a0c] border-2 border-[#8B5CF6]/30 shadow-[0_0_40px_rgba(139,92,246,0.2)] flex flex-col items-center">
                  <div className="inner-multiplier flex flex-col items-center font-black text-white ml-0 mb-4">
                    <span className="text-4xl lg:text-6xl bg-gradient-to-r from-[#8B5CF6] via-[#C4B5FD] to-[#8B5CF6] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                      x{winMultiplier.toFixed(2)}
                    </span>
                    <span className="tracking-[0.3em] mt-2 opacity-80 uppercase text-[10px] lg:text-xs">YOU WON</span>
                  </div>
                  <div className="inner-payout flex items-center justify-center w-full mt-2 lg:mt-4 pt-4 lg:pt-6 border-t border-white/5">
                    <img
                      src="https://cdn.discordapp.com/attachments/1434176799683907695/1493591726428786738/New_Project_7.png?ex=69df8731&is=69de35b1&hm=86c0936c8d012515f654cf5f0a52456d05247396a951cbbdb26d58e9e32e9da0&?width=400&height=400&resize=contain"
                      alt="icon"
                      className="w-6 h-6 lg:w-8 lg:h-8 mr-2 lg:mr-3"
                    />
                    <div className="payout-value text-base font-bold text-[#bbbfd0]">
                      <span className="text-2xl lg:text-4xl font-black text-white">
                        {Math.floor(payoutAmount).toLocaleString()}
                      </span>
                      <span className="text-sm lg:text-xl opacity-60">.{payoutAmount.toFixed(2).split(".")[1]}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`game-inner grid gap-2 lg:gap-4 p-4 lg:p-10 rounded-3xl lg:rounded-[2.5rem] bg-white/[0.03] backdrop-blur-md shadow-2xl relative transition-all duration-300 ${gridSize === 3 ? 'w-[280px] lg:w-[450px]' : gridSize === 5 ? 'w-[320px] sm:w-[350px] lg:w-full lg:max-w-[650px]' : 'w-[320px] sm:w-[350px] lg:w-full lg:max-w-[850px]'}`}
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: TOTAL_TILES }).map((_, i) => {
                const wasClicked = revealedTiles.has(i);
                const isMine = mines.includes(i);
                const isShown = wasClicked || gameOver;
                const isLastRevealed = lastRevealed === i;

                return (
                  <button
                    key={i}
                    onClick={() => handleTileClick(i)}
                    className={`aspect-square w-full rounded-xl flex items-center justify-center transition-all duration-300 font-bold text-lg relative group overflow-hidden ${isShown
                      ? isMine
                        ? "bg-[#1f0a0a] border-2 border-red-600 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                        : "bg-[#1a1408] border-2 border-[#f3b239] shadow-[0_0_20px_rgba(243,178,57,0.3)]"
                      : "bg-[#16122A] hover:bg-[#8B5CF6]/20 border-2 border-white/5 hover:border-[#8B5CF6]/50 shadow-[0_4px_0_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none"
                      } ${isLastRevealed ? "ring-2 ring-white/30" : ""} ${shakeGrid && isMine && wasClicked ? "animate-bounce" : ""
                      } ${gameOver && !wasClicked ? "opacity-40 grayscale-[0.2]" : ""}`}
                    disabled={!gameActive || isShown || gameOver}
                  >
                    {!isShown && (
                      <div className="absolute inset-0 flex items-center justify-center" />
                    )}
                    {isShown && (
                      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                        {[...Array(6)].map((_, idx) => (
                          <div
                            key={idx}
                            className={`absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-sm ${["bg-yellow-400", "bg-purple-500", "bg-blue-400", "bg-pink-500", "bg-green-400", "bg-primary"][idx]}`}
                            style={{
                              "--tx": `${(Math.sin((idx * 60) * (Math.PI / 180)) * 40)}px`,
                              "--ty": `${(Math.cos((idx * 60) * (Math.PI / 180)) * 40)}px`,
                              "--tr": `${idx * 45}deg`,
                              animation: "confetti-pop 0.7s cubic-bezier(0.2, 1, 0.3, 1) both"
                            } as any}
                          />
                        ))}
                        <div 
                          className={`absolute inset-0 opacity-40 z-0 ${isMine ? "bg-red-500/30" : "bg-[#f3b239]/30"}`}
                          style={{
                            maskImage: "radial-gradient(circle, white, transparent 70%)",
                            WebkitMaskImage: "radial-gradient(circle, white, transparent 70%)",
                            animation: "spark-burst 0.6s ease-out both"
                          }}
                        />
                      </div>
                    )}
                    {isShown && isMine && (
                      <img
                        src="https://www.image2url.com/r2/default/images/1776183544026-877fb3ec-27c8-42b7-ac0f-d15c4ce0ad94.png"
                        alt="mine"
                        className="w-10 h-10 lg:w-20 lg:h-20 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10"
                        style={{
                          animation: "reveal-3d 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both"
                        }}
                      />
                    )}
                    {isShown && !isMine && (
                      <img
                        src="https://www.image2url.com/r2/default/images/1776179169294-7b83f0ec-5f53-4ae9-8558-faa13734cc69.png"
                        alt="gem"
                        className="w-10 h-10 lg:w-20 lg:h-20 drop-shadow-[0_0_15px_rgba(243,178,57,0.5)] z-10"
                        style={{
                          animation: "reveal-3d 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both"
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
