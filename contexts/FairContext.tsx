"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createFairState, rotateSeed, type ProvablyFairState } from "@/lib/provablyFair";

interface FairContextType {
  state: ProvablyFairState | null;
  incrementNonce: () => void;
  setClientSeed: (seed: string) => void;
  revealAndRotate: () => Promise<string>; // returns old server seed
  ready: boolean;
}

const FairContext = createContext<FairContextType>({
  state: null,
  incrementNonce: () => {},
  setClientSeed: () => {},
  revealAndRotate: async () => "",
  ready: false,
});

export function useFair() {
  return useContext(FairContext);
}

export function FairProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProvablyFairState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    createFairState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  const incrementNonce = useCallback(() => {
    setState((prev) => (prev ? { ...prev, nonce: prev.nonce + 1 } : prev));
  }, []);

  const setClientSeed = useCallback((seed: string) => {
    setState((prev) => (prev ? { ...prev, clientSeed: seed, nonce: 0 } : prev));
  }, []);

  const revealAndRotate = useCallback(async () => {
    if (!state) return "";
    const { oldServerSeed, newState } = await rotateSeed(state);
    setState(newState);
    return oldServerSeed;
  }, [state]);

  return (
    <FairContext.Provider value={{ state, incrementNonce, setClientSeed, revealAndRotate, ready }}>
      {children}
    </FairContext.Provider>
  );
}
