"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { init } from "@nimiq/mini-app-sdk";

/**
 * Replaces the old WagmiProvider + RainbowKitProvider stack. There's no
 * equivalent "wrap the app in a provider" step for Nimiq Pay's Ethereum
 * side — window.ethereum is already injected before this component
 * mounts, and src/lib/nimiqWallet.ts talks to it directly per-hook.
 *
 * What this component does instead is call the Mini App SDK's init()
 * once, per Nimiq's documented pattern:
 *
 *   const nimiq = await init()
 *
 * This resolves once the Nimiq-specific provider (separate from the
 * Ethereum one — used for NIM-native features like listAccounts(),
 * isConsensusEstablished(), requestDeviceIdentifier()) is ready. The app
 * renders immediately either way — this isn't a blocking gate, since the
 * Ethereum wallet flow in nimiqWallet.ts has its own independent
 * connecting/error state — but children can rely on `nimiqReady` if they
 * need to call NIM-specific SDK functions safely.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [nimiqReady, setNimiqReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    init()
      .then(() => {
        if (!cancelled) setNimiqReady(true);
      })
      .catch(() => {
        // Not fatal for the EVM/Base side of the app — most of
        // propchain-web's contract interactions go through
        // window.ethereum via nimiqWallet.ts, not this SDK. This only
        // affects NIM-native features if this mini app adds them later.
        if (!cancelled) setNimiqReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NimiqReadyContext.Provider value={nimiqReady}>{children}</NimiqReadyContext.Provider>
  );
}

const NimiqReadyContext = createContext(false);

/** True once @nimiq/mini-app-sdk's init() has resolved. */
export function useNimiqReady() {
  return useContext(NimiqReadyContext);
}
