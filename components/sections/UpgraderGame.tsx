"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { mm2Items } from "@/lib/mm2Items";
import { casesOutcome } from "@/lib/provablyFair";
import { recordGameResult } from "@/lib/recordGame";
import { motion, MotionValue, useMotionValue } from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { Shield, Target, Swords, Zap, Rocket, ChevronDown, Plus, LayoutGrid, Gamepad2, Trophy, Bell, Triangle } from "lucide-react";
import FairModal from "./FairModal";

const CIRC = 2 * Math.PI * 45;

interface UpgradeItem {
  id: number;
  name: string;
  value: number;
  image: string;
  rarity: string;
  type?: string;
  slug?: string;
}

const MULTIPLIER_PRESETS = [1.5, 2, 5, 10, 25, 50, 100];

const RARITY_COLORS: Record<string, string> = {
  common: "#b0c3d9",
  uncommon: "#5e98d9",
  rare: "#4b69ff",
  legendary: "#d32ce6",
  godly: "#9a47ff",
  chroma: "#ff4d4d",
  ancient: "#eb4b4b",
  unique: "#ffd700",
  vintage: "#8b4513",
  halloween: "#be30ff",
};

function getRarityColor(rarity: string) {
  return RARITY_COLORS[rarity?.toLowerCase()] ?? "#8a7560";
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// ── Persistent AudioContext (created once on first gesture) ──────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}

function playSound(type: "click" | "spin" | "tick" | "win" | "lose") {
  try {
    const ctx = getAudioCtx();
    const master = ctx.createGain();
    master.connect(ctx.destination);

    if (type === "click") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(master);
      o.type = "sine";
      o.frequency.setValueAtTime(400, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } else if (type === "spin") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(master);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(80, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } else if (type === "tick") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(master);
      o.type = "square";
      o.frequency.setValueAtTime(600, ctx.currentTime);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      o.start();
      o.stop(ctx.currentTime + 0.03);
    } else if (type === "win") {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(master);
        o.type = "sine";
        o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t);
        o.stop(t + 0.4);
      });
    } else if (type === "lose") {
      const notes = [350, 270, 190];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(master);
        o.type = "sawtooth";
        o.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        o.start(t);
        o.stop(t + 0.45);
      });
    }
  } catch {}
}

// ── Sub-components for Optimization ──────────────────────────────────────────

