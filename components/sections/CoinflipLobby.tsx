"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { recordGameResult } from "@/lib/recordGame";
import { supabase } from "@/lib/supabase";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Swords, Shield, ChevronDown, Bot, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FairModal from "./FairModal";
import { CoinSprite } from "./CoinSprite";

const HEADS_IMG = "/coin-heads-static.png";
const TAILS_IMG = "/coin-tails-static.png";
const HEADS_GIF = "/heads.gif";
const TAILS_GIF = "/tails.gif";


const HEADS_WEBM = ""; // Removed
const TAILS_WEBM = ""; // Removed

// No video preloading needed for CSS 3D flip

type CoinSide = "orange" | "blue";

interface CoinflipGame {
  id: string;
  creator_username: string;
  creator_avatar: string;
  creator_side: CoinSide;
  joiner_username: string | null;
  joiner_avatar: string;
  joiner_side: CoinSide | null;
  bet_amount: number;
  total_value: number;
  status: "waiting" | "active" | "completed";
  winner_username: string | null;
  winner_side: CoinSide | null;
  item_name: string;
  item_image: string;
  joiner_item_image: string;
  joiner_item_name: string;
  currency: "coins" | "fun_coins";
  created_at: string;
}

function Avatar({
  src,
  username,
  side,
  size = 44,
}: {
  src: string;
  username: string;
  side: CoinSide;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  return (
    <div
      className="rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-[#16142c] shadow-inner"
      style={{ width: size, height: size }}
    >
      {src && src !== "" && !err ? (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={src}
          alt={username}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <span
          className="text-white font-black"
          style={{ fontSize: size * 0.4 }}
        >
          {username?.[0]?.toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

function CoinBadge({ side, size = 22 }: { side: CoinSide; size?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ width: size, height: size }}>
       <CoinSprite side={side} size={size} />
    </div>
  );
}

// Legacy Coin3D removed in favor of CoinSprite

// Simple preloader for PNGs
if (typeof window !== "undefined") {
  [HEADS_IMG, TAILS_IMG, HEADS_GIF, TAILS_GIF].forEach(src => {
    const img = new Image();
    img.src = src;
  });
}


function MediaPreloader() {
  return null;
}

function CenterVS({
  countdown,
  flipping,
  winnerSide,
  joinerUsername,
  viewGame,
  size,
}: {
  countdown: number | null;
  flipping: boolean;
  winnerSide: CoinSide | null;
  joinerUsername: string | null;
  viewGame: CoinflipGame;
  size?: number;
}) {
  const SIZE = size ?? 120;
  const resolvedWinnerSide = winnerSide ?? viewGame.winner_side;
  const showMedia = flipping || (!!resolvedWinnerSide && !!joinerUsername);

  const headsRef = React.useRef<HTMLVideoElement>(null);
  const tailsRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (flipping) {
      const vid =
        resolvedWinnerSide === "orange" ? tailsRef.current : headsRef.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    }
  }, [flipping, resolvedWinnerSide]);

  if (countdown !== null) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span
          className="font-black text-white"
          style={{
            fontSize: SIZE * 0.5,
            lineHeight: 1,
            textShadow: "0 0 80px rgba(255,255,255,0.8)",
          }}
        >
          {countdown}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center w-full h-full relative"
      style={{ backgroundColor: "transparent" }}
    >

      
      {showMedia ? (
        <CoinSprite 
          isFlipping={flipping} 
          side={resolvedWinnerSide || "blue"} 
          size={SIZE} 
        />
      ) : (
        <div className="flex items-center justify-center opacity-20">
           <Swords size={SIZE * 0.4} />
        </div>
      )}
    </div>
  );
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000];

function CreateCoinflipRow({
  onCreate,
  balance,
}: {
  onCreate: (side: CoinSide, amount: number) => Promise<void>;
  balance: number;
}) {
  const { selectedCurrency } = useCurrency();
  const COIN_IMG = COIN_ICONS[selectedCurrency];
  const [amountStr, setAmountStr] = useState("10");
  const [side, setSide] = useState<CoinSide>("blue");
  const [submitting, setSubmitting] = useState(false);

  const amount = parseFloat(amountStr.replace(/,/g, "")) || 0;
  const isValid = amount >= 1 && amount <= balance;

  function setAmount(val: number) {
    setAmountStr(Math.floor(val).toLocaleString());
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      setAmountStr("");
      return;
    }
    setAmountStr(Number(raw).toLocaleString());
  }

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6 w-full lg:w-auto">
      {/* Bet Input & Create Button Wrapper */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {/* Bet Input Bar */}
        <div 
          className="flex items-center bg-[#1c1a2e] rounded-xl overflow-hidden h-[50px] w-full sm:w-auto relative"
          style={{ 
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.08), inset 0 -1.5px 0 rgba(0,0,0,0.4), 0 10px 30px -5px rgba(0,0,0,0.5)" 
          }}
        >
          <div className="flex items-center gap-3 px-4 sm:px-5 h-full shrink-0">
             <img src={COIN_IMG} alt="" className="w-5 h-5 object-contain" />
             <input
               value={amountStr}
               onChange={handleInput}
               className="bg-transparent text-white font-black text-lg outline-none w-[80px] sm:w-[100px] placeholder:text-white/20"
               placeholder="0"
             />
          </div>
          
          {/* Multipliers */}
          <div className="flex items-center gap-2 px-3 sm:px-4 h-full flex-1 justify-center sm:justify-start">
             <button onClick={() => setAmount(amount / 2)} className="h-9 px-2.5 sm:px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] sm:text-[11px] font-black uppercase transition-all">1/2</button>
             <button onClick={() => setAmount(amount * 2)} className="h-9 px-2.5 sm:px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] sm:text-[11px] font-black uppercase transition-all">2x</button>
             <button onClick={() => setAmount(balance)} className="h-9 px-2.5 sm:px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[#be30ff] text-[10px] sm:text-[11px] font-black uppercase transition-all">Max</button>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={async () => {
             if (!isValid || submitting) return;
             setSubmitting(true);
             try {
               await onCreate(side, amount);
             } finally {
               setSubmitting(false);
             }
          }}
          disabled={!isValid || submitting}
          className="bg-gradient-to-b from-[#be30ff] to-[#7e22ce] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed h-[50px] w-full sm:w-auto px-8 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap"
          style={{ 
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -1.5px 0 rgba(0,0,0,0.4), 0 10px 30px -5px rgba(168,85,247,0.3)" 
          }}
        >
          {submitting ? "..." : "Create Game"}
        </button>
      </div>

      <div className="h-10 w-[1px] bg-white/5 hidden lg:block" />

      {/* Side Selection Circles */}
      <div className="flex items-center gap-3 sm:gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSide("blue")}
          className={`w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center transition-all duration-200 relative group ${side === 'blue' ? 'opacity-100 scale-110' : 'opacity-30 grayscale hover:opacity-60'}`}
        >
          <CoinSprite side="blue" size={50} isLooping={false} />
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSide("orange")}
          className={`w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full flex items-center justify-center transition-all duration-200 relative group ${side === 'orange' ? 'opacity-100 scale-110' : 'opacity-30 grayscale hover:opacity-60'}`}
        >
          <CoinSprite side="orange" size={50} isLooping={false} />
        </motion.button>
      </div>
    </div>
  );
}

