"use client";

import React from "react";
import Image from "next/image";

/**
 * BattlesWinnerAnnouncement Component
 * 
 * An expert-level clone of the winner announcement overlay that triggers at the end of a battle.
 * Features the bold "WINNER" text styling, pulsating gold borders, and total value won.
 */

interface BattlesWinnerAnnouncementProps {
  isVisible?: boolean;
  winnerName?: string;
  totalWon?: number;
  avatarUrl?: string;
  onClose?: () => void;
}

const BattlesWinnerAnnouncement: React.FC<BattlesWinnerAnnouncementProps> = ({
  isVisible = true,
  winnerName = "Player",
  totalWon = 12500,
  avatarUrl = "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-1F1D21CBEBF8A3E6143C3A2DB777C910-Png/180/180/AvatarHeadshot/Webp/noFilter",
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-[#0B101D]/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Main Announcement Container */}
      <div className="relative w-full max-w-[520px] animate-in zoom-in-95 fade-in duration-500 ease-out fill-mode-both">
        
        {/* Glow Effect Background */}
        <div className="absolute -inset-4 bg-gold/10 blur-[60px] rounded-full pointer-events-none" />
        
        {/* The Card */}
        <div className="relative bg-[#111111] border-[3px] border-gold rounded-[24px] overflow-hidden shadow-[0_0_40px_rgba(243,178,57,0.3)] flex flex-col items-center py-10 px-6 text-center">
          
          {/* Top Decorative Banner-like text */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full">
             <div className="bg-gold text-[#0a0a0a] font-bold text-[12px] tracking-[0.2em] py-1 uppercase scale-x-110 -rotate-1">
               CONGRATULATIONS
             </div>
          </div>

          {/* Winner Text Styling */}
          <h2 className="text-white text-6xl md:text-7xl font-[900] italic tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] mb-6 animate-pulse">
            WINNER
          </h2>

          {/* Player Display */}
          <div className="relative mb-8 group">
            {/* Avatar Frame with Gold Gradient */}
            <div className="size-32 rounded-[20px] bg-linear-to-b from-gold to-gold-dark p-1 shadow-2xl transition-transform group-hover:scale-105 duration-300">
              <div className="size-full rounded-[16px] bg-[#181818] flex items-center justify-center overflow-hidden">
                <img 
                  src={avatarUrl} 
                  alt={winnerName}
                  className="size-[85%] object-contain"
                />
              </div>
            </div>
            
            {/* Player Name Badge */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border-2 border-border px-4 py-1.5 rounded-full shadow-lg">
              <span className="text-white font-bold text-sm tracking-wide truncate max-w-[140px] block">
                {winnerName.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Value Won Section */}
          <div className="space-y-2 mt-4">
             <p className="text-secondary-foreground font-semibold text-xs tracking-widest uppercase">
               Total Winnings
             </p>
             <div className="flex items-center justify-center gap-3">
               <Image 
                 src="https://mm2wild.com/coin.webp" 
                 alt="MM2Wild Coin" 
                 width={36} 
                 height={36} 
                 className="drop-shadow-[0_0_8px_rgba(243,178,57,0.6)]"
               />
               <span className="text-gold text-4xl md:text-5xl font-black tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                 {totalWon.toLocaleString()}
               </span>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-12 w-full">
            <button 
              onClick={onClose}
              className="relative group/button cursor-pointer outline-none flex select-none flex-1 h-14"
            >
              <div className="absolute left-0 right-0 bottom-0 rounded-xl pointer-events-none bg-[#D38502]"></div>
              <div className="rounded-xl flex items-center relative transition-transform duration-125 will-change-transform group-hover/button:-translate-y-0.5 group-active/button:translate-y-0 bg-gold text-[#0a0a0a] font-black italic text-lg w-full flex items-center justify-center">
                AWESOME!
              </div>
            </button>
          </div>

          {/* High-speed Particle Decals (Simulated with simple colored dots for browser safety) */}
          <div className="absolute top-10 left-10 size-2 bg-gold/40 rounded-full blur-[1px] animate-ping" />
          <div className="absolute bottom-20 right-10 size-3 bg-gold/30 rounded-full blur-[2px] animate-pulse" />
          <div className="absolute top-1/2 left-4 size-1.5 bg-white/20 rounded-full" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .fill-mode-both {
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default BattlesWinnerAnnouncement;
// Battles feature fully removed
