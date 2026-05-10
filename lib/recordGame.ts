import { getStorageItem, setStorageItem } from "./storage";

export interface BetHistoryEntry {
  game_type:
    | "coinflip"
    | "mines"
    | "limbo"
    | "cases"
    | "upgrader"
  // battles removed
    | "roulette"
    | "dice"
    | "blackjack";
  wager: number;
  payout: number;
  profit: number;
  multiplier?: number;
  result?: string;
  currency?: "coins" | "fun_coins";
  meta?: Record<string, unknown>;
  // coinflip-specific discord fields
  discord?: {
    winner: string;
    loser: string;
    winner_avatar?: string;
    loser_avatar?: string;
    winner_side?: string;
    loser_side?: string;
    total_value: number;
    game_id?: string;
  };
}

export async function recordGameResult(
  wager: number,
  profit: number,
  entry?: Partial<BetHistoryEntry>,
) {
  const username = getStorageItem("mm2dice_user");
  const roblox_user_id = getStorageItem("mm2dice_user_id");
  if (!username) return;

  const currency =
    entry?.currency ||
    (getStorageItem("mm2dice_selected_currency") as
      | "coins"
      | "fun_coins") ||
    "coins";

  // --- CLIENT SIDE BALANCE PATCHING REMOVED FOR SECURITY ---
  // The server now handles balance deductions and additions directly
  // via secure endpoints (e.g. /api/coinflip/games/[id]/join)
  // ---------------------------------------------------------
  // Try to get avatar URL from localStorage
  let avatar_url = getStorageItem("mm2dice_avatar") || "";

  if (!avatar_url && roblox_user_id) {
    try {
      const avatarResp = await fetch(
        `/api/roblox/avatar?userId=${encodeURIComponent(roblox_user_id)}`,
      );
      if (avatarResp.ok) {
        const avatarData = await avatarResp.json().catch(() => ({}));
        if (avatarData?.avatarUrl) {
          avatar_url = avatarData.avatarUrl;
          setStorageItem("mm2dice_avatar", avatar_url);
        }
      }
    } catch (err) {
      console.debug("recordGameResult: failed to fetch avatar from API", err);
    }
  }

  // Only update total_wagered and total_profit for real coins
  if (currency === "coins") {
    fetch("/api/stats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-username": username,
        "x-user-id": roblox_user_id || "",
      },
      body: JSON.stringify({
        username,
        roblox_user_id,
        wager,
        profit,
        avatar_url,
      }),
    }).catch(() => {});
  }

  // Write to bet_history and secure balance update
  if (entry?.game_type) {
    const result = entry.result ?? (profit >= 0 ? "win" : "loss");
    const payout = entry.payout ?? wager + profit;

    const payload = {
      sessionToken: getStorageItem("mm2dice_session_token"),
      username,
      game_type: entry.game_type,
      bet_amount: wager,
      payout,
      profit,
      multiplier: entry.multiplier,
      result,
      currency,
      meta: entry.meta,
      discord: entry.discord,
    };

    console.log("recordGameResult called", {
      wager,
      profit,
      entry,
      username,
    });

    if (result === "win") {
      console.log("recordGameResult WIN payload:", payload);
    }
    
    fetch("/api/games/record", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          console.error("Failed to record game:", err);
        }
        window.dispatchEvent(new Event("balanceUpdate"));
      })
      .catch((err) => {
        console.error("Failed to record game:", err);
      });
  }
}
