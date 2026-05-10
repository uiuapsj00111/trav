"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { casesOutcome } from "@/lib/provablyFair";
import { recordGameResult } from "@/lib/recordGame";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import FairModal from "./FairModal";

interface CaseItem {
  name: string;
  value: number;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  color: string;
  image: string;
  chance: number; // percentage
}

interface CaseBox {
  name: string;
  price: number;
  image: string;
  icon: string;
  barColor: string;
  barPercent: number;
  items: CaseItem[];
}

// Cases are now loaded from the database via /api/cases

type SortOption = "price-high" | "price-low" | "name-az" | "name-za";

// const COIN_IMG = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772297776282.png?width=400&height=400&resize=contain";

const ITEM_WIDTH = 140;
const ITEM_GAP = 12;
const REEL_ITEMS = 60;
const SPIN_DURATION = 4000;

/** Pick an item index using the provably-fair float and each item's chance. */
function floatToItemIndex(float: number, items: CaseItem[]): number {
  const total = items.reduce((s, it) => s + it.chance, 0);
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    cursor += items[i].chance / total;
    if (float < cursor) return i;
  }
  return items.length - 1;
}

function buildReel(items: CaseItem[], winIndex: number): CaseItem[] {
  const reel: CaseItem[] = [];
  // Scale chances to integers with enough precision to represent tiny chances.
  // Multiply by 10000 so a 0.1% item gets weight 1000, a 50% item gets 500000.
  const pool: CaseItem[] = [];
  for (const item of items) {
    const count = Math.max(1, Math.round(item.chance * 100));
    for (let i = 0; i < count; i++) pool.push(item);
  }
  for (let i = 0; i < REEL_ITEMS; i++) {
    reel.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  // Place winning item near the end so the reel scrolls a long distance
  const landingPos = REEL_ITEMS - 8;
  reel[landingPos] = items[winIndex];
  return reel;
}

// ===================== Sound effects =====================
let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed")
    sharedCtx = new AudioContext();
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

function playSpinStartSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Whoosh sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
    // Noise burst
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.06, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2000;
    noise.connect(hp).connect(nGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.15);
  } catch {}
}

function playTickSound(pitch = 0) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Clicky tick with varying pitch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 600 + pitch * 200 + Math.random() * 150;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
    // Tiny knock
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 1800 + Math.random() * 600;
    g2.gain.setValueAtTime(0.04, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc2.connect(g2).connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.025);
  } catch {}
}

function playSlowTickSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Deeper, more resonant tick for the slow phase
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 500 + Math.random() * 100;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch {}
}

function playWinSound(rarity: string) {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Base chime - different notes per rarity
    const chords: Record<string, number[]> = {
      common: [523, 659, 784],
      uncommon: [523, 659, 784, 880],
      rare: [440, 554, 659, 880, 1047],
      legendary: [440, 554, 659, 880, 1047, 1319],
    };
    const notes = chords[rarity] || chords.common;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = rarity === "legendary" ? "sine" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, t + i * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.5);
    });
    // Shimmer for rare+
    if (rarity === "rare" || rarity === "legendary") {
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 2000 + Math.random() * 3000;
        const st = t + 0.2 + i * 0.1;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.03, st + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(st);
        osc.stop(st + 0.2);
      }
    }
    // Bass thump
    const bass = ctx.createOscillator();
    const bGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(120, t);
    bass.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    bGain.gain.setValueAtTime(0.15, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    bass.connect(bGain).connect(ctx.destination);
    bass.start(t);
    bass.stop(t + 0.3);
  } catch {}
}

const ALLOWED_USERS = ["PinkySold", "BarnoDDino"];

