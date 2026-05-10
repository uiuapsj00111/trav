"use client";

import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import React, { useEffect, useRef, useState } from "react";

// const COIN_IMG = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772297776282.png?width=400&height=400&resize=contain";

type GameType = "all" | "coinflip" | "mines" | "limbo" | "cases" | "upgrader";
// battles removed

interface BetEntry {
  id: string;
  game_type: string;
  username: string;
  avatar_url: string | null;
  wager: number;
  payout: number;
  profit: number;
  multiplier: number | null;
  result: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const GAME_LABELS: Record<string, string> = {
  coinflip: "Coinflip",
  mines: "Mines",
  limbo: "Limbo",
  cases: "Cases",
  upgrader: "Upgrader",
  // battles removed
};

const GAME_COLORS: Record<string, string> = {
  coinflip: "#be30ff",
  mines: "#ef4444",
  limbo: "#be30ff",
  cases: "#3b82f6",
  upgrader: "#22c55e",
  // battles removed
};

const GAME_ICONS: Record<string, React.ReactNode> = {
  coinflip: (
    <img
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/ChatGPT-Image-Feb-17-2026-07_29_17-PM-1771356701989.png?width=128&height=128&resize=contain"
      alt="Coinflip"
      width={22}
      height={22}
      className="object-contain"
    />
  ),
  mines: (
    <img
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771252747314.png?width=128&height=128&resize=contain"
      alt="Mines"
      width={22}
      height={22}
      className="object-contain"
    />
  ),
  upgrader: (
    <img
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/ChatGPT-Image-Feb-17-2026-07_22_42-PM-1771362724634.png?width=128&height=128&resize=contain"
      alt="Upgrader"
      width={22}
      height={22}
      className="object-contain"
    />
  ),
  cases: (
    <img
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771252133443.png?width=128&height=128&resize=contain"
      alt="Cases"
      width={22}
      height={22}
      className="object-contain"
    />
  ),
  limbo: <div className="text-white font-bold">L</div>,
};

const TABS: { key: GameType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "coinflip", label: "Coinflip" },
  { key: "mines", label: "Mines" },
  { key: "limbo", label: "Limbo" },
  { key: "cases", label: "Cases" },
  { key: "upgrader", label: "Upgrader" },
  // battles removed
];

