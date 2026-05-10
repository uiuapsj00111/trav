"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";

export type CurrencyType = "coins" | "fun_coins";

interface CurrencyContextType {
  selectedCurrency: CurrencyType;
  setSelectedCurrency: (currency: CurrencyType) => void;
  coinsBalance: number;
  funCoinsBalance: number;
  setCoinsBalance: React.Dispatch<React.SetStateAction<number>>;
  setFunCoinsBalance: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  refreshBalances: () => Promise<void>;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export const COIN_ICONS = {
  coins:
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772297776282.png?width=400&height=400&resize=contain",
  fun_coins:
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1772302662596.png?width=400&height=400&resize=contain",
};

export const COIN_NAMES = {
  coins: "Coins",
  fun_coins: "Fun Coins",
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] =
    useState<CurrencyType>("coins");
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [funCoinsBalance, setFunCoinsBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMutedState] = useState(false);

  const balanceRefs = React.useRef({ coins: 0, fun: 0 });

  useEffect(() => {
    balanceRefs.current.coins = coinsBalance;
  }, [coinsBalance]);

  useEffect(() => {
    balanceRefs.current.fun = funCoinsBalance;
  }, [funCoinsBalance]);

  useEffect(() => {
    // Only load UI preferences from localStorage (non-sensitive data)
    const stored = getStorageItem(
      "mm2dice_selected_currency",
    ) as CurrencyType;
    if (stored && (stored === "coins" || stored === "fun_coins")) {
      setSelectedCurrencyState(stored);
    }

    const storedMuted = getStorageItem("mm2dice_muted");
    if (storedMuted === "true") setIsMutedState(true);

    const loadBalances = async () => {
      // CRITICAL: Always fetch balances from server, never from localStorage
      // This prevents the localStorage balance manipulation exploit
      // But respect balance lock to avoid overwriting in-progress game deductions
      const balanceLock = getStorageItem("mm2dice_balance_lock");
      const lockTime = balanceLock ? parseInt(balanceLock) : 0;
      
      let loadedCoins = 0;
      let loadedFunCoins = 0;
      
      if (!lockTime || isNaN(lockTime) || Date.now() >= lockTime) {
        // Fetch from server
        const user = getStorageItem("mm2dice_user");
        if (user) {
          const response = await fetch(
            `/api/users/balance?username=${encodeURIComponent(user)}`,
            { cache: "no-store", credentials: "include" },
          );
          if (response.ok) {
            const data = await response.json();
            loadedCoins =
              typeof data.balance === "number"
                ? data.balance
                : parseFloat(String(data.balance || "0"));
            loadedFunCoins = parseFloat(String(data.fun_balance || "0"));
          }
        }
      } else {
        // Balance is locked, use localStorage values
        const storedCoins = getStorageItem("mm2dice_balance");
        const storedFunCoins = getStorageItem("mm2dice_fun_balance");
        if (storedCoins) {
          loadedCoins = parseFloat(storedCoins) || 0;
        }
        if (storedFunCoins) {
          loadedFunCoins = parseFloat(storedFunCoins) || 0;
        }
      }

      // Check for pending upgrader game and deduct bet if necessary
      const pendingUpgrader = getStorageItem(
        "mm2dice_upgrader_pending_game",
      );
      if (pendingUpgrader) {
        try {
          const gameData = JSON.parse(pendingUpgrader);
          if (
            gameData.betAmount &&
            gameData.currency &&
            gameData.game_type !== "upgrader"
          ) {
            if (gameData.currency === "coins") {
              loadedCoins -= gameData.betAmount;
            } else if (gameData.currency === "fun_coins") {
              loadedFunCoins -= gameData.betAmount;
            }
          }
        } catch (error) {
          console.error("Error parsing pending upgrader game:", error);
        }
      }

      // Check for pending Mines game
      const pendingMines = getStorageItem("mm2dice_mines_pending_game");
      if (pendingMines) {
        try {
          const gameData = JSON.parse(pendingMines);
          if (gameData.betAmount && gameData.currency) {
            if (gameData.currency === "coins") {
              loadedCoins -= gameData.betAmount;
            } else if (gameData.currency === "fun_coins") {
              loadedFunCoins -= gameData.betAmount;
            }
          }
        } catch (error) {
          console.error("Error parsing pending mines game:", error);
        }
      }

      setCoinsBalance(loadedCoins);
      setFunCoinsBalance(loadedFunCoins);
      setStorageItem("mm2dice_balance", loadedCoins.toString());
      setStorageItem("mm2dice_fun_balance", loadedFunCoins.toString());
      setStorageItem("mm2dice_balance_ts", Date.now().toString());
      setIsLoading(false);

      // Dispatch balance update event for UI components like Navbar
      window.dispatchEvent(new Event("balanceUpdate"));
    };

    loadBalances();

    const handleLogin = () => {
      loadBalances();
    };

    window.addEventListener("userLogin", handleLogin);
    return () => {
      window.removeEventListener("userLogin", handleLogin);
    };
  }, []);

