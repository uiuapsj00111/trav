"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

type Difficulty = "Easy" | "Medium" | "Hard" | "Daredevil";
type GameStatus = "idle" | "playing" | "cashedout" | "dead";

const MULTIPLIERS: Record<Difficulty, number[]> = {
  Easy:       [1.09,1.19,1.30,1.43,1.58,1.75,1.94,2.16,2.41,2.70,3.03,3.41,3.85,4.36,4.95,5.63,6.43,7.36,8.46,9.77,11.33,13.21,15.48,18.22],
  Medium:     [1.35,1.90,2.71,3.94,5.83,8.75,13.30,20.40,31.50,49.00,76.56,120.23,189.73,300.89,479.42,768.07,1234.56,1993.83,3234.21,5268.34,8593.05,14046.23,23008.12,37837.64],
  Hard:       [1.80,3.38,6.51,12.83,25.86,53.46,113.59,248.51,558.85,1298.56,3117.57,7782.93,20288.15,55233.19,157808.8,476850.7,1525000,5200000,19000000,76000000,330000000,1600000000,9200000000,64400000000],
  Daredevil:  [3.84,16.22,76.77,413.76,2579.1,18688,157344,1540156,17673296,242124584,4000000000,80000000000,1900000000000,54000000000000,1800000000000000,70000000000000000,3200000000000000000,170000000000000000000,10000000000000000000000,700000000000000000000000,57000000000000000000000000,5200000000000000000000000000,550000000000000000000000000000,66000000000000000000000000000000],
};

const DIFFICULTY_CONFIG: Record<Difficulty, { mines: number; slots: number }> = {
  Easy:       { mines: 1, slots: 5 },
  Medium:     { mines: 2, slots: 5 },
  Hard:       { mines: 3, slots: 5 },
  Daredevil:  { mines: 4, slots: 5 },
};

const VISIBLE_LANES = 8;

interface Lane {
  isMine: boolean;
}

function buildLanes(difficulty: Difficulty): Lane[] {
  const { mines } = DIFFICULTY_CONFIG[difficulty];
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

function ManholeCovers({
  state,
  onClick,
  isActive,
}: {
  state: "hidden" | "safe" | "mine" | "passed-safe" | "passed-mine";
  multiplier: number;
  onClick?: () => void;
  isActive: boolean;
}) {
    const isRevealed = state !== "hidden" && state !== "safe" && state !== "mine" ? false : state !== "hidden";
    const isClickable = isActive && state === "hidden";

    const bgColor =
      state === "safe" ? "#22c55e" :
      state === "mine" ? "#ef4444" :
      state === "passed-safe" ? "#16a34a" :
      state === "passed-mine" ? "#991b1b" :
      "rgba(0,0,0,0.2)";

    const borderColor =
      state === "safe" ? "#4ade80" :
      state === "mine" ? "#f87171" :
      state === "passed-safe" ? "#22c55e" :
      state === "passed-mine" ? "#ef4444" :
      isClickable ? "#ffc132" : "transparent";

    return (
      <div className="flex flex-col items-center gap-2 scale-90 lg:scale-100">
        <button
          onClick={onClick}
          disabled={!isClickable}
          className="relative flex items-center justify-center transition-all duration-150 select-none group"
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: isRevealed || isClickable ? bgColor : "transparent",
            border: `2px solid ${borderColor}`,
            cursor: isClickable ? "pointer" : "default",
          }}
        >
          {isClickable && (
            <div className="absolute inset-0 rounded-full animate-pulse bg-white/5" />
          )}
        </button>
      </div>
    );
}

function Chicken({ dead, animating }: { dead?: boolean; animating?: boolean }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 70,
        height: 70,
        fontSize: 48,
        filter: dead ? "grayscale(1) opacity(0.5)" : "drop-shadow(0 4px 12px rgba(0,0,0,0.8))",
        transform: animating ? "translateY(-10px)" : "translateY(0)",
        transition: "transform 0.15s ease",
      }}
    >
      🐔
    </div>
  );
}

