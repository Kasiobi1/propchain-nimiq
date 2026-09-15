"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, type Abi, type Address } from "viem";
import { baseSepolia, base } from "viem/chains";
import { ACTIVE_CHAIN_ID, BASE_MAINNET_CHAIN_ID } from "./contracts";

// Replaces wagmi + RainbowKit. Inside a Nimiq Pay Mini App, the wallet is
// not something the user "connects" by picking from a modal — Nimiq Pay
// already injects a single EIP-1193 provider at window.ethereum before
// page scripts run (see the Ethereum Provider API docs at
// https://nimiq.dev/mini-apps/api-reference/ethereum-provider). All of
// RainbowKit's job (choosing a wallet, choosing a chain) doesn't apply
// here, so this file talks to that provider directly through viem's
// custom() transport instead of wrapping it in wagmi's connector
// abstraction.
//
// Outside of Nimiq Pay (e.g. testing this app in a normal desktop
// browser), window.ethereum may still be present if the user has
// MetaMask or another EIP-6963-compatible extension installed — this
// code doesn't care which one injected it, same as the real Nimiq Pay
// WebView.

const ACTIVE_CHAIN = ACTIVE_CHAIN_ID === BASE_MAINNET_CHAIN_ID ? base : baseSepolia;

// Hex chain ID + params used for wallet_addEthereumChain / switchEthereumChain
// — Nimiq Pay's provider supports both per its Ethereum Provider API, so a
// user landing with the wrong active chain gets prompted to switch rather
// than the app silently reading/writing against the wrong network.
const CHAIN_HEX_ID = `0x${ACTIVE_CHAIN.id.toString(16)}`;
const CHAIN_PARAMS = {
  chainId: CHAIN_HEX_ID,
  chainName: ACTIVE_CHAIN.name,
  rpcUrls: [ACTIVE_CHAIN.rpcUrls.default.http[0]],
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  blockExplorerUrls: ACTIVE_CHAIN.blockExplorers
    ? [ACTIVE_CHAIN.blockExplorers.default.url]
    : undefined,
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
};

function getProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

/**
 * A public client for read-only calls, backed by whatever provider is
 * injected (Nimiq Pay in production, any EIP-1193 wallet during local
 * dev). Falls back to nothing usable if no provider exists — callers
 * should guard with useNimiqWallet()'s `connected` state, same as every
 * hook below already checks tokenId/enabled conditions.
 */
export function getPublicClient() {
  const provider = getProvider();
  if (!provider) return null;
  return createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: custom(provider),
  });
}

/**
 * A wallet client for signing/sending transactions, bound to the given
 * account. Mirrors wagmi's useWriteContract's underlying client but
 * without the connector abstraction — every write call site now creates
 * this once it has an address from useNimiqWallet().
 */
export function getWalletClient(account: Address) {
  const provider = getProvider();
  if (!provider) return null;
  return createWalletClient({
    account,
    chain: ACTIVE_CHAIN,
    transport: custom(provider),
  });
}

export interface NimiqWalletState {
  address: Address | null;
  connected: boolean;
  connecting: boolean;
  chainId: number | null;
  wrongChain: boolean;
  error: string | null;
}

/**
 * Replaces wagmi's useAccount() + useChainId() + RainbowKit's connect
 * modal. Requests accounts once on mount (Nimiq Pay's provider resolves
 * eth_requestAccounts through a native confirmation dialog per the docs —
 * there's no separate "pick a wallet" step for the mini app to render),
 * tracks the active chain, and exposes a switchToActiveChain() action for
 * the "wrong network" case RainbowKit used to show a button for.
 */
export function useNimiqWallet() {
  const [state, setState] = useState<NimiqWalletState>({
    address: null,
    connected: false,
    connecting: true,
    chainId: null,
    wrongChain: false,
    error: null,
  });

  const refreshChainId = useCallback(async (provider: EthereumProvider) => {
    try {
      const hex = (await provider.request({ method: "eth_chainId" })) as string;
      const chainId = parseInt(hex, 16);
      setState((s) => ({ ...s, chainId, wrongChain: chainId !== ACTIVE_CHAIN.id }));
    } catch {
      // Non-fatal — chain badge just won't update until the next event.
    }
  }, []);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) {
      setState((s) => ({ ...s, connecting: false, error: "No wallet provider found." }));
      return;
    }

    let cancelled = false;

    async function connect() {
      try {
        // eth_requestAccounts triggers Nimiq Pay's native confirmation
        // dialog on first call; subsequent calls resolve silently if
        // already approved for this origin (per the Ethereum Provider
        // API docs' "User confirmation: yes" note — the dialog itself is
        // handled host-side, not something this app renders).
        const accounts = (await provider!.request({ method: "eth_requestAccounts" })) as string[];
        if (cancelled) return;
        setState((s) => ({
          ...s,
          address: (accounts[0] as Address) ?? null,
          connected: accounts.length > 0,
          connecting: false,
        }));
        await refreshChainId(provider!);
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          connecting: false,
          error: err instanceof Error ? err.message : "Wallet connection was rejected.",
        }));
      }
    }

    connect();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setState((s) => ({
        ...s,
        address: (accounts[0] as Address) ?? null,
        connected: accounts.length > 0,
      }));
    };
    const handleChainChanged = () => {
      refreshChainId(provider!);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      cancelled = true;
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [refreshChainId]);

  const switchToActiveChain = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_HEX_ID }],
      });
    } catch (err) {
      // Error code 4902 per the Ethereum Provider API docs means the
      // chain isn't configured yet in the wallet — add it, then switch
      // will already have happened as part of addEthereumChain.
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [CHAIN_PARAMS],
        });
      }
    }
  }, []);

  return { ...state, switchToActiveChain };
}

/**
 * Replaces the wagmi pairing of useWriteContract() + useWaitForTransactionReceipt()
 * for a single in-flight write — the pattern several pages (listing detail,
 * list, admin/mint) repeated 3-4 times each for offer/buy/lock/confirm/revoke
 * actions. Exposes the same shape those pages already destructure
 * (isPending, isConfirming, isSuccess/isConfirmed, error, hash, reset,
 * write) so call sites barely change.
 */
export function useTrackedWrite() {
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reset = useCallback(() => {
    setHash(null);
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  const write = useCallback(
    async (params: {
      account: Address;
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      setError(null);
      setIsSuccess(false);
      setIsPending(true);
      try {
        const walletClient = getWalletClient(params.account);
        const publicClient = getPublicClient();
        if (!walletClient || !publicClient) throw new Error("No wallet provider found.");

        const txHash = await walletClient.writeContract({
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          value: params.value,
        } as Parameters<typeof walletClient.writeContract>[0]);
        setHash(txHash);
        setIsPending(false);
        setIsConfirming(true);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        setIsConfirming(false);
        setIsSuccess(true);
      } catch (err) {
        setIsPending(false);
        setIsConfirming(false);
        setError(err);
      }
    },
    []
  );

  return { write, hash, isPending, isConfirming, isSuccess, error, reset };
}
