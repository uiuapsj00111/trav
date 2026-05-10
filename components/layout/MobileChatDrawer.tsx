"use client";

import { COIN_ICONS, useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { MessageSquare, Smile, Wifi, X } from "lucide-react";
import Image from "next/image";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  username: string;
  avatar: string;
  content: string | React.ReactNode;
  timestamp: string;
  createdAt: string;
  repliedTo?: { username: string; content: string };
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileChatDrawer({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tips, setTips] = useState<TipEvent[]>([]);
  const [rarePulls, setRarePulls] = useState<RarePull[]>([]);
  const [upgradeBanners, setUpgradeBanners] = useState<UpgradeBanner[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    username: string;
    content: string;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [rain, setRain] = useState<{
    id: number;
    amount: number;
    ends_at: string;
    participants: string[];
    participant_avatars: Record<string, string>;
  } | null>(null);
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
  const [isTipRainOpen, setIsTipRainOpen] = useState(false);
  const [tipRainAmount, setTipRainAmount] = useState("");
  const [tipRainError, setTipRainError] = useState("");
  const [tipRainSuccess, setTipRainSuccess] = useState(false);
  const [tipRainLoading, setTipRainLoading] = useState(false);

  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [muteDuration, setMuteDuration] = useState("10");
  const [muteLoading, setMuteLoading] = useState(false);
  const [selectedUserIsMuted, setSelectedUserIsMuted] = useState(false);
  const [muteExpiresAt, setMuteExpiresAt] = useState<number | null>(null);
  const [muteCountdown, setMuteCountdown] = useState("");
  const [isBanned, setIsBanned] = useState(false);

  const [banLoading, setBanLoading] = useState(false);
  const [selectedUserIsBanned, setSelectedUserIsBanned] = useState(false);

  const { selectedCurrency, coinsBalance, funCoinsBalance, refreshBalances } =
    useCurrency();
  const distributedRainIds = useRef<Set<number>>(new Set());

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
    setStorageItem(balanceKey, optimisticBalance.toString());
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
        setStorageItem(balanceKey, data.newSenderBalance.toString());
        window.dispatchEvent(
          new CustomEvent("balanceAnimate", {
            detail: {
              from: optimisticBalance,
              to: data.newSenderBalance,
              currency: selectedCurrency,
            },
          }),
        );
      } else {
        setStorageItem(balanceKey, balance.toString());
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
      setStorageItem(balanceKey, balance.toString());
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
    }
    setMuteLoading(false);
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
      await fetch("/api/chat/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: selectedUserProfile.username,
          banned_by: username,
        }),
      });

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
        await refreshBalances();
        setRain(null);
        setRainJoined(false);
      } catch {}
    },
    [refreshBalances],
  );

  const handleTipRain = async () => {
    if (!tipRainAmount || parseFloat(tipRainAmount) <= 0 || !username) return;
    setTipRainError("");
    setTipRainLoading(true);
    const amount = Math.floor(parseFloat(tipRainAmount));
    const prevBalance = parseFloat(
      localStorage.getItem("mm2dice_balance") || "0",
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
      setStorageItem("mm2dice_balance", data.newBalance.toString());
      setStorageItem("mm2dice_balance_ts", Date.now().toString());
      window.dispatchEvent(
        new CustomEvent("balanceAnimate", {
          detail: { from: prevBalance, to: data.newBalance },
        }),
      );
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

  const [rainCountdown, setRainCountdown] = useState("");
  const [rainJoined, setRainJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pingAudioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    const loggedInUser = getStorageItem("mm2dice_user");
    const loggedInUserId = getStorageItem("mm2dice_user_id");
    setUsername(loggedInUser);
    if (loggedInUserId) {
      fetch(`/api/roblox/avatar?userId=${loggedInUserId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.avatarUrl) setAvatarUrl(d.avatarUrl);
        })
        .catch(() => {});

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

  useEffect(() => {
    // Fetch initial messages from API
    fetch("/api/chat?room=coinflip&limit=50", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map((msg: any) => ({
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
            })),
          );
        }
      })
      .catch(console.error);

    const channel = supabase
      .channel("mobile_chat_realtime")
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
          };
          setMessages((prev) => [...prev.slice(-49), newMsg]);
          const loggedIn = getStorageItem("mm2dice_user");
          if (
            loggedIn &&
            msg.type === "mute" &&
            msg.username.toLowerCase() === loggedIn.toLowerCase()
          ) {
            setMuteExpiresAt(new Date(msg.extra_data.expires_at).getTime());
          }
          if (loggedIn && msg.username !== loggedIn) {
            if (new RegExp(`@${loggedIn}\\b`, "i").test(msg.message))
              playPing();
          }
        },
      )

      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tips" },
        () => setTips([]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rare_pulls" },
        () => setRarePulls([]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "upgrade_banners" },
        () => setUpgradeBanners([]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playPing]);

  useEffect(() => {
    fetch("/api/tips/recent")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTips(d);
      })
      .catch(() => {});
    fetch("/api/rare-pull")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRarePulls(d);
      })
      .catch(() => {});
    fetch("/api/upgrade-banner")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setUpgradeBanners(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchRain = async () => {
      try {
        const r = await fetch("/api/rain");
        const d = await r.json();
        setRain(d);
        if (d) {
          const stored = getStorageItem(`rain_joined_${d.id}`);
          if (stored === "true") setRainJoined(true);
          if (new Date(d.ends_at).getTime() <= Date.now()) distributeRain(d.id);
        }
      } catch {}
    };
    fetchRain();
    const iv = setInterval(fetchRain, 30000);

    const rainChannel = supabase
      .channel("mobile_coin_rain_realtime")
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
      clearInterval(iv);
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
        distributeRain(rain.id);
        return;
      }
      const h = Math.floor(diff / 3600000),
        m = Math.floor((diff % 3600000) / 60000),
        s = Math.floor((diff % 60000) / 1000);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // Auto-scroll to bottom when chat is opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the chat drawer is fully rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("chat-open");
    } else {
      document.body.classList.remove("chat-open");
    }
    return () => {
      document.body.classList.remove("chat-open");
    };
  }, [isOpen]);

  const handleJoinRain = async () => {
    if (!username || rainJoined || !rain) return;
    const res = await fetch("/api/rain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, avatarUrl }),
    });
    const data = await res.json();
    if (data.success) {
      setRainJoined(true);
      localStorage.setItem(`rain_joined_${rain.id}`, "true");
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
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !username || muteExpiresAt || isBanned) return;

    const cmd = inputValue.trim().toLowerCase();
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
            `maintenance_broadcast_mobile_${Date.now()}`,
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
      return;
    }
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setInputValue("");
      setReplyTo(null);
    } catch {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const cursor = e.target.selectionStart ?? val.length;
    const match = val.slice(0, cursor).match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      setMentionSuggestions(
        Array.from(new Set(messages.map((m) => m.username)))
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

  const insertMention = (s: string) => {
    const cursor = inputRef.current?.selectionStart ?? inputValue.length;
    setInputValue(
      inputValue.slice(0, cursor).replace(/@(\w*)$/, `@${s} `) +
        inputValue.slice(cursor),
    );
    setMentionQuery(null);
    setMentionSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const renderMessageContent = (
    content: string | React.ReactNode,
  ): React.ReactNode => {
    if (typeof content !== "string") return content;
    return content.split(/(@\w+)/g).map((part, i) =>
      /^@\w+$/.test(part) ? (
        <span key={i} className="text-[#be30ff] font-semibold">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

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

  useEffect(() => {
    const handleOnlineUpdate = (e: any) => {
      if (typeof e.detail === "number") setOnlineCount(e.detail);
    };
    window.addEventListener("onlineCountUpdate", handleOnlineUpdate);
    return () => window.removeEventListener("onlineCountUpdate", handleOnlineUpdate);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-[200] flex flex-col"
      style={{ background: "#0a0a0a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 group cursor-default">
           <Wifi size={14} className="text-[#22c55e] filter drop-shadow-[0_0_5px_#22c55e] animate-pulse" />
           <span className="text-[11px] font-black text-[#22c55e] tracking-wider uppercase">{onlineCount.toLocaleString()}</span>
           <span className="text-[10px] font-black text-[#22c55e] tracking-widest uppercase overflow-hidden whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">ONLINE</span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all outline-none"
        >
          <X size={20} />
        </button>
      </div>

      {/* Coin Rain Banner */}
      {rain && (
        <div
          className="mx-3 mt-2 rounded-xl overflow-hidden shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #1a0f00 0%, #2a1800 50%, #1a0f00 100%)",
            border: "1px solid #c4820044",
            boxShadow: "0 4px 0 #6b3b0088",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-white font-extrabold text-[13px] tracking-widest uppercase">
              COIN RAIN
            </span>
            <span className="font-extrabold text-[13px] text-white tracking-widest">
              {rainCountdown}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 pb-2">
            <div className="flex items-center gap-1.5 flex-1">
              <img
                src={COIN_IMG}
                alt="coin"
                width={18}
                height={18}
                className="rounded-full"
              />
              <span className="text-white font-bold text-[14px]">
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-extrabold text-[11px] transition-all"
                style={{
                  background: "linear-gradient(to bottom, #be30ff, #7e22ce)",
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-extrabold text-[12px] transition-all disabled:opacity-60"
              style={{
                background: rainJoined
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(190, 48, 255, 0.15)",
                color: rainJoined ? "#4ade80" : "#be30ff",
              }}
            >
              {rainJoined ? "JOINED" : "JOIN"}{" "}
              <span className="ml-1 text-[10px]">
                {rain.participants.length}
              </span>
            </button>
          </div>
          {/* Participants banner */}
          {rain.participants.length > 0 && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <div className="flex items-center">
                {rain.participants.slice(0, 5).map((p, i) => (
                  <div
                    key={p}
                    className="w-6 h-6 rounded-full overflow-hidden shrink-0 shadow-xl"
                    style={{ marginLeft: i === 0 ? 0 : "-7px", zIndex: 5 - i }}
                    title={p}
                  >
                    <img
                      src={
                        rain.participant_avatars?.[p] ||
                        `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                      }
                      alt={p}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`;
                      }}
                    />
                  </div>
                ))}
                {rain.participants.length > 5 && (
                  <div
                    className="w-6 h-6 rounded-full bg-[#1c1a2e] flex items-center justify-center shrink-0 shadow-inner"
                    style={{ marginLeft: "-7px", zIndex: 0 }}
                  >
                    <span className="text-[#be30ff] text-[8px] font-black">
                      +{rain.participants.length - 5}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[#be30ff] text-[10px] font-semibold ml-1">
                {rain.participants.length === 1
                  ? `${rain.participants[0]} joined`
                  : `${rain.participants.length} joined`}
              </span>
              <span className="ml-auto text-[#FFB700] text-[10px] font-bold">
                ~
                {Math.floor(
                  rain.amount / rain.participants.length,
                ).toLocaleString()}{" "}
                each
              </span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {feed.length === 0 ? (
          null
        ) : (
          feed.map((item) => {
            // Rain ended banner
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
              const count: number = ex.participant_count || names.length;
              return (
                <div
                  key={`rain-banner-${m.id}`}
                  className="flex flex-col gap-3 px-4 py-4 rounded-xl my-1"
                  style={{
                    background:
                      "linear-gradient(135deg, #0d0b1a 0%, #1c1a2e 100%)",
                    boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌧️</span>
                    <div className="flex flex-col">
                      <span className="text-[#be30ff] font-black text-[13px] tracking-widest uppercase">
                        Coin Rain Ended!
                      </span>
                      <span className="text-[#be30ff] text-[10px]">
                        {count} player{count !== 1 ? "s" : ""} shared the rain
                      </span>
                    </div>
                    <div className="ml-auto flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <img
                          src={COIN_IMG}
                          alt="coin"
                          width={13}
                          height={13}
                          className="rounded-full"
                        />
                        <span className="text-[#be30ff] font-black text-[13px]">
                          {Number(total).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[#be30ff]/60 text-[9px] uppercase font-bold tracking-wider">
                        total pot
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{
                      background: "rgba(190, 48, 255, 0.08)",
                    }}
                  >
                    <span className="text-[#be30ff] text-[11px] font-black uppercase tracking-wider">
                      Each received
                    </span>
                    <div className="flex items-center gap-1.5">
                      <img
                        src={COIN_IMG}
                        alt="coin"
                        width={14}
                        height={14}
                        className="rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      />
                      <span className="text-white font-black text-[14px]">
                        {Number(perUser).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {names.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        {names.slice(0, 5).map((p: string, i: number) => (
                          <div
                            key={p}
                            className="w-7 h-7 rounded-full overflow-hidden border-2 border-[#0d0b1a] shrink-0 shadow-lg"
                            style={{
                              marginLeft: i === 0 ? 0 : "-10px",
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
                            />
                          </div>
                        ))}
                        {count > 5 && (
                          <div
                            className="w-7 h-7 rounded-full bg-[#1c1a2e] border-2 border-[#0d0b1a] flex items-center justify-center shrink-0 shadow-lg"
                            style={{ marginLeft: "-10px", zIndex: 0 }}
                          >
                            <span className="text-[#be30ff] text-[9px] font-black">
                              +{count - 5}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-white/40 text-[10px] font-bold">
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
                  className="relative flex flex-col gap-2 px-3 py-3 rounded-xl my-1 overflow-hidden"
                  style={{
                    backgroundImage:
                      "url(https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/New-Project-70-1771505964110.png?width=400&height=400&resize=contain)",
                    backgroundSize: "cover",
                    backgroundPosition: "center right",
                    boxShadow: "0 0 18px rgba(190, 48, 255, 0.2)",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  />
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden">
                        <img
                          src={
                            b.avatar ||
                            `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=40&height=40&format=png`
                          }
                          alt={b.username}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[13px] text-white truncate">
                          {b.username}
                        </span>
                        <span className="text-[#be30ff] text-[14px] font-black leading-none">
                          Just Upgraded!
                        </span>
                      </div>
                      <span className="ml-auto text-[#be30ff] font-black text-[14px]">
                        ×{b.multiplier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={b.item_image}
                        alt={b.item_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-white font-extrabold text-[13px] truncate">
                          {b.item_name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <img
                            src={COIN_IMG}
                            alt="coin"
                            width={12}
                            height={12}
                            className="rounded-full"
                          />
                          <span className="text-[#be30ff] font-black text-[13px]">
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
                  className="flex flex-col gap-2 px-3 py-3 rounded-xl my-1"
                  style={{
                    background: "linear-gradient(135deg,#0d0b1a,#1c1a2e)",
                    boxShadow: "0 0 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden">
                      <img
                        src={
                          p.avatar ||
                          `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                        }
                        alt={p.username}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
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
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={p.item_image}
                      alt={p.item_name}
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-bold text-[13px] truncate">
                        {p.item_name}
                      </span>
                      <div className="flex items-center gap-1">
                        <img
                          src={COIN_IMG}
                          alt="coin"
                          width={12}
                          height={12}
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
                  className="flex flex-col gap-3 px-4 py-4 rounded-xl my-1 overflow-hidden relative shadow-2xl"
                  style={{
                    background: "rgba(13, 11, 26, 0.6)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(190, 48, 255, 0.1)",
                  }}
                >
                  {/* Subtle Glow */}
                  <div className={`absolute top-0 left-0 w-[4px] h-full ${isFun ? "bg-[#ec4899]" : "bg-[#be30ff]"} shadow-[0_0_15px_rgba(168,85,247,0.5)]`} />
                  
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-white/5 shadow-lg">
                      <img
                        src={
                          t.sender_avatar ||
                          `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                        }
                        alt={t.sender_username}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-[13px] text-white truncate italic uppercase tracking-tight">
                        {t.sender_username}
                      </span>
                      <span className="text-[#be30ff] text-[9px] font-black uppercase tracking-[0.2em] leading-none">tipped</span>
                    </div>
                    <span
                      className={`${isFun ? "text-[#ec4899]" : "text-[#be30ff]"} mx-2 font-black text-lg`}
                    >
                      →
                    </span>
                    <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-white/5 shadow-lg">
                      <img
                        src={
                          t.recipient_avatar ||
                          `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=48&height=48&format=png`
                        }
                        alt={t.recipient_username}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-[13px] text-white truncate italic uppercase tracking-tight">
                        {t.recipient_username}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.03] px-3 py-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                       <img
                        src={icon}
                        alt="coin"
                        width={16}
                        height={16}
                        className="rounded-full shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                      />
                      <span
                        className={`font-[1000] ${isFun ? "text-[#ec4899]" : "text-[#be30ff]"} text-[16px] tracking-tight`}
                      >
                        {Number(t.amount).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">
                      {isFun ? "fun coins" : "coins"}
                    </span>
                  </div>
                </div>
              );
            }
            const message = item.data;
            return (
              <div
                key={message.id}
                className="group relative flex items-start gap-0 py-2 px-2 rounded-lg hover:bg-white/[0.04] transition-all duration-300"
              >
                <button
                  onClick={() =>
                    openUserProfile(
                      { username: message.username, avatar: message.avatar },
                      !!username &&
                        message.username.toLowerCase() ===
                          username.toLowerCase(),
                    )
                  }
                  className="shrink-0 w-9 h-9 rounded-[9px] overflow-hidden mt-0.5 cursor-pointer"
                  style={{
                    background: "linear-gradient(145deg,#1c1a2e,#0d0b1a)",
                    boxShadow: "2px 2px 5px #000",
                    border: "1px solid #3a3a3a",
                  }}
                >
                  <Image
                    src={message.avatar}
                    alt={message.username}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="shrink-0 w-[2px] self-stretch mx-2 rounded-full bg-[#be30ff]/50" />
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span
                      onClick={() =>
                        openUserProfile(
                          {
                            username: message.username,
                            avatar: message.avatar,
                          },
                          !!username &&
                            message.username.toLowerCase() ===
                              username.toLowerCase(),
                        )
                      }
                      className={`text-[14px] font-bold leading-none shrink-0 cursor-pointer ${
                        message.username.toLowerCase() === "barnoddino"
                          ? "text-[#ff6ec7]"
                          : message.username.toLowerCase() === "pinkysold"
                            ? "text-[#ff6ec7]"
                            : ["brainrotazmeer"].includes(
                                  message.username.toLowerCase(),
                                )
                              ? "text-[#A0AEC0]"
                              : ["theroblox_noob7", "itzepikrayan"].includes(
                                    message.username.toLowerCase(),
                                  )
                                ? "text-[#48BB78]"
                                : [
                                      "iammonkeyk3",
                                      "hewakexx",
                                      "hewalexx",
                                      "datunaproplayer",
                                      "plx_bree",
                                      "ironicfigures",
                                      "bread4c4",
                                      "wydzik",
                                      "itzvemx",
                                      "epictrav1",
                                      "xzs0ulll",
                                    ].includes(message.username.toLowerCase())
                                  ? "text-[#be30ff]"
                                  : "text-white"
                      }`}
                    >
                      {message.username.toLowerCase() === "barnoddino"
                        ? "Barno"
                        : message.username.toLowerCase() === "pinkysold"
                          ? "Pink"
                          : message.username}
                      {(message.username.toLowerCase() === "barnoddino" ||
                        message.username.toLowerCase() === "pinkysold") && (
                        <span
                          className="ml-1 align-middle"
                          style={{ marginTop: "-2px" }}
                        >
                          <img
                            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-removebg-preview-11-1771459816518.png?width=200&height=200&resize=contain"
                            alt="Owner"
                            width={20}
                            height={20}
                            className="inline-block"
                          />
                        </span>
                      )}
                      {["brainrotazmeer"].includes(
                        message.username.toLowerCase(),
                      ) && (
                        <span
                          className="ml-1 inline-flex items-center justify-center h-4 px-1 rounded-full bg-gradient-to-b from-[#A0AEC0] to-[#718096] border border-[#A0AEC0]/50 align-middle"
                          style={{ marginTop: "-2px" }}
                        >
                          <span className="text-[7px] font-black text-white uppercase">
                            Trial Mod
                          </span>
                        </span>
                      )}
                      {["theroblox_noob7", "itzepikrayan"].includes(
                        message.username.toLowerCase(),
                      ) && (
                        <span
                          className="ml-1 inline-flex items-center justify-center h-4 px-1 rounded-full bg-gradient-to-b from-[#48BB78] to-[#2F855A] border border-[#48BB78]/50 align-middle"
                          style={{ marginTop: "-2px" }}
                        >
                          <span className="text-[7px] font-black text-white uppercase">
                            Mod
                          </span>
                        </span>
                      )}
                      {[
                        "iammonkeyk3",
                        "hewakexx",
                        "hewalexx",
                        "datunaproplayer",
                        "plx_bree",
                        "ironicfigures",
                        "bread4c4",
                        "wydzik",
                        "itzvemx",
                        "epictrav1",
                        "xzs0ulll",
                      ].includes(message.username.toLowerCase()) && (
                        <span
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-b from-[#FFD700] to-[#B8860B] border border-[#FFD700]/50 align-middle"
                          style={{ marginTop: "-2px" }}
                        >
                          <span className="text-[7px] font-black text-white">
                            OG
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="text-[#8a7560] text-[10px] leading-none shrink-0">
                      {message.timestamp}
                    </span>
                    <button
                      onClick={() =>
                        setReplyTo({
                          username: message.username,
                          content:
                            typeof message.content === "string"
                              ? message.content
                              : "",
                        })
                      }
                      className="shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-all text-[#be30ff] hover:text-[#be30ff]"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                  {message.repliedTo && (
                    <span className="text-[#be30ff] text-[11px] italic">
                      ↩ @{message.repliedTo.username}:{" "}
                      <span className="text-white/40 not-italic">
                        {message.repliedTo.content}
                      </span>
                    </span>
                  )}
                  <span className="text-[#e8eaed] text-[13px] leading-[1.5] break-words font-semibold">
                    {renderMessageContent(message.content)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-[#1a1a1a] shrink-0">
        {!username ? (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-3 text-center">
            <p className="text-[#8a7560] text-sm font-medium">Login to chat</p>
          </div>
        ) : muteExpiresAt ? (
          <div className="bg-gradient-to-b from-[#1a0000] to-[#0a0a0a] border border-[#ef4444]/20 rounded-xl px-4 py-4 text-center shadow-[0_4px_20px_rgba(239,68,68,0.1)] relative overflow-hidden group">
            <p
              className="text-[#ef4444] text-[10px] font-black uppercase tracking-[0.2em] mb-2"
              style={{ textShadow: "0 0 10px rgba(239,68,68,0.3)" }}
            >
              ACCOUNT MUTED
            </p>
            <div className="inline-flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/5 relative z-10">
              <span className="text-white font-black text-xl tracking-[0.1em] font-mono leading-none">
                {muteCountdown}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 relative">
            {replyTo && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1a1008] border border-[#be30ff]/30">
                <div className="flex-1 min-w-0">
                  <span className="text-[#be30ff] text-[11px] font-bold">
                    Replying to @{replyTo.username}
                  </span>
                  <p className="text-white/50 text-[11px] truncate">
                    {replyTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 text-[#be30ff] hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#141414] border border-[#2a2a2a] rounded-xl p-2 grid grid-cols-10 gap-1 shadow-2xl z-20">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setInputValue((v) => v + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-[18px] hover:bg-white/10 rounded-lg p-1 transition-colors leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {mentionSuggestions.length > 0 && mentionQuery !== null && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-2xl z-20">
                {mentionSuggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(s);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#be30ff]/10 transition-colors text-left"
                  >
                    <span className="text-[#be30ff] font-semibold text-sm">
                      @{s}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Say something..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="w-full bg-[#141414] border border-[#2a2a2a] text-white text-[13px] font-medium rounded-lg px-3 py-3 focus:outline-none focus:border-[#be30ff]/50 focus:ring-1 focus:ring-[#be30ff]/20 placeholder:text-[#6b5a48] transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendMessage}
                className="flex-1 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-extrabold text-[13px] py-3 rounded-lg shadow-[0_4px_0_0_#9a3412] active:shadow-[0_1px_0_0_#9a3412] active:translate-y-[3px] transition-all"
              >
                SEND
              </button>
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="shrink-0 px-3 py-3 rounded-lg bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white shadow-[0_4px_0_0_#9a3412] active:shadow-[0_1px_0_0_#9a3412] active:translate-y-[3px] transition-all"
              >
                <Smile size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedUserProfile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedUserProfile(null)}
        >
          <div
            className="bg-[#0d0b1a] rounded-[32px] w-full max-w-[500px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-4 duration-300 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white/5 px-6 py-6 flex items-center gap-6">
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl bg-black/20 hover:bg-black/40 flex items-center justify-center text-gray-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-black/40 shadow-2xl">
                  <Image
                    src={selectedUserProfile.avatar}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-white font-black text-2xl tracking-tight truncate uppercase">
                  {selectedUserProfile.username}
                </h3>
                <div className="flex items-center gap-2">
                  {profileStats.role === "Owner" ? (
                    <span className="px-3 py-1 rounded-full bg-[#ff6ec7] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(255,110,199,0.3)]">
                      Owner
                    </span>
                  ) : profileStats.role === "Manager" ? (
                    <span className="px-3 py-1 rounded-full bg-[#3b9eff] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(59,158,255,0.3)]">
                      Manager
                    </span>
                  ) : profileStats.role === "OG" ? (
                    <span className="px-3 py-1 rounded-full bg-[#FFB700] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(255,183,0,0.3)]">
                      OG
                    </span>
                  ) : profileStats.role === "Moderator" ? (
                    <span className="px-3 py-1 rounded-full bg-[#48BB78] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(72,187,120,0.3)]">
                      Moderator
                    </span>
                  ) : (
                    profileStats.role === "Trial Moderator" && (
                      <span className="px-3 py-1 rounded-full bg-[#A0AEC0] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(160,174,192,0.3)]">
                        Trial Moderator
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={COIN_IMG}
                      className="w-5 h-5 rounded-full"
                      alt="Profit"
                    />
                    <span
                      className={`text-lg font-black tracking-tight ${profileStats.total_profit >= 0 ? "text-[#5CDF9A]" : "text-[#ef4444]"}`}
                    >
                      {profileStats.total_profit >= 0 ? "+" : ""}
                      {profileStats.total_profit.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    PROFIT
                  </span>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={COIN_IMG}
                      className="w-5 h-5 rounded-full"
                      alt="Wagered"
                    />
                    <span className="text-white text-lg font-black tracking-tight">
                      {profileStats.total_wagered.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    WAGERED
                  </span>
                </div>
              </div>
              {!isViewingSelf && (
                <button
                  onClick={() => {
                    setTipError("");
                    setTipSuccess(false);
                    setIsTipModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-black text-sm py-4 rounded-2xl shadow-[0_4px_0_0_#460066] active:translate-y-[2px] active:shadow-none uppercase tracking-[0.1em]"
                >
                  TIP {selectedUserProfile.username}
                </button>
              )}
              {!isViewingSelf &&
                username &&
                ["pinkysold", "barnoddino"].includes(
                  username.toLowerCase(),
                ) && (
                  <div className="flex gap-3">
                    {selectedUserIsMuted ? (
                      <button
                        onClick={handleUnmuteUser}
                        disabled={muteLoading}
                        className="flex-1 bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white font-black text-sm py-4 rounded-2xl shadow-[0_4px_0_0_#15803d] active:translate-y-[2px] active:shadow-none uppercase tracking-[0.1em] disabled:opacity-50"
                      >
                        {muteLoading ? "UNMUTING..." : "UNMUTE"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsMuteModalOpen(true)}
                        className="flex-1 bg-gradient-to-b from-[#be30ff]/20 to-[#be30ff]/10 border border-[#be30ff]/20 text-[#be30ff] font-black text-sm py-4 rounded-2xl shadow-[0_4px_0_0_#460066] active:translate-y-[2px] active:shadow-none uppercase tracking-[0.1em]"
                      >
                        MUTE
                      </button>
                    )}

                    {selectedUserIsBanned ? (
                      <button
                        onClick={handleUnbanUser}
                        disabled={banLoading}
                        className="flex-1 bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white font-black text-sm py-4 rounded-2xl shadow-[0_4px_0_0_#1d4ed8] active:translate-y-[2px] active:shadow-none uppercase tracking-[0.1em] disabled:opacity-50"
                      >
                        {banLoading ? "UNBANNING..." : "UNBAN"}
                      </button>
                    ) : (
                      <button
                        onClick={handleBanUser}
                        disabled={banLoading}
                        className="flex-1 bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-white font-black text-sm py-4 rounded-2xl shadow-[0_4px_0_0_#991b1b] active:translate-y-[2px] active:shadow-none uppercase tracking-[0.1em] disabled:opacity-50"
                      >
                        {banLoading ? "BANNING..." : "BAN"}
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {isTipModalOpen && selectedUserProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-[#0a0a0a] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-white/5">
            <div className="flex items-center justify-between p-4 bg-white/5">
              <h2 className="text-lg font-bold text-white tracking-wide uppercase">
                SEND TIP
              </h2>
              <button
                onClick={() => {
                  setIsTipModalOpen(false);
                  setTipAmount("");
                  setTipError("");
                  setTipSuccess(false);
                }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center">
                <img
                  src={selectedUserProfile.avatar}
                  alt="Profile"
                  className="w-16 h-16 rounded-xl mb-2 object-cover"
                />
                <h3 className="text-white font-bold text-lg">
                  @{selectedUserProfile.username}
                </h3>
              </div>
              {tipSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-green-500 font-bold">Tip Sent!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
                      Tip Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={tipAmount}
                        onChange={(e) => {
                          setTipAmount(e.target.value);
                          setTipError("");
                        }}
                        className="w-full bg-black/50 border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none"
                      />
                      <img
                        src={
                          selectedCurrency === "fun_coins"
                            ? COIN_ICONS.fun_coins
                            : COIN_ICONS.coins
                        }
                        alt="Coin"
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
                      />
                    </div>
                    {tipError && (
                      <p className="text-red-500 text-[11px] font-bold">
                        {tipError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSendTip}
                    disabled={!tipAmount || parseFloat(tipAmount) <= 0}
                    className="w-full bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#460066] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-widest text-xs"
                  >
                    SEND TIP
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tip Rain Modal */}
      {isTipRainOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          onClick={() => {
            setIsTipRainOpen(false);
            setTipRainAmount("");
            setTipRainError("");
          }}
        >
          <div
            className="bg-[#0a0a0a] rounded-2xl w-full max-w-xs shadow-2xl border border-white/5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-[#be30ff] font-black text-sm tracking-widest uppercase">
                TIP RAIN
              </span>
              <button
                onClick={() => {
                  setIsTipRainOpen(false);
                  setTipRainAmount("");
                  setTipRainError("");
                }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {tipRainSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-green-500 font-bold">Added!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                      Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={tipRainAmount}
                        onChange={(e) => {
                          setTipRainAmount(e.target.value);
                          setTipRainError("");
                        }}
                        className="w-full bg-black/50 border border-white/5 text-white rounded-lg px-4 py-3 focus:outline-none"
                        autoFocus
                      />
                      <img
                        src={COIN_IMG}
                        alt="coin"
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                      />
                    </div>
                    {tipRainError && (
                      <p className="text-red-500 text-[11px] font-bold">
                        {tipRainError}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleTipRain}
                    disabled={
                      !tipRainAmount ||
                      parseFloat(tipRainAmount) <= 0 ||
                      tipRainLoading
                    }
                    className="w-full bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-black py-4 rounded-xl shadow-[0_4px_0_0_#460066] active:translate-y-[2px] active:shadow-none transition-all uppercase tracking-widest text-xs"
                  >
                    {tipRainLoading ? "ADDING..." : "ADD TO RAIN"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Mute Modal */}
      {isMuteModalOpen && selectedUserProfile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          onClick={() => setIsMuteModalOpen(false)}
        >
          <div
            className="bg-[#0a0a0a] rounded-2xl w-full max-w-sm shadow-2xl border border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-white/5">
              <h2 className="text-lg font-bold text-white uppercase">
                MUTE USER
              </h2>
              <button
                onClick={() => setIsMuteModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center">
                <img
                  src={selectedUserProfile.avatar}
                  alt="Profile"
                  className="w-14 h-14 rounded-xl mb-2 object-cover"
                />
                <h3 className="text-white font-black text-lg uppercase">
                  {selectedUserProfile.username}
                </h3>
              </div>
              <div className="space-y-3">
                <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest block">
                  Duration (minutes)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["1", "10", "30", "60"].map((min) => (
                    <button
                      key={min}
                      onClick={() => setMuteDuration(min)}
                      className={`py-2 rounded-xl font-bold text-sm transition-all ${muteDuration === min ? "bg-[#be30ff] text-white shadow-[0_3px_0_0_#460066]" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom minutes..."
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  className="w-full bg-black/50 border border-white/5 text-white text-sm rounded-xl px-4 py-3 focus:outline-none font-bold"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsMuteModalOpen(false)}
                  className="flex-1 bg-white/5 text-white font-black text-xs py-4 rounded-2xl uppercase tracking-widest"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleMuteUser}
                  disabled={
                    muteLoading || !muteDuration || parseInt(muteDuration) <= 0
                  }
                  className="flex-1 bg-gradient-to-b from-[#be30ff] to-[#7e22ce] text-white font-black text-xs py-4 rounded-2xl shadow-[0_4px_0_0_#460066] active:translate-y-[2px] active:shadow-none uppercase tracking-widest disabled:opacity-50"
                >
                  {muteLoading ? "MUTING..." : "CONFIRM MUTE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
