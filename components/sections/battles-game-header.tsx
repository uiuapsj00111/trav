import React from 'react';
import Link from 'next/link';
import { ChevronDown, Gamepad2, LogIn } from 'lucide-react';

/**
 * BattlesGameHeader Component
 * Clones the top navigation and sub-header for the battles game.
 * Includes "Games" dropdown, "Login" button, and specific game status bar.
 */
const BattlesGameHeader = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col">
      {/* Top Main Navigation Bar */}
      <nav className="flex h-20 items-center bg-[#111111]">
        {/* Logo Section */}
        <div className="relative flex h-full w-[80px] shrink-0 items-center justify-center overflow-hidden border-r border-[#2a2a2a] pl-3 md:w-[320px] md:pl-6">
          <Link href="/" className="relative z-10 block">
            {/* Mobile Logo (Icon only) */}
            <svg
              className="h-[43px] w-[37px] block lg:hidden"
              viewBox="0 0 37 43"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18.5 0L37 10.75V32.25L18.5 43L0 32.25V10.75L18.5 0Z"
                fill="url(#logo_grad_mobile)"
              />
              <defs>
                <linearGradient id="logo_grad_mobile" x1="0" y1="0" x2="37" y2="43" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F3B239" />
                  <stop offset="0.5" stopColor="#FFD896" />
                  <stop offset="1" stopColor="#D38502" />
                </linearGradient>
              </defs>
            </svg>

            {/* Desktop Logo (Full text) */}
            <div className="hidden items-center gap-2 lg:flex">
                <span className="text-2xl font-black tracking-tighter text-white">MM2WILD</span>
                <span className="text-[10px] font-bold text-gold">.COM</span>
            </div>
          </Link>

          {/* Background Glow Effect */}
          <div className="absolute -left-4 -top-16 block h-11 w-28 rounded-full bg-[#FFD896] blur-3xl lg:block"></div>
          <div className="absolute -left-9 -top-5 size-7 rounded-full bg-[#FFD896] blur-[26px] md:hidden"></div>
        </div>

        {/* Action Controls Section */}
        <div className="flex h-full flex-1 items-center justify-between bg-gradient-to-r from-[#111111] to-[#1a1a1a] px-3 md:px-6">
          {/* Games Dropdown (Desktop Only) */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="group/button relative h-11">
              {/* 3D Base Shadow */}
              <div className="absolute bottom-0 left-0 right-0 top-1/2 rounded-lg bg-[#D38502]"></div>
              {/* Button Surface */}
              <button className="relative flex h-[calc(100%-3px)] min-w-40 cursor-pointer items-center rounded-lg bg-[#E5AD4E] px-4 font-bold text-[#3A3869] outline-none transition-transform duration-125 group-hover/button:-translate-y-0.5 active:translate-y-0">
                <Gamepad2 className="mr-2 size-5" />
                <span>Games</span>
                <ChevronDown className="ml-auto size-4.5 transition-transform group-hover/button:rotate-180" />
              </button>
            </div>
          </div>

          {/* User Login Button */}
          <div className="flex items-center gap-3">
             <div className="group/button relative flex h-10.5 select-none outline-none">
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 rounded-lg bg-[#D38502]"></div>
                <button className="relative flex items-center rounded-lg bg-[#F3B239] px-3.25 font-bold text-[#3A3869] transition-transform duration-125 will-change-transform group-hover/button:-translate-y-0.5 active:translate-y-0">
                  <div className="flex items-center justify-center">
                    <span>LOGIN</span>
                    <LogIn className="ml-1.5 size-5" />
                  </div>
                </button>
             </div>
          </div>
        </div>
      </nav>

      {/* Sub-Header / Status Bar */}
      <div 
        className="fixed left-0 right-0 top-20 z-[100] hidden h-10 items-center gap-5 bg-gradient-to-r from-[#0a0a0a] to-[#141E4C] pr-6 font-semibold transition-[padding-left] duration-200 ease-in-out md:flex"
        style={{ paddingLeft: 'calc(320px + 24px)' }}
      >
        <Link 
          href="/terms" 
          className="flex items-center gap-1.5 text-[#888888] transition-colors hover:text-[#a2adc7]"
        >
          <p className="text-[13px] uppercase tracking-wide">Tos</p>
        </Link>
        <Link 
          href="/fairness" 
          className="flex items-center gap-1.5 text-[#888888] transition-colors hover:text-[#a2adc7]"
        >
          <p className="text-[13px] uppercase tracking-wide">Fairness</p>
        </Link>
        
        {/* Optional decorative separator or spacing as per design */}
        <div className="ml-4 h-[1px] flex-1 bg-white/5 md:hidden lg:block"></div>
        
        {/* Live Status indicator placeholder (standard for these headers) */}
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5CDF9A] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5CDF9A]"></span>
            </span>
            <span className="text-[12px] text-[#5CDF9A]">LIVE BATTLES</span>
        </div>
      </div>
    </div>
  );
};

export default BattlesGameHeader;
// Battles feature fully removed