/* ── Coinflip Sound Effects (using Web Audio API, same style as BattlesGame) ── */
let cfAudioCtx: AudioContext | null = null;
function getCfCtx(): AudioContext {
  if (!cfAudioCtx || cfAudioCtx.state === "closed")
    cfAudioCtx = new AudioContext();
  if (cfAudioCtx.state === "suspended") cfAudioCtx.resume();
  return cfAudioCtx;
}

function playCountdownBeep() {
  if (
    typeof window !== "undefined" &&
    getStorageItem("mm2dice_muted") === "true"
  )
    return;
  try {
    const ctx = getCfCtx();
    const t = ctx.currentTime;
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(120, t);
    bass.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    bassGain.gain.setValueAtTime(0.35, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(t);
    bass.stop(t + 0.3);
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = "triangle";
    mid.frequency.value = 800;
    midGain.gain.setValueAtTime(0.15, t);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    mid.connect(midGain).connect(ctx.destination);
    mid.start(t);
    mid.stop(t + 0.1);
    const bufSize = ctx.sampleRate * 0.03;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    noise.buffer = buf;
    noiseGain.gain.setValueAtTime(0.12, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.06);
  } catch {}
}

function playCountdownGo() {
  if (
    typeof window !== "undefined" &&
    getStorageItem("mm2dice_muted") === "true"
  )
    return;
  try {
    const audio = new Audio("/coinflipsound.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}

function playCoinflipWin() {
  if (
    typeof window !== "undefined" &&
    getStorageItem("mm2dice_muted") === "true"
  )
    return;
  try {
    const ctx = getCfCtx();
    const t = ctx.currentTime;

    // Fast Cyber-Bling (3Snappy Blips)
    [1500, 2200, 3000].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      
      gain.gain.setValueAtTime(0.12, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
      
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.2);
    });

    // High frequency shimmer burst
    const noise = ctx.createBufferSource();
    const bufSize = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.05, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    noise.connect(nGain).connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.15);
  } catch {}
}

function playCoinflipLose() {
  if (
    typeof window !== "undefined" &&
    getStorageItem("mm2dice_muted") === "true"
  )
    return;
  try {
    const ctx = getCfCtx();
    const t = ctx.currentTime;

    // Double Descending Chirp (Power Down)
    [600, 300].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + i * 0.1 + 0.1);
      
      gain.gain.setValueAtTime(0.08, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.15);
      
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;

      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.2);
    });
  } catch {}
}

function CardFlipMedia({
  winnerSide,
  isFlipping,
  size,
}: {
  winnerSide: CoinSide;
  isFlipping?: boolean;
  size: number;
}) {
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <CoinSprite 
        side={winnerSide === "orange" ? "orange" : "blue"} 
        size={size} 
        isFlipping={isFlipping}
      />
    </div>
  );
}


