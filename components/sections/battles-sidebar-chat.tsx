"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageSquare, Users, History, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BattlesSidebarChat Component
 * Clones the left-side global chat and rain pot component.
 * Includes coin animation assets, real-time message feed, and user level badges.
 */

interface Message {
  id: string;
  user: {
    name: string;
    avatar: string;
    level: number;
    levelColors: {
      start: string;
      end: string;
      text: string;
    };
  };
  content: string;
  timestamp: string;
  highlight?: boolean;
}

const DUMMY_MESSAGES: Message[] = [
  {
    id: "456161",
    user: {
      name: "Noxvibed",
      avatar: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-1F1D21CBEBF8A3E6143C3A2DB777C910-Png/180/180/AvatarHeadshot/Webp/noFilter",
      level: 20,
levelColors: { start: "#444444", end: "#2a2a2a", text: "#FFFFFF" }
      },
      content: "ig",
      timestamp: "09:23"
    },
    {
      id: "456162",
      user: {
        name: "0nlyy_tay",
        avatar: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-39B45BC004DD1990F8F533207C48578F-Png/180/180/AvatarHeadshot/Webp/noFilter",
        level: 5,
        levelColors: { start: "#888888", end: "#2a2a2a", text: "#FFFFFF" }
      },
      content: "Aw choco",
      timestamp: "09:23"
    },
    {
      id: "456163",
      user: {
        name: "5cyutezs",
        avatar: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-5581BCE960F05AE3B96C2435888CAB31-Png/180/180/AvatarHeadshot/Webp/noFilter",
        level: 29,
        levelColors: { start: "#F3B239", end: "#D38502", text: "#0a0a0a" }
      },
      content: "squiddy stfu",
      timestamp: "09:23"
    },
    {
      id: "456164",
      user: {
        name: "Noxvibed",
        avatar: "https://tr.rbxcdn.com/30DAY-AvatarHeadshot-1F1D21CBEBF8A3E6143C3A2DB777C910-Png/180/180/AvatarHeadshot/Webp/noFilter",
        level: 20,
        levelColors: { start: "#444444", end: "#2a2a2a", text: "#FFFFFF" }
    },
    content: "bro is yapping fr",
    timestamp: "09:24"
  }
];

