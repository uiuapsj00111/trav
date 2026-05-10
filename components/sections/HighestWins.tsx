"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { useEffect, useState } from "react";

interface WinEntry {
  id: string;
  game_type: string;
  username: string;
  avatar_url: string | null;
  wager: number;
  payout: number;
  profit: number;
  multiplier: number | null;
  created_at: string;
}

export default function HighestWins() {
  const { selectedCurrency } = useCurrency();
  const COIN_IMG = COIN_ICONS[selectedCurrency];
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWins = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/bet-history/wins?currency=${selectedCurrency}&limit=5`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch highest wins");
        }
        const data = await response.json();
        setWins(data.wins || []);
      } catch (error) {
        console.error("Error fetching highest wins:", error);
        setWins([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWins();
  }, [selectedCurrency]);

  if (loading || wins.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-black text-white uppercase tracking-widest">
          Highest Wins
        </h3>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#be30ff] to-transparent opacity-20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {wins.map((win, i) => (
          <div
            key={win.id}
            className="bg-[#1a1f2e]/40 border border-white/[0.04] rounded-2xl p-5 relative overflow-hidden group hover:border-[#be30ff]/20 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <img
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-9-1771412557776.png?width=128&height=128&resize=contain"
                alt=""
                className="w-12 h-12 object-contain"
              />
            </div>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/5 relative z-10">
                <img
                  src={
                    win.avatar_url ||
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23556987"><circle cx="12" cy="12" r="10"/></svg>'
                  }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-bold truncate tracking-tight uppercase tracking-wider italic">
                  @{win.username}
                </p>
                <p className="text-[#be30ff] text-[10px] font-bold tracking-widest uppercase opacity-70 italic">
                  {win.game_type}
                </p>
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-1.5">
                <img src={COIN_IMG} alt="" className="w-3.5 h-3.5" />
                <span className="text-[#22c55e] font-black text-lg tracking-tight">
                  +{win.profit.toLocaleString()}
                </span>
              </div>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase italic">
                Multiplier:{" "}
                <span className="text-white">
                  {(win.multiplier || 1).toFixed(2)}x
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