export default function CasesGame() {
  const router = useRouter();
  const fair = useFair();
  const {
    isMuted,
    setIsMuted,
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
  } = useCurrency();
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey =
    selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
  const COIN_IMG = COIN_ICONS[selectedCurrency];

  const [currentUser, setCurrentUser] = React.useState<string | null>(null);
  useEffect(() => {
    setCurrentUser(localStorage.getItem("mm2dice_user"));
  }, []);

  const isAllowed = true; // Temporarily allow all users for testing

  const [showFairModal, setShowFairModal] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("price-high");
  const [cases, setCases] = useState<CaseBox[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  // Case opening state
  const [openedCase, setOpenedCase] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wonItem, setWonItem] = useState<CaseItem | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPhase, setRevealPhase] = useState(0);
  const [reel, setReel] = useState<CaseItem[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reelRef = useRef<HTMLDivElement>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openCase = useCallback(
    async (demo: boolean) => {
      if (openedCase === null || spinning || !fair.state) return;
      const c = cases[openedCase];
      setError(null);

      if (!demo) {
        const user = localStorage.getItem("mm2dice_user");
        if (!user) {
          setError("You must be logged in to open cases!");
          return;
        }
        if (balance < c.price) {
          setError(
            `Not enough balance! You need ${c.price.toLocaleString()} ${selectedCurrency === "coins" ? "Coins" : "Fun Coins"}.`,
          );
          return;
        }

        const newBal = balance - c.price;
        if (selectedCurrency === "coins") setCoinsBalance(newBal);
        else setFunCoinsBalance(newBal);

        window.dispatchEvent(
          new CustomEvent("balanceAnimate", {
            detail: { from: balance, to: newBal },
          }),
        );
      }

      const { float } = await casesOutcome(fair.state, c.items.length);
      fair.incrementNonce();
      const itemIndex = floatToItemIndex(float, c.items);

      const newReel = buildReel(c.items, itemIndex);
      setReel(newReel);
      setWonItem(null);
      setSpinning(true);
      setReelOffset(0);

      // Landing position calculation
      const landingPos = REEL_ITEMS - 8;
      const containerWidth = reelRef.current?.parentElement?.clientWidth || 800;
      const centerOffset = containerWidth / 2 - ITEM_WIDTH / 2;
      const targetOffset = landingPos * (ITEM_WIDTH + ITEM_GAP) - centerOffset;

      // Sound during spin
      if (!isMuted) {
        playSpinStartSound();
        let tickRate = 35;
        let elapsed = 0;
        let pitch = 1;
        const startTicking = () => {
          if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = setInterval(() => {
            elapsed += tickRate;
            const progress = elapsed / SPIN_DURATION;
            if (progress > 0.7) {
              playSlowTickSound();
            } else {
              playTickSound(pitch);
              pitch = Math.max(0, 1 - progress);
            }
            if (progress > 0.5) {
              tickRate = Math.min(tickRate + 12, 350);
              if (tickIntervalRef.current)
                clearInterval(tickIntervalRef.current);
              if (elapsed < SPIN_DURATION - 200) startTicking();
            }
          }, tickRate);
        };
        startTicking();
      }

      // Animate
      requestAnimationFrame(() => {
        setReelOffset(targetOffset);
      });

      setTimeout(() => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        const item = c.items[itemIndex];
        setWonItem(item);
        setSpinning(false);

        if (!isMuted) playWinSound(item.rarity);

        if (!demo) {
          const user = localStorage.getItem("mm2dice_user");
          const balAfter =
            selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
          const finalBal = balAfter - c.price + item.value; // Correctly calculate final balance

          if (selectedCurrency === "coins") setCoinsBalance(finalBal);
          else setFunCoinsBalance(finalBal);

          window.dispatchEvent(
            new CustomEvent("balanceAnimate", {
              detail: { from: balAfter - c.price, to: finalBal },
            }),
          );

          recordGameResult(c.price, item.value - c.price, {
            game_type: "cases",
            payout: item.value,
            currency: selectedCurrency,
            result: item.value >= c.price ? "win" : "loss",
            meta: {
              caseName: c.name,
              itemName: item.name,
              itemRarity: item.rarity,
            },
          });

          // Broadcast rare pull to chat if chance <= 0.1%
          if (item.chance <= 0.1) {
            const avatar = localStorage.getItem("mm2dice_avatar") || "";
            fetch("/api/rare-pull", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: user || "Unknown",
                avatar,
                itemName: item.name,
                itemImage: item.image,
                itemValue: item.value,
                itemChance: item.chance,
                caseName: c.name,
              }),
            }).catch(() => {});
          }
        }
      }, SPIN_DURATION + 500);
    },
    [
      openedCase,
      spinning,
      fair,
      isMuted,
      cases,
      balance,
      selectedCurrency,
      coinsBalance,
      funCoinsBalance,
      setCoinsBalance,
      setFunCoinsBalance,
      balanceKey,
    ],
  );

  // Load cases from API
  useEffect(() => {
    const loadCases = async () => {
      try {
        const response = await fetch("/api/cases");
        if (response.ok) {
          const data = await response.json();
          setCases(data);
        } else {
          console.error("Failed to load cases:", response.statusText);
        }
      } catch (error) {
        console.error("Error loading cases:", error);
      } finally {
        setLoadingCases(false);
      }
    };
    loadCases();
  }, []);

  const realIndex = (c: CaseBox) => cases.indexOf(c);

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    const filtered = cases.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    );

    switch (sort) {
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "name-az":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-za":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  }, [cases, search, sort]);

  // ============================
  // CASE OPENING VIEW
  // ============================
  if (openedCase !== null) {
    const c = cases[openedCase];
    return (
      <div className="w-full px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              setOpenedCase(null);
              setWonItem(null);
              setSpinning(false);
              setReel([]);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#4a2800] to-[#2a1500] text-[13px] font-semibold text-[#be30ff] hover:text-white border border-[#5a3200] shadow-[0_4px_0_0_#0a0a0a,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0a0a0a] active:translate-y-[3px] transition-all cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to cases
          </button>
          <div className="flex items-center gap-2">
            <img src={c.icon} alt="" className="w-8 h-8 object-contain" />
            <span className="text-white font-bold text-lg">{c.name}</span>
          </div>
          <div className="w-[120px]" /> {/* spacer */}
        </div>

        {/* Roulette spinner */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#0a0a0a] to-[#0d0700] overflow-hidden mb-6 shadow-[0_6px_0_0_#0d0700,0_8px_24px_rgba(0,0,0,0.6)]">
          {/* Center pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-white/80" />
            <div className="w-[2px] h-full bg-white/20" />
          </div>

          {/* Reel container */}
          <div className="relative h-[250px] overflow-hidden">
            <div
              ref={reelRef}
              className="absolute top-0 left-0 flex items-center h-full gap-[12px] px-2"
              style={{
                transform: `translateX(-${reelOffset}px)`,
                transition:
                  reelOffset > 0
                    ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.85, 0.25, 1)`
                    : "none",
              }}
            >
              {reel.map((item, i) => {
                const isWinner = wonItem && i === REEL_ITEMS - 8;
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 flex flex-col items-center justify-center outline-none"
                    style={{
                      width: ITEM_WIDTH,
                      height: 220,
                      zIndex: 5,
                    }}
                  >
                    <motion.div
                      animate={
                        isWinner
                          ? {
                              y: [0, -15, 0, -8, 0],
                              scale: [1, 1.1, 1, 1.05, 1],
                            }
                          : { y: 0, scale: 1 }
                      }
                      transition={{
                        duration: 2.5,
                        repeat: isWinner ? Infinity : 0,
                        ease: "easeInOut",
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-contain mb-2 drop-shadow-lg"
                        style={
                          isWinner
                            ? {
                                filter: `drop-shadow(0 0 15px ${item.color}60) drop-shadow(0 0 30px ${item.color}30) brightness(1.1)`,
                              }
                            : {}
                        }
                      />
                    </motion.div>
                    <p className="text-[15px] text-[#be30ff] font-semibold text-center px-1 truncate max-w-full">
                      {item.name}
                    </p>
                    <p
                      className="text-[16px] font-bold flex items-center gap-1 justify-center"
                      style={{ color: item.color }}
                    >
                      <img src={COIN_IMG} alt="" className="w-4 h-4" />
                      {item.value.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Left/right fade */}
            <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-[#0d0700] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-[#0d0700] to-transparent z-10 pointer-events-none" />
          </div>
        </div>

        {/* Open / Demo / Mute buttons */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => openCase(false)}
            disabled={spinning}
            className="px-8 py-3 rounded-xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white font-bold text-sm border border-[#4ade80]/30 shadow-[0_4px_0_0_#0f6b2e,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0f6b2e] active:translate-y-[3px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Open for{" "}
            <img
              src={COIN_IMG}
              alt=""
              className="w-4 h-4 inline-block mx-0.5"
            />
            {c.price.toLocaleString()}
          </button>
          <button
            onClick={() => openCase(true)}
            disabled={spinning}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#2a1800] to-[#0a0a0a] text-[#be30ff] hover:text-white font-semibold text-sm border border-[#3a2200] shadow-[0_4px_0_0_#0d0700,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0d0700] active:translate-y-[3px] transition-all cursor-pointer disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Demo
          </button>

          {/* Right side: mute, provably fair */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-gradient-to-b from-[#2a1800] to-[#0a0a0a] text-[#be30ff] hover:text-white border border-[#3a2200] shadow-[0_4px_0_0_#0d0700,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0d0700] active:translate-y-[3px] transition-all cursor-pointer"
            >
              {isMuted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowFairModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-b from-[#2a1800] to-[#0a0a0a] text-[#be30ff] hover:text-white border border-[#3a2200] shadow-[0_4px_0_0_#0d0700,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0d0700] active:translate-y-[3px] transition-all cursor-pointer"
              title="Provably Fair"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Pullable Items */}
        <div className="mb-6">
          <h3 className="text-white font-bold text-lg mb-4">Pullable Items</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-[10px]">
            {c.items.map((item, i) => (
              <div
                key={i}
                className="relative rounded-xl border shadow-[0_4px_0_0_#0d0700,0_6px_12px_rgba(0,0,0,0.4)] overflow-hidden w-full max-w-[200px] min-h-[220px] mx-auto"
                style={{
                  borderColor: "rgba(249, 115, 22, 0.15)",
                  background:
                    "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.02))",
                }}
              >
                {/* Chance badge */}
                <div
                  className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: item.color + "25",
                    color: item.color,
                  }}
                >
                  {item.chance}%
                </div>
                {/* Inner highlight */}
                <div className="absolute inset-[1px] rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
                <div className="flex flex-col items-center p-3 pt-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-contain mb-2 drop-shadow-lg transition-transform duration-300 group-hover:animate-[float_2s_ease-in-out_infinite]"
                  />
                  <p className="text-[14px] text-[#be30ff] font-semibold text-center truncate w-full">
                    {item.name}
                  </p>
                  <p
                    className="text-[15px] font-bold mt-0.5 flex items-center gap-1 justify-center"
                    style={{ color: item.color }}
                  >
                    <img src={COIN_IMG} alt="" className="w-4 h-4" />
                    {item.value.toLocaleString()}
                  </p>
                </div>
                {/* Bottom color bar */}
                <div
                  className="h-[3px] w-full"
                  style={{ backgroundColor: item.color + "40" }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${item.chance}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <FairModal
          open={showFairModal}
          onClose={() => setShowFairModal(false)}
          gameName="Cases"
        />
      </div>
    );
  }

  // ============================
  // CASES GRID VIEW (browse)
  // ============================
  return (
    <div className="w-full px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#4a2800] to-[#2a1500] text-[13px] font-semibold text-[#be30ff] hover:text-white border border-[#5a3200] shadow-[0_4px_0_0_#0a0a0a,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0a0a0a] active:translate-y-[3px] transition-all cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <button
          onClick={() => setShowFairModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#4a2800] to-[#2a1500] text-[13px] font-semibold text-[#be30ff] hover:text-white border border-[#5a3200] shadow-[0_4px_0_0_#0a0a0a,0_6px_12px_rgba(0,0,0,0.4)] active:shadow-[0_1px_0_0_#0a0a0a] active:translate-y-[3px] transition-all cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Provably Fair
        </button>
      </div>

      <FairModal
        open={showFairModal}
        onClose={() => setShowFairModal(false)}
        gameName="Cases"
      />

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all w-full sm:w-[260px] shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.02))",
            boxShadow: "0 4px 0 0 #050505",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-white text-xs font-bold focus:outline-none w-full placeholder:text-[#888]"
          />
        </div>
        <button
          onClick={() => {
            const options: SortOption[] = [
              "price-high",
              "price-low",
              "name-az",
              "name-za",
            ];
            const currentIndex = options.indexOf(sort);
            const nextIndex = (currentIndex + 1) % options.length;
            setSort(options[nextIndex]);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap active:translate-y-[2px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.02))",
            boxShadow: "0 4px 0 0 #050505",
            color: "white",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          SORT BY:{" "}
          {sort === "price-high"
            ? "PRICE HIGH"
            : sort === "price-low"
              ? "PRICE LOW"
              : sort === "name-az"
                ? "NAME A-Z"
                : "NAME Z-A"}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Cases Grid */}
      {loadingCases ? (
        <div className="text-center py-20 text-[#6b5a47]">
          <p className="text-lg">Loading cases...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredCases.map((c) => {
            const idx = realIndex(c);
            return (
              <button
                key={c.name}
                onClick={() => {
                  setOpenedCase(idx);
                  setWonItem(null);
                  setReel([]);
                  setReelOffset(0);
                }}
                className="group text-left relative rounded-xl shadow-[0_6px_0_0_#0d0700,0_8px_16px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_0_0_#0d0700,0_12px_24px_rgba(0,0,0,0.6)] hover:-translate-y-[2px] hover:border-[#be30ff]/40 active:shadow-[0_2px_0_0_#0d0700] active:translate-y-[4px] transition-all duration-200 overflow-hidden cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(249, 115, 22, 0.02))",
                  border: "1px solid rgba(249, 115, 22, 0.15)",
                }}
              >
                <div className="absolute inset-[1px] rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
                <div className="relative aspect-square flex items-center justify-center p-4">
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={c.image}
                      alt={c.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="relative px-3 pb-3 pt-1">
                  <p className="text-white text-[13px] font-semibold truncate">
                    {c.name}
                  </p>
                  <p className="text-white text-[15px] font-[800] mt-0.5 flex items-center gap-1">
                    <img src={COIN_IMG} alt="" className="w-4 h-4" />
                    {c.price.toLocaleString()}
                  </p>
                  <div className="mt-2 h-[3px] w-full bg-[#2a1800] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${c.barPercent}%`,
                        backgroundColor: c.barColor,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filteredCases.length === 0 && !loadingCases && (
        <div className="text-center py-20 text-[#6b5a47]">
          <p className="text-lg">No cases found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