export default function CoinflipLobby() {
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
  const COIN_IMG = COIN_ICONS[selectedCurrency];

  const [showFairModal, setShowFairModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [viewGame, setViewGame] = useState<CoinflipGame | null>(null);
  const [flipCountdown, setFlipCountdown] = useState<number | null>(null);
  const [flipActive, setFlipActive] = useState(false);
  const [flipWinnerSide, setFlipWinnerSide] = useState<CoinSide | null>(null);
  const [pendingFlip, setPendingFlip] = useState<{
    game: CoinflipGame;
    winnerSide: CoinSide;
    winnerUsername: string;
    prize: number;
    botName?: string;
  } | null>(null);
  // Per-card flip animation state: gameId -> { countdown: number|null, flipping: boolean, winnerSide: CoinSide|null }
  const [cardFlips, setCardFlips] = useState<
    Record<
      string,
      {
        countdown: number | null;
        flipping: boolean;
        winnerSide: CoinSide | null;
      }
    >
  >({});
  const flipActiveRef = React.useRef(false);
  const viewGameRef = React.useRef<CoinflipGame | null>(null);

  useEffect(() => {
    viewGameRef.current = viewGame;
    flipActiveRef.current = flipActive;
  }, [viewGame, flipActive]);

  const addingBotRef = React.useRef<Set<string>>(new Set());
  const joiningGameRef = React.useRef<Set<string>>(new Set());
  // Games currently being flipped locally — skip realtime updates for these
  const localFlipIds = React.useRef<Set<string>>(new Set());
  // Track which game IDs have already been paid out to prevent double-payment
  const paidOutIds = React.useRef<Set<string>>(new Set());

  const isBot = (name: string) => {
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('bot') || ['livingdice', 'normsdemise', 'norms demise', 'systm', 'admin'].includes(n);
  };

  // Track user levels for the modal
  const [playerLevels, setPlayerLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!viewGame) {
      setPlayerLevels({});
      return;
    }

    const fetchLevel = async (pUsername: string) => {
      if (!pUsername || isBot(pUsername)) return;
      try {
        const res = await fetch(`/api/stats?username=${encodeURIComponent(pUsername)}`);
        const stats = await res.json();
        const wagered = parseFloat(stats.total_wagered) || 0;
        // Formula: floor(sqrt(wagered / 25)) + 1
        const level = Math.min(100, Math.floor(Math.sqrt(wagered / 25)) + 1);
        setPlayerLevels(prev => ({ ...prev, [pUsername]: level }));
      } catch (err) {}
    };

    fetchLevel(viewGame.creator_username);
    if (viewGame.joiner_username) fetchLevel(viewGame.joiner_username);
  }, [viewGame]);

  const username =
    typeof window !== "undefined"
      ? getStorageItem("mm2dice_user") || ""
      : "";
  const userId =
    typeof window !== "undefined"
      ? getStorageItem("mm2dice_user_id") || ""
      : "";
  const avatarUrl =
    typeof window !== "undefined"
      ? getStorageItem("mm2dice_avatar") || ""
      : "";
  const sessionToken =
    typeof window !== "undefined"
      ? getStorageItem("mm2dice_session_token") || ""
      : "";

  const authHeaders = {
    "x-session-token": sessionToken,
    "x-username": username,
    "x-user-id": userId,
    "x-avatar-url": avatarUrl,
  };

  const authBody = (body: Record<string, unknown>) => ({
    sessionToken,
    username,
    ...body,
  });

  // Keep refs in sync — always up to date for use inside async callbacks
  useEffect(() => {
    viewGameRef.current = viewGame;
  }, [viewGame]);
  useEffect(() => {
    flipActiveRef.current = flipActive;
  }, [flipActive]);

  // Load games
  async function loadGames() {
    try {
      const response = await fetch(
        `/api/coinflip/games?currency=${selectedCurrency}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          credentials: "include",
        },
      );

      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      } else {
        console.error("Failed to load games:", response.statusText);
        setGames([]);
      }
    } catch (error) {
      console.error("Error loading games:", error);
      setGames([]);
    }
  }

  // Global list subscription — always active
  useEffect(() => {
    loadGames();
    const channel = supabase
      .channel("coinflip_list_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "coinflip_games" },
        (payload) => {
          const updated = payload.new as CoinflipGame;
          // Only show games for current currency
          if (updated.currency !== selectedCurrency) {
            setGames((prev) => prev.filter((g) => g.id !== updated.id));
            return;
          }
          // Never overwrite games that are being flipped locally
          if (localFlipIds.current.has(updated.id)) return;
          setGames((prev) =>
            prev.map((g) => (g.id === updated.id ? updated : g)),
          );

          // Background payout: creator not viewing modal but someone joined their game
          const currentUsername = getStorageItem("mm2dice_user") || "";
          const isCreatorGame = updated.creator_username === currentUsername;
          const hasResult =
            updated.status === "active" &&
            updated.winner_username &&
            updated.winner_side;
          const notViewingThisGame = viewGameRef.current?.id !== updated.id;
          const notAlreadyFlipping = !flipActiveRef.current;

          if (
            isCreatorGame &&
            hasResult &&
            notViewingThisGame &&
            notAlreadyFlipping &&
            !paidOutIds.current.has(updated.id)
          ) {
            // Pay out immediately without animation — creator was away
            paidOutIds.current.add(updated.id);
            const prize = Math.floor(updated.bet_amount * 2 * 0.9);
            if (updated.winner_username === currentUsername) {
              const wonBal = balance + prize;
              if (selectedCurrency === "coins") setCoinsBalance(wonBal);
              else setFunCoinsBalance(wonBal);
              window.dispatchEvent(new Event("balanceUpdate"));

              recordGameResult(updated.bet_amount, updated.bet_amount, {
                game_type: "coinflip",
                payout: prize,
                multiplier: 2,
                result: "win",
                currency: selectedCurrency,
                meta: { gameId: updated.id },
                discord: {
                  winner: updated.winner_username!,
                  loser:
                    updated.winner_username === updated.creator_username
                      ? (updated.joiner_username ?? "Unknown")
                      : updated.creator_username,
                  winner_avatar:
                    updated.winner_username === updated.creator_username
                      ? updated.creator_avatar
                      : updated.joiner_avatar,
                  loser_avatar:
                    updated.winner_username === updated.creator_username
                      ? updated.joiner_avatar
                      : updated.creator_avatar,
                  winner_side: updated.winner_side!,
                  loser_side:
                    updated.winner_side === "orange" ? "blue" : "orange",
                  total_value: prize,
                  game_id: updated.id,
                },
              });
              setTimeout(() => {
                playCoinflipWin();
                toast.success(
                  `You won a Coinflip! +${prize.toLocaleString()} ${selectedCurrency === "coins" ? "coins" : "fun coins"}`,
                  { duration: 6000 },
                );
              }, 5100);
            } else {
              recordGameResult(updated.bet_amount, -updated.bet_amount, {
                game_type: "coinflip",
                payout: 0,
                multiplier: 2,
                result: "loss",
                currency: selectedCurrency,
                meta: { gameId: updated.id },
                discord: {
                  winner: updated.winner_username!,
                  loser:
                    updated.winner_username === updated.creator_username
                      ? (updated.joiner_username ?? "Unknown")
                      : updated.creator_username,
                  winner_avatar:
                    updated.winner_username === updated.creator_username
                      ? updated.creator_avatar
                      : updated.joiner_avatar,
                  loser_avatar:
                    updated.winner_username === updated.creator_username
                      ? updated.joiner_avatar
                      : updated.creator_avatar,
                  winner_side: updated.winner_side!,
                  loser_side:
                    updated.winner_side === "orange" ? "blue" : "orange",
                  total_value: prize,
                  game_id: updated.id,
                },
              });
            }
            // Mark completed in DB via API
            fetch(`/api/coinflip/games/${updated.id}/complete`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...authHeaders },
              credentials: "include",
              body: JSON.stringify({
                winner_username: updated.winner_username,
                winner_side: updated.winner_side,
              }),
            }).catch(console.error);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "coinflip_games" },
        (payload) => {
          const inserted = payload.new as CoinflipGame;
          if (inserted.currency !== selectedCurrency) return;
          // Only prepend if not already present — never touch existing entries (some may have optimistic bot state)
          setGames((prev) =>
            prev.some((g) => g.id === inserted.id) ? prev : [inserted, ...prev],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency]);

  // Clear completed games every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const completedIds = games
        .filter((g) => g.status === "completed")
        .map((g) => g.id);
      if (completedIds.length === 0) return;
      setGames((prev) => prev.filter((g) => g.status !== "completed"));

      try {
        await fetch("/api/coinflip/games/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          credentials: "include",
          body: JSON.stringify({ game_ids: completedIds }),
        });
      } catch (error) {
        console.error("Error deleting completed games:", error);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [games]);

  // Dedicated subscription for the open view modal — re-subscribes whenever the viewed game id changes
  useEffect(() => {
    if (!viewGame) return;
    const gameId = viewGame.id;

    const channel = supabase
      .channel(`coinflip_view_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coinflip_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updated = payload.new as CoinflipGame;
          const currentView = viewGameRef.current;

          // Skip — this game is being handled locally (bot flip)
          if (localFlipIds.current.has(updated.id)) return;
          if (
            updated.status === "active" &&
            updated.joiner_username &&
            updated.winner_side &&
            updated.winner_username &&
            currentView?.creator_username === username &&
            !flipActiveRef.current
          ) {
            // Build game state with winner hidden (revealed after flip)
            const gameForFlip: CoinflipGame = {
              ...updated,
              winner_username: null,
              winner_side: null,
            };
            setViewGame(gameForFlip);
            startFlipSequence(
              gameForFlip,
              updated.winner_side,
              updated.winner_username,
              Math.floor(updated.bet_amount * 2 * 0.9),
            );
            return;
          }

          // Any other update (e.g. completed) — just refresh the view game state
          if (currentView?.id === gameId && !flipActiveRef.current) {
            setViewGame(updated);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewGame?.id, username, selectedCurrency]);

  const statusOrder: Record<string, number> = {
    active: 0,
    waiting: 1,
    completed: 2,
  };
  const sortedGames = [...games].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    return sortAsc ? a.bet_amount - b.bet_amount : b.bet_amount - a.bet_amount;
  });

  const creatingGameRef = React.useRef(false);
  async function createGame(side: CoinSide, amount: number) {
    if (!amount || !username) return;
    if (balance < amount) return alert("Insufficient balance");
    if (creatingGameRef.current) return;
    creatingGameRef.current = true;

    try {
      // Fetch user's top inventory item
      const invResponse = await fetch(
        `/api/users/inventory?username=${encodeURIComponent(username)}&limit=1&sort=value_desc`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          credentials: "include",
        },
      );

      let topItem = null;
      if (invResponse.ok) {
        const invData = await invResponse.json();
        topItem = invData.items?.[0] || null;
      }

      const newBal = balance - amount;
      if (selectedCurrency === "coins") setCoinsBalance(newBal);
      else setFunCoinsBalance(newBal);

      setStorageItem(selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance", newBal.toString());
      setStorageItem("mm2dice_balance_ts", Date.now().toString());
      // Lock balance polling for 30s during coinflip flow
      setStorageItem("mm2dice_balance_lock", (Date.now() + 30000).toString());

      window.dispatchEvent(new Event("balanceUpdate"));
      window.dispatchEvent(new CustomEvent("balanceAnimate", {
        detail: { from: balance, to: newBal }
      }));

      // Create game via API
      const createResponse = await fetch("/api/coinflip/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify(
          authBody({
            bet_amount: amount,
            creator_side: side,
            item_name: topItem?.name || "",
            item_image: topItem?.image || "",
            item_value: topItem?.value || 0,
            currency: selectedCurrency,
          }),
        ),
      });

      if (!createResponse.ok) {
        // Refund balance if creation fails
        if (selectedCurrency === "coins") setCoinsBalance(balance);
        else setFunCoinsBalance(balance);

        throw new Error("Failed to create game");
      }

      const newGame: CoinflipGame = await createResponse.json();

      setShowCreateModal(false);
      loadGames();
      
      // Automatically open the view modal for the newly created game
      openGameWithReplay(newGame);
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Failed to create game. Please try again.");
    } finally {
      creatingGameRef.current = false;
    }
  }

  // Countdown + flip sequence
  async function startFlipSequence(
    game: CoinflipGame,
    winnerSide: CoinSide,
    winnerUsername: string,
    prize: number,
    botName?: string,
    isReplay: boolean = false,
  ) {
    // Lock this game ID so realtime updates don't overwrite our local state
    localFlipIds.current.add(game.id);
    setPendingFlip({ game, winnerSide, winnerUsername, prize, botName });
    // Set the winner side BEFORE the flip starts so the correct GIF is ready
    setFlipWinnerSide(winnerSide);
    // No countdown — start flip immediately
    setFlipCountdown(null);
    setCardFlips((prev) => ({
      ...prev,
      [game.id]: { countdown: null, flipping: true, winnerSide },
    }));
    playCountdownGo();
    setFlipActive(true);

    // Wait for the GIF to play through
    await new Promise((r) => setTimeout(r, 2000));

    setFlipActive(false);

    // ── Reveal winner immediately (no API round-trip delay) ──────────────────
    setPendingFlip(null);
    setGames((prev) =>
      prev.map((g) =>
        g.id === game.id
          ? {
              ...g,
              status: "completed",
              winner_username: winnerUsername,
              winner_side: winnerSide,
              joiner_username: botName ?? g.joiner_username,
            }
          : g,
      ),
    );
    setViewGame((prev) =>
      prev?.id === game.id
        ? {
            ...prev,
            winner_username: winnerUsername,
            winner_side: winnerSide,
            joiner_username: botName ?? prev.joiner_username,
            status: "completed",
          }
        : prev,
    );
    // Clear card flip animation state now that winner is shown
    setCardFlips((prev) => {
      const n = { ...prev };
      delete n[game.id];
      return n;
    });

    // Award prize + play win/lose sound — only if not a replay and not already paid out
    if (!isReplay && !paidOutIds.current.has(game.id)) {
      paidOutIds.current.add(game.id);
      if (winnerUsername === username) {
        const wonBal = balance + prize;
        if (selectedCurrency === "coins") setCoinsBalance(wonBal);
        else setFunCoinsBalance(wonBal);

        setStorageItem(selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance", wonBal.toString());
        setStorageItem("mm2dice_balance_ts", Date.now().toString());
        // Extend lock to allow server to record result
        setStorageItem("mm2dice_balance_lock", (Date.now() + 10000).toString());

        window.dispatchEvent(new Event("balanceUpdate"));
        window.dispatchEvent(new CustomEvent("balanceAnimate", {
          detail: { from: balance, to: wonBal }
        }));

        recordGameResult(game.bet_amount, game.bet_amount, {
          game_type: "coinflip",
          payout: prize,
          multiplier: 2,
          result: "win",
          currency: selectedCurrency,
          meta: { gameId: game.id, winnerSide },
          discord: {
            winner: winnerUsername,
            loser:
              winnerUsername === game.creator_username
                ? (game.joiner_username ?? botName ?? "Unknown")
                : game.creator_username,
            winner_avatar:
              winnerUsername === game.creator_username
                ? game.creator_avatar
                : game.joiner_avatar,
            loser_avatar:
              winnerUsername === game.creator_username
                ? game.joiner_avatar
                : game.creator_avatar,
            winner_side: winnerSide,
            loser_side: winnerSide === "orange" ? "blue" : "orange",
            total_value: prize,
            game_id: game.id,
          },
        });
        playCoinflipWin();
        toast.success(
          `You won Coinflip #${game.id.slice(0, 6).toUpperCase()}! +${prize.toLocaleString()} ${selectedCurrency === "coins" ? "coins" : "fun coins"}`,
          { duration: 6000 },
        );
      } else {
        recordGameResult(game.bet_amount, -game.bet_amount, {
          game_type: "coinflip",
          payout: 0,
          multiplier: 2,
          result: "loss",
          currency: selectedCurrency,
          meta: { gameId: game.id, winnerSide },
          discord: {
            winner: winnerUsername,
            loser:
              winnerUsername === game.creator_username
                ? (game.joiner_username ?? botName ?? "Unknown")
                : game.creator_username,
            winner_avatar:
              winnerUsername === game.creator_username
                ? game.creator_avatar
                : game.joiner_avatar,
            loser_avatar:
              winnerUsername === game.creator_username
                ? game.joiner_avatar
                : game.creator_avatar,
            winner_side: winnerSide,
            loser_side: winnerSide === "orange" ? "blue" : "orange",
            total_value: prize,
            game_id: game.id,
          },
        });
        playCoinflipLose();
        toast.error(
          `You lost Coinflip #${game.id.slice(0, 6).toUpperCase()}. Better luck next time!`,
          { duration: 5000 },
        );
      }
    } // end paidOutIds guard

    // Mark game as completed via API — fire-and-forget, no need to await
    fetch(`/api/coinflip/games/${game.id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      credentials: "include",
      body: JSON.stringify(
        authBody({
          winner_username: winnerUsername,
          winner_side: winnerSide,
          joiner_username: botName ?? game.joiner_username,
        }),
      ),
    }).catch((error) => console.error("Error completing game:", error));

    // Remove completed card from list after 6s so user can see the result briefly
    setTimeout(() => {
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    }, 6000);
    // Unlock — realtime can update this game again
    localFlipIds.current.delete(game.id);
  }

  async function cancelGame(game: CoinflipGame) {
    if (game.creator_username !== username) return;
    if (game.status !== "waiting") return;

    try {
      const cancelResponse = await fetch(`/api/coinflip/games/${game.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify(authBody({})),
      });

      if (!cancelResponse.ok) {
        const errorData = await cancelResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to cancel game");
      }

      // Remove the game from the list
      setGames((prev) => prev.filter((g) => g.id !== game.id));
      if (viewGame?.id === game.id) {
        setViewGame(null);
      }
      toast.success("Game cancelled successfully");
    } catch (error) {
      console.error("Error cancelling game:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel game",
      );
    }
  }

  async function addBot(game: CoinflipGame) {
    if (game.status !== "waiting") return;
    if (addingBotRef.current.has(game.id)) return;
    addingBotRef.current.add(game.id);
    // Lock immediately so realtime doesn't trigger a second flip
    localFlipIds.current.add(game.id);

    try {
      const res = await fetch("/api/coinflip/add-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(
          authBody({ gameId: game.id, requestingUsername: username }),
        ),
      });

      if (!res.ok) {
        addingBotRef.current.delete(game.id);
        return;
      }

      const {
        botName,
        botAvatar,
        joinerSide,
        winnerSide,
        winnerUsername,
        prize,
      } = await res.json();

      // Build updated game with bot data — winner hidden until flip completes
      const updatedGame: CoinflipGame = {
        ...game,
        joiner_username: botName,
        joiner_avatar: botAvatar,
        joiner_side: joinerSide,
        joiner_item_image: "",
        joiner_item_name: "",
        status: "active",
        winner_username: null,
        winner_side: null,
        total_value: prize,
      };

      // Update list card AND view modal (if open) immediately with bot data
      setGames((prev) => prev.map((g) => (g.id === game.id ? updatedGame : g)));
      // If this game is currently open in the view modal, update it so the bot avatar shows
      if (viewGameRef.current?.id === game.id) {
        setViewGame(updatedGame);
      }
      startFlipSequence(
        updatedGame,
        winnerSide,
        winnerUsername,
        prize,
        botName,
      );
    } finally {
      addingBotRef.current.delete(game.id);
    }
  }

  async function joinGame(game: CoinflipGame) {
    if (!username || username === game.creator_username) return;
    if (game.status !== "waiting") return;
    if (joiningGameRef.current.has(game.id)) return;
    joiningGameRef.current.add(game.id);
    const amount = game.bet_amount;
    const currentBal = balance;
    if (currentBal < amount) return alert("Insufficient balance");

    try {
      // Fetch user's top inventory item
      const invResponse = await fetch(
        `/api/users/inventory?username=${encodeURIComponent(username)}&limit=1&sort=value_desc`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          credentials: "include",
        },
      );

      let topItem = null;
      if (invResponse.ok) {
        const invData = await invResponse.json();
        topItem = invData.items?.[0] || null;
      }

      const newBal = currentBal - amount;
      if (selectedCurrency === "coins") setCoinsBalance(newBal);
      else setFunCoinsBalance(newBal);

      setStorageItem(selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance", newBal.toString());
      setStorageItem("mm2dice_balance_ts", Date.now().toString());
      // Lock balance polling for 30s during coinflip flow
      setStorageItem("mm2dice_balance_lock", (Date.now() + 30000).toString());

      window.dispatchEvent(new Event("balanceUpdate"));
      window.dispatchEvent(new CustomEvent("balanceAnimate", {
        detail: { from: currentBal, to: newBal }
      }));

      // Join game via API
      const joinResponse = await fetch(`/api/coinflip/games/${game.id}/join`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify(
          authBody({
            item_name: topItem?.name || "",
            item_image: topItem?.image || "",
            item_value: topItem?.value || 0,
          }),
        ),
      });

      if (!joinResponse.ok) {
        // Refund balance if join fails
        if (selectedCurrency === "coins") setCoinsBalance(currentBal);
        else setFunCoinsBalance(currentBal);

        const errorData = await joinResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to join game");
      }

      const { game: updatedGame, result } = await joinResponse.json();

      // Update the game card immediately
      setGames((prev) => prev.map((g) => (g.id === game.id ? updatedGame : g)));
      startFlipSequence(
        updatedGame,
        result.winner_side,
        result.winner_username,
        result.total_pot,
      );
      joiningGameRef.current.delete(game.id);
    } catch (error) {
      console.error("Error joining game:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to join game. Please try again.",
      );
      joiningGameRef.current.delete(game.id);
    }
  }

  // Opens a completed game's view modal and replays the flip animation from scratch
  function openGameWithReplay(game: CoinflipGame) {
    if (
      game.status === "completed" &&
      game.winner_side &&
      game.winner_username &&
      !flipActiveRef.current
    ) {
      // Open modal with winner hidden so it starts in pre-result state
      const gameHidden: CoinflipGame = {
        ...game,
        winner_username: null,
        winner_side: null,
      };
      setViewGame(gameHidden);
      setFlipCountdown(null);
      setFlipWinnerSide(game.winner_side);
      setFlipActive(true);
      playCountdownGo();
      // After animation, reveal the winner
      setTimeout(() => {
        setFlipActive(false);
        setViewGame((prev) =>
          prev?.id === game.id
            ? { ...game } // restore real winner data
            : prev,
        );
      }, 2000);
    } else {
      setViewGame(game);
    }
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 min-h-screen">
      <MediaPreloader />
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12 relative z-20 mt-8">
        <CreateCoinflipRow
          onCreate={createGame}
          balance={balance}
        />

        {/* Sort Dropdown */}
        <div className="relative group lg:ml-auto w-full sm:w-auto">
           <div className="flex items-center gap-3 bg-[#1c1a2e] px-5 h-[50px] rounded-xl cursor-pointer hover:bg-white/5 transition-all w-full sm:w-[160px] justify-between shadow-xl">
             <span className="text-[#6b7a99] font-black text-xs uppercase tracking-widest">{sortAsc ? "Lowest Price" : "Recent"}</span>
             <ChevronDown size={14} className="text-[#6b7a99]" />
           </div>
           
           <div className="absolute top-full right-0 mt-2 w-full bg-[#1c1a2e] rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[30]">
             <button onClick={() => setSortAsc(false)} className="w-full text-left px-6 py-4 text-xs font-black uppercase text-white/40 hover:text-white hover:bg-white/5 transition-all border-b border-white/5">Recent</button>
             <button onClick={() => setSortAsc(true)} className="w-full text-left px-6 py-4 text-xs font-black uppercase text-white/40 hover:text-white hover:bg-white/5 transition-all">Lowest Price</button>
           </div>
        </div>
      </div>

      {/* View Game Modal */}
      <AnimatePresence>
      {viewGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-md pt-[56px] sm:pt-0"
          onClick={() => setViewGame(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="rounded-none sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative w-full sm:max-w-[1000px] border border-white/5"
            style={{
              backgroundColor: "#12111d",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Forest background */}
            {/* Removed forest background image */}

            {/* Close */}
            <button
              onClick={() => setViewGame(null)}
              className="absolute top-4 right-4 text-[#6b7a99] hover:text-white z-30 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Redesigned Modal Container */}
            <div className="flex flex-col h-full bg-[#12111d] relative">
              {/* Header Icon */}
              <div className="flex justify-center pt-8 pb-4">
                <img src="/logo.png" alt="trav.bet logo" className="w-[42px] h-[42px] object-contain opacity-40 grayscale" />
              </div>

              {/* Dueling Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-10 py-10 sm:py-6 relative min-h-[400px] sm:min-h-0">
                
                {/* Player 1 (Top on mobile, Left on desktop) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0 relative z-20">
                  {/* Avatar Wrapper */}
                  <div className="relative z-20">
                    <div className={`w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-3xl p-1.5 sm:p-2 transition-all duration-500 ${viewGame.winner_username === viewGame.creator_username ? 'bg-[#22c55e] shadow-[0_0_30px_rgba(34,197,94,0.5)]' : (viewGame.winner_username ? 'bg-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-white/5')}`}>
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-[#0d0b1a]">
                        <img src={viewGame.creator_avatar || 'https://via.placeholder.com/130'} alt="" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>

                  {/* Info Pill (Desktop Only) */}
                  <div className="hidden sm:flex ml-[-45px] pl-16 pr-8 py-5 bg-[#1a1a2e]/60 backdrop-blur-md rounded-none min-w-[240px] items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-white font-black text-lg leading-none mb-1 tracking-tight">{viewGame.creator_username}</span>
                        <span className="text-[#be30ff] text-[11px] font-[1000] uppercase tracking-[0.2em]">
                          {isBot(viewGame.creator_username) ? 'BOT' : `Level ${playerLevels[viewGame.creator_username] || '...'}`}
                        </span>
                     </div>
                     <span className="text-[#be30ff]/60 text-[12px] font-black ml-4">50%</span>
                  </div>

                  {/* Mobile Info (Vertical stack) */}
                  <div className="flex sm:hidden flex-col items-center gap-1">
                    <span className="text-white font-black text-xl tracking-tight leading-none">{viewGame.creator_username}</span>
                    <span className="text-[#be30ff] text-[11px] font-black uppercase tracking-[0.2em]">
                      {isBot(viewGame.creator_username) ? 'BOT' : `Level ${playerLevels[viewGame.creator_username] || '...'}`}
                    </span>
                  </div>
                </div>

                {/* Center Coin / VS */}
                <div className="my-8 sm:my-0 relative sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 scale-[1.1] sm:scale-[1.2] z-10 flex items-center justify-center">
                    <CenterVS
                      countdown={flipCountdown}
                      flipping={flipActive}
                      winnerSide={flipWinnerSide}
                      joinerUsername={viewGame.joiner_username}
                      viewGame={viewGame}
                      size={160}
                    />
                </div>

                {/* Player 2 (Bottom on mobile, Right on desktop) */}
                <div className="flex flex-col sm:flex-row-reverse items-center gap-4 sm:gap-0 relative z-20">
                  {/* Avatar Wrapper */}
                  <div className="relative z-20">
                    <div className={`w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-3xl p-1.5 sm:p-2 transition-all duration-500 ${viewGame.status === 'waiting' ? 'bg-[#be30ff]/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : (viewGame.winner_username === viewGame.joiner_username ? 'bg-[#22c55e] shadow-[0_0_30px_rgba(34,197,94,0.5)]' : (viewGame.winner_username ? 'bg-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-white/5'))}`}>
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-[#0d0b1a] flex items-center justify-center">
                        {viewGame.joiner_avatar ? (
                          <img src={viewGame.joiner_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white/10 text-5xl font-black">?</span>
                        )}
                      </div>
                    </div>

                    {/* Add Bot Button (Mobile view: bottom centered) */}
                    {viewGame.status === "waiting" && viewGame.creator_username === username && (
                      <button
                        onClick={() => addBot(viewGame)}
                        className="absolute sm:top-full mt-3 left-1/2 -translate-x-1/2 px-6 h-10 bg-[#be30ff]/10 hover:bg-[#be30ff]/20 rounded-xl text-[#be30ff] text-[10px] font-[1000] uppercase tracking-[0.2em] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap z-30"
                      >
                        <Plus size={14} strokeWidth={4} />
                        Call Bot
                      </button>
                    )}
                  </div>

                  {/* Info Pill (Desktop Only) */}
                  <div className="hidden sm:flex mr-[-45px] pr-16 pl-8 py-5 bg-[#1a1a2e]/60 backdrop-blur-md rounded-none min-w-[240px] items-center justify-between">
                     <span className="text-[#be30ff]/60 text-[12px] font-black mr-4">50%</span>
                     <div className="flex flex-col items-end">
                        <span className="text-white font-black text-lg leading-none mb-1 tracking-tight">{viewGame.joiner_username || 'Waiting...'}</span>
                        <span className="text-[#be30ff] text-[11px] font-[1000] uppercase tracking-[0.2em]">
                          {viewGame.joiner_username ? (isBot(viewGame.joiner_username) ? 'BOT' : `Level ${playerLevels[viewGame.joiner_username] || '...'}`) : 'EMPTY'}
                        </span>
                     </div>
                  </div>

                  {/* Mobile Info (Vertical stack) */}
                  <div className="flex sm:hidden flex-col items-center gap-1">
                    <span className="text-white font-black text-xl tracking-tight leading-none">{viewGame.joiner_username || 'Waiting...'}</span>
                    <span className="text-[#be30ff] text-[11px] font-black uppercase tracking-[0.2em]">
                      {viewGame.joiner_username ? (isBot(viewGame.joiner_username) ? 'BOT' : `Level ${playerLevels[viewGame.joiner_username] || '...'}`) : 'EMPTY'}
                    </span>
                  </div>
                </div>
              </div>



              {/* Spacer (Desktop Only) */}
              <div className="hidden sm:block h-[240px]" />

                {/* Action Row */}
                {viewGame.status === "waiting" && viewGame.creator_username !== username && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => joinGame(viewGame)}
                      className="btn-3d btn-3d-purple w-full max-w-[400px] h-[52px] rounded-xl uppercase text-[15px] font-black tracking-widest"
                    >
                      Join Duel for {viewGame.bet_amount.toLocaleString()}
                    </button>
                  </div>
                )}


                {/* Modal Footer Bar */}
                <div className="mt-auto bg-black/20 px-8 py-5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <span className="text-[#6b7a99] text-[13px] font-medium">
                         {viewGame.status === 'completed' ? 'Ended at' : 'Created at'} {new Date(viewGame.created_at).toLocaleString('en-US', { 
                           month: 'numeric', 
                           day: 'numeric', 
                           year: '2-digit', 
                           hour: 'numeric', 
                           minute: '2-digit', 
                           hour12: true 
                         }).replace(',', '')}
                       </span>
                   </div>
                   
                   <div className="flex items-center gap-3">
                      {/* Provably Fair */}
                      <button 
                         onClick={() => setShowFairModal(true)}
                         className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-[#be30ff] hover:bg-white/10 transition-all group"
                         title="Provably Fair"
                      >
                         <Shield size={18} className="group-hover:scale-110 transition-transform" />
                      </button>

                      {/* Share Button */}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Link copied to clipboard!");
                        }}
                        className="px-6 h-10 rounded-xl bg-white/5 text-white/90 text-sm font-bold hover:bg-white/10 transition-all active:scale-95"
                      >
                        Share
                      </button>
                   </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <AnimatePresence mode="popLayout">
        {sortedGames.map((game, idx) => {
          const isCompleted = game.status === "completed";
          const isWaiting = game.status === "waiting";
          const canJoin = isWaiting && game.creator_username !== username;
          const creatorWon =
            isCompleted && game.winner_username === game.creator_username;
          const joinerWon =
            isCompleted && game.winner_username === game.joiner_username;
          const cardFlip = cardFlips[game.id] ?? null;

          return (
            <motion.div
              layout
              key={game.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex flex-col rounded-2xl overflow-hidden relative bg-[#1c1a2e] shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[#be30ff10] transition-all duration-300"
            >
              {/* MOBILE: Wide horizontal card layout */}
              <div
                className="flex sm:hidden flex-col w-full relative z-10 p-6 gap-6 min-h-[280px] py-8"
              >
                <div className="flex items-center justify-between w-full">
                  {/* Left Player */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative">
                      <Avatar
                        src={game.creator_avatar}
                        username={game.creator_username}
                        side={game.creator_side}
                        size={60}
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <CoinBadge side={game.creator_side} size={18} />
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-white truncate max-w-[80px] text-center">
                      {game.creator_username}
                    </span>
                  </div>

                  {/* Center Info */}
                  <div className="flex flex-col items-center gap-1 px-4 border-x border-white/5 mx-2">
                    <div className="flex items-center gap-1.5 mb-1 bg-black/20 px-3 py-1.5 rounded-full">
                      <img src={COIN_IMG} alt="" width={16} height={16} />
                      <span className="text-[#be30ff] font-black text-[15px]">
                        {game.total_value.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[#4b5a70] font-black text-[12px] tracking-widest uppercase">VS</span>
                  </div>

                  {/* Right Player */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative">
                      {game.joiner_username ? (
                        <>
                          <Avatar
                            src={game.joiner_avatar}
                            username={game.joiner_username}
                            side={game.joiner_side!}
                            size={60}
                          />
                          <div className="absolute -bottom-1 -right-1">
                            <CoinBadge side={game.joiner_side!} size={18} />
                          </div>
                        </>
                      ) : (
                        <div
                          className="rounded-xl flex items-center justify-center bg-white/5 border border-dashed border-white/10"
                          style={{ width: 60, height: 60 }}
                        >
                          <span className="text-[#4b5a70] text-3xl font-black">?</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-white/40 truncate max-w-[80px] text-center">
                      {game.joiner_username || "Waiting..."}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="mt-auto flex gap-3 w-full">
                   {canJoin && !game.winner_username && (
                      <button
                        onClick={() => joinGame(game)}
                        className="btn-3d btn-3d-purple flex-1 h-[48px] rounded-xl text-[13px] uppercase font-black tracking-widest"
                      >
                        JOIN DUEL
                      </button>
                    )}
                    {isWaiting && game.creator_username === username && !game.winner_username && (
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => addBot(game)}
                          disabled={addingBotRef.current.has(game.id)}
                          className="btn-3d btn-3d-purple flex-1 h-[48px] rounded-xl text-[13px] uppercase font-black disabled:opacity-40"
                        >
                          +BOT
                        </button>
                        <button
                          onClick={() => cancelGame(game)}
                          className="btn-3d btn-3d-red flex-1 h-[48px] rounded-xl text-[13px] uppercase font-black"
                        >
                          CANCEL
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => openGameWithReplay(game)}
                      className="h-[48px] px-6 rounded-xl text-[13px] uppercase font-black bg-[#be30ff]/10 text-[#be30ff] border border-[#be30ff]/20 active:scale-95 transition-all flex items-center justify-center whitespace-nowrap"
                    >
                      VIEW
                    </button>
                </div>
              </div>

              {/* DESKTOP: vertical layout */}
              <div
                className="hidden sm:flex flex-col w-full"
                style={{ minHeight: 280 }}
              >
                {/* Pot value */}
                <div className="flex items-center justify-center gap-2 pt-5 pb-2">
                  <img src={COIN_IMG} alt="" width={20} height={20} />
                  <span className="text-white font-black text-[20px]">
                    {game.total_value.toLocaleString()}
                  </span>
                </div>

                {/* Avatars + VS/countdown/gif */}
                <div
                  className="relative flex items-center justify-center gap-3 py-4 px-4"
                  style={{ minHeight: 110 }}
                >
                  <div
                    className="flex flex-col items-center gap-2 flex-1"
                    style={{
                      opacity: joinerWon ? 0.2 : 1,
                      transform: creatorWon
                        ? "translateX(calc(50% + 8px))"
                        : "translateX(0)",
                    }}
                  >
                    <div className="relative">
                      <Avatar
                        src={game.creator_avatar}
                        username={game.creator_username}
                        side={game.creator_side}
                        size={80}
                      />
                      <div className="absolute -bottom-1 -right-1">
                        <CoinBadge side={game.creator_side} size={22} />
                      </div>
                    </div>
                    <span className="text-[13px] font-black text-white truncate w-full text-center">
                      {game.creator_username}
                    </span>
                  </div>

                  <div
                    className="shrink-0 flex items-center justify-center transition-all duration-300"
                    style={{ width: 80 }}
                  >
                    <AnimatePresence mode="wait">
                    {cardFlip ? (
                      cardFlip.countdown !== null ? (
                        <motion.span
                          key="countdown"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.5 }}
                          className="font-black text-white"
                          style={{
                            fontSize: 42,
                            lineHeight: 1,
                            textShadow: "0 0 20px rgba(255,255,255,0.8)",
                          }}
                        >
                          {cardFlip.countdown}
                        </motion.span>
                      ) : (
                        <motion.div
                          key="media"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-center"
                        >
                          <CardFlipMedia
                            winnerSide={cardFlip.winnerSide!}
                            size={80}
                            isFlipping={cardFlip.flipping}
                          />
                        </motion.div>
                      )
                    ) : (
                      <motion.span
                        key="vs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isCompleted ? 0 : 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[#4b5a70] font-black text-[13px]"
                      >
                        VS
                      </motion.span>
                    )}
                    </AnimatePresence>
                  </div>

                  <div
                    className="flex flex-col items-center gap-2 flex-1"
                    style={{
                      opacity: creatorWon ? 0.2 : 1,
                      transform: joinerWon
                        ? "translateX(calc(-50% - 8px))"
                        : "translateX(0)",
                    }}
                  >
                    <div className="relative">
                      {game.joiner_username ? (
                        <>
                          <Avatar
                            src={game.joiner_avatar}
                            username={game.joiner_username}
                            side={game.joiner_side!}
                            size={80}
                          />
                          <div className="absolute -bottom-1 -right-1">
                            <CoinBadge side={game.joiner_side!} size={22} />
                          </div>
                        </>
                      ) : (
                        <div
                          className="rounded-lg flex items-center justify-center bg-white/5"
                          style={{ width: 80, height: 80 }}
                        >
                          <span className="text-[#4b5a70] text-2xl font-bold">
                            ?
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[13px] font-black text-white truncate w-full text-center">
                      {game.joiner_username || "..."}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-center gap-2 px-3 pb-4 mt-auto">
                  <div className="flex gap-2 w-full">
                    {canJoin && !game.winner_username && (
                      <button
                        onClick={() => joinGame(game)}
                        className="btn-3d btn-3d-purple flex-1 h-[38px] rounded-xl text-[12px] uppercase font-black"
                      >
                        JOIN
                      </button>
                    )}
                    {isWaiting &&
                      game.creator_username === username &&
                      !game.winner_username && (
                        <>
                          <button
                            onClick={() => addBot(game)}
                            disabled={addingBotRef.current.has(game.id)}
                            className="btn-3d btn-3d-purple flex-1 h-[38px] rounded-xl text-[12px] uppercase font-black disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +BOT
                          </button>
                          <button
                            onClick={() => cancelGame(game)}
                            className="btn-3d btn-3d-red flex-1 h-[38px] rounded-xl text-[12px] uppercase font-black"
                          >
                            CANCEL
                          </button>
                        </>
                      )}
                  </div>
                  <button
                    onClick={() => openGameWithReplay(game)}
                    className="h-[38px] rounded-xl text-[12px] uppercase font-black bg-[#be30ff]/10 text-[#be30ff] hover:bg-[#be30ff]/20 transition-all"
                    style={{ width: 72 }}
                  >
                    VIEW
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>

      <FairModal
        open={showFairModal}
        onClose={() => setShowFairModal(false)}
        gameName="Coinflip"
        disableRotation={flipActive}
      />
    </div>
  );
}
