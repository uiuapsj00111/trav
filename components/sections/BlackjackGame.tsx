"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { recordGameResult } from "@/lib/recordGame";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";
import FairModal from "./FairModal";
import { useFair } from "@/contexts/FairContext";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

interface Card {
  id: number;
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

type GamePhase = "betting" | "playing" | "dealer" | "result";
type Result = "win" | "lose" | "push" | "blackjack" | null;

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];
const RED_SUITS: Suit[] = ["♥", "♦"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of SUITS)
    for (const rank of RANKS) deck.push({ id: id++, suit, rank });
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank);
}

function handValue(hand: Card[]): number {
  let total = 0,
    aces = 0;
  for (const c of hand) {
    if (c.hidden) continue;
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBust(hand: Card[]) {
  return handValue(hand) > 21;
}
function isBlackjack(hand: Card[]) {
  return hand.length === 2 && handValue(hand) === 21;
}

const BET_AMOUNTS = [100, 500, 1000, 5000, 10000];

// ── Sound engine ──────────────────────────────────────────────────────────────
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { _bjAudioCtx?: AudioContext };
  if (!w._bjAudioCtx) w._bjAudioCtx = new AudioContext();
  if (w._bjAudioCtx.state === "suspended") w._bjAudioCtx.resume();
  return w._bjAudioCtx;
}

function playCardDeal() {
  if (
    typeof window !== "undefined" &&
    getStorageItem("mm2dice_muted") === "true"
  )
    return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.6;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2800;
  filter.Q.value = 0.8;
  src.connect(filter);
  filter.connect(ctx.destination);
  src.start();
}

function playChipClick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

function playWin() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + i * 0.1;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

function playBlackjack() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [523, 659, 784, 1047, 1319].forEach((freq, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + i * 0.08;
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

function playLose() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

function playBust() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [260, 200, 150].forEach((freq, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + i * 0.1;
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playPush() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  [440, 440].forEach((freq, i) => {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      t = ctx.currentTime + i * 0.15;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

function CardDeck() {
  return (
    <div className="absolute top-4 lg:top-6 right-4 lg:right-8 w-20 h-28 lg:w-28 lg:h-40 z-20 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-full h-full rounded-lg lg:rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: "#2e1065",
            top: -i * 2,
            right: -i * 2,
            zIndex: 10 - i,
            transform: `rotate(${i * 0.5}deg)`,
          }}
        >
          {i === 0 && (
            <img
              src="/logo.png"
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                margin: "auto",
                width: "70%",
                height: "70%",
                objectFit: "contain",
                opacity: 0.25,
              }}
            />
          )}
        </div>
      ))}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] lg:text-[10px] font-black text-[#a855f7]/40 uppercase tracking-[0.2em]">
        The Deck
      </div>
    </div>
  );
}

