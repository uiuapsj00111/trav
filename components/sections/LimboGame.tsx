"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { limboOutcome } from "@/lib/provablyFair";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import FairModal from "./FairModal";

export default function LimboGame() {
  const router = useRouter();
  const fair = useFair();
  const {
    isMuted,
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
  } = useCurrency();
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey =
    selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

  const [showFairModal, setShowFairModal] = useState(false);
  const [betAmount, setBetAmount] = useState("");
  const [targetMultiplier, setTargetMultiplier] = useState("2.00");
  const [result, setResult] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<
    { multiplier: number; won: boolean }[]
  >([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
    }
    return audioCtxRef.current;
  }, []);

  const playClickSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }, [getAudioCtx]);

  const rollNodesRef = useRef<{
    source: AudioBufferSourceNode;
    gain: GainNode;
  } | null>(null);

  const startRiseSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioCtx();
    // Create a rolling noise - like a drumroll / slot machine spin
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Generate rhythmic clicking noise
    const clickRate = 30; // clicks per second, will speed up
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const clickPhase = (t * clickRate) % 1;
      // Sharp transient clicks with noise
      if (clickPhase < 0.08) {
        data[i] = (Math.random() * 2 - 1) * 0.8;
      } else {
        data[i] = (Math.random() * 2 - 1) * 0.05;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(0.6, ctx.currentTime);
    source.loop = true;

    // Bandpass filter for a more mechanical rolling sound
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(2, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    rollNodesRef.current = { source, gain };
  }, [getAudioCtx]);

  const updateRiseSound = useCallback(
    (progress: number) => {
      if (rollNodesRef.current) {
        const ctx = getAudioCtx();
        // Speed up the rolling as multiplier climbs
        const rate = 0.6 + progress * 2.5;
        rollNodesRef.current.source.playbackRate.setValueAtTime(
          rate,
          ctx.currentTime,
        );
      }
    },
    [getAudioCtx],
  );

  const stopRiseSound = useCallback(() => {
    if (rollNodesRef.current) {
      const ctx = getAudioCtx();
      rollNodesRef.current.gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.15,
      );
      rollNodesRef.current.source.stop(ctx.currentTime + 0.2);
      rollNodesRef.current = null;
    }
  }, [getAudioCtx]);

  const playWinSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.08 + 0.25,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.25);
    });
  }, [getAudioCtx]);

  const playBustSound = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }, [getAudioCtx]);

  const play = async () => {
    if (!betAmount || parseFloat(betAmount) <= 0 || isPlaying || !fair.state)
      return;
    const bet = parseFloat(betAmount);
    const target = parseFloat(targetMultiplier);
    const currentBalance = balance;
    if (bet > currentBalance) {
      alert("Insufficient balance.");
      return;
    }

    setIsPlaying(true);
    playClickSound();

    // Lock balance polling
    setStorageItem("mm2dice_balance_lock", (Date.now() + 10000).toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());

    // Generate crash point using provably fair system
    const { crashPoint } = await limboOutcome(fair.state);
    fair.incrementNonce();

    // Start rising sound
    startRiseSound();

    // Animate the number going up
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = 1.0 + (crashPoint - 1.0) * easeOut;
      setResult(Math.round(current * 100) / 100);
      updateRiseSound(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setResult(crashPoint);
        stopRiseSound();
        const won = crashPoint >= target;
        setHistory((prev) =>
          [{ multiplier: crashPoint, won }, ...prev].slice(0, 20),
        );

        if (won) {
          playWinSound();
          const winnings = bet * target;
          const newBalance = currentBalance - bet + winnings;
          if (selectedCurrency === "coins") setCoinsBalance(newBalance);
          else setFunCoinsBalance(newBalance);

          setStorageItem(balanceKey, newBalance.toString());
          setStorageItem("mm2dice_balance_ts", Date.now().toString());
          // Release lock after small delay
          setTimeout(() => removeStorageItem("mm2dice_balance_lock"), 1000);
          window.dispatchEvent(
            new CustomEvent("balanceAnimate", {
              detail: { from: currentBalance, to: newBalance },
            }),
          );
          recordGameResult(bet, winnings - bet, {
            game_type: "limbo",
            payout: winnings,
            multiplier: target,
            result: "win",
            currency: selectedCurrency,
            meta: { crashPoint, targetMultiplier: target },
          });
        } else {
          playBustSound();
          const newBalance = currentBalance - bet;
          if (selectedCurrency === "coins") setCoinsBalance(newBalance);
          else setFunCoinsBalance(newBalance);

          setStorageItem(balanceKey, newBalance.toString());
          setStorageItem("mm2dice_balance_ts", Date.now().toString());
          // Release lock after small delay
          setTimeout(() => removeStorageItem("mm2dice_balance_lock"), 1000);
          window.dispatchEvent(
            new CustomEvent("balanceAnimate", {
              detail: { from: currentBalance, to: newBalance },
            }),
          );
          recordGameResult(bet, -bet, {
            game_type: "limbo",
            payout: 0,
            multiplier: target,
            result: "loss",
            currency: selectedCurrency,
            meta: { crashPoint, targetMultiplier: target },
          });
        }
        setIsPlaying(false);
      }
    };
    requestAnimationFrame(animate);
  };

  const winChance = Math.min(
    99,
    Math.round((95 / parseFloat(targetMultiplier || "2")) * 100) / 100,
  );

  return (
    <div
      className="limbo-game mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12 animate-fadeIn relative"
      style={{ maxWidth: "1600px", width: "100%", padding: "24px" }}
      draggable={false}
    >
      {/* Background atmospheric orbs - MATCHING MINES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-[#8B5CF6]/10 blur-[150px] rounded-full animate-pulse opacity-40" />
        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-[#7C3AED]/10 blur-[150px] rounded-full animate-pulse opacity-30" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute top-10 left-10 z-20 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="text-white/20 hover:text-[#be30ff] transition-all duration-300 transform hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(168,85,247,0)] hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div className="absolute top-10 right-10 z-20">
        <button
          onClick={() => setShowFairModal(true)}
          className="text-white/20 hover:text-[#be30ff] transition-all duration-300 transform hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(168,85,247,0)] hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </button>
      </div>

      <FairModal
        open={showFairModal}
        onClose={() => setShowFairModal(false)}
        gameName="Limbo"
        disableRotation={isPlaying}
      />

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10 w-full mt-16">
        {/* Controls Container - MATCHING MINES */}
        <div className="w-full lg:w-96 shrink-0 rounded-3xl p-6 flex flex-col gap-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#110f21]/80 backdrop-blur-xl">
          <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 shadow-inner transition-all hover:bg-white/[0.05]">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 block">
              Bet Amount
            </div>
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3 mb-4 group transition-all">
              <img
                src={COIN_ICONS[selectedCurrency]}
                alt="Coin"
                className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110"
              />
              <input
                type="number"
                value={betAmount}
                onChange={(e) =>
                  setBetAmount(
                    Math.max(0, parseInt(e.target.value) || 0).toString(),
                  )
                }
                placeholder="0"
                disabled={isPlaying}
                className="flex-1 bg-transparent text-white font-black text-lg outline-none border-none disabled:opacity-50 min-w-0"
              />
            </div>
            <input
              type="range"
              min="0"
              max={Math.floor(balance)}
              step="1"
              value={betAmount || "0"}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={isPlaying}
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${((parseFloat(betAmount) || 0) / balance) * 100}%, #444 ${((parseFloat(betAmount) || 0) / balance) * 100}%, #444 100%)`,
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() =>
                  setBetAmount(
                    Math.max(
                      0,
                      Math.floor(parseFloat(betAmount) / 2),
                    ).toString(),
                  )
                }
                disabled={isPlaying}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm disabled:opacity-50"
              >
                1/2
              </button>
              <button
                onClick={() =>
                  setBetAmount(Math.floor(parseFloat(betAmount) * 2).toString())
                }
                disabled={isPlaying}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm disabled:opacity-50"
              >
                2x
              </button>
              <button
                onClick={() => setBetAmount(Math.floor(balance).toString())}
                disabled={isPlaying}
                className="flex-1 px-3 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold text-sm disabled:opacity-50"
              >
                Max
              </button>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 block">
              Target Multiplier
            </div>
            <div className="flex items-center gap-3 bg-black/40 rounded-xl p-3 mb-4 group transition-all">
              <input
                type="number"
                value={targetMultiplier}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value < 1.01) {
                    setTargetMultiplier("1.01");
                  } else {
                    setTargetMultiplier(e.target.value);
                  }
                }}
                step="0.1"
                min="1.01"
                disabled={isPlaying}
                className="w-full bg-transparent text-white font-black text-lg outline-none border-none disabled:opacity-50"
              />
            </div>
            {parseFloat(targetMultiplier) < 1.5 && (
              <p className="text-red-400 text-xs mt-2">Minimum is 1.5x</p>
            )}
          </div>

          <div className="bg-white/[0.03] rounded-xl p-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Profit on Win</span>
              <span className="text-[#8B5CF6] font-black text-xl">
                {(
                  parseFloat(betAmount || "0") *
                    parseFloat(targetMultiplier || "2") -
                  parseFloat(betAmount || "0")
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={play}
            disabled={isPlaying || !betAmount}
            className="w-full py-4 rounded-xl bg-[#8B5CF6] hover:brightness-110 disabled:grayscale disabled:opacity-50 text-white font-black text-lg transition-all shadow-[0_4px_0_0_#5b21b6] active:translate-y-[2px] active:shadow-none uppercase tracking-widest relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            {isPlaying ? "Playing..." : "Play"}
          </button>
        </div>

        {/* Game Container - MATCHING MINES */}
        <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] bg-[#110f21]/80 backdrop-blur-xl rounded-[40px] p-6 lg:p-12 min-h-[500px]">
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,_rgba(139,92,246,0.1)_0%,_transparent_70%)]" />
          </div>
          
          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-12 h-fit shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              <div
                className={`text-[80px] font-black transition-all duration-300 text-center tracking-tighter ${
                  result === null
                    ? "text-white/10"
                    : result >= parseFloat(targetMultiplier)
                      ? "text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.8)]"
                      : "text-red-500/80"
                }`}
              >
                {result !== null ? `${result.toFixed(2)}x` : "0.00x"}
              </div>
              {result !== null && !isPlaying && (
                <div className="flex flex-col items-center mt-6 gap-1">
                  <span
                    className={`text-[10px] font-black tracking-[0.4em] uppercase opacity-60 ${result >= parseFloat(targetMultiplier) ? "text-[#C4B5FD]" : "text-red-400"}`}
                  >
                    {result >= parseFloat(targetMultiplier) ? "YOU WON" : "BUST"}
                  </span>
                  {result >= parseFloat(targetMultiplier) && (
                    <div className="text-3xl font-black text-white mt-1">
                      +{(parseFloat(betAmount || "0") * parseFloat(targetMultiplier || "2") - parseFloat(betAmount || "0")).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 justify-center relative z-10">
                {history.map((h, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 ${h.won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {h.multiplier.toFixed(2)}x
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