const GameHero = () => {
  const { selectedCurrency, setSelectedCurrency, coinsBalance, funCoinsBalance, setCoinsBalance, setFunCoinsBalance } = useCurrency();
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [betAmount, setBetAmount] = useState<string>("10.00");
  const [status, setStatus] = useState<GameStatus>("idle");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [currentLane, setCurrentLane] = useState(-1);
  const [chickAnimating, setChickAnimating] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const updateUser = () => {
      const user = getStorageItem("mm2dice_user");
      setUsername(user);
    };
    updateUser();
    window.addEventListener("userLogin", updateUser);
    return () => window.removeEventListener("userLogin", updateUser);
  }, []);

  const updateBalance = useCallback((newBal: number) => {
    if (selectedCurrency === "coins") setCoinsBalance(newBal);
    else setFunCoinsBalance(newBal);

    setStorageItem(selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance", newBal.toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());
    setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString()); // 5s lock
    window.dispatchEvent(new CustomEvent("balanceUpdate"));
  }, [selectedCurrency, username, setCoinsBalance, setFunCoinsBalance]);

  const startGame = async (mode?: "demo" | "real") => {
    if (mode === "demo") setSelectedCurrency("fun_coins");
    if (mode === "real") setSelectedCurrency("coins");

    const amount = parseFloat(betAmount);
    if (!username || amount > balance || amount < 0.01) {
      if (!username) window.dispatchEvent(new CustomEvent("openLogin"));
      return;
    }
    
    updateBalance(balance - amount);
    setLanes(buildLanes(difficulty));
    setCurrentLane(-1);
    setStatus("playing");
  };

  const hopForward = async (laneIndex: number) => {
    if (status !== "playing" || laneIndex !== currentLane + 1) return;

    setChickAnimating(true);
    setTimeout(() => setChickAnimating(false), 150);

    const lane = lanes[laneIndex];
    if (lane.isMine) {
      setCurrentLane(laneIndex);
      setStatus("dead");
      
      await recordGameResult(parseFloat(betAmount), -parseFloat(betAmount), {
        game_type: "crossy",
        payout: 0,
        currency: selectedCurrency,
        result: "loss",
        meta: { difficulty, lane: laneIndex + 1 },
      });
      return;
    }

    setCurrentLane(laneIndex);

    if (laneIndex >= 23) {
      const mult = MULTIPLIERS[difficulty][23] * 0.95;
      const payout = Math.floor(parseFloat(betAmount) * mult);
      setStatus("cashedout");
      updateBalance(balance + payout);

      await recordGameResult(parseFloat(betAmount), payout - parseFloat(betAmount), {
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
    const mult = MULTIPLIERS[difficulty][currentLane] * 0.95;
    const payout = Math.floor(parseFloat(betAmount) * mult);
    setStatus("cashedout");
    updateBalance(balance + payout);

    await recordGameResult(parseFloat(betAmount), payout - parseFloat(betAmount), {
      game_type: "crossy",
      payout: payout,
      currency: selectedCurrency,
      result: "win",
      meta: { difficulty, lane: currentLane + 1 },
    });
  };

  const windowStart = Math.max(0, Math.min(currentLane - 1, 24 - VISIBLE_LANES));
  const visibleStart = status === "idle" ? 0 : windowStart;

  return (
    <section className="w-full relative">
      <div className={`relative bg-[#15192c] rounded-lg overflow-hidden border border-[#232a42] shadow-premium transition-all duration-500`}>
        
        {/* Game Viewport Area */}
        <div className="relative aspect-[16/9] w-full bg-[#0b0e18]">
          <Image
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/45aaddd3-e6a1-4ce6-907d-c3ec597d7573-mission-uncrossable-com/assets/images/mission-uncrossable-roobet-1.gif"
            alt="Background"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-[#0b0e18]/80 backdrop-blur-[1px] z-0"></div>
          
          {status === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center gap-4 z-40 bg-black/10 transition-all duration-300">
              <button onClick={() => startGame("demo")} className="px-10 py-4 rounded-lg font-bold text-white bg-gradient-to-b from-[#8e6aff] to-[#7e57ff] hover:opacity-90 transition-opacity shadow-lg text-[14px]">Play Demo</button>
              <button onClick={() => startGame("real")} className="px-10 py-4 rounded-lg font-bold text-white bg-gradient-to-b from-[#f13f4b] to-[#d32f2f] hover:opacity-90 transition-opacity shadow-lg text-[14px]">Play Now!</button>
            </div>
          )}

          <div className="absolute inset-4 border-2 border-[#ffc132]/20 rounded-xl pointer-events-none z-30"></div>

          <div className="absolute inset-0 flex z-10">
            <div className="absolute inset-0 flex px-[4%]">
              {Array.from({ length: VISIBLE_LANES }).map((_, vi) => {
                const laneIndex = visibleStart + vi;
                if (laneIndex >= 24) return <div key={vi} className="flex-1" />;
                const isPassed = laneIndex < currentLane;
                const isCurrent = laneIndex === currentLane;
                const isNext = laneIndex === currentLane + 1 && status === "playing";
                let state: "hidden" | "safe" | "mine" | "passed-safe" | "passed-mine" = "hidden";
                if (isCurrent) state = status === "dead" ? "mine" : "safe";
                else if (isPassed) state = lanes[laneIndex].isMine ? "passed-mine" : "passed-safe";
                return (
                  <div key={laneIndex} className="flex-1 flex items-center justify-center relative">
                    <ManholeCovers state={state} multiplier={MULTIPLIERS[difficulty][laneIndex] * 0.95} isActive={isNext} onClick={() => hopForward(laneIndex)} />
                  </div>
                );
              })}
            </div>

            {status !== "idle" && (
              <div className="absolute z-20 pointer-events-none transition-all duration-200" style={{ left: (() => { if (currentLane < 0) return "10%"; const laneVi = currentLane - visibleStart; const laneWidth = (100 - 8) / VISIBLE_LANES; return `calc(4% + ${ (laneVi + 0.5) * laneWidth }%)`; })(), top: "50%", transform: "translate(-50%, -50%)" }}>
                <Chicken dead={status === "dead"} animating={chickAnimating} />
              </div>
            )}
          </div>
          
          {status === "dead" && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-md">
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <p className="text-red-500 font-black text-6xl md:text-8xl mb-4 drop-shadow-lg">WASTED</p>
                <button onClick={() => setStatus("idle")} className="px-8 py-3 bg-[#ffc132] text-black font-black rounded-lg hover:scale-105 transition-transform">PLAY AGAIN</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 lg:p-6 bg-[#15192c] border-t border-[#232a42]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-4">
              <div className="flex items-center bg-[#0d1121] border border-[#232a42] rounded-md overflow-hidden h-[44px]">
                <div className="flex items-center px-3 border-r border-[#232a42]"><div className="w-5 h-5 rounded-full bg-[#ffc132] flex items-center justify-center text-[11px] text-[#0b0e18] font-black">$</div></div>
                <input type="text" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} disabled={status === "playing"} className="bg-transparent border-none focus:ring-0 text-white font-bold flex-1 px-4 outline-none text-[14px]" />
                <div className="flex h-full border-l border-[#232a42]">
                  <button onClick={() => setBetAmount((prev) => (parseFloat(prev) / 2).toFixed(2))} className="px-3 hover:bg-[#1c223a] text-[11px] font-bold text-[#9299a1]">1/2</button>
                  <button onClick={() => setBetAmount((prev) => (parseFloat(prev) * 2).toFixed(2))} className="px-3 border-l border-r border-[#232a42] hover:bg-[#1c223a] text-[11px] font-bold text-[#9299a1]">2x</button>
                  <button onClick={() => setBetAmount(balance.toFixed(2))} className="px-3 hover:bg-[#1c223a] text-[11px] font-bold text-[#9299a1]">Max</button>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="flex bg-[#0d1121] border border-[#232a42] rounded-md h-[44px] p-1 gap-1">
                {(["Easy", "Medium", "Hard", "Daredevil"] as Difficulty[]).map((diff) => (
                  <button key={diff} onClick={() => setDifficulty(diff)} disabled={status === "playing"} className={`flex-1 rounded-md text-[12px] font-bold transition-all ${difficulty === diff ? "bg-gradient-to-b from-[#8e6aff] to-[#7e57ff] text-white shadow-md" : "text-[#9299a1] hover:text-white"}`}>{diff}</button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3">
              {status === "playing" && currentLane >= 0 ? (
                <button onClick={cashOut} className="w-full h-[44px] bg-[#22c55e] hover:bg-[#16a34a] rounded-md text-[14px] font-bold text-white shadow-lg transition-all active:scale-95">CASH OUT</button>
              ) : (
                <button onClick={() => status === "idle" ? startGame() : setStatus("idle")} className="w-full h-[44px] bg-gradient-to-b from-[#ffc132] to-[#be30ff] rounded-md text-[14px] font-bold text-[#0b0e18] shadow-lg transition-all hover:opacity-90 active:scale-95">{status === "idle" ? "START GAME" : "PLAY AGAIN"}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameHero;
