"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * BattlesReelsContainer Component
 * Clones the central game area with spinning item reels.
 * Features: Radial rarity gradients, inset shadows, and smooth reel animations.
 */

type Rarity = "Ancient" | "Godly" | "Vintage" | "Legendary" | "Unique" | "Rare" | "Uncommon" | "Common";

interface Item {
  id: string;
  name: string;
  price: number;
  image: string;
  rarity: Rarity;
}

// Mock items for the reel spinning demonstration
const MOCK_REEL_ITEMS: Item[] = [
  { id: "1", name: "Harvester", price: 1250, image: "https://mm2wild.com/items/harvester.webp", rarity: "Ancient" },
  { id: "2", name: "Nik's Scythe", price: 45000, image: "https://mm2wild.com/items/niks_scythe.webp", rarity: "Godly" },
  { id: "3", name: "Corrupt", price: 3200, image: "https://mm2wild.com/items/corrupt.webp", rarity: "Vintage" },
  { id: "4", name: "Batwing", price: 150, image: "https://mm2wild.com/items/batwing.webp", rarity: "Ancient" },
  { id: "5", name: "Croma Heat", price: 800, image: "https://mm2wild.com/items/chroma_heat.webp", rarity: "Godly" },
  { id: "6", name: "Elderwood Scythe", price: 450, image: "https://mm2wild.com/items/elderwood_scythe.webp", rarity: "Ancient" },
];

const RARITY_STYLES: Record<Rarity, string> = {
  Ancient: "from-[#F3B239]/20 to-transparent",
  Godly: "from-[#EF4444]/20 to-transparent",
  Vintage: "from-[#D38502]/20 to-transparent",
  Legendary: "from-[#7e22ce]/20 to-transparent",
  Unique: "from-[#FBBF24]/20 to-transparent",
  Rare: "from-[#3B82F6]/20 to-transparent",
  Uncommon: "from-[#10B981]/20 to-transparent",
  Common: "from-[#6B7280]/20 to-transparent",
};

export default function BattlesReelsContainer() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelOffset, setReelOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a long list of items for the spinning effect
  const displayItems = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 40; i++) {
      items.push(MOCK_REEL_ITEMS[Math.floor(Math.random() * MOCK_REEL_ITEMS.length)]);
    }
    return items;
  }, []);

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    // Random offset calculation: (itemWidth * count) - centerCorrection
    const targetOffset = 30 * 132 + Math.random() * 100;
    setReelOffset(targetOffset);

    setTimeout(() => {
      setIsSpinning(false);
      // Reset logic would go here in a real app
    }, 5000);
  };

  return (
    <section className="w-full flex flex-col items-center">
      {/* Round Header */}
      <div className="w-full max-w-[1200px] flex items-center justify-between px-6 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 flex flex-col items-start">
            <span className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Round</span>
            <span className="text-white font-bold text-lg">12/25</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Action indicator for demo */}
          <button 
            onClick={handleSpin}
            disabled={isSpinning}
            className={cn(
              "btn-3d-gold px-6 py-2 rounded-lg text-sm transition-opacity",
              isSpinning && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSpinning ? "SPINNING..." : "TEST SPIN"}
          </button>
        </div>
      </div>

      {/* Main Reels Viewport */}
      <div className="relative w-full overflow-hidden bg-[#0a0a0a] py-6 select-none">
        {/* Inset Shadow Overlays (Left/Right) for Depth */}
        <div className="absolute inset-y-0 left-0 w-32 z-20 pointer-events-none bg-gradient-to-r from-[#0a0a0a] to-transparent"></div>
        <div className="absolute inset-y-0 right-0 w-32 z-20 pointer-events-none bg-gradient-to-l from-[#0a0a0a] to-transparent"></div>

        {/* Center Indicator Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-[#F3B239]/50 -translate-x-1/2 z-30 pointer-events-none flex flex-col justify-between items-center py-2">
           <div className="w-3 h-3 bg-[#F3B239] rotate-45 transform translate-y-[-6px]"></div>
           <div className="w-3 h-3 bg-[#F3B239] rotate-45 transform translate-y-[6px]"></div>
        </div>

        {/* The Reel Container */}
        <div 
          ref={containerRef}
          className="flex items-center gap-2 px-[50%] transition-transform duration-[5000ms] cubic-bezier(0.1, 0, 0.1, 1)"
          style={{ transform: `translateX(-${reelOffset}px)` }}
        >
          {displayItems.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`}
              className="relative shrink-0 w-[124px] h-[124px] bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden group"
            >
              {/* Rarity Radial Gradient */}
              <div className={cn(
                "absolute inset-0 bg-radial-gradient",
                RARITY_STYLES[item.rarity]
              )}></div>

              {/* Item Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 z-10">
                <div className="relative w-[70px] h-[70px] mb-1">
                  {/* Fallback image wrapper */}
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://mm2wild.com/coin.webp";
                    }}
                  />
                </div>
                
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold text-white/90 truncate max-w-[100px] uppercase">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <img src="https://mm2wild.com/coin.webp" alt="coin" className="w-3 h-3" />
                    <span className="text-[11px] font-bold text-[#F3B239]">
                      {item.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inner Gloss/Highlight Effect */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10"></div>
              <div className="absolute inset-0 border-[4px] border-black/10 rounded-xl pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full max-w-[1240px] px-6 mt-8 mb-12">
        <div className="relative h-1 w-full bg-[#2a2a2a] rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-[#E5AD4E] transition-all duration-500 ease-out" 
            style={{ width: '48%' }} 
          />
        </div>
      </div>

      {/* CSS for custom components not in Tailwind by default */}
      <style jsx global>{`
        .bg-radial-gradient {
          background: radial-gradient(circle at center, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 70%);
        }
        .cubic-bezier {
          transition-timing-function: cubic-bezier(0.1, 0.7, 0.1, 1);
        }
      `}</style>
    </section>
  );
}
// Battles feature fully removed