const ControlsPanel = React.memo(
  ({
    betInput,
    setBetInput,
    multiplier,
    setMultiplier,
    spinning,
    selectedCurrency,
  }: {
    betInput: string;
    setBetInput: (val: string) => void;
    multiplier: number;
    setMultiplier: (val: number) => void;
    spinning: boolean;
    selectedCurrency: "coins" | "fun_coins";
  }) => {
    const multipliers = [1.5, 2, 5, 10, 25];

    return (
      <div
        className="rounded-2xl p-6 flex flex-col w-full max-w-[360px] gap-6 backdrop-blur-md border-none"
        style={{
          background: "rgba(18, 17, 29, 0.4)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Bet Amount */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#7b7b8f]">
            Bet amount
          </label>
          <div className="relative flex items-center bg-[#0d0b1a]/60 rounded-xl px-4 py-2 mt-1">
            <div className="flex items-center gap-3">
              <img
                src={COIN_ICONS[selectedCurrency]}
                alt="coin"
                className="w-5 h-5 rounded-full"
              />
              <input
                type="text"
                value={betInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setBetInput(val);
                }}
                className="bg-transparent text-white font-black text-lg w-24 focus:outline-none placeholder-white/10"
                placeholder="0"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <motion.button
                whileHover={{ background: "rgba(168, 85, 247, 0.2)", scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBetInput(String(Math.max(0, (parseFloat(betInput) || 0) / 2)))}
                className="px-3 py-2 bg-[#be30ff]/10 rounded-lg text-xs font-black text-[#be30ff] transition-all uppercase tracking-wider"
              >
                1/2
              </motion.button>
              <motion.button
                whileHover={{ background: "rgba(168, 85, 247, 0.2)", scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBetInput(String((parseFloat(betInput) || 0) * 2))}
                className="px-3 py-2 bg-[#be30ff]/10 rounded-lg text-xs font-black text-[#be30ff] transition-all uppercase tracking-wider"
              >
                2x
              </motion.button>
              <motion.button
                whileHover={{ background: "rgba(168, 85, 247, 0.2)", scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setBetInput(balance.toString())}
                className="px-3 py-2 bg-[#be30ff]/10 rounded-lg text-xs font-black text-[#be30ff] transition-all uppercase tracking-wider"
              >
                Max
              </motion.button>
            </div>
          </div>
        </div>

        {/* Choose Multiplier */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#7b7b8f]">
            Choose multiplier
          </label>
          <div className="flex bg-[#0d0b1a]/60 p-1.5 rounded-xl gap-1 mt-1">
            {multipliers.map((m) => (
              <button
                key={m}
                onClick={() => setMultiplier(m)}
                className={`flex-1 py-3 rounded-lg text-[13px] font-black transition-all uppercase tracking-wider ${
                  multiplier === m
                    ? "bg-[#be30ff] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    : "text-white/20 hover:text-white/40 hover:bg-white/5"
                }`}
              >
                {m}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
);

ControlsPanel.displayName = "ControlsPanel";

const TargetPanel = React.memo(
  ({
    selectedItems,
    betAmount,
    totalSelectedValue,
    multiplier,
    selectedCurrency,
    onShowFair,
  }: {
    selectedItems: UpgradeItem[];
    betAmount: number;
    totalSelectedValue: number;
    multiplier: number;
    selectedCurrency: "coins" | "fun_coins";
    onShowFair: () => void;
  }) => (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col w-full max-w-[300px] lg:w-[300px] shrink-0 backdrop-blur-md border-none"
      style={{
        background: "rgba(18, 17, 29, 0.4)",
        height: 400,
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      }}
    >
      <button 
        onClick={onShowFair}
        className="absolute top-4 left-4 text-[#be30ff]/40 hover:text-[#be30ff] transition-all z-10"
        title="Provably Fair"
      >
        <Shield size={16} strokeWidth={2.5} />
      </button>

      <div
        className="size-full rounded-xl pt-4 px-4 pb-4 flex flex-col items-center justify-between"
        style={{ height: 400 }}
      >
        <div className="flex flex-col items-center gap-1 font-medium w-full">
          <p className="text-[10px] font-bold" style={{ color: "#888" }}>
            Select items to Upgrade
          </p>
          <div className="px-2 py-1 flex items-center gap-1.5">
            <img
              src={COIN_ICONS[selectedCurrency]}
              alt="coin"
              className="w-3.5 h-3.5 rounded-full"
            />
            <span className="tabular-nums font-extrabold text-white text-xs">
              {betAmount > 0 ? betAmount.toLocaleString() : "0"}
            </span>
            {betAmount > 0 && selectedItems.length > 0 && (
              <>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span
                  className="tabular-nums font-extrabold text-xs"
                  style={{ color: "#22c55e" }}
                >
                  {totalSelectedValue.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div
          className="relative flex items-center justify-center w-full py-2"
          style={{ height: 280 }}
        >
          {selectedItems.length > 0 ? (
            <div className="flex flex-col items-center gap-1 h-full justify-center relative">
              <img
                src={selectedItems[0].image}
                alt={selectedItems[0].name}
                className="w-48 h-48 object-contain"
              />
              <div className="font-extrabold text-center text-[11px] flex items-center gap-1 justify-center">
                <span
                  style={{ color: getRarityColor(selectedItems[0].rarity) }}
                >
                  {selectedItems[0].name}
                </span>
                {selectedItems.length > 1 && (
                  <span className="text-white font-extrabold">
                    + {selectedItems.length - 1} Item
                    {selectedItems.length - 1 > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full flex flex-col gap-1">
          <div className="flex items-center font-medium gap-1 justify-between px-1">
            <p className="text-[10px] font-black" style={{ color: "#888" }}>
              Multiplier:
            </p>
            <span
              className="font-extrabold text-[10px] flex items-center gap-1"
              style={{ color: "#22c55e" }}
            >
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771461246817.png?width=400&height=400&resize=contain"
                alt="x"
                className="w-3 h-3 object-contain"
              />
              {selectedItems.length > 0 ? multiplier.toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  ),
);

TargetPanel.displayName = "TargetPanel";

const WheelDisplay = React.memo(
  ({
    spinning,
    result,
    arcAnim,
    arcRotation,
    isDraggingState,
    winChance,
    displayedGreenArcLength,
    displayedRedArcLength,
    showLoseArc,
    arrowAngle,
    selectedItems,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    wheelRef,
  }: {
    spinning: boolean;
    result: "win" | "lose" | null;
    arcAnim: string;
    arcRotation: number;
    isDraggingState: boolean;
    winChance: number;
    displayedGreenArcLength: number;
    displayedRedArcLength: number;
    showLoseArc: boolean;
    arrowAngle: MotionValue<number>;
    selectedItems: UpgradeItem[];
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    wheelRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    return (
      <div
        ref={wheelRef}
        className="relative flex items-center justify-center"
        style={{
          width: "100%",
          maxWidth: 300,
          aspectRatio: "1/1",
          cursor: spinning ? "default" : "grab",
          userSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {result && arcAnim !== "idle" && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow:
                result === "win"
                  ? "0 0 60px rgba(34,197,94,0.45)"
                  : "0 0 60px rgba(239,68,68,0.4)",
            }}
          />
        )}

        {/* Static arc layer — only rotates on drag */}
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            transformOrigin: "center",
            overflow: "visible",
          }}
          animate={{ rotate: arcRotation }}
          transition={
            isDraggingState
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 18, mass: 1.0 }
          }
        >
          {/* Base grey ring */}
          <path
            d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
            strokeWidth="8"
            fill="none"
            stroke="rgba(255,255,255,0.03)"
          />
          {/* Green (win) arc — always visible while spinning */}
          {(winChance > 0 || spinning) && (
            <motion.path
              d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
              strokeWidth="10"
              fill="none"
              stroke="#be30ff"
              animate={{
                strokeDasharray: `${
                  spinning && winChance <= 0 ? 8 : displayedGreenArcLength
                } ${CIRC}`,
              }}
              transition={
                spinning || arcAnim !== "idle"
                  ? { duration: 0 }
                  : { duration: 0.35, ease: [0.76, 0, 0.24, 1] }
              }
              strokeLinecap="butt"
            />
          )}
        </motion.svg>

        {/* Red (lose) arc — now rotates to start at the end of the win arc */}
        {showLoseArc && (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              transform: `rotate(${arcRotation + (winChance / 100) * 360}deg)`,
              transformOrigin: "center",
              overflow: "visible",
            }}
          >
            <path
              d="M 50,50 m 0,-45 a 45,45 0 1 1 0,90 a 45,45 0 1 1 0,-90"
              strokeWidth="10"
              fill="none"
              stroke="#ef4444"
              strokeDasharray={`${displayedRedArcLength} ${CIRC}`}
              strokeDashoffset="0"
              strokeLinecap="butt"
            />
          </svg>
        )}

        {/* Inner decorative wheel — also static */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#12111d" />
              <stop offset="100%" stopColor="#0d0b1a" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="41" fill="url(#wheelBg)" />
        </svg>

        {/* Arrow — spins around center, sits just outside the ring */}
        <motion.svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 20,
            overflow: "visible",
            rotate: arrowAngle,
            transformOrigin: "center",
            willChange: "transform",
          }}
        >
          <defs>
            <filter id="arrowGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Tip at y=6, base at y=-4 */}
          <polygon
            points="50,3.5 47,-2.5 53,-2.5"
            fill="white"
            stroke="white"
            strokeWidth="3.5"
            strokeLinejoin="round"
            filter="drop-shadow(0 0 15px rgba(168,85,247,0.9))"
          />
        </motion.svg>

        <ResultSquares result={result} active={arcAnim !== "idle"} />

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
          <div
            className="text-[11px] font-[1000] uppercase tracking-[0.3em] mb-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Win Chance
          </div>
          <div className="text-3xl font-extrabold text-white tabular-nums">
            {selectedItems.length > 0 ? winChance.toFixed(2) : "0.00"}%
          </div>
        </div>
      </div>
    );
  },
);

WheelDisplay.displayName = "WheelDisplay";

const ResultSquares = React.memo(
  ({ result, active }: { result: "win" | "lose" | null; active: boolean }) => {
    if (!active || !result) return null;
    const color = result === "win" ? "#22c55e" : "#ef4444";

    const gridSize = 8;
    const squares = Array.from({ length: gridSize * gridSize });

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full z-10">
        <div
          className="grid gap-1 w-[230px] h-[230px]"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {squares.map((_, i) => {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const centerX = (gridSize - 1) / 2;
            const centerY = (gridSize - 1) / 2;
            const distance = Math.sqrt(
              Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2),
            );
            const maxDistance = Math.sqrt(
              Math.pow(centerX, 2) + Math.pow(centerY, 2),
            );
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 0.6, 0.2],
                  scale: [0, 1.2, 1],
                }}
                transition={{
                  duration: 0.25,
                  delay: (distance / maxDistance) * 0.08,
                  times: [0, 0.5, 1],
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 0.05,
                }}
                className="w-full h-full rounded-[2px]"
                style={{
                  backgroundColor: color,
                  visibility: distance <= gridSize / 2 ? "visible" : "hidden",
                  boxShadow: `0 0 6px ${color}44`,
                  willChange: "opacity, transform",
                }}
              />
            );
          })}
        </div>
        {/* Background radial glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.3, 0.15], scale: [0.8, 1.05, 1] }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute rounded-full"
          style={{
            background: `radial-gradient(circle, ${color}44 0%, transparent 70%)`,
            willChange: "opacity, transform",
            width: "246px",
            height: "246px",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    );
  },
);
ResultSquares.displayName = "ResultSquares";

const ItemCard = React.memo(
  ({
    item,
    isSelected,
    onSelect,
    selectedCurrency,
  }: {
    item: UpgradeItem;
    isSelected: boolean;
    onSelect: (item: UpgradeItem) => void;
    selectedCurrency: "coins" | "fun_coins";
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    // Persist which images have loaded so refreshing doesn't show the spinner every time
    useEffect(() => {
      try {
        const loadedJson = localStorage.getItem(
          "mm2dice_upgrader_loaded_images",
        );
        if (!loadedJson) return;
        const loadedIds: number[] = JSON.parse(loadedJson);
        if (Array.isArray(loadedIds) && loadedIds.includes(item.id)) {
          setImageLoaded(true);
        }
      } catch {
        // ignore
      }
    }, [item.id]);

    const markImageLoaded = () => {
      setImageLoaded(true);
      try {
        const loadedJson = localStorage.getItem(
          "mm2dice_upgrader_loaded_images",
        );
        const loadedIds: number[] = loadedJson ? JSON.parse(loadedJson) : [];
        if (!loadedIds.includes(item.id)) {
          localStorage.setItem(
            "mm2dice_upgrader_loaded_images",
            JSON.stringify([...loadedIds, item.id]),
          );
        }
      } catch {
        // ignore
      }
    };

    return (
      <button
        onClick={() => onSelect(item)}
        className="flex flex-col items-center gap-1.5 group transition-all active:translate-y-0.5 focus:outline-none relative w-full"
      >
        <div
          className={`relative w-full aspect-square flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-2 ${isSelected ? 'shadow-[0_0_40px_rgba(190,48,255,0.4)]' : 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}`}
          style={{
            background: "#12111d",
          }}
        >
          {/* Exact Pixel Pattern rendering as inline SVG so CSS gradients/animations work */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.8] flex items-center justify-center overflow-hidden"
            style={{ opacity: isSelected ? 1 : 0.6 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 158 175"
              className={`w-[150%] h-[150%] absolute ${
                item.rarity?.toLowerCase() === "chroma"
                  ? "chroma-text-color"
                  : item.rarity?.toLowerCase() === "godly"
                    ? "text-purple-500"
                    : item.rarity?.toLowerCase() === "ancient"
                      ? "text-blue-500"
                      : ""
              }`}
              style={{
                color:
                  item.rarity?.toLowerCase() !== "chroma" &&
                  item.rarity?.toLowerCase() !== "godly" &&
                  item.rarity?.toLowerCase() !== "ancient"
                    ? getRarityColor(item.rarity)
                    : undefined,
              }}
            >
              <path
                fill="currentColor"
                d="M31.667 106.938h9v9h-9zM31.667 87.813h9v9h-9zM31.667 68.688h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M31.667 49.563h9v9h-9z"
                opacity=".1"
              />
              <path
                fill="currentColor"
                d="M41.23 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M41.23 106.938h9v9h-9zM41.23 87.813h9v9h-9zM41.23 68.688h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M41.23 49.563h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M50.792 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M50.792 106.938h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M50.792 87.813h9v9h-9zM50.792 68.688h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M50.792 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M60.355 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M60.355 106.938h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M60.355 87.813h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M60.355 68.688h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M60.355 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M69.917 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M69.917 106.938h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M69.917 87.813h9v9h-9zM69.917 68.688h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M69.917 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M79.48 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M79.48 106.938h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M79.48 87.813h9v9h-9zM79.48 68.688h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M79.48 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M89.042 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M89.042 106.938h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M89.042 87.813h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M89.042 68.688h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M89.042 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M98.605 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M98.605 106.938h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M98.605 87.813h9v9h-9zM98.605 68.688h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M98.605 49.563h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M108.167 126.062h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M108.167 106.938h9v9h-9zM108.167 87.813h9v9h-9zM108.167 68.688h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M108.167 49.563h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M117.729 106.938h9v9h-9zM117.729 87.813h9v9h-9zM117.729 68.688h9v9h-9zM117.729 49.563h9v9h-9zM31.667 116.5h9v9h-9zM31.667 97.375h9v9h-9zM31.667 78.25h9v9h-9zM31.667 59.125h9v9h-9z"
                opacity=".2"
              />
              <path fill="currentColor" d="M41.23 116.5h9v9h-9z" opacity=".5" />
              <path
                fill="currentColor"
                d="M41.23 97.375h9v9h-9zM41.23 78.25h9v9h-9zM41.23 59.125h9v9h-9z"
                opacity=".8"
              />
              <path fill="currentColor" d="M41.23 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M50.792 116.5h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M50.792 97.375h9v9h-9zM50.792 78.25h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M50.792 59.125h9v9h-9z"
                opacity=".5"
              />
              <path fill="currentColor" d="M50.792 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M60.355 116.5h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M60.355 97.375h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M60.355 78.25h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M60.355 59.125h9v9h-9z"
                opacity="1"
              />
              <path fill="currentColor" d="M60.355 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M69.917 116.5h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M69.917 97.375h9v9h-9zM69.917 78.25h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M69.917 59.125h9v9h-9z"
                opacity="1"
              />
              <path fill="currentColor" d="M69.917 40h9v9h-9z" opacity=".2" />
              <path fill="currentColor" d="M79.48 116.5h9v9h-9z" opacity=".8" />
              <path
                fill="currentColor"
                d="M79.48 97.375h9v9h-9zM79.48 78.25h9v9h-9z"
                opacity=".2"
              />
              <path fill="currentColor" d="M79.48 59.125h9v9h-9z" opacity="1" />
              <path fill="currentColor" d="M79.48 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M89.042 116.5h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M89.042 97.375h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M89.042 78.25h9v9h-9z"
                opacity=".2"
              />
              <path
                fill="currentColor"
                d="M89.042 59.125h9v9h-9z"
                opacity="1"
              />
              <path fill="currentColor" d="M89.042 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M98.605 116.5h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M98.605 97.375h9v9h-9zM98.605 78.25h9v9h-9z"
                opacity="1"
              />
              <path
                fill="currentColor"
                d="M98.605 59.125h9v9h-9z"
                opacity=".5"
              />
              <path fill="currentColor" d="M98.605 40h9v9h-9z" opacity=".2" />
              <path
                fill="currentColor"
                d="M108.167 116.5h9v9h-9z"
                opacity=".5"
              />
              <path
                fill="currentColor"
                d="M108.167 97.375h9v9h-9zM108.167 78.25h9v9h-9zM108.167 59.125h9v9h-9z"
                opacity=".8"
              />
              <path
                fill="currentColor"
                d="M108.167 40h9v9h-9zM117.729 116.5h9v9h-9zM117.729 97.375h9v9h-9zM117.729 78.25h9v9h-9zM117.729 59.125h9v9h-9z"
                opacity=".2"
              />
            </svg>
          </div>

          <div className="relative w-full h-full flex items-center justify-center p-2 z-10">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-lg">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-all duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={markImageLoaded}
              onError={markImageLoaded} // Show even if image fails
            />
            {isSelected && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center z-20"
                style={{
                  background: "#22c55e",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="text-center w-full px-0.5 mt-0.5">
          <div
            className="text-[11px] sm:text-[12px] font-extrabold leading-tight truncate w-full"
            style={{ color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
          >
            {item.name}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <img
              src={COIN_ICONS[selectedCurrency]}
              alt="coin"
              className="w-3.5 h-3.5 rounded-full"
            />
            <span
              className="text-[10px] sm:text-[11px] font-black"
              style={{
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {item.value.toLocaleString()}
            </span>
          </div>
        </div>
      </button>
    );
  },
);

ItemCard.displayName = "ItemCard";

const ItemGrid = React.memo(
  ({
    items,
    selectedIds,
    onSelect,
    selectedCurrency,
  }: {
    items: UpgradeItem[];
    selectedIds: Set<number>;
    onSelect: (item: UpgradeItem) => void;
    selectedCurrency: "coins" | "fun_coins";
  }) => (
    <div className="max-w-[1096px] mx-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3">
      {items.map((item) => (
        <ItemCard
          key={`upgrader-item-${item.id}`}
          item={item}
          isSelected={selectedIds.has(item.id)}
          onSelect={onSelect}
          selectedCurrency={selectedCurrency}
        />
      ))}
    </div>
  ),
);

ItemGrid.displayName = "ItemGrid";

export default function UpgraderGame() {
  const fair = useFair();
  const {
    isMuted,
    setIsMuted,
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
    refreshBalances,
  } = useCurrency();

  // Listen for balanceUpdate event and refresh balances automatically
  useEffect(() => {
    const handler = () => {
      refreshBalances && refreshBalances();
    };
    window.addEventListener("balanceUpdate", handler);
    return () => window.removeEventListener("balanceUpdate", handler);
  }, [refreshBalances]);
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey =
    selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

  const updateLocalBalance = (newBal: number) => {
    if (selectedCurrency === "coins") setCoinsBalance(newBal);
    else setFunCoinsBalance(newBal);
    localStorage.setItem(balanceKey, newBal.toString());
    localStorage.setItem("mm2dice_balance_ts", Date.now().toString());
    window.dispatchEvent(new Event("balanceUpdate"));
  };

  const [items, setItems] = useState<UpgradeItem[]>(() =>
    mm2Items
      .filter((item) => item.value >= 7)
      .map((item, i) => ({
        ...item,
        id: i,
        name: item.name.replace(/&#x27;/g, "'"),
      })),
  );
  const [selectedItems, setSelectedItems] = useState<UpgradeItem[]>([]);
  const [betInput, setBetInput] = useState("");
  const [multiplier, setMultiplier] = useState(2);
  const [betMode, setBetMode] = useState<"roll-under" | "roll-over" | null>(
    "roll-over",
  );
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<"win" | "lose" | null>(null);
  const animRef = useRef<number | null>(null);
  const [showFair, setShowFair] = useState(false);
  const [search, setSearch] = useState("");
  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200); // 200ms debounce
    return () => clearTimeout(handler);
  }, [search]);
  const [sortMode, setSortMode] = useState<"highest" | "lowest">("highest");
  const [lastFairResult, setLastFairResult] = useState<{
    hash: string;
    float: number;
    nonce: number;
    won: boolean;
  } | null>(null);

  // Arc rotation — only changes on drag, never during spin
  const [arcRotation, setArcRotation] = useState(0);
  // Arrow angle — we use a MotionValue for zero-render animation updates
  const arrowAngle = useMotionValue(0);
  const [lastArrowAngle, setLastArrowAngle] = useState(0);

  // Derived synchronously
  const betAmount = parseFloat(betInput) || 0;
  const targetItem =
    selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null;

  // Memoize total selected value to prevent unnecessary recalculations
  const totalSelectedValue = useMemo(
    () => selectedItems.reduce((sum, it) => sum + it.value, 0),
    [selectedItems],
  );

  // Memoize selected IDs set for ItemGrid
  const selectedIds = useMemo(
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems],
  );

  // Win chance = betAmount / totalSelectedValue * 100
  const winChance = (() => {
    if (!betAmount || selectedItems.length === 0) return 0;
    if (totalSelectedValue > 0) {
      // Apply 10% house edge to win chance
      const baseChance = (betAmount / totalSelectedValue) * 100 * 0.9;
      // If chance is more than 85%, or bet exceeds balance, drop to 0%
      if (baseChance > 85 || betAmount > balance) return 0;
      return Math.max(0.01, baseChance);
    }
    return 0;
  })();

  // Normalize arc rotation to 0–360 for slider UI
  const normalizedArcRotation = ((arcRotation % 360) + 360) % 360;

  // Post-result arc animation
  // For win: green arc expands to full circle, holds, then shrinks back
  // For lose: red arc rotates around fully, then disappears
  const [arcAnim, setArcAnim] = useState<
    | "idle"
    | "win-expand"
    | "win-hold"
    | "win-shrink"
    | "lose-spin"
    | "lose-fade"
  >("idle");
  const [arcAnimProgress, setArcAnimProgress] = useState(0); // 0–1
  const arcAnimRef = useRef<number | null>(null);
  const lastArcProgressRef = useRef(0);
  const lastArcUpdateTimeRef = useRef(0);

  const setArcProgressThrottled = (value: number) => {
    const now = performance.now();
    // Limit updates to ~30fps for performance
    if (
      Math.abs(value - lastArcProgressRef.current) > 0.02 ||
      now - lastArcUpdateTimeRef.current > 33
    ) {
      lastArcProgressRef.current = value;
      lastArcUpdateTimeRef.current = now;
      setArcAnimProgress(value);
    }
  };
  const setArcProgressImmediate = (value: number) => {
    lastArcProgressRef.current = value;
    lastArcUpdateTimeRef.current = performance.now();
    setArcAnimProgress(value);
  };
  const [loseSpinAngle, setLoseSpinAngle] = useState(0);

  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);

  // Keep arc rotation in sync with mode if not manually dragged
  useEffect(() => {
    if (spinning || !betMode) return;
    if (betMode === "roll-under") {
      setArcRotation(0);
    } else if (betMode === "roll-over") {
      const greenDeg = (winChance / 100) * 360;
      setArcRotation(360 - greenDeg);
    }
  }, [winChance, betMode, spinning]);

  const handleSliderChange = (val: number) => {
    setArcRotation(val);
  };

  const handleMultiplierChange = useCallback(
    (m: number) => {
      if (totalSelectedValue > 0) {
        const newBet = totalSelectedValue / m;
        setBetInput(Math.floor(newBet).toString());
      }
      setMultiplier(m);
    },
    [totalSelectedValue],
  );

  // Auto-adjust multiplier when selected items or bet changes
  useEffect(() => {
    if (totalSelectedValue > 0 && betAmount > 0) {
      const autoMult = totalSelectedValue / betAmount;
      setMultiplier(parseFloat(autoMult.toFixed(2)));
    }
  }, [totalSelectedValue, betAmount]);

  // The green arc always starts at arcRotation degrees (from top/0°)
  // and spans winChance% of the circle.
  // Arrow starts at top (0°). During spin the arrow rotates.
  // Win = arrow final angle (mod 360) lands inside [arcRotation, arcRotation + greenDeg] mod 360

  const getAngleFromPointer = (e: React.PointerEvent) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  const handleWheelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (spinning) return;
      e.preventDefault();
      isDragging.current = true;
      setIsDraggingState(true);
      lastAngle.current = getAngleFromPointer(e);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [spinning],
  );

  const handleWheelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const angle = getAngleFromPointer(e);
      let delta = angle - lastAngle.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle.current = angle;
      setArcRotation((prev) => prev + delta);
      // Clear bet mode when manually dragging
      if (betMode) setBetMode(null as any);
    },
    [betMode],
  );

  const handleWheelPointerUp = useCallback(() => {
    isDragging.current = false;
    setIsDraggingState(false);
  }, []);

  // Prevent page refresh during games
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (spinning) {
        e.preventDefault();
        e.returnValue = "Game in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [spinning]);

  // Balance restoration on component mount (for refresh recovery)
  useEffect(() => {
    const pendingGame = localStorage.getItem("mm2dice_upgrader_pending_game");
    if (pendingGame) {
      try {
        const gameData = JSON.parse(pendingGame);
        // If there's a pending game from a previous session
        if (gameData.betAmount && gameData.currency === selectedCurrency) {
          // Check if balance lock is still active
          const balanceLock = localStorage.getItem("mm2dice_balance_lock");
          if (balanceLock && Date.now() < parseInt(balanceLock)) {
            // Balance is locked, the CurrencyContext will deduct the bet
            console.log(
              "Found pending upgrader game with active balance lock, bet deducted",
            );
          } else {
            // Balance lock expired, but since CurrencyContext deducts bet, keep pending to prevent polling
            console.log(
              "Found pending upgrader game with expired balance lock, bet deducted, keeping pending",
            );
          }
        }
      } catch (error) {
        console.error("Error parsing pending game data:", error);
        localStorage.removeItem("mm2dice_upgrader_pending_game");
      }
    }
    // CurrencyContext now handles balance deduction for pending games
  }, [selectedCurrency]);

  // Animation effect for win/lose results
  useEffect(() => {
    if (arcAnimRef.current) cancelAnimationFrame(arcAnimRef.current);

    if (result === "win") {
      // Phase 1: expand green arc from winChance% to 100% over 600ms
      const expandDur = 600;
      const holdDur = 1000;
      const shrinkDur = 800;
      const startTime = performance.now();
      setArcAnim("win-expand");

      const runExpand = (now: number) => {
        const t = Math.min((now - startTime) / expandDur, 1);
        setArcProgressThrottled(t);
        if (t < 1) {
          arcAnimRef.current = requestAnimationFrame(runExpand);
        } else {
          setArcAnim("win-hold");
          // Phase 2: hold for 3s
          const holdStart = performance.now();
          const runHold = (now2: number) => {
            if (now2 - holdStart < holdDur) {
              arcAnimRef.current = requestAnimationFrame(runHold);
            } else {
              // Phase 3: shrink back to winChance%
              setArcAnim("win-shrink");
              const shrinkStart = performance.now();
              const runShrink = (now3: number) => {
                const t3 = Math.min((now3 - shrinkStart) / shrinkDur, 1);
                setArcProgressThrottled(1 - t3);
                if (t3 < 1) {
                  arcAnimRef.current = requestAnimationFrame(runShrink);
                } else {
                  setArcAnim("idle");
                  setArcProgressImmediate(0);
                }
              };
              arcAnimRef.current = requestAnimationFrame(runShrink);
            }
          };
          arcAnimRef.current = requestAnimationFrame(runHold);
        }
      };
      arcAnimRef.current = requestAnimationFrame(runExpand);
    } else if (result === "lose") {
      // Phase 1: expand red arc to full circle over 600ms
      const expandDur = 600;
      const holdDur = 1000;
      const shrinkDur = 800;
      const startTime = performance.now();
      setArcAnim("lose-spin");
      setArcProgressImmediate(0);

      const runExpand = (now: number) => {
        const t = Math.min((now - startTime) / expandDur, 1);
        setArcProgressThrottled(t);
        if (t < 1) {
          arcAnimRef.current = requestAnimationFrame(runExpand);
        } else {
          setArcAnim("lose-fade");
          // Phase 2: hold for 3s
          const holdStart = performance.now();
          const runHold = (now2: number) => {
            if (now2 - holdStart < holdDur) {
              arcAnimRef.current = requestAnimationFrame(runHold);
            } else {
              // Phase 3: shrink back
              setArcAnim("lose-spin"); // reuse lose-spin to keep arc visible during shrink
              const shrinkStart = performance.now();
              const runShrink = (now3: number) => {
                const t3 = Math.min((now3 - shrinkStart) / shrinkDur, 1);
                setArcProgressThrottled(1 - t3);
                if (t3 < 1) {
                  arcAnimRef.current = requestAnimationFrame(runShrink);
                } else {
                  setArcAnim("idle");
                  setArcProgressImmediate(0);
                  setLoseSpinAngle(0);
                }
              };
              arcAnimRef.current = requestAnimationFrame(runShrink);
            }
          };
          arcAnimRef.current = requestAnimationFrame(runHold);
        }
      };
      arcAnimRef.current = requestAnimationFrame(runExpand);
    }

    return () => {
      if (arcAnimRef.current) cancelAnimationFrame(arcAnimRef.current);
    };
  }, [result]);

  const handleSelectItem = useCallback((item: UpgradeItem) => {
    setSelectedItems((prev) => {
      if (prev.some((s) => s.id === item.id)) {
        return prev.filter((s) => s.id !== item.id);
      }
      return [...prev, item];
    });
    setResult(null);
  }, []);

  const handleRemoveSelected = (idx: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSpin = useCallback(async () => {
    console.log("handleSpin called", {
      spinning,
      betAmount,
      selectedItems,
      balance,
    });
    if (spinning) {
      alert("Upgrade is already in progress.");
      return;
    }
    if (!betAmount || betAmount <= 0) {
      alert("Please enter a valid bet amount.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one item to upgrade.");
      return;
    }
    const username = getStorageItem("mm2dice_user");
    if (!username) {
      alert("You must be logged in to upgrade.");
      return;
    }
    if (balance < betAmount) {
      alert("Insufficient balance.");
      return;
    }
    // Check if there's already a pending game
    const existingPending = getStorageItem(
      "mm2dice_upgrader_pending_game",
    );
    if (existingPending) {
      alert("You have a pending upgrade in progress. Please wait or refresh.");
      return;
    }
    const roblox_user_id = getStorageItem("mm2dice_user_id");
    
    // Lock state immediately to prevent spamming
    setSpinning(true);

    // Start the game server-side
    try {
      console.log("Calling /api/games/upgrader/start", {
        betAmount,
        currency: selectedCurrency,
        username,
        roblox_user_id,
      });
      const avatar_url = getStorageItem("mm2dice_avatar") || "";
      const sessionToken = getStorageItem("mm2dice_session_token") || "";
      const startResponse = await fetch("/api/games/upgrader/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          betAmount,
          currency: selectedCurrency,
          username,
          roblox_user_id,
          avatar_url,
        }),
      });
      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        alert(
          "Failed to start upgrade: " + (errorData.error || "Unknown error"),
        );
        setSpinning(false);
        return;
      }
    } catch (error) {
      alert(
        "Error starting upgrade: " +
          (error instanceof Error ? error.message : String(error)),
      );
      setSpinning(false);
      return;
    }

    // 1. Immediate state and sounds
    setResult(null);
    if (!isMuted) {
      playSound("click");
      playSound("spin");
    }

    // Store pending game state for recovery on refresh
    const pendingGameData = {
      game_type: "upgrader",
      betAmount,
      selectedItems: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
      })),
      totalSelectedValue,
      targetItem: targetItem?.name,
      currency: selectedCurrency,
      timestamp: Date.now(),
    };
    setStorageItem(
      "mm2dice_upgrader_pending_game",
      JSON.stringify(pendingGameData),
    );

    // 2. Initial state for the animation (deduct bet immediately)
    const newBal = balance - betAmount;
    updateLocalBalance(newBal);

    // 3. Prevent polling / refetch from overwriting local deduction
    // Give enough time for the spin + server recording to complete.
    setStorageItem(
      "mm2dice_balance_lock",
      (Date.now() + 120000).toString(), // 120s lock to avoid poll overwriting
    );

    window.dispatchEvent(
      new CustomEvent("balanceAnimate", {
        detail: { from: balance, to: newBal },
      }),
    );

    // Store original balance for refund on error
    const originalBalance = balance;

    if (!fair.state) {
      setSpinning(false);
      // Refund on error
      if (selectedCurrency === "coins") setCoinsBalance(originalBalance);
      else setFunCoinsBalance(originalBalance);
      // Clear pending game since we refunded
      removeStorageItem("mm2dice_upgrader_pending_game");
      // Clear balance lock since game failed
      removeStorageItem("mm2dice_balance_lock");
      return;
    }

    // 3. Kick off outcome calculation in background
    const outcomePromise = casesOutcome(fair.state, 100);
    const startTime = performance.now();
    const duration = 4000; // Reduced from 4500ms for better performance
    const startArrow = arrowAngle.get();

    // Variables that will be updated once outcomePromise resolves
    let outcomeReceived = false;
    let won = false;
    let totalRotation = 0;
    let floatVal = 0;
    let gameRecorded = false;

    outcomePromise
      .then(async ({ float, hash, nonce }) => {
        floatVal = float;
        fair.incrementNonce();

        const greenDeg = (winChance / 100) * 360;
        const arcStart = ((arcRotation % 360) + 360) % 360;
        const arcEndThreshold = arcStart + greenDeg;

        // Win condition: float * 360 lands in [arcStart, arcEndThreshold] with wrap
        const floatDeg = float * 360;
        if (arcEndThreshold <= 360) {
          won = floatDeg >= arcStart && floatDeg <= arcEndThreshold;
        } else {
          won = floatDeg >= arcStart || floatDeg <= arcEndThreshold - 360;
        }

        setLastFairResult({ hash, float, nonce, won });

        // Landing angle is exactly float * 360 for visual accuracy
        const landingAngle = floatDeg;

        const currentArrow = ((startArrow % 360) + 360) % 360;
        let diff = (landingAngle - currentArrow + 360) % 360;
        if (diff === 0) diff = 360;
        // Use 4 rotations as requested (reduced from 5 for performance)
        totalRotation = 360 * 4 + diff;
        outcomeReceived = true;

        // Record game result immediately when outcome is known
        try {
          const aEffMult = betAmount > 0 ? totalSelectedValue / betAmount : 1;
          await recordGameResult(
            betAmount,
            won ? totalSelectedValue - betAmount : -betAmount,
            {
              game_type: "upgrader",
              payout: won ? totalSelectedValue : 0,
              multiplier: Math.round(aEffMult * 100) / 100,
              result: won ? "win" : "loss",
              currency: selectedCurrency,
              meta: { targetItem: targetItem?.name, winChance },
            },
          );
          gameRecorded = true;
          // Clear pending game since it was successfully recorded
          removeStorageItem("mm2dice_upgrader_pending_game");
          // Clear balance lock since game is complete
          removeStorageItem("mm2dice_balance_lock");
        } catch (error) {
          console.error("Failed to record game result:", error);
          // Refund on recording failure
          updateLocalBalance(originalBalance);
          setSpinning(false);
          setResult(null);
          // Clear pending game since we refunded
          removeStorageItem("mm2dice_upgrader_pending_game");
          // Clear balance lock since game failed
          removeStorageItem("mm2dice_balance_lock");
          return;
        }
      })
      .catch((error) => {
        console.error("Outcome calculation failed:", error);
        // Refund on outcome failure
        updateLocalBalance(originalBalance);
        setSpinning(false);
        setResult(null);
        // Clear pending game since we refunded
        removeStorageItem("mm2dice_upgrader_pending_game");
        // Clear balance lock since game failed
        removeStorageItem("mm2dice_balance_lock");
      });

    let lastTickDeg = 0;
    let lastTickTime = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(t);

      if (outcomeReceived) {
        const currentDeg = startArrow + totalRotation * eased;
        arrowAngle.set(currentDeg);

        // Ticking logic: only tick if enough degrees passed AND enough time passed
        // Reduced frequency for better performance
        const degSoFar = totalRotation * eased;
        if (degSoFar - lastTickDeg >= 45 && now - lastTickTime > 20) {
          // Reduced from 30deg/16ms
          if (!isMuted) playSound("tick");
          lastTickDeg = Math.floor(degSoFar / 45) * 45;
          lastTickTime = now;
        }
      } else {
        // Fallback: just rotate slowly if outcome takes > 1 frame
        const currentDeg = startArrow + elapsed * 1.5; // Reduced speed
        arrowAngle.set(currentDeg);
      }

      if (t < 1 || !outcomeReceived) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Finish up
        const finalArrow = startArrow + totalRotation;
        arrowAngle.set(finalArrow);
        setLastArrowAngle(finalArrow);
        setSpinning(false);
        setResult(won ? "win" : "lose");

        // Only update balance if game was recorded successfully
        if (gameRecorded) {
          // On win: call backend payout endpoint to credit coins
          if (won) {
            const payoutAmount = totalSelectedValue;
            const sessionToken =
              getStorageItem("mm2dice_session_token") || "";
            fetch("/api/games/upgrader/payout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sessionToken,
                payoutAmount,
                currency: selectedCurrency,
                username,
              }),
            })
              .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
              .then(({ ok, data }) => {
                if (!ok) {
                  console.error("Upgrader payout failed:", data);
                  return;
                }
                if (data && data.newBal !== undefined) {
                  updateLocalBalance(data.newBal);
                  if (refreshBalances) refreshBalances();
                } else {
                  console.error("Payout response missing newBal:", data);
                }
              })
              .catch((err) => {
                console.error("Upgrader payout fetch error:", err);
              });

            const effectiveMultiplier =
              betAmount > 0 ? totalSelectedValue / betAmount : 1;
            if (
              effectiveMultiplier >= 2 &&
              targetItem &&
              selectedCurrency === "coins"
            ) {
              const avatarUrl = getStorageItem("mm2dice_avatar") || "";
              fetch("/api/upgrade-banner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username,
                  avatar: avatarUrl,
                  item_name: selectedItems.map((i) => i.name).join(", "),
                  item_image: targetItem.image,
                  item_value: totalSelectedValue,
                  multiplier: Math.round(effectiveMultiplier * 100) / 100,
                }),
              })
                .then((res) => {
                  if (!res.ok) {
                    return res.json().then((err) => {
                      console.error("Upgrade banner failed:", err);
                    });
                  }
                })
                .catch((err) => {
                  console.error("Upgrade banner fetch error:", err);
                });
            }
          } else {
            // On loss: update local balance
            updateLocalBalance(newBal);
            if (refreshBalances) refreshBalances();
          }
        }
      }
    };
    animRef.current = requestAnimationFrame(animate);
  }, [
    spinning,
    betAmount,
    selectedItems,
    totalSelectedValue,
    targetItem,
    fair,
    winChance,
    arcRotation,
    arrowAngle,
    betMode,
    isMuted,
    balanceKey,
    selectedCurrency,
    balance,
  ]);

  const winArcLength = (winChance / 100) * CIRC;

  // Compute animated arc values
  const displayedGreenArcLength = (() => {
    if (
      arcAnim === "win-expand" ||
      arcAnim === "win-hold" ||
      arcAnim === "win-shrink"
    ) {
      // progress 0 = winArcLength, progress 1 = CIRC (full circle)
      return winArcLength + arcAnimProgress * (CIRC - winArcLength);
    }
    return winArcLength;
  })();

  // For lose: red arc starts from 0 and expands to full circle (mirrors win green arc)
  const displayedRedArcLength = (() => {
    if (arcAnim === "lose-spin" || arcAnim === "lose-fade") {
      return arcAnimProgress * CIRC;
    }
    return 0;
  })();
  const showLoseArc = arcAnim === "lose-spin" || arcAnim === "lose-fade";

  // Memoize item grid rendering and filter with debounced search
  const displayItems = useMemo(() => {
    return [...items]
      .filter((it) =>
        it.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
      .sort((a, b) =>
        sortMode === "highest" ? b.value - a.value : a.value - b.value,
      );
  }, [items, debouncedSearch, sortMode]);

  return (
    <div className="min-h-screen text-white pt-20 sm:pt-40">
      {/* 3-column layout */}
      <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-8 lg:gap-12 mb-6 w-full">
        {/* LEFT: Controls */}
        <div className="flex flex-col gap-4 w-full lg:w-[320px] shrink-0 lg:mt-[18px]">
          <div className="flex flex-col gap-4">
            <ControlsPanel
              betInput={betInput}
              setBetInput={setBetInput}
              multiplier={multiplier}
              setMultiplier={handleMultiplierChange}
              spinning={spinning}
              selectedCurrency={selectedCurrency}
            />
          </div>
        </div>

        {/* CENTER: Wheel */}
        <div className="flex flex-col items-center justify-center gap-2 pt-0 w-full max-w-[340px] lg:w-[340px] shrink-0 self-center">
          <WheelDisplay
            spinning={spinning}
            result={result}
            arcAnim={arcAnim}
            arcRotation={arcRotation}
            isDraggingState={isDraggingState}
            winChance={winChance}
            displayedGreenArcLength={displayedGreenArcLength}
            displayedRedArcLength={displayedRedArcLength}
            showLoseArc={showLoseArc}
            arrowAngle={arrowAngle}
            selectedItems={selectedItems}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerUp}
            wheelRef={wheelRef}
          />

          {/* Bottom controls — roll buttons */}
          <div
            className="w-full flex flex-col gap-2 mt-auto pt-4"
            style={{ maxWidth: 300 }}
          >
            {/* Mobile arc position slider (above mode buttons) */}
            <div className="lg:hidden mb-2">
              <div className="flex items-center justify-between text-[10px] font-black text-white/80 mb-1">
                <span>Arc position</span>
                <span className="tabular-nums">
                  {Math.round(normalizedArcRotation)}°
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={Math.round(normalizedArcRotation)}
                onChange={(e) => {
                  if (spinning) return;
                  const val = Number(e.target.value);
                  setArcRotation(val);
                  setBetMode(null);
                }}
                className="w-full h-2 rounded-lg accent-[#be30ff]"
                disabled={spinning}
                style={spinning ? { pointerEvents: "none", opacity: 0.5 } : {}}
              />
            </div>

            {/* Roll mode buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  if (spinning || arcAnim !== "idle") return;
                  setBetMode("roll-under");
                  setArcRotation(0);
                }}
                disabled={spinning || arcAnim !== "idle"}
                className={`flex-1 h-12 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${
                  betMode === "roll-under"
                    ? "bg-[#be30ff] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    : "bg-[#0d0b1a]/60 text-white/20 hover:bg-[#0d0b1a]/80"
                } ${spinning || arcAnim !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Roll Under
              </button>
              <button
                onClick={() => {
                  if (spinning || arcAnim !== "idle") return;
                  setBetMode("roll-over");
                  setArcRotation(360 - (winChance / 100) * 360);
                }}
                disabled={spinning || arcAnim !== "idle"}
                className={`flex-1 h-12 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all ${
                  betMode === "roll-over"
                    ? "bg-[#be30ff] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    : "bg-[#0d0b1a]/60 text-white/20 hover:bg-[#0d0b1a]/80"
                } ${spinning || arcAnim !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Roll Over
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={
                  spinning || arcAnim !== "idle" ? undefined : handleSpin
                }
                disabled={
                  spinning ||
                  arcAnim !== "idle" ||
                  !betAmount ||
                  selectedItems.length === 0 ||
                  winChance === 0
                }
                className="w-full h-16 rounded-2xl bg-[#be30ff] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-[0_0_40px_rgba(168,85,247,0.3)] flex items-center justify-center gap-3 overflow-hidden relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[20px] font-[1000] uppercase tracking-[0.2em] text-white">
                  {spinning || arcAnim !== "idle"
                    ? "UPGRADING..."
                    : betAmount > balance
                      ? "INSUFFICIENT BALANCE"
                      : winChance === 0 && selectedItems.length > 0
                        ? "CHANCE TOO HIGH"
                        : "UPGRADE"}
                </span>
              </button>
            </div>
          </div>
          {/* end bottom controls wrapper */}
        </div>

        {/* RIGHT: Target item */}
        <TargetPanel
          selectedItems={selectedItems}
          betAmount={betAmount}
          totalSelectedValue={totalSelectedValue}
          multiplier={multiplier}
          selectedCurrency={selectedCurrency}
          onShowFair={() => setShowFair(true)}
        />
      </div>

      {/* Item selection grid */}
      <div className="mt-8 px-4 lg:px-0">
        {/* Search/sort bar — aligned to cards row */}
      {/* Search & Sort Panel */}
      <div className="max-w-[1096px] mx-auto flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/10 group-focus-within:text-[#be30ff] transition-colors">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input
            type="text"
            placeholder="Search for items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 bg-[#0d0b1a]/60 backdrop-blur-md rounded-2xl pl-14 pr-6 text-[15px] font-bold text-white outline-none transition-all focus:bg-[#0d0b1a]/80"
          />
        </div>

        <button 
          onClick={() => setSortMode(sortMode === "highest" ? "lowest" : "highest")}
          className="h-14 bg-[#0d0b1a]/60 backdrop-blur-md rounded-2xl px-6 flex items-center gap-4 hover:bg-[#0d0b1a]/80 transition-all text-white/40 hover:text-white"
        >
          <div className="flex items-center gap-2">
             <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">Sort by</span>
                <span className="text-[14px] font-black uppercase tracking-wider">{sortMode === "highest" ? "Highest Price" : "Lowest Price"}</span>
             </div>
             <ChevronDown size={16} className={`transition-transform duration-300 ${sortMode === "lowest" ? "rotate-180" : ""}`} />
          </div>
        </button>
      </div>

        <ItemGrid
          items={displayItems}
          selectedIds={selectedIds}
          onSelect={handleSelectItem}
          selectedCurrency={selectedCurrency}
        />
      </div>

      <FairModal
        open={showFair}
        onClose={() => setShowFair(false)}
        gameName="Upgrader"
        winChance={winChance}
        lastResult={lastFairResult}
      />
    </div>
  );
}
