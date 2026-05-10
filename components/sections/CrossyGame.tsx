"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrency, COIN_ICONS } from "@/contexts/CurrencyContext";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

type Difficulty = "Easy" | "Medium" | "Hard" | "Daredevil";
type GameStatus = "idle" | "playing" | "cashedout" | "dead";

// Exact Roobet multipliers per lane (1–24) per difficulty
const MULTIPLIERS: Record<Difficulty, number[]> = {
  Easy:       [1.09,1.19,1.30,1.43,1.58,1.75,1.94,2.16,2.41,2.70,3.03,3.41,3.85,4.36,4.95,5.63,6.43,7.36,8.46,9.77,11.33,13.21,15.48,18.22],
  Medium:     [1.35,1.90,2.71,3.94,5.83,8.75,13.30,20.40,31.50,49.00,76.56,120.23,189.73,300.89,479.42,768.07,1234.56,1993.83,3234.21,5268.34,8593.05,14046.23,23008.12,37837.64],
  Hard:       [1.80,3.38,6.51,12.83,25.86,53.46,113.59,248.51,558.85,1298.56,3117.57,7782.93,20288.15,55233.19,157808.8,476850.7,1525000,5200000,19000000,76000000,330000000,1600000000,9200000000,64400000000],
  Daredevil:  [3.84,16.22,76.77,413.76,2579.1,18688,157344,1540156,17673296,242124584,4000000000,80000000000,1900000000000,54000000000000,1800000000000000,70000000000000000,3200000000000000000,170000000000000000000,10000000000000000000000,700000000000000000000000,57000000000000000000000000,5200000000000000000000000000,550000000000000000000000000000,66000000000000000000000000000000],
};

// mines per lane slot (out of total slots)
const DIFFICULTY_CONFIG: Record<Difficulty, { mines: number; slots: number }> = {
  Easy:       { mines: 1, slots: 5 },
  Medium:     { mines: 2, slots: 5 },
  Hard:       { mines: 3, slots: 5 },
  Daredevil:  { mines: 4, slots: 5 },
};

interface Lane {
  isMine: boolean; // whether this lane has a car/mine
}

function buildLanes(difficulty: Difficulty): Lane[] {
  const { mines } = DIFFICULTY_CONFIG[difficulty];
  // For 24 lanes, pre-determine which are mines using the mine probability
  // Each lane independently has (mines/5) chance of being a mine
  const mineProb = mines / 5;
  return Array.from({ length: 24 }, () => ({
    isMine: Math.random() < mineProb,
  }));
}

