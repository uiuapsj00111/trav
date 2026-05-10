"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Gamepad2, Gift, LayoutGrid, MessageSquare, Rocket, Shield, Swords, Target, Triangle, Trophy, Zap } from "lucide-react";

import React, { useEffect, useRef, useState } from "react";
import LoginModal from "./login-modal";

const RARITY_FILTERS = ["All", "Chroma", "Godly", "Legendary"];

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
  halloween: "#ff8c00",
};

interface MM2Item {
  id: number;
  name: string;
  value: number;
  image_url: string | null;
  rarity: string | null;
  demand: string | null;
  trend: string | null;
}

interface BotStatus {
  id: number;
  name: string;
  roblox_username: string | null;
  avatar: string | null;
  online: boolean;
  private_server_url: string | null;
}

interface TipNotification {
  id: number;
  sender_username: string;
  sender_avatar: string | null;
  recipient_username: string;
  recipient_avatar: string | null;
  amount: number;
  created_at: string;
  currency_type: string;
}

interface PlatformNotification {
  id: string | number;
  title: string;
  message: string;
  time: string;
  type: 'tip' | 'ping' | 'system';
  unread: boolean;
}

function WithdrawConfirmModal({
  onClose,
  onBack,
  bots,
}: {
  onClose: () => void;
  onBack: () => void;
  bots: BotStatus[];
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      style={{ animation: "backdropIn 0.2s ease-out both" }}
    >
      <div
        className="rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #0a0a0a 0%, #0d0d12 100%)",
          animation: "walletIn 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
          <img
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771632685610.png?width=400&height=400&resize=contain"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.1 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0.6) 0%, rgba(26,14,0,0.9) 100%)",
            }}
          />
        </div>
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[#be30ff] hover:text-white transition-colors text-sm font-bold"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
              BACK
            </button>
            <div className="flex items-center gap-2">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771597214066.png?width=128&height=128&resize=contain"
                alt="MM2"
                width="28"
                height="28"
                className="object-contain"
              />
              <h2 className="text-xl font-bold text-white tracking-wide">
                WITHDRAW MM2
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#2a2a2a]/50 hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="relative z-10 px-5 -mt-2 mb-2">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              Only real coins can be withdrawn. Fun Coins are for play only.
            </p>
          </div>
        </div>

        <div className="relative z-10 p-5 space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ade80"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-green-400 font-bold text-sm">
              Withdraw queued! A bot will send you a trade request in Roblox
              shortly.
            </p>
          </div>

          {/* Bot list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[#be30ff] text-xs font-bold uppercase tracking-wider">
                Trading Bots
              </h3>
            </div>
            <div className="bg-black/20 rounded-xl overflow-hidden">
              {(bots.length > 0
                ? bots
                : [
                    {
                      id: 0,
                      name: "Loading...",
                      roblox_username: null,
                      avatar: null,
                      online: false,
                    },
                  ]
              )
                .slice(0, 3)
                .map((bot, i, arr) => (
                  <div
                    key={bot.id}
                    className={`flex items-center gap-4 px-4 py-4 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden">
                        <img
                          src={
                            bot.avatar ||
                            "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771596005810.png?width=400&height=400&resize=contain"
                          }
                          alt={bot.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm flex items-center gap-1">
                        {bot.roblox_username || bot.name}
                        <img
                          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771600588112.png?width=128&height=128&resize=contain"
                          alt="Verified"
                          width="16"
                          height="16"
                          className="object-contain"
                        />
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                      <a
                        href={
                          bot.online
                            ? bot.private_server_url ||
                              `https://www.roblox.com/users/search?keyword=${bot.roblox_username || bot.name}`
                            : undefined
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                          bot.online
                            ? "bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white shadow-[0_3px_0_0_#9a3412] active:translate-y-[2px] active:shadow-none"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed pointer-events-none"
                        }`}
                      >
                        JOIN
                      </a>
                      <a
                        href={`https://www.roblox.com/users/search?keyword=${bot.roblox_username || bot.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-[0_3px_0_0_#000000] active:translate-y-[2px] active:shadow-none transition-all"
                      >
                        PROFILE
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Conversion rate */}
          <div>
            <h3 className="text-[#be30ff] text-xs font-bold uppercase tracking-wider mb-2">
              Conversion Rate
            </h3>
            <div className="bg-black/20 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771596634629.png?width=400&height=400&resize=contain"
                  alt="MM2"
                  width="28"
                  height="28"
                  className="object-contain"
                />
                <span className="text-white font-bold text-sm">1,000</span>
              </div>
              <span className="text-[#be30ff] font-bold text-lg">=</span>
              <div className="flex items-center gap-2">
                <img
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=400&height=400&resize=contain"
                  alt="Coin"
                  width="20"
                  height="20"
                  className="rounded-full"
                />
                <span className="text-white font-bold text-sm">1,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawShopModal({
  balance,
  username,
  onClose,
  onBack,
  onDeduct,
  onWithdrawSuccess,
}: {
  balance: number;
  username: string | null;
  onClose: () => void;
  onBack: () => void;
  onDeduct: (cost: number) => void;
  onWithdrawSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("All");
  const [cart, setCart] = useState<number[]>([]);
  const [items, setItems] = useState<MM2Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Use DB balance as source of truth to avoid stale local balance mismatches
  const [dbBalance, setDbBalance] = useState<number>(balance);

  useEffect(() => {
    const loadItems = () => {
      fetch("/api/items/list?limit=200")
        .then((r) => r.json())
        .then((d) => {
          setItems(d.items || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadItems();

    // Sync changes from admin UI via custom DOM event
    const onItemsUpdated = () => {
      loadItems();
    };
    window.addEventListener("mm2_items_updated", onItemsUpdated);

    // Set up real-time subscription for item updates
    const channel = supabase
      .channel("mm2_items_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mm2_items",
        },
        () => {
          // Re-fetch items when any change occurs
          loadItems();
        },
      )
      .subscribe();

    // Sync balance from DB on open
    if (username) {
      fetch(`/api/users/balance?username=${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.balance === "number") setDbBalance(d.balance);
        })
        .catch(() => {});
    }

    // Cleanup subscription and event listeners on unmount
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("mm2_items_updated", onItemsUpdated);
    };
  }, [username]);

  const filtered = items.filter((item) => {
    const label = (item.display_name || item.name || "").toLowerCase();
    const matchSearch = label.includes(search.toLowerCase());
    const matchRarity = rarityFilter === "All" || item.rarity === rarityFilter;
    return matchSearch && matchRarity;
  });

  const cartItems = items.filter((i) => cart.includes(i.id));
  const totalCost = cartItems.reduce((sum, i) => sum + Number(i.value), 0);
  const canAfford = dbBalance >= totalCost;

  const toggleCart = (id: number) => {
    setCart((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleWithdraw = async () => {
    if (!canAfford || cart.length === 0 || !username) return;
    setWithdrawing(true);
    setErrorMsg(null);
    const payload = {
      username,
      roblox_user_id: localStorage.getItem("mm2dice_user_id") || undefined,
      items: cartItems.map((i) => ({
        id: i.id,
        name: i.name,
        value: Number(i.value),
        image_url: i.image_url,
      })),
    };
    try {
      const res = await fetch("/api/bot/withdraw/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setItems((prev) => prev.filter((i) => !cart.includes(i.id)));
        setCart([]);
        setDbBalance(data.new_balance);
        onDeduct(totalCost);
        onWithdrawSuccess();
      } else {
        setErrorMsg(data.error || "Withdraw failed. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      style={{ animation: "backdropIn 0.2s ease-out both" }}
    >
      <div
        className="rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative"
        style={{
          background: "linear-gradient(to bottom, #0a0a0a 0%, #0d0d12 100%)",
          animation: "walletIn 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        {/* Background image */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
          <img
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771632685610.png?width=400&height=400&resize=contain"
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.12 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(26,14,0,0.85) 100%)",
            }}
          />
        </div>
        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[#be30ff] hover:text-white transition-colors text-xs sm:text-sm font-bold shrink-0"
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
                <path d="m15 18-6-6 6-6" />
              </svg>
              BACK
            </button>
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771597214066.png?width=128&height=128&resize=contain"
                alt="MM2"
                width="24"
                height="24"
                className="object-contain shrink-0"
              />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide truncate">
                WITHDRAW MM2
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-8 h-8 rounded-lg bg-[#2a2a2a]/50 hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="relative z-10 px-5 mb-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              Only real coins can be withdrawn. Fun Coins are for play only.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="relative z-10 px-5 pb-3 flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7560]"
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/30 text-white placeholder-[#8a7560] text-sm pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#be30ff]/40"
            />
          </div>
          <div className="flex gap-1">
            {RARITY_FILTERS.map((r) => (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${rarityFilter === r ? "bg-[#be30ff] text-white" : "bg-black/30 text-[#be30ff] hover:bg-black/50"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 pb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 content-start min-h-0">
          {loading && (
            <div className="col-span-full flex items-center justify-center py-20 text-[#8a7560] text-sm">
              Loading items...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771709419116.png?width=128&height=128&resize=contain"
                alt="No items"
                className="w-20 h-20 object-contain opacity-40"
              />
              <p className="text-white text-lg font-bold">No items available</p>
              <p className="text-[#8a7560] text-sm text-center">
                Items appear here after players deposit.
                <br />
                Be the first to deposit!
              </p>
            </div>
          )}
          {filtered.map((item) => {
            const inCart = cart.includes(item.id);
            const rarityColor =
              RARITY_COLORS[(item.rarity || "common").toLowerCase()] ||
              "#be30ff";
            return (
              <button
                key={item.id}
                onClick={() => toggleCart(item.id)}
                className="flex flex-col items-center gap-1.5 group transition-all duration-300 relative w-full h-full"
              >
                <div
                  className="relative w-full aspect-square flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
                  style={
                    inCart
                      ? {
                          border: `2px solid ${rarityColor}`,
                          background:
                            "linear-gradient(to bottom, #1e0f00 0%, #0d0600 100%)",
                          boxShadow: `0 4px 12px rgba(0,0,0,0.5), 0 0 15px ${rarityColor}44`,
                          transform: "scale(0.95)",
                        }
                      : {
                          background:
                            "linear-gradient(to bottom, #1e0f00 0%, #0d0600 100%)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }
                  }
                >
                  {/* Exact Pixel Pattern rendering as inline SVG so CSS gradients/animations work */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 group-hover:opacity-[0.8] flex items-center justify-center overflow-hidden"
                    style={{ opacity: inCart ? 1 : 0.6 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 158 175"
                      className={`w-[150%] h-[150%] absolute ${
                        item.rarity?.toLowerCase() === "chroma"
                          ? "chroma-text-color"
                          : item.rarity?.toLowerCase() === "godly"
                            ? "text-primary"
                            : item.rarity?.toLowerCase() === "ancient"
                              ? "text-blue-500"
                              : ""
                      }`}
                      style={{
                        color:
                          item.rarity?.toLowerCase() !== "chroma" &&
                          item.rarity?.toLowerCase() !== "godly" &&
                          item.rarity?.toLowerCase() !== "ancient"
                            ? rarityColor
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

                  {inCart && (
                    <div className="absolute top-2 right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#22c55e] flex items-center justify-center z-40 shadow-lg border border-[#0d0d12]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}

                  <div className="w-full h-full flex items-center justify-center relative z-10 p-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.display_name || item.name}
                        className="w-[110%] h-[110%] object-contain relative z-20 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:animate-[float_2s_ease-in-out_infinite]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative z-20">
                        <img
                          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771709419116.png?width=128&height=128&resize=contain"
                          alt="item"
                          className="w-24 h-24 sm:w-28 sm:h-28 object-contain opacity-40 grayscale"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center w-full px-0.5 mt-0.5">
                  <p
                    className="text-white text-[12px] sm:text-[14px] font-black leading-tight truncate w-full tracking-tight"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {item.display_name || item.name}
                  </p>
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-0.5">
                    <img
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=400&height=400&resize=contain"
                      alt="coin"
                      width="14"
                      height="14"
                      className="rounded-full"
                    />
                    <span
                      className="text-[#be30ff] text-[12px] sm:text-[14px] font-black"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      {Number(item.value).toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer / Cart */}
        <div className="relative z-10 p-5 flex-shrink-0 border-t border-white/5">
          {errorMsg && (
            <div className="mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f87171"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-red-400 text-xs font-semibold">{errorMsg}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#8a7560] text-xs sm:text-sm font-bold truncate shrink-0">
                {cart.length} item{cart.length !== 1 ? "s" : ""} selected
              </span>
              {cart.length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[#be30ff] text-sm">·</span>
                  <img
                    src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=400&height=400&resize=contain"
                    alt="coin"
                    width="14"
                    height="14"
                    className="rounded-full"
                  />
                  <span
                    className={`text-xs sm:text-sm font-bold ${canAfford ? "text-white" : "text-red-400"}`}
                  >
                    {totalCost.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleWithdraw}
              disabled={cart.length === 0 || !canAfford || withdrawing}
              className="bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-extrabold px-6 sm:px-8 py-2.5 rounded-lg shadow-[0_4px_0_0_#9a3412] active:shadow-[0_2px_0_0_#9a3412] active:translate-y-[2px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_#9a3412] text-xs sm:text-sm w-full sm:w-auto"
            >
              {withdrawing
                ? "PROCESSING..."
                : !canAfford && cart.length > 0
                  ? "NOT ENOUGH COINS"
                  : "WITHDRAW"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const {
    selectedCurrency,
    setSelectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
    refreshBalances,
    isMuted,
    setIsMuted,
  } = useCurrency();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletTab, setWalletTab] = useState<"deposit" | "withdraw">("deposit");
  const [isMM2DepositOpen, setIsMM2DepositOpen] = useState(false);
  const [isMM2WithdrawOpen, setIsMM2WithdrawOpen] = useState(false);
  const [isGamesDropdownOpen, setIsGamesDropdownOpen] = useState(false);
  const [isMobileGamesMenuOpen, setIsMobileGamesMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMM2WithdrawConfirmOpen, setIsMM2WithdrawConfirmOpen] =
    useState(false);
  const [isLitecoinOpen, setIsLitecoinOpen] = useState(false);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [promoClaiming, setPromoClaiming] = useState(false);
  const [faucetClaiming, setFaucetClaiming] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [faucetRemaining, setFaucetRemaining] = useState<number>(0);
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBalanceDropdownOpen, setIsBalanceDropdownOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [displayBalance, setDisplayBalance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [totalWagered, setTotalWagered] = useState(0);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showTipDropdown, setShowTipDropdown] = useState(false);
  const [receivedTips, setReceivedTips] = useState<TipNotification[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  const balanceRef = useRef(0);
  const currencyRef = useRef(selectedCurrency);
  const tipDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    balanceRef.current = displayBalance;
  }, [displayBalance]);

  const calculateLevel = (wagered: number) => {
    if (!wagered || wagered < 0) return 1;
    // Level formula: floor(sqrt(wagered / 25)) + 1, capped at 100
    return Math.min(100, Math.floor(Math.sqrt(wagered / 25)) + 1);
  };

  const level = calculateLevel(totalWagered);

  useEffect(() => {
    currencyRef.current = selectedCurrency;
  }, [selectedCurrency]);

  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const router = useRouter();
  const pathname = usePathname();
  const gamesDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const lastScrollY = useRef(0);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = getStorageItem('platform_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setHasUnread(parsed.some((n: any) => n.unread));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    setStorageItem('platform_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (!username) return;

    const channel = supabase
      .channel('navbar-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, (payload) => {
        const msg = payload.new;
        if (msg.type === 'tip' && msg.extra_data?.recipient_username === username) {
          const newNotif: PlatformNotification = {
            id: msg.id || Date.now(),
            title: 'Tip Received!',
            message: `You received a tip from ${msg.username}.`,
            time: 'Just now',
            type: 'tip',
            unread: true
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 50));
          setHasUnread(true);
        } else if (msg.message?.toLowerCase().includes(`@${username.toLowerCase()}`)) {
          const newNotif: PlatformNotification = {
            id: msg.id || Date.now(),
            title: 'You were mentioned!',
            message: `${msg.username}: ${msg.message}`,
            time: 'Just now',
            type: 'ping',
            unread: true
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 50));
          setHasUnread(true);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [username]);

  useEffect(() => {
    let lastHide = 0;
    const SCROLL_HIDE_DELTA = 40; // px, require a larger scroll before hiding nav/chat
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (delta > SCROLL_HIDE_DELTA && currentY > 60) {
        setMobileNavVisible(false);
        lastHide = currentY;
      } else if (
        delta < -SCROLL_HIDE_DELTA ||
        currentY < lastHide - SCROLL_HIDE_DELTA
      ) {
        setMobileNavVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const playCoinSound = () => {
    if (isMuted) return;
    try {
      const audio = new Audio("/spinopel-bitcoin-393259.mp3");

      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    const loggedInUser = getStorageItem("mm2dice_user");
    const loggedInUserId = getStorageItem("mm2dice_user_id");
    setUsername(loggedInUser);
    setUserId(loggedInUserId);

    const storedBalance = getStorageItem(
      selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance",
    );
    if (storedBalance) {
      const bal = parseFloat(storedBalance);
      setDisplayBalance(bal);
      balanceRef.current = bal;
    } else if (loggedInUser) {
      setDisplayBalance(0);
      balanceRef.current = 0;
    }

    if (loggedInUser) {
      fetch(`/api/stats?username=${encodeURIComponent(loggedInUser)}`)
        .then((res) => res.json())
        .then((data) => {
          setTotalWagered(parseFloat(data.total_wagered) || 0);
        })
        .catch(() => {});
    }

    if (loggedInUserId) {
      fetch(`/api/roblox/avatar?userId=${loggedInUserId}`)
        .then((res) => res.json())
        .then((data) => {
          setAvatarUrl(data.avatarUrl);
          if (data.avatarUrl)
            setStorageItem("mm2dice_avatar", data.avatarUrl);
        })
        .catch(() => setAvatarUrl(""));
    }
  }, [isLoginOpen]);

  useEffect(() => {
    if (
      isWalletOpen ||
      isMM2DepositOpen ||
      isMM2WithdrawOpen ||
      isMM2WithdrawConfirmOpen ||
      isLoginOpen
    ) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [
    isWalletOpen,
    isMM2DepositOpen,
    isMM2WithdrawOpen,
    isMM2WithdrawConfirmOpen,
    isLoginOpen,
  ]);

  // Poll DB balance every 15s so recipient sees tip instantly.
  // Skip update if the local balance was changed very recently (e.g. mid-game deduction)
  // to avoid the DB overwriting a not-yet-persisted local value.
  useEffect(() => {
    const poll = async () => {
      const user = getStorageItem("mm2dice_user");
      if (!user) return;

      // Skip if a game is in-flight (lock set by game components)
      const pendingGame = getStorageItem("mm2dice_upgrader_pending_game");
      if (pendingGame) return;
      const lock = parseFloat(
        getStorageItem("mm2dice_balance_lock") || "0",
      );
      if (Date.now() < lock) return;
      // Also skip if local balance was updated in the last 10s
      const lastUpdate = parseFloat(
        getStorageItem("mm2dice_balance_ts") || "0",
      );
      if (Date.now() - lastUpdate < 10000) return;

      try {
        await refreshBalances();
        // Also refresh stats/level
        const res = await fetch(`/api/stats?username=${encodeURIComponent(user)}`);
        const stats = await res.json();
        setTotalWagered(parseFloat(stats.total_wagered) || 0);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleBalanceUpdate = () => {
      const storedBalance = getStorageItem(
        currencyRef.current === "coins"
          ? "mm2dice_balance"
          : "mm2dice_fun_balance",
      );
      if (storedBalance) {
        const newBal = parseFloat(storedBalance);
        // if (newBal > balanceRef.current + 0.01) playCoinSound();
        setDisplayBalance(newBal);
      }
    };

    const handleBalanceAnimate = (
      e: CustomEvent<{ from: number; to: number; currency?: string }>,
    ) => {
      const { from, to, currency } = e.detail;

      // Only animate if the currency matches the currently selected one
      if (currency && currency !== currencyRef.current) return;

      // if (to > from + 0.01) playCoinSound();
      setIsAnimating(true);
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentBalance = from - (from - to) * easeOut;
        setDisplayBalance(currentBalance);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayBalance(to);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    };

    window.addEventListener("balanceUpdate", handleBalanceUpdate);
    // Set initial display balance from localStorage
    handleBalanceUpdate();
    window.addEventListener(
      "balanceAnimate",
      handleBalanceAnimate as EventListener,
    );
    return () => {
      window.removeEventListener("balanceUpdate", handleBalanceUpdate);
      window.removeEventListener(
        "balanceAnimate",
        handleBalanceAnimate as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!username) {
      setReceivedTips([]);
      setShowTipDropdown(false);
      return;
    }

    const loadReceivedTips = async () => {
      setTipError(null);
      setTipsLoading(true);
      try {
        const response = await fetch("/api/tips/recent");
        const data = await response.json();
        if (!Array.isArray(data)) {
          console.warn("Invalid tip response format:", data);
          return;
        }

        const filtered = data
          .filter(
            (tip: any) =>
              tip.recipient_username?.toLowerCase() === username.toLowerCase(),
          )
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        setReceivedTips(filtered);
      } catch (error) {
        console.error("Failed to load received tips", error);
        setTipError("Unable to load tips");
      } finally {
        setTipsLoading(false);
      }
    };

    loadReceivedTips();
    const interval = setInterval(loadReceivedTips, 30000);
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsBalanceDropdownOpen(false);
      }
      if (
        gamesDropdownRef.current &&
        !gamesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGamesDropdownOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        tipDropdownRef.current &&
        !tipDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTipDropdown(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    removeStorageItem("mm2dice_user");
    removeStorageItem("mm2dice_user_id");
    removeStorageItem("mm2dice_session_token");
    window.location.reload();
  };

  const handleChatToggle = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.dispatchEvent(new CustomEvent("toggleChat"));
  };

  const handleClaimPromo = async () => {
    if (!promoCode.trim() || !username || promoClaiming) return;
    setPromoClaiming(true);
    setPromoStatus(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code: promoCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPromoStatus({
          type: "success",
          message: `+${data.reward.toLocaleString()} coins claimed!`,
        });
        setPromoCode("");
        const newBal = data.new_balance;
        setCoinsBalance(newBal);
        if (selectedCurrency === "coins") setDisplayBalance(newBal);
      } else {
        setPromoStatus({
          type: "error",
          message: data.error || "Invalid promo code",
        });
      }
    } catch {
      setPromoStatus({ type: "error", message: "Network error. Try again." });
    } finally {
      setPromoClaiming(false);
    }
  };

  const handleClaimFaucet = async () => {
    if (!username || faucetClaiming || faucetRemaining > 0) return;
    setFaucetClaiming(true);
    setFaucetStatus(null);
    try {
      const res = await fetch("/api/faucet/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        setFaucetStatus({
          type: "success",
          message: `+${data.amount} Fun Coins claimed!`,
        });
        setFunCoinsBalance(data.new_balance);
        if (selectedCurrency === "fun_coins") {
          setDisplayBalance(data.new_balance);
          localStorage.setItem(
            "mm2dice_fun_balance",
            data.new_balance.toString(),
          );
        }
        setFaucetRemaining(10);
        // playCoinSound();
      } else {
        setFaucetStatus({
          type: "error",
          message: data.error || "Claim failed",
        });
      }
    } catch {
      setFaucetStatus({ type: "error", message: "Network error. Try again." });
    } finally {
      setFaucetClaiming(false);
    }
  };

  useEffect(() => {
    if (isWalletOpen && username) {
      fetch(`/api/faucet/claim?username=${encodeURIComponent(username)}`)
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.remainingMinutes === "number") {
            setFaucetRemaining(data.remainingMinutes);
          }
        })
        .catch(() => {});
    }
  }, [isWalletOpen, username]);

  // Poll simple "online" API every 15s.
  // This counts users whose last_seen timestamp is recent; more reliable
  // than realtime presence which was misbehaving.
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const response = await fetch("/api/online");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (typeof data.count === "number") {
          setOnlineCount(data.count);
          window.dispatchEvent(
            new CustomEvent("onlineCountUpdate", { detail: data.count }),
          );
        }
      } catch (error) {
        console.error("Failed to fetch online count:", error);
        // Keep the previous value on error
      }
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 15000);
    return () => clearInterval(iv);
  }, []);

  // Poll bot heartbeat status every 30s
  useEffect(() => {
    const fetchBots = () => {
      fetch("/api/bot/heartbeat")
        .then((r) => r.json())
        .then((d) => {
          if (d.bots) setBots(d.bots);
        })
        .catch(() => {});
    };
    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isNotificationsOpen) {
      setHasUnread(false);
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    }
  }, [isNotificationsOpen]);

  // Close games dropdown whenever the route changes
  useEffect(() => {
    setIsGamesDropdownOpen(false);
  }, [pathname]);

  const games = [
    { name: "Coinflip", href: "/coinflip", icon: <Target size={18} /> },
    { name: "Blackjack", href: "/blackjack", icon: <div className="w-[18px] h-[18px] rounded-sm flex items-center justify-center font-bold text-[10px]">B</div> },
    { name: "Upgrader", href: "/upgrader", icon: <Zap size={18} /> },
    { name: "Roulette", href: "/roulette", icon: <div className="w-[18px] h-[18px] rounded-full border-dashed animate-[spin_5s_linear_infinite]" /> },
    { name: "Dice", href: "/dice", icon: <div className="w-[18px] h-[18px] rounded-sm flex items-center justify-center font-bold text-[10px]">D</div> },
    { name: "Limbo", href: "/limbo", icon: <Rocket size={18} /> },
    { name: "Mines", href: "/mines", icon: <div className="grid grid-cols-2 gap-0.5 w-[14px] h-[14px]"><div className="bg-current rounded-full" /><div className="bg-current/30 rounded-full" /><div className="bg-current/30 rounded-full" /><div className="bg-current rounded-full" /></div> },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[101] w-full" style={{ fontFamily: "var(--font-body)" }}>
        {/* Main 2-Column Grid Layout */}
        <div className="grid grid-cols-[auto_1fr] w-full bg-[#0d0b1a] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
          
          {/* COLUMN 1: Full-Height Logo Sidebar */}
          <div className="flex items-center gap-4 px-4 md:px-10 h-full relative group bg-transparent">
            <Link href="/coinflip" className="flex items-center gap-5">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="TRAV BET Logo" 
                  className="w-[44px] h-[44px] md:w-[64px] md:h-[64px] object-contain filter drop-shadow-[0_0_25px_rgba(168,85,247,0.4)] transform transition-transform group-hover:scale-105"
                />
              </div>
            </Link>
          </div>

          {/* COLUMN 2: Stacked Rows (Utility & Main) */}
          <div className="flex flex-col w-full">
            
            {/* ROW 1: Utility Bar (REMOVED) */}

            {/* ROW 2: Main Navigation Bar */}
            <div className="h-[60px] md:h-[80px] flex items-center justify-between px-4 md:px-8 relative w-full bg-transparent">
              {/* Left: Game Nav */}
              <div className="hidden md:flex items-center">
                <nav className="flex items-center gap-3 h-full">
                  {/* Games Dropdown */}
                  <div className="relative h-full" ref={gamesDropdownRef}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGamesDropdownOpen(!isGamesDropdownOpen);
                      }}
                      className={`flex items-center gap-3 px-5 py-2.5 rounded-md bg-[#1c1a2e] relative group transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] outline-none ${isGamesDropdownOpen || games.some(g => pathname === g.href) ? 'text-[#be30ff]' : 'text-white/30 hover:text-white hover:bg-[#25223d]'}`}
                    >
                      <span className="text-[16px] font-black uppercase tracking-wider">Games</span>
                      <ChevronDown 
                        size={14} 
                        className={`transition-transform duration-300 ${isGamesDropdownOpen ? 'rotate-180 text-[#be30ff]' : 'text-white/20'}`} 
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isGamesDropdownOpen && (
                      <div 
                        className="absolute top-full left-0 mt-4 w-[480px] bg-[#110f21]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden z-[10000] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
                      >
                        <div className="p-6">
                          
                          <div className="grid grid-cols-2 gap-3 relative pointer-events-auto">
                            {games.map((game) => (
                              <Link
                                key={game.name}
                                href={game.href}
                                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group relative z-[10000] pointer-events-auto cursor-pointer ${pathname === game.href ? 'bg-[#be30ff]/10 text-[#be30ff]' : 'bg-white/[0.02] text-white/40 hover:bg-white/[0.05] hover:text-white'}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${pathname === game.href ? 'bg-[#be30ff] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-[#1c1a2e] text-white/20 group-hover:text-[#be30ff] group-hover:bg-[#be30ff]/5'}`}>
                                  {game.icon}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-black uppercase tracking-wider">{game.name}</span>
                                  <span className="text-[10px] font-medium text-white/20 group-hover:text-white/40 transition-colors">Play Now</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Rewards Button */}
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes ray-sweep {
                      0% { transform: translateX(-150%) skewX(-15deg); }
                      4% { transform: translateX(300%) skewX(-15deg); }
                      100% { transform: translateX(300%) skewX(-15deg); }
                    }
                  `}} />
                  <Link 
                    href="/rewards" 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-md relative group transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] outline-none overflow-hidden bg-[#22c55e] text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] hover:brightness-110"
                  >
                    <div className="absolute inset-0 pointer-events-none w-full h-full overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-0 w-3/4 bg-gradient-to-r from-transparent via-white to-transparent opacity-40" style={{ animation: 'ray-sweep 30s infinite ease-in-out' }} />
                    </div>
                    <Gift size={20} className="text-white relative z-10 drop-shadow-md" />
                    <span className="text-[16px] font-black uppercase tracking-wider relative z-10 drop-shadow-md">Rewards</span>
                  </Link>

                </nav>
              </div>

              {/* Center placeholder to maintain spacing if needed */}
              <div className="flex-1"></div>

              {/* Right: Actions Section */}
              <div className="flex items-center gap-2 md:gap-6">
                {username ? (
                  <>
                    <div className="flex items-center gap-3">


                      
                      <div className="relative hidden md:block" ref={notificationsRef}>
                        <button 
                          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                          className={`w-[48px] h-[48px] flex items-center justify-center rounded-xl bg-[#1c1a2e] transition-all duration-300 relative group shadow-xl active:scale-95 ${isNotificationsOpen ? 'text-white ring-2 ring-[#be30ff]' : 'text-[#be30ff] hover:brightness-125 hover:scale-110'}`}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="filter drop-shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-transform group-hover:scale-110"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                          {hasUnread && (
                            <div className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                          )}
                        </button>

                        {/* Notifications Dropdown */}
                        {isNotificationsOpen && (
                          <div className="absolute top-full right-0 mt-4 w-[360px] bg-[#0d0b1a]/98 backdrop-blur-2xl rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_20px_rgba(168,85,247,0.05)] z-[110] animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden">
                            <div className="p-5 flex items-center justify-between bg-white/[0.03]">
                              <span className="text-[12px] font-black uppercase tracking-widest text-white/40">Notifications</span>
                              <button 
                                onClick={() => setNotifications([])}
                                className="text-[10px] font-black uppercase text-[#be30ff] hover:brightness-125 transition-all"
                              >
                                Clear All
                              </button>
                            </div>
                            
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                              <div className="p-2 space-y-1">
                                {notifications.length > 0 ? (
                                  notifications.map((notif) => (
                                    <div key={notif.id} className="p-3 rounded-xl hover:bg-white/[0.03] flex flex-col gap-1 group transition-all cursor-pointer relative">
                                      {notif.unread && (
                                        <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#be30ff] shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                                      )}
                                      <span className="text-white text-[13px] font-black leading-tight">{notif.title}</span>
                                      <span className="text-white/40 text-[11px] font-medium leading-relaxed">{notif.message}</span>
                                      <span className="text-white/20 text-[9px] font-bold uppercase mt-1">{notif.time}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="py-10 flex flex-col items-center justify-center gap-3">
                                    <Bell size={32} className="text-white/5" />
                                    <span className="text-[11px] font-black uppercase tracking-widest text-white/20">No new notifications</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-4 text-center bg-white/[0.01]">
                              <button className="text-[11px] font-black uppercase tracking-[0.1em] text-white/30 hover:text-[#be30ff] transition-all">View All Activity</button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Link href="/profile" className="flex items-center gap-4 group cursor-pointer transition-all hover:translate-x-1">
                        <div className="relative">
                          <div className="w-[48px] h-[48px] rounded-xl p-[2px] bg-gradient-to-tr from-[#be30ff] to-[#1c1a2e] shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                            <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#0d0d12]">
                              <img src={avatarUrl || 'https://via.placeholder.com/48'} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-start leading-tight hidden md:flex">
                          <span className="text-white text-[13px] font-black tracking-[-0.02em] uppercase group-hover:text-[#be30ff] transition-colors">
                            @{username}
                          </span>
                          <span className="text-[#be30ff] text-[11px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">
                            Level {level}
                          </span>
                        </div>
                      </Link>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-[42px] h-[42px] hidden md:flex items-center justify-center rounded-[11px] bg-[#1c1a2e] text-[#be30ff]/60 hover:text-red-400 hover:bg-red-500/10 hover:scale-105 transition-all duration-300 ml-4 active:scale-90 group/logout"
                      title="Logout"
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="transition-transform duration-300 group-hover/logout:translate-x-1"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsLoginOpen(true)} className="bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white px-8 py-2.5 rounded-xl font-black text-[14px] uppercase tracking-widest shadow-[0_10px_30px_rgba(168,85,247,0.2)] transition-all duration-300 active:scale-[0.98] outline-none">Login</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* True Center Balance Module */}
        <div className="absolute left-1/2 top-[30px] md:top-[40px] -translate-x-1/2 -translate-y-1/2 z-[102] pointer-events-auto">
          {username && (
            <div className="p-[1px] rounded-xl bg-gradient-to-r from-[#be30ff]/80 via-[#be30ff]/50 to-transparent shadow-[0_0_25px_rgba(168,85,247,0.1)]">
              <div className="flex items-center bg-gradient-to-b from-[#262342]/95 to-[#1c1a2e]/95 backdrop-blur-xl rounded-[11px] p-1 h-[40px] md:h-[52px]">
                <div className="relative h-full" ref={dropdownRef}>
                  <div 
                    onClick={() => setIsBalanceDropdownOpen(!isBalanceDropdownOpen)}
                    className="flex items-center gap-4 px-4 h-full cursor-pointer hover:bg-white/[0.04] rounded-md transition-all group"
                  >
                    <div className="flex items-center justify-center w-[20px] md:w-[28px] h-[20px] md:h-[28px] transition-all duration-300">
                      <img 
                        src={selectedCurrency === 'coins' ? COIN_ICONS.coins : COIN_ICONS.fun_coins} 
                        alt="Currency" 
                        className={`w-full h-full object-contain filter drop-shadow-[0_0_8px_${selectedCurrency === 'coins' ? 'rgba(168,85,247,0.5)' : 'rgba(59,130,246,0.5)'}]`}
                      />
                    </div>
                    <div className="flex items-baseline gap-[1px] h-4 md:h-5 flex items-center">
                      <span className="text-white font-black text-[14px] md:text-[18px] tracking-tight">
                        {Math.floor(displayBalance).toLocaleString()}
                      </span>
                    </div>
                    <ChevronDown size={14} className={`text-white/40 transition-transform duration-300 ${isBalanceDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
  
                  {isBalanceDropdownOpen && (
                    <div className="absolute top-full left-0 mt-3 w-[240px] bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-2 space-y-1">
                        <button 
                           onClick={() => {
                             setSelectedCurrency('coins');
                             setIsBalanceDropdownOpen(false);
                           }}
                           className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedCurrency === 'coins' ? 'bg-[#be30ff]/20 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                        >
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                 <img src={COIN_ICONS.coins} className="w-6 h-6 object-contain" alt="Coins" />
                              </div>
                             <div className="flex flex-col items-start leading-none">
                                <span className="text-[12px] font-black uppercase tracking-wider">Actual Coins</span>
                                <span className="text-[10px] opacity-50 font-bold mt-1">Real Balance</span>
                             </div>
                          </div>
                          {selectedCurrency === 'coins' && <div className="w-2 h-2 rounded-full bg-[#be30ff] shadow-[0_0_10px_#be30ff]" />}
                        </button>
  
                        <button 
                           onClick={() => {
                             setSelectedCurrency('fun_coins');
                             setIsBalanceDropdownOpen(false);
                           }}
                           className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedCurrency === 'fun_coins' ? 'bg-[#3b82f6]/20 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                        >
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                 <img src={COIN_ICONS.fun_coins} className="w-6 h-6 object-contain" alt="Fun Coins" />
                              </div>
                             <div className="flex flex-col items-start leading-none">
                                <span className="text-[12px] font-black uppercase tracking-wider">Fun Coins</span>
                                <span className="text-[10px] opacity-50 font-bold mt-1">Practice Balance</span>
                             </div>
                          </div>
                          {selectedCurrency === 'fun_coins' && <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="ml-1 md:ml-2">
                  <button 
                    onClick={() => setIsWalletOpen(true)}
                    className="bg-gradient-to-b from-[#be30ff] to-[#7e22ce] hover:brightness-110 hover:-translate-y-0.5 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-md font-black text-[11px] md:text-[13px] uppercase tracking-wider transition-all active:scale-[0.96] duration-300"
                    style={{ 
                      boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -1.5px 0 rgba(0,0,0,0.4), 0 10px 20px -5px rgba(168,85,247,0.4)" 
                    }}
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

        {isWalletOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            style={{ animation: "backdropIn 0.2s ease-out both" }}
          >
            <div
              className="rounded-3xl w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden transform transition-all duration-500"
              style={{
                background: "#0d0b1a",
                animation: "walletIn 0.3s cubic-bezier(0.34,1.5,0.64,1) both",
              }}
            >
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[#be30ff]/20 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#be30ff" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </div>
                    <h2 className="text-[#be30ff] font-black text-xl uppercase tracking-tighter">Deposit</h2>
                  </div>
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-[#be30ff]/50 to-transparent" />
                  <button
                    onClick={() => {
                      setIsWalletOpen(false);
                      const chatWasOpen = getStorageItem("chatWasOpenBeforeWallet");
                      if (chatWasOpen === "true") {
                        window.dispatchEvent(new CustomEvent("toggleChat"));
                        removeStorageItem("chatWasOpenBeforeWallet");
                      }
                    }}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-inner"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Murder Mystery 2 Deposit Card */}
                  <button
                    onClick={() => {
                      setIsWalletOpen(false);
                      setIsMM2DepositOpen(true);
                    }}
                    className="relative aspect-[3/4] rounded-3xl overflow-hidden group shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                  >
                    <img
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/GWJgR7NWMAA24PN-1771597137952.jpg?width=400&height=400&resize=contain"
                      alt="MM2"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b1a] via-[#0d0b1a]/20 to-transparent" />
                    
                    {/* Decorative Purple Lightning/Glow effect matching screenshot */}
                    <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity bg-[radial-gradient(circle_at_50%_0%,_#be30ff55,_transparent_70%)]" />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                       <img 
                          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771596634629.png?width=400&height=400&resize=contain" 
                          className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-pulse"
                        />
                    </div>
                    
                    <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center">
                      <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                        <h3 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-[0.8]">MM2</h3>
                        <p className="text-[#be30ff] font-black text-lg sm:text-xl tracking-tight uppercase opacity-90">Deposit</p>
                      </div>
                    </div>
                  </button>

                  {/* Right side Promocode/Withdraw shortcut */}
                  <div className="flex flex-col gap-6">
                    <div className="flex-1 bg-white/[0.03] rounded-3xl p-8 backdrop-blur-sm flex flex-col justify-center">
                      <h3 className="text-white/40 font-black text-xs uppercase tracking-[0.2em] mb-4">Promocode Tool</h3>
                      <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl focus-within:ring-1 focus-within:ring-[#be30ff]/30 transition-all">
                        <input
                          type="text"
                          placeholder="ENTER CODE"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoStatus(null);
                          }}
                          className="flex-1 bg-transparent px-3 py-2 text-white font-black placeholder-white/20 uppercase tracking-widest text-xs outline-none min-w-0"
                        />
                        <button
                          onClick={handleClaimPromo}
                          disabled={promoClaiming || !promoCode.trim()}
                          className="px-4 py-2 rounded-lg bg-[#be30ff] text-white font-black text-[10px] tracking-widest hover:brightness-110 shadow-[0_3px_0_0_#7e22ce] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-50 shrink-0"
                        >
                          {promoClaiming ? "..." : "CLAIM"}
                        </button>
                      </div>
                      {promoStatus && (
                        <p className={`text-[10px] font-black mt-3 uppercase tracking-widest ${promoStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                          {promoStatus.message}
                        </p>
                      )}
                    </div>

                    {/* MM2 Withdraw Shortcut */}
                    <button
                      onClick={() => {
                        setIsWalletOpen(false);
                        router.push("/withdraw");
                      }}
                      className="group relative h-24 rounded-3xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                       <div className="absolute inset-0 bg-[#be30ff]/10 group-hover:bg-[#be30ff]/20 transition-colors" />
                       <div className="absolute inset-0 flex items-center justify-between px-8">
                          <div className="flex flex-col items-start gap-0.5">
                             <h4 className="text-white font-black text-xl italic tracking-tighter">WITHDRAW</h4>
                             <p className="text-[#be30ff] font-black text-[10px] uppercase tracking-[0.2em] opacity-80">MM2 Items</p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-[#be30ff]/20 flex items-center justify-center text-[#be30ff] group-hover:scale-110 transition-transform">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M13 5l7 7-7 7" />
                             </svg>
                          </div>
                       </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isMM2DepositOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            style={{ animation: "backdropIn 0.2s ease-out both" }}
          >
            <div
              className="rounded-3xl w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden transform transition-all duration-500"
              style={{
                background: "#0d0b1a",
                animation: "walletIn 0.3s cubic-bezier(0.34,1.5,0.64,1) both",
              }}
            >
              {/* Atmospheric Glow */}
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,_#be30ff15,_transparent_70%)] pointer-events-none" />
              {/* Header */}
              <div className="relative z-10 flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsMM2DepositOpen(false);
                      setIsWalletOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-[#be30ff] hover:text-white transition-colors text-sm font-black"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    BACK
                  </button>
                  <div className="flex items-center gap-2">
                    <img
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771597214066.png?width=128&height=128&resize=contain"
                      alt="MM2"
                      className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    />
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">
                      DEPOSIT MM2
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsMM2DepositOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-inner"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative z-10 p-5 space-y-4">
                {/* Bot list — live status from heartbeat */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
                      Trading Bots
                    </h3>
                  </div>
                  <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl overflow-hidden shadow-inner">
                    {(bots.length > 0
                      ? bots
                      : [
                          {
                            id: 0,
                            name: "Loading...",
                            roblox_username: null,
                            avatar: null,
                            online: false,
                          },
                        ]
                    )
                      .slice(0, 3)
                      .map((bot, i, arr) => (
                        <div
                          key={bot.id}
                          className={`flex items-center gap-4 px-4 py-4 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg overflow-hidden">
                              <img
                                src={
                                  bot.avatar ||
                                  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771596005810.png?width=400&height=400&resize=contain"
                                }
                                alt={bot.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm flex items-center gap-1">
                              {bot.roblox_username || bot.name}
                              <img
                                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771600588112.png?width=128&height=128&resize=contain"
                                alt="Verified"
                                width="16"
                                height="16"
                                className="object-contain"
                              />
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={
                                bot.online
                                  ? bot.private_server_url ||
                                    `https://www.roblox.com/users/search?keyword=${bot.roblox_username || bot.name}`
                                  : undefined
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[10px] font-black px-5 py-2.5 rounded-xl transition-all tracking-widest ${
                                bot.online
                                  ? "bg-[#be30ff] text-white shadow-[0_3px_0_0_#7e22ce] active:translate-y-[1px] active:shadow-none hover:brightness-110"
                                  : "bg-white/5 text-white/20 cursor-not-allowed pointer-events-none"
                              }`}
                            >
                              JOIN
                            </a>
                            <a
                              href={`https://www.roblox.com/users/search?keyword=${bot.roblox_username || bot.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white/5 hover:bg-white/10 text-white text-[10px] tracking-widest font-black px-5 py-2.5 rounded-xl transition-all shadow-inner active:translate-y-[1px]"
                            >
                              PROFILE
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Conversion rate */}
                <div>
                  <h3 className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    Conversion Rate
                  </h3>
                  <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl p-6 flex items-center justify-between gap-4 shadow-inner">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771596634629.png?width=400&height=400&resize=contain"
                        alt="MM2"
                        width="28"
                        height="28"
                        className="object-contain"
                      />
                      <span className="text-white font-bold text-sm">
                        1,000
                      </span>
                    </div>
                    <span className="text-[#be30ff] font-bold text-lg">=</span>
                    <div className="flex items-center gap-2">
                      <img
                        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=400&height=400&resize=contain"
                        alt="Coin"
                        width="20"
                        height="20"
                        className="rounded-full"
                      />
                      <span className="text-white font-bold text-sm">
                        1,000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isMM2WithdrawOpen && (
          <WithdrawShopModal
            balance={coinsBalance}
            username={username}
            onClose={() => setIsMM2WithdrawOpen(false)}
            onBack={() => {
              setIsMM2WithdrawOpen(false);
              setIsWalletOpen(true);
            }}
            onDeduct={(cost) => {
              const newBal = Math.max(0, coinsBalance - cost);
              setCoinsBalance(newBal);
              if (selectedCurrency === "coins") setDisplayBalance(newBal);
              window.dispatchEvent(new CustomEvent("balanceUpdate"));
            }}
            onWithdrawSuccess={() => {
              setIsMM2WithdrawOpen(false);
              setIsMM2WithdrawConfirmOpen(true);
            }}
          />
        )}

        {isMM2WithdrawConfirmOpen && (
          <WithdrawConfirmModal
            bots={bots}
            onClose={() => setIsMM2WithdrawConfirmOpen(false)}
            onBack={() => {
              setIsMM2WithdrawConfirmOpen(false);
              setIsMM2WithdrawOpen(true);
            }}
          />
        )}

        {isLitecoinOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            style={{ animation: "backdropIn 0.2s ease-out both" }}
          >
            <div
              className="rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(to bottom, #0a0a0a 0%, #0d0d12 100%)",
                animation: "walletIn 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
              }}
            >
              <div className="p-5">
                <h2 className="text-xl font-bold text-white mb-4">
                  Litecoin to Coins
                </h2>
                <p className="text-white/80 mb-4">
                  Convert your Litecoin to site coins.
                </p>
                {/* LitecoinDeposit removed to prevent build error */}
                <button
                  onClick={() => setIsLitecoinOpen(false)}
                  className="px-4 py-2 bg-[#be30ff] text-white rounded-lg font-extrabold mt-4"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />

        {/* Mobile bottom nav — only visible on mobile */}
        {/* Mobile top nav links (like desktop) */}
        <div className="flex md:hidden w-full justify-center items-center gap-6 px-2 pt-2 pb-1">
          {[
            { label: "Provably Fair", href: "/provably-fair" },
            { label: "TOS", href: "/tos" },
            { label: "Leaderboard", href: "/leaderboard" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="nav-link-underline hover:text-[#be30ff] transition-colors duration-200 uppercase tracking-wider text-[#be30ff] font-bold text-xs"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/affiliates"
            className="nav-link-underline hover:text-[#d8b4fe] transition-colors duration-200 uppercase tracking-wider text-[#be30ff] font-bold text-xs"
          >
            Affiliates
          </Link>
        </div>
        {/* Mobile Games Menu Overlay */}
        {isMobileGamesMenuOpen && (
          <div 
            className="fixed inset-0 z-[55] md:hidden"
            onClick={() => setIsMobileGamesMenuOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" />
            
            {/* Menu Content */}
            <div 
              className="absolute bottom-[90px] left-4 right-4 bg-[#0d0b1a]/95 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-8 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black text-lg tracking-tighter uppercase">Our Games</h3>
                <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-[#be30ff]/30 to-transparent rounded-full" />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {games.map((game) => (
                  <Link
                    key={game.name}
                    href={game.href}
                    onClick={() => setIsMobileGamesMenuOpen(false)}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#be30ff]/10 flex items-center justify-center text-[#be30ff] group-active:bg-[#be30ff] group-active:text-white transition-colors shadow-inner">
                      {React.cloneElement(game.icon as React.ReactElement, { size: 24 })}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-active:text-white transition-colors">{game.name}</span>
                  </Link>
                ))}
                {/* Home link as an extra option in the menu if needed, or just let them use the logo */}
                 <Link
                    href="/"
                    onClick={() => setIsMobileGamesMenuOpen(false)}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-active:text-white transition-colors shadow-inner">
                      <LayoutGrid size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-active:text-white transition-colors">Home</span>
                  </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobile bottom nav (home/chat only) */}
        <div
          className="fixed bottom-5 left-0 right-0 z-[60] md:hidden flex justify-center items-center gap-2 transition-transform duration-300"
          style={{
            transform: `translateY(${mobileNavVisible ? "0" : "120px"})`,
          }}
        >
          {/* Games button */}
          <button
            onClick={() => setIsMobileGamesMenuOpen(!isMobileGamesMenuOpen)}
            className={`flex items-center justify-center rounded-md active:scale-95 transition-all backdrop-blur-md relative group overflow-hidden outline-none ${isMobileGamesMenuOpen ? 'scale-110 shadow-[0_0_30px_rgba(190,48,255,0.4)]' : ''}`}
            style={{
              width: 52,
              height: 52,
              background: isMobileGamesMenuOpen ? "rgba(190, 48, 255, 0.2)" : "rgba(190, 48, 255, 0.1)",
              border: "none",
              boxShadow: isMobileGamesMenuOpen ? "0 0 40px rgba(190,48,255,0.6)" : "0 0 30px rgba(0,0,0,0.6)",
            }}
            aria-label="Games"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr from-[#be30ff]/10 to-transparent ${isMobileGamesMenuOpen ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity`} />
            <Gamepad2 
              size={24} 
              className={`${isMobileGamesMenuOpen ? 'text-white' : 'text-[#be30ff]'} drop-shadow-[0_0_8px_rgba(190,48,255,0.4)] transition-colors`} 
            />
          </button>
          {/* Chat button */}
          <button
            onClick={(e) => handleChatToggle(e)}
            className="flex items-center justify-center rounded-2xl active:scale-95 transition-transform backdrop-blur-md relative group overflow-hidden"
            style={{
              width: 52,
              height: 52,
              background: "rgba(190, 48, 255, 0.1)",
              border: "none",
              boxShadow: "0 0 30px rgba(0,0,0,0.6)",
            }}
            aria-label="Chat"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#be30ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageSquare 
              size={24} 
              className="text-[#be30ff] drop-shadow-[0_0_8px_rgba(190,48,255,0.4)]"
              fill="currentColor"
              fillOpacity={0.1}
            />
          </button>
        </div>
    </>
  );
}
