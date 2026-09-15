"use client";

import { useNimiqWallet } from "@/lib/nimiqWallet";

/**
 * Replaces the old RainbowKit ConnectButton.Custom wrapper. Inside a
 * Nimiq Pay Mini App there's no "choose a wallet" modal to open — Nimiq
 * Pay's provider is already there, and requesting accounts triggers
 * Nimiq Pay's own native confirmation dialog (handled entirely
 * host-side, per the Mini Apps docs' Security and Permissions section —
 * this component can't render or bypass that dialog, only wait for its
 * result). So this button now reflects connection state rather than
 * opening any UI of its own, except for the "wrong network" case, where
 * tapping it requests a chain switch through the injected provider.
 */
export function ConnectWalletButton() {
  const { address, connected, connecting, wrongChain, error, switchToActiveChain } =
    useNimiqWallet();

  if (connecting) {
    return (
      <div
        aria-hidden
        className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white opacity-0"
      >
        Connect Wallet
      </div>
    );
  }

  if (error || !connected) {
    return (
      <button
        type="button"
        disabled
        title={error ?? "No Nimiq Pay wallet detected."}
        className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white/50"
      >
        {error ? "Wallet unavailable" : "Not connected"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        type="button"
        onClick={switchToActiveChain}
        className="rounded-full border border-clay px-4 py-2 text-xs font-medium text-clay transition-colors hover:bg-clay hover:text-white"
      >
        Wrong network
      </button>
    );
  }

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white">
        {short}
      </span>
    </div>
  );
}
