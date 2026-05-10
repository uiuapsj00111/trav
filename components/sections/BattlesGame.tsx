"use client";

import { useAuth, useAuthenticatedFetch } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFair } from "@/contexts/FairContext";
import { recordGameResult } from "@/lib/recordGame";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import FairModal from "./FairModal";

const COIN_IMG =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=400&height=400&resize=contain";

/* ÔöÇÔöÇ Case Data (shared with CasesGame) ÔöÇÔöÇ */
interface CaseItem {
  name: string;
  value: number;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  color: string;
  image: string;
  chance: number;
}

interface CaseBox {
  name: string;
  price: number;
  image: string;
  barColor: string;
  barPercent: number;
  items: CaseItem[];
}

const CASES: CaseBox[] = [
  {
    name: "10% New PC",
    price: 228,
    image: "https://i.imgur.com/5qN7zWl.png",
    barColor: "#eab308",
    barPercent: 45,
    items: [
      {
        name: "RTX 4090 Build",
        value: 2000,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/yQxLkZD.png",
        chance: 1,
      },
      {
        name: "RTX 4070 Ti Build",
        value: 1200,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/rHPKz0B.png",
        chance: 1.5,
      },
      {
        name: "AMD Ryzen Build",
        value: 800,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/S1QHJFM.png",
        chance: 2.5,
      },
      {
        name: "Mid Tower Build",
        value: 500,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/LHzFupF.png",
        chance: 5,
      },
      {
        name: "Steam $100 Card",
        value: 100,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/RxFwOHS.png",
        chance: 10,
      },
      {
        name: "Steam $50 Card",
        value: 50,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/FKjGQUb.png",
        chance: 10,
      },
      {
        name: "Steam Gems",
        value: 1,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/mABdjLq.png",
        chance: 70,
      },
    ],
  },
  {
    name: "Sleep Well",
    price: 190,
    image: "https://i.imgur.com/qWjFdNp.png",
    barColor: "#ef4444",
    barPercent: 55,
    items: [
      {
        name: "LV Pillow Set",
        value: 1500,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/qWjFdNp.png",
        chance: 1,
      },
      {
        name: "Silk Sheet Set",
        value: 600,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/qWjFdNp.png",
        chance: 3,
      },
      {
        name: "Weighted Blanket",
        value: 200,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/qWjFdNp.png",
        chance: 10,
      },
      {
        name: "Sleep Mask",
        value: 20,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/qWjFdNp.png",
        chance: 86,
      },
    ],
  },
  {
    name: "10% Sports Cards",
    price: 170,
    image: "https://i.imgur.com/xR8VYpK.png",
    barColor: "#ef4444",
    barPercent: 65,
    items: [
      {
        name: "Rookie Auto PSA 10",
        value: 1500,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/xR8VYpK.png",
        chance: 1,
      },
      {
        name: "Vintage Holo",
        value: 500,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/xR8VYpK.png",
        chance: 3,
      },
      {
        name: "Base Set Pack",
        value: 150,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/xR8VYpK.png",
        chance: 12,
      },
      {
        name: "Common Lot",
        value: 30,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/xR8VYpK.png",
        chance: 84,
      },
    ],
  },
  {
    name: "10% GPU",
    price: 125,
    image: "https://i.imgur.com/3RPQVZJ.png",
    barColor: "#eab308",
    barPercent: 40,
    items: [
      {
        name: "RTX 4090 Ti",
        value: 1000,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/3RPQVZJ.png",
        chance: 1,
      },
      {
        name: "RTX 4080",
        value: 500,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/3RPQVZJ.png",
        chance: 3,
      },
      {
        name: "RTX 4060",
        value: 150,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/3RPQVZJ.png",
        chance: 12,
      },
      {
        name: "GT 1030",
        value: 20,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/3RPQVZJ.png",
        chance: 84,
      },
    ],
  },
  {
    name: "Outdoor Explorer",
    price: 75,
    image: "https://i.imgur.com/J5LHKQE.png",
    barColor: "#eab308",
    barPercent: 35,
    items: [
      {
        name: "North Face Jacket",
        value: 500,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/J5LHKQE.png",
        chance: 1.5,
      },
      {
        name: "Hiking Boots",
        value: 200,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/J5LHKQE.png",
        chance: 5,
      },
      {
        name: "Backpack",
        value: 80,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/J5LHKQE.png",
        chance: 15,
      },
      {
        name: "Water Bottle",
        value: 10,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/J5LHKQE.png",
        chance: 78.5,
      },
    ],
  },
  {
    name: "Shoe Vault",
    price: 54,
    image: "https://i.imgur.com/PkHqYfR.png",
    barColor: "#eab308",
    barPercent: 30,
    items: [
      {
        name: "Travis Scott AJ1",
        value: 600,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/PkHqYfR.png",
        chance: 1,
      },
      {
        name: "Yeezy 350",
        value: 200,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/PkHqYfR.png",
        chance: 4,
      },
      {
        name: "Nike Dunk",
        value: 80,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/PkHqYfR.png",
        chance: 15,
      },
      {
        name: "Air Force 1",
        value: 20,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/PkHqYfR.png",
        chance: 80,
      },
    ],
  },
  {
    name: "Pokemon Collector",
    price: 49,
    image: "https://i.imgur.com/vTcLtB8.png",
    barColor: "#3b82f6",
    barPercent: 50,
    items: [
      {
        name: "Charizard PSA 10",
        value: 800,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/vTcLtB8.png",
        chance: 1,
      },
      {
        name: "Pikachu VMAX",
        value: 200,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/vTcLtB8.png",
        chance: 4,
      },
      {
        name: "Booster Box",
        value: 80,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/vTcLtB8.png",
        chance: 15,
      },
      {
        name: "Theme Deck",
        value: 15,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/vTcLtB8.png",
        chance: 80,
      },
    ],
  },
  {
    name: "10% Xbox",
    price: 42,
    image: "https://i.imgur.com/6sFqGbP.png",
    barColor: "#22c55e",
    barPercent: 45,
    items: [
      {
        name: "Xbox Series X",
        value: 500,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/6sFqGbP.png",
        chance: 1,
      },
      {
        name: "Elite Controller",
        value: 150,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/6sFqGbP.png",
        chance: 5,
      },
      {
        name: "Game Pass 1yr",
        value: 60,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/6sFqGbP.png",
        chance: 15,
      },
      {
        name: "Headset",
        value: 15,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/6sFqGbP.png",
        chance: 79,
      },
    ],
  },
  {
    name: "Fragrance Box",
    price: 38,
    image: "https://i.imgur.com/KfRJMkv.png",
    barColor: "#be30ff",
    barPercent: 40,
    items: [
      {
        name: "Creed Aventus",
        value: 400,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/KfRJMkv.png",
        chance: 1,
      },
      {
        name: "Tom Ford Oud",
        value: 150,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/KfRJMkv.png",
        chance: 5,
      },
      {
        name: "Dior Sauvage",
        value: 50,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/KfRJMkv.png",
        chance: 20,
      },
      {
        name: "CK One",
        value: 10,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/KfRJMkv.png",
        chance: 74,
      },
    ],
  },
  {
    name: "10% PS5",
    price: 35,
    image: "https://i.imgur.com/8LmZBbZ.png",
    barColor: "#3b82f6",
    barPercent: 50,
    items: [
      {
        name: "PS5 Bundle",
        value: 500,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/8LmZBbZ.png",
        chance: 1,
      },
      {
        name: "DualSense Edge",
        value: 150,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/8LmZBbZ.png",
        chance: 4,
      },
      {
        name: "PS Plus 1yr",
        value: 50,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/8LmZBbZ.png",
        chance: 15,
      },
      {
        name: "Game Disc",
        value: 15,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/8LmZBbZ.png",
        chance: 80,
      },
    ],
  },
  {
    name: "Touch Grass Deluxe",
    price: 28,
    image: "https://i.imgur.com/hYfDnSP.png",
    barColor: "#22c55e",
    barPercent: 55,
    items: [
      {
        name: "Camping Set",
        value: 300,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/hYfDnSP.png",
        chance: 1,
      },
      {
        name: "Hammock Pro",
        value: 100,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/hYfDnSP.png",
        chance: 5,
      },
      {
        name: "Binoculars",
        value: 40,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/hYfDnSP.png",
        chance: 15,
      },
      {
        name: "Frisbee",
        value: 5,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/hYfDnSP.png",
        chance: 79,
      },
    ],
  },
  {
    name: "Midnight Munchies",
    price: 15,
    image: "https://i.imgur.com/YcWkPtD.png",
    barColor: "#be30ff",
    barPercent: 35,
    items: [
      {
        name: "Snack Mega Box",
        value: 100,
        rarity: "legendary",
        color: "#f59e0b",
        image: "https://i.imgur.com/YcWkPtD.png",
        chance: 2,
      },
      {
        name: "Candy Haul",
        value: 50,
        rarity: "rare",
        color: "#be30ff",
        image: "https://i.imgur.com/YcWkPtD.png",
        chance: 5,
      },
      {
        name: "Chip Variety",
        value: 20,
        rarity: "uncommon",
        color: "#3b82f6",
        image: "https://i.imgur.com/YcWkPtD.png",
        chance: 20,
      },
      {
        name: "Chocolate Bar",
        value: 5,
        rarity: "common",
        color: "#9ca3af",
        image: "https://i.imgur.com/YcWkPtD.png",
        chance: 73,
      },
    ],
  },
  {
    name: "Pink's Trav Paradise",
    price: 315,
    image:
      "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-6-1771117374228.png?width=400&height=400&resize=contain",
    barColor: "#ec4899",
    barPercent: 50,
    items: [
      {
        name: "Pink Traveler's Axe",
        value: 5000,
        rarity: "legendary",
        color: "#ec4899",
        image:
          "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/5a61d9f5-beb0-4738-a134-404e585d62a5-1771117810473.png?width=400&height=400&resize=contain",
        chance: 1,
      },
      {
        name: "Golden Traveler's Axe",
        value: 2000,
        rarity: "legendary",
        color: "#f59e0b",
        image:
          "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/c4ba1c48-5185-4058-bdac-8e3cd10b5435-1771117566967.png?width=400&height=400&resize=contain",
        chance: 3,
      },
      {
        name: "Blue Traveler's Axe",
        value: 750,
        rarity: "rare",
        color: "#3b82f6",
        image:
          "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/45e3e453-ce4e-4509-83b8-3637bcea82e1-1771117592190.png?width=400&height=400&resize=contain",
        chance: 10,
      },
      {
        name: "Green Traveler's Axe",
        value: 250,
        rarity: "uncommon",
        color: "#22c55e",
        image:
          "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/23d4a19e-d2dc-426e-a73e-4147380bcbd8-1771117547292.png?width=400&height=400&resize=contain",
        chance: 86,
      },
    ],
  },
];

/* ÔöÇÔöÇ Battle list types ÔöÇÔöÇ */
const AVATAR_COLORS = [
  "#FF8C00",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#14b8a6",
];
type BattleType =
  | "CURSED JACKPOT"
  | "TEAM BATTLE"
  | "JACKPOT MODE"
  | "REGULAR BATTLE";
interface BattleCase {
  name: string;
  count: number;
}
interface BattlePlayer {
  name: string;
  avatar: string;
  avatarUrl?: string;
  filled: boolean;
  isBot?: boolean;
}
interface Badge {
  icon: "crown" | "fire" | "star";
  color: string;
}
interface Battle {
  id: string;
  type: BattleType;
  players: BattlePlayer[];
  cases: BattleCase[];
  totalRounds: number;
  price: number;
  originalPrice: number;
  discount: number;
  badges: Badge[];
  completed?: boolean;
  status: string;
}

const TYPE_COLORS: Record<BattleType, string> = {
  "CURSED JACKPOT": "#eab308",
  "TEAM BATTLE": "#22c55e",
  "JACKPOT MODE": "#be30ff",
  "REGULAR BATTLE": "#94a3b8",
};

type SortOption = "price-high" | "price-low";

const PLAYER_FORMATS = [
  { label: "1 v 1", count: 2 },
  { label: "1 v 1 v 1", count: 3 },
  { label: "1 v 1 v 1 v 1", count: 4 },
  { label: "2 v 2", count: 4 },
];

const BATTLE_MODES = [
  {
    id: "crazy",
    label: "CRAZY MODE",
    desc: "Unbox the least to win",
    emoji: "🔥",
    color: "#ef4444",
  },
  {
    id: "jackpot",
    label: "JACKPOT MODE",
    desc: "All pulls go into the Jackpot",
    emoji: "💰",
    color: "#eab308",
  },
  {
    id: "borrow",
    label: "BORROW",
    desc: "Pay only a portion of the battle",
    emoji: "📊",
    color: "#be30ff",
  },
];

