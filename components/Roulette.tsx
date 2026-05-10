"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { getStorageItem, setStorageItem } from "@/lib/storage";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const GREEN_COIN =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-1772396346258.png";
const RED_COIN =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-1-1772396348468.png";
const BLUE_COIN =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-2-1772396350321.png";

const COLORS = [
  "red",
  "blue",
  "red",
  "blue",
  "red",
  "blue",
  "red",
  "green",
  "blue",
  "red",
  "blue",
  "red",
  "blue",
  "red",
  "blue",
];

export default function Roulette() {
  const { selectedCurrency, coinsBalance, funCoinsBalance, refreshBalances } =
    useCurrency();
  const currentBalance =
    selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const [betAmount, setBetAmount] = useState<number>(0);
  const [gameState, setGameState] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [localTimer, setLocalTimer] = useState<number>(0);
  const [processedRoundId, setProcessedRoundId] = useState<string | null>(null);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUsername(getStorageItem("mm2dice_user"));
  }, []);

  // Local timer countdown
  useEffect(() => {
    if (localTimer > 0 && gameState?.status === "waiting") {
      const timer = setTimeout(() => setLocalTimer(localTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [localTimer, gameState?.status]);

  // Poll for game status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/roulette/status");
        const data = await res.json();

        if (data.status === "waiting") {
          setLocalTimer(data.timer);
          // Don't reset reel position for continuous spinning - let CSS animation handle it
        }

        setGameState(data);

        // Trigger spin if we have a roll value and haven't processed this specific round's spin yet
        if (
          (data.status === "rolling" || data.status === "ended") &&
          !isSpinning &&
          data.id !== processedRoundId &&
          data.roll_value !== undefined
        ) {
          setProcessedRoundId(data.id);
          startSpin(data.roll_value, data.bets || []);
        }
      } catch (err) {
        console.error("Failed to fetch roulette status", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [isSpinning, processedRoundId, username]);

  const startSpin = (targetRoll: number, roundBets: any[]) => {
    if (!reelRef.current) return;
    setIsSpinning(true);

    const itemWidth = 120;
    const setCount = 8;
    const containerWidth = reelRef.current.parentElement?.clientWidth || 1000;
    const centerOffset = containerWidth / 2;
    const coinCenterOffset = itemWidth / 2;
    const finalPosition =
      setCount * 15 * itemWidth +
      targetRoll * itemWidth +
      coinCenterOffset -
      centerOffset;

    // Lock polling for the duration of the spin + processing time (10 seconds total)
    setStorageItem(
      "mm2dice_balance_lock",
      (Date.now() + 10000).toString(),
    );
    setStorageItem("mm2dice_balance_ts", Date.now().toString());

    reelRef.current.style.transition =
      "transform 6s cubic-bezier(0.1, 0, 0.1, 1)";
    reelRef.current.style.transform = `translateX(-${finalPosition}px)`;

    setTimeout(() => {
      setIsSpinning(false);
      refreshBalances();

      const winningColor = COLORS[targetRoll];
      const userBets = roundBets.filter((bet) => bet.username === username);

      if (userBets.length > 0) {
        let totalWon = 0;
        let totalBet = 0;

        userBets.forEach((bet) => {
          totalBet += bet.amount;
          if (bet.outcome === winningColor) {
            const multiplier = winningColor === "green" ? 14 : 2;
            totalWon += bet.amount * multiplier;
          }
        });

        if (totalWon > 0) {
          toast.success(`You won ${totalWon.toFixed(2)} ${selectedCurrency}!`, {
            description: `Outcome was ${winningColor.toUpperCase()}`,
            duration: 5000,
          });
        } else {
          toast.error(`You lost ${totalBet.toFixed(2)} ${selectedCurrency}`, {
            description: `Outcome was ${winningColor.toUpperCase()}`,
            duration: 5000,
          });
        }
      }
    }, 7000);
  };

  const handleBet = async (outcome: "red" | "blue" | "green") => {
    if (!username) {
      toast.error("You must be logged in to bet");
      return;
    }

    if (betAmount <= 0) {
      toast.error("Enter a valid bet amount");
      return;
    }

    if (betAmount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    try {
      const res = await fetch("/api/roulette/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          amount: betAmount,
          outcome,
          currency: selectedCurrency,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Bet placed on ${outcome}!`);

        // Update local state instantly via localStorage and events
        const balanceKey =
          selectedCurrency === "coins"
            ? "mm2dice_balance"
            : "mm2dice_fun_balance";
        const oldBalance = currentBalance;
        const newBalance = data.newBalance;

        setStorageItem(balanceKey, String(newBalance));
        setStorageItem("mm2dice_balance_ts", Date.now().toString());
        // Lock polling for 10 seconds to allow the game to start without interference
        setStorageItem(
          "mm2dice_balance_lock",
          (Date.now() + 10000).toString(),
        );

        window.dispatchEvent(
          new CustomEvent("balanceAnimate", {
            detail: {
              from: oldBalance,
              to: newBalance,
              currency: selectedCurrency,
            },
          }),
        );
        window.dispatchEvent(new Event("balanceUpdate"));

        // Context state will be updated by refreshBalances below
        refreshBalances();
      } else {
        toast.error(data.error || "Failed to place bet");
      }
    } catch (err) {
      toast.error("Error placing bet");
    }
  };

  const renderReelItems = () => {
    const items = [];
    for (let i = 0; i < 180; i++) {
      const color = COLORS[i % 15];
      let img = RED_COIN;
      if (color === "blue") img = BLUE_COIN;
      if (color === "green") img = GREEN_COIN;

      items.push(
        <div
          key={i}
          className="flex-shrink-0 w-[120px] h-full flex items-center justify-center"
        >
          <img
            src={img}
            alt={color}
            className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          />
        </div>,
      );
    }
    return items;
  };

  const renderBetsForOutcome = (outcome: "red" | "green" | "blue") => {
    const outcomeBets =
      gameState?.bets?.filter((b: any) => b.outcome === outcome) || [];

    return (
      <div className="mt-4 flex flex-col items-center w-full">
        {outcomeBets.length > 0 && (
          <div className="flex -space-x-3 overflow-hidden mb-2">
            {outcomeBets.slice(0, 6).map((bet: any, idx: number) => (
              <img
                key={idx}
                className="inline-block h-14 w-14 rounded-xl ring-4 ring-zinc-900 bg-zinc-800 object-cover"
                src={
                  bet.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`
                }
                alt={bet.username}
                title={`${bet.username}: ${bet.amount} ${bet.currency}`}
              />
            ))}
            {outcomeBets.length > 6 && (
              <div className="flex items-center justify-center h-14 w-14 rounded-xl ring-4 ring-zinc-900 bg-zinc-800 text-xs font-bold text-white">
                +{outcomeBets.length - 6}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="font-sans pt-32">
      {/* Roulette Reel - Full Width */}
      <div className="relative w-full h-52 flex items-center overflow-hidden bg-zinc-950/40 border-y border-zinc-900 shadow-2xl">
        {/* Selector Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#be30ff]/80 z-20 shadow-[0_0_20px_rgba(168,85,247,0.5)] -translate-x-1/2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-white/40"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-white/40"></div>
        </div>

        <div
          ref={reelRef}
          className={`flex h-full items-center will-change-transform ${gameState?.status === "waiting" && !isSpinning ? "animate-slow-spin" : ""} ${isSpinning ? "animation-paused" : ""}`}
        >
          {renderReelItems()}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        {/* Betting Interface */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="w-full md:max-w-2xl relative bg-zinc-950/20 rounded-2xl border-2 border-zinc-900/50 hover:border-zinc-800 transition-all group/bet shadow-[0_6px_0_0_rgba(0,0,0,0.4),0_12px_24px_rgba(0,0,0,0.3)]">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover/bet:scale-110">
              <img
                src={COIN_ICONS[selectedCurrency]}
                alt="Coin"
                className="w-9 h-9 object-contain"
              />
            </div>
            <input
              type="number"
              value={betAmount || ""}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-20 bg-transparent pl-20 pr-40 outline-none transition-all text-3xl font-black text-white"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3">
              <button
                onClick={() => setBetAmount(0)}
                className="px-6 py-3 text-xs font-black bg-gradient-to-b from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white rounded-xl transition-all uppercase tracking-tighter shadow-[0_4px_0_0_#18181b,0_6px_12px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#18181b,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] border border-zinc-600/30"
              >
                Clear
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(currentBalance))}
                className="px-6 py-3 text-xs font-black bg-gradient-to-b from-[#be30ff] to-[#7e22ce] hover:from-[#c084fc] hover:to-[#be30ff] text-white rounded-xl transition-all uppercase tracking-tighter shadow-[0_4px_0_0_#5b21b6,0_6px_12px_rgba(168,85,247,0.3)] active:shadow-[0_1px_0_0_#5b21b6,0_2px_4px_rgba(168,85,247,0.3)] active:translate-y-[3px] border border-[#c084fc]/30"
              >
                Max
              </button>
            </div>
          </div>

          <button
            onClick={() => (window.location.href = "/provably-fair")}
            className="h-20 px-8 flex items-center gap-3 bg-zinc-950/20 border-2 border-zinc-900/50 hover:border-[#be30ff]/30 rounded-2xl transition-all group/fair shadow-[0_6px_0_0_rgba(0,0,0,0.4),0_12px_24px_rgba(0,0,0,0.3)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.4)] active:translate-y-[4px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#be30ff] group-hover/fair:scale-110 transition-transform"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="text-sm font-black text-zinc-400 group-hover:text-white uppercase tracking-widest">
              Provably Fair
            </span>
          </button>

          {gameState && (
            <div className="flex flex-col items-start gap-1 min-w-[180px] bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
              <span className={`text-xl font-black uppercase tracking-tighter ${gameState.status === 'rolling' ? 'text-[#be30ff] animate-pulse' : 'text-white'}`}>
                {gameState.status === "waiting" && `STARTING IN ${localTimer}S`}
                {gameState.status === "rolling" && "ROLLING..."}
                {gameState.status === "ended" && "ROUND ENDED"}
              </span>
              {gameState.hashed_server_seed && (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  <span className="opacity-50">Round Hash:</span>
                  <span
                    className="text-zinc-400 font-mono"
                    title={gameState.hashed_server_seed}
                  >
                    {gameState.hashed_server_seed.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-zinc-950/20 p-6 rounded-3xl border border-zinc-900/50 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => handleBet("red")}
              disabled={isSpinning || gameState?.status !== "waiting"}
              className="group relative min-h-[16rem] bg-red-500/5 border-2 border-red-500/10 rounded-3xl overflow-hidden hover:bg-red-500/10 hover:border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center p-6 shadow-[inset_0_0_30px_rgba(239,68,68,0.05)]"
            >
              <img
                src={RED_COIN}
                alt="Red"
                className="w-24 h-24 mb-3 group-hover:scale-110 transition-transform drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              />
              <div className="text-center">
                <span className="block font-black text-3xl text-red-500 tracking-tighter">
                  2X PAYOUT
                </span>
              </div>
              {renderBetsForOutcome("red")}
            </button>

            <button
              onClick={() => handleBet("green")}
              disabled={isSpinning || gameState?.status !== "waiting"}
              className="group relative min-h-[16rem] bg-green-500/5 border-2 border-green-500/10 rounded-3xl overflow-hidden hover:bg-green-500/10 hover:border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center p-6 shadow-[inset_0_0_30px_rgba(34,197,94,0.05)]"
            >
              <img
                src={GREEN_COIN}
                alt="Green"
                className="w-24 h-24 mb-3 group-hover:scale-110 transition-transform drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              />
              <div className="text-center">
                <span className="block font-black text-3xl text-green-500 tracking-tighter">
                  14X PAYOUT
                </span>
              </div>
              {renderBetsForOutcome("green")}
            </button>

            <button
              onClick={() => handleBet("blue")}
              disabled={isSpinning || gameState?.status !== "waiting"}
              className="group relative min-h-[16rem] bg-blue-500/5 border-2 border-blue-500/10 rounded-3xl overflow-hidden hover:bg-blue-500/10 hover:border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center p-6 shadow-[inset_0_0_30px_rgba(59,130,246,0.05)]"
            >
              <img
                src={BLUE_COIN}
                alt="Blue"
                className="w-24 h-24 mb-3 group-hover:scale-110 transition-transform drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              />
              <div className="text-center">
                <span className="block font-black text-3xl text-blue-500 tracking-tighter">
                  2X PAYOUT
                </span>
              </div>
              {renderBetsForOutcome("blue")}
            </button>
          </div>
        </div>

        {/* Recent History */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-4 bg-zinc-700 rounded-full"></div>
            <h3 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">
              Game History
            </h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {gameState?.history?.map((roll: any, i: number) => (
              <div
                key={i}
                className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform hover:-translate-y-1 cursor-default ${
                  roll.outcome === "red"
                    ? "bg-red-600/20"
                    : roll.outcome === "blue"
                      ? "bg-blue-600/20"
                      : "bg-green-600/20"
                }`}
                title={`Roll: ${roll.roll_value}`}
              >
                <img
                  src={
                    roll.outcome === "red"
                      ? RED_COIN
                      : roll.outcome === "blue"
                        ? BLUE_COIN
                        : GREEN_COIN
                  }
                  className="w-10 h-10 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  alt={roll.outcome}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