function formatMult(m: number): string {
  if (m >= 1_000_000_000) return `${(m / 1_000_000_000).toFixed(1)}B×`;
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)}M×`;
  if (m >= 1_000) return `${(m / 1_000).toFixed(1)}K×`;
  return `${m.toFixed(2)}×`;
}

// SVG Manhole cover component
function ManholeCovers({
  state,
  multiplier,
  onClick,
  isActive,
  laneNum,
}: {
  state: "hidden" | "safe" | "mine" | "passed-safe" | "passed-mine";
  multiplier: number;
  onClick?: () => void;
  isActive: boolean;
  laneNum: number;
}) {
  const isClickable = isActive && state === "hidden";

  const bgColor =
    state === "safe" ? "#22c55e" :
    state === "mine" ? "#ef4444" :
    state === "passed-safe" ? "#16a34a" :
    state === "passed-mine" ? "#991b1b" :
    "#2d3a5a";

  const borderColor =
    state === "safe" ? "#4ade80" :
    state === "mine" ? "#f87171" :
    state === "passed-safe" ? "#22c55e" :
    state === "passed-mine" ? "#ef4444" :
    isClickable ? "#be30ff" : "#3d4f6e";

  const glowColor =
    isClickable ? "rgba(249,115,22,0.5)" :
    state === "safe" ? "rgba(34,197,94,0.6)" :
    state === "mine" ? "rgba(239,68,68,0.6)" : "none";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        disabled={!isClickable}
        className="relative flex items-center justify-center transition-all duration-150 select-none group"
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 32%, ${bgColor}cc, ${bgColor})`,
          border: `2.5px solid ${borderColor}`,
          boxShadow: glowColor !== "none"
            ? `0 6px 0 #0f172a, 0 0 20px ${glowColor}, inset 0 2px 0 rgba(255,255,255,0.15)`
            : `0 4px 0 #0f172a, inset 0 1px 0 rgba(255,255,255,0.08)`,
          cursor: isClickable ? "pointer" : "default",
          transform: isClickable ? "translateY(0)" : "translateY(0)",
        }}
      >
        {/* Grate SVG */}
        <svg
          width="62" height="62" viewBox="0 0 62 62"
          className="absolute"
          style={{ opacity: state === "hidden" || state === "passed-safe" || state === "passed-mine" ? 0.35 : 0.15 }}
        >
          <circle cx="31" cy="31" r="28" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="31" cy="31" r="20" stroke="white" strokeWidth="1" fill="none" />
          <circle cx="31" cy="31" r="12" stroke="white" strokeWidth="1" fill="none" />
          <circle cx="31" cy="31" r="5" stroke="white" strokeWidth="1" fill="none" />
          <line x1="3" y1="31" x2="59" y2="31" stroke="white" strokeWidth="1" />
          <line x1="31" y1="3" x2="31" y2="59" stroke="white" strokeWidth="1" />
          <line x1="11" y1="11" x2="51" y2="51" stroke="white" strokeWidth="0.8" />
          <line x1="51" y1="11" x2="11" y2="51" stroke="white" strokeWidth="0.8" />
        </svg>

        {/* State icons */}
        {state === "safe" && (
          <span className="relative z-10 text-3xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>🐔</span>
        )}
        {state === "mine" && (
          <span className="relative z-10 text-3xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>💥</span>
        )}
        {state === "passed-safe" && (
          <span className="relative z-10 text-2xl opacity-70">✓</span>
        )}
        {state === "passed-mine" && (
          <span className="relative z-10 text-xl opacity-50">💣</span>
        )}

        {/* Hover pulse for active */}
        {isClickable && (
          <div
            className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)" }}
          />
        )}
      </button>

      {/* Multiplier label under the manhole */}
      <div
        className="text-xs font-black px-2 py-0.5 rounded-full"
        style={{
          color:
            state === "safe" || state === "passed-safe" ? "#4ade80" :
            state === "mine" || state === "passed-mine" ? "#f87171" :
            isActive ? "#fbbf24" : "#94a3b8",
          background: "rgba(0,0,0,0.4)",
          fontSize: 11,
          letterSpacing: "0.02em",
        }}
      >
        {formatMult(multiplier)}
      </div>
    </div>
  );
}

// Chicken sprite
function Chicken({ dead, animating }: { dead?: boolean; animating?: boolean }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 70,
        height: 70,
        fontSize: 44,
        filter: dead
          ? "grayscale(1) opacity(0.4)"
          : "drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
        transform: animating ? "translateY(-6px)" : "translateY(0)",
        transition: "transform 0.15s ease",
      }}
    >
      🐔
    </div>
  );
}

const VISIBLE_LANES = 8;