export default function BattlesSidebarChat() {
  const [messages, setMessages] = useState<Message[]>(DUMMY_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [rainProgress, setRainProgress] = useState(65);

  // Sync rain progress animation (simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      setRainProgress((prev) => (prev >= 100 ? 0 : prev + 0.1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="z-[100] bg-linear-to-r from-[#111111] to-[#1a1a1a] h-[calc(100dvh-65px)] md:h-[calc(100dvh-80px)] fixed top-0 left-0 w-full sm:w-[320px] md:top-20 translate-x-0 ease-in-out transition-transform duration-200 flex flex-col border-r border-[#2a2a2a]">
      {/* Sidebar Header Tabs */}
      <div className="flex flex-col flex-1 min-h-0 gap-3.5 pt-3.5 relative">
        <div className="flex gap-2 px-3.5">
          <div className="h-10.5 relative flex-1">
            <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-[#2a2a2a] rounded-lg"></div>
            <div className="h-[calc(100%-3px)] bg-[#252525] px-3 rounded-lg flex items-center relative text-white">
              <MessageSquare className="size-5" />
              <p className="font-semibold ml-2 text-[14px]">Chat</p>
            </div>
          </div>
          <div className="h-10.5 relative">
            <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-[#151515] rounded-lg"></div>
            <div className="h-[calc(100%-3px)] bg-[#2a2a2a] px-3.5 rounded-lg flex items-center relative text-white">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex size-full rounded bg-[#5CDF9A]/75"></span>
                <span className="relative inline-flex rounded size-full bg-[#5CDF9A]"></span>
              </span>
              <p className="text-sm font-semibold ml-2">66</p>
            </div>
          </div>
        </div>

        {/* Rain Pot Component */}
        <div className="flex relative px-3.5">
          <div className="flex flex-col w-full rounded-xl relative overflow-hidden p-3.5 shadow-xl min-h-[85px] bg-[#151515]">
            {/* Background Decorations */}
            <img 
              src="https://mm2wild.com/falling-coins.webp" 
              className="size-28 object-contain absolute right-0 -top-1 pointer-events-none opacity-80" 
              alt=""
            />
            <img 
              src="https://mm2wild.com/simple-leafs.webp" 
              className="size-38 object-contain absolute right-6 -bottom-12 pointer-events-none opacity-40 rotate-12" 
              alt=""
            />
            
            {/* Progress Bar */}
            <div className="left-0 right-0 absolute bottom-0 h-1 bg-[#333333] z-10">
              <div 
                className="bg-[#E5AD4E] h-full transition-[width] duration-1000 ease-linear shadow-[0_0_8px_rgba(229,173,78,0.5)]" 
                style={{ width: `${rainProgress}%` }}
              ></div>
            </div>

            {/* Content Wrap */}
            <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
              <div className="bg-[#1a1a1a] px-1.5 py-1 text-[11px] font-medium rounded-md flex items-center gap-1 text-[#888888] border border-white/5">
                <History className="size-3.5" />
                <p>18:56</p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 relative z-10">
              <p className="text-[12px] font-bold text-[#888888] tracking-wider">RAIN POT</p>
              <div className="flex gap-2">
                <div className="h-8.5 relative">
                  <div className="absolute top-1/2 left-0 right-0 bottom-0 bg-[#151515] rounded-lg"></div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 h-[calc(100%-3px)] bg-[#2a2a2a] text-white text-sm rounded-lg relative border border-white/5">
                    <img src="https://mm2wild.com/coin.webp" className="size-4" alt="coins" />
                    <span className="font-bold tabular-nums">292</span>
                  </div>
                </div>
                
                <button className="relative group/btn cursor-pointer outline-none flex select-none w-8.5 h-8.5">
                  <div className="absolute left-0 right-0 bottom-0 rounded-lg pointer-events-none bg-[#0FC365]"></div>
                  <div className="rounded-lg flex items-center justify-center relative transition-transform duration-125 will-change-transform group-hover/btn:-translate-y-0.5 group-active/btn:translate-y-0 bg-[#5CDF9A] text-[#0a0a0a] w-full">
                    <Send className="size-4.5 drop-shadow-[0_1px_0_#0FC365]" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex flex-col justify-end flex-1 relative min-h-0 mt-2">
          {/* Top Fade Gradient */}
          <div className="z-10 absolute top-0 left-0 right-0 h-12 bg-linear-to-b from-[#111111] to-transparent pointer-events-none"></div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide px-3.5 space-y-4 pb-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "relative flex flex-col group/message transition-all duration-200",
                  msg.highlight && "bg-[#333333]/10 -mx-3.5 px-3.5 py-2"
                )}
              >
                <div className="flex gap-2.5 relative z-1">
                  {/* Avatar with dynamic level border */}
                  <div className="size-10 shrink-0 rounded-[9px] bg-linear-to-b from-[#444444] to-[#2a2a2a] p-[1.5px] relative">
                    <div className="size-full bg-[#181818] rounded-[7.5px] overflow-hidden flex items-center justify-center">
                      <img 
                        src={msg.user.avatar} 
                        className="size-full object-cover scale-110" 
                        alt={msg.user.name} 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex items-center">
                      {/* Level Badge */}
                      <div 
                        className="p-[1px] rounded-[4px]" 
                        style={{ background: `linear-gradient(to bottom, ${msg.user.levelColors.start}, ${msg.user.levelColors.end})` }}
                      >
                        <div 
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded-[3px] leading-none"
                          style={{ backgroundColor: msg.user.levelColors.start + '20', color: msg.user.levelColors.text }}
                        >
                          {msg.user.level}
                        </div>
                      </div>
                      
                      <button className="font-bold text-[13px] text-white hover:text-accent transition-colors ml-1.5 cursor-pointer">
                        {msg.user.name}
                      </button>
                      
                      <p className="text-[11px] font-semibold ml-auto text-[#888888]">{msg.timestamp}</p>
                    </div>

                    <div className="p-2 rounded-lg bg-[#1a1a1a] border border-white/5 shadow-sm group-data-[highlight=true]/message:bg-[#252525]">
                      <p className="text-[13px] font-medium text-[#F3B239]/90 break-words leading-snug">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3.5 bg-[#111111]/80 border-t-4 border-[#be30ff] backdrop-blur-sm">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Say something..."
                className="w-full bg-[#151515] text-white border border-[#2a2a2a] rounded-lg pl-4 pr-12 py-3 text-[13px] font-medium focus:outline-none focus:ring-1 focus:ring-[#F3B239]/50 transition-all placeholder:text-[#888888]"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button className="absolute right-2 p-1.5 text-accent hover:scale-110 active:scale-95 transition-transform">
                <Send className="size-5 fill-current" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Battles feature fully removed