function PlayingCard({ card, index }: { card: Card; index: number }) {
  const isRed = RED_SUITS.includes(card.suit);
  const wasHidden = useRef(card.hidden);
  const [justRevealed, setJustRevealed] = useState(false);

  useEffect(() => {
    if (wasHidden.current === true && card.hidden === false) {
      setJustRevealed(true);
      const t = setTimeout(() => setJustRevealed(false), 500);
      return () => clearTimeout(t);
    }
    wasHidden.current = card.hidden;
  }, [card.hidden]);

  return (
    <div
      className="w-[75px] lg:w-[110px] h-[105px] lg:h-[154px]"
      style={{
        flexShrink: 0,
        perspective: 700,
        animation: `dealCard 0.4s cubic-bezier(0.34, 1.25, 0.64, 1) ${index * 120}ms both`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: !card.hidden && !justRevealed ? "rotateY(180deg)" : undefined,
          animation: justRevealed ? "flipCard 0.45s cubic-bezier(0.4,0,0.2,1) forwards" : undefined,
          transition: "none",
        }}
      >
        <div
          className="absolute inset-0 rounded-lg lg:rounded-xl bg-[#2e1065] shadow-[0_6px_18px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <img
            src="/logo.png"
            alt=""
            style={{ width: "72%", height: "72%", objectFit: "contain", opacity: 0.3 }}
          />
        </div>
        <div
          className="absolute inset-0 rounded-lg lg:rounded-xl bg-white shadow-[0_6px_18px_rgba(0,0,0,0.55),2px_2px_0_rgba(0,0,0,0.12)] flex flex-col justify-between p-1.5 lg:p-2.5"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div style={{ lineHeight: 1, color: isRed ? "#e11d48" : "#111" }}>
            <div className="text-[12px] lg:text-[18px] font-black">{card.rank}</div>
            <div className="text-[10px] lg:text-[14px] mt-[-2px]">{card.suit}</div>
          </div>
          <div className="text-center text-[24px] lg:text-[36px] leading-none" style={{ color: isRed ? "#e11d48" : "#111" }}>
            {card.suit}
          </div>
          <div className="flex flex-col items-end" style={{ lineHeight: 1, color: isRed ? "#e11d48" : "#111", transform: "rotate(180deg)" }}>
            <div className="text-[12px] lg:text-[18px] font-black">{card.rank}</div>
            <div className="text-[10px] lg:text-[14px] mt-[-2px]">{card.suit}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({
  value,
  bust,
  bj,
}: {
  value: number;
  bust: boolean;
  bj: boolean;
}) {
  return (
    <div
      className="inline-flex items-center justify-center px-2 lg:px-3.5 py-1 rounded-full font-black text-[10px] lg:text-[14px]"
      style={{
        background: bust
          ? "rgba(239,68,68,0.18)"
          : bj
            ? "rgba(168,85,247,0.18)"
            : "rgba(255,255,255,0.08)",
        color: bust ? "#ef4444" : bj ? "#a855f7" : "rgba(255,255,255,0.75)",
      }}
    >
      {bust ? "BUST" : bj ? "BJ!" : value}
    </div>
  );
}

export default function BlackjackGame() {
  const {
    isMuted,
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
  } = useCurrency();
  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const COIN_IMG = COIN_ICONS[selectedCurrency];

  const [bet, setBet] = useState(0);
  const [pendingBet, setPendingBet] = useState(1);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [result, setResult] = useState<Result>(null);
  const [message, setMessage] = useState("");
  const [isDealing, setIsDealing] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isFairModalOpen, setIsFairModalOpen] = useState(false);
  const { state: fairState } = useFair();

  useEffect(() => {
    const user = getStorageItem("mm2dice_user");
    setUsername(user);
    setDeck(createDeck());
    // Clean up balance lock if user navigates away mid-game
    return () => {
      removeStorageItem("mm2dice_balance_lock");
    };
  }, []);

  const updateBalance = useCallback(
    (val: number | ((prev: number) => number)) => {
      const balanceKey = selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";
      
      if (selectedCurrency === "coins") {
        setCoinsBalance(val);
        // Handle functional update for localStorage sync
        if (typeof val === 'function') {
          const newVal = val(coinsBalance);
          setStorageItem(balanceKey, newVal.toString());
        } else {
          setStorageItem(balanceKey, val.toString());
        }
      } else {
        setFunCoinsBalance(val);
        if (typeof val === 'function') {
          const newVal = val(funCoinsBalance);
          setStorageItem(balanceKey, newVal.toString());
        } else {
          setStorageItem(balanceKey, val.toString());
        }
      }

      setStorageItem("mm2dice_balance_ts", Date.now().toString());
      window.dispatchEvent(new CustomEvent("balanceUpdate"));
    },
    [selectedCurrency, setCoinsBalance, setFunCoinsBalance],
  );

  function addBet(amount: number) {
    if (phase !== "betting") return;
    const add = Math.min(amount, balance - pendingBet);
    if (add <= 0) return;
    playChipClick();
    setPendingBet((prev) => prev + add);
  }

  function halfBet() {
    if (pendingBet === 0) return;
    setPendingBet((prev) => Math.floor(prev / 2));
  }

  function doubleBet() {
    const d = Math.min(pendingBet * 2, balance);
    if (d > 0) setPendingBet(d);
  }

  function maxBet() {
    playChipClick();
    setPendingBet(balance);
  }

  function clearBet() {
    setPendingBet(0);
  }

  function drawCard(currentDeck: Card[]): [Card, Card[]] {
    const nd = [...currentDeck];
    if (nd.length < 10) nd.push(...createDeck());
    return [nd.pop()!, nd];
  }

  async function deal() {
    if (pendingBet <= 0 || pendingBet > balance || isDealing) {
      if (pendingBet > balance) alert("Insufficient balance.");
      return;
    }
    if (!username) {
      window.dispatchEvent(new CustomEvent("openLogin"));
      return;
    }

    setIsDealing(true);
    setBet(pendingBet);

    // Lock balance polling so the periodic refresh doesn't restore the
    // pre-bet server balance    // Keep lock 120s for the rest of hand
    setStorageItem("mm2dice_balance_lock", (Date.now() + 120000).toString());
    setStorageItem("mm2dice_balance_ts", Date.now().toString());

    // Deduct bet immediately
    updateBalance((prev) => prev - pendingBet);

    const freshDeck = createDeck();
    const p1 = freshDeck.pop()!;
    const d1 = freshDeck.pop()!;
    const p2 = freshDeck.pop()!;
    const d2 = { ...freshDeck.pop()!, hidden: true };

    setDeck(freshDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setResult(null);
    setMessage("");

    await new Promise((r) => setTimeout(r, 100));
    setPlayerHand([p1]);
    playCardDeal();
    await new Promise((r) => setTimeout(r, 200));
    setDealerHand([d1]);
    playCardDeal();
    await new Promise((r) => setTimeout(r, 200));
    setPlayerHand([p1, p2]);
    playCardDeal();
    await new Promise((r) => setTimeout(r, 200));
    setDealerHand([d1, d2]);
    playCardDeal();

    if (handValue([p1, p2]) === 21) {
      await new Promise((r) => setTimeout(r, 400));
      const revealed = [d1, { ...d2, hidden: false }];
      setDealerHand(revealed);
      const dv = handValue(revealed);
      if (dv === 21) {
        // Keep lock 5s so server update lands before poll timer fires
        setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString());
        setResult("push");
        setMessage("Push — both Blackjack");
        updateBalance((prev) => prev + pendingBet); // Return bet
        playPush();
        recordGameResult(pendingBet, 0, {
          game_type: "blackjack",
          payout: pendingBet,
          currency: selectedCurrency,
          result: "push",
        });
      } else {
        // Keep lock 5s so server update lands before poll timer fires
        setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString());
        // Standard Blackjack payout (3:2) is 2.5x total (1.5x profit + 1x bet)
        const payout = Math.floor(pendingBet * 2.5);
        setResult("blackjack");
        setMessage(`Blackjack! +${payout.toLocaleString()}`);
        updateBalance((prev) => prev + payout);
        playBlackjack();
        recordGameResult(pendingBet, payout - pendingBet, {
          game_type: "blackjack",
          payout,
          multiplier: 2.5,
          currency: selectedCurrency,
          result: "blackjack",
        });
      }
      setPhase("result");
    } else {
      setPhase("playing");
    }
    setIsDealing(false);
  }

  async function hit() {
    if (phase !== "playing" || isDealing) return;
    setIsDealing(true);
    const [card, nd] = drawCard(deck);
    setDeck(nd);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    playCardDeal();
    if (handValue(newHand) > 21) {
      await new Promise((r) => setTimeout(r, 300));
      setDealerHand((h) => h.map((c) => ({ ...c, hidden: false })));
      playBust();
      // Keep lock 5s so server update lands before poll timer fires
      setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString());
      setResult("lose");
      setMessage("Bust! Dealer wins.");
      setPhase("result");
      // Already deducted on deal
      recordGameResult(bet, -bet, {
        game_type: "blackjack",
        payout: 0,
        currency: selectedCurrency,
        result: "lose",
      });
    } else if (handValue(newHand) === 21) {
      await new Promise((r) => setTimeout(r, 300));
      await standWith(newHand, deck, bet);
      setIsDealing(false);
      return;
    }
    setIsDealing(false);
  }

  async function standWith(pHand: Card[], currentDeck: Card[], activeBet: number) {
    setIsDealing(true);
    setPhase("dealer");
    const playerVal = handValue(pHand);
    let dHand = dealerHand.map((c) => ({ ...c, hidden: false }));
    setDealerHand(dHand);
    await new Promise((r) => setTimeout(r, 500));
    let cd = [...currentDeck];
    while (handValue(dHand) < 17) {
      const [card, nd] = drawCard(cd);
      cd = nd;
      dHand = [...dHand, card];
      setDealerHand([...dHand]);
      playCardDeal();
      await new Promise((r) => setTimeout(r, 450));
    }
    setDeck(cd);
    const dealerVal = handValue(dHand);
    let res: Result;
    let payout = 0;
    let msg = "";
    if (dealerVal > 21 || playerVal > dealerVal) {
      res = "win";
      // Standard win is 2x (return bet + profit equal to bet)
      payout = Math.floor(activeBet * 2);
      msg = `You win +${payout.toLocaleString()}!`;
      playWin();
    } else if (playerVal === dealerVal) {
      res = "push";
      payout = activeBet;
      msg = "Push — bets returned";
      playPush();
    } else {
      res = "lose";
      msg = "Dealer wins.";
      playLose();
    }
    
    if (payout > 0) {
      updateBalance((prev) => prev + payout);
    }

    // Keep lock 5s so server update lands before poll timer fires
    setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString());
    setResult(res);
    setMessage(msg);
    setPhase("result");
    setIsDealing(false);

    // Add record game
    const dbResult =
      res === "push" ? "push" : res === "blackjack" ? "win" : res;
    recordGameResult(activeBet, payout - activeBet, {
      game_type: "blackjack",
      payout,
      multiplier: Math.round((payout / activeBet) * 100) / 100 || 0,
      currency: selectedCurrency,
      result: dbResult,
    });
  }

  async function stand() {
    if (phase !== "playing" || isDealing) return;
    await standWith(playerHand, deck, bet);
  }

  async function doubleDown() {
    if (phase !== "playing" || playerHand.length !== 2 || isDealing) return;
    const canAfford = balance >= bet;
    if (!canAfford) {
      alert("Insufficient balance for double down.");
      return;
    }
    const extra = bet;
    setIsDealing(true);
    
    // Deduct extra bet immediately
    updateBalance((prev) => prev - extra);
    
    const newBet = bet + extra;
    setBet(newBet);
    const [card, nd] = drawCard(deck);
    setDeck(nd);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    playCardDeal();
    await new Promise((r) => setTimeout(r, 400));
    if (handValue(newHand) > 21) {
      setDealerHand((h) => h.map((c) => ({ ...c, hidden: false })));
      playBust();
      // Keep lock 5s so server update lands before poll timer fires
      setStorageItem("mm2dice_balance_lock", (Date.now() + 5000).toString());
      setResult("lose");
      setMessage("Bust! Dealer wins.");
      setPhase("result");
      setIsDealing(false);
      // Already deducted on deal + double down extra
      recordGameResult(newBet, -newBet, {
        game_type: "blackjack",
        payout: 0,
        currency: selectedCurrency,
        result: "lose",
      });
    } else {
      setIsDealing(false);
      await standWith(newHand, nd, newBet);
    }
  }

  function newGame() {
    // Do NOT clear the balance lock here — the 5s cooldown lock set at game end
    // must remain active until it expires naturally so refreshBalances() can't
    // fetch the stale server balance in the window between game end and the
    // next deal() setting its own 120s lock.
    setPhase("betting");
    setResult(null);
    setMessage("");
    setPlayerHand([]);
    setDealerHand([]);
    setPendingBet(0);
    setBet(0);
    setDeck(createDeck());
  }

  const playerVal = handValue(playerHand);
  const dealerVal = handValue(dealerHand);
  const canHit = phase === "playing" && !isDealing;
  const canStand = phase === "playing" && !isDealing;
  const canDouble =
    phase === "playing" &&
    playerHand.length === 2 &&
    balance >= bet &&
    !isDealing;

  const resultColor =
    result === "win" || result === "blackjack"
      ? "#5cdf9a"
      : result === "lose"
        ? "#ef4444"
        : result === "push"
          ? "#94a3b8"
          : "white";

  return (
    <div className="flex flex-col h-full bg-[#0d0b1a]">
      <style>{`
          @keyframes dealCard {
            0% { 
              opacity: 0; 
              transform: translate(450px, -280px) scale(0.5) rotate(45deg);
            }
            100% { 
              opacity: 1; 
              transform: translate(0, 0) scale(1) rotate(0deg);
            }
          }
          @keyframes flipCard {
            0%   { transform: rotateY(0deg); }
            100% { transform: rotateY(180deg); }
          }
          @keyframes resultPop {
            from { opacity: 0; transform: scale(0.75) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .bj-btn:active { transform: translateY(2px); }
        `}</style>

      <div className="flex flex-col lg:flex-row gap-4 p-2 lg:p-4 flex-1 min-h-0 bg-[#0d0b1a]">
        {/* ── Sidebar (Left Control Panel) ─────────────────── */}
        <div className="w-full lg:w-[400px] order-2 lg:order-1 shrink-0 bg-[#110f21]/90 backdrop-blur-xl rounded-2xl lg:rounded-[32px] p-4 lg:p-8 flex flex-col gap-4 lg:gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
            <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[60%] bg-[#a855f7] blur-[100px] rounded-full opacity-30" />
          </div>

          <div className="relative z-10 flex flex-col gap-4 lg:gap-6 h-full">
            <div className="space-y-3 lg:space-y-4">
            {/* Bet Amount Component */}
            <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-4 lg:p-5 shadow-inner transition-all hover:bg-white/[0.05]">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 lg:mb-3">
                Bet amount
              </div>
              <div className="flex items-center gap-2 lg:gap-3 bg-black/40 rounded-xl p-2.5 lg:p-3 mb-4 group transition-all shadow-2xl">
                <img src={COIN_IMG} alt="" className="w-5 lg:w-6 h-5 lg:h-6 flex-shrink-0 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-transform group-hover:scale-110" />
                <input
                  type="number"
                  value={
                    phase === "betting"
                      ? pendingBet === 0
                        ? ""
                        : pendingBet
                      : bet
                  }
                  onChange={(e) => {
                    if (phase !== "betting") return;
                    const val = parseInt(e.target.value) || 0;
                    setPendingBet(Math.min(val, balance));
                  }}
                  className="bg-transparent text-white font-black text-lg flex-1 outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-white/10"
                  placeholder="0.00"
                />
              </div>

              {/* Presets */}
              <div className="grid grid-cols-3 gap-2">
                {["1/2", "2X", "MAX"].map((label) => (
                  <button
                    key={label}
                    onClick={
                      label === "1/2"
                        ? halfBet
                        : label === "2X"
                          ? doubleBet
                          : maxBet
                    }
                    disabled={
                      phase !== "betting" ||
                      (label !== "MAX" && pendingBet === 0) ||
                      (label === "MAX" && balance === 0) ||
                      (label === "2X" && pendingBet * 2 > balance)
                    }
                    className="py-2.5 rounded-lg bg-white/5 hover:bg-[#a855f7] disabled:opacity-20 disabled:cursor-not-allowed text-white/40 hover:text-white font-black text-[10px] transition-all duration-200 uppercase tracking-widest hover:shadow-[0_3px_0_0_#9333ea] active:translate-y-[1px]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Buttons */}
            {/* Quick Add Component */}
            {phase === "betting" && (
              <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl p-5 shadow-inner transition-all hover:bg-white/[0.05]">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">
                  Quick Add
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BET_AMOUNTS.slice(0, 3).map((a) => (
                    <button
                      key={a}
                      onClick={() => addBet(a)}
                      disabled={balance <= pendingBet}
                      className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] font-black cursor-pointer transition-all active:scale-95"
                    >
                      +{a >= 1000 ? `${a / 1000}K` : a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Game Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            {phase === "betting" && (
              <button
                onClick={deal}
                disabled={pendingBet < 1 || pendingBet > balance || isDealing}
                className="w-full py-4 rounded-xl bg-gradient-to-b from-[#a855f7] to-[#7e22ce] hover:from-[#9333ea] hover:to-[#6b21a8] disabled:bg-[#1a1a1a] disabled:text-gray-600 font-black !text-white text-base transition-all shadow-[0_4px_0_0_#581c87] active:shadow-none active:translate-y-1 uppercase tracking-widest"
              >
                {isDealing ? "DEALING..." : "DEAL"}
              </button>
            )}

            {phase === "playing" && (
              <div className="flex flex-col gap-3 animate-fadeUp">
                <button
                  onClick={hit}
                  disabled={!canHit}
                  className="w-full py-4 rounded-xl bg-gradient-to-b from-[#a855f7] to-[#7e22ce] hover:from-[#9333ea] hover:to-[#6b21a8] font-black !text-white text-base shadow-[0_4px_0_0_#581c87] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest"
                >
                  HIT
                </button>
                <button
                  onClick={stand}
                  disabled={!canStand}
                  className="w-full py-4 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] font-black !text-white text-base shadow-[0_4px_0_0_#000000] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest"
                >
                  STAND
                </button>
                <button
                  onClick={doubleDown}
                  disabled={!canDouble}
                  className="w-full py-4 rounded-xl bg-[#7e22ce] hover:bg-[#6b21a8] font-black !text-white text-base shadow-[0_4px_0_0_#4c1d95] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest"
                >
                  DOUBLE DOWN
                </button>
              </div>
            )}

            {phase === "result" && (
              <button
                onClick={newGame}
                className="w-full py-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] font-black text-white text-base shadow-[0_4px_0_0_#14532d] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest animate-fadeUp"
              >
                PLAY AGAIN
              </button>
            )}

            </div>
          </div>
        </div>

        {/* ── Game Area (Right Side) ────────────────────────── */}
        <div className="order-1 lg:order-2 flex-1 min-h-[450px] lg:min-h-0 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 shadow-2xl bg-[#110f21]">
          {/* Provably Fair Shield - Top Left */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
             <button 
                onClick={() => setIsFairModalOpen(true)}
                className="text-white/20 hover:text-[#a855f7] transition-all duration-300 transform hover:scale-110 active:scale-95 drop-shadow-[0_0_10px_rgba(168,85,247,0)] hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]"
             >
                <Shield size={22} strokeWidth={2.5} />
             </button>
          </div>

          <FairModal 
            open={isFairModalOpen} 
            onClose={() => setIsFairModalOpen(false)} 
            gameName="Blackjack"
            disableRotation={phase === "playing"}
          />

          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#a855f7] blur-[150px] rounded-full" />
          </div>
          {/* Card Deck Visual */}
          <CardDeck />

          {/* Game Content */}
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-around h-full py-2 lg:py-4">
            {/* Dealer Area */}
            <div className="flex flex-col items-center gap-2 lg:gap-4">
              <div className="flex flex-col items-center gap-1 lg:gap-2">
                {dealerHand.length > 0 && phase !== "betting" ? (
                  <ScoreBadge
                    value={dealerVal}
                    bust={phase === "result" && dealerVal > 21}
                    bj={phase === "result" && isBlackjack(dealerHand)}
                  />
                ) : (
                  <div className="h-[26px]" />
                )}
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                  DEALER
                </p>
              </div>
              <div className="flex gap-2 lg:gap-3 min-h-[105px] lg:min-h-[154px] items-center justify-center bg-white/5 rounded-2xl p-2 lg:p-3 min-w-[200px] lg:min-w-[240px]">
                {dealerHand.length === 0 ? (
                  <div className="w-20 lg:w-28 h-28 lg:h-40 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <span className="text-white/5 text-2xl lg:text-3xl font-black">?</span>
                  </div>
                ) : (
                  dealerHand.map((c, i) => (
                    <PlayingCard key={c.id} card={c} index={i} />
                  ))
                )}
              </div>
            </div>

            {/* Center Result Area */}
            <div className="h-16 lg:h-20 flex items-center justify-center w-full my-2 lg:my-4">
              {result && (
                <div className={`backdrop-blur-xl rounded-2xl py-3 lg:py-4 px-8 lg:px-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-resultPop flex flex-col items-center ${
                  result === 'win' || result === 'blackjack' 
                    ? 'bg-[#5cdf9a]/5 shadow-[#5cdf9a]/10' 
                    : 'bg-[#1a1a1a]/80'
                }`} style={{
                   boxShadow: (result === 'win' || result === 'blackjack') ? '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(92,223,154,0.1)' : '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                  <span
                    className="text-xl lg:text-2xl font-black tracking-tighter"
                    style={{ color: resultColor }}
                  >
                    {result === "blackjack"
                      ? "BLACKJACK!"
                      : result === "win"
                        ? "YOU WIN!"
                        : result === "push"
                          ? "PUSH"
                          : "DEALER WINS"}
                  </span>
                  <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                    {message}
                  </span>
                </div>
              )}
            </div>

            {/* Player Area */}
            <div className="flex flex-col items-center gap-2 lg:gap-4">
              <div className="flex gap-2 lg:gap-3 min-h-[105px] lg:min-h-[154px] items-center justify-center bg-white/5 rounded-2xl p-2 lg:p-3 min-w-[200px] lg:min-w-[240px]">
                {playerHand.length === 0 ? (
                  <div className="w-20 lg:w-28 h-28 lg:h-40 rounded-lg lg:rounded-xl flex items-center justify-center">
                    <span className="text-white/5 text-2xl lg:text-3xl font-black">?</span>
                  </div>
                ) : (
                  playerHand.map((c, i) => (
                    <PlayingCard key={c.id} card={c} index={i} />
                  ))
                )}
              </div>
              <div className="flex flex-col items-center gap-1 lg:gap-2">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                  YOU
                </p>
                {playerHand.length > 0 ? (
                  <ScoreBadge
                    value={playerVal}
                    bust={isBust(playerHand)}
                    bj={isBlackjack(playerHand)}
                  />
                ) : (
                  <div className="h-[26px]" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