export default function CrossyGame() {
  const { selectedCurrency, setSelectedCurrency, coinsBalance, funCoinsBalance, setCoinsBalance, setFunCoinsBalance } = useCurrency();
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
  const COIN_IMG = COIN_ICONS[selectedCurrency];

  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [betAmount, setBetAmount] = useState(10);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [currentLane, setCurrentLane] = useState(-1); // -1 = on sidewalk
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [chickAnimating, setChickAnimating] = useState(false);

  useEffect(() => {
    const updateUser = () => {
      const user = getStorageItem("mm2dice_user");
      const id = getStorageItem("mm2dice_user_id");
      setUsername(user);
      setUserId(id);
    };
    updateUser();
    window.addEventListener("userLogin", updateUser);
    return () => window.removeEventListener("userLogin", updateUser);
  }, []);

  const updateBalance = useCallback((newBal: number) => {
    if (selectedCurrency === "coins") setCoinsBalance(newBal);
    else setFunCoinsBalance(newBal);

    setStorageItem(balanceKey, newBal.toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());
    setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString()); // 5s lock
    window.dispatchEvent(new CustomEvent("balanceUpdate"));
  }, [selectedCurrency, username, setCoinsBalance, setFunCoinsBalance, balanceKey]);

  const startGame = async () => {
    if (!username || betAmount > balance || betAmount < 1) {
      if (!username) window.dispatchEvent(new CustomEvent("openLogin"));
      else if (betAmount > balance) alert("Insufficient balance.");
      return;
    }
    const newBal = balance - betAmount;
    updateBalance(newBal);
    setLanes(buildLanes(difficulty));
    setCurrentLane(-1);
    setResultMsg(null);
    setStatus("playing");
  };

  const hopForward = async (laneIndex: number) => {
    if (status !== "playing") return;
    if (laneIndex !== currentLane + 1) return; // must hop one at a time

    const lane = lanes[laneIndex];

    // Animate chicken hop
    setChickAnimating(true);
    setTimeout(() => setChickAnimating(false), 150);

    if (lane.isMine) {
      setCurrentLane(laneIndex);
      setStatus("dead");
      setResultMsg(`Hit a car on lane ${laneIndex + 1}! Lost ${betAmount.toLocaleString()} ${selectedCurrency === 'coins' ? 'Coins' : 'Fun Coins'}`);
      
      await recordGameResult(betAmount, -betAmount, {
        game_type: "crossy",
        payout: 0,
        currency: selectedCurrency,
        result: "loss",
        meta: { difficulty, lane: laneIndex + 1 },
      });
      return;
    }

    const nextLane = laneIndex;
    setCurrentLane(nextLane);

    if (nextLane >= 23) {
      // Crossed all 24 lanes
      const mult = MULTIPLIERS[difficulty][23] * 0.9;
      const payout = Math.floor(betAmount * mult);
      setStatus("cashedout");
      setResultMsg(`Crossed all lanes! Won ${payout.toLocaleString()} ${selectedCurrency === 'coins' ? 'Coins' : 'Fun Coins'} (${formatMult(mult)})`);
      
      const finalBal = balance + payout; // Since we already deducted betAmount at start
      updateBalance(finalBal);

      await recordGameResult(betAmount, payout - betAmount, {
        game_type: "crossy",
        payout: payout,
        currency: selectedCurrency,
        result: "win",
        meta: { difficulty, lane: 24 },
      });
    }
  };

  const cashOut = async () => {
    if (status !== "playing" || currentLane < 0) return;
    const mult = MULTIPLIERS[difficulty][currentLane] * 0.9;
    const payout = Math.floor(betAmount * mult);
    setStatus("cashedout");
    setResultMsg(`Cashed out at lane ${currentLane + 1}! Won ${payout.toLocaleString()} ${selectedCurrency === 'coins' ? 'Coins' : 'Fun Coins'}`);
    
    const finalBal = balance + payout;
    updateBalance(finalBal);

    await recordGameResult(betAmount, payout - betAmount, {
      game_type: "crossy",
      payout: payout,
      currency: selectedCurrency,
      result: "win",
      meta: { difficulty, lane: currentLane + 1 },
    });
  };

  const resetGame = () => {
    setStatus("idle");
    setLanes([]);
    setCurrentLane(-1);
    setResultMsg(null);
  };

  const currentMult = currentLane >= 0 ? MULTIPLIERS[difficulty][currentLane] * 0.9 : null;
  const currentPayout = currentMult ? Math.min(Math.floor(betAmount * currentMult), 1_000_000) : 0;

  // Sliding window: show 8 lanes, keep current lane roughly in center-left
  const windowStart = Math.max(0, Math.min(currentLane - 1, 24 - VISIBLE_LANES));
  const visibleStart = status === "idle" ? 0 : windowStart;

  return (
    <div className="flex flex-col lg:flex-row w-full" style={{ minHeight: 540, background: "#111827" }}>

      {/* ── LEFT CONTROL PANEL ── */}
      <div
        className="flex-shrink-0 flex flex-col gap-4 p-5 w-full lg:w-[230px]"
        style={{
          background: "linear-gradient(180deg, #1a2235 0%, #131825 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Title */}
        <div>
          <p className="text-white font-black text-sm tracking-wide">MISSION UNCROSSABLE</p>
          <p className="text-slate-500 text-xs mt-0.5">Cross the road — cash out or die</p>
        </div>

          {/* Bet Amount */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Bet Amount</label>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <img src={COIN_IMG} alt="" className="w-4 h-4" />
              <input
                type="number" min={1} value={betAmount}
                onChange={e => setBetAmount(Math.max(1, Number(e.target.value)))}
                disabled={status === "playing"}
                className="flex-1 bg-transparent text-white text-sm font-bold outline-none w-0"
              />
            </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {([["½", 0.5], ["2×", 2], ["Max", "max"]] as [string, number | "max"][]).map(([label, val]) => (
              <button
                key={label}
                onClick={() => {
                  if (val === "max") setBetAmount(balance);
                  else setBetAmount(b => Math.max(1, Math.floor(b * val)));
                }}
                disabled={status === "playing"}
                className="text-xs font-bold py-1.5 rounded-lg transition disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Difficulty</label>
          <div className="flex flex-col gap-1.5">
            {(["Easy", "Medium", "Hard", "Daredevil"] as Difficulty[]).map(d => {
              const colors: Record<Difficulty, string> = {
                Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444", Daredevil: "#be30ff",
              };
              const riskLabel: Record<Difficulty, string> = {
                Easy: "1 mine/5", Medium: "2 mines/5", Hard: "3 mines/5", Daredevil: "4 mines/5",
              };
              const active = difficulty === d;
              return (
                <button
                  key={d} onClick={() => setDifficulty(d)} disabled={status === "playing"}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all text-left disabled:opacity-40 flex items-center justify-between"
                  style={{
                    background: active ? `${colors[d]}1a` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? colors[d] + "66" : "rgba(255,255,255,0.07)"}`,
                    color: active ? colors[d] : "#4b5563",
                  }}
                >
                  <span>{d}</span>
                  <span className="text-[10px] opacity-60">{riskLabel[d]}</span>
                </button>
              );
            })}
          </div>
        </div>

          {/* Live Multiplier */}
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Current Multiplier</p>
            <p className="text-3xl font-black" style={{ color: "#be30ff" }}>
              {currentMult ? formatMult(currentMult) : "1.00×"}
            </p>
            {currentPayout > 0 && (
              <p className="text-xs text-green-400 font-semibold mt-1 flex items-center justify-center gap-1">
                <img src={COIN_IMG} alt="" className="w-3.5 h-3.5" /> {currentPayout.toLocaleString()}
              </p>
            )}
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 text-xs">Balance</span>
            <span className="font-bold text-amber-300 text-sm flex items-center gap-1">
              <img src={COIN_IMG} alt="" className="w-3.5 h-3.5" /> {balance.toLocaleString()}
            </span>
          </div>


        {/* Result message */}
        {resultMsg && (
          <div
            className={`text-center text-xs font-bold py-2 px-2 rounded-xl ${
              status === "dead"
                ? "text-red-400 bg-red-950/40 border border-red-800/30"
                : "text-green-400 bg-green-950/40 border border-green-800/30"
            }`}
          >
            {resultMsg}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          {status === "playing" && currentLane >= 0 && (
              <button
                onClick={cashOut}
                className="w-full py-3 rounded-xl font-extrabold text-sm text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #15803d)",
                  boxShadow: "0 4px 0 #14532d",
                }}
              >
                Cash Out {formatMult(MULTIPLIERS[difficulty][currentLane] * 0.9)}
              </button>
          )}
          {status !== "playing" && (
            <button
              onClick={status === "idle" ? startGame : resetGame}
              disabled={!userId || (status === "idle" && (betAmount > balance || betAmount < 1))}
              className="w-full py-3 rounded-xl font-extrabold text-sm text-white disabled:opacity-40 transition-all"
              style={{
                background: "linear-gradient(135deg, #be30ff, #7e22ce)",
                boxShadow: "0 4px 0 #7c2d12",
              }}
            >
              {status === "idle" ? "Place Bet" : "Play Again"}
            </button>
          )}
        </div>
      </div>

      {/* ── GAME AREA ── */}
      <div className="flex-1 relative overflow-hidden flex flex-row" style={{ minHeight: 540 }}>

        {/* ── SIDEWALK (left strip) ── */}
        <div
          className="relative flex-shrink-0 flex flex-col overflow-hidden"
          style={{
            width: 110,
            background: "linear-gradient(180deg, #2d5a3d 0%, #1e4029 50%, #2d5a3d 100%)",
            borderRight: "4px solid #374151",
          }}
        >
          {/* Grass texture */}
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 30% 20%, #3d7a52 4px, transparent 4px), radial-gradient(circle at 70% 60%, #2d6040 3px, transparent 3px), radial-gradient(circle at 20% 75%, #367048 3px, transparent 3px), radial-gradient(circle at 80% 30%, #3d7a52 2px, transparent 2px)",
            backgroundSize: "40px 40px",
            opacity: 0.6,
          }} />

          {/* Tree/bush decorations */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-3xl" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))" }}>🌳</div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-3xl" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))" }}>🌲</div>

          {/* Stone/concrete path in the middle */}
          <div
            className="absolute left-2 right-2"
            style={{
              top: "35%",
              bottom: "35%",
              background: "linear-gradient(180deg, #6b7280, #4b5563)",
              borderRadius: 6,
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            {/* Stone cracks */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 1, background: "rgba(0,0,0,0.25)", marginTop: i === 0 ? 8 : 12 }} />
            ))}
          </div>

          {/* Fire hydrant at bottom */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xl">🚒</div>
        </div>

        {/* ── ROAD ── */}
        <div
          className="flex-1 relative"
          style={{
            background: "linear-gradient(180deg, #1e2a45 0%, #192038 50%, #1e2a45 100%)",
          }}
        >
          {/* Road surface texture / horizontal stripes */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 179px, rgba(255,255,255,0.015) 179px, rgba(255,255,255,0.015) 181px)",
          }} />

          {/* Vertical dashed lane dividers */}
          <div className="absolute inset-0 pointer-events-none flex">
            {Array.from({ length: VISIBLE_LANES - 1 }).map((_, i) => (
              <div key={i} className="flex-1" style={{ borderRight: "2px dashed rgba(255,255,255,0.13)" }} />
            ))}
            <div className="flex-1" />
          </div>

          {/* ── LANES ── */}
          {status === "idle" ? (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/30 backdrop-blur-[2px]">
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    if (selectedCurrency !== "fun_coins") {
                      setSelectedCurrency("fun_coins");
                    }
                    startGame();
                  }}
                  className="px-8 py-3 rounded-xl font-black text-white text-lg transition-all hover:scale-105 active:scale-95 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #a78bfa, #7c3aed)", boxShadow: "0 6px 0 #5b21b6" }}
                >
                  Play Demo
                </button>
                <button 
                  onClick={() => {
                    if (selectedCurrency !== "coins") {
                      setSelectedCurrency("coins");
                    }
                    startGame();
                  }}
                  className="px-8 py-3 rounded-xl font-black text-white text-lg transition-all hover:scale-105 active:scale-95 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #f87171, #dc2626)", boxShadow: "0 6px 0 #991b1b" }}
                >
                  Play Now!
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex">
              {Array.from({ length: VISIBLE_LANES }).map((_, vi) => {
                const laneIndex = visibleStart + vi;
                if (laneIndex >= 24) return <div key={vi} className="flex-1" />;

                const lane = lanes[laneIndex];
                const isPassed = laneIndex < currentLane;
                const isCurrent = laneIndex === currentLane;
                const isNext = laneIndex === currentLane + 1 && status === "playing";
                const mult = MULTIPLIERS[difficulty][laneIndex];

                let state: "hidden" | "safe" | "mine" | "passed-safe" | "passed-mine" = "hidden";
                if (isCurrent) {
                  state = status === "dead" ? "mine" : "safe";
                } else if (isPassed) {
                  state = lane.isMine ? "passed-mine" : "passed-safe";
                }

                return (
                  <div
                    key={laneIndex}
                    className="flex-1 flex flex-col items-center justify-center relative"
                    style={{
                      background: isNext
                        ? "rgba(249,115,22,0.05)"
                        : isCurrent && status !== "dead"
                        ? "rgba(34,197,94,0.05)"
                        : "transparent",
                    }}
                  >
                    {/* Active lane top indicator */}
                    {isNext && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)" }}
                      />
                    )}

                    <ManholeCovers
                      state={state}
                      multiplier={mult * 0.9}
                      isActive={isNext}
                      laneNum={laneIndex + 1}
                      onClick={() => hopForward(laneIndex)}
                    />

                    {/* Lane number */}
                    <div
                      className="absolute bottom-3 text-[10px] font-bold"
                      style={{
                        color: isCurrent ? "#4ade80" : isNext ? "#fbbf24" : "#374151",
                      }}
                    >
                      {laneIndex + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress bar */}
          {status === "playing" && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${((currentLane + 1) / 24) * 100}%`,
                  background: "linear-gradient(90deg, #22c55e, #be30ff)",
                }}
              />
            </div>
          )}

          {/* Dead overlay */}
          {status === "dead" && (
            <div
              className="absolute inset-0 flex items-center justify-center z-30"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-center">
                <div className="text-7xl mb-3">💥</div>
                <p className="text-red-400 font-black text-3xl tracking-wide">SQUASHED!</p>
                <p className="text-slate-400 text-sm mt-2">You got hit on lane {currentLane + 1}</p>
                <p className="text-red-300 text-sm mt-1 font-semibold">Lost {betAmount.toLocaleString()} coins</p>
              </div>
            </div>
          )}

          {/* Cash out overlay */}
          {status === "cashedout" && (
            <div
              className="absolute inset-0 flex items-center justify-center z-30"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-center">
                <div className="text-7xl mb-3">🏆</div>
                <p className="text-green-400 font-black text-3xl tracking-wide">CASHED OUT!</p>
                <p className="text-slate-300 text-sm mt-2">{resultMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── CHICKEN (floating over sidewalk/road boundary) ── */}
        {status !== "idle" && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-200"
            style={{
              // Position chicken horizontally based on currentLane
              left: (() => {
                if (currentLane < 0) return 75; // on sidewalk
                const laneVi = currentLane - visibleStart;
                const laneWidth = 1 / VISIBLE_LANES;
                // road starts at 110px (sidewalk)
                const roadWidthApprox = `calc((100% - 110px) * ${(laneVi + 0.5) * laneWidth} + 110px)`;
                return roadWidthApprox;
              })(),
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Chicken dead={status === "dead"} animating={chickAnimating} />
          </div>
        )}
      </div>
    </div>
  );
}