  const setSelectedCurrency = (currency: CurrencyType) => {
    setSelectedCurrencyState(currency);
    setStorageItem("mm2dice_selected_currency", currency);
    // Dispatch event for components not using context if any
    window.dispatchEvent(
      new CustomEvent("currencyChanged", { detail: currency }),
    );
  };

  const setIsMuted = (muted: boolean) => {
    setIsMutedState(muted);
    setStorageItem("mm2dice_muted", muted.toString());
  };

   const refreshBalances = async () => {
    // Check for balance lock - if active, do not refresh from server
    const balanceLock = getStorageItem("mm2dice_balance_lock");
    const lockTime = balanceLock ? parseInt(balanceLock) : 0;
    if (lockTime && !isNaN(lockTime) && Date.now() < lockTime) {
      return;
    }
    
    const user = getStorageItem("mm2dice_user");
    if (!user) return;

    try {
      const res = await fetch(
        `/api/users/balance?username=${encodeURIComponent(user)}`,
        { cache: "no-store", credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        const oldCoins = balanceRefs.current.coins;
        const oldFun = balanceRefs.current.fun;

        // Track level change
        const oldXP = parseFloat(getStorageItem("mm2dice_total_wagered") || "0");
        const newXP = parseFloat(data.total_wagered || "0");
        
        if (newXP > 0) {
          const { getLevelFromXP } = await import("@/lib/levelUtils");
          const oldLevel = getLevelFromXP(oldXP);
          const newLevel = getLevelFromXP(newXP);

          if (newLevel > oldLevel && oldXP > 0) {
            window.dispatchEvent(
              new CustomEvent("levelUp", {
                detail: { level: newLevel, oldLevel }
              })
            );
          }
          setStorageItem("mm2dice_total_wagered", newXP.toString());
        }

        const parsedBalance =
          typeof data.balance === "number"
            ? data.balance
            : parseFloat(String(data.balance || "0"));
        if (!Number.isNaN(parsedBalance)) {
          setStorageItem("mm2dice_balance", parsedBalance.toString());
          setCoinsBalance(parsedBalance);
          if (Math.abs(parsedBalance - oldCoins) > 0.01) {
            window.dispatchEvent(
              new CustomEvent("balanceAnimate", {
                detail: {
                  from: oldCoins,
                  to: parsedBalance,
                  currency: "coins",
                },
              }),
            );
          }
        }

        const parsedFunBalance =
          typeof data.fun_balance === "number"
            ? data.fun_balance
            : parseFloat(String(data.fun_balance || "0"));
        if (!Number.isNaN(parsedFunBalance)) {
          setStorageItem(
            "mm2dice_fun_balance",
            parsedFunBalance.toString(),
          );
          setFunCoinsBalance(parsedFunBalance);
          if (Math.abs(parsedFunBalance - oldFun) > 0.01) {
            window.dispatchEvent(
              new CustomEvent("balanceAnimate", {
                detail: {
                  from: oldFun,
                  to: parsedFunBalance,
                  currency: "fun_coins",
                },
              }),
            );
          }
        }
        window.dispatchEvent(new Event("balanceUpdate"));
      }
    } catch (err) {
      console.error("Failed to refresh balances:", err);
    }
  };

  // Restore local storage updates as requested by user
  const setCoinsBalanceWithOld = (value: number | ((prev: number) => number)) => {
    const newBalance = typeof value === "function" ? value(balanceRefs.current.coins) : value;
    setStorageItem("mm2dice_balance", newBalance.toString());
    setCoinsBalance(newBalance);
  };

  const setFunCoinsBalanceWithOld = (value: number | ((prev: number) => number)) => {
    const newBalance = typeof value === "function" ? value(balanceRefs.current.fun) : value;
    setStorageItem("mm2dice_fun_balance", newBalance.toString());
    setFunCoinsBalance(newBalance);
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        coinsBalance,
        funCoinsBalance,
        setCoinsBalance: setCoinsBalanceWithOld,
        setFunCoinsBalance: setFunCoinsBalanceWithOld,
        isLoading,
        refreshBalances,
        isMuted,
        setIsMuted,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