/* ÔöÇÔöÇ Count-up animation component ÔöÇÔöÇ */
function CountUpNumber({
  target,
  duration = 1500,
  className,
  style,
}: {
  target: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(target);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return (
    <span className={className} style={style}>
      {display.toLocaleString()}
    </span>
  );
}

/* ÔöÇÔöÇ Case Inspect Popup (right-click) ÔöÇÔöÇ */
function CaseInspectModal({
  caseData,
  onClose,
}: {
  caseData: CaseBox;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-[90vw] max-w-[850px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #0a0a0a 100%)",
          border: "1px solid #2a2a2a",
          boxShadow: "0 5px 0 0 #0d0700, 0 30px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src={caseData.image}
              alt={caseData.name}
              className="w-12 h-12 object-contain"
            />
            <div>
              <h2 className="text-[16px] font-black text-white uppercase tracking-wide">
                {caseData.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <img src={COIN_IMG} alt="coin" className="w-4 h-4" />
                <span className="text-white font-extrabold text-[14px]">
                  {caseData.price.toLocaleString()}
                </span>
                {/* Price bar */}
                <div className="w-24 h-1.5 rounded-full bg-[#2a2a2a]/50 relative overflow-hidden ml-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${caseData.barPercent}%`,
                      background: `linear-gradient(90deg, #22c55e, #eab308, ${caseData.barColor})`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0a0a0a] border-2 border-[#3b82f6]"
                    style={{
                      left: `${caseData.barPercent}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#be30ff] hover:text-white transition-colors"
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
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-[14px] font-[900] text-white uppercase tracking-wider mb-4">
            Items Drops in the Case
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {caseData.items.map((item) => (
              <div
                key={item.name}
                className="rounded-xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${item.color}15, ${item.color}05)`,
                  border: "none",
                  boxShadow: "none",
                }}
              >
                <div className="relative p-4 flex items-center justify-center h-[140px]">
                  <span
                    className="absolute top-2 right-2 text-[11px] font-[800] px-2 py-0.5 rounded-full"
                    style={{ background: `${item.color}20`, color: item.color }}
                  >
                    {item.chance}%
                  </span>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-w-[80%] max-h-[100px] object-contain drop-shadow-lg"
                  />
                </div>
                <div className="px-3 pb-3">
                  <p className="text-[12px] font-bold text-[#be30ff] truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <img src={COIN_IMG} alt="coin" className="w-3.5 h-3.5" />
                    <span className="text-white font-[800] text-[13px]">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ÔöÇÔöÇ Create Battle View ÔöÇÔöÇ */
function CreateBattleView({
  onBack,
  onStartBattle,
}: {
  onBack: () => void;
  onStartBattle: (config: ActiveBattleConfig) => void;
}) {
  // selectedCases tracks quantities: { caseName -> quantity }
  const [caseQuantities, setCaseQuantities] = useState<Record<string, number>>(
    {},
  );
  const [playerFormat, setPlayerFormat] = useState(0);
  const [showFormatDrop, setShowFormatDrop] = useState(false);
  const [modes, setModes] = useState<Record<string, boolean>>({
    crazy: false,
    jackpot: false,
    borrow: false,
  });
  const [borrowPercent, setBorrowPercent] = useState(20);
  const [isPrivate, setIsPrivate] = useState(false);
  const [fastSpin, setFastSpin] = useState(false);
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseSortBy, setCaseSortBy] = useState<"high" | "low">("high");
  const [priceRange, setPriceRange] = useState<"all" | "low" | "mid" | "high">(
    "all",
  );
  const [showPriceRangeDrop, setShowPriceRangeDrop] = useState(false);
  const [showCaseSortDrop, setShowCaseSortDrop] = useState(false);
  const [inspectCase, setInspectCase] = useState<CaseBox | null>(null);
  const [availableCases, setAvailableCases] = useState<CaseBox[]>(CASES);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAvailableCases(data);
      })
      .catch(() => {});
  }, []);

  const selectedCases = availableCases.filter(
    (c) => (caseQuantities[c.name] || 0) > 0,
  );
  const totalCost = selectedCases.reduce(
    (s, c) => s + c.price * (caseQuantities[c.name] || 0),
    0,
  );
  const rounds = selectedCases.reduce(
    (s, c) => s + (caseQuantities[c.name] || 0),
    0,
  );

  const addCase = (name: string) => {
    setCaseQuantities((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
  };
  const removeOneCase = (name: string) => {
    setCaseQuantities((prev) => {
      const next = { ...prev };
      if ((next[name] || 0) <= 1) delete next[name];
      else next[name]--;
      return next;
    });
  };
  const toggleMode = (id: string) => setModes((p) => ({ ...p, [id]: !p[id] }));

  const handleContextMenu = (e: React.MouseEvent, c: CaseBox) => {
    e.preventDefault();
    setInspectCase(c);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 pt-12">
      {/* Inspect modal */}
      {inspectCase && (
        <CaseInspectModal
          caseData={inspectCase}
          onClose={() => setInspectCase(null)}
        />
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 rounded-md mb-4 text-[13px] font-[900] text-white uppercase tracking-wide transition-all hover:brightness-110"
        style={{
          background:
            "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
        }}
      >
        BACK TO BATTLES
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[22px] font-[900] text-white tracking-wide uppercase"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          Case Battles
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 px-5 py-3">
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#be30ff]/60 uppercase tracking-wider mb-1">
                Battle Cost
              </p>
              <div className="flex items-center gap-1.5 justify-center">
                <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                {modes.borrow && borrowPercent > 0 ? (
                  <div className="flex flex-col items-start leading-none gap-0.5">
                    <span className="text-orange-400 font-[900] text-[18px]">
                      {Math.round(
                        totalCost * (1 - borrowPercent / 100),
                      ).toLocaleString()}
                    </span>
                    <span className="text-[#be30ff]/50 font-bold text-[11px] line-through">
                      {totalCost.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-white font-[900] text-[18px]">
                    {totalCost.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-[#be30ff]/60 uppercase tracking-wider mb-1">
                Rounds
              </p>
              <span className="text-white font-[900] text-[18px]">
                {rounds}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (selectedCases.length === 0) return;
              onStartBattle({
                cases: selectedCases.map((c) => ({
                  caseData: c,
                  qty: caseQuantities[c.name] || 1,
                })),
                playerCount: PLAYER_FORMATS[playerFormat].count,
                fastSpin,
                modes,
                isPrivate,
                isTeamBattle: PLAYER_FORMATS[playerFormat].label === "2 v 2",
                borrowPercent: modes.borrow ? borrowPercent : 0,
              });
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-white text-[14px] font-[900] uppercase tracking-wide transition-all bg-gradient-to-b from-[#be30ff] to-[#7e22ce] shadow-[0_4px_0_0_#9a3412,0_6px_12px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#9a3412,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] border border-[#d8b4fe]/30 hover:brightness-110 ${selectedCases.length === 0 ? "opacity-50 pointer-events-none" : ""}`}
          >
            Create Battle
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Left: Selected cases */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-6">
            {selectedCases.flatMap((c) => {
              const qty = caseQuantities[c.name] || 1;
              return Array.from({ length: qty }).map((_, index) => (
                <div
                  key={`${c.name}-${index}`}
                  className="relative w-[180px] rounded-sm flex flex-col items-center p-3 cursor-pointer transition-all hover:brightness-110"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(42,42,42,0.8), rgba(26,26,26,0.95))",
                    boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.3)",
                  }}
                  onContextMenu={(e) => handleContextMenu(e, c)}
                >
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-[120px] h-[120px] object-contain drop-shadow-lg flex-1"
                  />
                  <div className="w-full mt-3 space-y-2">
                    <p className="text-[11px] font-bold text-[#be30ff] text-center truncate w-full">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1 justify-center">
                      <img src={COIN_IMG} alt="coin" className="w-3.5 h-3.5" />
                      <span className="text-white font-[800] text-[13px]">
                        {c.price.toLocaleString()}
                      </span>
                    </div>
                    {/* Price bar */}
                    <div className="w-full h-1 rounded-full bg-[#2a2a2a]/50 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${c.barPercent}%`,
                          background: `linear-gradient(90deg, #22c55e, #eab308, ${c.barColor})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ));
            })}

            {/* Add Case card */}
            <button
              onClick={() => setShowCasePicker(true)}
              className="w-[180px] h-[240px] rounded-sm flex flex-col items-center justify-center gap-3 transition-all hover:brightness-125 hover:scale-[1.02]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
                boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.2)",
              }}
            >
              <div
                className="w-10 h-10 rounded-sm flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
                  boxShadow: "0 2px 0 0 #0d0700",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </div>
              <span className="text-[12px] font-[800] text-white uppercase tracking-wider">
                Add Case
              </span>
            </button>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="w-[340px] flex-shrink-0 space-y-4">
          {/* Add Players */}
          <div>
            <div
              className="flex items-center gap-2 mb-2 px-3 py-2 rounded-sm"
              style={{
                background:
                  "linear-gradient(135deg, rgba(42,42,42,0.5), rgba(26,26,26,0.7))",
                boxShadow: "0 2px 0 0 #0d0700",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#ffffff"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span
                className="text-[13px] font-[900] text-white uppercase tracking-wider"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
              >
                Add Players
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFormatDrop(!showFormatDrop)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-sm transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(42,42,42,0.8), rgba(26,26,26,0.95))",
                  boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  {Array.from({
                    length: PLAYER_FORMATS[playerFormat].count,
                  }).map((_, i) => {
                    const fmt = PLAYER_FORMATS[playerFormat];
                    const isTeam = fmt.label === "2 v 2";
                    const showSword = i > 0 && (isTeam ? i === 2 : true);
                    return (
                      <React.Fragment key={i}>
                        {showSword && (
                          <span className="text-white text-[11px] font-bold">
                            ✕
                          </span>
                        )}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="#ffffff"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </React.Fragment>
                    );
                  })}
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform ${showFormatDrop ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showFormatDrop && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-sm overflow-hidden z-50"
                  style={{
                    background: "#141414",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  {PLAYER_FORMATS.map((fmt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPlayerFormat(i);
                        setShowFormatDrop(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[12px] font-bold transition-all ${playerFormat === i ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]/50"}`}
                    >
                      {Array.from({ length: fmt.count }).map((_, j) => {
                        const isTeam = fmt.label === "2 v 2";
                        const showSword = j > 0 && (isTeam ? j === 2 : true);
                        const fillColor =
                          playerFormat === i ? "#ffffff" : "#ffffff";
                        return (
                          <React.Fragment key={j}>
                            {showSword && (
                              <span
                                className={`text-[11px] font-bold text-white`}
                              >
                                &#x2694;
                              </span>
                            )}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill={fillColor}
                            >
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </React.Fragment>
                        );
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mode toggles */}
          <div
            className="rounded-sm overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(42,42,42,0.8), rgba(26,26,26,0.95))",
              boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.3)",
            }}
          >
            {BATTLE_MODES.map((mode, i) => (
              <div key={mode.id}>
                <div
                  className={`flex items-center justify-between px-4 py-3.5 ${i < BATTLE_MODES.length - 1 || modes[mode.id] ? "border-b border-[#2a2a2a]/50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[18px]">{mode.emoji}</span>
                    <div>
                      <p className="text-[12px] font-[900] text-white uppercase tracking-wider">
                        {mode.label}
                      </p>
                      <p className="text-[10px] text-[#be30ff]/70 mt-0.5">
                        {mode.desc}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMode(mode.id)}
                    className="relative w-[44px] h-[24px] rounded-full transition-all"
                    style={{
                      background: modes[mode.id]
                        ? mode.color
                        : "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
                      boxShadow: modes[mode.id]
                        ? `0 2px 0 0 ${mode.color}80`
                        : "0 2px 0 0 #0d0700",
                    }}
                  >
                    <div
                      className="absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all"
                      style={{
                        left: modes[mode.id] ? "22px" : "2px",
                        background:
                          "linear-gradient(to bottom, #ffffff, #e0e0e0)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      }}
                    />
                  </button>
                </div>
                {/* Borrow slider panel */}
                {mode.id === "borrow" && modes.borrow && (
                  <div
                    className="px-4 py-4 border-b border-[#2a2a2a]/50"
                    style={{ background: "rgba(20,10,0,0.6)" }}
                  >
                    {/* Label + value */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-[900] text-[#be30ff]/80 uppercase tracking-wider">
                        Borrow Amount
                      </span>
                      <span className="text-[14px] font-[900] text-[#FF8C00]">
                        {borrowPercent}%
                      </span>
                    </div>
                    {/* Slider */}
                    <div className="relative mb-3">
                      <input
                        type="range"
                        min={0}
                        max={80}
                        step={1}
                        value={borrowPercent}
                        onChange={(e) =>
                          setBorrowPercent(Number(e.target.value))
                        }
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #FF8C00 0%, #E57C00 ${borrowPercent / 0.8}%, rgba(58,31,0,0.8) ${borrowPercent / 0.8}%, rgba(58,31,0,0.8) 100%)`,
                          accentColor: "#FF8C00",
                        }}
                      />
                    </div>
                    {/* Quick-select 3D buttons */}
                    <div className="flex gap-2">
                      {[0, 20, 40, 60, 80].map((v) => (
                        <button
                          key={v}
                          onClick={() => setBorrowPercent(v)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-[900] uppercase tracking-wide transition-all active:translate-y-[2px]"
                          style={
                            borrowPercent === v
                              ? {
                                  background:
                                    "linear-gradient(to bottom, #d8b4fe, #7e22ce)",
                                  color: "#fff",
                                  border: "1px solid #FF8C00",
                                  boxShadow:
                                    "0 3px 0 0 #9a3412, 0 4px 8px rgba(249,115,22,0.3)",
                                }
                              : {
                                  background:
                                    "linear-gradient(to bottom, #2a1800, #0d0d12)",
                                  color: "#be30ff",
                                  border: "1px solid rgba(58,31,0,0.8)",
                                  boxShadow: "0 3px 0 0 #0d0700",
                                }
                          }
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                    {/* Cost breakdown */}
                    <div
                      className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(249,115,22,0.08)",
                        border: "1px solid rgba(249,115,22,0.2)",
                      }}
                    >
                      <span className="text-[11px] text-[#be30ff]/70 font-bold">
                        You pay
                      </span>
                      <div className="flex items-center gap-1">
                        <img
                          src={COIN_IMG}
                          alt="coin"
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-[13px] font-[900] text-white">
                          {Math.round(
                            totalCost * (1 - borrowPercent / 100),
                          ).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#be30ff]/50 ml-1">
                          / {totalCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom toggles */}
          <div className="flex gap-3">
            {[
              {
                label: "Private",
                value: isPrivate,
                toggle: () => setIsPrivate(!isPrivate),
              },
              {
                label: "Fast Spin",
                value: fastSpin,
                toggle: () => setFastSpin(!fastSpin),
              },
            ].map((t) => (
              <div
                key={t.label}
                className="flex-1 flex items-center justify-between px-4 py-3 rounded-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(42,42,42,0.8), rgba(26,26,26,0.95))",
                  boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.3)",
                }}
              >
                <span className="text-[12px] font-[800] text-white">
                  {t.label}
                </span>
                <button
                  onClick={t.toggle}
                  className="relative w-[44px] h-[24px] rounded-full transition-all"
                  style={{
                    background: t.value
                      ? "#FF8C00"
                      : "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
                    boxShadow: t.value
                      ? "0 2px 0 0 #9a3412"
                      : "0 2px 0 0 #0d0700",
                  }}
                >
                  <div
                    className="absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all"
                    style={{
                      left: t.value ? "22px" : "2px",
                      background:
                        "linear-gradient(to bottom, #ffffff, #e0e0e0)",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ÔöÇÔöÇ Add Cases Modal ÔöÇÔöÇ */}
      {showCasePicker && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          onClick={() => setShowCasePicker(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-[90vw] max-w-[1000px] max-h-[75vh] flex flex-col rounded-sm overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
              boxShadow: "0 5px 0 0 #0d0700, 0 30px 80px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5">
              <h2 className="text-[16px] font-[900] text-white tracking-wide">
                Add Cases
              </h2>
              <button
                onClick={() => setShowCasePicker(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#be30ff] hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs and Search bar */}
            <div className="flex flex-col px-5 py-4">
              {/* Tabs and Search on same row */}
              <div className="flex gap-1.5 items-center">
                {/* Tabs */}
                <div className="flex gap-1 items-center">
                  <button className="px-4 py-2.5 rounded-sm bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-bold text-[13px] transition-all hover:brightness-110 whitespace-nowrap">
                    Original
                  </button>
                  <button className="px-4 py-2.5 rounded-sm bg-[#2a2a2a] text-white font-bold text-[13px] transition-all hover:bg-[#3a3a3a] whitespace-nowrap">
                    Community
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#2a2a2a] text-white font-bold text-[13px] transition-all hover:bg-[#3a3a3a] whitespace-nowrap">
                    <span>
                      Price Range:{" "}
                      {priceRange === "all"
                        ? "Any"
                        : priceRange === "low"
                          ? "Low"
                          : priceRange === "mid"
                            ? "Mid"
                            : "High"}
                    </span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#2a2a2a] text-white font-bold text-[13px] transition-all hover:bg-[#3a3a3a] whitespace-nowrap">
                    <span>
                      Sort:{" "}
                      {caseSortBy === "high"
                        ? "Price (High To Low)"
                        : "Price (Low To High)"}
                    </span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Search input */}
                <div className="relative ml-auto">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search for cases..."
                    value={caseSearch}
                    onChange={(e) => setCaseSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-white text-[13px] font-bold placeholder:text-gray-600"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(42,42,42,0.6), rgba(26,26,26,0.8))",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cases grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="grid grid-cols-4 gap-4">
                {availableCases
                  .filter((c) => {
                    if (
                      caseSearch &&
                      !c.name.toLowerCase().includes(caseSearch.toLowerCase())
                    )
                      return false;
                    if (priceRange === "low" && c.price >= 100) return false;
                    if (
                      priceRange === "mid" &&
                      (c.price < 100 || c.price > 500)
                    )
                      return false;
                    if (priceRange === "high" && c.price < 500) return false;
                    return true;
                  })
                  .sort((a, b) =>
                    caseSortBy === "high"
                      ? b.price - a.price
                      : a.price - b.price,
                  )
                  .map((c) => {
                    const qty = caseQuantities[c.name] || 0;
                    return (
                      <div
                        key={c.name}
                        className="flex flex-col rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(42,42,42,0.8), rgba(26,26,26,0.95))",
                          boxShadow: "0 2px 0 0 #0d0700",
                        }}
                        onContextMenu={(e) => handleContextMenu(e, c)}
                      >
                        <div className="relative w-full aspect-[4/3] flex items-center justify-center p-3 cursor-pointer">
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-[70%] h-[70%] object-contain drop-shadow-lg"
                          />
                        </div>
                        <div className="px-2.5 pb-2.5">
                          <p className="text-[11px] font-bold text-[#be30ff] truncate">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <img
                              src={COIN_IMG}
                              alt="coin"
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-white font-[800] text-[13px]">
                              {c.price.toLocaleString()}
                            </span>
                          </div>
                          {/* Price bar */}
                          <div className="w-full h-1 rounded-full bg-[#2a2a2a]/50 mt-1.5 relative overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${c.barPercent}%`,
                                background: `linear-gradient(90deg, #22c55e, #eab308, ${c.barColor})`,
                              }}
                            />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"
                              style={{
                                left: `${c.barPercent}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          </div>
                          {qty > 0 ? (
                            <div
                              className="mt-2 w-full flex items-center rounded-sm overflow-hidden"
                              style={{ background: "rgba(0,0,0,0.3)" }}
                            >
                              <button
                                onClick={() =>
                                  setCaseQuantities((prev) => {
                                    const n = (prev[c.name] || 0) - 1;
                                    if (n <= 0) {
                                      const next = { ...prev };
                                      delete next[c.name];
                                      return next;
                                    }
                                    return { ...prev, [c.name]: n };
                                  })
                                }
                                className="flex-none w-8 h-8 flex items-center justify-center text-white hover:text-white hover:bg-[#3a1f00]/50 transition-all text-lg font-bold select-none"
                              >
                                −
                              </button>
                              <span className="flex-1 text-center text-white font-[800] text-[13px] select-none">
                                {qty}
                              </span>
                              <button
                                onClick={() => addCase(c.name)}
                                className="flex-none w-8 h-8 flex items-center justify-center text-white hover:text-white hover:bg-[#3a1f00]/50 transition-all text-lg font-bold select-none"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addCase(c.name)}
                              className="mt-2 w-full py-1.5 rounded-sm text-[11px] font-[900] text-white transition-all hover:brightness-110 active:translate-y-[1px] bg-gradient-to-b from-[#be30ff] to-[#7e22ce] shadow-[0_2px_0_0_#9a3412] active:shadow-[0_0px_0_0_#9a3412]"
                            >
                              Add Box
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer with total cases and continue button */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="text-[#be30ff] text-[12px] font-bold">
                Total cases:{" "}
                <span className="text-white">
                  {Object.values(caseQuantities).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <div className="text-[#be30ff] text-[12px]">
                Total selected:{" "}
                <span className="text-white font-bold">
                  $
                  {Object.entries(caseQuantities)
                    .reduce((sum, [name, qty]) => {
                      const c = availableCases.find((x) => x.name === name);
                      return sum + (c ? c.price * qty : 0);
                    }, 0)
                    .toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => {
                  // Handle continue logic
                  console.log("Continue with cases:", caseQuantities);
                }}
                className="px-6 py-2 rounded-sm bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-[900] text-[12px] hover:brightness-110 active:translate-y-[1px] transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ÔöÇÔöÇ Active Battle View (opening cases with scrolling reels) ÔöÇÔöÇ */
interface ActiveBattleConfig {
  cases: { caseData: CaseBox; qty: number }[];
  playerCount: number;
  fastSpin: boolean;
  modes: Record<string, boolean>;
  isPrivate: boolean;
  isTeamBattle: boolean;
  borrowPercent?: number;
  existingPlayers?: BattlePlayer[];
  existingPhase?: string;
  existingResults?: RoundResult[];
}

interface RoundResult {
  roundNum: number;
  caseName: string;
  items: { player: string; item: CaseItem }[];
}

const DEFAULT_BOT_NAMES = [
  "Modge",
  "Mr. Bean",
  "Drake",
  "C. Johnson",
  "xRoyal",
  "BladeKing",
  "SkinLord",
  "CrateBoss",
  "LootKing",
  "GemHunter",
  "MM2Pro",
  "TradeMaster",
];

interface BotData {
  id: number;
  name: string;
  avatar: string;
  enabled: boolean;
}

/* Fetch bots from Supabase (falls back to defaults) */
let cachedBots: BotData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // refresh every 60s
async function fetchBots(): Promise<BotData[]> {
  if (cachedBots && Date.now() - cacheTime < CACHE_TTL) return cachedBots;
  try {
    const { data, error } = await supabase
      .from("bots")
      .select("*")
      .eq("enabled", true)
      .order("id");
    if (!error && data && data.length > 0) {
      cachedBots = data;
      cacheTime = Date.now();
      return data;
    }
  } catch {}
  return DEFAULT_BOT_NAMES.map((n, i) => ({
    id: i,
    name: n,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}&scale=80`,
    enabled: true,
  }));
}

function useBots() {
  const [bots, setBots] = useState<BotData[]>([]);
  useEffect(() => {
    fetchBots().then(setBots);
  }, []);
  return bots;
}

const REEL_ITEMS = 40;

function pickItem(caseData: CaseBox): CaseItem {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const item of caseData.items) {
    cumulative += item.chance;
    if (roll <= cumulative) return item;
  }
  return caseData.items[caseData.items.length - 1];
}

function buildHorizontalReel(items: CaseItem[], winItem: CaseItem): CaseItem[] {
  const weighted: CaseItem[] = [];
  for (const item of items) {
    const count = Math.max(1, Math.round(item.chance));
    for (let i = 0; i < count; i++) weighted.push(item);
  }
  const reel: CaseItem[] = [];
  for (let i = 0; i < REEL_ITEMS; i++) {
    reel.push(weighted[Math.floor(Math.random() * weighted.length)]);
  }
  reel[REEL_ITEMS - 5] = winItem;
  return reel;
}

/* ÔöÇÔöÇ Sound effects (same as CasesGame) ÔöÇÔöÇ */
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 600 + pitch * 200 + Math.random() * 150;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
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

function playRouletteTick() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.04);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch {}
}

function playJackpotWin() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Big rising sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(200, t);
    sweep.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    sweepGain.gain.setValueAtTime(0.15, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sweep.connect(sweepGain).connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.55);
    // Triumphant chime sequence
    [800, 1000, 1200, 1600].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + 0.2 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + i * 0.1 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + 0.2 + i * 0.1);
      osc.stop(t + 0.2 + i * 0.1 + 0.45);
    });
    // Deep bass impact
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(180, t + 0.15);
    bass.frequency.exponentialRampToValueAtTime(40, t + 0.6);
    bassGain.gain.setValueAtTime(0.4, t + 0.15);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(t + 0.15);
    bass.stop(t + 0.75);
  } catch {}
}

function playCountdownBeep() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Deep punchy tick - layered bass + mid hit
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
    // Mid click layer
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.type = "triangle";
    mid.frequency.value = 800;
    midGain.gain.setValueAtTime(0.15, t);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    mid.connect(midGain).connect(ctx.destination);
    mid.start(t);
    mid.stop(t + 0.1);
    // Noise burst for texture
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
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    // Rising sweep + impact
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(200, t);
    sweep.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    sweepGain.gain.setValueAtTime(0.2, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    sweep.connect(sweepGain).connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 0.35);
    // Big bass hit
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(150, t + 0.05);
    bass.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    bassGain.gain.setValueAtTime(0.4, t + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(t + 0.05);
    bass.stop(t + 0.45);
    // Bright chime
    [1200, 1500].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, t + 0.1 + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1 + i * 0.06 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + 0.1 + i * 0.06);
      osc.stop(t + 0.1 + i * 0.06 + 0.3);
    });
  } catch {}
}

function playCallBotSound() {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 500;
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch {}
}

/* Spin ticking: uses the same tick system as CasesGame with accelerating/decelerating intervals */
function startSpinTicking(
  durationMs: number,
  tickRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
) {
  if (tickRef.current) clearInterval(tickRef.current);
  playSpinStartSound();
  let tickRate = 35;
  let elapsed = 0;
  let pitch = 1;
  const startTicking = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      elapsed += tickRate;
      const progress = elapsed / durationMs;
      if (progress > 0.7) {
        playSlowTickSound();
      } else {
        playTickSound(pitch);
        pitch = Math.max(0, 1 - progress);
      }
      if (progress > 0.5) {
        tickRate = Math.min(tickRate + 12, 350);
        if (tickRef.current) clearInterval(tickRef.current);
        if (elapsed < durationMs - 200) startTicking();
      }
    }, tickRate);
  };
  startTicking();
  return () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };
}

function playBattleWinFanfare() {
  playWinSound("legendary");
}

/* ÔöÇÔöÇ Provably Fair hash ÔöÇÔöÇ */
function generateHash(): string {
  const chars = "0123456789abcdef";
  let hash = "";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

const BATTLE_ITEM_WIDTH = 130;
const BATTLE_ITEM_GAP = 10;

/* Idle looping reel - continuously scrolls with no landing, no sound */
function IdleReel({
  items,
  playerColor,
  borrowPercent = 0,
}: {
  items: CaseItem[];
  playerColor: string;
  borrowPercent?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`idle-${Math.random().toString(36).slice(2, 8)}`);
  // Build a long repeating strip of random items
  const reel = useRef(
    (() => {
      const weighted: CaseItem[] = [];
      for (const item of items) {
        const count = Math.max(1, Math.round(item.chance));
        for (let i = 0; i < count; i++) weighted.push(item);
      }
      const r: CaseItem[] = [];
      for (let i = 0; i < 80; i++)
        r.push(weighted[Math.floor(Math.random() * weighted.length)]);
      return r;
    })(),
  ).current;

  const totalWidth = reel.length * (BATTLE_ITEM_WIDTH + BATTLE_ITEM_GAP);
  const halfWidth = totalWidth / 2;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Looping strip */}
      <div
        className="absolute inset-y-0 left-0 flex items-center"
        style={{
          gap: `${BATTLE_ITEM_GAP}px`,
          paddingLeft: "4px",
          animation: `${idRef.current} ${reel.length * 0.15}s linear infinite`,
        }}
      >
        {/* Render twice for seamless loop */}
        {[...reel, ...reel].map((item, i) => (
          <div
            key={i}
            className="flex-shrink-0 flex flex-col items-center justify-center"
            style={{
              width: BATTLE_ITEM_WIDTH,
              height: 240,
            }}
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-40 h-40 object-contain mb-2 drop-shadow-lg"
            />
            <p className="text-[11px] text-[#be30ff] font-bold text-center px-1 truncate max-w-full">
              {item.name}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <img src={COIN_IMG} alt="" className="w-3.5 h-3.5" />
              <span
                className="text-[12px] font-[800]"
                style={{ color: item.color }}
              >
                {Math.floor(
                  item.value * (1 - borrowPercent / 100),
                ).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ${idRef.current} { 0% { transform: translateX(0); } 100% { transform: translateX(-${halfWidth}px); } }
        @keyframes float { 
          0% { transform: translateY(0px) scale(1); } 
          25% { transform: translateY(-30px) scale(1.15); } 
          50% { transform: translateY(0px) scale(1); } 
          75% { transform: translateY(-18px) scale(1.1); } 
          100% { transform: translateY(0px) scale(1); } 
        }
      `,
        }}
      />
    </div>
  );
}

/* Single player reel spinner - horizontal scroll within a column */
function PlayerReel({
  items,
  winItem,
  spinning,
  spinDuration,
  playerColor,
  onLand,
  borrowPercent = 0,
}: {
  items: CaseItem[];
  winItem: CaseItem;
  spinning: boolean;
  spinDuration: number;
  playerColor: string;
  onLand: () => void;
  borrowPercent?: number;
}) {
  const [reel] = useState(() => buildHorizontalReel(items, winItem));
  const [landed, setLanded] = useState(false);
  const translateX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive the "tick" and "rotate" animation for the arrows from the reel's position
  // 140px = BATTLE_ITEM_WIDTH (130) + BATTLE_ITEM_GAP (10)
  const topRotate = useTransform(translateX, (val) => {
    const p = Math.abs(val) % 140;
    // Smoother bell curve for rotation to avoid flickering
    const tilt = Math.exp(-Math.pow((p - 70) / 20, 2)) * (p - 70) * -0.8;
    return tilt;
  });

  const topTick = useTransform(translateX, (val) => {
    const p = Math.abs(val) % 140;
    const bounce = Math.exp(-Math.pow((p - 70) / 20, 2)) * 5;
    return bounce;
  });

  const bottomRotate = useTransform(translateX, (val) => {
    const p = Math.abs(val) % 140;
    const tilt = Math.exp(-Math.pow((p - 70) / 20, 2)) * (p - 70) * 0.8;
    return tilt;
  });

  const bottomTick = useTransform(translateX, (val) => {
    const p = Math.abs(val) % 140;
    const bounce = Math.exp(-Math.pow((p - 70) / 20, 2)) * 5;
    return -bounce;
  });

  useEffect(() => {
    if (!spinning || !containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const landingPos = REEL_ITEMS - 5;
    const centerOffset = containerW / 2 - BATTLE_ITEM_WIDTH / 2;
    const target =
      landingPos * (BATTLE_ITEM_WIDTH + BATTLE_ITEM_GAP) - centerOffset;

    const controls = animate(translateX, target, {
      duration: spinDuration / 1000,
      ease: [0.15, 0.85, 0.25, 1],
      onComplete: () => {
        setLanded(true);
        onLand();
      },
    });

    return () => {
      controls.stop();
      setLanded(false);
    };
  }, [spinning]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Top arrow */}
      <motion.div 
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
        style={{ y: topTick, rotate: topRotate }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `10px solid ${playerColor}`,
          }}
        />
      </motion.div>
      {/* Bottom arrow */}
      <motion.div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20"
        style={{ y: bottomTick, rotate: bottomRotate }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: `10px solid ${playerColor}`,
          }}
        />
      </motion.div>

      {/* Scrolling strip */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center"
        style={{
          gap: `${BATTLE_ITEM_GAP}px`,
          paddingLeft: "4px",
          x: useTransform(translateX, (v) => -v),
        }}
      >
        {reel.map((item, i) => {
          const isWin = landed && i === REEL_ITEMS - 5;
          return (
            <div
              key={i}
              className="flex-shrink-0 flex flex-col items-center justify-center"
              style={{
                width: BATTLE_ITEM_WIDTH,
                height: 240,
              }}
            >
              <div
                className="group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-40 h-40 object-contain mb-2 transition-transform duration-300 group-hover:animate-[float_2s_ease-in-out_infinite]"
                  style={{
                    filter: isWin
                      ? `drop-shadow(0 0 20px ${item.color})`
                      : "none",
                    animation: isWin
                      ? "float 2.5s ease-in-out infinite"
                      : "none",
                  }}
                />
                <p className="text-[11px] text-[#be30ff] font-bold text-center px-1 truncate max-w-full">
                  {item.name}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <img src={COIN_IMG} alt="" className="w-3.5 h-3.5" />
                  <span
                    className="text-[12px] font-[800]"
                    style={{
                      color: item.color,
                    }}
                  >
                    {Math.floor(
                      item.value * (1 - borrowPercent / 100),
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

type BattlePhase =
  | "lobby"
  | "countdown"
  | "playing"
  | "jackpotRoulette"
  | "finished";

interface PlayerSlot {
  name: string;
  isYou: boolean;
  isBot: boolean;
  joined: boolean;
  avatar?: string;
}

function ActiveBattleView({
  config,
  battleId,
  username,
  avatarUrl,
  onBack,
}: {
  config: ActiveBattleConfig;
  battleId: string | null;
  username: string;
  avatarUrl: string;
  onBack: () => void;
}) {
  const authenticatedFetch = useAuthenticatedFetch();
  const {
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
    refreshBalances,
  } = useCurrency();

  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey =
    selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

  const getBalance = () => balance;

  const setBalanceLS = (newBal: number) => {
    if (selectedCurrency === "coins") setCoinsBalance(newBal);
    else setFunCoinsBalance(newBal);

    localStorage.setItem(balanceKey, newBal.toString());
    localStorage.setItem("mm2dice_balance_ts", Date.now().toString());
    window.dispatchEvent(new Event("balanceUpdate"));
  };

  const animateBalance = (from: number, to: number) => {
    window.dispatchEvent(
      new CustomEvent("balanceAnimate", {
        detail: { from, to },
      }),
    );
  };

  const bots = useBots();
  const isRestoredFinished =
    config.existingPhase === "finished" &&
    config.existingResults &&
    config.existingResults.length > 0;
  const isRestoredPlaying = config.existingPhase === "playing";
  const initialPhase: BattlePhase = isRestoredFinished
    ? "finished"
    : isRestoredPlaying
      ? "playing"
      : "lobby";
  const [phase, setPhase] = useState<BattlePhase>(initialPhase);
  const [countdown, setCountdown] = useState(3);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>(() => {
    // Restore from DB if existing players are available (e.g. re-entering a battle with bots)
    if (config.existingPlayers && config.existingPlayers.length > 0) {
      return config.existingPlayers.map((p) => ({
        name: p.name,
        isYou: p.name === username,
        isBot: !!p.isBot,
        joined: p.filled,
        avatar:
          p.avatarUrl ||
          (p.avatar && p.avatar.startsWith("http") ? p.avatar : "") ||
          "",
      }));
    }
    const slots: PlayerSlot[] = [
      { name: username, isYou: true, isBot: false, joined: true },
    ];
    for (let i = 1; i < config.playerCount; i++)
      slots.push({ name: "", isYou: false, isBot: false, joined: false });
    return slots;
  });
  const [results, setResults] = useState<RoundResult[]>(
    (isRestoredFinished || isRestoredPlaying) &&
      config.existingResults &&
      config.existingResults.length > 0
      ? config.existingResults
      : [],
  );
  const [currentRound, setCurrentRound] = useState(
    (isRestoredFinished || isRestoredPlaying) &&
      config.existingResults &&
      config.existingResults.length > 0
      ? config.existingResults.length
      : 0,
  );
  const [spinning, setSpinning] = useState(false);
  const [roundWinItems, setRoundWinItems] = useState<CaseItem[]>([]);
  const [landedCount, setLandedCount] = useState(0);
  // Opponent-side: tracks which round index is currently being displayed (replaces currentRound for render)
  const [opponentDisplayRound, setOpponentDisplayRound] = useState(0);
  const roundStartedRef = useRef(false);
  const [winChance] = useState(() => (Math.random() * 50 + 20).toFixed(2));
  const [serverSeed] = useState(() => generateHash());
  const [clientSeed] = useState(() => generateHash().slice(0, 16));
  const [showFairInfo, setShowFairInfo] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Jackpot roulette state
  const [rouletteOffset, setRouletteOffset] = useState(0);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);
  const rawScoresRef = useRef<Record<string, number>>({});
  const rouletteStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Polling fallback: re-fetch battle from API every 3s while in lobby
  useEffect(() => {
    if (!battleId || phase !== "lobby") return;
    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/battles/${battleId}`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const { battle } = await response.json();
        if (battle?.players) {
          setPlayerSlots((prev) => {
            // Only update if something actually changed
            const hasChange = battle.players.some(
              (p: any, i: number) =>
                p.filled !== prev[i]?.joined || p.name !== prev[i]?.name,
            );
            if (!hasChange) return prev;
            return battle.players.map((p: any) => ({
              name: p.name,
              isYou: p.name === username,
              isBot: !!p.isBot,
              joined: p.filled,
              avatar:
                p.avatarUrl ||
                (p.avatar && p.avatar.startsWith("http") ? p.avatar : "") ||
                "",
            }));
          });
        }
      } catch (error) {
        console.error("Error polling battle:", error);
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [battleId, phase, username]);

  // Realtime: sync playerSlots when another player joins/bots are added
  useEffect(() => {
    if (!battleId) return;
    const channel = supabase
      .channel(`battle-${battleId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battles",
          filter: `id=eq.${battleId}`,
        },
        (payload) => {
          console.log("[Realtime] Battle update received:", payload.new);
          const row = payload.new as {
            players?: {
              name: string;
              avatar: string;
              avatarUrl?: string;
              filled: boolean;
              isBot?: boolean;
            }[];
            phase?: string;
            status?: string;
          };
          if (row.players) {
            setPlayerSlots(
              row.players.map((p) => ({
                name: p.name,
                isYou: p.name === username,
                isBot: !!p.isBot,
                joined: p.filled,
                avatar:
                  p.avatarUrl ||
                  (p.avatar && p.avatar.startsWith("http") ? p.avatar : "") ||
                  "",
              })),
            );
          }
          if (row.phase === "playing" || row.status === "active") {
            setPhase((prev) => (prev === "lobby" ? "countdown" : prev));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Subscribed to battle", battleId);
        } else {
          console.warn("[Realtime] Subscription status:", status);
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, username]);

  // Jackpot roulette: horizontal scrolling strip like case opening
  useEffect(() => {
    if (phase !== "jackpotRoulette") return;
    const entries = Object.entries(rawScoresRef.current);
    const totalScore = entries.reduce((s, [, v]) => s + v, 0) || 1;

    // Weighted random pick ÔöÇö more coins = higher chance, but NOT guaranteed
    let roll = Math.random() * totalScore;
    let actualWinner = players[0];
    for (const [player, score] of entries) {
      roll -= score;
      if (roll <= 0) {
        actualWinner = player;
        break;
      }
    }

    // Each "cycle" is one full set of all player segments
    // Segment width proportional to percentage, total cycle width = STRIP_CYCLE_W
    const STRIP_CYCLE_W = 600; // px per full cycle
    const percentages = players.map(
      (p) => (rawScoresRef.current[p] || 0) / totalScore,
    );

    // Find where the winner segment center is within one cycle
    let winnerCenter = 0;
    for (let i = 0; i < players.length; i++) {
      const segW = percentages[i] * STRIP_CYCLE_W;
      if (players[i] === actualWinner) {
        winnerCenter += segW / 2;
        break;
      }
      winnerCenter += segW;
    }

    // Spin through ~8 full cycles + land on winner center + small random offset within segment
    const winnerSegW =
      (percentages[players.indexOf(actualWinner)] || 0.25) * STRIP_CYCLE_W;
    const randomWithin = (Math.random() - 0.5) * winnerSegW * 0.5;
    const targetOffset = STRIP_CYCLE_W * 8 + winnerCenter + randomWithin;

    // Start spin after brief delay
    setTimeout(() => {
      setRouletteOffset(targetOffset);
      setRouletteSpinning(true);
      playRouletteTick();
    }, 300);

    // After spin completes, reveal winner
    const spinDur = 5000;
    const revealTimer = setTimeout(() => {
      setRouletteWinner(actualWinner);
      playJackpotWin();
      setTimeout(() => {
        setPhase("finished");
        playBattleWinFanfare();
      }, 2000);
    }, spinDur + 500);

    return () => {
      clearTimeout(revealTimer);
    };
  }, [phase]);

  /* ÔöÇÔöÇ Award winnings when battle finishes ÔöÇÔöÇ */
  const [winningsAwarded, setWinningsAwarded] = useState(false);
  const hasAwardedRef = useRef(false);

  const totalRounds = config.cases.reduce((s, c) => s + c.qty, 0);
  const spinDuration = config.fastSpin ? 2000 : 3500;
  const roundOrder = useRef(
    config.cases.flatMap((c) =>
      Array.from({ length: c.qty }, () => c.caseData),
    ),
  ).current;
  const allJoined = playerSlots.every((s) => s.joined);

  /* ÔöÇÔöÇ Mode flags ÔöÇÔöÇ */
  const isShareMode = config.modes.share;
  const isCrazyMode = config.modes.crazy;
  const isJackpotMode = config.modes.jackpot;
  const isPartialFunding = config.modes.partial;
  const isBorrowMode = config.modes.borrow;
  const isPrivate = config.isPrivate;

  const isCreator = username === playerSlots[0]?.name;

  const joinBattle = async (slotIndex: number) => {
    // Deduct cost from balance
    const costPerPlayer = config.cases.reduce(
      (s, c) => s + c.caseData.price * c.qty,
      0,
    );
    const borrowFraction = isBorrowMode
      ? (100 - (config.borrowPercent ?? 80)) / 100
      : 1;
    const joinCost = isBorrowMode
      ? Math.floor(costPerPlayer * borrowFraction)
      : costPerPlayer;
    const currentBal = balance;
    if (currentBal < joinCost) {
      alert(
        `Insufficient balance to join! Need ${joinCost.toLocaleString()} ${
          selectedCurrency === "coins" ? "coins" : "fun coins"
        }.`,
      );
      return;
    }
    const newBal = currentBal - joinCost;
    animateBalance(currentBal, newBal);
    setBalanceLS(newBal);

    // Build updated slots outside state updater so we can use them for API call
    const next = [...playerSlots];
    next[slotIndex] = {
      name: username,
      isYou: true,
      isBot: false,
      joined: true,
      avatar: avatarUrl,
    };
    setPlayerSlots(next);

    if (battleId) {
      try {
        const joinResponse = await authenticatedFetch(`/api/battles/${battleId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            player_name: username,
            player_avatar: avatarUrl,
            slot_index: slotIndex,
          }),
        });

        if (!joinResponse.ok) {
          // Refund balance on error by refreshing from server
          await refreshBalances();
          animateBalance(newBal, currentBal);
          const errorData = await joinResponse.json().catch(() => ({}));
          alert(`Failed to join battle: ${errorData.error || "Unknown error"}`);
          // Reset player slots
          const reset = [...playerSlots];
          reset[slotIndex] = {
            name: "",
            isYou: false,
            isBot: false,
            joined: false,
            avatar: "#FF8C00",
          };
          setPlayerSlots(reset);
          return;
        }

        const { updated_players, all_filled } = await joinResponse.json();

        // Update UI with server response
        const newSlots = updated_players.map((p: any) => ({
          name: p.name,
          isYou: p.name === username,
          isBot: p.isBot,
          joined: p.filled,
          avatar:
            p.avatarUrl ||
            (p.avatar && p.avatar.startsWith("#")
              ? p.avatar
              : p.avatar || "#be30ff"),
        }));
        setPlayerSlots(newSlots);

        if (all_filled) {
          setPhase("countdown");
        }
      } catch (error) {
        console.error("Error joining battle:", error);
        // Refund balance on error by refreshing from server
        await refreshBalances();
        animateBalance(newBal, currentBal);
        alert("Failed to join battle. Please try again.");
        // Reset player slots
        const reset = [...playerSlots];
        reset[slotIndex] = {
          name: "",
          isYou: false,
          isBot: false,
          joined: false,
          avatar: "#FF8C00",
        };
        setPlayerSlots(reset);
      }
    }
  };

  const callBot = async (slotIndex: number) => {
    playCallBotSound();
    // Partial funding: deduct the bot's share from your balance
    let deductedAmount = 0;
    if (isPartialFunding) {
      const botShareCost = config.cases.reduce(
        (s, c) => s + c.caseData.price * c.qty,
        0,
      );
      const currentBal = balance;
      if (currentBal < botShareCost) {
        alert(
          `Insufficient balance to fund bot! Need ${botShareCost.toLocaleString()} ${
            selectedCurrency === "coins" ? "coins" : "fun coins"
          }.`,
        );
        return;
      }
      const newBal = currentBal - botShareCost;
      animateBalance(currentBal, newBal);
      setBalanceLS(newBal);
      deductedAmount = botShareCost;
    }
    const previousSlots = [...playerSlots];
    const next = [...playerSlots];
    const usedNames = new Set(next.filter((s) => s.joined).map((s) => s.name));
    const botPool =
      bots.length > 0
        ? bots
        : DEFAULT_BOT_NAMES.map((n, i) => ({
            id: i,
            name: n,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(n)}&scale=80`,
            enabled: true,
          }));
    const available = botPool.filter((b) => !usedNames.has(b.name));
    const picked =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : botPool[Math.floor(Math.random() * botPool.length)];
    next[slotIndex] = {
      name: picked.name,
      isYou: false,
      isBot: true,
      joined: true,
      avatar: picked.avatar || "",
    };
    setPlayerSlots(next);

    // Update DB with bot player via secure API
    if (battleId) {
      try {
        const addBotResponse = await authenticatedFetch(`/api/battles/${battleId}/add-bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bot_name: picked.name,
            bot_avatar: picked.avatar,
            slot_index: slotIndex,
            partial_funding: isPartialFunding,
          }),
        });

        if (!addBotResponse.ok) {
          // Refund and reset on failure
          if (deductedAmount > 0) {
            await refreshBalances();
          }
          setPlayerSlots(previousSlots);
          const errorData = await addBotResponse.json().catch(() => ({}));
          alert(`Failed to add bot: ${errorData.error || "Unknown error"}`);
          return;
        }

        const { updated_players, all_filled } = await addBotResponse.json();

        // Update UI with server response
        const newSlots = updated_players.map((p: any) => ({
          name: p.name,
          isYou: p.name === username,
          isBot: p.isBot,
          joined: p.filled,
          avatar:
            p.avatarUrl ||
            (p.avatar && p.avatar.startsWith("#")
              ? p.avatar
              : p.avatar || "#be30ff"),
        }));
        setPlayerSlots(newSlots);

        if (all_filled) {
          setPhase("countdown");
        }
      } catch (error) {
        console.error("Error adding bot:", error);
        // Refund and reset on failure
        if (deductedAmount > 0) {
          await refreshBalances();
        }
        setPlayerSlots(previousSlots);
        alert(`Failed to add bot: ${error instanceof Error ? error.message : "Please try again."}`);
      }
    }
  };

  useEffect(() => {
    if (allJoined && phase === "lobby") {
      setPhase("countdown");
      setCountdown(3);
    }
  }, [allJoined, phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      playCountdownGo();
      setPhase("playing");
      return;
    }
    playCountdownBeep();
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const players = playerSlots.filter((s) => s.joined).map((s) => s.name);

  // Save round results and phase to API after each round (incremental save)
  useEffect(() => {
    if (!battleId || results.length === 0) return;

    const updateBattle = async () => {
      try {
        await fetch(`/api/battles/${battleId}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            phase:
              phase === "finished"
                ? "finished"
                : phase === "jackpotRoulette"
                  ? "finished"
                  : phase,
            round_results: results,
            status: phase === "finished" ? "finished" : "active",
          }),
        });
      } catch (error) {
        console.error("Error updating battle:", error);
      }
    };

    if (phase === "finished" || phase === "jackpotRoulette") {
      if (!isRestoredFinished) {
        updateBattle();
      }
    } else if (phase === "playing") {
      // Save after each round so we can resume mid-game
      updateBattle();
    }
  }, [phase, battleId, results.length, isRestoredFinished]);

  // Refs so the interval always reads latest values without re-mounting
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Tracks the last round index the opponent has already queued/started ÔÇö updated
  // synchronously (not via useEffect) so the poll never double-fires the same round.
  const opponentLastQueuedRound = useRef(-1);
  const opponentSpinningRef = useRef(false);

  // Opponent: poll API during playing phase to get creator's round results
  const opponentPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!battleId || isCreator || phase !== "playing") return;
    // Only reset tracking refs once when we first enter playing phase
    // Do NOT reset inside the interval or on re-renders
    opponentLastQueuedRound.current = -1;
    opponentSpinningRef.current = false;

    opponentPollRef.current = setInterval(async () => {
      // Hard lock: skip entirely if mid-spin
      if (opponentSpinningRef.current) return;

      try {
        const response = await fetch(`/api/battles/${battleId}`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const { battle } = await response.json();
        if (!battle) return;

        const row = battle as {
          round_results?: RoundResult[];
          phase?: string;
          status?: string;
        };
        const pPlayers = playersRef.current;

        // The next round index the opponent needs to play
        const nextRound = opponentLastQueuedRound.current + 1;

        if (row.round_results && row.round_results.length > nextRound) {
          const newRound = row.round_results[nextRound];
          const picks = pPlayers.map(
            (p) =>
              newRound.items.find((ri) => ri.player === p)?.item ||
              newRound.items[0]?.item,
          );
          if (picks.every(Boolean)) {
            // Lock synchronously BEFORE any async/state work
            opponentLastQueuedRound.current = nextRound;
            opponentSpinningRef.current = true;

            setOpponentDisplayRound(nextRound);
            setRoundWinItems(picks as CaseItem[]);
            setLandedCount(0);
            roundStartedRef.current = true;
            startSpinTicking(
              spinDuration + (pPlayers.length - 1) * 200,
              tickRef,
            );
            setSpinning(true);
            // Do NOT call setCurrentRound here ÔÇö opponent doesn't need it,
            // and changing it causes the playing effect to re-fire

            // Release lock only after full spin + settle has completed
            const settlePad = config.fastSpin ? 400 : 600;
            setTimeout(
              () => {
                opponentSpinningRef.current = false;
              },
              spinDuration + (pPlayers.length - 1) * 200 + settlePad + 800,
            );
          }
        }

        // Creator has finished — jump straight to finished state
        if (row.phase === "finished" || row.status === "finished") {
          clearInterval(opponentPollRef.current!);
          // Wait for any in-progress spin to complete before transitioning
          const waitForSpin = opponentSpinningRef.current
            ? spinDuration +
              (pPlayers.length - 1) * 200 +
              (config.fastSpin ? 400 : 600) +
              800
            : 0;
          setTimeout(() => {
            if (row.round_results && row.round_results.length > 0) {
              setResults(row.round_results);
            }
            setPhase("finished");
            playBattleWinFanfare();
          }, waitForSpin);
        }
      } catch (error) {
        console.error("Error polling battle:", error);
      }
    }, 1000);
    return () => {
      if (opponentPollRef.current) clearInterval(opponentPollRef.current);
    };
  }, [battleId, isCreator, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (currentRound >= totalRounds) {
      if (isJackpotMode) {
        setPhase("jackpotRoulette");
      } else {
        setPhase("finished");
        playBattleWinFanfare();
      }
      return;
    }
    if (spinning) return;
    // Only the creator computes random items; opponent gets them via DB poll above
    if (!isCreator) return;
    const timer = setTimeout(() => {
      const caseData = roundOrder[currentRound];
      const picks = players.map(() => pickItem(caseData));
      setRoundWinItems(picks);
      setLandedCount(0);
      roundStartedRef.current = true;
      startSpinTicking(spinDuration + (players.length - 1) * 200, tickRef);
      setSpinning(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [phase, currentRound, spinning]);

  useEffect(() => {
    if (landedCount >= players.length && spinning && roundStartedRef.current) {
      roundStartedRef.current = false;
      playWinSound(roundWinItems[0]?.rarity || "common");
      if (isCreator) {
        const roundItems = players.map((p, i) => ({
          player: p,
          item: roundWinItems[i],
        }));
        setResults((prev) => [
          ...prev,
          {
            roundNum: currentRound + 1,
            caseName: roundOrder[currentRound].name,
            items: roundItems,
          },
        ]);
        setTimeout(
          () => {
            setSpinning(false);
            setCurrentRound((prev) => prev + 1);
          },
          config.fastSpin ? 400 : 600,
        );
      } else {
        // Opponent: use opponentLastQueuedRound for round index (currentRound is not updated on opponent side)
        const roundIdx = opponentLastQueuedRound.current;
        const roundItems = players.map((p, i) => ({
          player: p,
          item: roundWinItems[i],
        }));
        setResults((prev) => [
          ...prev,
          {
            roundNum: roundIdx + 1,
            caseName: roundOrder[roundIdx]?.name ?? "",
            items: roundItems,
          },
        ]);
        setTimeout(
          () => {
            setSpinning(false);
          },
          config.fastSpin ? 400 : 600,
        );
      }
    }
  }, [landedCount]);

  /* ÔöÇÔöÇ Score calculation ÔöÇÔöÇ */
  const rawScores: Record<string, number> = {};
  players.forEach((p) => (rawScores[p] = 0));
  results.forEach((r) =>
    r.items.forEach((ri) => {
      const adjustedValue = Math.floor(
        ri.item.value * (1 - (config.borrowPercent || 0) / 100),
      );
      rawScores[ri.player] = (rawScores[ri.player] || 0) + adjustedValue;
    }),
  );

  // Keep a ref for the roulette effect to access
  rawScoresRef.current = rawScores;

  // Jackpot mode: all items pool together, winner gets total
  const jackpotTotal = isJackpotMode
    ? Object.values(rawScores).reduce((a, b) => a + b, 0)
    : 0;

  // Display scores (what each player sees during the game)
  const scores: Record<string, number> = {};
  players.forEach((p) => (scores[p] = rawScores[p]));

  // Team battle: compute team scores (Team A = slots 0+1, Team B = slots 2+3)
  const isTeam = config.isTeamBattle;
  const teamAPlayers = isTeam ? players.slice(0, 2) : [];
  const teamBPlayers = isTeam ? players.slice(2, 4) : [];
  const teamAScore = isTeam
    ? teamAPlayers.reduce((s, p) => s + (rawScores[p] || 0), 0)
    : 0;
  const teamBScore = isTeam
    ? teamBPlayers.reduce((s, p) => s + (rawScores[p] || 0), 0)
    : 0;

  // Winner determination
  let winner: [string, number] | null = null;
  let winningTeam: string[] | null = null;
  let isTie = false;
  if (phase === "finished") {
    // Jackpot mode: use the roulette-picked winner
    if (isJackpotMode && rouletteWinner) {
      winner = [rouletteWinner, jackpotTotal];
    } else if (isTeam) {
      // 2v2: compare team totals
      if (teamAScore === teamBScore) {
        isTie = true;
        winningTeam = [...teamAPlayers, ...teamBPlayers];
        winner = ["Tie", teamAScore + teamBScore];
      } else if (
        isCrazyMode ? teamAScore < teamBScore : teamAScore > teamBScore
      ) {
        winningTeam = teamAPlayers;
        winner = [teamAPlayers[0], teamAScore + teamBScore];
      } else {
        winningTeam = teamBPlayers;
        winner = [teamBPlayers[0], teamAScore + teamBScore];
      }
    } else {
      const entries = Object.entries(rawScores);
      // Check for tie (top 2 have same score)
      const sorted = [...entries].sort((a, b) =>
        isCrazyMode ? a[1] - b[1] : b[1] - a[1],
      );
      if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) {
        isTie = true;
        const tiedPlayers = sorted
          .filter((e) => e[1] === sorted[0][1])
          .map((e) => e[0]);
        winningTeam = tiedPlayers;
        winner = ["Tie", Object.values(rawScores).reduce((a, b) => a + b, 0)];
      } else {
        if (isCrazyMode) {
          winner = sorted[0];
        } else {
          winner = sorted[0];
        }
        if (winner && !isShareMode) {
          const allTotal = Object.values(rawScores).reduce((a, b) => a + b, 0);
          winner = [winner[0], allTotal];
        }
      }
    }
  }

  // Share mode: the total winnings are split equally
  const shareWinnings =
    isShareMode && winner
      ? Math.floor(
          Object.values(rawScores).reduce((a, b) => a + b, 0) / players.length,
        )
      : 0;

  // Helper: is this player on the winning team?
  const isOnWinningTeam = (name: string) => {
    if (isTie) return true;
    if (winningTeam) return winningTeam.includes(name);
    return winner ? winner[0] === name : false;
  };

  // Cost calculation
  const baseCostPerPlayer = config.cases.reduce(
    (s, c) => s + c.caseData.price * c.qty,
    0,
  );
  const totalBattlePrice = baseCostPerPlayer * config.playerCount;
  // Partial funding: creator pays for unfilled slots (bots count as unfilled)
  const botCount = playerSlots.filter((s) => s.isBot).length;
  const partialCost = isPartialFunding
    ? baseCostPerPlayer * (1 + botCount)
    : baseCostPerPlayer;
  // Borrow mode: pay only the selected % of your share
  const borrowFraction = isBorrowMode ? (config.borrowPercent ?? 20) / 100 : 1;
  const borrowCost = isBorrowMode
    ? Math.floor(baseCostPerPlayer * borrowFraction)
    : baseCostPerPlayer;
  const yourCost = isBorrowMode ? borrowCost : baseCostPerPlayer;

  const currentCaseName =
    currentRound < totalRounds
      ? roundOrder[currentRound]?.name
      : roundOrder[totalRounds - 1]?.name;

  /* ÔöÇÔöÇ Award winnings when finished ÔöÇÔöÇ */
  useEffect(() => {
    if (phase !== "finished" || hasAwardedRef.current || !winner) return;
    hasAwardedRef.current = true;
    setWinningsAwarded(true);

    const currentBal = getBalance();
    let winnings = 0;
    let profit = 0;
    let payout = 0;
    let result: "win" | "loss" | "push" = "loss";

    const pot = isJackpotMode
      ? jackpotTotal
      : Object.values(rawScores).reduce((a, b) => a + b, 0);

    if (isTie) {
      // Tie: refund the original bet
      payout = yourCost;
      profit = 0;
      winnings = yourCost;
      result = "push";
    } else if (isShareMode) {
      const share = Math.floor(pot / players.length);
      profit = share - yourCost;
      payout = share;
      winnings = Math.max(0, profit);
      result = profit > 0 ? "win" : profit === 0 ? "push" : "loss";
    } else if (isOnWinningTeam(username)) {
      let winAmount = pot;
      if (isTeam && winningTeam) {
        winAmount = Math.floor(pot / winningTeam.length);
      }
      profit = winAmount - yourCost;
      payout = winAmount;
      winnings = Math.max(0, profit);
      result = profit > 0 ? "win" : profit === 0 ? "push" : "loss";
    } else {
      payout = yourCost;
      winnings = 0;
      profit = -yourCost;
      result = "loss";
    }

    if (winnings > 0) {
      const newBal = currentBal + winnings;
      animateBalance(currentBal, newBal);
      setBalanceLS(newBal);
    }

    recordGameResult(yourCost, profit, {
      game_type: "battles",
      payout,
      multiplier:
        yourCost > 0 ? Math.round((payout / yourCost) * 100) / 100 : 0,
      result,
      currency: selectedCurrency,
      meta: { battleId: battleId },
    });
  }, [phase, winner]);

  /* ÔöÇÔöÇ Floating particle dots (cosmetic) ÔöÇÔöÇ */
  const particles = useRef(
    Array.from({ length: 12 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.25,
      delay: Math.random() * 5,
    })),
  ).current;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4">
      {/* ÔöÇÔöÇ Top bar: Back | Center case info | Actions + Rounds ÔöÇÔöÇ */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-gray-400 transition-all hover:brightness-125 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] shadow-[0_3px_0_0_#000,0_5px_10px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#000] active:translate-y-[2px] border border-white/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          BACK TO BATTLES
        </button>

        {/* Center: player icons x case name x price + mode badges */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            {playerSlots.map((slot, i) => (
              <React.Fragment key={i}>
                {i > 0 && (isTeam ? i === 2 : true) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b4a2a"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
                {isTeam && (i === 1 || i === 3) && (
                  <span className="text-[#6b4a2a] text-[10px] font-bold">
                    +
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={slot.joined ? AVATAR_COLORS[i] : "#6b4a2a"}
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-[14px]">
              {currentCaseName}
            </span>
            <span className="text-[#be30ff]/40">ÔÇó</span>
            <img src={COIN_IMG} alt="coin" className="w-4 h-4" />
            <span className="text-white font-[800] text-[13px]">
              {(currentRound < totalRounds
                ? roundOrder[currentRound]?.price
                : 0
              ).toLocaleString()}
            </span>
          </div>
          {/* Active mode badges */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {isShareMode && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] uppercase tracking-wider">
                Share
              </span>
            )}
            {isCrazyMode && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#ef4444]/20 text-[#ef4444] uppercase tracking-wider">
                Crazy
              </span>
            )}
            {isJackpotMode && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#eab308]/20 text-[#eab308] uppercase tracking-wider">
                Jackpot
              </span>
            )}
            {isPartialFunding && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] uppercase tracking-wider">
                Partial
              </span>
            )}
            {isBorrowMode && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#be30ff]/20 text-[#be30ff] uppercase tracking-wider">
                Borrow
              </span>
            )}
            {isPrivate && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#be30ff]/20 text-[#be30ff] uppercase tracking-wider flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                </svg>
                Private
              </span>
            )}
            {config.fastSpin && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#be30ff]/20 text-[#be30ff] uppercase tracking-wider">
                Fast
              </span>
            )}
            {isTeam && (
              <span className="text-[9px] font-[800] px-2 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] uppercase tracking-wider">
                2v2 Team
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFairInfo(!showFairInfo)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold text-[#be30ff] transition-all hover:brightness-125 bg-gradient-to-b from-[#181818] to-[#0a0a0a] shadow-[0_3px_0_0_#0d0700,0_5px_10px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#0d0700] active:translate-y-[2px] border border-[#2a2a2a]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            FAIRNESS
          </button>
          <div className="text-right">
            <div className="text-[10px] font-bold text-[#be30ff]/60 uppercase tracking-wider">
              Rounds
            </div>
            <span className="text-white font-[900] text-[18px]">
              {Math.min(currentRound + (spinning ? 1 : 0), totalRounds)}/
              {totalRounds}
            </span>
          </div>
        </div>
      </div>

      {/* Provably Fair dropdown */}
      {showFairInfo && (
        <div
          className="mb-4 rounded-xl p-4 space-y-2"
          style={{
            background:
              "linear-gradient(135deg, rgba(38,20,0,0.8), rgba(26,14,0,0.95))",
            border: "1px solid rgba(58,31,0,0.6)",
            boxShadow: "0 3px 0 0 #0d0700, 0 5px 10px rgba(0,0,0,0.3)",
          }}
        >
          <h3 className="text-[14px] font-[900] text-white uppercase tracking-wider">
            Provably Fair
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-[#be30ff]/60 uppercase mb-1">
                Server Seed (Hashed)
              </p>
              <p className="text-[11px] font-mono text-[#be30ff] break-all bg-[#0a0a0a] rounded p-2 border border-[#2a2a2a]">
                {serverSeed}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#be30ff]/60 uppercase mb-1">
                Client Seed
              </p>
              <p className="text-[11px] font-mono text-[#be30ff] break-all bg-[#0a0a0a] rounded p-2 border border-[#2a2a2a]">
                {clientSeed}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Battle price + case thumbnails row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#666] uppercase">
              Battle Price
            </span>
            <img src={COIN_IMG} alt="coin" className="w-4 h-4" />
            <span className="text-white font-[900] text-[16px]">
              {totalBattlePrice.toLocaleString()}
            </span>
          </div>
          {(isPartialFunding || isBorrowMode) && (
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(20,20,20,0.7), rgba(0,0,0,0.4))",
                border: "none",
              }}
            >
              <span className="text-[10px] font-bold text-[#666] uppercase">
                Your Cost
              </span>
              <img src={COIN_IMG} alt="coin" className="w-3.5 h-3.5" />
              <span className="text-[#be30ff] font-[900] text-[14px]">
                {yourCost.toLocaleString()}
              </span>
              {isBorrowMode && (
                <span className="text-[9px] font-[800] text-[#be30ff] uppercase">
                  (50%)
                </span>
              )}
              {isPartialFunding && (
                <span className="text-[9px] font-[800] text-[#22c55e] uppercase">
                  (+{botCount} bot{botCount !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
          {isJackpotMode && (
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{
                background: "rgba(234,179,8,0.08)",
                border: "1px solid rgba(234,179,8,0.2)",
              }}
            >
              <span className="text-[10px] font-bold text-[#eab308]/60 uppercase">
                Jackpot Pool
              </span>
              <img src={COIN_IMG} alt="coin" className="w-3.5 h-3.5" />
              <span className="text-[#eab308] font-[900] text-[14px]">
                {jackpotTotal.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {roundOrder.map((c, i) => (
            <div
              key={i}
              className={`group w-[44px] h-[44px] rounded-lg flex items-center justify-center transition-all ${
                i === currentRound && spinning
                  ? "ring-2 ring-[#be30ff] scale-110"
                  : i < currentRound
                    ? "opacity-30"
                    : ""
              }`}
              style={{
                background:
                  "linear-gradient(135deg, #1a1a1a, #111)",
                border: "none",
                boxShadow: "none",
              }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-[30px] h-[30px] object-contain transition-transform duration-300 group-hover:scale-110 group-hover:animate-[float_2s_ease-in-out_infinite]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
      {/* ÔöÇÔöÇ MAIN BATTLE BOX ÔöÇÔöÇ */}
      {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background:
            "linear-gradient(135deg, #1a1a1a, #111)",
          border: "none",
          boxShadow: "none",
          minHeight: "320px",
        }}
      >
        {/* Floating particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: "#444",
              opacity: p.opacity,
              animation: `float ${4 + p.delay}s ease-in-out infinite alternate`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* Corner dots */}
        <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-[#333]/60" />
        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#333]/60" />
        <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-[#333]/60" />
        <div className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-[#333]/60" />

        {/* ÔöÇÔöÇ JACKPOT ROULETTE OVERLAY ÔöÇÔöÇ */}
        {phase === "jackpotRoulette" &&
          (() => {
            const totalScore =
              Object.values(rawScoresRef.current).reduce((a, b) => a + b, 0) ||
              1;
            const STRIP_CYCLE_W = 600;
            const REPEATS = 12;
            const segments = players.map((p, i) => {
              const pct = (rawScoresRef.current[p] || 0) / totalScore;
              const w = Math.max(pct * STRIP_CYCLE_W, 40);
              return {
                name: p,
                width: w,
                pct,
                color: AVATAR_COLORS[i],
                index: i,
              };
            });
            const stripItems: typeof segments = [];
            for (let r = 0; r < REPEATS; r++) stripItems.push(...segments);
            const totalStripW = stripItems.reduce((s, seg) => s + seg.width, 0);

            return (
              <div
                className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(30,22,5,0.97), rgba(20,14,2,0.98))",
                  border: "1px solid rgba(234,179,8,0.3)",
                }}
              >
                {/* Title */}
                <div className="mb-4 text-center">
                  <div
                    className="text-[#eab308] text-[11px] font-[900] uppercase tracking-[3px] mb-1"
                    style={{ textShadow: "0 0 20px rgba(234,179,8,0.3)" }}
                  >
                    Jackpot Mode
                  </div>
                  <div
                    className="text-white text-[18px] font-[900]"
                    style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
                  >
                    {rouletteWinner ? "Winner!" : "Selecting Winner..."}
                  </div>
                </div>

                {/* Jackpot pool */}
                <div
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg mb-4"
                  style={{
                    background: "rgba(234,179,8,0.08)",
                    border: "1px solid rgba(234,179,8,0.2)",
                  }}
                >
                  <span className="text-[10px] font-bold text-[#eab308]/60 uppercase">
                    Total Jackpot
                  </span>
                  <img src={COIN_IMG} alt="coin" className="w-4 h-4" />
                  <span className="text-[#eab308] font-[900] text-[16px]">
                    {jackpotTotal.toLocaleString()}
                  </span>
                </div>

                {/* Scrolling strip viewport */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{ height: 100 }}
                >
                  {/* Fade edges */}
                  <div
                    className="absolute inset-y-0 left-0 w-24 z-20 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(20,14,2,1), transparent)",
                    }}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-24 z-20 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(to left, rgba(20,14,2,1), transparent)",
                    }}
                  />

                  {/* Center pointer */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-[3px] -translate-x-1/2 z-30 pointer-events-none"
                    style={{
                      background: "rgba(234,179,8,0.8)",
                      boxShadow: "0 0 12px rgba(234,179,8,0.5)",
                    }}
                  >
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "8px solid #eab308",
                      }}
                    />
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "8px solid #eab308",
                      }}
                    />
                  </div>

                  {/* Strip */}
                  <div
                    ref={rouletteStripRef}
                    className="flex items-stretch h-full"
                    style={{
                      width: totalStripW,
                      transform: `translateX(calc(50% - ${rouletteOffset}px))`,
                      transition: rouletteSpinning
                        ? "transform 5s cubic-bezier(0.1, 0.7, 0.1, 1)"
                        : "none",
                    }}
                  >
                    {stripItems.map((seg, idx) => {
                      const pSlot = playerSlots.find(
                        (s) => s.name === seg.name,
                      );
                      const pIsYou = seg.name === username;
                      return (
                        <div
                          key={idx}
                          className="shrink-0 flex flex-col items-center justify-center gap-1 relative overflow-hidden"
                          style={{
                            width: seg.width,
                            background: `linear-gradient(180deg, ${seg.color}18, ${seg.color}08)`,
                            borderLeft: "1px solid rgba(234,179,8,0.15)",
                            borderRight: "1px solid rgba(234,179,8,0.15)",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                            style={{
                              background: `${seg.color}20`,
                              border: `2px solid ${seg.color}60`,
                            }}
                          >
                            {pIsYou && avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={seg.name}
                                className="w-full h-full object-cover"
                              />
                            ) : pSlot?.avatar ? (
                              <img
                                src={pSlot.avatar}
                                alt={seg.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="text-[14px] font-[900]"
                                style={{ color: seg.color }}
                              >
                                {seg.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {/* Name + percentage */}
                          <span
                            className="text-[10px] font-[800] truncate max-w-full px-1"
                            style={{ color: seg.color }}
                          >
                            {seg.name}
                          </span>
                          <span
                            className="text-[9px] font-[700]"
                            style={{ color: `${seg.color}99` }}
                          >
                            {(seg.pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Winner reveal */}
                {rouletteWinner && (
                  <div className="mt-4 flex flex-col items-center gap-2 animate-pulse">
                    <span className="text-[#eab308] font-[900] text-[18px]">
                      {rouletteWinner}
                    </span>
                    <div className="flex items-center gap-1">
                      <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                      <span className="text-[#eab308] font-[900] text-[20px]">
                        {jackpotTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ÔöÇÔöÇ WINNER OVERLAY (covers entire battle box) ÔöÇÔöÇ */}
        {phase === "finished" && winner && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
            style={{
              background: isTie
                ? "linear-gradient(135deg, rgba(20,20,20,0.97), rgba(10,10,10,0.98))"
                : isCrazyMode
                  ? "linear-gradient(135deg, rgba(30,5,5,0.97), rgba(20,2,2,0.98))"
                  : isJackpotMode
                    ? "linear-gradient(135deg, rgba(30,22,5,0.97), rgba(20,14,2,0.98))"
                    : isShareMode
                      ? "linear-gradient(135deg, rgba(5,15,30,0.97), rgba(2,8,20,0.98))"
                      : "linear-gradient(135deg, rgba(5,30,10,0.97), rgba(2,20,6,0.98))",
              border: `1px solid ${isTie ? "rgba(148,163,184,0.3)" : isCrazyMode ? "rgba(239,68,68,0.3)" : isJackpotMode ? "rgba(234,179,8,0.3)" : isShareMode ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.3)"}`,
              pointerEvents: "auto",
            }}
          >
            {/* Avatars - show multiple for tie/team */}
            {(() => {
              const displayPlayers =
                isTie && winningTeam
                  ? winningTeam
                  : winningTeam
                    ? winningTeam
                    : [winner[0]];
              return (
                <div className="flex items-center gap-3 mb-4">
                  {displayPlayers.map((pName) => {
                    const pIsYou = pName === username;
                    const pSlot = playerSlots.find((s) => s.name === pName);
                    const pIndex = playerSlots.findIndex(
                      (s) => s.name === pName,
                    );
                    const pColor = AVATAR_COLORS[pIndex >= 0 ? pIndex : 0];
                    return (
                      <div
                        key={pName}
                        className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          background: `${pColor}15`,
                          border: `3px solid ${pColor}60`,
                          boxShadow: `0 0 30px ${pColor}20`,
                        }}
                      >
                        {pIsYou && avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={pName}
                            className="w-full h-full object-cover"
                          />
                        ) : pSlot?.avatar ? (
                          <img
                            src={pSlot.avatar}
                            alt={pName}
                            className="w-full h-full object-cover"
                          />
                        ) : pSlot?.isBot ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill={pColor}
                          >
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.17A7 7 0 0 1 14 22h-4a7 7 0 0 1-6.83-3H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill={pColor}
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {(isCrazyMode || isJackpotMode || isShareMode) && !isTie && (
              <span
                className="text-[10px] font-[800] px-3 py-1 rounded-full uppercase tracking-wider mb-2"
                style={{
                  background: isCrazyMode
                    ? "rgba(239,68,68,0.15)"
                    : isJackpotMode
                      ? "rgba(234,179,8,0.15)"
                      : "rgba(59,130,246,0.15)",
                  color: isCrazyMode
                    ? "#ef4444"
                    : isJackpotMode
                      ? "#eab308"
                      : "#3b82f6",
                }}
              >
                {isCrazyMode
                  ? "Crazy Mode - Lowest Wins!"
                  : isJackpotMode
                    ? "Jackpot Mode - Winner Takes All!"
                    : "Share Mode - Split Equally!"}
              </span>
            )}
            <h2 className="text-[20px] font-[900] uppercase tracking-wider mb-2">
              {isTie ? (
                <span className="text-[#94a3b8]">TIE</span>
              ) : isTeam && winningTeam ? (
                <>
                  <span
                    style={{
                      color: winningTeam.includes(username)
                        ? "#22c55e"
                        : "#be30ff",
                    }}
                  >
                    {winningTeam.join(" & ")}
                  </span>{" "}
                  <span className="text-white">WON</span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      color: winner[0] === username ? "#22c55e" : "#be30ff",
                    }}
                  >
                    {winner[0]}
                  </span>{" "}
                  <span className="text-white">WON</span>
                </>
              )}
            </h2>
            {!isTie && (
              <div className="flex items-center gap-2 mb-4">
                <img src={COIN_IMG} alt="coin" className="w-8 h-8" />
                <CountUpNumber
                  target={isShareMode ? shareWinnings : winner[1]}
                  duration={2000}
                  className="font-[900] text-[36px]"
                  style={{
                    color: isCrazyMode
                      ? "#ef4444"
                      : isJackpotMode
                        ? "#eab308"
                        : "#22c55e",
                  }}
                />
              </div>
            )}
            {isTie && (
              <div className="flex items-center gap-2 mb-4">
                <img src={COIN_IMG} alt="coin" className="w-6 h-6" />
                <span className="font-[900] text-[24px] text-[#94a3b8]">
                  {(isTeam
                    ? teamAScore
                    : rawScores[players[0]] || 0
                  ).toLocaleString()}{" "}
                  each
                </span>
              </div>
            )}
            <button
              onClick={() => onBack()}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-white text-[14px] font-[900] uppercase tracking-wider transition-all hover:brightness-110 active:scale-95 bg-gradient-to-b from-[#22c55e] to-[#16a34a]"
            >
              RECREATE BATTLE
              <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
              <span>{totalBattlePrice.toLocaleString()}</span>
            </button>
          </div>
        )}

        {/* ÔöÇÔöÇ Two-column grid ÔöÇÔöÇ */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${playerSlots.length}, 1fr)`,
            minHeight: "320px",
          }}
        >
          {/* Vertical dividers with crossed swords */}
          {phase !== "finished" &&
            playerSlots.map(
              (_, i) =>
                i < playerSlots.length - 1 && (
                <div
                  key={`div-${i}`}
                  className="absolute top-0 bottom-0 z-30"
                  style={{ left: `${((i + 1) / playerSlots.length) * 100}%` }}
                >
                  {/* Show crossed swords only between teams in 2v2 (between slot 1 and 2), or between all in FFA */}
                  {(!isTeam || i === 1) && (
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-40"
                      style={{
                        background: "linear-gradient(135deg, #181818, #0a0a0a)",
                        border: "none",
                        boxShadow:
                          "none",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#666"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                        <path d="M13 19l6-6" />
                        <path d="M16 16l4 4" />
                        <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
                        <path d="M11 19l-6-6" />
                        <path d="M8 16l-4 4" />
                      </svg>
                    </div>
                  )}
                </div>
              ),
          )}

          {/* ÔöÇÔöÇ Each player column ÔöÇÔöÇ */}
          {playerSlots.map((slot, pi) => {
            const playerColor = AVATAR_COLORS[pi];
            const joinedIndex =
              playerSlots.filter((s, si) => s.joined && si <= pi).length - 1;
            const playerScore = scores[slot.name] || 0;

            return (
              <div
                key={pi}
                className="relative flex flex-col items-center justify-center"
                style={{ minHeight: "320px" }}
              >
                {/* ÔöÇÔöÇ LOBBY state ÔöÇÔöÇ */}
                {phase === "lobby" && (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    {slot.joined ? (
                      <>
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-3 overflow-hidden"
                          style={{
                            background: `${playerColor}15`,
                            border: `2px solid ${playerColor}40`,
                          }}
                        >
                          {slot.isYou && avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={slot.name}
                              className="w-full h-full object-cover"
                            />
                          ) : slot.avatar ? (
                            <img
                              src={slot.avatar}
                              alt={slot.name}
                              className="w-full h-full object-cover"
                            />
                          ) : slot.isBot ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="28"
                              height="28"
                              viewBox="0 0 24 24"
                              fill={playerColor}
                            >
                              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.17A7 7 0 0 1 14 22h-4a7 7 0 0 1-6.83-3H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="28"
                              height="28"
                              viewBox="0 0 24 24"
                              fill={playerColor}
                            >
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          )}
                        </div>
                        {/* Coin total centered */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                          <span className="text-[#22c55e] font-[900] text-[20px]">
                            0
                          </span>
                        </div>
                        <p className="text-white font-[800] text-[13px]">
                          {slot.name}
                        </p>
                        {slot.isBot && (
                          <span className="text-[9px] font-[800] px-2 py-0.5 rounded bg-[#be30ff]/20 text-[#be30ff] mt-1">
                            BOT
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#444"
                            strokeWidth="1.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12h8M12 8v8" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                          <span className="text-[#666] font-[900] text-[20px]">
                            0
                          </span>
                        </div>
                        <p className="text-gray-500 font-bold text-[12px] mb-3">
                          Waiting...
                        </p>
                        {isCreator ? (
                          <button
                            onClick={() => callBot(pi)}
                            className="px-5 py-2 rounded-lg text-[12px] font-[800] text-white uppercase bg-gradient-to-b from-[#3a3a3a] to-[#252525] shadow-[0_3px_0_0_#1a1a1a] active:shadow-[0_1px_0_0_#1a1a1a] active:translate-y-[2px] hover:brightness-110 transition-all"
                          >
                            Call Bot
                          </button>
                        ) : (
                          <button
                            onClick={() => joinBattle(pi)}
                            className="px-5 py-2 rounded-lg text-[12px] font-[800] text-white uppercase bg-gradient-to-b from-[#22c55e] to-[#16a34a] shadow-[0_3px_0_0_#15803d] active:shadow-[0_1px_0_0_#15803d] active:translate-y-[2px] hover:brightness-110 transition-all"
                          >
                            Join Battle
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ÔöÇÔöÇ COUNTDOWN state ÔöÇÔöÇ */}
                {phase === "countdown" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                      <span className="text-[#22c55e] font-[900] text-[20px]">
                        0
                      </span>
                    </div>
                    <div
                      className="text-[48px] font-[900] animate-bounce"
                      style={{
                        color: playerColor,
                        textShadow: `0 0 30px ${playerColor}40`,
                      }}
                    >
                      {countdown}
                    </div>
                  </div>
                )}

                {/* ÔöÇÔöÇ PLAYING: SPINNING ÔöÇÔöÇ */}
                {phase === "playing" &&
                  spinning &&
                  slot.joined &&
                  roundWinItems[joinedIndex] &&
                  (() => {
                    const activeRound = isCreator
                      ? currentRound
                      : opponentDisplayRound;
                    const caseForRound =
                      roundOrder[activeRound] ??
                      roundOrder[Math.min(activeRound, totalRounds - 1)];
                    if (!caseForRound) return null;
                    return (
                      <div className="absolute inset-0 flex flex-col">
                        {/* Score at top */}
                        <div className="flex items-center justify-center gap-1.5 py-2 relative z-20">
                          <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                          <span className="text-[#22c55e] font-[900] text-[18px]">
                            {playerScore.toLocaleString()}
                          </span>
                        </div>
                        {/* Reel area - fills remaining space */}
                        <div className="flex-1 relative min-h-0">
                          <PlayerReel
                            key={`${slot.name}-${activeRound}`}
                            items={caseForRound.items}
                            winItem={roundWinItems[joinedIndex]}
                            spinning={true}
                            spinDuration={spinDuration + joinedIndex * 200}
                            playerColor={playerColor}
                            onLand={() => setLandedCount((c) => c + 1)}
                            borrowPercent={config.borrowPercent || 0}
                          />
                        </div>
                      </div>
                    );
                  })()}

                {/* ÔöÇÔöÇ PLAYING: BETWEEN ROUNDS (keep idle reel spinning) ÔöÇÔöÇ */}
                {phase === "playing" && !spinning && slot.joined && (
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex items-center justify-center gap-1.5 py-2 relative z-20">
                      <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                      <span className="text-[#22c55e] font-[900] text-[18px]">
                        {playerScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex-1 relative min-h-0">
                      <IdleReel
                        items={
                          roundOrder[
                            Math.min(
                              isCreator ? currentRound : opponentDisplayRound,
                              totalRounds - 1,
                            )
                          ].items
                        }
                        playerColor={playerColor}
                        borrowPercent={config.borrowPercent || 0}
                      />
                    </div>
                  </div>
                )}

                {/* ÔöÇÔöÇ FINISHED (idle reel keeps spinning behind score) ÔöÇÔöÇ */}
                {phase === "finished" && slot.joined && (
                  <div className="absolute inset-0 flex flex-col">
                    <div className="flex items-center justify-center gap-1.5 py-2 relative z-20">
                      <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                      <span
                        className={`font-[900] text-[18px] ${isOnWinningTeam(slot.name) ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                      >
                        {playerScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex-1 relative min-h-0 opacity-40">
                      <IdleReel
                        items={roundOrder[totalRounds - 1].items}
                        playerColor={playerColor}
                        borrowPercent={config.borrowPercent || 0}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
      {/* ÔöÇÔöÇ PLAYER CARDS + WON ITEMS (below main box) ÔöÇÔöÇ */}
      {/* ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ */}
      <div
        className="grid gap-3 mt-3"
        style={{ gridTemplateColumns: `repeat(${playerSlots.length}, 1fr)` }}
      >
        {playerSlots.map((slot, pi) => {
          const playerColor = AVATAR_COLORS[pi];
          const playerScore = scores[slot.name] || 0;
          const isWinnerCol =
            phase === "finished" && winner && isOnWinningTeam(slot.name);
          const winnerScoreColor = isCrazyMode
            ? "text-[#ef4444]"
            : isJackpotMode
              ? "text-[#eab308]"
              : isShareMode
                ? "text-[#3b82f6]"
                : "text-[#22c55e]";
          const winnerBgColor = isCrazyMode
            ? "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.04))"
            : isJackpotMode
              ? "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(202,138,4,0.04))"
              : isShareMode
                ? "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.04))"
                : "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(22,163,74,0.04))";
          const winnerBorderColor = isCrazyMode
            ? "rgba(239,68,68,0.3)"
            : isJackpotMode
              ? "rgba(234,179,8,0.3)"
              : isShareMode
                ? "rgba(59,130,246,0.3)"
                : "rgba(34,197,94,0.3)";

          return (
            <div key={pi} className="flex flex-col gap-2">
              {/* Player card */}
              <div
                className="rounded-xl px-4 py-2.5 flex items-center gap-3"
                style={{
                  background: isWinnerCol
                    ? winnerBgColor
                    : "linear-gradient(135deg, #1a1a1a, #111)",
                  border: "none",
                  boxShadow: isWinnerCol
                    ? `0 3px 0 0 ${winnerBorderColor}, 0 5px 10px rgba(0,0,0,0.3)`
                    : "none",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    background: `${playerColor}15`,
                    border: "none",
                  }}
                >
                  {slot.isYou && avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={slot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : slot.avatar ? (
                    <img
                      src={slot.avatar}
                      alt={slot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : slot.isBot ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={playerColor}
                    >
                      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.17A7 7 0 0 1 14 22h-4a7 7 0 0 1-6.83-3H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={playerColor}
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>
                <span className="text-white text-[13px] font-[800] truncate flex-1 min-w-0">
                  {slot.joined ? slot.name : "Empty"}
                </span>
                {slot.isBot && (
                  <span className="text-[9px] font-[800] px-1.5 py-0.5 rounded bg-[#be30ff]/20 text-[#be30ff]">
                    BOT
                  </span>
                )}
                <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                  <img src={COIN_IMG} alt="coin" className="w-4.5 h-4.5" />
                  <span
                    className={`font-[900] text-[15px] ${isWinnerCol ? winnerScoreColor : "text-white"}`}
                  >
                    {playerScore.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Won items grid */}
              {results.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {results.map((round) => {
                    const ri = round.items.find((x) => x.player === slot.name);
                    if (!ri) return null;
                    const itemColor = ri.item.color || "#8a7560";
                    return (
                      <button
                        key={round.roundNum}
                        className="group cursor-pointer flex flex-col rounded-xl shadow-lg overflow-hidden relative p-2 pt-3 transition-all hover:brightness-110 active:translate-y-[2px]"
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: "1px solid rgba(255,255,255,0.05)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }}
                      >
                        {/* Pixel Pattern (exact from upgrader) */}
                        <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity flex items-center justify-center overflow-hidden">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 158 175"
                            className="w-[150%] h-[150%] absolute"
                            style={{ color: itemColor }}
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

                        {/* Item Content */}
                        <div className="relative z-10 flex flex-col items-center h-full">
                          <div className="w-10/12 mx-auto aspect-square relative mb-1">
                            <img
                              loading="lazy"
                              src={ri.item.image}
                              alt={ri.item.name}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 h-11/12 object-contain drop-shadow-xl"
                            />
                          </div>
                          <div className="flex flex-col mt-auto items-center w-full">
                            <p className="font-[800] text-[11px] text-center truncate max-w-full text-white">
                              {ri.item.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <img
                                src={COIN_IMG}
                                alt="coin"
                                className="w-3.5 h-3.5"
                              />
                              <span className="tabular-nums font-[800] text-[11px] text-white">
                                {Math.floor(
                                  ri.item.value *
                                    (1 - (config.borrowPercent || 0) / 100),
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="font-[800] text-[10px] absolute top-[-4px] right-[-4px] text-[#666]">
                            #{round.roundNum}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ÔöÇÔöÇ Balance helpers ÔöÇÔöÇ */
function animateBalance(from: number, to: number) {
  window.dispatchEvent(
    new CustomEvent("balanceAnimate", { detail: { from, to } }),
  );
}

function getUsername(): string {
  if (typeof window === "undefined") return "Guest";
  return localStorage.getItem("mm2dice_user") || "Guest";
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mm2dice_user_id");
}

/* ÔöÇÔöÇ Helper: convert DB row to Battle ÔöÇÔöÇ */
function dbRowToBattle(row: Record<string, unknown>): Battle {
  const modes = (row.modes as any) || {};
  const rawPlayers = (row.players as BattlePlayer[]) || [];
  // Patch creator avatar from dedicated column or modes
  const creatorAvatar = (row.creator_avatar as string) || modes.creator_avatar || "";
  const players = rawPlayers.map((p, i) => {
    if (i === 0 && creatorAvatar && !p.avatarUrl)
      return { ...p, avatarUrl: creatorAvatar };
    return p;
  });
  const cases = (row.cases as BattleCase[]) || [];
  const badges = (row.badges as Badge[]) || modes.badges || [];
  const status = (row.status as string) || "waiting";
  return {
    id: row.id as string,
    type: (row.battle_type as BattleType) || modes.battle_type || "REGULAR BATTLE",
    players,
    cases,
    totalRounds: (row.total_rounds as number) || modes.total_rounds || 0,
    price: (row.price as number) || 0,
    originalPrice: (row.original_price as number) || modes.original_price || (row.price as number) || 0,
    discount: 0,
    badges,
    completed: status === "finished",
    status,
  };
}

/* ÔöÇÔöÇ Helper: convert DB row to ActiveBattleConfig ÔöÇÔöÇ */
function dbRowToConfig(
  row: Record<string, unknown>,
  liveCases: CaseBox[] = CASES,
): ActiveBattleConfig {
  const dbCases = (row.cases as { name: string; count: number }[]) || [];
  const configCases = dbCases.map((bc) => {
    const caseData =
      liveCases.find((c) => c.name === bc.name) ||
      CASES.find((c) => c.name === bc.name) ||
      CASES[0];
    return { caseData, qty: bc.count };
  });
  const modes = (row.modes as any) || {};
  const rawPlayers = (row.players as BattlePlayer[]) || [];
  // Patch creator_avatar into players[0].avatarUrl (same as dbRowToBattle)
  const creatorAvatar = (row.creator_avatar as string) || modes.creator_avatar || "";
  const existingPlayers = rawPlayers.map((p, i) => {
    if (i === 0 && creatorAvatar && !p.avatarUrl)
      return { ...p, avatarUrl: creatorAvatar };
    return p;
  });
  const existingPhase = (row.phase as string) || "lobby";
  const existingResults = (row.round_results as RoundResult[]) || [];
  return {
    cases: configCases,
    playerCount: (row.player_count as number) || modes.player_count || 2,
    fastSpin: (row.fast_spin as boolean) || modes.fast_spin || false,
    modes,
    borrowPercent: (row.borrow_percent as number) ?? modes.borrow_percent ?? 80,
    isPrivate: (row.is_private as boolean) || modes.is_private || false,
    isTeamBattle: (row.is_team_battle as boolean) || modes.is_team_battle || false,
    existingPlayers,
    existingPhase,
    existingResults,
  };
}

/* ÔöÇÔöÇ Main Battles Component ÔöÇÔöÇ */
export default function BattlesGame() {
  const router = useRouter();
  const fair = useFair();
  const authenticatedFetch = useAuthenticatedFetch();
  const {
    selectedCurrency,
    coinsBalance,
    funCoinsBalance,
    setCoinsBalance,
    setFunCoinsBalance,
    refreshBalances,
  } = useCurrency();

  const balance = selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
  const balanceKey =
    selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

  const getBalance = () => balance;

  const setBalanceLS = (newBal: number) => {
    if (selectedCurrency === "coins") setCoinsBalance(newBal);
    else setFunCoinsBalance(newBal);

    localStorage.setItem(balanceKey, newBal.toString());
    localStorage.setItem("mm2dice_balance_ts", Date.now().toString());
    window.dispatchEvent(new Event("balanceUpdate"));
  };

  const [showFairModal, setShowFairModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("price-high");
  const [showSortDrop, setShowSortDrop] = useState(false);
  const [view, setView] = useState<"list" | "create" | "active">("list");
  const [battleConfig, setBattleConfig] = useState<ActiveBattleConfig | null>(
    null,
  );
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [dbBattles, setDbBattles] = useState<Battle[]>([]);
  const [dbRowCache, setDbRowCache] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [username, setUsernameState] = useState("Guest");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [availableCases, setAvailableCases] = useState<CaseBox[]>(CASES);

  // Fetch battles from Supabase on mount
  const fetchBattles = useCallback(async () => {
    try {
      const response = await fetch("/api/battles", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDbBattles(data.battles.map((r: any) => dbRowToBattle(r)));
        const cache: Record<string, Record<string, unknown>> = {};
        data.battles.forEach((r: any) => {
          cache[r.id as string] = r;
        });
        setDbRowCache(cache);
      } else {
        console.error("Failed to fetch battles:", response.statusText);
        setDbBattles([]);
        setDbRowCache({});
      }
    } catch (error) {
      console.error("Error fetching battles:", error);
      setDbBattles([]);
      setDbRowCache({});
    }
  }, []);

  useEffect(() => {
    const name = getUsername();
    setUsernameState(name);
    const uid = getUserId();
    if (uid) {
      fetch(`/api/roblox/avatar?userId=${uid}`)
        .then((r) => r.json())
        .then((d) => setAvatarUrl(d.avatarUrl || ""))
        .catch(() => {});
    }
    fetchBattles();
    fetch("/api/cases")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAvailableCases(data);
      })
      .catch(() => {});
  }, [fetchBattles]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("battles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battles" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Record<string, unknown>;
            setDbBattles((prev) => {
              if (prev.some((b) => b.id === row.id)) return prev;
              return [dbRowToBattle(row), ...prev];
            });
            setDbRowCache((prev) => ({ ...prev, [row.id as string]: row }));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Record<string, unknown>;
            setDbBattles((prev) =>
              prev.map((b) => (b.id === row.id ? dbRowToBattle(row) : b)),
            );
            setDbRowCache((prev) => ({ ...prev, [row.id as string]: row }));
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as Record<string, unknown>).id as string;
            setDbBattles((prev) => prev.filter((b) => b.id !== id));
            setDbRowCache((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateBattle = async (config: ActiveBattleConfig) => {
    // Calculate cost
    const baseCostPerPlayer = config.cases.reduce(
      (s, c) => s + c.caseData.price * c.qty,
      0,
    );
    let yourCost = baseCostPerPlayer;
    if (config.modes.borrow) {
      const pct = (100 - (config.borrowPercent ?? 80)) / 100;
      yourCost = Math.floor(baseCostPerPlayer * pct);
    }

    // Check balance (from server via context, not localStorage)
    const currentBal = balance;
    if (currentBal < yourCost) {
      alert(
        `Insufficient balance! You need ${yourCost.toLocaleString()} ${
          selectedCurrency === "coins" ? "coins" : "fun coins"
        } but only have ${Math.floor(currentBal).toLocaleString()}.`,
      );
      return;
    }

    // Deduct balance locally for UI (will be verified and applied server-side)
    const newBal = currentBal - yourCost;
    animateBalance(currentBal, newBal);

    const totalRounds = config.cases.reduce((s, c) => s + c.qty, 0);
    const battleType: BattleType = config.modes.jackpot
      ? "JACKPOT MODE"
      : config.modes.crazy
        ? "CURSED JACKPOT"
        : "REGULAR BATTLE";
    const badges: Badge[] = [];
    if (config.modes.jackpot) badges.push({ icon: "crown", color: "#eab308" });
    if (config.modes.crazy) badges.push({ icon: "fire", color: "#ef4444" });

    const players: BattlePlayer[] = [
      {
        name: username,
        avatar: "#be30ff",
        avatarUrl: avatarUrl || "",
        filled: true,
        isBot: false,
      },
      ...Array.from({ length: config.playerCount - 1 }, (_, i) => ({
        name: "",
        avatar: AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length],
        avatarUrl: undefined,
        filled: false,
        isBot: false,
      })),
    ];

    try {
      // Create battle via secure API
      const createResponse = await authenticatedFetch("/api/battles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          battle_type: battleType,
          player_count: config.playerCount,
          is_team_battle: config.isTeamBattle,
          is_private: config.isPrivate,
          fast_spin: config.fastSpin,
          modes: config.modes,
          cases: config.cases.map((c) => ({
            name: c.caseData.name,
            count: c.qty,
          })),
          players,
          total_rounds: totalRounds,
          price: config.modes.borrow ? yourCost : baseCostPerPlayer,
          original_price: config.modes.borrow ? baseCostPerPlayer : null,
          badges,
        }),
      });

      if (!createResponse.ok) {
        // Refund balance on error by refreshing from server
        await refreshBalances();
        animateBalance(newBal, currentBal);
        const errorData = await createResponse.json().catch(() => ({}));
        alert(`Failed to create battle: ${errorData.error || "Unknown error"}`);
        return;
      }

      const { battle } = await createResponse.json();

      // Go directly into the active battle
      setBattleConfig(config);
      setActiveBattleId(battle.id);
      setView("active");
    } catch (error) {
      console.error("Error creating battle:", error);
      // Refund balance on error
      setBalanceLS(currentBal);
      animateBalance(newBal, currentBal);
      alert("Failed to create battle. Please try again.");
    }
  };

  const enterBattle = async (battleId: string) => {
    // Always fetch fresh data from DB so round_results are up-to-date
    const { data: freshRow, error } = await supabase
      .from("battles")
      .select("*")
      .eq("id", battleId)
      .single();
    const row =
      !error && freshRow
        ? (freshRow as Record<string, unknown>)
        : dbRowCache[battleId];
    if (row) {
      const config = dbRowToConfig(row, availableCases);
      setBattleConfig(config);
      setActiveBattleId(battleId);
      setView("active");
    }
  };

  const statusPriority = (s: string) =>
    s === "playing" ? 0 : s === "waiting" ? 1 : 2;
  const sorted = [...dbBattles].sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;
    return sortBy === "price-high" ? b.price - a.price : a.price - b.price;
  });

  if (view === "active" && battleConfig)
    return (
      <ActiveBattleView
        config={battleConfig}
        battleId={activeBattleId}
        username={username}
        avatarUrl={avatarUrl}
        onBack={() => {
          setBattleConfig(null);
          setActiveBattleId(null);
          setView("list");
        }}
      />
    );
  if (view === "create")
    return (
      <CreateBattleView
        onBack={() => setView("list")}
        onStartBattle={handleCreateBattle}
      />
    );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 pt-12">
      <FairModal
        open={showFairModal}
        onClose={() => setShowFairModal(false)}
        gameName="Battles"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-[900] text-white tracking-wide uppercase">
          Battles
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowSortDrop(!showSortDrop)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-gradient-to-b from-[#181818] to-[#0a0a0a] border border-[#333] text-white text-[13px] font-bold transition-all shadow-[0_4px_0_0_#000,0_6px_12px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#000,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] hover:brightness-110"
            >
              PRICE
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showSortDrop ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showSortDrop && (
              <div className="absolute right-0 top-[calc(100%+8px)] bg-[#141414] border border-[#333] shadow-2xl overflow-hidden z-50 min-w-[160px]">
                {(["price-high", "price-low"] as SortOption[]).map(
                  (opt, i, arr) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSortBy(opt);
                        setShowSortDrop(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-[12px] font-bold transition-all ${i < arr.length - 1 ? "border-b border-[#333]" : ""} ${sortBy === opt ? "bg-[#333] text-[#be30ff]" : "text-white/70 hover:text-white hover:bg-[#333]/50"}`}
                    >
                      {opt === "price-high"
                        ? "Price: High ÔåÆ Low"
                        : "Price: Low ÔåÆ High"}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setView("create")}
            className="flex items-center px-6 py-2.5 rounded-md text-white text-[14px] font-[900] uppercase tracking-wide transition-all bg-gradient-to-b from-[#be30ff] to-[#7e22ce] shadow-[0_4px_0_0_#78350f,0_6px_12px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#78350f,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] border border-[#d8b4fe]/30 hover:brightness-110"
          >
            Create Battle
          </button>
        </div>
      </div>

      {/* Battle rows */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 opacity-60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[14px] font-[800] text-[#666] mt-4">
              No battles yet
            </p>
            <p className="text-[12px] text-[#666]/60 mt-1">
              Create a battle to get started!
            </p>
          </div>
        )}
        {sorted.map((battle) => {
          const typeColor = TYPE_COLORS[battle.type];
          return (
            <div
              key={battle.id}
              className={`relative rounded-2xl overflow-hidden transition-all hover:scale-[1.01] ${battle.completed ? "opacity-40" : ""}`}
              style={{
                background:
                  "linear-gradient(135deg, #1a1a1a, #111)",
                border: "none",
                boxShadow: "none",
              }}
            >
              <div className="flex items-center px-6 py-5 gap-6">
                {/* Left: Type & Players */}
                <div className="w-[180px] flex-shrink-0">
                  <p
                    className="text-[11px] font-[900] uppercase tracking-wider mb-3"
                    style={{ color: typeColor }}
                  >
                    {battle.type}
                  </p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {battle.players.map((player, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <span className="text-[#444] text-[9px] font-bold">
                            VS
                          </span>
                        )}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{
                            background: player.filled
                              ? player.avatar &&
                                player.avatar.startsWith("http")
                                ? "rgba(30,30,30,0.5)"
                                : `linear-gradient(135deg, ${player.avatar}40, ${player.avatar}20)`
                              : "rgba(30,30,30,0.5)",
                            border: player.filled
                              ? player.avatar &&
                                player.avatar.startsWith("http")
                                ? "2px solid rgba(100,100,100,0.3)"
                                : `2px solid ${player.avatar}60`
                              : "2px solid rgba(45,45,45,0.5)",
                          }}
                        >
                          {player.filled &&
                          (player.avatarUrl ||
                            (player.avatar &&
                              player.avatar.startsWith("http"))) ? (
                            <img
                              src={player.avatarUrl || player.avatar}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          ) : player.filled ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="22"
                              height="22"
                              viewBox="0 0 24 24"
                              fill={player.avatar}
                            >
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#555555"
                              strokeWidth="2"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {battle.players[0]?.name === username && (
                    <span className="text-[8px] font-[800] px-2 py-1 rounded-full bg-[#22c55e]/20 text-[#22c55e] uppercase inline-block mt-2">
                      Your Battle
                    </span>
                  )}
                </div>

                {/* Middle: Cases */}
                <div className="flex-1 flex items-center gap-2 min-w-0 px-4">
                  {battle.cases.map((bc, i) => {
                    const caseData =
                      availableCases.find((c) => c.name === bc.name) ||
                      CASES.find((c) => c.name === bc.name);
                    const img =
                      caseData?.image || "https://i.imgur.com/5qN7zWl.png";
                    return (
                      <div key={i} className="relative flex-shrink-0">
                        <div
                          className="w-[65px] h-[65px] rounded-lg flex items-center justify-center overflow-hidden"
                          style={{
                            background:
                              "linear-gradient(135deg, #1a1a1a, #111)",
                            border: "none",
                            boxShadow:
                              "none",
                          }}
                        >
                          <img
                            src={img}
                            alt={bc.name}
                            className="w-[50px] h-[50px] object-contain drop-shadow-lg"
                          />
                        </div>
                        <div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-[800] text-white"
                          style={{
                            background: "rgba(35,35,35,0.8)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          x{bc.count}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Stats & Badges & Price & Button */}
                <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <img src={COIN_IMG} alt="coin" className="w-5 h-5" />
                      <span
                        className={`font-[900] text-[16px] ${battle.price !== battle.originalPrice ? "text-gray-400" : "text-white"}`}
                      >
                        {battle.price.toLocaleString()}
                      </span>
                    </div>
                    {battle.price !== battle.originalPrice && (
                      <div className="flex items-center justify-end gap-1 opacity-50">
                        <img
                          src={COIN_IMG}
                          alt="coin"
                          className="w-3 h-3 grayscale"
                        />
                        <span className="text-gray-500 text-[10px] font-bold line-through">
                          {battle.originalPrice.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {battle.badges.map((badge, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: `${badge.color}20`,
                          border: `1px solid ${badge.color}40`,
                        }}
                      >
                        {badge.icon === "crown" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={badge.color}
                          >
                            <path d="M2.5 18.5l2-8 5 4 2.5-7 2.5 7 5-4 2 8z" />
                            <rect
                              x="2.5"
                              y="19"
                              width="19"
                              height="2"
                              rx="1"
                              fill={badge.color}
                            />
                          </svg>
                        )}
                        {badge.icon === "fire" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill={badge.color}
                          >
                            <path d="M12 23c-3.87 0-7-3.13-7-7 0-2.38 1.19-4.47 3-5.74C8 10.26 8 10.13 8 10c0-2.21.9-4.21 2.35-5.65L12 2.7l1.65 1.65C15.1 5.79 16 7.79 16 10c0 .13 0 .26 0 .26 1.81 1.27 3 3.36 3 5.74 0 3.87-3.13 7-7 7z" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    {battle.discount > 0 && (
                      <span
                        className="absolute -top-2 -right-2 text-[9px] font-[900] px-1.5 py-0.5 rounded text-white z-10"
                        style={{ background: "#ef4444" }}
                      >
                        -{battle.discount}%
                      </span>
                    )}
                    {battle.status === "waiting" ? (
                      <button
                        onClick={() => enterBattle(battle.id)}
                        className="px-6 py-2.5 rounded-lg text-[12px] font-[900] uppercase tracking-wider transition-all hover:scale-105 active:scale-95 bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white shadow-[0_3px_0_0_#15803d] active:shadow-[0_1px_0_0_#15803d] active:translate-y-[2px]"
                      >
                        JOIN
                      </button>
                    ) : (
                      <button
                        onClick={() => enterBattle(battle.id)}
                        className="px-6 py-2.5 rounded-lg text-[12px] font-[900] uppercase tracking-wider transition-all hover:brightness-110 active:translate-y-[2px] text-[#be30ff] bg-gradient-to-b from-[#181818] to-[#0a0a0a] shadow-[0_3px_0_0_#0d0700,0_5px_10px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#0d0700] border border-[#2a2a2a]"
                      >
                        VIEW
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