export default function BetHistory() {
  const { selectedCurrency } = useCurrency();
  const { user, token, isLoading: authLoading } = useAuth();
  const COIN_IMG = COIN_ICONS[selectedCurrency];
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [tab, setTab] = useState<GameType>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const authenticatedFetch = useAuthenticatedFetch();

  const fetchBets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(
        "Fetching bets for user:",
        user?.username,
        "token:",
        token ? "present" : "missing",
      );

      const response = await authenticatedFetch(
        `/api/bet-history/user?currency=${selectedCurrency}&limit=50`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Bet history API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setBets(data.bets || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error fetching bet history:", errorMessage);
      setError(`Failed to load bet history: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("BetHistory effect triggered:", {
      authLoading,
      userExists: !!user,
      tokenExists: !!token,
    });

    if (!authLoading) {
      fetchBets();
      initialized.current = true;

      // Set up polling for real-time updates (since we can't use Supabase realtime from client)
      const interval = setInterval(fetchBets, 10000); // Poll every 10 seconds

      return () => clearInterval(interval);
    }
  }, [selectedCurrency, user, token, authLoading]);

  const filtered =
    tab === "all" ? bets : bets.filter((b) => b.game_type === tab);

  return (
    <section className="w-full max-w-[1400px] mx-auto pt-6 pb-20 px-4 md:px-0">
      {loading && bets.length === 0 && (
        <div className="text-center py-10 text-[#4b5563] text-sm">
          Loading bet history...
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && bets.length === 0 && (
        <div className="text-center py-10 text-[#4b5563] text-sm">
          No bets found
        </div>
      )}

      {bets.length > 0 && (
        <>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[180px_1fr_120px_120px_90px] gap-4 px-6 mb-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
              Game
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
              Player
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">
              Wager
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">
              Multiplier
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">
              Time
            </span>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-[5px]">
            {filtered.length === 0 && (
              <div className="text-center py-10 text-[#4b5563] text-sm">
                No bets match the selected filter
              </div>
            )}
            {filtered.map((bet, i) => {
              const isNew = newIds.has(bet.id);
              const won = bet.profit >= 0;
              const color = GAME_COLORS[bet.game_type] || "#be30ff";

              return (
                <div
                  key={bet.id}
                  className="relative overflow-hidden rounded-lg border border-white/5 transition-all duration-200 hover:bg-white/[0.03] hover:border-white/10"
                  style={{
                    background: "rgba(13,13,13,0.6)",
                    animation: isNew
                      ? "rowSlideIn 0.5s cubic-bezier(0.34,1.2,0.64,1) both"
                      : `rowSlideIn 0.4s cubic-bezier(0.34,1.1,0.64,1) ${i * 30}ms both`,
                  }}
                >
                  {isNew && (
                    <div
                      className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-shimmer"
                    />
                  )}

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[180px_1fr_120px_120px_90px] gap-4 items-center px-6 py-4">
                    {/* Game */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center p-1.5 border border-white/5 shadow-inner">
                        {GAME_ICONS[bet.game_type] || GAME_ICONS.coinflip}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-[13px] font-black uppercase tracking-tight">
                          {GAME_LABELS[bet.game_type] || bet.game_type}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">TRAV.BET</span>
                      </div>
                    </div>

                    {/* Player */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {bet.avatar_url ? (
                          <img
                            src={bet.avatar_url}
                            alt={bet.username}
                            width={32}
                            height={32}
                            className="rounded-lg object-cover ring-1 ring-white/5"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white text-xs font-black ring-1 ring-white/5">
                            {bet.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#111] shadow-[0_0_10px_#22c55e44]" />
                      </div>
                      <span className="text-white text-[14px] font-black tracking-tight truncate max-w-[150px]">
                        {bet.username}
                      </span>
                    </div>

                    {/* Wager */}
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-white font-black text-[14px]">
                        {Number(bet.wager).toLocaleString()}
                      </span>
                      <img
                        src={COIN_IMG}
                        alt=""
                        width={14}
                        height={14}
                        className="object-contain"
                      />
                    </div>

                    {/* Multiplier / Profit */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-black text-[14px] ${won ? "text-green-500" : "text-red-500"}`}
                        >
                          {won ? "+" : ""}
                          {bet.multiplier?.toFixed(2) || "0.00"}x
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${won ? "text-green-500/50" : "text-red-500/50"}`}>
                        {won ? "+" : "-"}{Number(Math.abs(bet.profit)).toLocaleString()}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="text-right text-gray-600 text-[11px] font-black uppercase tracking-widest">
                      {timeAgo(bet.created_at)}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex md:hidden items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                      {GAME_ICONS[bet.game_type] || GAME_ICONS.coinflip}
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {bet.avatar_url ? (
                        <img
                          src={bet.avatar_url}
                          alt={bet.username}
                          width={22}
                          height={22}
                          className="rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-[22px] h-[22px] rounded-md bg-[#374151] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {bet.username?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="text-white text-[12px] font-semibold truncate">
                        {bet.username}
                      </span>
                      <span className="text-[#4b5563] text-[11px] flex-shrink-0">
                        {GAME_LABELS[bet.game_type]}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <img
                          src={COIN_IMG}
                          alt=""
                          width={12}
                          height={12}
                          className="object-contain"
                        />
                        <span className="text-white font-bold text-[12px]">
                          {Number(bet.wager).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className="font-bold text-[11px]"
                        style={{ color: won ? "#22c55e" : "#ef4444" }}
                      >
                        {won ? "+" : ""}
                        {Number(bet.profit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
