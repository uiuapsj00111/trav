"use client";

import { getLevelFromXP, getLevelTitle, getXPForLevel, getLevelProgress } from "@/lib/levelUtils";
import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { BarChart3, Bell, Book, ChevronRight, Gamepad2, MessageSquare, Shield, Smile, Target, Trophy, Wifi, X, Zap } from "lucide-react";
import Image from "next/image";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  username: string;
  avatar: string;
  content: string | React.ReactNode;
  timestamp: string;
  createdAt: string; // ISO string for sorting
  type?: "msg" | "mute";
  extraData?: any;
  repliedTo?: {
    username: string;
    content: string;
  };
}

interface TipEvent {
  id: number;
  sender_username: string;
  sender_avatar: string;
  recipient_username: string;
  recipient_avatar: string;
  amount: number;
  created_at: string;
  currency_type?: string;
}

interface RarePull {
  id: number;
  username: string;
  avatar: string;
  item_name: string;
  item_image: string;
  item_value: number;
  item_chance: number;
  case_name: string;
  created_at: string;
}

interface UpgradeBanner {
  id: number;
  username: string;
  avatar: string;
  item_name: string;
  item_image: string;
  item_value: number;
  multiplier: number;
  created_at: string;
}

const COIN_IMG =
  "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772297776282.png?width=200&height=200&resize=contain";

interface SidebarChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SidebarChat({ isOpen, onClose }: SidebarChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tips, setTips] = useState<TipEvent[]>([]);
  const [rarePulls, setRarePulls] = useState<RarePull[]>([]);
  const [upgradeBanners, setUpgradeBanners] = useState<UpgradeBanner[]>([]);
  const [inputValue, setInputValue] = useState("");

  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [selectedUserProfile, setSelectedUserProfile] = useState<{
    username: string;
    avatar: string;
  } | null>(null);
  const [isViewingSelf, setIsViewingSelf] = useState(false);
  const [profileStats, setProfileStats] = useState({
    total_wagered: 0,
    total_bets: 0,
    rewards_claimed: 0,
    total_profit: 0,
    role: null as string | null,
  });
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>("");
  const [tipError, setTipError] = useState<string>("");
  const [tipSuccess, setTipSuccess] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    username: string;
    content: string;
  } | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const lastSentMessage = useRef<string>("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pingAudioRef = useRef<HTMLAudioElement | null>(null);
  const { selectedCurrency, coinsBalance, funCoinsBalance, refreshBalances } =
    useCurrency();
  const distributedRainIds = useRef<Set<number>>(new Set());

  // Build audio on mount (soft UI ping)
  useEffect(() => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        data[i] = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 10) * 0.5;
      }
      const blob = new Blob(
        [
          (() => {
            // encode PCM to WAV
            const numChannels = 1,
              sampleRate = ctx.sampleRate,
              bitsPerSample = 16;
            const samples = buf.getChannelData(0);
            const pcm = new Int16Array(samples.length);
            for (let i = 0; i < samples.length; i++)
              pcm[i] = Math.max(-32768, Math.min(32767, samples[i] * 32767));
            const wavBuffer = new ArrayBuffer(44 + pcm.byteLength);
            const view = new DataView(wavBuffer);
            const writeStr = (off: number, s: string) => {
              for (let i = 0; i < s.length; i++)
                view.setUint8(off + i, s.charCodeAt(i));
            };
            writeStr(0, "RIFF");
            view.setUint32(4, 36 + pcm.byteLength, true);
            writeStr(8, "WAVE");
            writeStr(12, "fmt ");
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(
              28,
              (sampleRate * numChannels * bitsPerSample) / 8,
              true,
            );
            view.setUint16(32, (numChannels * bitsPerSample) / 8, true);
            view.setUint16(34, bitsPerSample, true);
            writeStr(36, "data");
            view.setUint32(40, pcm.byteLength, true);
            new Int16Array(wavBuffer, 44).set(pcm);
            return wavBuffer;
          })(),
        ],
        { type: "audio/wav" },
      );
      pingAudioRef.current = new Audio(URL.createObjectURL(blob));
      pingAudioRef.current.volume = 0.6;
      ctx.close();
    } catch {}
  }, []);

  const playPing = useCallback(() => {
    try {
      if (pingAudioRef.current) {
        pingAudioRef.current.currentTime = 0;
        pingAudioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  const EMOJIS = [
    "😀",
    "😂",
    "😍",
    "🥳",
    "😎",
    "🤑",
    "🔥",
    "💀",
    "👑",
    "💎",
    "🚀",
    "💯",
    "✅",
    "❌",
    "🎰",
    "🎲",
    "🎯",
    "🏆",
    "💰",
    "💵",
    "😭",
    "😤",
    "🤡",
    "💪",
    "👀",
    "🙏",
    "😏",
    "🤣",
    "😈",
    "⚡",
  ];

  // Coin Rain state
  const [rain, setRain] = useState<{
    id: number;
    amount: number;
    ends_at: string;
    participants: string[];
    participant_avatars: Record<string, string>;
  } | null>(null);
  const [rainCountdown, setRainCountdown] = useState("");
  const [rainJoined, setRainJoined] = useState(false);

  // Tip Rain modal state
  const [isTipRainOpen, setIsTipRainOpen] = useState(false);
  const [tipRainAmount, setTipRainAmount] = useState("");
  const [tipRainError, setTipRainError] = useState("");
  const [tipRainSuccess, setTipRainSuccess] = useState(false);
  const [tipRainLoading, setTipRainLoading] = useState(false);

  // Mute state
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [muteDuration, setMuteDuration] = useState("10");
  const [muteLoading, setMuteLoading] = useState(false);
  const [muteExpiresAt, setMuteExpiresAt] = useState<number | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [muteCountdown, setMuteCountdown] = useState("");
  const [selectedUserIsMuted, setSelectedUserIsMuted] = useState(false);
  const [selectedUserIsBanned, setSelectedUserIsBanned] = useState(false);
  const [banLoading, setBanLoading] = useState(false);

  useEffect(() => {
    const loggedInUser = getStorageItem("mm2dice_user");
    const loggedInUserId = getStorageItem("mm2dice_user_id");
    setUsername(loggedInUser);
    setUserId(loggedInUserId);

    if (loggedInUserId) {
      fetch(`/api/roblox/avatar?userId=${loggedInUserId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
          }
        })
        .catch((err) => console.error("Failed to fetch avatar:", err));

      // Check if user is muted
      supabase
        .from("mutes")
        .select("expires_at")
        .eq("username", loggedInUser)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data[0]) {
            setMuteExpiresAt(new Date(data[0].expires_at).getTime());
          }
        });

      // Check if user is banned
      supabase
        .from("bans")
        .select("id")
        .eq("username", loggedInUser)
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setIsBanned(true);
          }
        });
    }
  }, []);

  // Mute Countdown
  useEffect(() => {
    if (!muteExpiresAt) {
      setMuteCountdown("");
      return;
    }
    const tick = () => {
      const diff = muteExpiresAt - Date.now();
      if (diff <= 0) {
        setMuteCountdown("");
        setMuteExpiresAt(null);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setMuteCountdown(
        `${h > 0 ? String(h).padStart(2, "0") + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [muteExpiresAt]);

  const openUserProfile = (
    userData: { username: string; avatar: string },
    isSelf: boolean = false,
  ) => {
    setIsViewingSelf(isSelf);
    setSelectedUserProfile(userData);
    // Check if this user is currently muted
    supabase
      .from("mutes")
      .select("expires_at")
      .eq("username", userData.username)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .then(({ data }) => {
        setSelectedUserIsMuted(!!(data && data.length > 0));
      });

    // Check if this user is banned
    supabase
      .from("bans")
      .select("id")
      .eq("username", userData.username)
      .limit(1)
      .then(({ data }) => {
        setSelectedUserIsBanned(!!(data && data.length > 0));
      });
  };

  // Fetch stats when profile is opened
  useEffect(() => {
    if (!selectedUserProfile) {
      setIsViewingSelf(false);
      return;
    }
    fetch(
      `/api/stats?username=${encodeURIComponent(selectedUserProfile.username)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setProfileStats({
          total_wagered: parseFloat(data.total_wagered) || 0,
          total_bets: data.total_bets || 0,
          rewards_claimed: parseFloat(data.rewards_claimed) || 0,
          total_profit: parseFloat(data.total_profit) || 0,
          role: data.role || null,
        });
      })
      .catch(() => {});
  }, [selectedUserProfile]);

  // Fetch chat messages on load + Realtime subscription for new messages
  useEffect(() => {
    // Initial load
    supabase
      .from("chat_messages")
      .select(
        "id, username, avatar, message, replied_to, created_at, type, extra_data",
      )
      .eq("room", "coinflip")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setMessages(
            data.reverse().map((msg: any) => ({
              id: msg.id,
              username: msg.username,
              avatar:
                msg.avatar ||
                "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png",
              content: msg.message,
              createdAt: msg.created_at,
              timestamp: new Date(msg.created_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
              repliedTo: msg.replied_to || undefined,
              type: msg.type || "msg",
              extraData: msg.extra_data || {},
            })),
          );
        }
      });

    // Realtime: append new messages instantly
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: "room=eq.coinflip",
        },
        (payload) => {
          const msg = payload.new as any;
          const newMsg: Message = {
            id: msg.id,
            username: msg.username,
            avatar:
              msg.avatar ||
              "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png",
            content: msg.message,
            createdAt: msg.created_at,
            timestamp: new Date(msg.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
            repliedTo: msg.replied_to || undefined,
            type: msg.type || "msg",
            extraData: msg.extra_data || {},
          };
          setMessages((prev) => [...prev.slice(-49), newMsg]);
          // Check if current user was muted
          const loggedIn = getStorageItem("mm2dice_user");
          if (
            loggedIn &&
            msg.type === "mute" &&
            msg.username.toLowerCase() === loggedIn.toLowerCase()
          ) {
            setMuteExpiresAt(new Date(msg.extra_data.expires_at).getTime());
          }
          // Ping if the logged-in user is @mentioned
          if (loggedIn && msg.username !== loggedIn) {
            const mentionRegex = new RegExp(`@${loggedIn}\\b`, "i");
            if (mentionRegex.test(msg.message)) {
              playPing();
            }
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playPing]);

  // Fetch tip events + Realtime subscription
  useEffect(() => {
    // Initial load
    const abortTips = new AbortController();
    fetch("/api/tips/recent", { signal: abortTips.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTips(d);
      })
      .catch(() => {});

    // Realtime: append new tips instantly
    const channel = supabase
      .channel("tips_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tips" },
        (payload) => {
          const t = payload.new as any;
          setTips((prev) => [...prev.slice(-19), t]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tips" },
        () => {
          setTips([]);
        },
      )
      .subscribe();

    return () => {
      abortTips.abort();
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch rare pulls + Realtime subscription
  useEffect(() => {
    const abortRare = new AbortController();
    fetch("/api/rare-pull", { signal: abortRare.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRarePulls(d);
      })
      .catch(() => {});

    const channel = supabase
      .channel("rare_pulls_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rare_pulls" },
        (payload) => {
          const p = payload.new as RarePull;
          setRarePulls((prev) => [...prev.slice(-19), p]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rare_pulls" },
        () => {
          setRarePulls([]);
        },
      )
      .subscribe();

    return () => {
      abortRare.abort();
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch upgrade banners + Realtime subscription
  useEffect(() => {
    const abortBanner = new AbortController();
    fetch("/api/upgrade-banner", { signal: abortBanner.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setUpgradeBanners(d);
      })
      .catch(() => {});

    const channel = supabase
      .channel("upgrade_banners_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "upgrade_banners" },
        (payload) => {
          const b = payload.new as UpgradeBanner;
          setUpgradeBanners((prev) => [...prev.slice(-19), b]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "upgrade_banners" },
        () => {
          setUpgradeBanners([]);
        },
      )
      .subscribe();

    return () => {
      abortBanner.abort();
      supabase.removeChannel(channel);
    };
  }, []);

  // Cooldown ticker
  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setCooldownLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) {
        setCooldownLeft(0);
        return;
      }
      setCooldownLeft(left);
    };
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  useEffect(() => {
    const handleCloseChat = () => {
      onClose();
    };
    const handleOpenProfileModal = (e: any) => {
      const { username, avatar, isSelf } = e.detail;
      openUserProfile({ username, avatar }, !!isSelf);
    };
    window.addEventListener("closeChat", handleCloseChat);
    window.addEventListener(
      "openProfileModal",
      handleOpenProfileModal as EventListener,
    );
    return () => {
      window.removeEventListener("closeChat", handleCloseChat);
      window.removeEventListener(
        "openProfileModal",
        handleOpenProfileModal as EventListener,
      );
    };
  }, [onClose]);

  // Scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, [isOpen]);

  // Distribute rain payout when it expires
  const distributeRain = useCallback(
    async (rainId: number) => {
      if (distributedRainIds.current.has(rainId)) return;
      distributedRainIds.current.add(rainId);
      try {
        await fetch("/api/rain", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rainId }),
        });
        // Refresh balance so the user sees their payout
        await refreshBalances();
        // Clear rain banner after distribution
        setRain(null);
        setRainJoined(false);
      } catch {}
    },
    [refreshBalances],
  );

  // Fetch rain + countdown
  useEffect(() => {
    const abortRain = new AbortController();
    const fetchRain = async () => {
      try {
        const res = await fetch("/api/rain", { signal: abortRain.signal });
        const data = await res.json();
        if (data && data.id) {
          setRain({
            id: data.id,
            amount: data.amount,
            ends_at: data.ends_at,
            participants: data.participants ?? [],
            participant_avatars: data.participant_avatars ?? {},
          });
          // Restore joined state from storage keyed by rain ID
          const stored = getStorageItem(`rain_joined_${data.id}`);
          if (stored === "true") setRainJoined(true);
          // If rain just expired, distribute
          if (new Date(data.ends_at).getTime() <= Date.now()) {
            distributeRain(data.id);
          }
        } else {
          setRain(null);
        }
      } catch {}
    };
    fetchRain();
    const interval = setInterval(fetchRain, 30000);

    // Realtime: update rain card instantly when participants change
    const rainChannel = supabase
      .channel("coin_rain_realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "coin_rain" },
        (payload) => {
          const updated = payload.new as any;
          if (updated.is_active) {
            setRain({
              id: updated.id,
              amount: updated.amount,
              ends_at: updated.ends_at,
              participants: updated.participants ?? [],
              participant_avatars: updated.participant_avatars ?? {},
            });
          } else {
            // Rain was deactivated (distributed)
            setRain(null);
            setRainJoined(false);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "coin_rain" },
        (payload) => {
          const inserted = payload.new as any;
          if (inserted.is_active) {
            setRain({
              id: inserted.id,
              amount: inserted.amount,
              ends_at: inserted.ends_at,
              participants: inserted.participants ?? [],
              participant_avatars: inserted.participant_avatars ?? {},
            });
            setRainJoined(false);
          }
        },
      )
      .subscribe();

    return () => {
      abortRain.abort();
      clearInterval(interval);
      supabase.removeChannel(rainChannel);
    };
  }, [distributeRain]);

  useEffect(() => {
    if (!rain) {
      setRainCountdown("");
      return;
    }
    const tick = () => {
      const diff = new Date(rain.ends_at).getTime() - Date.now();
      if (diff <= 0) {
        setRainCountdown("00:00");
        // Trigger distribution when countdown hits zero
        distributeRain(rain.id);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRainCountdown(
        h > 0
          ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [rain, distributeRain]);

  const handleJoinRain = async () => {
    if (!username || rainJoined || !rain) return;
    try {
      const res = await fetch("/api/rain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setRainJoined(true);
        setStorageItem(`rain_joined_${rain.id}`, "true");
        // Optimistically add ourselves to the local rain state
        setRain((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.includes(username)
                  ? prev.participants
                  : [...prev.participants, username],
                participant_avatars: {
                  ...prev.participant_avatars,
                  [username]: avatarUrl,
                },
              }
            : prev,
        );
      }
    } catch {}
  };

  const handleTipRain = async () => {
    if (!tipRainAmount || parseFloat(tipRainAmount) <= 0 || !username) return;
    setTipRainError("");
    setTipRainLoading(true);
    const amount = Math.floor(parseFloat(tipRainAmount));
    const prevBalance = parseFloat(
      getStorageItem("mm2dice_balance") || "0",
    );
    try {
      const res = await fetch("/api/rain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTipRainError(data.error || "Failed to tip rain");
        setTipRainLoading(false);
        return;
      }
      // Update local balance
      window.dispatchEvent(
        new CustomEvent("balanceAnimate", {
          detail: { from: prevBalance, to: data.newBalance },
        }),
      );
      // Update rain amount locally for instant feedback
      setRain((prev) =>
        prev ? { ...prev, amount: data.newRainAmount } : prev,
      );
      setTipRainSuccess(true);
      setTimeout(() => {
        setTipRainSuccess(false);
        setIsTipRainOpen(false);
        setTipRainAmount("");
      }, 900);
    } catch {
      setTipRainError("Network error, please try again");
    }
    setTipRainLoading(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || muteExpiresAt || isBanned || isSending) return;
    if (!username) return;

    // Duplicate message guard
    if (
      inputValue.trim().toLowerCase() === lastSentMessage.current.toLowerCase()
    ) {
      setIsSending(false);
      return;
    }

    // Cooldown guard (skip for admin commands)
    const cmd = inputValue.trim().toLowerCase();
    const isAdminCmd = cmd.startsWith("/");
    if (!isAdminCmd && Date.now() < cooldownUntil) {
      setIsSending(false);
      return;
    }

    setIsSending(true);

    const isAuthorized =
      username && ["pinkysold", "barnoddino"].includes(username.toLowerCase());

    // Check for /close or /open command
    if ((cmd === "/close" || cmd === "/open") && isAuthorized) {
      const active = cmd === "/close";
      setInputValue("");
      try {
        const res = await fetch("/api/admin/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, active }),
        });
        const data = await res.json();
        if (data.success) {
          // Create a one-time channel for the broadcast
          const maintenanceChannel = supabase.channel(
            `maintenance_broadcast_${Date.now()}`,
          );
          maintenanceChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              maintenanceChannel
                .send({
                  type: "broadcast",
                  event: "status_change",
                  payload: { active },
                })
                .then(() => {
                  // Give a small delay before cleanup to ensure delivery
                  setTimeout(
                    () => supabase.removeChannel(maintenanceChannel),
                    2000,
                  );
                  // Also trigger locally
                  window.dispatchEvent(
                    new CustomEvent("maintenanceUpdate", {
                      detail: { active },
                    }),
                  );
                });
            }
          });

          // Also send a system message to chat to confirm
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "System",
              avatar:
                "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772409470098.png?width=200&height=200&resize=contain",
              message: `Site is now ${active ? "CLOSED for maintenance" : "OPEN for everyone"}.`,
              room: "coinflip",
            }),
          });
        }
      } catch (err) {
        console.error("Failed to toggle maintenance:", err);
      }
      setIsSending(false);
      return;
    }

    // Check for /profile command
    const profileMatch = inputValue.trim().match(/^\/profile\s+(.+)$/i);
    if (profileMatch && isAuthorized) {
      const targetUser = profileMatch[1].trim();
      setInputValue("");
      try {
        const res = await fetch(
          `/api/stats?username=${encodeURIComponent(targetUser)}`,
        );
        const data = await res.json();
        if (data && !data.error) {
          openUserProfile(
            {
              username: data.username || targetUser,
              avatar:
                data.avatar_url ||
                "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png",
            },
            !!username &&
              (data.username || targetUser).toLowerCase() ===
                username.toLowerCase(),
          );
        }
      } catch (err) {
        console.error("Failed to fetch profile for command:", err);
      }
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          avatar:
            avatarUrl ||
            "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png",
          message: inputValue,
          room: "coinflip",
          replyTo: replyTo || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("muted")) {
          // Refresh mute status if backend says we are muted
          supabase
            .from("mutes")
            .select("expires_at")
            .eq("username", username)
            .gt("expires_at", new Date().toISOString())
            .limit(1)
            .then(({ data }) => {
              if (data && data[0])
                setMuteExpiresAt(new Date(data[0].expires_at).getTime());
            });
        } else if (data.error && data.error.includes("banned")) {
          setIsBanned(true);
        }
        return;
      }

      if (data && !data.error) {
        lastSentMessage.current = inputValue.trim();
        setCooldownUntil(Date.now() + 3000);
        setInputValue("");
        setReplyTo(null);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Parse @mentions in message text and highlight them
  const renderMessageContent = (
    content: string | React.ReactNode,
  ): React.ReactNode => {
    if (typeof content !== "string") return content;
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      /^@\w+$/.test(part) ? (
        <span key={i} className="text-[#be30ff] font-semibold">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  // Handle input change — detect @mention typing for autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      const unique = Array.from(new Set(messages.map((m) => m.username)));
      setMentionSuggestions(
        unique
          .filter(
            (u) =>
              u.toLowerCase().startsWith(query) &&
              u.toLowerCase() !== username?.toLowerCase(),
          )
          .slice(0, 5),
      );
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const insertMention = (suggested: string) => {
    const cursor = inputRef.current?.selectionStart ?? inputValue.length;
    const before = inputValue
      .slice(0, cursor)
      .replace(/@(\w*)$/, `@${suggested} `);
    const after = inputValue.slice(cursor);
    setInputValue(before + after);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSendTip = async () => {
    if (
      !tipAmount ||
      parseFloat(tipAmount) <= 0 ||
      !selectedUserProfile ||
      !username
    )
      return;
    setTipError("");

    const amount = Math.floor(parseFloat(tipAmount));
    const balance =
      selectedCurrency === "coins" ? coinsBalance : funCoinsBalance;
    const balanceKey =
      selectedCurrency === "coins" ? "mm2dice_balance" : "mm2dice_fun_balance";

    if (amount > balance) {
      setTipError("Insufficient balance");
      return;
    }

    const optimisticBalance = balance - amount;

    // Optimistic: update balance + close modal instantly
    localStorage.setItem(balanceKey, optimisticBalance.toString());
    window.dispatchEvent(
      new CustomEvent("balanceAnimate", {
        detail: {
          from: balance,
          to: optimisticBalance,
          currency: selectedCurrency,
        },
      }),
    );
    setTipAmount("");
    setTipSuccess(true);
    setTimeout(() => {
      setTipSuccess(false);
      setIsTipModalOpen(false);
      setSelectedUserProfile(null);
    }, 800);

    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: username,
          senderAvatar: avatarUrl,
          recipientUsername: selectedUserProfile.username,
          recipientAvatar: selectedUserProfile.avatar,
          amount,
          currencyType: selectedCurrency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Reconcile with real balance from server
        localStorage.setItem(balanceKey, data.newSenderBalance.toString());
        window.dispatchEvent(
          new CustomEvent("balanceAnimate", {
            detail: {
              from: optimisticBalance,
              to: data.newSenderBalance,
              currency: selectedCurrency,
            },
          }),
        );
        // Refresh tips so the banner appears in chat
        fetch("/api/tips/recent")
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d)) setTips(d);
          })
          .catch(() => {});
      } else {
        // Rollback optimistic update on failure
        localStorage.setItem(balanceKey, balance.toString());
        window.dispatchEvent(
          new CustomEvent("balanceAnimate", {
            detail: {
              from: optimisticBalance,
              to: balance,
              currency: selectedCurrency,
            },
          }),
        );
        setTipError(data.error || "Tip failed");
      }
    } catch {
      // Rollback on network error
      localStorage.setItem(balanceKey, balance.toString());
      window.dispatchEvent(
        new CustomEvent("balanceAnimate", {
          detail: {
            from: optimisticBalance,
            to: balance,
            currency: selectedCurrency,
          },
        }),
      );
      setTipError("Network error, please try again");
    }
  };

  const handleMuteUser = async () => {
    if (!selectedUserProfile || !username || muteLoading) return;
    setMuteLoading(true);
    const expiresAt = new Date(
      Date.now() + parseInt(muteDuration) * 60000,
    ).toISOString();

    try {
      // 1. Add mute record via API
      await fetch("/api/chat/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: selectedUserProfile.username,
          muted_by: username,
          expires_at: expiresAt,
        }),
      });

      // 2. Add banner to chat
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: selectedUserProfile.username,
          avatar: selectedUserProfile.avatar,
          message: `${selectedUserProfile.username} Has been muted.`,
        }),
      });

      setSelectedUserIsMuted(true);
      setIsMuteModalOpen(false);
      setSelectedUserProfile(null);
    } catch (err) {
      console.error("Mute failed:", err);
    } finally {
      setMuteLoading(false);
    }
  };

  const handleUnmuteUser = async () => {
    if (!selectedUserProfile || !username || muteLoading) return;
    setMuteLoading(true);
    try {
      await supabase
        .from("mutes")
        .delete()
        .eq("username", selectedUserProfile.username);

      setSelectedUserIsMuted(false);
      setSelectedUserProfile(null);
    } catch (err) {
      console.error("Unmute failed:", err);
    } finally {
      setMuteLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUserProfile || !username || banLoading) return;
    setBanLoading(true);
    try {
      // Ban user via API
      await fetch("/api/chat/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: selectedUserProfile.username,
          banned_by: username,
        }),
      });

      // Add banner to chat about the ban
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: selectedUserProfile.username,
          avatar: selectedUserProfile.avatar,
          message: `${selectedUserProfile.username} Has been banned.`,
        }),
      });

      setSelectedUserIsBanned(true);
      setSelectedUserProfile(null);
    } catch (err) {
      console.error("Ban failed:", err);
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUserProfile || !username || banLoading) return;
    setBanLoading(true);
    try {
      await supabase
        .from("bans")
        .delete()
        .eq("username", selectedUserProfile.username);

      setSelectedUserIsBanned(false);
      setSelectedUserProfile(null);
    } catch (err) {
      console.error("Unban failed:", err);
    } finally {
      setBanLoading(false);
    }
  };

  const handleKeyPressTip = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendTip();
    }
  };

  useEffect(() => {
    const handleOnlineUpdate = (e: any) => {
      if (typeof e.detail === "number") setOnlineCount(e.detail);
    };
    window.addEventListener("onlineCountUpdate", handleOnlineUpdate);
    return () => window.removeEventListener("onlineCountUpdate", handleOnlineUpdate);
  }, []);

  return (
    <>
      <aside
        className={`fixed top-[80px] bottom-0 right-0 z-[100] w-[340px] bg-[#0d0b1a] transform transition-all duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] flex flex-col ${
          isOpen ? "translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.5)]" : "translate-x-full shadow-none"
        }`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Toggle Tab */}
        <button
          onClick={() => {
            if (isOpen) onClose();
            else {
              window.dispatchEvent(new CustomEvent("toggleChat"));
            }
          }}
          className="absolute left-[-32px] top-1/2 -translate-y-1/2 w-[32px] h-[52px] bg-[#16142c] flex items-center justify-center rounded-l-xl shadow-[-10px_0_20px_rgba(0,0,0,0.5)] group outline-none"
        >
          <div className={`transition-all duration-500`}>
             <MessageSquare size={18} className="text-[#be30ff] group-hover:scale-110 transition-transform" fill="currentColor" fillOpacity={0.1} />
          </div>
        </button>

        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Subtle Online Counter */}
          <div className="flex items-center justify-end px-5 py-4 shrink-0">
            <div className="flex items-center gap-2 group cursor-default">
               <Wifi size={14} className="text-[#22c55e] filter drop-shadow-[0_0_5px_#22c55e] animate-pulse" />
               <span className="text-[11px] font-black text-[#22c55e] tracking-wider uppercase">{onlineCount.toLocaleString()}</span>
               <span className="text-[10px] font-black text-[#22c55e] tracking-widest uppercase overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">ONLINE</span>
            </div>
          </div>
          {/* Coin Rain Banner */}
            {rain && (
              <div
                className="mx-3 mt-1.5 mb-1 rounded-xl overflow-hidden shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #1a0f00 0%, #2a1800 50%, #1a0f00 100%)",
                  boxShadow: "0 4px 0 #6b3b0088, 0 6px 20px rgba(0,0,0,0.5)",
                }}
              >
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <span
                    className="text-white font-extrabold text-[15px] tracking-widest uppercase"
                    style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
                  >
                    COIN RAIN
                  </span>
                  <span
                    className="font-extrabold text-[15px] text-white tracking-widest"
                    style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
                  >
                    {rainCountdown}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-5 pb-3 pt-1">
                  <div className="flex items-center gap-2 flex-1 px-1">
                    <img
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=200&height=200&resize=contain"
                      alt="coin"
                      width={22}
                      height={22}
                      className="rounded-full"
                    />
                    <span className="text-white font-bold text-[15px]">
                      {Number(rain.amount).toLocaleString()}
                    </span>
                  </div>
                  {username && (
                    <button
                      onClick={() => {
                        setTipRainError("");
                        setTipRainSuccess(false);
                        setTipRainAmount("");
                        setIsTipRainOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-extrabold text-[11px] transition-all duration-150 mr-1"
                      style={{
                        background:
                          "linear-gradient(to bottom, #be30ff, #7e22ce)",
                        boxShadow: "0 3px 0 #9a3412",
                        color: "white",
                      }}
                    >
                      TIP RAIN
                    </button>
                  )}
                  <button
                    onClick={handleJoinRain}
                    disabled={!username || rainJoined}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-extrabold text-[12px] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: rainJoined
                        ? "linear-gradient(to bottom, #22c55e, #16a34a)"
                        : "linear-gradient(to bottom, #FFB700, #c47f00)",
                      boxShadow: rainJoined
                        ? "0 3px 0 #15803d"
                        : "0 3px 0 #78500088",
                      color: rainJoined ? "white" : "black",
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    {rainJoined ? "JOINED" : "JOIN"}
                    <span className="ml-1.5 text-[10px]">
                      {rain.participants.length}
                    </span>
                  </button>
                </div>
                {/* Participants banner — show up to 5 avatars */}
                {rain.participants.length > 0 && (
                  <div className="flex items-center gap-2 px-5 pb-4">
                    <div className="flex items-center">
                      {rain.participants.slice(0, 5).map((p, i) => (
                        <div
                          key={p}
                          className="w-7 h-7 rounded-full overflow-hidden shrink-0"
                          style={{
                            marginLeft: i === 0 ? 0 : "-8px",
                            zIndex: 5 - i,
                          }}
                          title={p}
                        >
                          <img
                            src={
                              rain.participant_avatars?.[p] ||
                              `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                            }
                            alt={p}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`;
                            }}
                          />
                        </div>
                      ))}
                      {rain.participants.length > 5 && (
                        <div
                          className="w-7 h-7 rounded-full bg-[#2a1800] flex items-center justify-center shrink-0"
                          style={{ marginLeft: "-8px", zIndex: 0 }}
                        >
                          <span className="text-[#FFB700] text-[9px] font-black">
                            +{rain.participants.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[#be30ff] text-[11px] font-semibold ml-1">
                      {rain.participants.length === 1
                        ? `${rain.participants[0]} joined`
                        : `${rain.participants.length} joined`}
                    </span>
                    {rain.participants.length > 0 && (
                      <span className="ml-auto text-[#FFB700] text-[11px] font-bold">
                        ~
                        {Math.floor(
                          rain.amount / rain.participants.length,
                        ).toLocaleString()}{" "}
                        each
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-1 min-h-0">
              {messages.length === 0 &&
              tips.length === 0 &&
              rarePulls.length === 0 &&
              upgradeBanners.length === 0 ? (
                null
              ) : (
                (() => {
                  // Merge chat messages + tip events + rare pulls + upgrade banners, sorted oldest-first
                  type FeedItem =
                    | { kind: "msg"; data: Message; ts: number }
                    | { kind: "tip"; data: TipEvent; ts: number }
                    | { kind: "rare"; data: RarePull; ts: number }
                    | { kind: "upgrade"; data: UpgradeBanner; ts: number };

                  const feed: FeedItem[] = [
                    ...messages.map((m) => ({
                      kind: "msg" as const,
                      data: m,
                      ts: new Date(m.createdAt).getTime(),
                    })),
                    ...tips.map((t) => ({
                      kind: "tip" as const,
                      data: t,
                      ts: new Date(t.created_at).getTime(),
                    })),
                    ...rarePulls.map((p) => ({
                      kind: "rare" as const,
                      data: p,
                      ts: new Date(p.created_at).getTime(),
                    })),
                    ...upgradeBanners.map((b) => ({
                      kind: "upgrade" as const,
                      data: b,
                      ts: new Date(b.created_at).getTime(),
                    })),
                  ].sort((a, b) => a.ts - b.ts);

                  return feed.map((item) => {
                    if (item.kind === "msg" && item.data.type === "mute") {
                      const m = item.data;
                      return (
                        <div
                          key={`mute-${m.id}`}
                          className="flex flex-col items-center gap-3 px-4 py-5 rounded-xl my-2 animate-in fade-in zoom-in duration-300"
                          style={{
                            background:
                              "linear-gradient(135deg, #2a0000 0%, #3d0000 60%, #2a0000 100%)",
                            border: "1px solid #ef444444",
                            boxShadow: "0 4px 12px rgba(239,68,68,0.2)",
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="shrink-0 w-12 h-12"
                              style={{
                                borderRadius: "12px",
                                overflow: "hidden",
                                border: "2px solid #ef444466",
                                boxShadow: "0 0 15px rgba(239,68,68,0.3)",
                              }}
                            >
                              <img
                                src={m.avatar}
                                alt={m.username}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-[15px] text-white tracking-tight uppercase">
                                {m.username}
                              </span>
                              <span className="text-[#ef4444] font-black text-[13px] tracking-widest uppercase">
                                Has been muted.
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    // Rain banner
                    if (
                      item.kind === "msg" &&
                      (item.data as any).type === "rain_banner"
                    ) {
                      const m = item.data as any;
                      const ex = m.extraData || {};
                      const avatars: Record<string, string> =
                        ex.participant_avatars || {};
                      const names: string[] = ex.participants || [];
                      const perUser: number = ex.per_user || 0;
                      const total: number = ex.total_amount || 0;
                      const count: number =
                        ex.participant_count || names.length;
                      return (
                        <div
                          key={`rain-banner-${m.id}`}
                          className="flex flex-col gap-3 px-4 py-4 rounded-xl my-1 animate-in fade-in"
                          style={{
                            background:
                              "linear-gradient(135deg, #1a0f00 0%, #2a1800 60%, #1a0f00 100%)",
                            border: "1px solid #FFB70066",
                            boxShadow:
                              "0 0 20px rgba(255,183,0,0.25), 0 4px 12px rgba(0,0,0,0.5)",
                          }}
                        >
                          {/* Header */}
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🌧️</span>
                            <div className="flex flex-col">
                              <span
                                className="text-[#FFB700] font-black text-[14px] tracking-widest uppercase"
                                style={{
                                  textShadow: "0 0 10px rgba(255,183,0,0.6)",
                                }}
                              >
                                Coin Rain Ended!
                              </span>
                              <span className="text-[#be30ff] text-[11px]">
                                {count} player{count !== 1 ? "s" : ""} shared
                                the rain
                              </span>
                            </div>
                            <div className="ml-auto flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <img
                                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=200&height=200&resize=contain"
                                  alt="coin"
                                  width={14}
                                  height={14}
                                  className="rounded-full"
                                />
                                <span className="text-[#FFB700] font-black text-[15px]">
                                  {Number(total).toLocaleString()}
                                </span>
                              </div>
                              <span className="text-[#be30ff] text-[10px]">
                                total pot
                              </span>
                            </div>
                          </div>
                          {/* Per user payout */}
                          <div
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{
                              background: "rgba(255,183,0,0.08)",
                              border: "1px solid rgba(255,183,0,0.2)",
                            }}
                          >
                            <span className="text-[#be30ff] text-[12px] font-semibold">
                              Each player received
                            </span>
                            <div className="flex items-center gap-1.5">
                              <img
                                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771156789870.png?width=200&height=200&resize=contain"
                                alt="coin"
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                              <span
                                className="text-[#FFB700] font-black text-[16px]"
                                style={{
                                  textShadow: "0 0 8px rgba(255,183,0,0.5)",
                                }}
                              >
                                {Number(perUser).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {/* Participant avatars */}
                          {names.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {names
                                  .slice(0, 5)
                                  .map((p: string, i: number) => (
                                    <div
                                      key={p}
                                      className="w-7 h-7 rounded-full overflow-hidden border-2 border-[#1a0f00] shrink-0"
                                      style={{
                                        marginLeft: i === 0 ? 0 : "-8px",
                                        zIndex: 5 - i,
                                      }}
                                      title={p}
                                    >
                                      <img
                                        src={
                                          avatars[p] ||
                                          "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png"
                                        }
                                        alt={p}
                                        width={28}
                                        height={28}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png";
                                        }}
                                      />
                                    </div>
                                  ))}
                                {count > 5 && (
                                  <div
                                    className="w-7 h-7 rounded-full bg-[#2a1800] border-2 border-[#FFB700]/40 flex items-center justify-center shrink-0"
                                    style={{ marginLeft: "-8px", zIndex: 0 }}
                                  >
                                    <span className="text-[#FFB700] text-[9px] font-black">
                                      +{count - 5}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[#be30ff] text-[11px] ml-1">
                                {names.slice(0, 3).join(", ")}
                                {count > 3 ? ` +${count - 3} more` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (item.kind === "upgrade") {
                      const b = item.data;
                      return (
                        <div
                          key={`upgrade-${b.id}`}
                          className="relative flex flex-col gap-2 px-3 py-3 rounded-xl my-1 animate-in fade-in overflow-hidden"
                          style={{
                            backgroundImage:
                              "url(https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-70-1771505964110.png?width=400&height=400&resize=contain)",
                            backgroundSize: "cover",
                            backgroundPosition: "center right",
                            boxShadow:
                              "0 0 18px rgba(34,197,94,0.45), 0 2px 12px rgba(34,197,94,0.3)",
                          }}
                        >
                          <div
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: "rgba(0,0,0,0.25)",
                              pointerEvents: "none",
                            }}
                          />
                          <div className="relative z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="shrink-0 w-10 h-10"
                                style={{
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={
                                    b.avatar ||
                                    `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=40&height=40&format=png`
                                  }
                                  alt={b.username}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=40&height=40&format=png`;
                                  }}
                                />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="font-extrabold text-[13px] text-white truncate"
                                  style={{
                                    textShadow:
                                      "0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,1)",
                                  }}
                                >
                                  {b.username}
                                </span>
                                <span
                                  className="text-[#4ade80] text-[16px] font-black leading-none"
                                  style={{
                                    textShadow:
                                      "0 0 14px rgba(74,222,128,1), 0 2px 8px rgba(0,0,0,1)",
                                  }}
                                >
                                  Just Upgraded!
                                </span>
                              </div>
                              <span
                                className="ml-auto text-[#4ade80] font-black text-[14px]"
                                style={{
                                  textShadow:
                                    "0 0 12px rgba(74,222,128,1), 0 2px 6px rgba(0,0,0,1)",
                                }}
                              >
                                ×{b.multiplier}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <img
                                src={b.item_image}
                                alt={b.item_name}
                                width={44}
                                height={44}
                                className="w-[44px] h-[44px] object-contain"
                                style={{
                                  filter:
                                    "drop-shadow(0 0 8px rgba(34,197,94,0.6))",
                                }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="text-white font-extrabold text-[13px] truncate"
                                  style={{
                                    textShadow:
                                      "0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,1)",
                                  }}
                                >
                                  {b.item_name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <img
                                    src={COIN_IMG}
                                    alt="coin"
                                    width={13}
                                    height={13}
                                    className="rounded-full"
                                  />
                                  <span
                                    className="text-[#4ade80] font-black text-[13px]"
                                    style={{
                                      textShadow:
                                        "0 0 12px rgba(74,222,128,1), 0 2px 6px rgba(0,0,0,1)",
                                    }}
                                  >
                                    {Number(b.item_value).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (item.kind === "rare") {
                      const p = item.data;
                      return (
                        <div
                          key={`rare-${p.id}`}
                          className="flex flex-col gap-3 px-4 py-4 rounded-xl my-1 animate-in fade-in"
                          style={{
                            background:
                              "linear-gradient(135deg, #0d0020 0%, #1a0035 50%, #0d0020 100%)",
                            boxShadow: "0 2px 12px rgba(168,85,247,0.15)",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="shrink-0 w-9 h-9"
                              style={{
                                borderRadius: "9px",
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={
                                  p.avatar ||
                                  `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                                }
                                alt={p.username}
                                width={36}
                                height={36}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`;
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[13px] text-white truncate">
                                {p.username}
                              </span>
                              <span className="text-[#c084fc] text-[11px]">
                                pulled a {p.item_chance}% item!
                              </span>
                            </div>
                            <span
                              className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: "#be30ff22",
                                color: "#c084fc",
                                border: "1px solid #be30ff44",
                              }}
                            >
                              0.1% PULL
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <img
                              src={p.item_image}
                              alt={p.item_name}
                              width={48}
                              height={48}
                              className="w-12 h-12 object-contain"
                              style={{
                                filter:
                                  "drop-shadow(0 0 8px rgba(168,85,247,0.5))",
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-white font-bold text-[13px] truncate">
                                {p.item_name}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <img
                                  src={COIN_IMG}
                                  alt="coin"
                                  width={13}
                                  height={13}
                                  className="rounded-full"
                                />
                                <span className="text-[#c084fc] font-extrabold text-[13px]">
                                  {Number(p.item_value).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (item.kind === "tip") {
                      const t = item.data;
                      const icon =
                        t.currency_type === "fun_coins"
                          ? COIN_ICONS.fun_coins
                          : COIN_ICONS.coins;
                      const isFun = t.currency_type === "fun_coins";

                      return (
                        <div
                          key={`tip-${t.id}`}
                          className="flex flex-col gap-3 px-4 py-5 rounded-xl my-1"
                          style={{
                            background: isFun
                              ? "linear-gradient(135deg, #1e0a16 0%, #2e0f22 60%, #1e0a16 100%)"
                              : "linear-gradient(135deg, #1a1200 0%, #241900 60%, #1a1200 100%)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                          }}
                        >
                          {/* Top row: sender → recipient */}
                          <div className="flex items-center gap-2">
                            {/* Sender */}
                            <div
                              className="shrink-0 w-10 h-10"
                              style={{
                                borderRadius: "9px",
                                overflow: "hidden",
                                boxShadow:
                                  "3px 3px 6px #000, -1px -1px 4px #333, inset 0 1px 0 rgba(255,255,255,0.08)",
                              }}
                            >
                              <img
                                src={
                                  t.sender_avatar ||
                                  `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                                }
                                alt={t.sender_username}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`;
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[13px] text-white truncate">
                                {t.sender_username}
                              </span>
                              <span className="text-[#be30ff] text-[11px]">
                                tipped
                              </span>
                            </div>
                            <span
                              className={`${isFun ? "text-[#ec4899]" : "text-[#FFB700]"} text-lg mx-1`}
                            >
                              →
                            </span>
                            {/* Recipient */}
                            <div
                              className="shrink-0 w-10 h-10"
                              style={{
                                borderRadius: "9px",
                                overflow: "hidden",
                                boxShadow:
                                  "3px 3px 6px #000, -1px -1px 4px #333, inset 0 1px 0 rgba(255,255,255,0.08)",
                              }}
                            >
                              <img
                                src={
                                  t.recipient_avatar ||
                                  `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                                }
                                alt={t.recipient_username}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`;
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[13px] text-white truncate">
                                {t.recipient_username}
                              </span>
                              <span className="text-[#be30ff] text-[11px]">
                                received
                              </span>
                            </div>
                          </div>
                          {/* Bottom row: amount */}
                          <div className="flex items-center gap-1.5">
                            <img
                              src={icon}
                              alt="coin"
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                            <span
                              className={`font-extrabold ${isFun ? "text-[#ec4899]" : "text-[#FFB700]"} text-[15px]`}
                            >
                              {Number(t.amount).toLocaleString()}
                            </span>
                            <span className="text-[#be30ff] text-[12px] ml-1">
                              {isFun ? "fun coins" : "coins"} sent
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={item.data.id}
                        className="flex flex-col gap-2 group animate-in slide-in-from-right-4 duration-300"
                      >
                        <div className="bg-[#16142c] rounded-2xl p-4 flex gap-4 transition-all hover:bg-[#1a1835] group/msg relative">
                          {/* Avatar Container with Level Badge */}
                          <div className="relative shrink-0 flex flex-col items-center">
                            <div 
                              onClick={() => openUserProfile({ username: item.data.username, avatar: item.data.avatar })}
                              className="w-[44px] h-[44px] cursor-pointer rounded-xl overflow-hidden shadow-xl transition-transform hover:scale-105"
                            >
                              <Image src={item.data.avatar} alt={item.data.username} width={44} height={44} className="w-full h-full object-cover" />
                            </div>
                            {/* Level Badge at bottom-right of avatar */}
                            <div className="absolute bottom-[-4px] right-[-6px] z-10 px-1.5 py-0.5 bg-[#16142c] rounded-[4px] text-[#be30ff] font-black text-[9px] min-w-[24px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                              {Math.min(100, item.data.extraData?.level ?? 1)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            {/* Header: User + Time */}
                            <div className="flex items-center justify-between">
                              <span 
                                className="text-[#be30ff] text-[14px] font-black uppercase tracking-tight cursor-pointer hover:brightness-110 flex items-center gap-1.5"
                                onClick={() => openUserProfile({ username: item.data.username, avatar: item.data.avatar })}
                              >
                                {item.data.username}
                                {item.data.username.toLowerCase() === "barnoddino" && (
                                  <div className="w-4 h-4 rounded-full bg-[#ef4444] flex items-center justify-center" title="Admin">
                                    <span className="text-[8px] text-white font-black">A</span>
                                  </div>
                                )}
                              </span>
                              <span className="text-white/20 text-[10px] font-bold">{item.data.timestamp}</span>
                            </div>

                            {/* Reply Context */}
                            {item.data.repliedTo && (
                              <div className="bg-black/20 rounded-lg px-3 py-2 border-l-2 border-[#be30ff] mb-1">
                                <span className="text-[#be30ff]/60 text-[11px] font-bold block mb-0.5">@{item.data.repliedTo.username}</span>
                                <p className="text-white/30 text-[11px] truncate">{item.data.repliedTo.content}</p>
                              </div>
                            )}

                            {/* Body */}
                            <div className="text-white/70 text-[13.5px] font-medium leading-[1.6] break-words">
                              {renderMessageContent(item.data.content)}
                            </div>
                          </div>

                          {/* Reply Trigger Icon (Hover) */}
                          <button 
                            onClick={() => setReplyTo({ username: item.data.username, content: typeof item.data.content === 'string' ? item.data.content : '' })}
                            className="absolute top-4 right-4 opacity-0 group-hover/msg:opacity-100 transition-opacity text-white/20 hover:text-[#be30ff]"
                          >
                            <MessageSquare size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Wrapper */}
            <div className="px-5 py-6 mt-auto">
              {muteExpiresAt && username ? (
                <div className="bg-gradient-to-b from-[#1a0000] to-[#0a0a0a] border border-[#ef4444]/20 rounded-2xl px-4 py-8 text-center shadow-xl">
                  <p className="text-[#ef4444] text-[11px] font-black uppercase tracking-[0.25em] mb-4">ACCOUNT MUTED</p>
                  <div className="inline-flex items-center gap-3 bg-black/40 px-6 py-2.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                    <span className="text-white font-black text-2xl tracking-[0.1em] font-mono leading-none">{muteCountdown}</span>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  {/* Reply preview */}
                  {replyTo && (
                    <div className="absolute bottom-full mb-3 left-0 right-0 p-3 rounded-xl bg-[#16142c] shadow-2xl animate-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#be30ff] text-[11px] font-black uppercase tracking-wider">Replying to @{replyTo.username}</span>
                        <button onClick={() => setReplyTo(null)} className="text-white/20 hover:text-white"><X size={14} /></button>
                      </div>
                      <p className="text-white/30 text-[11px] truncate">{replyTo.content}</p>
                    </div>
                  )}

                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={!username ? "LOGIN TO CHAT..." : "SAY SOMETHING..."}
                      value={inputValue}
                      disabled={!username || isSending}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      className="w-full bg-[#16142c] outline-none border-none focus:ring-0 text-white text-[14px] font-bold rounded-xl px-5 py-4 placeholder:text-white/45 transition-all pr-12 shadow-[0_0_20px_rgba(0,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       {username && (
                        <button 
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`text-white/40 hover:text-[#be30ff] transition-colors ${showEmojiPicker ? 'text-[#be30ff]' : ''}`}
                        >
                          <Smile size={18} />
                        </button>
                      )}
                      <button 
                        onClick={handleSendMessage}
                        disabled={!username || cooldownLeft > 0 || !inputValue.trim() || isSending}
                        className="text-[#be30ff] hover:brightness-125 transition-all disabled:opacity-30 disabled:grayscale"
                      >
                        {isSending ? (
                           <div className="w-4 h-4 border-2 border-[#be30ff] border-t-transparent rounded-full animate-spin" />
                        ) : (
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="transform rotate-45"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        )}
                      </button>
                    </div>

                    {/* Emoji picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full mb-4 left-0 right-0 bg-[#16142c] border border-white/5 rounded-2xl p-3 grid grid-cols-8 gap-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                        {EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => { setInputValue(v => v + emoji); setShowEmojiPicker(false); }} className="text-xl hover:bg-white/5 rounded-lg p-1.5 transition-all active:scale-90">{emoji}</button>
                        ))}
                      </div>
                    )}
                    
                    {/* Mention suggestions */}
                    {mentionSuggestions.length > 0 && mentionQuery !== null && (
                      <div className="absolute bottom-full mb-3 left-0 right-0 bg-[#16142c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl z-50">
                        {mentionSuggestions.map((s) => (
                          <button key={s} onMouseDown={(e) => { e.preventDefault(); insertMention(s); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#be30ff]/10 transition-colors text-left border-b border-white/[0.03] last:border-0">
                            <span className="text-[#be30ff] font-black text-sm uppercase">@{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {cooldownLeft > 0 && (
                    <div className="mt-3 text-center">
                      <span className="text-[#ef4444] text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Cooldown: {cooldownLeft}s</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

      {selectedUserProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0b1a] rounded-[32px] w-full max-w-[660px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden border border-white/5 animate-in slide-in-from-bottom-8 duration-500">
            {/* Header Section */}
            <div className="relative p-8 pb-6 bg-gradient-to-b from-white/[0.03] to-transparent">
              <button 
                onClick={() => setSelectedUserProfile(null)}
                className="absolute top-6 right-8 flex items-center gap-2 text-white/30 hover:text-white transition-all group"
              >
                <span className="text-[11px] font-black uppercase tracking-widest">Go Back</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-8">
                {/* Avatar with Red Glowing Ring */}
                <div className="relative">
                  <div className="w-[120px] h-[120px] rounded-[32px] p-1 bg-[#be30ff] shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                    <div className="w-full h-full rounded-[28px] border-4 border-[#0d0b1a] overflow-hidden bg-[#16142c]">
                      <img 
                        src={selectedUserProfile.avatar} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=150&height=150&format=png`;
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white text-3xl font-black tracking-tight leading-none uppercase truncate max-w-[280px]">
                      {selectedUserProfile.username}
                    </h2>
                    <div className="px-3 py-1 bg-[#be30ff] rounded-[10px] text-white font-black text-[11px] tracking-wider shadow-lg shadow-[#be30ff]/20 mr-2 uppercase">
                      {getLevelTitle(getLevelFromXP(profileStats.total_wagered))} LVL {getLevelFromXP(profileStats.total_wagered)}
                    </div>
                  </div>

                  {/* Level Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em]">
                      <span className="text-white/40">XP: {profileStats.total_wagered.toLocaleString()} / {getXPForLevel(getLevelFromXP(profileStats.total_wagered) + 1).toLocaleString()}</span>
                      <span className="text-white">
                        {(() => {
                          const progress = getLevelProgress(profileStats.total_wagered);
                          return progress.level >= 100 ? "MAX LEVEL" : `${progress.progressPercent.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#be30ff] to-[#d8b4fe] shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000"
                        style={{ 
                          width: `${getLevelProgress(profileStats.total_wagered).progressPercent}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest mt-1">
                    Join Date: March 10th 2024, 18:25
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="px-8 py-6 space-y-6 bg-black/10">
              <div className="space-y-3">
                <h3 className="text-white/30 text-[11px] font-black uppercase tracking-[0.2em] px-1">Actions</h3>
                {!isViewingSelf && (
                  <button
                    onClick={() => {
                      setTipError("");
                      setTipSuccess(false);
                      setIsTipModalOpen(true);
                    }}
                    className="w-full bg-[#be30ff] hover:brightness-110 active:scale-[0.98] text-white font-black text-[15px] py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(168,85,247,0.2)] flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                  >
                    TIP {selectedUserProfile.username}
                  </button>
                )}
              </div>

              {/* User Statistics Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <BarChart3 size={14} className="text-white/30" />
                  <h3 className="text-white/30 text-[11px] font-black uppercase tracking-[0.2em]">User Statistics</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Bets */}
                  <div className="bg-[#16142c]/50 p-5 rounded-xl border border-white/[0.03] space-y-1 group hover:bg-[#16142c] transition-all">
                    <div className="flex items-center gap-2 text-[#be30ff]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Total Bets</span>
                    </div>
                    <p className="text-white text-lg font-black tracking-tight">{profileStats.total_bets.toLocaleString()}</p>
                  </div>

                  {/* Games Won */}
                  <div className="bg-[#16142c]/50 p-5 rounded-xl border border-white/[0.03] space-y-1 group hover:bg-[#16142c] transition-all">
                    <div className="flex items-center gap-2 text-[#be30ff]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Games Won</span>
                    </div>
                    <p className="text-white text-lg font-black tracking-tight">{(profileStats.total_bets > 0 ? Math.floor(profileStats.total_bets * 0.42) : 0).toLocaleString()}</p>
                  </div>

                  {/* Total Wagered */}
                  <div className="bg-[#16142c]/50 p-5 rounded-xl border border-white/[0.03] space-y-1 group hover:bg-[#16142c] transition-all relative overflow-hidden">
                    <div className="flex items-center gap-2 text-[#be30ff]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Total Wagered</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className="text-white text-lg font-black tracking-tight break-all border-r border-transparent pr-1">{profileStats.total_wagered.toLocaleString()}</p>
                      <span className="text-white/30 text-[13px] font-black">R$</span>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="bg-[#16142c]/50 p-5 rounded-xl border border-white/[0.03] space-y-1 group hover:bg-[#16142c] transition-all relative overflow-hidden">
                    <div className="flex items-center gap-2 text-[#be30ff]">
                      <span className="text-[10px] font-black uppercase tracking-widest">Net Profit</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className={`text-lg font-black tracking-tight break-all ${profileStats.total_profit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                        {profileStats.total_profit >= 0 ? "+" : ""}{profileStats.total_profit.toLocaleString()}
                      </p>
                      <span className="text-white/30 text-[13px] font-black">R$</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Moderation Buttons */}
              {!isViewingSelf &&
                username &&
                ["pinkysold", "barnoddino"].includes(username.toLowerCase()) && (
                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    {selectedUserIsMuted ? (
                      <button onClick={handleUnmuteUser} disabled={muteLoading} className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-black text-xs py-4 rounded-xl border border-green-500/20 transition-all uppercase tracking-widest">{muteLoading ? "Unmuting..." : "Unmute"}</button>
                    ) : (
                      <button onClick={() => setIsMuteModalOpen(true)} className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-black text-xs py-4 rounded-xl border border-yellow-500/20 transition-all uppercase tracking-widest">Mute</button>
                    )}
                    {selectedUserIsBanned ? (
                      <button onClick={handleUnbanUser} disabled={banLoading} className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-black text-xs py-4 rounded-xl border border-blue-500/20 transition-all uppercase tracking-widest">{banLoading ? "Unbanning..." : "Unban"}</button>
                    ) : (
                      <button onClick={handleBanUser} disabled={banLoading} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-xs py-4 rounded-xl border border-red-500/20 transition-all uppercase tracking-widest">{banLoading ? "Banning..." : "Ban"}</button>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {isTipModalOpen && selectedUserProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0b1a] rounded-[32px] w-full max-w-md shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 p-8 pt-16 space-y-8 relative overflow-visible">
            {/* Poking Square Avatar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="w-[110px] h-[110px] rounded-[24px] p-1 bg-[#be30ff] shadow-[0_10px_40px_rgba(168,85,247,0.4)]">
                <div className="w-full h-full rounded-[20px] border-4 border-[#0d0b1a] overflow-hidden bg-[#16142c]">
                  <img 
                    src={selectedUserProfile.avatar} 
                    alt={selectedUserProfile.username} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.src = 'https://www.roblox.com/headshot-thumbnail/image?userId=1&width=150&height=150&format=png';
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                Tip {selectedUserProfile.username}
              </h2>
              <button 
                onClick={() => {
                  setIsTipModalOpen(false);
                  setTipAmount("");
                  setTipError("");
                  setTipSuccess(false);
                }}
                className="text-white/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {tipSuccess ? (
              <div className="flex flex-col items-center gap-4 py-8 animate-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#22c55e]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[#22c55e] font-black text-xl uppercase tracking-widest">Tip Sent!</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-[#be30ff] font-black text-lg">$</span>
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={tipAmount}
                    onChange={(e) => {
                      setTipAmount(e.target.value);
                      setTipError("");
                    }}
                    onKeyDown={handleKeyPressTip}
                    className="w-full bg-black/20 focus:ring-4 focus:ring-[#be30ff]/5 text-white text-xl font-black rounded-2xl pl-12 pr-6 py-5 transition-all outline-none placeholder:text-white/5"
                  />
                  {tipError && (
                    <p className="absolute -bottom-6 left-1 text-[#ef4444] text-[11px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                      {tipError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSendTip}
                  disabled={!tipAmount || parseFloat(tipAmount) <= 0}
                  className="w-full bg-[#be30ff] hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale transition-all text-white font-black text-[15px] py-4 rounded-xl shadow-[0_20px_40px_rgba(168,85,247,0.15)] flex items-center justify-center gap-3 uppercase tracking-[0.2em]"
                >
                  TIP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isMuteModalOpen && selectedUserProfile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsMuteModalOpen(false)}
        >
          <div
            className="bg-[#0a0a0a] rounded-2xl w-full max-w-md shadow-2xl animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#141414] to-[#0a0a0a]">
              <h2 className="text-2xl font-bold text-white tracking-wide">
                MUTE USER
              </h2>
              <button
                onClick={() => setIsMuteModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#2a2a2a]/50 hover:bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center">
                <img
                  src={selectedUserProfile.avatar}
                  alt="Profile"
                  className="w-20 h-20 mb-3 object-cover"
                  style={{
                    borderRadius: "14px",
                    boxShadow:
                      "4px 4px 10px #000, -2px -2px 6px #2a2210, inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                />
                <p className="text-[#be30ff] text-sm font-bold uppercase tracking-widest mb-1">
                  Muting
                </p>
                <h3 className="text-white font-black text-2xl uppercase tracking-tight">
                  {selectedUserProfile.username}
                </h3>
              </div>

              <div className="space-y-4">
                <label className="text-[#be30ff] text-xs font-black uppercase tracking-[0.2em] block mb-2">
                  Duration (minutes)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["1", "10", "30", "60"].map((min) => (
                    <button
                      key={min}
                      onClick={() => setMuteDuration(min)}
                      className={`py-2.5 rounded-xl font-bold text-sm transition-all duration-150 ${
                        muteDuration === min
                          ? "bg-[#be30ff] text-white shadow-[0_4px_0_0_#9a3412]"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    placeholder="Custom minutes..."
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(e.target.value)}
                    className="w-full bg-black/40 border-none text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:ring-0 transition-all placeholder:text-gray-600 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setIsMuteModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-xs py-4 rounded-2xl transition-all duration-150 uppercase tracking-[0.2em]"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleMuteUser}
                  disabled={
                    muteLoading || !muteDuration || parseInt(muteDuration) <= 0
                  }
                  className="flex-1 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs py-4 rounded-2xl transition-all duration-150 shadow-[0_4px_0_0_#9a3412,0_8px_16px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#9a3412,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] uppercase tracking-[0.2em]"
                >
                  {muteLoading ? "MUTING..." : "CONFIRM MUTE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTipRainOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => {
            setIsTipRainOpen(false);
            setTipRainAmount("");
            setTipRainError("");
          }}
        >
          <div
            className="bg-gradient-to-b from-[#1a0f00] to-[#0a0a0a] rounded-2xl w-full max-w-sm shadow-2xl animate-[slideUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-[#FFB700] font-extrabold text-lg tracking-widest uppercase"
                  style={{ textShadow: "0 0 10px #FFB70088" }}
                >
                  TIP RAIN
                </span>
              </div>
              <button
                onClick={() => {
                  setIsTipRainOpen(false);
                  setTipRainAmount("");
                  setTipRainError("");
                }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              {/* Current rain amount */}
              <div
                className="flex items-center justify-center gap-2 py-3 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #1a1200, #241900)",
                }}
              >
                <img
                  src={COIN_IMG}
                  alt="coin"
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-[#FFB700] font-extrabold text-xl">
                  {rain ? Number(rain.amount).toLocaleString() : "—"}
                </span>
                <span className="text-[#be30ff] text-sm">current pool</span>
              </div>

              {tipRainSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-[#22c55e]/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#22c55e]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-[#22c55e] font-bold text-lg">
                    Added to Rain!
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[#be30ff] text-sm font-bold uppercase tracking-wide">
                      Amount to Add
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={tipRainAmount}
                        onChange={(e) => {
                          setTipRainAmount(e.target.value);
                          setTipRainError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleTipRain();
                        }}
                        className="w-full bg-[#0a0a0a] text-white text-base rounded-lg px-4 py-3 border-none outline-none focus:outline-none focus:ring-0 placeholder:text-[#6b5a48] transition-all shadow-inner"
                        autoFocus
                      />
                      <img
                        src={COIN_IMG}
                        alt="coin"
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
                      />
                    </div>
                    {tipRainError && (
                      <p className="text-[#ef4444] text-sm font-medium">
                        {tipRainError}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsTipRainOpen(false);
                        setTipRainAmount("");
                        setTipRainError("");
                      }}
                      className="flex-1 bg-[#141414] text-white font-bold text-[14px] py-3 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTipRain}
                      disabled={
                        !tipRainAmount ||
                        parseFloat(tipRainAmount) <= 0 ||
                        tipRainLoading
                      }
                      className="flex-1 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-extrabold text-[14px] py-3 rounded-lg transition-all duration-150 shadow-[0_4px_0_0_#9a3412,0_8px_16px_rgba(0,0,0,0.3)] active:shadow-[0_1px_0_0_#9a3412,0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tipRainLoading ? "Adding..." : "ADD TO RAIN"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
